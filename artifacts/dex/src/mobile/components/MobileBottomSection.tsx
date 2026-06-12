import { useState, useRef } from "react";

type SectionTab = "Open Orders" | "Order History" | "Trade History";
const SECTION_TABS: SectionTab[] = ["Open Orders", "Order History", "Trade History"];

const MOCK_OPEN_ORDERS = [
  { id: "001", symbol: "BTC/USDT", side: "Buy",  type: "Limit", price: 60500.0, amount: 0.02, filled: 0,   time: "10:31:04" },
  { id: "002", symbol: "ETH/USDT", side: "Sell", type: "Limit", price: 1700.0,  amount: 0.5,  filled: 0,   time: "10:28:17" },
  { id: "003", symbol: "BNB/USDT", side: "Buy",  type: "Limit", price: 572.0,   amount: 1.0,  filled: 0.3, time: "10:14:55" },
];

const MOCK_ORDER_HISTORY = [
  { id: "h01", symbol: "BTC/USDT", side: "Buy",  type: "Limit",  price: 60420.0, amount: 0.05, status: "Filled",    time: "2026-06-10 09:14" },
  { id: "h02", symbol: "ETH/USDT", side: "Sell", type: "Limit",  price: 1680.0,  amount: 0.8,  status: "Filled",    time: "2026-06-10 09:10" },
  { id: "h03", symbol: "SOL/USDT", side: "Buy",  type: "Market", price: 65.4,    amount: 10,   status: "Filled",    time: "2026-06-10 08:55" },
  { id: "h04", symbol: "BTC/USDT", side: "Sell", type: "Limit",  price: 62100.0, amount: 0.04, status: "Cancelled", time: "2026-06-09 22:30" },
];

const MOCK_TRADE_HISTORY = [
  { symbol: "BTC/USDT", side: "Buy",  price: 60420.0, qty: 0.05, fee: 1.51,  time: "2026-06-10 09:14" },
  { symbol: "ETH/USDT", side: "Sell", price: 1680.0,  qty: 0.8,  fee: 0.672, time: "2026-06-10 09:10" },
  { symbol: "SOL/USDT", side: "Buy",  price: 65.4,    qty: 10,   fee: 0.327, time: "2026-06-10 08:55" },
  { symbol: "BTC/USDT", side: "Sell", price: 62100.0, qty: 0.04, fee: 1.24,  time: "2026-06-09 22:30" },
  { symbol: "ETH/USDT", side: "Buy",  price: 1590.0,  qty: 1.2,  fee: 0.954, time: "2026-06-09 18:14" },
];

function fmtPrice(n: number) {
  if (n >= 10000) return n.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  if (n >= 1)     return n.toFixed(2);
  return n.toFixed(4);
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 gap-2">
      <div
        className="w-10 h-10 rounded-2xl flex items-center justify-center"
        style={{ backgroundColor: "var(--m-bg-3)" }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" strokeWidth="1.5" style={{ stroke: "var(--m-fg-5)" }}>
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
      </div>
      <p className="text-[12px]" style={{ color: "var(--m-fg-4)" }}>No {label}</p>
    </div>
  );
}

