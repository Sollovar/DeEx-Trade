import { useState, useEffect, useRef } from "react";

export interface BackendPair {
  id: string;
  network: string;
  pair_address: string;
  pool_name: string;
  dex_name: string;
  base_symbol: string;
  quote_symbol: string;
  base_token: {
    logo: string;
    name: string;
    symbol: string;
    address: string;
    image_url: string;
  } | null;
  quote_token: {
    logo: string;
    name: string;
    symbol: string;
    address: string;
    image_url: string;
  } | null;
  market_cap_usd: number;
  price_usd: string;
  price_change_24h: string;
  volume_24h_usd: string;
  liquidity_usd: string;
  created_at: string;
}

export interface NormalizedPair {
  id: string;
  symbol: string;
  symbolSlash: string;
  base: string;
  quote: string;
  chain: string;
  network: string;
  price: number;
  change24h: number;
  volume: number;
  marketCap: number;
  liquidity: number;
  color: string;
  letter: string;
  logo: string;
  dex: string;
  pairAddress: string;
}

const CHAIN_LABEL: Record<string, string> = {
  bsc: "BSC",
  base: "Base",
  solana: "Solana",
};

const TOKEN_COLORS: Record<string, string> = {
  BTC: "#f7931a", ETH: "#627eea", BNB: "#f3ba2f", SOL: "#9945ff",
  XRP: "#00aae4", DOGE: "#c2a633", AVAX: "#e84142", LINK: "#375bd2",
  ARB: "#28a0f0", OP:  "#ff0420", SUI: "#4da2ff", PEPE: "#4caf50",
  WIF: "#ff6b35", JUP: "#7b61ff", TIA: "#8b5cf6", ADA: "#3468d1",
  UNI: "#ff007a", INJ: "#00b5d8", DOT: "#e6007a", MATIC: "#8247e5",
};

const PALETTE = [
  "#f7931a","#627eea","#f3ba2f","#9945ff","#00aae4","#4caf50",
  "#e84142","#375bd2","#ff007a","#00b5d8","#ff6b35","#7b61ff",
  "#8b5cf6","#e6007a","#3468d1","#c2a633","#28a0f0","#8247e5",
];

function symbolColor(sym: string): string {
  if (TOKEN_COLORS[sym]) return TOKEN_COLORS[sym];
  let hash = 0;
  for (const c of sym) hash = (hash * 31 + c.charCodeAt(0)) & 0x7fffffff;
  return PALETTE[hash % PALETTE.length];
}

export function normalizePair(p: BackendPair): NormalizedPair {
  const price     = parseFloat(p.price_usd)      || 0;
  const change24h = parseFloat(p.price_change_24h) || 0;
  const volume    = parseFloat(p.volume_24h_usd)  || 0;
  const liquidity = parseFloat(p.liquidity_usd)   || 0;
  const marketCap = p.market_cap_usd               || 0;
  const chain     = CHAIN_LABEL[p.network] ?? p.network.toUpperCase();
  const color     = symbolColor(p.base_symbol);
  const logo      = p.base_token?.logo ?? p.base_token?.image_url ?? "";

  return {
    id:          p.id,
    symbol:      `${p.base_symbol}${p.quote_symbol}`,
    symbolSlash: `${p.base_symbol}/${p.quote_symbol}`,
    base:        p.base_symbol,
    quote:       p.quote_symbol,
    chain,
    network:     p.network,
    price,
    change24h,
    volume,
    marketCap,
    liquidity,
    color,
    letter:      p.base_symbol.charAt(0).toUpperCase(),
    logo,
    dex:         p.dex_name,
    pairAddress: p.pair_address,
  };
}

interface UsePairsOptions {
  network?: string;
  search?: string;
  limit?: number;
  refetchInterval?: number;
}

export function usePairs(opts: UsePairsOptions = {}) {
  const { network, search, limit = 100, refetchInterval = 60_000 } = opts;
  const [pairs, setPairs]     = useState<NormalizedPair[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchPairs() {
      try {
        const params = new URLSearchParams();
        if (network) params.set("network", network);
        if (search)  params.set("search",  search);
        params.set("limit", String(limit));

        const res = await fetch(`/api/pairs?${params}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: BackendPair[] = await res.json();
        if (!cancelled) {
          setPairs(data.map(normalizePair));
          setLoading(false);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(String(err));
          setLoading(false);
        }
      }
    }

    setLoading(true);
    fetchPairs();

    if (refetchInterval > 0) {
      timerRef.current = setInterval(fetchPairs, refetchInterval);
    }

    return () => {
      cancelled = true;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [network, search, limit, refetchInterval]);

  return { pairs, loading, error };
}
