import { logger } from "../lib/logger";

const GECKO_API = "https://api.geckoterminal.com/api/v2";

const NETWORK_MAP: Record<string, string> = {
  bsc: "bsc",
  base: "base",
  ethereum: "eth",
  solana: "solana",
};

const SKIP_QUOTE_TOKENS: Record<string, string[]> = {
  bsc: ["BNB", "WBNB"],
  base: ["ETH", "WETH", "MUSD", "FIETH"],
};

export interface TokenInfo {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  logo: string;
  image_url?: string;
  description?: string;
  websites?: string[];
  twitter_handle?: string;
  coingecko_id?: string;
  gt_score?: number;
  gt_verified?: boolean;
}

export interface PairData {
  id: string;
  network: string;
  pair_address: string;
  pool_name: string;
  dex_name: string;
  base_symbol: string;
  quote_symbol: string;
  base_token: TokenInfo | null;
  quote_token: TokenInfo | null;
  base_token_decimals: number;
  quote_token_decimals: number;
  base_token_info: TokenInfo | null;
  quote_token_info: TokenInfo | null;
  market_cap_usd: number;
  market_cap: number;
  price_usd: string;
  price_change_24h: string;
  volume_24h_usd: string;
  liquidity_usd: string;
  created_at: string;
  indexed_at: string;
}

export interface OhlcvCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

async function fetchWithRetry(url: string, retries = 4): Promise<unknown> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, {
        headers: {
          Accept: "application/json",
          "User-Agent": "DEXTrade-Bot/1.0",
        },
        signal: AbortSignal.timeout(15_000),
      });

      if (res.status === 429) {
        const retryAfter = parseInt(res.headers.get("Retry-After") ?? "60", 10);
        const baseWait = isNaN(retryAfter) || retryAfter <= 0 ? 60 : retryAfter;
        const wait = baseWait * 1000 * (i + 1);
        logger.warn({ url, wait }, "[GeckoTerminal] rate limited, waiting");
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }

      if (!res.ok) {
        if (res.status >= 500 && i < retries - 1) {
          await new Promise((r) => setTimeout(r, 5000 * (i + 1)));
          continue;
        }
        throw new Error(`HTTP ${res.status}`);
      }

      return await res.json();
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, i)));
    }
  }
  throw new Error(`Failed to fetch ${url} after ${retries} retries`);
}

function normalizeAddress(address: string, network: string): string {
  if (!address) return "";
  return network === "solana" ? address : address.toLowerCase();
}

function extractTokenInfo(tokenData: Record<string, unknown>, network: string): TokenInfo | null {
  if (!tokenData?.attributes) return null;
  const attrs = tokenData.attributes as Record<string, unknown>;

  let imageUrl = "";
  if (attrs.image_url && typeof attrs.image_url === "string") {
    imageUrl = attrs.image_url;
  } else if (attrs.image && typeof attrs.image === "object") {
    const img = attrs.image as Record<string, string>;
    imageUrl = img.large || img.small || img.thumb || "";
  }

  const websites: string[] = [];
  if (Array.isArray(attrs.websites)) {
    for (const w of attrs.websites) {
      if (typeof w === "string") websites.push(w);
    }
  }

  const address = normalizeAddress((attrs.address as string) || "", network);
  const symbol = (attrs.symbol as string) || "";
  const name = (attrs.name as string) || symbol;
  const decimals = parseInt((attrs.decimals as string) || "18", 10) || 18;

  return {
    address,
    name,
    symbol,
    decimals,
    logo: imageUrl,
    image_url: imageUrl,
    description: (attrs.description as string) || "",
    websites,
    twitter_handle: (attrs.twitter_handle as string) || "",
    coingecko_id: (attrs.coingecko_coin_id as string) || "",
    gt_score: typeof attrs.gt_score === "number" ? attrs.gt_score : parseFloat((attrs.gt_score as string) || "0") || 0,
    gt_verified: attrs.gt_verified === true,
  };
}