function OpenOrdersContent() {
  if (MOCK_OPEN_ORDERS.length === 0) return <EmptyState label="open orders" />;
  return (
    <div className="flex flex-col gap-1 px-2 py-1.5">
      {MOCK_OPEN_ORDERS.map((o) => (
        <div
          key={o.id}
          className="rounded-xl px-3 py-2.5"
          style={{ backgroundColor: "var(--m-bg-2)" }}
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[13px]" style={{ color: "var(--m-fg)" }}>{o.symbol}</span>
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                style={{
                  color: o.side === "Buy" ? "#00c853" : "#ff1744",
                  backgroundColor: o.side === "Buy" ? "rgba(0,200,83,0.12)" : "rgba(255,23,68,0.12)",
                }}
              >
                {o.side}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-md" style={{ color: "var(--m-fg-4)", backgroundColor: "var(--m-bg-4)" }}>
                {o.type}
              </span>
            </div>
            <span className="text-[11px]" style={{ color: "var(--m-fg-4)" }}>{o.time}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex gap-4">
              <div>
                <div className="text-[10px]" style={{ color: "var(--m-fg-4)" }}>Price</div>
                <div className="text-[12px] font-mono font-semibold" style={{ color: "var(--m-fg-2)" }}>{fmtPrice(o.price)}</div>
              </div>
              <div>
                <div className="text-[10px]" style={{ color: "var(--m-fg-4)" }}>Amount</div>
                <div className="text-[12px] font-mono font-semibold" style={{ color: "var(--m-fg-2)" }}>{o.amount}</div>
              </div>
              <div>
                <div className="text-[10px]" style={{ color: "var(--m-fg-4)" }}>Filled</div>
                <div className="text-[12px] font-mono font-semibold" style={{ color: "var(--m-fg-2)" }}>{o.filled}</div>
              </div>
            </div>
            <button
              className="text-[11px] font-semibold px-3 py-1 rounded-lg"
              style={{ color: "#ff1744", backgroundColor: "rgba(255,23,68,0.1)" }}
            >
              Cancel
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function OrderHistoryContent() {
  if (MOCK_ORDER_HISTORY.length === 0) return <EmptyState label="order history" />;
  return (
    <div className="flex flex-col gap-1 px-2 py-1.5">
      {MOCK_ORDER_HISTORY.map((o) => (
        <div
          key={o.id}
          className="rounded-xl px-3 py-2.5"
          style={{ backgroundColor: "var(--m-bg-2)" }}
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[13px]" style={{ color: "var(--m-fg)" }}>{o.symbol}</span>
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                style={{
                  color: o.side === "Buy" ? "#00c853" : "#ff1744",
                  backgroundColor: o.side === "Buy" ? "rgba(0,200,83,0.12)" : "rgba(255,23,68,0.12)",
                }}
              >
                {o.side}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-md" style={{ color: "var(--m-fg-4)", backgroundColor: "var(--m-bg-4)" }}>
                {o.type}
              </span>
            </div>
            <span
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
              style={{
                color: o.status === "Filled" ? "#00c853" : "var(--m-fg-4)",
                backgroundColor: o.status === "Filled" ? "rgba(0,200,83,0.1)" : "var(--m-bg-4)",
              }}
            >
              {o.status}
            </span>
          </div>
          <div className="flex gap-4">
            <div>
              <div className="text-[10px]" style={{ color: "var(--m-fg-4)" }}>Price</div>
              <div className="text-[12px] font-mono font-semibold" style={{ color: "var(--m-fg-2)" }}>{fmtPrice(o.price)}</div>
            </div>
            <div>
              <div className="text-[10px]" style={{ color: "var(--m-fg-4)" }}>Amount</div>
              <div className="text-[12px] font-mono font-semibold" style={{ color: "var(--m-fg-2)" }}>{o.amount}</div>
            </div>
            <div>
              <div className="text-[10px]" style={{ color: "var(--m-fg-4)" }}>Time</div>
              <div className="text-[11px] font-mono" style={{ color: "var(--m-fg-4)" }}>{o.time}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function TradeHistoryContent() {
  if (MOCK_TRADE_HISTORY.length === 0) return <EmptyState label="trade history" />;
  return (
    <div className="flex flex-col gap-1 px-2 py-1.5">
      {MOCK_TRADE_HISTORY.map((t, i) => (
        <div
          key={i}
          className="rounded-xl px-3 py-2.5"
          style={{ backgroundColor: "var(--m-bg-2)" }}
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[13px]" style={{ color: "var(--m-fg)" }}>{t.symbol}</span>
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                style={{
                  color: t.side === "Buy" ? "#00c853" : "#ff1744",
                  backgroundColor: t.side === "Buy" ? "rgba(0,200,83,0.12)" : "rgba(255,23,68,0.12)",
                }}
              >
                {t.side}
              </span>
            </div>
            <span className="text-[11px]" style={{ color: "var(--m-fg-4)" }}>{t.time}</span>
          </div>
          <div className="flex gap-4">
            <div>
              <div className="text-[10px]" style={{ color: "var(--m-fg-4)" }}>Price</div>
              <div className="text-[12px] font-mono font-semibold" style={{ color: "var(--m-fg-2)" }}>{fmtPrice(t.price)}</div>
            </div>
            <div>
              <div className="text-[10px]" style={{ color: "var(--m-fg-4)" }}>Qty</div>
              <div className="text-[12px] font-mono font-semibold" style={{ color: "var(--m-fg-2)" }}>{t.qty}</div>
            </div>
            <div>
              <div className="text-[10px]" style={{ color: "var(--m-fg-4)" }}>Fee</div>
              <div className="text-[12px] font-mono font-semibold" style={{ color: "var(--m-fg-4)" }}>{t.fee.toFixed(3)} USDT</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function MobileBottomSection() {
  const [activeTab, setActiveTab] = useState<SectionTab>("Open Orders");
  const touchStartX = useRef<number | null>(null);

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) < 40) return;
    const idx = SECTION_TABS.indexOf(activeTab);
    if (diff > 0 && idx < SECTION_TABS.length - 1) {
      setActiveTab(SECTION_TABS[idx + 1]);
    } else if (diff < 0 && idx > 0) {
      setActiveTab(SECTION_TABS[idx - 1]);
    }
    touchStartX.current = null;
  }

  function renderContent() {
    if (activeTab === "Open Orders")   return <OpenOrdersContent />;
    if (activeTab === "Order History") return <OrderHistoryContent />;
    if (activeTab === "Trade History") return <TradeHistoryContent />;
    return null;
  }

  return (
    <div className="flex flex-col" style={{ backgroundColor: "var(--m-bg)" }}>
      {/* Tab bar */}
      <div
        className="flex shrink-0 pt-1"
        style={{ backgroundColor: "var(--m-bg)", borderBottom: "1px solid var(--m-bdr)" }}
      >
        {SECTION_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="flex-1 h-[34px] text-[12px] font-semibold whitespace-nowrap transition-all rounded-lg mb-1 text-center"
            style={{
              backgroundColor: activeTab === tab ? "var(--m-bg-3)" : "transparent",
              color: activeTab === tab ? "var(--m-fg)" : "var(--m-fg-4)",
            }}
          >
            {tab}
            {tab === "Open Orders" && MOCK_OPEN_ORDERS.length > 0 && (
              <span className="ml-1.5 text-[10px] font-bold bg-[#f5c518]/15 text-[#f5c518] px-1.5 py-0.5 rounded-full">
                {MOCK_OPEN_ORDERS.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content — swipeable */}
      <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        {renderContent()}
      </div>
    </div>
  );
}
