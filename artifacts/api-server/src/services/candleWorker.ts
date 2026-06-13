import { db } from "@workspace/db";
import { candlesTable, fillsTable, pairsTable } from "@workspace/db/schema";
import { eq, and, gte, desc, sql } from "drizzle-orm";
import { fetchPoolOhlcv } from "./geckoTerminal";
import { getCachedPairs } from "./pairsWorker";
import { logger } from "../lib/logger";

const RESOLUTIONS = [60, 300, 900, 3600, 14400, 86400];

const TIMEFRAME_MAP: Record<number, { timeframe: string; aggregate: number }> = {
  60: { timeframe: "minute", aggregate: 1 },
  300: { timeframe: "minute", aggregate: 5 },
  900: { timeframe: "minute", aggregate: 15 },
  3600: { timeframe: "hour", aggregate: 1 },
  14400: { timeframe: "hour", aggregate: 4 },
  86400: { timeframe: "day", aggregate: 1 },
};

async function upsertCandle(
  pairId: string,
  time: number,
  resolution: number,
  currency: string,
  open: number,
  high: number,
  low: number,
  close: number,
  volume: number,
  source: string = "gecko"
) {
  await db
    .insert(candlesTable)
    .values({
      pairId,
      time,
      resolution,
      currency,
      open: open.toString(),
      high: high.toString(),
      low: low.toString(),
      close: close.toString(),
      volume: volume.toString(),
      source,
      updatedAt: new Date(),
    })
    .onConflictDoNothing();
}

export async function fetchAndStoreCandlesForPair(
  pairId: string,
  poolAddress: string,
  network: string
) {
  for (const resolution of RESOLUTIONS) {
    const tf = TIMEFRAME_MAP[resolution];
    if (!tf) continue;

    for (const currency of ["usd", "token"]) {
      try {
        const candles = await fetchPoolOhlcv(
          network,
          poolAddress,
          tf.timeframe,
          tf.aggregate,
          300,
          currency
        );

        for (const c of candles) {
          await upsertCandle(
            pairId,
            c.time,
            resolution,
            currency,
            c.open,
            c.high,
            c.low,
            c.close,
            c.volume
          );
        }

        if (candles.length > 0) {
          logger.info(
            `[CandleWorker] stored ${candles.length} candles for ${pairId} res=${resolution} currency=${currency}`
          );
        }
      } catch (e) {
        logger.error(e, `[CandleWorker] error fetching candles for ${pairId} res=${resolution}`);
      }

      await new Promise((r) => setTimeout(r, 500));
    }
  }
}

export async function getCandlesForPair(
  pairId: string,
  resolution: number,
  currency: string = "usd",
  limit: number = 300
): Promise<
  {
    time: number;
    open: string | null;
    high: string | null;
    low: string | null;
    close: string | null;
    volume: string | null;
  }[]
> {
  const rows = await db
    .select()
    .from(candlesTable)
    .where(
      and(
        eq(candlesTable.pairId, pairId),
        eq(candlesTable.resolution, resolution),
        eq(candlesTable.currency, currency)
      )
    )
    .orderBy(desc(candlesTable.time))
    .limit(limit);

  return rows.reverse().map((r: typeof rows[0]) => ({
    time: Number(r.time),
    open: r.open,
    high: r.high,
    low: r.low,
    close: r.close,
    volume: r.volume,
  }));
}

async function processPair(pairId: string, poolAddress: string, network: string) {
  if (!poolAddress) return;
  try {
    for (const resolution of [3600, 86400]) {
      const tf = TIMEFRAME_MAP[resolution];
      if (!tf) continue;

      const candles = await fetchPoolOhlcv(
        network,
        poolAddress,
        tf.timeframe,
        tf.aggregate,
        100,
        "usd"
      );

      for (const c of candles) {
        await upsertCandle(pairId, c.time, resolution, "usd", c.open, c.high, c.low, c.close, c.volume);
      }

      await new Promise((r) => setTimeout(r, 2_000));
    }
  } catch (e) {
    logger.error(e, `[CandleWorker] error processing ${pairId}`);
  }
}

let timer: ReturnType<typeof setInterval> | undefined;
let initialFetchDone = false;

export async function startCandleWorker() {
  if (!initialFetchDone) {
    initialFetchDone = true;
    setTimeout(async () => {
      const pairs = getCachedPairs();
      logger.info(`[CandleWorker] initial fetch for ${pairs.length} pairs`);
      for (const pair of pairs.slice(0, 20)) {
        await processPair(pair.id, pair.pair_address, pair.network);
        await new Promise((r) => setTimeout(r, 5_000));
      }
    }, 60_000);
  }

  timer = setInterval(async () => {
    const pairs = getCachedPairs();
    for (const pair of pairs.slice(0, 30)) {
      await processPair(pair.id, pair.pair_address, pair.network);
      await new Promise((r) => setTimeout(r, 5_000));
    }
  }, 30 * 60 * 1000);
}

export function stopCandleWorker() {
  if (timer) clearInterval(timer);
}
