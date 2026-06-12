import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";
import { LiveMarketState, OrderBookRow } from "@/hooks/useLiveMarket";

interface Props {
  market: LiveMarketState;
}

/* ── Formatting ── */
function fmtPrice(n: number, decimals = 1) {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function fmtTotal(n: number) {
  if (n >= 10000) return (n / 1000).toFixed(2) + "K";
  if (n >= 1000)  return n.toFixed(0);
  return n.toFixed(2);
}

function fmtK(n: number) {
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toFixed(1);
}

function tickDecimals(tick: number) {
  if (tick >= 1)   return 0;
  if (tick >= 0.1) return 1;
  return 3;
}

/* ── Grouping logic ── */
function groupRows(
  rows: OrderBookRow[],
  tickSize: number,
  side: "ask" | "bid"
): OrderBookRow[] {
  if (tickSize <= 0.001) return rows;

  const buckets = new Map<number, { size: number }>();
  for (const row of rows) {
    const key =
      side === "ask"
        ? Math.ceil(row.price / tickSize) * tickSize
        : Math.floor(row.price / tickSize) * tickSize;
    const rounded = parseFloat(key.toFixed(8));
    const existing = buckets.get(rounded);
    if (existing) {
      existing.size += row.size;
    } else {
      buckets.set(rounded, { size: row.size });
    }
  }

  const sorted = [...buckets.entries()].sort((a, b) =>
    side === "ask" ? a[0] - b[0] : b[0] - a[0]
  );

  let cumTotal = 0;
  const maxSize = Math.max(...sorted.map(([, v]) => v.size));
  return sorted.map(([price, { size }]) => {
    cumTotal += size;
    return {
      price,
      size: parseFloat(size.toFixed(4)),
      total: parseFloat(cumTotal.toFixed(4)),
      depth: maxSize > 0 ? (size / maxSize) * 90 : 0,
      flash: null,
    };
  });
}

/* ── Tick-size dropdown (portal, fixed position) ── */
const TICK_OPTIONS = [0.001, 0.01, 0.1, 1, 10, 50];

function tickLabel(v: number) {
  if (v < 0.01) return v.toFixed(3);
  if (v < 0.1)  return v.toFixed(2);
  if (v < 1)    return v.toFixed(1);
  return v >= 1000 ? v / 1000 + "K" : String(v);
}

function TickSizeSelector({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);

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
        <div
          style={{
            position: "fixed",
            top: pos.top,
            left: pos.left,
            zIndex: 9999,
            background: "#141414",
            border: "1px solid #2a2a2a",
            borderRadius: 8,
            minWidth: 110,
            boxShadow: "0 12px 32px rgba(0,0,0,0.75)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "6px 12px 4px",
              fontSize: 10,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "#444",
              borderBottom: "1px solid #1e1e1e",
            }}
          >
            Grouping
          </div>
          {TICK_OPTIONS.map(opt => {
            const active = opt === value;
            return (
              <button
                key={opt}
                onMouseDown={e => {
                  e.preventDefault();
                  onChange(opt);
                  setOpen(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                  padding: "8px 14px",
                  fontSize: 13,
                  fontFamily: "monospace",
                  color: active ? "#f5c518" : "#ccc",
                  background: active ? "rgba(245,197,24,0.07)" : "transparent",
                  cursor: "pointer",
                  border: "none",
                  textAlign: "left",
                }}
              >
                <span>{tickLabel(opt)}</span>
                {active && (
                  <span style={{ color: "#f5c518", fontSize: 11 }}>✓</span>
                )}
              </button>
            );
          })}
        </div>,
        document.body
      )
    : null;

  return (
    <>
      <button
        ref={btnRef}
        onClick={toggle}
        className="flex items-center gap-1 font-mono font-semibold"
        style={{
          fontSize: 12,
          color: open ? "#f5c518" : "var(--m-fg-2)",
          background: open ? "rgba(245,197,24,0.1)" : "transparent",
          border: `1px solid ${open ? "rgba(245,197,24,0.3)" : "transparent"}`,
          borderRadius: 5,
          padding: "2px 6px",
        }}
      >
        {tickLabel(value)}
        <ChevronDown
          className="w-3 h-3"
          style={{
            color: open ? "#f5c518" : "var(--m-fg-4)",
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 0.15s",
          }}
        />
      </button>
      {dropdown}
    </>
  );
}

/* ── Depth chart ── */
function DepthChart({ market }: { market: LiveMarketState }) {
  const N     = 20;
  const bids  = [...market.bids].slice(0, N).reverse();
  const asks  = [...market.asks].slice(0, N);
  if (!bids.length || !asks.length) return null;

  const W = 390;
  const H = 260;
  const PAD = { top: 16, bottom: 36, left: 8, right: 8 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top  - PAD.bottom;

  const loPrice  = bids[0].price;
  const hiPrice  = asks[asks.length - 1].price;
  const midPrice = market.price;
  const priceRange = hiPrice - loPrice || 1;

  const maxTotal = Math.max(
    bids[bids.length - 1].total,
    asks[asks.length - 1].total,
  ) || 1;

  const px = (price: number) =>
    PAD.left + ((price - loPrice) / priceRange) * chartW;
  const py = (total: number) =>
    PAD.top + chartH - (total / maxTotal) * chartH;

  const bidPts = bids.map((r) => ({ x: px(r.price), y: py(r.total) }));
  const bidPath =
    `M${px(loPrice)},${PAD.top + chartH}` +
    bidPts.map((p) => `L${p.x},${p.y}`).join("") +
    `L${px(midPrice)},${PAD.top + chartH}Z`;

  const askPts = asks.map((r) => ({ x: px(r.price), y: py(r.total) }));
  const askPath =
    `M${px(midPrice)},${PAD.top + chartH}` +
    askPts.map((p) => `L${p.x},${p.y}`).join("") +
    `L${px(hiPrice)},${PAD.top + chartH}Z`;

  const bidLine =
    bidPts.map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`)).join("") +
    `L${px(midPrice)},${py(bids[bids.length - 1].total)}`;

  const askLine =
    askPts.map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`)).join("");

  const midX  = px(midPrice);
  const yZero = PAD.top + chartH;

  const labels = [
    { x: PAD.left,      text: fmtPrice(loPrice),  anchor: "start"  },
    { x: midX,          text: fmtPrice(midPrice), anchor: "middle" },
    { x: W - PAD.right, text: fmtPrice(hiPrice),  anchor: "end"    },
  ];

  const yTicks = [0.5, 1.0].map((f) => ({
    y: PAD.top + chartH - f * chartH,
    label: fmtK(maxTotal * f),
  }));

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        style={{ width: "100%", flex: 1, minHeight: 0, display: "block" }}
      >
        <defs>
          <linearGradient id="bid-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#00c853" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#00c853" stopOpacity="0.06" />
          </linearGradient>
          <linearGradient id="ask-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#ff1744" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#ff1744" stopOpacity="0.06" />
          </linearGradient>
        </defs>

        {yTicks.map((t) => (
          <line key={t.y} x1={PAD.left} y1={t.y} x2={W - PAD.right} y2={t.y}
            stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
        ))}

        <path d={bidPath} fill="url(#bid-grad)" />
        <path d={askPath} fill="url(#ask-grad)" />
        <path d={bidLine} fill="none" stroke="#00c853" strokeWidth="1.5" strokeLinejoin="round" />
        <path d={askLine} fill="none" stroke="#ff1744" strokeWidth="1.5" strokeLinejoin="round" />

        <line x1={midX} y1={PAD.top} x2={midX} y2={yZero}
          stroke="rgba(255,255,255,0.18)" strokeWidth="1" strokeDasharray="3 3" />

        <rect x={midX - 30} y={PAD.top - 1} width={60} height={15} rx={4} fill="rgba(245,197,24,0.18)" />
        <text x={midX} y={PAD.top + 10} textAnchor="middle" fontSize="9"
          fontWeight="600" fontFamily="monospace" fill="#f5c518">
          {fmtPrice(midPrice)}
        </text>

        <line x1={PAD.left} y1={yZero} x2={W - PAD.right} y2={yZero}
          stroke="rgba(255,255,255,0.08)" strokeWidth="1" />

        {labels.map((l) => (
          <text key={l.text} x={l.x} y={yZero + 14}
            textAnchor={l.anchor as "start" | "middle" | "end"}
            fontSize="9" fontFamily="monospace" fill="rgba(255,255,255,0.35)">
            {l.text}
          </text>
        ))}

        {yTicks.map((t) => (
          <text key={t.y} x={PAD.left + 4} y={t.y - 3}
            fontSize="8" fontFamily="monospace" fill="rgba(255,255,255,0.3)">
            {t.label}
          </text>
        ))}
      </svg>

      <div
        className="shrink-0 flex items-center justify-center gap-5 py-2"
        style={{ borderTop: "1px solid var(--m-bg-3)" }}
      >
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: "#00c853" }} />
          <span className="text-[11px] font-medium" style={{ color: "var(--m-fg-4)" }}>
            Bids&nbsp;
            <span className="font-mono tabular-nums" style={{ color: "#00c853" }}>
              {fmtTotal(bids[bids.length - 1]?.total ?? 0)}
            </span>
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: "#ff1744" }} />
          <span className="text-[11px] font-medium" style={{ color: "var(--m-fg-4)" }}>
            Asks&nbsp;
            <span className="font-mono tabular-nums" style={{ color: "#ff1744" }}>
              {fmtTotal(asks[asks.length - 1]?.total ?? 0)}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── Main component ── */
