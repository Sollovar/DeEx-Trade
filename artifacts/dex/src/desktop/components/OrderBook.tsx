import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { LiveMarketState, OrderBookRow } from "@/hooks/useLiveMarket";

interface Props {
  market: LiveMarketState;
}

/* ── Formatting helpers ── */
function fmtPrice(n: number, decimals = 1) {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function fmtSize(btc: number, price: number) {
  const usdt = btc * price;
  if (usdt >= 1_000_000) return (usdt / 1_000_000).toFixed(2) + "M";
  if (usdt >= 1000)      return (usdt / 1000).toFixed(2) + "K";
  return usdt.toFixed(2);
}

const ROW_H = 22;

/* ── Grouping / aggregation ── */
function groupRows(
  rows: OrderBookRow[],
  tickSize: number,
  side: "ask" | "bid"
): OrderBookRow[] {
  if (tickSize <= 0.1) return rows; // no grouping needed

  const buckets = new Map<number, { size: number }>();

  for (const row of rows) {
    // Round to nearest tickSize bucket
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

  // Rebuild sorted rows with cumulative totals
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

/* ── Price decimal places based on tick size ── */
function tickDecimals(tick: number) {
  if (tick >= 100) return 0;
  if (tick >= 10)  return 0;
  if (tick >= 1)   return 0;
  if (tick >= 0.1) return 1;
  return 2;
}

/* ── Single order book row ── */
function Row({
  row,
  side,
  price,
  decimals,
}: {
  row: OrderBookRow;
  side: "ask" | "bid";
  price: number;
  decimals: number;
}) {
  const textColor = side === "ask" ? "#ff1744" : "#00c853";
  const barColor  = side === "ask" ? "rgba(255,23,68,0.13)" : "rgba(0,200,83,0.13)";
  const flashBg   =
    row.flash === "up"
      ? "rgba(0,200,83,0.22)"
      : row.flash === "down"
      ? "rgba(255,23,68,0.22)"
      : undefined;

  return (
    <div
      className="grid grid-cols-3 px-2 cursor-pointer hover:bg-[#181818] relative"
      style={{
        height: ROW_H,
        backgroundColor: flashBg,
        transition: "background-color 0.15s ease",
      }}
    >
      <div
        className="absolute right-0 top-0 bottom-0 pointer-events-none"
        style={{ width: `${row.depth}%`, backgroundColor: barColor }}
      />
      <div
        className="font-mono tabular-nums z-10 text-[13px] font-medium"
        style={{ color: textColor, lineHeight: `${ROW_H}px` }}
      >
        {fmtPrice(row.price, decimals)}
      </div>
      <div
        className="font-mono tabular-nums text-right text-[#999] z-10 text-[12px]"
        style={{ lineHeight: `${ROW_H}px` }}
      >
        {fmtSize(row.size, price)}
      </div>
      <div
        className="font-mono tabular-nums text-right text-[#666] z-10 text-[12px]"
        style={{ lineHeight: `${ROW_H}px` }}
      >
        {fmtSize(row.total, price)}
      </div>
    </div>
  );
}

/* ── Book-view filter (asks / both / bids) ── */
type BookView = "both" | "asks" | "bids";

function BookFilter({
  view,
  onChange,
}: {
  view: BookView;
  onChange: (v: BookView) => void;
}) {
  const BAR = (color: string) => (
    <span
      style={{
        width: 10,
        height: 2,
        borderRadius: 1,
        backgroundColor: color,
        display: "block",
      }}
    />
  );
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onChange(view === "asks" ? "both" : "asks")}
        className="flex items-center justify-center transition-all hover:opacity-80 rounded-md"
        style={{
          width: 26,
          height: 22,
          backgroundColor: view === "asks" ? "rgba(255,23,68,0.2)" : "transparent",
        }}
        title="Show asks only"
      >
        <span
          className="flex flex-col gap-[2px] items-center justify-center"
          style={{ opacity: view === "bids" ? 0.25 : 1 }}
        >
          {BAR("#ff1744")}
          {BAR("#ff1744")}
          {BAR("#ff1744")}
        </span>
      </button>

      <button
        onClick={() => onChange("both")}
        className="flex items-center justify-center transition-all hover:opacity-80 rounded-md"
        style={{
          width: 26,
          height: 22,
          backgroundColor: view === "both" ? "rgba(255,255,255,0.08)" : "transparent",
        }}
        title="Show both"
      >
        <span className="flex flex-col gap-[2px] items-center justify-center">
          {BAR("#ff1744")}
          {BAR("#555")}
          {BAR("#00c853")}
        </span>
      </button>

      <button
        onClick={() => onChange(view === "bids" ? "both" : "bids")}
        className="flex items-center justify-center transition-all hover:opacity-80 rounded-md"
        style={{
          width: 26,
          height: 22,
          backgroundColor: view === "bids" ? "rgba(0,200,83,0.15)" : "transparent",
        }}
        title="Show bids only"
      >
        <span
          className="flex flex-col gap-[2px] items-center justify-center"
          style={{ opacity: view === "asks" ? 0.25 : 1 }}
        >
          {BAR("#00c853")}
          {BAR("#00c853")}
          {BAR("#00c853")}
        </span>
      </button>
    </div>
  );
}

/* ── Tick-size dropdown ── */
const TICK_OPTIONS = [0.1, 1, 10, 50, 100, 500];

function TickSizeSelector({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);

  function label(v: number) {
    if (v < 1) return v.toFixed(1);
    return v >= 1000 ? v / 1000 + "K" : String(v);
  }

  function toggle() {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, right: window.innerWidth - r.right });
    }
    setOpen(v => !v);
  }

  // Close on outside click or scroll
  useEffect(() => {
    if (!open) return;
    function close(e: MouseEvent) {
      if (btnRef.current && btnRef.current.contains(e.target as Node)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", close);
    document.addEventListener("scroll", () => setOpen(false), { capture: true, once: true });
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const dropdown = open
    ? createPortal(
        <div
          style={{
            position: "fixed",
            top: pos.top,
            right: pos.right,
            zIndex: 9999,
            background: "#111",
            border: "1px solid #2a2a2a",
            borderRadius: 6,
            minWidth: 100,
            boxShadow: "0 12px 32px rgba(0,0,0,0.7)",
          }}
        >
          <div
            style={{
              padding: "5px 10px",
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
                  padding: "6px 12px",
                  fontSize: 12,
                  fontFamily: "monospace",
                  color: active ? "#f5c518" : "#aaa",
                  background: active ? "rgba(245,197,24,0.06)" : "transparent",
                  cursor: "pointer",
                  border: "none",
                  textAlign: "left",
                }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = "#1a1a1a"; }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
              >
                <span>{label(opt)}</span>
                {active && <span style={{ color: "#f5c518", fontSize: 10 }}>✓</span>}
              </button>
            );
          })}
          <div
            style={{
              padding: "5px 10px",
              fontSize: 10,
              color: "#333",
              borderTop: "1px solid #1e1e1e",
              lineHeight: 1.5,
            }}
          >
            Merges nearby price levels
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <>
      <button
        ref={btnRef}
        onClick={toggle}
        className="flex items-center gap-1 px-2 font-mono font-semibold transition-colors hover:text-white"
        style={{
          background: open ? "rgba(245,197,24,0.12)" : "#1a1a1a",
          border: `1px solid ${open ? "rgba(245,197,24,0.35)" : "#2a2a2a"}`,
          borderRadius: 4,
          color: open ? "#f5c518" : "#bbb",
          height: 22,
          minWidth: 52,
          fontSize: 11,
        }}
        title="Price grouping"
      >
        {label(value)}
        <span
          style={{
            fontSize: 9,
            color: "#666",
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 0.15s",
            display: "inline-block",
          }}
        >
          ▾
        </span>
      </button>
      {dropdown}
    </>
  );
}

