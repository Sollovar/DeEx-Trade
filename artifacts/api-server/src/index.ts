import http from "http";
import { WebSocketServer } from "ws";
import app from "./app";
import { logger } from "./lib/logger";
import { hub } from "./websocket/hub";
import { matchingEngine } from "./engine/matching";
import { startPairsWorker, stopPairsWorker } from "./services/pairsWorker";
import { startCandleWorker, stopCandleWorker } from "./services/candleWorker";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const server = http.createServer(app);

const wss = new WebSocketServer({ server, path: "/api/ws" });

wss.on("connection", (ws, req) => {
  logger.info({ url: req.url }, "[WS] new connection");
  hub.handleUpgrade(ws, req);
});

async function start() {
  if (process.env["DATABASE_URL"]) {
    try {
      await matchingEngine.start();
      logger.info("[Startup] matching engine started");
    } catch (e) {
      logger.warn(e, "[Startup] matching engine failed to start (no DB?)");
    }

    try {
      await startPairsWorker();
      logger.info("[Startup] pairs worker started");
    } catch (e) {
      logger.warn(e, "[Startup] pairs worker failed to start");
    }

    try {
      await startCandleWorker();
      logger.info("[Startup] candle worker started");
    } catch (e) {
      logger.warn(e, "[Startup] candle worker failed to start");
    }
  } else {
    logger.warn("[Startup] DATABASE_URL not set — skipping DB-dependent workers");
  }

  server.listen(port, () => {
    logger.info({ port }, "Server listening");
  });
}

start().catch((err) => {
  logger.error({ err }, "Fatal startup error");
  process.exit(1);
});

const shutdown = () => {
  logger.info("Shutting down...");
  matchingEngine.stop();
  stopPairsWorker();
  stopCandleWorker();
  server.close(() => process.exit(0));
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
