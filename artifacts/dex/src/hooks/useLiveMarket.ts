import { useState, useEffect, useRef, useCallback } from "react";

export interface OrderBookRow {
  price: number;
  size: number;
  total: number;
  depth: number;
  flash?: "up" | "down" | null;
}

export interface LiveMarketState {
  price: number;
  prevPrice: number;
  markPrice: number;
  indexPrice: number;
  change24h: number;
  volume24h: number;
  openInterest: number;
  fundingRate: number;
  fundingCountdown: string;
  asks: OrderBookRow[];
  bids: OrderBookRow[];
  lastTradeDir: "up" | "down";
  latencyMs: number;
}

const BASE_PRICE = 61203.6;
const NUM_ROWS = 15;

function buildInitialRows(basePrice: number, side: "ask" | "bid"): OrderBookRow[] {
  let cumTotal = 0;
  return Array.from({ length: NUM_ROWS }).map((_, i) => {
    const price = side === "ask"
      ? basePrice + 0.3 * (NUM_ROWS - i)
      : basePrice - 0.3 * i;
    const size = parseFloat((Math.random() * 2.5 + 0.05).toFixed(3));
    cumTotal += size;
    return {
      price: parseFloat(price.toFixed(1)),
      size,
      total: parseFloat(cumTotal.toFixed(3)),
      depth: 0,
      flash: null,
    };
  });
}

function normalizeDepth(rows: OrderBookRow[]): OrderBookRow[] {
  const maxSize = Math.max(...rows.map((r) => r.size));
  return rows.map((r) => ({ ...r, depth: maxSize > 0 ? (r.size / maxSize) * 90 : 0 }));
}

function buildCountdown(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function wiggle(value: number, maxPct: number): number {
  return value + value * (Math.random() - 0.5) * maxPct;
}

export function useLiveMarket(): LiveMarketState {
  const countdownRef = useRef(6776); // ~01:52:56

  const [state, setState] = useState<LiveMarketState>(() => {
    const asks = normalizeDepth(buildInitialRows(BASE_PRICE, "ask"));
    const bids = normalizeDepth(buildInitialRows(BASE_PRICE, "bid"));
    return {
      price: BASE_PRICE,
      prevPrice: BASE_PRICE,
      markPrice: 61207.5,
      indexPrice: 61241.4,
      change24h: -0.007,
      volume24h: 1002644028.04,
      openInterest: 686200,
      fundingRate: -0.000024,
      fundingCountdown: buildCountdown(countdownRef.current),
      asks,
      bids,
      lastTradeDir: "down",
      latencyMs: 451,
    };
  });

  // Price tick — every 400ms
  useEffect(() => {
    const id = setInterval(() => {
      setState((prev) => {
        const direction = Math.random() > 0.52 ? -1 : 1;
        const magnitude = Math.random() * 3.5 + 0.1;
        const newPrice = parseFloat((prev.price + direction * magnitude).toFixed(1));
        const spread = parseFloat((Math.random() * 4 + 2).toFixed(1));

        const newAsks = normalizeDepth(
          prev.asks.map((row, i) => {
            const jitter = (Math.random() - 0.5) * 0.2;
            const baseAsk = newPrice + spread + 0.3 * (NUM_ROWS - i);
            const newRowPrice = parseFloat((baseAsk + jitter).toFixed(1));
            const sizeChanged = Math.random() < 0.3;
            const newSize = sizeChanged
              ? parseFloat((Math.random() * 2.5 + 0.05).toFixed(3))
              : row.size;
            return {
              ...row,
              price: newRowPrice,
              size: newSize,
              flash: sizeChanged ? (newSize > row.size ? "up" : "down") : null,
            };
          })
        );

        const newBids = normalizeDepth(
          prev.bids.map((row, i) => {
            const jitter = (Math.random() - 0.5) * 0.2;
            const baseBid = newPrice - 0.3 * i - jitter;
            const newRowPrice = parseFloat((baseBid).toFixed(1));
            const sizeChanged = Math.random() < 0.3;
            const newSize = sizeChanged
              ? parseFloat((Math.random() * 2.5 + 0.05).toFixed(3))
              : row.size;
            return {
              ...row,
              price: newRowPrice,
              size: newSize,
              flash: sizeChanged ? (newSize > row.size ? "up" : "down") : null,
            };
          })
        );

        // Recalculate cumulative totals
        let cumAsk = 0;
        const asksWithTotal = newAsks.map((r) => {
          cumAsk += r.size;
          return { ...r, total: parseFloat(cumAsk.toFixed(3)) };
        });
        let cumBid = 0;
        const bidsWithTotal = newBids.map((r) => {
          cumBid += r.size;
          return { ...r, total: parseFloat(cumBid.toFixed(3)) };
        });

        return {
          ...prev,
          prevPrice: prev.price,
          price: newPrice,
          markPrice: parseFloat((newPrice + spread / 2).toFixed(1)),
          indexPrice: parseFloat((newPrice + spread * 2).toFixed(1)),
          lastTradeDir: newPrice >= prev.price ? "up" : "down",
          asks: asksWithTotal,
          bids: bidsWithTotal,
          latencyMs: Math.floor(Math.random() * 60 + 420),
        };
      });
    }, 400);

    return () => clearInterval(id);
  }, []);

  // Funding countdown — every second
  useEffect(() => {
    const id = setInterval(() => {
      countdownRef.current = countdownRef.current <= 0 ? 28800 : countdownRef.current - 1;
      setState((prev) => ({
        ...prev,
        fundingCountdown: buildCountdown(countdownRef.current),
        volume24h: prev.volume24h + Math.random() * 50000,
      }));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Clear flash flags after 200ms
  useEffect(() => {
    const id = setInterval(() => {
      setState((prev) => ({
        ...prev,
        asks: prev.asks.map((r) => ({ ...r, flash: null })),
        bids: prev.bids.map((r) => ({ ...r, flash: null })),
      }));
    }, 250);
    return () => clearInterval(id);
  }, []);

  return state;
}
