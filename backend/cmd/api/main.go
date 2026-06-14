package main

import (
        "context"
        "log"
        "net/http"
        "os"
        "os/signal"
        "syscall"
        "time"

        "github.com/nexus/backend/internal/config"
        "github.com/nexus/backend/internal/db"
        "github.com/nexus/backend/internal/engine"
        "github.com/nexus/backend/internal/executor"
        "github.com/nexus/backend/internal/handlers"
        "github.com/nexus/backend/internal/models"
        "github.com/nexus/backend/internal/repository"
        "github.com/nexus/backend/internal/services"
        "github.com/nexus/backend/internal/websocket"
        "github.com/gin-gonic/gin"
        "github.com/joho/godotenv"
)

func main() {
        // Load .env file — only sets vars NOT already present (Replit Secrets take priority)
        if err := godotenv.Load(); err != nil {
                log.Println("No .env file found, using environment variables")
        }

        // ── Mandatory secrets check ───────────────────────────────────────────
        // These must be configured as Replit Secrets. The app refuses to start
        // if any are missing, so misconfiguration is caught immediately.
        requiredSecrets := []string{"DB_HOST", "DB_USER", "DB_PASSWORD"}
        var missingSecrets []string
        for _, key := range requiredSecrets {
                if os.Getenv(key) == "" {
                        missingSecrets = append(missingSecrets, key)
                }
        }
        if len(missingSecrets) > 0 {
                log.Fatalf("[FATAL] Missing required Replit Secrets: %v\nGo to the Secrets tab in Replit and add the missing values.", missingSecrets)
        }

        // Load configuration
        cfg := config.Load()

        log.Printf("DB Host: %s", cfg.DBHost)
        log.Printf("DB Port: %d", cfg.DBPort)
        log.Printf("DB User: %s", cfg.DBUser)
        log.Printf("DB Name: %s", cfg.DBName)
        log.Printf("Redis URL: %s", cfg.RedisURL)

        // Setup Gin early so the HTTP port opens immediately (avoids startup timeout)
        if cfg.Environment == "production" {
                gin.SetMode(gin.ReleaseMode)
        }
        r := gin.New()
        r.Use(gin.Logger())
        r.Use(gin.Recovery())
        r.Use(func(c *gin.Context) {
                c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
                c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
                c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
                if c.Request.Method == "OPTIONS" {
                        c.AbortWithStatus(http.StatusNoContent)
                        return
                }
                c.Next()
        })

        srv := &http.Server{
                Addr:    ":" + cfg.Port,
                Handler: r,
        }
        go func() {
                log.Printf("Server starting on port %s", cfg.Port)
                if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
                        log.Fatalf("Server failed: %v", err)
                }
        }()

        // Initialize database
        database, err := db.New(cfg)
        if err != nil {
                log.Fatalf("Failed to connect to database: %v", err)
        }
        log.Println("Database connected successfully!")
        defer database.Close()

        // Run migrations
        runMigrations(database)

        // Initialize Redis if configuration is provided
        var redis *db.RedisClient
        if cfg.RedisURL != "" || cfg.RedisHost != "" {
                redis, err = db.NewRedis(cfg)
                if err != nil {
                        log.Printf("Warning: Failed to connect to Redis: %v", err)
                } else {
                        defer redis.Close()
                }
        }

        // Initialize repositories
        orderRepo := repository.NewOrderRepository(database, redis)
        fillRepo := repository.NewFillRepository(database, redis)
        pairRepo := repository.NewPairRepository(database, redis)
        userRepo := repository.NewUserRepository(database, redis)
        balanceRepo := repository.NewBalanceRepository(database, redis)
        depositRepo := repository.NewDepositRepository(database, redis)
        refundRepo := repository.NewRefundRepository(database)

        log.Println("Repositories initialized")

        // Initialize services
        ethService, err := services.NewEthereumService(cfg)
        if err != nil {
                log.Printf("Warning: Failed to initialize Ethereum service: %v", err)
        }

        authService := services.NewAuthService(cfg)
        solanaService := services.NewSolanaService(cfg, depositRepo, userRepo, balanceRepo)
        solanaSettlement := services.NewSolanaSettlementService(cfg)
        refundService := services.NewRefundService(cfg, refundRepo, depositRepo, fillRepo, solanaSettlement)

        log.Println("Services initialized")

        // Initialize WebSocket hub
        hub := websocket.NewHub()
        go func() {
                defer func() {
                        if r := recover(); r != nil {
                                log.Printf("[WebSocket] panic in hub.Run: %v\n", r)
                        }
                }()
                hub.Run()
        }()

        // Initialize settlement executor if enabled
        log.Printf("Executor Enabled: %v", cfg.ExecutorEnabled)
        if cfg.ExecutorEnabled {
                settlementExecutor, err := executor.NewExecutor(cfg, orderRepo, fillRepo, balanceRepo, hub, pairRepo, ethService, solanaSettlement, refundService)
                if err != nil {
                        log.Printf("Warning: Failed to initialize settlement executor: %v", err)
                } else {
                        err = settlementExecutor.Start(context.Background())
                        if err != nil {
                                log.Printf("Warning: Failed to start settlement executor: %v", err)
                        } else {
                                log.Println("Settlement executor started successfully")
                                defer settlementExecutor.Stop()
                        }
                }
        } else {
                log.Println("Executor disabled - skipping")
        }

        log.Println("Initializing matching engine...")

        // Initialize matching engine
        matchingEngine := engine.NewMatchingEngine(cfg, database, redis, balanceRepo, refundService)
        matchingEngine.Start(context.Background())
        defer matchingEngine.Stop()

        // Start refund service
        refundService.Start(context.Background())
        defer refundService.Stop()

        go solanaService.StartDepositWatcher(context.Background(), 30*time.Second)

        log.Println("All services initialized, registering routes...")

        // Initialize handlers and register full routes
        h := handlers.NewHandler(
                cfg,
                orderRepo,
                fillRepo,
                pairRepo,
                userRepo,
                depositRepo,
                matchingEngine,
                hub,
                ethService,
                authService,
                refundService,
                redis,
                database,
        )

        if redis != nil {
                log.Println("Redis available, starting cache worker")
                go h.StartCacheWorker(context.Background())
        } else {
                log.Println("Redis unavailable or disabled, cache worker not started")
        }

        // Register all API routes (server is already listening)
        h.RegisterRoutes(r)

        log.Println("All routes registered, server fully ready")

        // Graceful shutdown
        quit := make(chan os.Signal, 1)
        signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
        <-quit

        log.Println("Shutting down server...")

        ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
        defer cancel()

        if err := srv.Shutdown(ctx); err != nil {
                log.Printf("Server forced to shutdown: %v", err)
        }

        log.Println("Server exited")
}

