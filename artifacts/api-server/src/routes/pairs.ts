import { Router, type IRouter } from "express";

const router: IRouter = Router();

// Mock pair data for development
const mockPairs = [
  {
    id: "1",
    pairAddress: "0x1234567890abcdef",
    dexName: "Uniswap V3",
    network: "ethereum",
    baseToken: {
      address: "0x0000000000000000000000000000000000000001",
      name: "Ethereum",
      symbol: "ETH",
      logo: "https://assets.coingecko.com/coins/images/279/small/ethereum.png",
      decimals: 18,
    },
    quoteToken: {
      address: "0x0000000000000000000000000000000000000002",
      name: "US Dollar Coin",
      symbol: "USDC",
      logo: "https://assets.coingecko.com/coins/images/6319/small/usdc.png",
      decimals: 6,
    },
    price: 3245.67,
    priceUSD: 3245.67,
    priceChange24h: 2.45,
    priceHigh24h: 3350.5,
    priceLow24h: 3150.2,
    volume24h: 125000000,
    volume24hUSD: 125000000,
    liquidity: 85000000,
    liquidityUSD: 85000000,
    marketCap: 390000000000,
    marketCapUSD: 390000000000,
    trendingScore: 98,
    logoUrl: "https://assets.coingecko.com/coins/images/279/small/ethereum.png",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "2",
    pairAddress: "0x1234567890abcdef",
    dexName: "Uniswap V3",
    network: "ethereum",
    baseToken: {
      address: "0x0000000000000000000000000000000000000003",
      name: "Bitcoin",
      symbol: "BTC",
      logo: "https://assets.coingecko.com/coins/images/1/small/bitcoin.png",
      decimals: 8,
    },
    quoteToken: {
      address: "0x0000000000000000000000000000000000000002",
      name: "US Dollar Coin",
      symbol: "USDC",
      logo: "https://assets.coingecko.com/coins/images/6319/small/usdc.png",
      decimals: 6,
    },
    price: 61203.6,
    priceUSD: 61203.6,
    priceChange24h: 1.23,
    priceHigh24h: 62100,
    priceLow24h: 60500,
    volume24h: 28000000,
    volume24hUSD: 28000000,
    liquidity: 45000000,
    liquidityUSD: 45000000,
    marketCap: 1200000000000,
    marketCapUSD: 1200000000000,
    trendingScore: 99,
    logoUrl: "https://assets.coingecko.com/coins/images/1/small/bitcoin.png",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "3",
    pairAddress: "0x1234567890abcdef",
    dexName: "Raydium",
    network: "solana",
    baseToken: {
      address: "So11111111111111111111111111111111111111112",
      name: "Solana",
      symbol: "SOL",
      logo: "https://assets.coingecko.com/coins/images/4128/small/solana.png",
      decimals: 9,
    },
    quoteToken: {
      address: "EPjFWdd5Au...",
      name: "USD Coin",
      symbol: "USDC",
      logo: "https://assets.coingecko.com/coins/images/6319/small/usdc.png",
      decimals: 6,
    },
    price: 142.89,
    priceUSD: 142.89,
    priceChange24h: 3.45,
    priceHigh24h: 148.5,
    priceLow24h: 135.2,
    volume24h: 450000000,
    volume24hUSD: 450000000,
    liquidity: 125000000,
    liquidityUSD: 125000000,
    marketCap: 65000000000,
    marketCapUSD: 65000000000,
    trendingScore: 95,
    logoUrl: "https://assets.coingecko.com/coins/images/4128/small/solana.png",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "4",
    pairAddress: "0x1234567890abcdef",
    dexName: "PancakeSwap",
    network: "bsc",
    baseToken: {
      address: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
      name: "Binance Coin",
      symbol: "BNB",
      logo: "https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png",
      decimals: 18,
    },
    quoteToken: {
      address: "0x0000000000000000000000000000000000000002",
      name: "US Dollar Coin",
      symbol: "USDC",
      logo: "https://assets.coingecko.com/coins/images/6319/small/usdc.png",
      decimals: 6,
    },
    price: 625.45,
    priceUSD: 625.45,
    priceChange24h: -1.23,
    priceHigh24h: 638.2,
    priceLow24h: 610.5,
    volume24h: 95000000,
    volume24hUSD: 95000000,
    liquidity: 72000000,
    liquidityUSD: 72000000,
    marketCap: 92000000000,
    marketCapUSD: 92000000000,
    trendingScore: 92,
    logoUrl: "https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "5",
    pairAddress: "0x1234567890abcdef",
    dexName: "Uniswap V3",
    network: "base",
    baseToken: {
      address: "0x0000000000000000000000000000000000000004",
      name: "Arbitrum",
      symbol: "ARB",
      logo: "https://assets.coingecko.com/coins/images/16792/small/arbitrum-arb-logo.png",
      decimals: 18,
    },
    quoteToken: {
      address: "0x0000000000000000000000000000000000000002",
      name: "US Dollar Coin",
      symbol: "USDC",
      logo: "https://assets.coingecko.com/coins/images/6319/small/usdc.png",
      decimals: 6,
    },
    price: 0.89,
    priceUSD: 0.89,
    priceChange24h: 5.67,
    priceHigh24h: 0.95,
    priceLow24h: 0.82,
    volume24h: 125000000,
    volume24hUSD: 125000000,
    liquidity: 42000000,
    liquidityUSD: 42000000,
    marketCap: 890000000,
    marketCapUSD: 890000000,
    trendingScore: 88,
    logoUrl: "https://assets.coingecko.com/coins/images/16792/small/arbitrum-arb-logo.png",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

router.get("/v1/pairs", (req, res) => {
  try {
    res.json({
      success: true,
      data: mockPairs,
      count: mockPairs.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch pairs",
    });
  }
});

router.get("/v1/pairs/trending", (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 12;
    const network = req.query.network as string;

    let filtered = mockPairs;
    if (network) {
      filtered = filtered.filter((p) => p.network === network);
    }

    const trending = filtered.slice(0, limit);
    res.json({
      success: true,
      data: trending,
      count: trending.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch trending pairs",
    });
  }
});

router.get("/v1/pairs/:id", (req, res) => {
  try {
    const pair = mockPairs.find((p) => p.id === req.params.id);
    if (!pair) {
      return res.status(404).json({
        success: false,
        error: "Pair not found",
      });
    }
    res.json({
      success: true,
      data: pair,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch pair",
    });
  }
});

export default router;
