import { useState, useEffect, useRef } from "react";
import type { Network } from "@/hooks/useConnectedNetwork";

export interface PortfolioHolding {
  symbol: string;
  name: string;
  icon: string;
  count: number;
  priceUsd: number;
  valueUsd: number;
  priceChange24h: number;
  unrealizedPnlUsd: number;
  unrealizedPnlPct: number;
  realizedPnlUsd: number;
  allTimePnlUsd: number;
  avgBuyPrice: number;
}

export interface PortfolioSummary {
  totalValueUsd: number;
  totalCostUsd: number;
  unrealizedPnlUsd: number;
  realizedPnlUsd: number;
  allTimePnlUsd: number;
  pnl24hUsd: number;
  pnl24hPct: number;
}

export interface CoinStatsPortfolioData {
  holdings: PortfolioHolding[];
  summary: PortfolioSummary;
  loading: boolean;
  syncing: boolean;
  error: string | null;
  refetch: () => void;
}

const EMPTY_SUMMARY: PortfolioSummary = {
  totalValueUsd: 0,
  totalCostUsd: 0,
  unrealizedPnlUsd: 0,
  realizedPnlUsd: 0,
  allTimePnlUsd: 0,
  pnl24hUsd: 0,
  pnl24hPct: 0,
};

async function syncWallet(address: string, network: string): Promise<void> {
  const res = await fetch(
    `/api/portfolio/sync?address=${encodeURIComponent(address)}&network=${encodeURIComponent(network)}`,
    { method: "PATCH", signal: AbortSignal.timeout(20000) }
  );
  if (!res.ok && res.status !== 409) {
    throw new Error(`Sync failed: ${res.status}`);
  }
}

async function fetchPL(address: string, network: string) {
  const res = await fetch(
    `/api/portfolio/pl?address=${encodeURIComponent(address)}&network=${encodeURIComponent(network)}&limit=50`,
    { signal: AbortSignal.timeout(20000) }
  );
  if (!res.ok) throw new Error(`PL fetch failed: ${res.status}`);
  return res.json();
}

function mapResponse(raw: any): { holdings: PortfolioHolding[]; summary: PortfolioSummary } {
  const result: any[] = raw?.result ?? [];
  const sum = raw?.summary ?? {};

  const holdings: PortfolioHolding[] = result
    .filter((item: any) => item?.count > 0 && item?.coin)
    .map((item: any) => ({
      symbol: item.coin.symbol ?? "",
      name: item.coin.name ?? "",
      icon: item.coin.icon ?? "",
      count: item.count ?? 0,
      priceUsd: item.price?.USD ?? 0,
      valueUsd: (item.count ?? 0) * (item.price?.USD ?? 0),
      priceChange24h: item.coin.priceChange24h ?? 0,
      unrealizedPnlUsd: item.profit?.unrealized?.USD ?? 0,
      unrealizedPnlPct: item.profitPercent?.unrealized?.USD ?? 0,
      realizedPnlUsd: item.profit?.realized?.USD ?? 0,
      allTimePnlUsd: item.profit?.allTime?.USD ?? 0,
      avgBuyPrice: item.averageBuy?.allTime?.USD ?? 0,
    }))
    .sort((a, b) => b.valueUsd - a.valueUsd);

  const summary: PortfolioSummary = {
    totalValueUsd: sum.totalValue?.USD ?? 0,
    totalCostUsd: sum.totalCost?.USD ?? 0,
    unrealizedPnlUsd: sum.profit?.unrealized?.USD ?? 0,
    realizedPnlUsd: sum.profit?.realized?.USD ?? 0,
    allTimePnlUsd: sum.profit?.allTime?.USD ?? 0,
    pnl24hUsd: sum.profit?.hour24?.USD ?? 0,
    pnl24hPct: sum.profitPercent?.hour24?.USD ?? 0,
  };

  return { holdings, summary };
}

export function useCoinStatsPortfolio(
  address: string | null,
  network: Network
): CoinStatsPortfolioData {
  const [holdings, setHoldings] = useState<PortfolioHolding[]>([]);
  const [summary, setSummary] = useState<PortfolioSummary>(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const cancelledRef = useRef(false);

  const refetch = () => setTick((t) => t + 1);

  useEffect(() => {
    if (!address) {
      setHoldings([]);
      setSummary(EMPTY_SUMMARY);
      setLoading(false);
      setError(null);
      return;
    }

    cancelledRef.current = false;
    setLoading(true);
    setError(null);

    async function load() {
      try {
        setSyncing(true);
        await syncWallet(address!, network);
        if (cancelledRef.current) return;
        setSyncing(false);

        const raw = await fetchPL(address!, network);
        if (cancelledRef.current) return;

        const mapped = mapResponse(raw);
        setHoldings(mapped.holdings);
        setSummary(mapped.summary);
        setError(null);
      } catch (err: any) {
        if (!cancelledRef.current) {
          setError(err?.message ?? "Failed to load portfolio");
          setSyncing(false);
        }
      } finally {
        if (!cancelledRef.current) setLoading(false);
      }
    }

    load();

    return () => {
      cancelledRef.current = true;
    };
  }, [address, network, tick]);

  return { holdings, summary, loading, syncing, error, refetch };
}
