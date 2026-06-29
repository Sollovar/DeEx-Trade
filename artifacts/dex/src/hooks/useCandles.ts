import { useEffect, useState, useCallback, useRef } from "react";

export interface ChartCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const TF_TO_RESOLUTION: Record<string, string> = {
  "5m":  "5m",
  "15m": "15m",
  "1h":  "1h",
  "4h":  "4h",
  "D":   "1D",
  "1D":  "1D",
  "1W":  "1W",
};

async function fetchCandles(pairId: string, resolution: string, limit = 400): Promise<ChartCandle[]> {
  const res = resolution in TF_TO_RESOLUTION ? TF_TO_RESOLUTION[resolution] : "1h";
  const url = `/api/v1/pairs/${encodeURIComponent(pairId)}/candles?resolution=${res}&currency=usd&limit=${limit}&prefer=fills`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`candles ${resp.status}`);
  const data = await resp.json() as Array<{
    time: number | string;
    open: string | number;
    high: string | number;
    low: string | number;
    close: string | number;
    volume: string | number;
  }>;
  return data
    .map(c => ({
      time:   Number(c.time),
      open:   parseFloat(String(c.open)),
      high:   parseFloat(String(c.high)),
      low:    parseFloat(String(c.low)),
      close:  parseFloat(String(c.close)),
      volume: parseFloat(String(c.volume)),
    }))
    .filter(c => c.time > 0 && isFinite(c.open))
    .sort((a, b) => a.time - b.time);
}

export function useCandles(pairId: string | null | undefined, timeframe: string) {
  const [candles, setCandles]   = useState<ChartCandle[]>([]);
  const [loading, setLoading]   = useState(false);
  const [error,   setError]     = useState<string | null>(null);
  const abortRef                = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    if (!pairId) { setCandles([]); return; }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCandles(pairId, timeframe);
      if (!controller.signal.aborted) setCandles(data);
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== "AbortError") setError(e.message);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [pairId, timeframe]);

  useEffect(() => {
    load();
    return () => { abortRef.current?.abort(); };
  }, [load]);

  return { candles, loading, error };
}
