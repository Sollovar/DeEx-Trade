import { useState, useEffect } from "react";
import type { Network } from "@/hooks/useConnectedNetwork";

export type ChartRange = "24h" | "1w" | "1m" | "3m" | "6m" | "1y" | "all";

export interface ChartPoint {
  timestamp: number;
  usd: number;
}

export interface ChartData {
  points: ChartPoint[];
  loading: boolean;
  error: string | null;
}

export function useCoinStatsChart(
  address: string | null,
  network: Network,
  range: ChartRange
): ChartData {
  const [points, setPoints] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!address) {
      setPoints([]);
      return;
    }

    setLoading(true);
    setError(null);

    const controller = new AbortController();

    fetch(
      `/api/portfolio/chart?address=${encodeURIComponent(address)}&network=${encodeURIComponent(network)}&type=${range}`,
      { signal: controller.signal }
    )
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        const raw: number[][] = data?.result ?? [];
        setPoints(raw.map(([timestamp, usd]) => ({ timestamp, usd })));
        setError(null);
      })
      .catch((err: Error) => {
        if (err.name !== "AbortError") {
          setError("Failed to load chart");
        }
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [address, network, range]);

  return { points, loading, error };
}
