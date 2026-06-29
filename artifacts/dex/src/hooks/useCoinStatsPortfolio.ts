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

const BIRDEYE_API_KEY = "4276be9a5d65474cbf5ac5333dab0259";
const BIRDEYE_API_BASE = "https://public-api.birdeye.so";

// Map our network names to Birdeye chain names
const NETWORK_TO_CHAIN: Record<string, string> = {
  solana: "solana",
  bsc: "bsc",
  base: "base",
  ethereum: "ethereum",
};

async function fetchPortfolioPL(address: string, network: string, limit: number = 100) {
  try {
    const chain = NETWORK_TO_CHAIN[network] || "solana";
    
    const url = `${BIRDEYE_API_BASE}/wallet/v2/pnl/details`;
    
    const requestBody = {
      wallet: address,
      duration: "all",
      position_scope: "cumulative",
      sort_type: "desc",
      sort_by: "last_trade",
      limit: limit,
      offset: 0,
    };
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "accept": "application/json",
        "content-type": "application/json",
        "x-chain": chain,
        "X-API-KEY": BIRDEYE_API_KEY,
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(20000),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      console.error(`Birdeye API error ${response.status}:`, errorText);
      throw new Error(`Birdeye API error: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (err: any) {
    console.error("Failed to fetch portfolio from Birdeye:", err);
    throw err;
  }
}

// Map network names to GeckoTerminal network identifiers
const NETWORK_TO_GECKO: Record<string, string> = {
  solana: "solana",
  bsc: "bsc",
  base: "base",
  ethereum: "eth",
};

async function fetchTokenMetadata(addresses: string[], network: string): Promise<Record<string, { logo_uri: string; name: string }>> {
  try {
    const geckoNetwork = NETWORK_TO_GECKO[network] || "solana";
    
    // GeckoTerminal supports max 30 addresses at once
    const chunks: string[][] = [];
    for (let i = 0; i < addresses.length; i += 30) {
      chunks.push(addresses.slice(i, i + 30));
    }
    
    const results: Record<string, { logo_uri: string; name: string }> = {};
    
    for (const chunk of chunks) {
      const addressesParam = chunk.join(",");
      const url = `https://api.geckoterminal.com/api/v2/networks/${geckoNetwork}/tokens/multi/${addressesParam}`;
      
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "accept": "application/json",
        },
        signal: AbortSignal.timeout(10000),
      });

      if (response.ok) {
        const data = await response.json();
        if (data?.data && Array.isArray(data.data)) {
          data.data.forEach((token: any) => {
            const address = token.attributes?.address;
            if (address) {
              results[address] = {
                logo_uri: token.attributes?.image_url || "",
                name: token.attributes?.name || token.attributes?.symbol || "",
              };
            }
          });
        }
      }
    }
    
    return results;
  } catch (err: any) {
    console.error("Failed to fetch token metadata from GeckoTerminal:", err);
    return {};
  }
}

function mapResponse(raw: any, metadata: Record<string, { logo_uri: string; name: string }> = {}): { holdings: PortfolioHolding[]; summary: PortfolioSummary } {
  const tokens: any[] = raw?.data?.tokens ?? [];
  const sum = raw?.data?.summary ?? {};

  const holdings: PortfolioHolding[] = tokens
    .filter((token: any) => token?.quantity?.holding !== undefined)
    .map((token: any) => {
      const holding = token.quantity?.holding ?? 0;
      const currentPrice = token.pricing?.current_price ?? 0;
      const currentValue = token.cashflow_usd?.current_value ?? 0;
      const tokenAddress = token.address ?? "";
      const tokenMeta = metadata[tokenAddress] || {};
      
      return {
        symbol: token.symbol ?? "",
        name: tokenMeta.name || token.symbol || "",
        icon: tokenMeta.logo_uri || "",
        count: holding,
        priceUsd: currentPrice,
        valueUsd: currentValue,
        priceChange24h: 0, // Not provided by Birdeye PnL endpoint
        unrealizedPnlUsd: token.pnl?.unrealized_usd ?? 0,
        unrealizedPnlPct: token.pnl?.unrealized_percent ?? 0,
        realizedPnlUsd: token.pnl?.realized_profit_usd ?? 0,
        allTimePnlUsd: token.pnl?.total_usd ?? 0,
        avgBuyPrice: token.pricing?.avg_buy_cost ?? 0,
      };
    })
    .sort((a, b) => b.valueUsd - a.valueUsd);

  const summary: PortfolioSummary = {
    totalValueUsd: sum.cashflow_usd?.current_value ?? 0,
    totalCostUsd: sum.cashflow_usd?.total_invested ?? 0,
    unrealizedPnlUsd: sum.pnl?.unrealized_usd ?? 0,
    realizedPnlUsd: sum.pnl?.realized_profit_usd ?? 0,
    allTimePnlUsd: sum.pnl?.total_usd ?? 0,
    pnl24hUsd: 0, // Not provided in this format
    pnl24hPct: 0, // Not provided in this format
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
        // Fetch portfolio data from Birdeye API
        const raw = await fetchPortfolioPL(address!, network);
        if (cancelledRef.current) return;

        // Extract token addresses from the response
        const tokens: any[] = raw?.data?.tokens ?? [];
        const tokenAddresses = tokens
          .map((token: any) => token.address)
          .filter((addr: any) => addr);

        // Fetch metadata for all tokens to get logos and full names
        const metadata = tokenAddresses.length > 0 
          ? await fetchTokenMetadata(tokenAddresses, network)
          : {};
        
        if (cancelledRef.current) return;

        const mapped = mapResponse(raw, metadata);
        setHoldings(mapped.holdings);
        setSummary(mapped.summary);
        setError(null);
      } catch (err: any) {
        if (!cancelledRef.current) {
          console.error("Portfolio fetch error:", err);
          setError(err?.message ?? "Failed to load portfolio");
        }
      } finally {
        if (!cancelledRef.current) {
          setLoading(false);
          setSyncing(false);
        }
      }
    }

    load();

    return () => {
      cancelledRef.current = true;
    };
  }, [address, network, tick]);

  return { holdings, summary, loading, syncing, error, refetch };
}