/* ── Main OrderBook component ── */
type Tab = "orderbook" | "trades";

export function OrderBook({ market }: Props) {
  const [tab, setTab]           = useState<Tab>("orderbook");
  const [bookView, setBookView] = useState<BookView>("both");
  const [tickSize, setTickSize] = useState<number>(0.1);

  const priceUp    = market.price >= market.prevPrice;
  const priceColor = priceUp ? "#00c853" : "#ff1744";
  const arrow      = priceUp ? "↑" : "↓";
  const decimals   = tickDecimals(tickSize);

  // Apply grouping
  const displayAsks = groupRows(market.asks, tickSize, "ask");
  const displayBids = groupRows(market.bids, tickSize, "bid");

  const trades = Array.from({ length: 20 }).map((_, i) => {
    const tradePrice = parseFloat(
      (market.price + (Math.random() - 0.5) * 8).toFixed(1)
    );
    const isBuy = Math.random() > 0.5;
    const sizeUsdt = Math.random() * 120000 + 500;
    return {
      price: tradePrice,
      sizeK:
        sizeUsdt >= 1000
          ? (sizeUsdt / 1000).toFixed(2) + "K"
          : sizeUsdt.toFixed(0),
      isBuy,
      time: new Date(Date.now() - i * 800).toLocaleTimeString("en-US", {
        hour12: false,
      }),
    };
  });

  return (
    <div className="flex flex-col h-full bg-[#000000] overflow-hidden">
      {/* Tab header */}
      <div className="flex items-center h-[38px] px-3 border-b border-[#1a1a1a] bg-[#000000] shrink-0">
        <button
          onClick={() => setTab("orderbook")}
          className={`h-full flex items-center text-[13px] font-semibold transition-colors ${
            tab === "orderbook"
              ? "text-white border-b-2 border-white"
              : "text-[#555] hover:text-[#aaa]"
          }`}
        >
          Order Book
        </button>
        <button
          onClick={() => setTab("trades")}
          className={`ml-auto h-full flex items-center text-[13px] font-semibold transition-colors ${
            tab === "trades"
              ? "text-white border-b-2 border-white"
              : "text-[#555] hover:text-[#aaa]"
          }`}
        >
          Trades
        </button>
      </div>

      {tab === "orderbook" && (
        <>
          {/* Controls row */}
          <div className="flex items-center justify-between h-[36px] px-2 shrink-0 border-b border-[#111]">
            <BookFilter view={bookView} onChange={setBookView} />
            <div className="flex items-center gap-2">
              <TickSizeSelector value={tickSize} onChange={setTickSize} />
              <button
                className="flex items-center gap-1 text-[11px] text-[#666] hover:text-white transition-colors"
                style={{ fontSize: 11 }}
              >
                USDT <span className="text-[9px]">▾</span>
              </button>
            </div>
          </div>

          {/* Column headers */}
          <div className="grid grid-cols-3 px-2 py-1 text-[11px] font-medium text-[#555] shrink-0 border-b border-[#111] bg-[#0a0a0a] relative z-10">
            <div>Price(USDT)</div>
            <div className="text-right">Size(USDT)</div>
            <div className="text-right">Total(USDT)</div>
          </div>

          {/* Asks */}
          {bookView !== "bids" && (
            <div
              className="flex flex-col justify-end overflow-hidden min-h-0"
              style={{ flex: "1 1 0" }}
            >
              {[...displayAsks].reverse().map((row, i) => (
                <Row
                  key={`ask-${i}`}
                  row={row}
                  side="ask"
                  price={market.price}
                  decimals={decimals}
                />
              ))}
            </div>
          )}

          {/* Mid price */}
          <div className="flex items-center justify-center py-1.5 shrink-0 border-y border-[#1a1a1a]">
            <div
              className="flex items-center gap-3 font-mono font-bold tabular-nums px-4 py-1"
              style={{
                backgroundColor: "rgba(255,255,255,0.04)",
                border: "1px solid #222",
                borderRadius: 999,
              }}
            >
              <span className="text-[14px]" style={{ color: priceColor }}>
                {fmtPrice(market.price)}
                <span className="text-[10px] ml-1.5">{arrow}</span>
              </span>
              <span className="text-[11px] text-[#555] border-b border-dotted border-[#444]">
                {fmtPrice(market.markPrice)}
              </span>
            </div>
          </div>

          {/* Bids */}
          {bookView !== "asks" && (
            <div
              className="flex flex-col overflow-hidden min-h-0"
              style={{ flex: "1 1 0" }}
            >
              {displayBids.map((row, i) => (
                <Row
                  key={`bid-${i}`}
                  row={row}
                  side="bid"
                  price={market.price}
                  decimals={decimals}
                />
              ))}
            </div>
          )}
        </>
      )}

      {tab === "trades" && (
        <>
          <div className="grid grid-cols-3 px-2 py-1.5 text-[11px] font-medium text-[#555] shrink-0 border-b border-[#1a1a1a]">
            <div>Price(USDT)</div>
            <div className="text-right">Size</div>
            <div className="text-right">Time</div>
          </div>
          <div className="flex-1 overflow-hidden flex flex-col">
            {trades.map((t, i) => (
              <div
                key={i}
                className="grid grid-cols-3 px-2 font-mono hover:bg-[#181818]"
                style={{ height: ROW_H }}
              >
                <div
                  className="tabular-nums text-[13px] font-medium"
                  style={{
                    color: t.isBuy ? "#00c853" : "#ff1744",
                    lineHeight: `${ROW_H}px`,
                  }}
                >
                  {fmtPrice(t.price)}
                </div>
                <div
                  className="text-right text-[#999] tabular-nums text-[12px]"
                  style={{ lineHeight: `${ROW_H}px` }}
                >
                  {t.sizeK}
                </div>
                <div
                  className="text-right text-[#555] tabular-nums text-[11px]"
                  style={{ lineHeight: `${ROW_H}px` }}
                >
                  {t.time}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
