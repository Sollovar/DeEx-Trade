import { Router } from "express";
import { db } from "@workspace/db";
import { pairsTable } from "@workspace/db/schema";
import { eq, ilike, or, inArray } from "drizzle-orm";
import { getCachedPairs, getCachedPair, syncTrendingPairs } from "../services/pairsWorker";

const router = Router();

router.get("/pairs", async (req, res) => {
  try {
    const { network, search, limit = "100" } = req.query as Record<string, string>;

    let pairs = getCachedPairs();

    if (network) {
      const networks = network.split(",").map((n) => n.trim().toLowerCase());
      pairs = pairs.filter((p) => networks.includes(p.network));
    }

    if (search) {
      const q = search.toLowerCase();
      pairs = pairs.filter(
        (p) =>
          p.base_symbol.toLowerCase().includes(q) ||
          p.quote_symbol.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q) ||
          p.pair_address.toLowerCase().includes(q)
      );
    }

    const lim = Math.min(parseInt(limit, 10) || 100, 500);
    res.json(pairs.slice(0, lim));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch pairs", details: String(err) });
  }
});

router.get("/pairs/trending", async (req, res) => {
  try {
    const { network } = req.query as Record<string, string>;

    let pairs = getCachedPairs();

    if (network) {
      const networks = network.split(",").map((n) => n.trim().toLowerCase());
      pairs = pairs.filter((p) => networks.includes(p.network));
    }

    pairs.sort((a, b) => b.market_cap_usd - a.market_cap_usd);
    res.json(pairs.slice(0, 50));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch trending pairs", details: String(err) });
  }
});

router.post("/pairs/sync", async (_req, res) => {
  try {
    syncTrendingPairs().catch(() => {});
    res.json({ success: true, message: "Sync started in background" });
  } catch (err) {
    res.status(500).json({ error: "Sync failed", details: String(err) });
  }
});

router.get("/pairs/:id", async (req, res) => {
  try {
    const pair = getCachedPair(req.params.id);
    if (pair) return res.json(pair);

    const rows = await db
      .select()
      .from(pairsTable)
      .where(eq(pairsTable.id, req.params.id))
      .limit(1);

    if (rows.length === 0) {
      return res.status(404).json({ error: "Pair not found" });
    }

    const row = rows[0];
    res.json({
      id: row.id,
      network: row.network,
      pair_address: row.poolAddress,
      pool_name: row.poolName,
      dex_name: row.dexName,
      base_symbol: row.baseSymbol,
      quote_symbol: row.quoteSymbol,
      base_token: row.baseTokenInfo,
      quote_token: row.quoteTokenInfo,
      base_token_decimals: row.baseTokenDecimals,
      quote_token_decimals: row.quoteTokenDecimals,
      base_token_info: row.baseTokenInfo,
      quote_token_info: row.quoteTokenInfo,
      market_cap_usd: parseFloat(row.marketCapUsd ?? "0"),
      price_usd: row.priceUsd,
      price_change_24h: row.priceChange24h,
      volume_24h_usd: row.volume24hUsd,
      liquidity_usd: row.liquidityUsd,
      last_trade_price: row.lastTradePrice,
      last_trade_at: row.lastTradeAt,
      created_at: row.createdAt,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch pair", details: String(err) });
  }
});

export default router;
