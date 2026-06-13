---
name: Backend Matching Engine
description: Architecture of the DEX backend — matching engine, WebSocket hub, pairs sync, candle worker.
---

## Architecture

The Express API server (`artifacts/api-server/src/`) has these main components:

### Matching Engine (`src/engine/matching.ts`)
- In-memory `Map<pairId, OrderBook>` — rebuilt from DB every 5s via `rebuildOrderBook()`
- On order create: `matchOrder()` runs price-time priority matching against opposite side
- Fills are written to `fills` table; maker orders updated; WsHub broadcasts trade/orderbook/price_update
- Expired orders processed every 15s

### WebSocket Hub (`src/websocket/hub.ts`)
- `WsHub` singleton exported as `hub`
- Clients subscribe to a `pair_id`; "all" catches global events
- WS endpoint: `ws://host/api/ws` (attached to http.Server, path `/api/ws`)
- Broadcast methods: `broadcastOrderbookUpdate`, `broadcastTradeUpdate`, `broadcastTickerUpdate`, `broadcastPriceUpdate`, `broadcastOrderUpdate`, `broadcastLiquidityUpdate`

### Pairs Worker (`src/services/pairsWorker.ts`)
- Loads pairs from DB on startup, syncs from GeckoTerminal if empty
- Caches in memory `Map<id, PairData>`; 15-min periodic sync
- Chains: bsc, base, solana with 2-min delay between chains

### Candle Worker (`src/services/candleWorker.ts`)
- Delayed initial fetch (60s after startup) to avoid rate limit on boot
- Fetches hourly + daily OHLCV from GeckoTerminal; stores in `candles` table
- `GET /api/candles` tries live GeckoTerminal first, falls back to stored candles

### DB Schema (`lib/db/src/schema/index.ts`)
- Tables: `users`, `tokens`, `pairs`, `orders`, `fills`, `candles`
- Push with: `pnpm --filter @workspace/db run push`

### API Routes
- `GET /api/pairs[?network=bsc,base|search=q]`
- `GET /api/pairs/trending`
- `GET /api/pairs/:id`
- `POST /api/pairs/sync`
- `GET /api/orderbook/:pairId[?depth=20]`
- `GET /api/trades/:pairId[?limit=50]`
- `POST /api/orders` — creates order, runs matching, returns filled order
- `GET /api/orders[?maker=&pair_id=&status=]`
- `DELETE /api/orders/:id`
- `GET /api/candles?pair_id=&resolution=60&currency=usd&limit=300`
- `GET /api/ws/status`
- `WS /api/ws` — WebSocket endpoint

**Why:** Translated from Go reference (`/tmp/reference-orderbook/backend/`) to TypeScript/Express 5 + Drizzle ORM.

**How to apply:** When adding new trading features, follow this pattern: route → DB write → matchingEngine call → hub.broadcast*.