export async function fetchTrendingPairs(network: string): Promise<PairData[]> {
  const geckoNetwork = NETWORK_MAP[network];
  if (!geckoNetwork) return [];

  const skipQuote = SKIP_QUOTE_TOKENS[network] ?? [];
  const results: PairData[] = [];

  try {
    const trendingUrl = `${GECKO_API}/networks/${geckoNetwork}/trending_pools?include=base_token,quote_token&page=1&duration=6h`;
    const trendingData = (await fetchWithRetry(trendingUrl)) as {
      data?: unknown[];
      included?: unknown[];
    };

    if (!trendingData.data || trendingData.data.length === 0) return [];

    const poolAddresses = trendingData.data
      .map((p: unknown) => {
        const pool = p as { attributes?: { address?: string } };
        return normalizeAddress(pool.attributes?.address ?? "", network);
      })
      .filter(Boolean)
      .slice(0, 20);

    const multiUrl = `${GECKO_API}/networks/${geckoNetwork}/pools/multi/${poolAddresses.join(",")}?include=base_token,quote_token`;
    const multiData = (await fetchWithRetry(multiUrl)) as {
      data?: unknown[];
      included?: unknown[];
    };

    if (!multiData.data) return [];

    const included = (multiData.included ?? []) as Record<string, unknown>[];

    for (const poolRaw of multiData.data) {
      const pool = poolRaw as {
        attributes?: Record<string, unknown>;
        relationships?: {
          base_token?: { data?: { id?: string } };
          quote_token?: { data?: { id?: string } };
          dex?: { data?: { id?: string } };
        };
      };

      const attrs = pool.attributes ?? {};
      const rels = pool.relationships ?? {};

      const baseTokenId = rels.base_token?.data?.id;
      const quoteTokenId = rels.quote_token?.data?.id;

      const baseTokenRaw = included.find((t) => t["id"] === baseTokenId);
      const quoteTokenRaw = included.find((t) => t["id"] === quoteTokenId);

      const baseInfo = baseTokenRaw ? extractTokenInfo(baseTokenRaw, network) : null;
      const quoteInfo = quoteTokenRaw ? extractTokenInfo(quoteTokenRaw, network) : null;

      const baseSymbol = baseInfo?.symbol || ((attrs.name as string) ?? "").split("/")[0]?.trim() || "???";
      const quoteSymbol = quoteInfo?.symbol || ((attrs.name as string) ?? "").split("/")[1]?.replace(/\s*\d+(\.\d+)?%?$/, "")?.trim() || "???";

      if (skipQuote.includes(quoteSymbol.toUpperCase())) continue;

      const normalizedAddress = normalizeAddress((attrs.address as string) ?? "", network);
      const pairId = `${network}_${normalizedAddress}`;

      const dexName =
        (attrs.pool_name as string)?.includes("PancakeSwap") ? "PancakeSwap" :
        (attrs.pool_name as string)?.includes("Uniswap") ? "Uniswap" :
        (attrs.pool_name as string)?.includes("Aero") ? "Aerodrome" :
        (attrs.pool_name as string)?.includes("Raydium") ? "Raydium" :
        (attrs.pool_name as string)?.split(" ")[0] || "DEX";

      results.push({
        id: pairId,
        network,
        pair_address: normalizedAddress,
        pool_name: (attrs.pool_name as string) || (attrs.name as string) || `${baseSymbol}/${quoteSymbol}`,
        dex_name: dexName,
        base_symbol: baseSymbol,
        quote_symbol: quoteSymbol,
        base_token: baseInfo,
        quote_token: quoteInfo,
        base_token_decimals: baseInfo?.decimals ?? 18,
        quote_token_decimals: quoteInfo?.decimals ?? 18,
        base_token_info: baseInfo,
        quote_token_info: quoteInfo,
        market_cap_usd: parseFloat((attrs.market_cap_usd as string) || "0") || 0,
        market_cap: Math.floor(parseFloat((attrs.market_cap_usd as string) || "0") || 0),
        price_usd: (attrs.base_token_price_usd as string) || "0",
        price_change_24h: (attrs.price_change_percentage?.h24 as string) || "0",
        volume_24h_usd: (attrs.volume_usd?.h24 as string) || "0",
        liquidity_usd: (attrs.reserve_in_usd as string) || "0",
        created_at: (attrs.pool_created_at as string) || new Date().toISOString(),
        indexed_at: new Date().toISOString(),
      });
    }
  } catch (e) {
    logger.error(e, `[GeckoTerminal] error fetching trending pairs for ${network}`);
  }

  return results;
}

export async function fetchPoolOhlcv(
  network: string,
  poolAddress: string,
  timeframe: string = "minute",
  aggregate: number = 1,
  limit: number = 300,
  currency: string = "usd"
): Promise<OhlcvCandle[]> {
  const geckoNetwork = NETWORK_MAP[network];
  if (!geckoNetwork) return [];

  try {
    const url = `${GECKO_API}/networks/${geckoNetwork}/pools/${poolAddress}/ohlcv/${timeframe}?aggregate=${aggregate}&limit=${limit}&currency=${currency}`;
    const data = (await fetchWithRetry(url)) as {
      data?: {
        attributes?: {
          ohlcv_list?: [number, number, number, number, number, number][];
        };
      };
    };

    const ohlcvList = data?.data?.attributes?.ohlcv_list ?? [];
    return ohlcvList.map(([time, open, high, low, close, volume]) => ({
      time,
      open,
      high,
      low,
      close,
      volume,
    }));
  } catch (e) {
    logger.error(e, `[GeckoTerminal] error fetching OHLCV for ${poolAddress}`);
    return [];
  }
}

export async function fetchPoolStats(
  network: string,
  poolAddress: string
): Promise<{
  price_usd: string;
  price_change_24h: string;
  volume_24h_usd: string;
  liquidity_usd: string;
  market_cap_usd: string;
} | null> {
  const geckoNetwork = NETWORK_MAP[network];
  if (!geckoNetwork) return null;

  try {
    const url = `${GECKO_API}/networks/${geckoNetwork}/pools/${poolAddress}`;
    const data = (await fetchWithRetry(url)) as {
      data?: {
        attributes?: Record<string, unknown>;
      };
    };

    const attrs = data?.data?.attributes;
    if (!attrs) return null;

    return {
      price_usd: (attrs.base_token_price_usd as string) || "0",
      price_change_24h: ((attrs.price_change_percentage as Record<string, string>) ?? {})[
        "h24"
      ] || "0",
      volume_24h_usd: ((attrs.volume_usd as Record<string, string>) ?? {})["h24"] || "0",
      liquidity_usd: (attrs.reserve_in_usd as string) || "0",
      market_cap_usd: (attrs.market_cap_usd as string) || (attrs.fdv_usd as string) || "0",
    };
  } catch (e) {
    logger.error(e, `[GeckoTerminal] error fetching pool stats for ${poolAddress}`);
    return null;
  }
}
