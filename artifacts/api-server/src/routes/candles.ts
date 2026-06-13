import { Router } from "express";
import { getCandlesForPair, fetchAndStoreCandlesForPair } from "../services/candleWorker";
import { fetchPoolOhlcv } from "../services/geckoTerminal";
import { getCachedPair } from "../services/pairsWorker";

const router = Router();

const RESOLUTION_MAP: Record<string, { timeframe: string; aggregate: number; seconds: number }> = {
  "1": { timeframe: "minute", aggregate: 1, seconds: 60 },
  "5": { timeframe: "minute", aggregate: 5, seconds: 300 },
  "15": { timeframe: "minute", aggregate: 15, seconds: 900 },
  "60": { timeframe: "hour", aggregate: 1, seconds: 3600 },
  "240": { timeframe: "hour", aggregate: 4, seconds: 14400 },
  "1D": { timeframe: "day", aggregate: 1, seconds: 86400 },
  "1W": { timeframe: "week", aggregate: 1, seconds: 604800 },
};

function resolveToSeconds(resolution: string): number {
  if (RESOLUTION_MAP[resolution]) return RESOLUTION_MAP[resolution].seconds;
  const n = parseInt(resolution, 10);
  return isNaN(n) ? 60 : n;
}

router.get("/candles", async (req, res) => {
  try {
    const {
      pair_id,
      resolution = "60",
      currency = "usd",
      limit = "300",
      from,
      to,
    } = req.query as Record<string, string>;

    if (!pair_id) {
      return res.status(400).json({ error: "pair_id is required" });
    }

    const lim = Math.min(parseInt(limit, 10) || 300, 1000);
    const resSec = resolveToSeconds(resolution);
    const tfInfo = RESOLUTION_MAP[resolution];

    if (tfInfo) {
      const pair = getCachedPair(pair_id);
      if (pair?.pair_address) {
        const geckoCurrency = currency === "usd" ? "usd" : "token";
        const candles = await fetchPoolOhlcv(
          pair.network,
          pair.pair_address,
          tfInfo.timeframe,
          tfInfo.aggregate,
          lim,
          geckoCurrency
        );

        if (candles.length > 0) {
          return res.json(
            candles.map((c) => ({
              time: c.time,
              open: c.open.toString(),
              high: c.high.toString(),
              low: c.low.toString(),
              close: c.close.toString(),
              volume: c.volume.toString(),
              pair_id,
              resolution: resSec,
              currency,
            }))
          );
        }
      }
    }

    const stored = await getCandlesForPair(pair_id, resSec, currency, lim);

    if (stored.length === 0) {
      return res.json([]);
    }

    res.json(
      stored.map((c) => ({
        time: c.time,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volume,
        pair_id,
        resolution: resSec,
        currency,
      }))
    );
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch candles", details: String(err) });
  }
});

router.post("/candles/fetch/:pairId", async (req, res) => {
  try {
    const { pairId } = req.params;
    const pair = getCachedPair(pairId);

    if (!pair) {
      return res.status(404).json({ error: "Pair not found" });
    }

    fetchAndStoreCandlesForPair(pairId, pair.pair_address, pair.network).catch(() => {});

    res.json({ success: true, message: "Candle fetch started in background" });
  } catch (err) {
    res.status(500).json({ error: "Failed to start candle fetch", details: String(err) });
  }
});

export default router;
