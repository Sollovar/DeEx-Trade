import { db } from "@workspace/db";
import { pairsTable } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";
import { fetchTrendingPairs, type PairData } from "./geckoTerminal";
import { matchingEngine } from "../engine/matching";
import { logger } from "../lib/logger";

const SUPPORTED_CHAINS = ["bsc", "base", "solana"];
const CHAIN_FETCH_DELAY_MS = 120_000;

let pairsCache: Map<string, PairData> = new Map();
let lastSyncAt = 0;

export function getCachedPairs(): PairData[] {
  return Array.from(pairsCache.values());
}

export function getCachedPair(id: string): PairData | undefined {
  return pairsCache.get(id);
}

async function upsertPair(pair: PairData) {
  await db
    .insert(pairsTable)
    .values({
      id: pair.id,
      network: pair.network,
      baseToken: pair.base_token?.address ?? "",
      quoteToken: pair.quote_token?.address ?? "",
      baseSymbol: pair.base_symbol,
      quoteSymbol: pair.quote_symbol,
      dexName: pair.dex_name,
      poolAddress: pair.pair_address,
      poolName: pair.pool_name,
      priceUsd: pair.price_usd,
      priceChange24h: pair.price_change_24h,
      volume24hUsd: pair.volume_24h_usd,
      liquidityUsd: pair.liquidity_usd,
      marketCapUsd: pair.market_cap_usd.toString(),
      baseTokenDecimals: pair.base_token_decimals,
      quoteTokenDecimals: pair.quote_token_decimals,
      baseTokenInfo: pair.base_token_info ?? undefined,
      quoteTokenInfo: pair.quote_token_info ?? undefined,
      indexedAt: new Date(pair.indexed_at),
    })
    .onConflictDoUpdate({
      target: pairsTable.id,
      set: {
        priceUsd: pair.price_usd,
        priceChange24h: pair.price_change_24h,
        volume24hUsd: pair.volume_24h_usd,
        liquidityUsd: pair.liquidity_usd,
        marketCapUsd: pair.market_cap_usd.toString(),
        indexedAt: new Date(pair.indexed_at),
        updatedAt: new Date(),
      },
    });
}

export async function loadPairsFromDb() {
  try {
    const rows = await db.select().from(pairsTable).limit(500);
    for (const row of rows) {
      pairsCache.set(row.id, {
        id: row.id,
        network: row.network,
        pair_address: row.poolAddress ?? "",
        pool_name: row.poolName ?? `${row.baseSymbol}/${row.quoteSymbol}`,
        dex_name: row.dexName ?? "DEX",
        base_symbol: row.baseSymbol ?? "",
        quote_symbol: row.quoteSymbol ?? "",
        base_token: (row.baseTokenInfo as PairData["base_token"]) ?? null,
        quote_token: (row.quoteTokenInfo as PairData["quote_token"]) ?? null,
        base_token_decimals: row.baseTokenDecimals ?? 18,
        quote_token_decimals: row.quoteTokenDecimals ?? 18,
        base_token_info: (row.baseTokenInfo as PairData["base_token_info"]) ?? null,
        quote_token_info: (row.quoteTokenInfo as PairData["quote_token_info"]) ?? null,
        market_cap_usd: parseFloat(row.marketCapUsd ?? "0"),
        market_cap: Math.floor(parseFloat(row.marketCapUsd ?? "0")),
        price_usd: row.priceUsd ?? "0",
        price_change_24h: row.priceChange24h ?? "0",
        volume_24h_usd: row.volume24hUsd ?? "0",
        liquidity_usd: row.liquidityUsd ?? "0",
        created_at: row.createdAt?.toISOString() ?? new Date().toISOString(),
        indexed_at: row.indexedAt?.toISOString() ?? new Date().toISOString(),
      });
    }
    logger.info(`[PairsWorker] loaded ${rows.length} pairs from DB`);
  } catch (e) {
    logger.error(e, "[PairsWorker] error loading pairs from DB");
  }
}

export async function syncTrendingPairs(): Promise<number> {
  logger.info("[PairsWorker] starting GeckoTerminal sync...");
  let totalSynced = 0;

  for (const network of SUPPORTED_CHAINS) {
    try {
      logger.info(`[PairsWorker] fetching trending pairs from ${network}...`);
      const pairs = await fetchTrendingPairs(network);

      for (const pair of pairs) {
        pairsCache.set(pair.id, pair);
        try {
          await upsertPair(pair);
        } catch (e) {
          logger.error(e, `[PairsWorker] failed to upsert pair ${pair.id}`);
        }
        matchingEngine.ensureOrderBook(pair.id);
        totalSynced++;
      }

      logger.info(`[PairsWorker] synced ${pairs.length} pairs from ${network}`);

      if (network !== SUPPORTED_CHAINS[SUPPORTED_CHAINS.length - 1]) {
        await new Promise((r) => setTimeout(r, CHAIN_FETCH_DELAY_MS));
      }
    } catch (e) {
      logger.error(e, `[PairsWorker] error syncing ${network}`);
    }
  }

  lastSyncAt = Date.now();
  logger.info(`[PairsWorker] sync complete: ${totalSynced} pairs`);
  return totalSynced;
}

let syncTimer: ReturnType<typeof setInterval> | undefined;

export async function startPairsWorker() {
  await loadPairsFromDb();

  if (pairsCache.size === 0) {
    syncTrendingPairs().catch((e) => logger.error(e, "[PairsWorker] initial sync error"));
  }

  syncTimer = setInterval(
    () => {
      syncTrendingPairs().catch((e) => logger.error(e, "[PairsWorker] scheduled sync error"));
    },
    15 * 60 * 1000
  );
}

export function stopPairsWorker() {
  if (syncTimer) clearInterval(syncTimer);
}
