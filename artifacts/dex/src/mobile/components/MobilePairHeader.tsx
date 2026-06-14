import { useState, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { LiveMarketState } from "@/hooks/useLiveMarket";
import type { Pair } from "@/types";

interface Props {
  market: LiveMarketState;
  currentSymbol: string;
  pair?: Pair | null;
  onOpenMarketPanel: () => void;
}

const COIN_COLORS: Record<string, { color: string; initial: string }> = {
  BTC:  { color: "#f7931a", initial: "B" },
  ETH:  { color: "#627eea", initial: "E" },
  BNB:  { color: "#f3ba2f", initial: "B" },
  SOL:  { color: "#9945ff", initial: "S" },
  XRP:  { color: "#346aa9", initial: "X" },
  DOGE: { color: "#c2a633", initial: "D" },
  ADA:  { color: "#3468d1", initial: "A" },
  DOT:  { color: "#e6007a", initial: "D" },
  AVAX: { color: "#e84142", initial: "A" },
  LINK: { color: "#375bd2", initial: "L" },
  SUI:  { color: "#4ca2f9", initial: "S" },
  NEAR: { color: "#00d5bd", initial: "N" },
};


/* ── Mini sparkline ── */
function Sparkline({ prices, color, w = 68, h = 24 }: { prices: number[]; color: string; w?: number; h?: number }) {
  if (prices.length < 2) return <div style={{ width: w, height: h }} />;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const pad = 2;
  const coords = prices.map((p, i) => ({
    x: (i / (prices.length - 1)) * w,
    y: h - pad - ((p - min) / range) * (h - pad * 2),
  }));
  const linePoints = coords.map((c) => `${c.x},${c.y}`).join(" ");
  const areaPath =
    `M${coords[0].x},${coords[0].y} ` +
    coords.slice(1).map((c) => `L${c.x},${c.y}`).join(" ") +
    ` L${w},${h} L0,${h} Z`;
  const gradId = `spark-${color.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: "hidden", display: "block" }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0}   />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      <polyline
        points={linePoints}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function MobilePairHeader({ market, currentSymbol, pair, onOpenMarketPanel }: Props) {
  const [priceHistory, setPriceHistory] = useState<number[]>([market.price]);

  useEffect(() => {
    setPriceHistory((h) => [...h, market.price].slice(-60));
  }, [market.price]);

  const baseSymbol  = pair?.baseToken.symbol ?? currentSymbol.split("/")[0] ?? "?";
  const quoteSymbol = pair?.quoteToken.symbol ?? currentSymbol.split("/")[1] ?? "USDT";
  const baseName    = pair?.baseToken.name ?? baseSymbol;
  const baseLogo    = pair?.baseToken.logo ?? "";
  const coin        = COIN_COLORS[baseSymbol] ?? { color: "#f5c518", initial: baseSymbol[0] ?? "?" };

  // Use real pair price and change — fall back to market only if pair not loaded yet
  const realPrice   = pair?.priceUSD ?? pair?.price ?? 0;
  const realChange  = pair?.priceChange24h ?? 0;
  const priceColor  = realChange >= 0 ? "#00c853" : "#ff1744";
  const changePct   = (realChange * 100).toFixed(2);
  const sparkColor  = priceHistory.length >= 2 && priceHistory[priceHistory.length - 1] >= priceHistory[0]
    ? "#00c853" : "#ff1744";

  return (
    <div style={{ backgroundColor: "var(--m-bg-1)", borderBottom: "1px solid var(--m-bdr)" }}>

      {/* ── Top row ── */}
      <div className="flex items-center justify-between px-4 h-[56px]">

        {/* Left: coin icon + symbol + chain */}
        <button
          onClick={onOpenMarketPanel}
          className="flex items-center gap-2.5 active:opacity-70 transition-opacity"
        >
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold overflow-hidden"
            style={{ backgroundColor: coin.color + "28", border: `1.5px solid ${coin.color}45`, color: coin.color }}
          >
            {baseLogo ? (
              <img src={baseLogo} alt={baseSymbol} className="w-6 h-6 rounded-full object-cover"
                onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
            ) : coin.initial}
          </div>
          <div className="flex flex-col leading-none gap-0.5">
            <div className="flex items-center gap-1">
              <span className="font-bold text-[15px]" style={{ color: "var(--m-fg)" }}>
                {baseSymbol}<span style={{ color: "var(--m-fg-4)", fontWeight: 400 }}>/{quoteSymbol}</span>
              </span>
              <ChevronDown className="w-3.5 h-3.5" style={{ color: "var(--m-fg-4)" }} />
            </div>
            <span className="text-[11px] truncate max-w-[120px]" style={{ color: "var(--m-fg-4)" }}>{baseName}</span>
          </div>
        </button>

        {/* Right: sparkline + real price + real change */}
        <div className="flex items-center gap-2">
          <Sparkline prices={priceHistory} color={sparkColor} w={68} h={24} />
          <div className="text-right">
            <div className="font-bold text-[18px] font-mono tabular-nums leading-none" style={{ color: priceColor }}>
              {realPrice > 0
                ? realPrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 6 })
                : "—"}
            </div>
            <div className="text-[12px] font-mono tabular-nums leading-none mt-0.5" style={{ color: priceColor }}>
              {realPrice > 0 ? `${realChange >= 0 ? "+" : ""}${changePct}%` : ""}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
