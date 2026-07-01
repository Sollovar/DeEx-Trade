import { useState, useRef, useEffect, useCallback } from "react";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { getOpenOrders, getHistoryOrders, cancelOrder } from "@/services/orderbook";
import type { OrderWithPair } from "@/types";
import { usePairWebsocket, OrderUpdatePayload } from "@/hooks/usePairWebsocket";
import { useStore } from "@/stores/useStore";
import type { OrderStatus } from "@/types";
import { useTranslation } from "@/i18n/i18n";

type SectionTab = "Open Orders" | "Order History" | "Trade History";
const SECTION_TABS: SectionTab[] = ["Open Orders", "Order History", "Trade History"];

function fmtPrice(n: number) {
  if (n >= 10000) return n.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  if (n >= 1)     return n.toFixed(2);
  return n.toFixed(4);
}

function fmtTime(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  } catch {
    return iso;
  }
}

function fmtDateTime(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString("en-US", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });
  } catch {
    return iso;
  }
}

function statusColor(status: string) {
  if (status === "filled") return "#00c853";
  if (status === "cancelled" || status === "expired") return "var(--m-fg-4)";
  if (status === "partial") return "#f5c518";
  return "var(--m-fg-3)";
}

function statusBg(status: string) {
  if (status === "filled") return "rgba(0,200,83,0.1)";
  if (status === "cancelled" || status === "expired") return "var(--m-bg-4)";
  if (status === "partial") return "rgba(245,197,24,0.1)";
  return "var(--m-bg-4)";
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

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-10">
      <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--m-fg-5)", borderTopColor: "transparent" }} />
    </div>
  );
}

function pairSymbol(o: OrderWithPair) {
  if (o.pair) return `${o.pair.base_symbol}/${o.pair.quote_symbol}`;
  return o.order.pair_id;
}

function getDisplayAmount(o: OrderWithPair) {
  const amountIn = Number.parseFloat(o.amount_in_human || "0");
  const amountOutMin = Number.parseFloat(o.amount_out_min_human || "0");

  if (o.order.side === "buy") {
    return Number.isFinite(amountOutMin) && amountOutMin > 0 ? amountOutMin : amountIn;
  }

  return Number.isFinite(amountIn) && amountIn > 0 ? amountIn : amountOutMin;
}

