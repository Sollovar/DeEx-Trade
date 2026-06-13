---
name: GeckoTerminal Rate Limits
description: GeckoTerminal public API rate limiting behavior and how our workers handle it.
---

## Problem
GeckoTerminal's public API (no API key) rate-limits aggressively. When hit, it returns HTTP 429 with a `Retry-After` header that can be 0 (meaning immediately, but the server is still overwhelmed).

## Our Approach

### fetchWithRetry (geckoTerminal.ts)
- On 429: reads `Retry-After` header, defaults to 60s if 0 or missing
- Wait = `baseWait * 1000 * (attempt + 1)` — grows with each retry
- Max 4 retries total

### Pairs Worker
- 2-minute delay between chains (bsc → base → solana)
- 15-minute periodic re-sync

### Candle Worker
- 60-second delay after startup before first fetch (lets pairs load first)
- 5-second delay between each pair's candle fetch
- 30-minute periodic re-fetch cycle
- Only fetches hourly + daily candles in background (not 1m/5m/15m — those are fetched live on demand)

### Live Candle Endpoint
- `GET /api/candles` first tries a fresh GeckoTerminal OHLCV fetch
- Falls back to stored candles in `candles` table if GeckoTerminal fails

**Why:** We had issues on startup where the candle worker fired 10s after boot, making many rapid requests and hitting rate limits on every pair. The 60s delay + 5s inter-pair delay solved this.
