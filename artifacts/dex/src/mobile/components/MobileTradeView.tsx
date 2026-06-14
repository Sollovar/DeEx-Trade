import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";
import { LiveMarketState, OrderBookRow } from "@/hooks/useLiveMarket";
import { useDynamicContext, DynamicConnectButton } from "@dynamic-labs/sdk-react-core";
import type { Pair } from "@/types";

/* ── Mini sparkline (shared shape with MobilePairHeader) ── */
function Sparkline({ prices, color, w = 64, h = 22 }: { prices: number[]; color: string; w?: number; h?: number }) {
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
  const gradId = `tv-spark-${color.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: "hidden", display: "block" }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity={0.28} />
          <stop offset="100%" stopColor={color} stopOpacity={0}    />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      <polyline points={linePoints} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

interface Props {
  market: LiveMarketState;
  currentSymbol: string;
  pair?: Pair | null;
  onOpenMarketPanel: () => void;
}

function fmtPrice(n: number, decimals = 3) {
  return n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function tickDecimals(tick: number) {
  if (tick >= 1)   return 0;
  if (tick >= 0.1) return 1;
  return 3;
}

function tickLabel(v: number) {
  if (v < 0.01) return v.toFixed(3);
  if (v < 0.1)  return v.toFixed(2);
  if (v < 1)    return v.toFixed(1);
  return String(v);
}

function groupRows(rows: OrderBookRow[], tickSize: number, side: "ask" | "bid"): OrderBookRow[] {
  if (tickSize <= 0.001) return rows;
  const buckets = new Map<number, { size: number }>();
  for (const row of rows) {
    const key = side === "ask"
      ? Math.ceil(row.price / tickSize) * tickSize
      : Math.floor(row.price / tickSize) * tickSize;
    const rounded = parseFloat(key.toFixed(8));
    const existing = buckets.get(rounded);
    if (existing) { existing.size += row.size; }
    else { buckets.set(rounded, { size: row.size }); }
  }
  const sorted = [...buckets.entries()].sort((a, b) =>
    side === "ask" ? a[0] - b[0] : b[0] - a[0]
  );
  let cumTotal = 0;
  const maxSize = Math.max(...sorted.map(([, v]) => v.size));
  return sorted.map(([price, { size }]) => {
    cumTotal += size;
    return { price, size: parseFloat(size.toFixed(4)), total: parseFloat(cumTotal.toFixed(4)), depth: maxSize > 0 ? (size / maxSize) * 90 : 0, flash: null };
  });
}

function fmtSize(btc: number) {
  if (btc >= 1000) return (btc / 1000).toFixed(2) + "K";
  return btc.toFixed(2);
}

/* ── shared input box style ── */
const INPUT_BOX: React.CSSProperties = {
  backgroundColor: "var(--m-bg-2)",
  border: "1px solid var(--m-bg-4)",
  borderRadius: 8,
};

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="relative w-11 h-6 rounded-full transition-all shrink-0"
      style={{ backgroundColor: on ? "#f5c518" : "var(--m-bg-4)" }}
    >
      <span
        className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-all duration-200"
        style={{ left: on ? "calc(100% - 22px)" : "2px" }}
      />
    </button>
  );
}

function Check({ checked, label, onChange }: { checked: boolean; label: string; onChange: () => void }) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer" onClick={onChange}>
      <div
        className="w-4 h-4 rounded flex items-center justify-center shrink-0 transition-all"
        style={{
          border: checked ? "1.5px solid #f5c518" : "1.5px solid var(--m-fg-5)",
          backgroundColor: checked ? "rgba(245,197,24,0.12)" : "transparent",
        }}
      >
        {checked && (
          <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
            <polyline points="1,3.5 3.5,6 8,1" stroke="#f5c518" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>
      <span className="text-[12px]" style={{ color: "var(--m-fg-3)" }}>{label}</span>
    </label>
  );
}

type BookView = "both" | "asks" | "bids";

function MiniRow({ row, side, maxSize, onFill, decimals }: {
  row: OrderBookRow;
  side: "ask" | "bid";
  maxSize: number;
  onFill: (price: number) => void;
  decimals: number;
}) {
  const priceColor = side === "ask" ? "#ff4d6a" : "#00c8a0";
  const depthBg   = side === "ask" ? "rgba(255,77,106,0.13)" : "rgba(0,200,160,0.13)";
  const depthPct  = maxSize > 0 ? Math.min((row.size / maxSize) * 100, 100) : 0;
  const flashClass = row.flash === "up" ? "flash-up" : row.flash === "down" ? "flash-down" : "";
  return (
    <div
      onClick={() => onFill(row.price)}
      className={`relative flex items-center cursor-pointer active:opacity-60 ${flashClass}`}
      style={{ height: 22, overflow: "hidden" }}
    >
      <div
        className="absolute top-0 bottom-0"
        style={{
          [side === "ask" ? "left" : "right"]: 0,
          width: `${depthPct}%`,
          backgroundColor: depthBg,
          transition: "width 0.2s ease",
        }}
      />
      <span
        className="font-mono tabular-nums text-[11px] font-semibold z-10 pl-2"
        style={{ color: priceColor, flex: "1 1 0", minWidth: 0 }}
      >
        {fmtPrice(row.price, decimals)}
      </span>
      <span
        className="font-mono tabular-nums text-[11px] z-10 pr-2 text-right"
        style={{ color: "var(--m-fg-3)", flex: "0 0 auto" }}
      >
        {fmtSize(row.size)}
      </span>
    </div>
  );
}

/* ── Book-view filter pill ── */
function BookFilter({ view, onChange }: { view: BookView; onChange: (v: BookView) => void }) {
  return (
    <div
      className="flex items-center rounded overflow-hidden shrink-0"
      style={{ border: "1px solid var(--m-bg-4)", height: 20 }}
    >
      {/* asks only — red */}
      <button
        onClick={() => onChange(view === "asks" ? "both" : "asks")}
        className="flex items-center justify-center transition-all active:opacity-70"
        style={{
          width: 22,
          height: "100%",
          backgroundColor: view === "asks" ? "rgba(255,77,106,0.25)" : "transparent",
          borderRight: "1px solid var(--m-bg-4)",
        }}
        title="Show asks only"
      >
        <span
          className="flex flex-col gap-[2px] items-center justify-center"
          style={{ opacity: view === "bids" ? 0.3 : 1 }}
        >
          <span style={{ width: 10, height: 2, borderRadius: 1, backgroundColor: "#ff4d6a", display: "block" }} />
          <span style={{ width: 10, height: 2, borderRadius: 1, backgroundColor: "#ff4d6a", display: "block" }} />
          <span style={{ width: 10, height: 2, borderRadius: 1, backgroundColor: "#ff4d6a", display: "block" }} />
        </span>
      </button>

      {/* both — neutral */}
      <button
        onClick={() => onChange("both")}
        className="flex items-center justify-center transition-all active:opacity-70"
        style={{
          width: 22,
          height: "100%",
          backgroundColor: view === "both" ? "rgba(255,255,255,0.1)" : "transparent",
          borderRight: "1px solid var(--m-bg-4)",
        }}
        title="Show both"
      >
        <span
          className="flex flex-col gap-[2px] items-center justify-center"
        >
          <span style={{ width: 10, height: 2, borderRadius: 1, backgroundColor: "#ff4d6a", display: "block" }} />
          <span style={{ width: 10, height: 2, borderRadius: 1, backgroundColor: "#aaa", display: "block" }} />
          <span style={{ width: 10, height: 2, borderRadius: 1, backgroundColor: "#00c8a0", display: "block" }} />
        </span>
      </button>

      {/* bids only — green */}
      <button
        onClick={() => onChange(view === "bids" ? "both" : "bids")}
        className="flex items-center justify-center transition-all active:opacity-70"
        style={{
          width: 22,
          height: "100%",
          backgroundColor: view === "bids" ? "rgba(0,200,160,0.2)" : "transparent",
        }}
        title="Show bids only"
      >
        <span
          className="flex flex-col gap-[2px] items-center justify-center"
          style={{ opacity: view === "asks" ? 0.3 : 1 }}
        >
          <span style={{ width: 10, height: 2, borderRadius: 1, backgroundColor: "#00c8a0", display: "block" }} />
          <span style={{ width: 10, height: 2, borderRadius: 1, backgroundColor: "#00c8a0", display: "block" }} />
          <span style={{ width: 10, height: 2, borderRadius: 1, backgroundColor: "#00c8a0", display: "block" }} />
        </span>
      </button>
    </div>
  );
}

/* ── Compact tick-size selector with portal dropdown ── */
const TICK_OPTIONS_MINI = [0.001, 0.01, 0.1, 1, 10, 50];

function MiniTickSelector({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos]   = useState({ top: 0, left: 0 });
  const btnRef          = useRef<HTMLButtonElement>(null);

  function toggle() {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, left: r.left });
    }
    setOpen(v => !v);
  }

  useEffect(() => {
    if (!open) return;
    function close(e: MouseEvent) {
      if (btnRef.current && btnRef.current.contains(e.target as Node)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const dropdown = open
    ? createPortal(
        <div style={{
          position: "fixed", top: pos.top, left: pos.left, zIndex: 9999,
          background: "#141414", border: "1px solid #2a2a2a", borderRadius: 8,
          minWidth: 100, boxShadow: "0 12px 32px rgba(0,0,0,0.75)", overflow: "hidden",
        }}>
          <div style={{ padding: "5px 12px 3px", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "#444", borderBottom: "1px solid #1e1e1e" }}>
            Grouping
          </div>
          {TICK_OPTIONS_MINI.map(opt => {
            const active = opt === value;
            return (
              <button key={opt}
                onMouseDown={e => { e.preventDefault(); onChange(opt); setOpen(false); }}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  width: "100%", padding: "7px 14px", fontSize: 13, fontFamily: "monospace",
                  color: active ? "#f5c518" : "#ccc",
                  background: active ? "rgba(245,197,24,0.07)" : "transparent",
                  cursor: "pointer", border: "none", textAlign: "left",
                }}>
                <span>{tickLabel(opt)}</span>
                {active && <span style={{ color: "#f5c518", fontSize: 11 }}>✓</span>}
              </button>
            );
          })}
        </div>,
        document.body
      )
    : null;

  return (
    <>
      <button ref={btnRef} onClick={toggle}
        className="flex items-center gap-0.5 font-mono font-semibold rounded px-1.5 py-0.5"
        style={{
          fontSize: 10,
          color: open ? "#f5c518" : "var(--m-fg-4)",
          backgroundColor: open ? "rgba(245,197,24,0.1)" : "var(--m-bg-3)",
          border: `1px solid ${open ? "rgba(245,197,24,0.3)" : "transparent"}`,
        }}>
        {tickLabel(value)}
        <ChevronDown className="w-2.5 h-2.5 ml-0.5"
          style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
      </button>
      {dropdown}
    </>
  );
}

function MiniPriceChart({
  prices,
  currentPrice,
  change24h,
  isUp,
}: {
  prices: number[];
  currentPrice: number;
  change24h: number;
  isUp: boolean;
}) {
  const lineColor = isUp ? "#00c8a0" : "#ff4d6a";
  const pts = prices.length < 2 ? [currentPrice, currentPrice] : prices;
  const W = 300, H = 72;
  const PAD = { t: 6, b: 6, l: 0, r: 0 };
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const range = max - min || 1;

  const coords = pts.map((p, i) => ({
    x: PAD.l + (i / (pts.length - 1)) * (W - PAD.l - PAD.r),
    y: PAD.t + (1 - (p - min) / range) * (H - PAD.t - PAD.b),
  }));

  const polyLine = coords.map(c => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
  const area =
    `M${coords[0].x.toFixed(1)},${coords[0].y.toFixed(1)} ` +
    coords.slice(1).map(c => `L${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ") +
    ` L${coords[coords.length - 1].x.toFixed(1)},${H - PAD.b} L${coords[0].x.toFixed(1)},${H - PAD.b} Z`;

  const lastX = coords[coords.length - 1].x;
  const lastY = coords[coords.length - 1].y;

  return (
    <div
      style={{
        borderBottom: "1px solid var(--m-bdr)",
        background: "var(--m-bg-1)",
      }}
    >
      {/* chart */}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        style={{ width: "100%", height: 80, display: "block" }}
      >
        <defs>
          <linearGradient id="mini-chart-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lineColor} stopOpacity={0.22} />
            <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#mini-chart-grad)" />
        <polyline
          points={polyLine}
          fill="none"
          stroke={lineColor}
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        {/* dashed current-price line */}
        <line
          x1={0} y1={lastY} x2={W} y2={lastY}
          stroke={lineColor} strokeWidth="0.8"
          strokeDasharray="4 4" opacity={0.35}
          vectorEffect="non-scaling-stroke"
        />
        {/* last-price dot */}
        <circle cx={lastX} cy={lastY} r="5" fill={lineColor} fillOpacity={0.18} vectorEffect="non-scaling-stroke" />
        <circle cx={lastX} cy={lastY} r="2.8" fill={lineColor} vectorEffect="non-scaling-stroke" />
      </svg>

      {/* stats row */}
      <div
        className="flex items-center justify-between px-3 pb-2.5"
        style={{ marginTop: -2 }}
      >
        <div className="flex flex-col leading-none gap-0.5">
          <span
            className="font-mono font-bold tabular-nums"
            style={{ fontSize: 17, color: lineColor }}
          >
            {currentPrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span style={{ fontSize: 10, color: "var(--m-fg-5)" }}>USDT · Live</span>
        </div>
        <div className="text-right flex flex-col leading-none gap-0.5">
          <span
            className="font-mono font-bold tabular-nums"
            style={{ fontSize: 13, color: lineColor }}
          >
            {isUp ? "+" : ""}{(change24h * 100).toFixed(2)}%
          </span>
          <span style={{ fontSize: 10, color: "var(--m-fg-5)" }}>24h change</span>
        </div>
      </div>
    </div>
  );
}

export function MobileTradeView({ market, currentSymbol, pair, onOpenMarketPanel }: Props) {
  const { primaryWallet } = useDynamicContext();
  const isConnected = !!primaryWallet;
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [orderType, setOrderType] = useState<"Limit" | "Market" | "Ladder">("Limit");
  const [limitPrice, setLimitPrice] = useState(() => market.price.toFixed(2));
  const [priceHistory, setPriceHistory] = useState<number[]>([market.price]);
  const priceUserEdited = useRef(false);

  useEffect(() => {
    setPriceHistory((h) => [...h, market.price].slice(-60));
    if (!priceUserEdited.current) {
      setLimitPrice(market.price.toFixed(2));
    }
  }, [market.price]);

  useEffect(() => {
    priceUserEdited.current = false;
    setLimitPrice(market.price.toFixed(2));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSymbol]);
  const [sliderPct, setSliderPct] = useState(0);
  const [size, setSize] = useState("");
  const [sizeUnit, setSizeUnit] = useState<"base" | "quote">("base");
  const [reduceOnly, setReduceOnly] = useState(false);
  const [tpsl, setTpsl] = useState(false);
  const [tpPrice, setTpPrice] = useState("");
  const [slPrice, setSlPrice] = useState("");
  const [toggleOn, setToggleOn] = useState(true);
  const [bookView, setBookView] = useState<BookView>("both");
  const [tickSize, setTickSize] = useState<number>(0.001);

  // Ladder order state
  const [ladderPriceStart, setLadderPriceStart] = useState("");
  const [ladderPriceEnd, setLadderPriceEnd] = useState("");
  const [ladderLevels, setLadderLevels] = useState("10");

  // Slider drag
  const sliderTrackRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const computePctFromEvent = useCallback((clientX: number) => {
    const track = sliderTrackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const raw = (clientX - rect.left) / rect.width;
    const clamped = Math.max(0, Math.min(1, raw));
    setSliderPct(Math.round(clamped * 100));
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    isDragging.current = true;
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    computePctFromEvent(e.clientX);
  }, [computePctFromEvent]);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current) return;
    computePctFromEvent(e.clientX);
  }, [computePctFromEvent]);

  const onPointerUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  // Base token derived from pair data or symbol string
  const baseToken  = pair?.baseToken.symbol  ?? currentSymbol.split("/")[0] ?? "BTC";
  const quoteToken = pair?.quoteToken.symbol ?? currentSymbol.split("/")[1] ?? "USDT";
  const baseName   = pair?.baseToken.name    ?? baseToken;
  const baseLogo   = pair?.baseToken.logo    ?? "";

  // Live order value calculation
  const sizeNum   = parseFloat(size);
  const execPrice = orderType === "Limit" && limitPrice ? parseFloat(limitPrice) : market.price;
  const orderValue = !isNaN(sizeNum) && sizeNum > 0 && !isNaN(execPrice)
    ? sizeUnit === "base"
      ? (sizeNum * execPrice).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " USDT"
      : sizeNum.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " USDT"
    : "N/A";
  // Equivalent token amount when user enters USDT
  const tokenEquiv = sizeUnit === "quote" && !isNaN(sizeNum) && sizeNum > 0 && execPrice > 0
    ? (sizeNum / execPrice).toFixed(6) + " " + baseToken
    : null;

  // Use real pair price/change — fall back to market sim only if pair not yet loaded
  const realPrice    = pair?.priceUSD ?? pair?.price ?? market.price;
  const realChange   = pair?.priceChange24h ?? market.change24h;
  const priceUp      = realPrice >= market.prevPrice;
  const priceColor   = priceUp ? "#00c8a0" : "#ff4d6a";
  const changePct    = (realChange * 100).toFixed(2);
  const sparkColor   = priceHistory.length >= 2 && priceHistory[priceHistory.length - 1] >= priceHistory[0]
    ? "#00c8a0" : "#ff4d6a";

  const decimals   = tickDecimals(tickSize);
  const asks = groupRows(market.asks, tickSize, "ask").slice(0, 10);
  const bids = groupRows(market.bids, tickSize, "bid").slice(0, 10);
  const maxAskSize = asks.reduce((m, r) => Math.max(m, r.size), 0) || 1;
  const maxBidSize = bids.reduce((m, r) => Math.max(m, r.size), 0) || 1;

  const totalBid = bids.reduce((s, r) => s + r.size, 0);
  const totalAsk = asks.reduce((s, r) => s + r.size, 0);
  const totalVol = totalBid + totalAsk || 1;
  const bidPct = Math.round((totalBid / totalVol) * 100);
  const askPct = 100 - bidPct;

  const fill = (p: number) => { setLimitPrice(p.toFixed(1)); setOrderType("Limit"); };

  return (
    <div className="flex flex-col">
      {/* ── Pair header ── */}
      <div
        className="flex items-center justify-between px-4 h-[56px] shrink-0"
        style={{ backgroundColor: "var(--m-bg-1)", borderBottom: "1px solid var(--m-bdr)" }}
      >
        <button onClick={onOpenMarketPanel} className="flex items-center gap-2.5 active:opacity-70 transition-opacity">
          <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold overflow-hidden"
            style={{ backgroundColor: "#f7931a28", border: "1.5px solid #f7931a45", color: "#f7931a" }}>
            {baseLogo ? (
              <img src={baseLogo} alt={baseToken} className="w-6 h-6 rounded-full object-cover"
                onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
            ) : baseToken.charAt(0)}
          </div>
          <div className="flex flex-col leading-none gap-0.5">
            <div className="flex items-center gap-1">
              <span className="font-bold text-[15px]" style={{ color: "var(--m-fg)" }}>
                {baseToken}<span style={{ color: "var(--m-fg-4)", fontWeight: 400 }}>/{quoteToken}</span>
              </span>
              <ChevronDown className="w-3.5 h-3.5" style={{ color: "var(--m-fg-4)" }} />
            </div>
            <span className="text-[11px] truncate max-w-[120px]" style={{ color: "var(--m-fg-4)" }}>{baseName}</span>
          </div>
        </button>
        <div className="flex items-center gap-2">
          <Sparkline prices={priceHistory} color={sparkColor} w={60} h={22} />
          <div className="text-right">
            <div className="font-bold text-[18px] font-mono tabular-nums leading-none" style={{ color: priceColor }}>
              {realPrice > 0
                ? realPrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 6 })
                : "—"}
            </div>
            <div className="text-[11px] font-mono tabular-nums mt-0.5" style={{ color: priceColor }}>
              {realPrice > 0 ? `${realChange >= 0 ? "+" : ""}${changePct}%` : ""}
            </div>
          </div>
          <Toggle on={toggleOn} onToggle={() => setToggleOn(!toggleOn)} />
        </div>
      </div>

      {/* ── 2-column trade area ── */}
      <div className="relative" style={{ minHeight: 320, overflow: "hidden" }}>

        {/* LEFT: order form — expands to full width when orderbook is hidden */}
        <div
          className="flex flex-col"
          style={{
            width: toggleOn ? "55%" : "100%",
            transition: "width 0.3s ease",
            overflow: "hidden",
          }}
        >
          {/* Mini chart — fades in when orderbook is hidden */}
          <div
            style={{
              maxHeight: toggleOn ? 0 : 180,
              opacity: toggleOn ? 0 : 1,
              overflow: "hidden",
              transition: "max-height 0.35s ease, opacity 0.3s ease",
              pointerEvents: toggleOn ? "none" : "auto",
            }}
          >
            <MiniPriceChart
              prices={priceHistory}
              currentPrice={market.price}
              change24h={market.change24h}
              isUp={priceUp}
            />
          </div>

          <div className="px-3 pt-3 pb-3 flex flex-col gap-2.5">

            {/* Order type — Limit / Market / Ladder */}
            <div className="flex items-center h-[38px] gap-3">
              {(["Limit", "Market", "Ladder"] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setOrderType(type)}
                  className="text-[13px] font-semibold transition-all pb-0.5 shrink-0"
                  style={{
                    color: orderType === type ? (type === "Ladder" ? "#a78bfa" : "var(--m-fg)") : "var(--m-fg-4)",
                    borderBottom: orderType === type ? `2px solid ${type === "Ladder" ? "#a78bfa" : "#f5c518"}` : "2px solid transparent",
                  }}
                >
                  {type}
                </button>
              ))}
            </div>

            {/* Price input — Limit only */}
            {orderType === "Limit" && (
              <div className="flex items-center px-3 h-[38px] gap-2" style={INPUT_BOX}>
                <span className="text-[11px] font-semibold shrink-0" style={{ color: "var(--m-fg-4)" }}>Price</span>
                <div className="w-px h-3.5 shrink-0" style={{ backgroundColor: "var(--m-bg-4)" }} />
                <input
                  type="text"
                  placeholder="0.00"
                  value={limitPrice}
                  onChange={(e) => { priceUserEdited.current = true; setLimitPrice(e.target.value); }}
                  className="bg-transparent outline-none flex-1 font-mono text-[13px] w-0 placeholder:opacity-30 text-right"
                  style={{ color: "var(--m-fg)" }}
                />
                <span className="text-[11px] font-semibold shrink-0" style={{ color: "var(--m-fg-4)" }}>USDT</span>
              </div>
            )}

            {/* Ladder inputs — Price Start, Price End, Levels */}
            {orderType === "Ladder" && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center px-3 h-[38px] gap-2" style={{ ...INPUT_BOX, borderColor: "rgba(167,139,250,0.35)" }}>
                  <span className="text-[11px] font-semibold shrink-0" style={{ color: "#a78bfa" }}>Start</span>
                  <div className="w-px h-3.5 shrink-0" style={{ backgroundColor: "var(--m-bg-4)" }} />
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="Price start"
                    value={ladderPriceStart}
                    onChange={(e) => setLadderPriceStart(e.target.value)}
                    className="bg-transparent outline-none flex-1 font-mono text-[13px] w-0 placeholder:opacity-30 text-right"
                    style={{ color: "var(--m-fg)" }}
                  />
                  <span className="text-[11px] font-semibold shrink-0" style={{ color: "var(--m-fg-4)" }}>USDT</span>
                </div>
                <div className="flex items-center px-3 h-[38px] gap-2" style={{ ...INPUT_BOX, borderColor: "rgba(167,139,250,0.35)" }}>
                  <span className="text-[11px] font-semibold shrink-0" style={{ color: "#a78bfa" }}>End</span>
                  <div className="w-px h-3.5 shrink-0" style={{ backgroundColor: "var(--m-bg-4)" }} />
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="Price end"
                    value={ladderPriceEnd}
                    onChange={(e) => setLadderPriceEnd(e.target.value)}
                    className="bg-transparent outline-none flex-1 font-mono text-[13px] w-0 placeholder:opacity-30 text-right"
                    style={{ color: "var(--m-fg)" }}
                  />
                  <span className="text-[11px] font-semibold shrink-0" style={{ color: "var(--m-fg-4)" }}>USDT</span>
                </div>
                <div className="flex items-center px-3 h-[38px] gap-2" style={{ ...INPUT_BOX, borderColor: "rgba(167,139,250,0.35)" }}>
                  <span className="text-[11px] font-semibold shrink-0" style={{ color: "#a78bfa" }}>Levels</span>
                  <div className="w-px h-3.5 shrink-0" style={{ backgroundColor: "var(--m-bg-4)" }} />
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="e.g. 10"
                    value={ladderLevels}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, "");
                      const n = Math.min(30, Math.max(1, Number(v) || 1));
                      setLadderLevels(v === "" ? "" : String(n));
                    }}
                    className="bg-transparent outline-none flex-1 font-mono text-[13px] w-0 placeholder:opacity-30 text-right"
                    style={{ color: "var(--m-fg)" }}
                  />
                  <span className="text-[11px] font-semibold shrink-0" style={{ color: "var(--m-fg-4)" }}>/ 30</span>
                </div>
              </div>
            )}

            {/* Buy / Sell toggle */}
            <div className="flex overflow-hidden gap-1">
              <button
                onClick={() => setSide("buy")}
                className="flex-1 py-1.5 text-[13px] font-bold transition-all rounded-[6px]"
                style={{
                  backgroundColor: side === "buy" ? "#f5c518" : "transparent",
                  color: side === "buy" ? "#000" : "var(--m-fg-4)",
                }}
              >
                Buy
              </button>
              <button
                onClick={() => setSide("sell")}
                className="flex-1 py-1.5 text-[13px] font-bold transition-all rounded-[6px]"
                style={{
                  backgroundColor: side === "sell" ? "#ff4d6a" : "transparent",
                  color: side === "sell" ? "#fff" : "var(--m-fg-4)",
                }}
              >
                Sell
              </button>
            </div>

            {/* Avail to trade */}
            <div className="flex items-center justify-between text-[12px] px-0.5">
              <span style={{ color: "var(--m-fg-4)" }}>Avail. to Trade</span>
              <span className="font-mono font-medium" style={{ color: "var(--m-fg-3)" }}>0.00 USDT</span>
            </div>

            {/* Size input */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center px-0.5 h-[38px] gap-2">
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="Size"
                  value={size}
                  onChange={(e) => setSize(e.target.value.replace(/[^0-9.]/g, ""))}
                  className="bg-transparent outline-none flex-1 font-mono text-[13px] w-0 placeholder:opacity-30"
                  style={{ color: "var(--m-fg)" }}
                />
                <div className="w-px h-3.5 shrink-0" style={{ backgroundColor: "var(--m-bg-4)" }} />
                <button
                  onClick={() => { setSizeUnit(u => u === "base" ? "quote" : "base"); setSize(""); }}
                  className="flex items-center gap-1 text-[11px] font-semibold shrink-0 rounded px-1 transition-colors"
                  style={{ color: sizeUnit === "quote" ? "#f5c518" : "var(--m-fg-3)" }}
                >
                  {sizeUnit === "base" ? baseToken : "USDT"} <ChevronDown className="w-2.5 h-2.5" />
                </button>
              </div>
              {tokenEquiv && (
                <div className="flex items-center justify-end gap-1 px-1">
                  <span className="text-[10px]" style={{ color: "var(--m-fg-5)" }}>≈</span>
                  <span className="text-[10px] font-mono font-medium" style={{ color: "#f5c518" }}>{tokenEquiv}</span>
                </div>
              )}
            </div>

            {/* Slider */}
            <div className="px-1">
              <div
                ref={sliderTrackRef}
                className="relative rounded-full flex items-center cursor-pointer select-none"
                style={{ height: 20, backgroundColor: "transparent" }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
              >
                {/* Track background */}
                <div className="absolute left-0 right-0 rounded-full" style={{ height: 3, top: "50%", transform: "translateY(-50%)", backgroundColor: "var(--m-bg-4)" }} />
                {/* Filled portion */}
                <div
                  className="absolute left-0 rounded-full"
                  style={{ height: 3, top: "50%", transform: "translateY(-50%)", width: `${sliderPct}%`, backgroundColor: "#f5c518", transition: isDragging.current ? "none" : "width 0.1s ease" }}
                />
                {/* Snap dots */}
                {[0, 25, 50, 75, 100].map((pct) => (
                  <div
                    key={pct}
                    className="absolute rounded-full pointer-events-none"
                    style={{
                      width: 8,
                      height: 8,
                      top: "50%",
                      transform: "translate(-50%, -50%)",
                      left: `${pct}%`,
                      backgroundColor: sliderPct >= pct ? "#f5c518" : "var(--m-bg-4)",
                      border: "2px solid var(--m-bg)",
                    }}
                  />
                ))}
                {/* Thumb */}
                <div
                  className="absolute rounded-full shadow-md pointer-events-none"
                  style={{
                    width: 14,
                    height: 14,
                    top: "50%",
                    transform: "translate(-50%, -50%)",
                    left: `${sliderPct}%`,
                    backgroundColor: "#f5c518",
                    border: "2.5px solid var(--m-bg)",
                    boxShadow: "0 0 0 3px rgba(245,197,24,0.2)",
                    transition: isDragging.current ? "none" : "left 0.1s ease",
                  }}
                />
              </div>
              <div className="flex items-center justify-between mt-2">
                {[0, 25, 50, 75, 100].map((pct) => (
                  <button
                    key={pct}
                    onClick={() => setSliderPct(pct)}
                    className="text-[10px] font-semibold transition-colors"
                    style={{ color: sliderPct === pct ? "#f5c518" : "var(--m-fg-5)" }}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>

            {/* Checkboxes + TP/SL — hidden in Ladder mode */}
            {orderType !== "Ladder" && (
              <div className="flex flex-col gap-2.5">
                <Check checked={reduceOnly} label="Post Only" onChange={() => setReduceOnly(!reduceOnly)} />
                <Check checked={tpsl} label="Take Profit / Stop Loss" onChange={() => setTpsl(!tpsl)} />

                {tpsl && (
                  <div className="flex flex-col gap-2 mt-0.5">
                    <div className="flex items-center px-3 h-[38px] gap-2" style={INPUT_BOX}>
                      <span className="text-[11px] font-semibold shrink-0" style={{ color: "var(--m-fg-4)" }}>TP</span>
                      <div className="w-px h-3.5 shrink-0" style={{ backgroundColor: "var(--m-bg-4)" }} />
                      <input
                        type="text"
                        placeholder="Take Profit price"
                        value={tpPrice}
                        onChange={(e) => setTpPrice(e.target.value)}
                        className="bg-transparent outline-none flex-1 font-mono text-[13px] w-0 placeholder:opacity-30 text-right"
                        style={{ color: "var(--m-fg)" }}
                      />
                      <span className="text-[11px] font-semibold shrink-0" style={{ color: "var(--m-fg-4)" }}>USDT</span>
                    </div>

                    <div className="flex items-center px-3 h-[38px] gap-2" style={INPUT_BOX}>
                      <span className="text-[11px] font-semibold shrink-0" style={{ color: "var(--m-fg-4)" }}>SL</span>
                      <div className="w-px h-3.5 shrink-0" style={{ backgroundColor: "var(--m-bg-4)" }} />
                      <input
                        type="text"
                        placeholder="Stop Loss price"
                        value={slPrice}
                        onChange={(e) => setSlPrice(e.target.value)}
                        className="bg-transparent outline-none flex-1 font-mono text-[13px] w-0 placeholder:opacity-30 text-right"
                        style={{ color: "var(--m-fg)" }}
                      />
                      <span className="text-[11px] font-semibold shrink-0" style={{ color: "var(--m-fg-4)" }}>USDT</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Order stats */}
            {orderType !== "Ladder" && (
              <div className="flex flex-col gap-2 px-0.5">
                {[
                  ["Order Value", orderValue],
                  ["Slippage", "Est: 0% / Max: 0.50%"],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-[11px]" style={{ color: "var(--m-fg-4)" }}>{label}</span>
                    <span
                      className="text-[11px] font-mono font-medium"
                      style={{ color: label === "Slippage" ? "#f5c518" : "var(--m-fg-3)" }}
                    >
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Ladder order preview */}
            {orderType === "Ladder" && (() => {
              const start = parseFloat(ladderPriceStart);
              const end = parseFloat(ladderPriceEnd);
              const levels = parseInt(ladderLevels) || 0;
              const valid = !isNaN(start) && !isNaN(end) && start > 0 && end > 0 && levels >= 2;
              const interval = valid && levels > 1 ? Math.abs(end - start) / (levels - 1) : null;
              const totalOrders = valid ? levels : null;
              const direction = valid ? (end > start ? "ascending" : "descending") : null;

              return (
                <div
                  className="rounded-lg px-3 py-2.5 flex flex-col gap-2"
                  style={{ backgroundColor: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.2)" }}
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <rect x="0" y="7" width="2" height="3" rx="0.5" fill="#a78bfa"/>
                      <rect x="2.5" y="4.5" width="2" height="5.5" rx="0.5" fill="#a78bfa" opacity="0.7"/>
                      <rect x="5" y="2" width="2" height="8" rx="0.5" fill="#a78bfa" opacity="0.5"/>
                      <rect x="7.5" y="0" width="2" height="10" rx="0.5" fill="#a78bfa" opacity="0.3"/>
                    </svg>
                    <span className="text-[11px] font-bold tracking-wide" style={{ color: "#a78bfa" }}>Ladder Preview</span>
                  </div>

                  {valid ? (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px]" style={{ color: "var(--m-fg-4)" }}>Child Orders</span>
                        <span className="text-[11px] font-mono font-bold" style={{ color: "#a78bfa" }}>{totalOrders}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px]" style={{ color: "var(--m-fg-4)" }}>Price Interval</span>
                        <span className="text-[11px] font-mono font-medium" style={{ color: "var(--m-fg-3)" }}>
                          {interval!.toFixed(3)} USDT
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px]" style={{ color: "var(--m-fg-4)" }}>Range</span>
                        <span className="text-[11px] font-mono font-medium" style={{ color: "var(--m-fg-3)" }}>
                          {Math.min(start, end).toFixed(3)} → {Math.max(start, end).toFixed(3)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px]" style={{ color: "var(--m-fg-4)" }}>Fill Direction</span>
                        <span className="text-[11px] font-semibold" style={{ color: direction === "ascending" ? "#00c8a0" : "#ff4d6a" }}>
                          {direction === "ascending" ? "↑ Low → High" : "↓ High → Low"}
                        </span>
                      </div>

                      {/* Visual ladder bars */}
                      <div className="flex items-end gap-[2px] mt-1" style={{ height: 20 }}>
                        {Array.from({ length: Math.min(levels, 20) }).map((_, i) => {
                          const h = direction === "ascending"
                            ? ((i + 1) / Math.min(levels, 20)) * 100
                            : ((Math.min(levels, 20) - i) / Math.min(levels, 20)) * 100;
                          return (
                            <div
                              key={i}
                              className="flex-1 rounded-sm"
                              style={{ height: `${h}%`, backgroundColor: "#a78bfa", opacity: 0.35 + (i / Math.min(levels, 20)) * 0.55 }}
                            />
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <p className="text-[11px] text-center py-1" style={{ color: "var(--m-fg-5)" }}>
                      Enter price range &amp; levels to preview
                    </p>
                  )}
                </div>
              );
            })()}

            {/* Connect / Place button */}
            {isConnected ? (
              <button
                className="w-full py-2.5 text-[14px] font-bold transition-all active:scale-[0.97]"
                style={{
                  backgroundColor: orderType === "Ladder" ? "#a78bfa" : side === "buy" ? "#f5c518" : "#ef4444",
                  color: orderType === "Ladder" ? "#fff" : side === "buy" ? "#000" : "#fff",
                  borderRadius: 8,
                }}
              >
                {orderType === "Ladder"
                  ? "Place Ladder Order"
                  : `Place ${side === "buy" ? "Buy" : "Sell"} Order`}
              </button>
            ) : (
              <DynamicConnectButton buttonClassName="w-full">
                <button
                  className="w-full py-2.5 text-[14px] font-bold transition-all active:scale-[0.97]"
                  style={{ backgroundColor: "#f5c518", color: "#000", borderRadius: 8 }}
                >
                  Connect Wallet
                </button>
              </DynamicConnectButton>
            )}
          </div>
        </div>

        {/* RIGHT: mini order book — hidden when toggle is off */}
        <div
          className="flex flex-col absolute top-0 bottom-0 right-0"
          style={{
            width: "45%",
            opacity: toggleOn ? 1 : 0,
            transform: toggleOn ? "translateX(0)" : "translateX(12px)",
            pointerEvents: toggleOn ? "auto" : "none",
            transition: "opacity 0.25s ease, transform 0.25s ease",
          }}
        >
          {/* Column headers */}
          <div
            className="flex items-center justify-between px-2 shrink-0"
            style={{
              height: 26,
              borderBottom: "1px solid var(--m-bg-3)",
              zIndex: 2,
            }}
          >
            <span className="text-[10px] font-semibold tracking-wide uppercase" style={{ color: "var(--m-fg-5)" }}>Price</span>
            <span className="text-[10px] font-semibold tracking-wide uppercase" style={{ color: "var(--m-fg-5)" }}>Size</span>
          </div>

          {/* Body */}
          <div className="flex flex-col min-h-0" style={{ flex: 1 }}>

            {/* ASKS */}
            {bookView !== "bids" && (
              <div
                className="flex flex-col justify-end min-h-0"
                style={{ flex: bookView === "asks" ? 1 : 1, overflow: "hidden" }}
              >
                {[...asks].reverse().map((row, i) => (
                  <MiniRow key={`ask-${i}`} row={row} side="ask" maxSize={maxAskSize} onFill={fill} decimals={decimals} />
                ))}
              </div>
            )}

            {/* Mid price pill — only shown in "both" mode */}
            {bookView === "both" && (
              <div
                className="shrink-0 mx-1.5 my-1 px-2 py-1 rounded-md flex items-center justify-between"
                style={{ backgroundColor: "var(--m-bg-2)" }}
              >
                <span className="font-mono font-bold tabular-nums text-[12px] leading-none" style={{ color: priceUp ? "#00c8a0" : "#ff4d6a" }}>
                  {market.price.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                </span>
                <span className="text-[9px] font-semibold ml-1" style={{ color: priceUp ? "#00c8a0" : "#ff4d6a", opacity: 0.7 }}>
                  {priceUp ? "▲" : "▼"}
                </span>
              </div>
            )}

            {/* BIDS */}
            {bookView !== "asks" && (
              <div
                className="flex flex-col min-h-0"
                style={{ flex: bookView === "bids" ? 1 : 1, overflow: "hidden" }}
              >
                {bids.map((row, i) => (
                  <MiniRow key={`bid-${i}`} row={row} side="bid" maxSize={maxBidSize} onFill={fill} decimals={decimals} />
                ))}
              </div>
            )}
          </div>

          {/* Bid / Ask ratio bar */}
          <div className="shrink-0 px-2 pb-1">
            {/* Labels */}
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono text-[9px] font-bold" style={{ color: "#00c8a0" }}>
                B {bidPct}%
              </span>
              <span className="font-mono text-[9px] font-bold" style={{ color: "#ff4d6a" }}>
                {askPct}% S
              </span>
            </div>
            {/* Bar */}
            <div className="flex rounded-full overflow-hidden" style={{ height: 4 }}>
              <div
                style={{
                  width: `${bidPct}%`,
                  backgroundColor: "#00c8a0",
                  transition: "width 0.4s ease",
                }}
              />
              <div
                style={{
                  flex: 1,
                  backgroundColor: "#ff4d6a",
                  transition: "flex 0.4s ease",
                }}
              />
            </div>
          </div>

          {/* Footer: tick size + book-view filter */}
          <div
            className="shrink-0 flex items-center justify-between px-2"
            style={{ height: 28, borderTop: "1px solid var(--m-bg-3)" }}
          >
            <MiniTickSelector value={tickSize} onChange={setTickSize} />

            <BookFilter view={bookView} onChange={setBookView} />
          </div>
        </div>
      </div>
    </div>
  );
}
