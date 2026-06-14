import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
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

function fmtVolume(n: number) {
  if (n >= 1_000_000_000) return "$" + (n / 1_000_000_000).toFixed(2) + "B";
  if (n >= 1_000_000)     return "$" + (n / 1_000_000).toFixed(2) + "M";
  return "$" + n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function fmtOI(n: number) {
  if (n >= 1_000_000_000) return "$" + (n / 1_000_000_000).toFixed(3) + "B";
  if (n >= 1_000_000)     return "$" + (n / 1_000_000).toFixed(3) + "M";
  if (n >= 1_000)         return "$" + (n / 1_000).toFixed(2) + "K";
  return "$" + n.toFixed(2);
}

function fmtFunding(r: number) {
  return (r >= 0 ? "+" : "") + (r * 100).toFixed(4) + "%";
}

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
  const [expanded, setExpanded] = useState(false);
  const [priceHistory, setPriceHistory] = useState<number[]>([market.price]);

  useEffect(() => {
    setPriceHistory((h) => [...h, market.price].slice(-60));
  }, [market.price]);

  const baseSymbol  = pair?.baseToken.symbol ?? currentSymbol.split("/")[0] ?? "?";
  const quoteSymbol = pair?.quoteToken.symbol ?? currentSymbol.split("/")[1] ?? "USDT";
  const baseName    = pair?.baseToken.name ?? baseSymbol;
  const baseLogo    = pair?.baseToken.logo ?? "";
  const coin        = COIN_COLORS[baseSymbol] ?? { color: "#f5c518", initial: baseSymbol[0] ?? "?" };
  const priceUp     = market.price >= market.prevPrice;
  const priceColor  = priceUp ? "#00c853" : "#ff1744";
  const changePct   = (market.change24h * 100).toFixed(2);
  const changeDollar = Math.abs(market.price * market.change24h).toFixed(3);
  const changeColor  = market.change24h >= 0 ? "#00c853" : "#ff1744";
  const fundingColor = market.fundingRate >= 0 ? "#00c853" : "#ff4d6a";
  const sparkColor   = priceHistory.length >= 2 && priceHistory[priceHistory.length - 1] >= priceHistory[0]
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

        {/* Right: sparkline + price + expand toggle */}
        <div className="flex items-center gap-2">

          {/* Sparkline */}
          <Sparkline prices={priceHistory} color={sparkColor} w={68} h={24} />

          {/* Price + change */}
          <div className="text-right">
            <div className="font-bold text-[18px] font-mono tabular-nums leading-none" style={{ color: priceColor }}>
              {market.price.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
            </div>
            <div className="text-[12px] font-mono tabular-nums leading-none mt-0.5" style={{ color: changeColor }}>
              {market.change24h >= 0 ? "+" : "-"}{changeDollar} / {market.change24h >= 0 ? "+" : ""}{changePct}%
            </div>
          </div>

          {/* Expand / collapse */}
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center justify-center active:opacity-60 transition-opacity"
          >
            {expanded
              ? <ChevronUp   className="w-5 h-5" style={{ color: "var(--m-fg-4)" }} />
              : <ChevronDown className="w-5 h-5" style={{ color: "var(--m-fg-4)" }} />
            }
          </button>
        </div>
      </div>

      {/* ── Expanded stats panel ── */}
      {expanded && (
        <div
          className="px-4 pb-3 grid grid-cols-2 gap-x-6 gap-y-3"
          style={{ borderTop: "1px solid var(--m-bg-3)" }}
        >
          <div className="flex flex-col gap-0.5 pt-3">
            <span className="text-[11px] font-medium" style={{ color: "var(--m-fg-4)" }}>24h High</span>
            <span className="font-mono text-[13px] font-semibold tabular-nums" style={{ color: "#00c853" }}>
              {(market.price * 1.018).toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
            </span>
          </div>

          <div className="flex flex-col gap-0.5 pt-3">
            <span className="text-[11px] font-medium" style={{ color: "var(--m-fg-4)" }}>24h Low</span>
            <span className="font-mono text-[13px] font-semibold tabular-nums" style={{ color: "#ff4d6a" }}>
              {(market.price * 0.983).toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
            </span>
          </div>

          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] font-medium" style={{ color: "var(--m-fg-4)" }}>24h Volume</span>
            <span className="font-mono text-[13px] font-semibold tabular-nums" style={{ color: "var(--m-fg-2)" }}>
              {fmtVolume(market.volume24h)}
            </span>
          </div>

          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] font-medium" style={{ color: "var(--m-fg-4)" }}>Liquidity</span>
            <span className="font-mono text-[13px] font-semibold tabular-nums" style={{ color: "var(--m-fg-2)" }}>
              $1.003B
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