function OpenOrdersContent({ orders, loading, onCancel }: {
  orders: OrderWithPair[];
  loading: boolean;
  onCancel: (id: number) => void;
}) {
  const { t } = useTranslation();
  const [cancelling, setCancelling] = useState<Set<number>>(new Set());

  async function handleCancel(id: number) {
    setCancelling(prev => new Set(prev).add(id));
    await onCancel(id);
    setCancelling(prev => { const n = new Set(prev); n.delete(id); return n; });
  }

  if (loading) return <LoadingState />;
  if (orders.length === 0) return <EmptyState label={t('orders.empty.openOrders')} />;

  return (
    <div className="flex flex-col gap-1 px-2 py-1.5">
      {orders.map((o) => {
        const ord = o.order;
        const price = parseFloat(ord.price);
        const amount = getDisplayAmount(o);
        const filled = parseFloat(ord.filled_amount);
        return (
          <div
            key={ord.id}
            className="rounded-xl px-3 py-2.5"
            style={{ backgroundColor: "var(--m-bg-2)" }}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[13px]" style={{ color: "var(--m-fg)" }}>{pairSymbol(o)}</span>
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                  style={{
                    color: ord.side === "buy" ? "#00c853" : "#ff1744",
                    backgroundColor: ord.side === "buy" ? "rgba(0,200,83,0.12)" : "rgba(255,23,68,0.12)",
                  }}
                >
                  {ord.side === "buy" ? t('orders.side.buy') : t('orders.side.sell')}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-md" style={{ color: "var(--m-fg-4)", backgroundColor: "var(--m-bg-4)" }}>
                  {ord.order_type.replace("_", " ")}
                </span>
              </div>
              <span className="text-[11px]" style={{ color: "var(--m-fg-4)" }}>{fmtTime(ord.created_at)}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex gap-4">
                <div>
                  <div className="text-[10px]" style={{ color: "var(--m-fg-4)" }}>{t('orders.col.price')}</div>
                  <div className="text-[12px] font-semibold" style={{ color: "var(--m-fg-2)" }}>{fmtPrice(price)}</div>
                </div>
                <div>
                  <div className="text-[10px]" style={{ color: "var(--m-fg-4)" }}>{t('orders.col.amount')}</div>
                  <div className="text-[12px] font-semibold" style={{ color: "var(--m-fg-2)" }}>{amount.toFixed(4)}</div>
                </div>
                <div>
                  <div className="text-[10px]" style={{ color: "var(--m-fg-4)" }}>{t('orders.col.filled')}</div>
                  <div className="text-[12px] font-semibold" style={{ color: "var(--m-fg-2)" }}>{parseFloat(filled.toFixed(4))}</div>
                </div>
              </div>
              <button
                disabled={cancelling.has(ord.id)}
                onClick={() => handleCancel(ord.id)}
                className="text-[11px] font-semibold px-3 py-1 rounded-lg"
                style={{
                  color: cancelling.has(ord.id) ? "var(--m-fg-4)" : "#ff1744",
                  backgroundColor: cancelling.has(ord.id) ? "var(--m-bg-4)" : "rgba(255,23,68,0.1)",
                  opacity: cancelling.has(ord.id) ? 0.6 : 1,
                }}
              >
                {cancelling.has(ord.id) ? t('orders.cancelling') : t('orders.cancel')}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function OrderHistoryContent({ orders, loading }: { orders: OrderWithPair[]; loading: boolean }) {
  const { t } = useTranslation();
  if (loading) return <LoadingState />;
  if (orders.length === 0) return <EmptyState label={t('orders.empty.orderHistory')} />;
  return (
    <div className="flex flex-col gap-1 px-2 py-1.5">
      {orders.map((o) => {
        const ord = o.order;
        const price = parseFloat(ord.price);
        const amount = getDisplayAmount(o);
        return (
          <div
            key={ord.id}
            className="rounded-xl px-3 py-2.5"
            style={{ backgroundColor: "var(--m-bg-2)" }}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[13px]" style={{ color: "var(--m-fg)" }}>{pairSymbol(o)}</span>
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                  style={{
                    color: ord.side === "buy" ? "#00c853" : "#ff1744",
                    backgroundColor: ord.side === "buy" ? "rgba(0,200,83,0.12)" : "rgba(255,23,68,0.12)",
                  }}
                >
                  {ord.side === "buy" ? t('orders.side.buy') : t('orders.side.sell')}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-md" style={{ color: "var(--m-fg-4)", backgroundColor: "var(--m-bg-4)" }}>
                  {ord.order_type.replace("_", " ")}
                </span>
              </div>
              <span
                className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                style={{
                  color: statusColor(ord.status),
                  backgroundColor: statusBg(ord.status),
                }}
              >
                {ord.status.charAt(0).toUpperCase() + ord.status.slice(1)}
              </span>
            </div>
            <div className="flex gap-4">
              <div>
                <div className="text-[10px]" style={{ color: "var(--m-fg-4)" }}>{t('orders.col.price')}</div>
                <div className="text-[12px] font-semibold" style={{ color: "var(--m-fg-2)" }}>{fmtPrice(price)}</div>
              </div>
              <div>
                <div className="text-[10px]" style={{ color: "var(--m-fg-4)" }}>{t('orders.col.amount')}</div>
                <div className="text-[12px] font-semibold" style={{ color: "var(--m-fg-2)" }}>{amount.toFixed(4)}</div>
              </div>
              <div>
                <div className="text-[10px]" style={{ color: "var(--m-fg-4)" }}>{t('orders.col.time')}</div>
                <div className="text-[11px]" style={{ color: "var(--m-fg-4)" }}>{fmtDateTime(ord.created_at)}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TradeHistoryContent({ orders, loading }: { orders: OrderWithPair[]; loading: boolean }) {
  const { t } = useTranslation();
  const filled = orders.filter(o => o.order.status === "filled" || o.order.status === "partial");
  if (loading) return <LoadingState />;
  if (filled.length === 0) return <EmptyState label={t('orders.empty.tradeHistory')} />;
  return (
    <div className="flex flex-col gap-1 px-2 py-1.5">
      {filled.map((o, i) => {
        const ord = o.order;
        const price = parseFloat(ord.price);
        const qty = getDisplayAmount(o);
        const amountIn = Number.parseFloat(o.amount_in_human || "0");
        const fee = amountIn * 0.001;
        return (
          <div
            key={`${ord.id}-${i}`}
            className="rounded-xl px-3 py-2.5"
            style={{ backgroundColor: "var(--m-bg-2)" }}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[13px]" style={{ color: "var(--m-fg)" }}>{pairSymbol(o)}</span>
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                  style={{
                    color: ord.side === "buy" ? "#00c853" : "#ff1744",
                    backgroundColor: ord.side === "buy" ? "rgba(0,200,83,0.12)" : "rgba(255,23,68,0.12)",
                  }}
                >
                  {ord.side === "buy" ? t('orders.side.buy') : t('orders.side.sell')}
                </span>
              </div>
              <span className="text-[11px]" style={{ color: "var(--m-fg-4)" }}>{fmtDateTime(ord.updated_at)}</span>
            </div>
            <div className="flex gap-4">
              <div>
                <div className="text-[10px]" style={{ color: "var(--m-fg-4)" }}>{t('orders.col.price')}</div>
                <div className="text-[12px] font-semibold" style={{ color: "var(--m-fg-2)" }}>{fmtPrice(price)}</div>
              </div>
              <div>
                <div className="text-[10px]" style={{ color: "var(--m-fg-4)" }}>{t('orders.col.qty')}</div>
                <div className="text-[12px] font-semibold" style={{ color: "var(--m-fg-2)" }}>{qty.toFixed(4)}</div>
              </div>
              <div>
                <div className="text-[10px]" style={{ color: "var(--m-fg-4)" }}>{t('orders.col.estFee')}</div>
                <div className="text-[12px] font-semibold" style={{ color: "var(--m-fg-4)" }}>{fee.toFixed(3)} USDT</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function MobileBottomSection() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<SectionTab>("Open Orders");
  const touchStartX = useRef<number | null>(null);
  const { primaryWallet } = useDynamicContext();
  const address = (primaryWallet as any)?.address as string | undefined;

  const [openOrders, setOpenOrders] = useState<OrderWithPair[]>([]);
  const [historyOrders, setHistoryOrders] = useState<OrderWithPair[]>([]);
  const [openLoading, setOpenLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  const orderRefreshTick = useStore(s => s.orderRefreshTick);
  const selectedPairId = useStore(s => s.selectedPair?.id ?? null);

  const fetchOpen = useCallback(async () => {
    if (!address) { setOpenOrders([]); return; }
    setOpenLoading(true);
    try {
      const res = await getOpenOrders(address);
      setOpenOrders(res.data ?? []);
    } catch {
      setOpenOrders([]);
    } finally {
      setOpenLoading(false);
    }
  }, [address]);

  const fetchHistory = useCallback(async () => {
    if (!address) { setHistoryOrders([]); return; }
    setHistoryLoading(true);
    try {
      const res = await getHistoryOrders(address, 50, 0);
      setHistoryOrders(res.data ?? []);
    } catch {
      setHistoryOrders([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [address]);

  // Initial load
  useEffect(() => {
    fetchOpen();
    fetchHistory();
  }, [fetchOpen, fetchHistory]);

  // Re-fetch open orders immediately when a new order is placed
  useEffect(() => {
    if (orderRefreshTick > 0) fetchOpen();
  }, [orderRefreshTick, fetchOpen]);

  // Real-time order status updates via WebSocket
  usePairWebsocket(selectedPairId, {
    onOrderUpdate: (order: OrderUpdatePayload) => {
      setOpenOrders(prev => {
        const idx = prev.findIndex(o => o.order.id === order.id);
        if (idx === -1) return prev;
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          order: {
            ...updated[idx].order,
            filled_amount: order.filled_amount,
            status: order.status as OrderStatus,
          },
        };
        // Remove from open list if fully filled, cancelled, or expired
        if (order.status === 'filled' || order.status === 'cancelled' || order.status === 'expired') {
          return updated.filter(o => o.order.id !== order.id);
        }
        return updated;
      });
    },
  });

  async function handleCancel(id: number) {
    try {
      await cancelOrder(String(id), address);
      setOpenOrders(prev => prev.filter(o => o.order.id !== id));
    } catch (err) {
      console.error("Failed to cancel order:", err);
    }
  }

  function handleTouchStart(e: React.TouchEvent) {
    // Stop propagation so the page-level swipe handler doesn't fire when swiping inside this panel
    e.stopPropagation();
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    e.stopPropagation();
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
    if (activeTab === "Open Orders")   return <OpenOrdersContent orders={openOrders} loading={openLoading} onCancel={handleCancel} />;
    if (activeTab === "Order History") return <OrderHistoryContent orders={historyOrders} loading={historyLoading} />;
    if (activeTab === "Trade History") return <TradeHistoryContent orders={historyOrders} loading={historyLoading} />;
    return null;
  }

  return (
    <div className="flex flex-col" style={{ backgroundColor: "var(--m-bg)" }}>
      {/* Tab bar */}
      <div
        className="flex shrink-0 pt-1"
        style={{ backgroundColor: "var(--m-bg)", borderBottom: "1px solid var(--m-bdr)" }}
      >
        {SECTION_TABS.map((tab) => {
          const tabLabel = tab === "Open Orders"   ? t('orders.tab.open')
                        : tab === "Order History"  ? t('orders.tab.history')
                        :                            t('orders.tab.tradeHistory');
          return (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="flex-1 h-[34px] text-[12px] font-semibold whitespace-nowrap transition-all rounded-lg mb-1 text-center"
            style={{
              backgroundColor: activeTab === tab ? "var(--m-bg-3)" : "transparent",
              color: activeTab === tab ? "var(--m-fg)" : "var(--m-fg-4)",
            }}
          >
            {tabLabel}
            {tab === "Open Orders" && openOrders.length > 0 && (
              <span className="ml-1.5 text-[10px] font-bold bg-[#f5c518]/15 text-[#f5c518] px-1.5 py-0.5 rounded-full">
                {openOrders.length}
              </span>
            )}
          </button>
          );
        })}
      </div>

      {/* Content — swipeable */}
      <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        {renderContent()}
      </div>
    </div>
  );
}