func runMigrations(database *db.DB) {
        log.Println("Running database migrations...")

        // Simple approach - just run AutoMigrate, it won't fail for existing tables
        err := database.AutoMigrate(
                &models.User{},
                &models.UserBalance{},
                &models.SolanaDeposit{},
                &models.RefundRequest{},
                &models.Order{},
                &models.Fill{},
                &models.Pair{},
                &models.Token{},
                &models.Candle{},
        )
        if err != nil {
                log.Printf("Migration warning: %v", err)
        }

        // Add performance indexes
        log.Println("Adding performance indexes...")
        indexes := []string{
                "CREATE INDEX IF NOT EXISTS idx_orders_orderbook ON orders(pair_id, network, side, status, price DESC)",
                "CREATE INDEX IF NOT EXISTS idx_fills_stats ON fills(pair_id, created_at DESC, status)",
                "CREATE INDEX IF NOT EXISTS idx_fills_recent_trades ON fills(pair_id, network, status, created_at DESC)",
                "CREATE INDEX IF NOT EXISTS idx_orders_user_status_created ON orders(user_id, status, created_at DESC)",
                "CREATE INDEX IF NOT EXISTS idx_orders_user_created ON orders(user_id, created_at DESC)",
                "CREATE INDEX IF NOT EXISTS idx_pairs_network_created_at ON pairs(network, created_at DESC)",
        }

        for _, indexSQL := range indexes {
                if err := database.Exec(indexSQL).Error; err != nil {
                        log.Printf("Index creation warning: %v", err)
                }
        }

        log.Println("Migrations completed")
}