const ROW_H = 34;
const ROWS  = 16;

export function MobileOrderBookView({ market }: Props) {
  const [tickSize, setTickSize] = useState<number>(0.001);
  const [tab, setTab] = useState<"book" | "depth">("book");
  const base = "BTC";
  const decimals = tickDecimals(tickSize);

  const displayAsks = groupRows(market.asks, tickSize, "ask").slice(0, ROWS);
  const displayBids = groupRows(market.bids, tickSize, "bid").slice(0, ROWS);

  const maxAskTotal = displayAsks.reduce((m, r) => Math.max(m, r.total), 0) || 1;
  const maxBidTotal = displayBids.reduce((m, r) => Math.max(m, r.total), 0) || 1;

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ backgroundColor: "var(--m-bg)" }}>

      {/* Controls row */}
      <div
        className="flex items-center justify-between px-3 h-[38px] shrink-0"
        style={{ borderBottom: "1px solid var(--m-bg-3)" }}
      >
        <div className="flex items-center gap-3">
          {([
            { key: "book",  label: "Order Book" },
            { key: "depth", label: "Depth" },
          ] as const).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className="text-[12px] font-semibold pb-0.5 transition-all"
              style={{
                color: tab === key ? "var(--m-fg)" : "var(--m-fg-4)",
                borderBottom: tab === key ? "2px solid #f5c518" : "2px solid transparent",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <TickSizeSelector value={tickSize} onChange={setTickSize} />
          <button className="flex items-center gap-1 text-[12px] font-medium" style={{ color: "var(--m-fg-2)" }}>
            {base}
            <ChevronDown className="w-3 h-3" style={{ color: "var(--m-fg-4)" }} />
          </button>
        </div>
      </div>

      {/* Depth chart */}
      {tab === "depth" && <DepthChart market={market} />}

      {/* Order book */}
      {tab === "book" && (
        <>
          <div
            className="grid shrink-0"
            style={{ gridTemplateColumns: "1fr auto auto 1fr", height: 28, borderBottom: "1px solid var(--m-bdr-subtle)" }}
          >
            <div className="text-[11px] font-medium px-3 flex items-center" style={{ color: "var(--m-fg-4)" }}>
              Total ({base})
            </div>
            <div className="text-[11px] font-medium px-2 flex items-center justify-end" style={{ color: "var(--m-fg-4)" }}>
              Price
            </div>
            <div className="flex items-center">
              <div className="w-px self-stretch" style={{ backgroundColor: "var(--m-bdr)" }} />
              <span className="text-[11px] font-medium px-2" style={{ color: "var(--m-fg-4)" }}>Price</span>
            </div>
            <div className="text-[11px] font-medium px-3 flex items-center justify-end" style={{ color: "var(--m-fg-4)" }}>
              Total ({base})
            </div>
          </div>

          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            {Array.from({ length: ROWS }).map((_, i) => {
              const bid = displayBids[i];
              const ask = displayAsks[i];
              const bidDepth = bid ? (bid.total / maxBidTotal) * 100 : 0;
              const askDepth = ask ? (ask.total / maxAskTotal) * 100 : 0;

              return (
                <div
                  key={i}
                  className="grid"
                  style={{
                    gridTemplateColumns: "1fr auto auto 1fr",
                    height: ROW_H,
                    borderBottom: "1px solid var(--m-bg-1)",
                  }}
                >
                  {/* BID total */}
                  <div className={`relative overflow-hidden flex items-center ${bid?.flash === "up" ? "flash-up" : bid?.flash === "down" ? "flash-down" : ""}`}>
                    {bid && (
                      <div className="absolute top-0 right-0 bottom-0"
                        style={{ width: `${bidDepth}%`, backgroundColor: "rgba(0,200,83,0.12)" }} />
                    )}
                    {bid && (
                      <span className="font-mono tabular-nums text-[12px] text-[#00c853] z-10 px-3" style={{ opacity: 0.7 }}>
                        {fmtTotal(bid.total)}
                      </span>
                    )}
                  </div>

                  {/* BID price */}
                  <div className={`flex items-center justify-end px-2 ${bid?.flash === "up" ? "flash-up" : bid?.flash === "down" ? "flash-down" : ""}`}>
                    {bid && (
                      <span className="font-mono tabular-nums text-[13px] font-medium text-[#00c853]">
                        {fmtPrice(bid.price, decimals)}
                      </span>
                    )}
                  </div>

                  {/* Center divider + ASK price */}
                  <div className="flex items-center">
                    <div className="w-px self-stretch" style={{ backgroundColor: "var(--m-bdr)" }} />
                    <div className={`flex items-center px-2 ${ask?.flash === "up" ? "flash-up" : ask?.flash === "down" ? "flash-down" : ""}`}>
                      {ask && (
                        <span className="font-mono tabular-nums text-[13px] font-medium text-[#ff1744]">
                          {fmtPrice(ask.price, decimals)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* ASK total */}
                  <div className={`relative overflow-hidden flex items-center justify-end ${ask?.flash === "up" ? "flash-up" : ask?.flash === "down" ? "flash-down" : ""}`}>
                    {ask && (
                      <div className="absolute top-0 left-0 bottom-0"
                        style={{ width: `${askDepth}%`, backgroundColor: "rgba(255,23,68,0.12)" }} />
                    )}
                    {ask && (
                      <span className="font-mono tabular-nums text-[12px] text-[#ff1744] z-10 px-3" style={{ opacity: 0.7 }}>
                        {fmtTotal(ask.total)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
