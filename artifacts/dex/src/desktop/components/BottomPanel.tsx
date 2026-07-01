import { useState, useEffect } from "react";
import { Filter, Download, RefreshCw } from "lucide-react";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { useUserOrders } from "@/hooks/useUserOrders";
import { useOrderCreation } from "@/hooks/useOrderCreation";
import { useStore } from "@/stores/useStore";
import { getHistoryOrders } from "@/services/orderbook";
import type { Order, OrderWithPair } from "@/types";

type BottomTab = "Open Orders" | "Order History" | "Trade History";
const TABS: BottomTab[] = ["Open Orders", "Order History", "Trade History"];

const TH = "text-left px-3 py-1.5 text-[11px] font-semibold text-[#444] whitespace-nowrap";
const TD = "px-3 py-2 text-[12px]";

function Empty({ msg = "No data available" }: { msg?: string }) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-2">
      <div className="w-9 h-9 rounded-full bg-[#151515] flex items-center justify-center">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="1.5">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
      </div>
      <p className="text-[#444] text-[12px]">{msg}</p>
    </div>
  );
}

function NoWallet() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-2">
      <div className="w-8 h-8 rounded-full bg-[#151515] flex items-center justify-center">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="1.5">
          <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/>
          <path d="M18 12a2 2 0 0 0 0 4h4v-4z"/>
        </svg>
      </div>
      <p className="text-[#444] text-[12px]">Connect a wallet to view your orders</p>
    </div>
  );
}

function fmtTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("en-US", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });
  } catch {
    return iso;
  }
}

function fmtPx(n: number): string {
  if (n >= 1000) return n.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  if (n >= 1) return n.toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  return n.toPrecision(6);
}

interface OpenOrdersViewProps {
  orders: Order[];
  pairs: import("@/types").Pair[];
  loading: boolean;
  onCancel: (id: string) => void;
  cancelling: boolean;
}

function OpenOrdersView({ orders, pairs, loading, onCancel, cancelling }: OpenOrdersViewProps) {
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <RefreshCw className="w-4 h-4 text-[#444] animate-spin" />
      </div>
    );
  }

  if (orders.length === 0) {
    return <Empty msg="No open orders" />;
  }

  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full min-w-[750px]">
        <thead className="sticky top-0 bg-[#000000]">
          <tr className="border-b border-[#141414]">
            {["Symbol","Type","Side","Price","Amount","Filled","Status","Time",""].map(h=>(
              <th key={h} className={TH}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => {
            const pair = pairs.find(p => p.id === o.pairId);
            const symbol = pair
              ? `${pair.baseToken?.symbol}/${pair.quoteToken?.symbol}`
              : o.pairId;
            const filledPct = o.amount > 0 ? (o.filledAmount / o.amount) * 100 : 0;
            return (
              <tr key={o.id} className="border-b border-[#111] hover:bg-[#111] transition-colors">
                <td className={`${TD} font-semibold text-white`}>{symbol}</td>
                <td className={`${TD} text-[#888]`}>{o.orderType?.replace(/_/g, " ") ?? "—"}</td>
                <td className={TD}>
                  <span className={`font-bold ${o.side === "buy" ? "text-[#00c853]" : "text-[#ff1744]"}`}>
                    {o.side === "buy" ? "Buy" : "Sell"}
                  </span>
                </td>
                <td className={`${TD} tabular-nums text-[#ccc]`}>{fmtPx(o.price)}</td>
                <td className={`${TD} tabular-nums text-[#ccc]`}>{o.amount?.toFixed(6)}</td>
                <td className={TD}>
                  <div className="flex items-center gap-2">
                    <div className="w-14 h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                      <div className="h-full bg-[#f5c518]/70 rounded-full" style={{ width: `${filledPct}%` }} />
                    </div>
                    <span className="tabular-nums text-[#888] text-[11px]">{filledPct.toFixed(0)}%</span>
                  </div>
                </td>
                <td className={TD}>
                  <span className="text-[11px] px-1.5 py-0.5 rounded font-medium bg-[#f5c518]/15 text-[#f5c518]">
                    {o.status ?? "open"}
                  </span>
                </td>
                <td className={`${TD} tabular-nums text-[#555]`}>{fmtTime(o.createdAt ?? "")}</td>
                <td className={TD}>
                  <button
                    onClick={() => onCancel(String(o.id))}
                    disabled={cancelling}
                    className="text-[12px] text-[#555] hover:text-[#ff1744] transition-colors font-medium disabled:opacity-40"
                  >
                    Cancel
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

interface OrderHistoryViewProps {
  orders: OrderWithPair[];
  pairs: import("@/types").Pair[];
  loading: boolean;
}

function OrderHistoryView({ orders, pairs, loading }: OrderHistoryViewProps) {
  const statuses = ["filled", "cancelled", "partial"];
  const statusColors: Record<string, string> = {
    filled:    "bg-[#00c853]/15 text-[#00c853]",
    cancelled: "bg-[#ff1744]/15 text-[#ff1744]",
    partial:   "bg-[#f5c518]/15 text-[#f5c518]",
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <RefreshCw className="w-4 h-4 text-[#444] animate-spin" />
      </div>
    );
  }

  if (orders.length === 0) {
    return <Empty msg="No order history" />;
  }

  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full min-w-[750px]">
        <thead className="sticky top-0 bg-[#000000]">
          <tr className="border-b border-[#141414]">
            {["Symbol","Type","Side","Price","Amount","Filled","Status","Time"].map(h=>(
              <th key={h} className={TH}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {orders.map((owp, i) => {
            const o = owp.order;
            const pair = owp.pair ?? pairs.find(p => p.id === o.pair_id);
            const symbol = pair
              ? `${(pair as any).baseToken?.symbol ?? (pair as any).base_token?.symbol}/${(pair as any).quoteToken?.symbol ?? (pair as any).quote_token?.symbol}`
              : o.pair_id;
            const status = o.status?.toLowerCase() ?? "unknown";
            const colorClass = statusColors[status] ?? "bg-[#333]/15 text-[#888]";
            const amount = parseFloat(o.amount ?? "0");
            const filled = parseFloat(o.filled_amount ?? "0");
            return (
              <tr key={i} className="border-b border-[#111] hover:bg-[#111] transition-colors">
                <td className={`${TD} font-semibold text-white`}>{symbol}</td>
                <td className={`${TD} text-[#888]`}>{o.order_type?.replace(/_/g, " ") ?? "—"}</td>
                <td className={TD}>
                  <span className={`font-bold ${o.side === "buy" ? "text-[#00c853]" : "text-[#ff1744]"}`}>
                    {o.side === "buy" ? "Buy" : "Sell"}
                  </span>
                </td>
                <td className={`${TD} tabular-nums text-[#ccc]`}>{fmtPx(parseFloat(o.price ?? "0"))}</td>
                <td className={`${TD} tabular-nums text-[#ccc]`}>{amount.toFixed(6)}</td>
                <td className={`${TD} tabular-nums text-[#ccc]`}>{filled.toFixed(6)}</td>
                <td className={TD}>
                  <span className={`text-[11px] px-1.5 py-0.5 rounded font-medium ${colorClass}`}>{status}</span>
                </td>
                <td className={`${TD} tabular-nums text-[#555]`}>{fmtTime(o.created_at ?? "")}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function BottomPanel() {
  const [activeTab, setActiveTab] = useState<BottomTab>("Open Orders");

  const { primaryWallet } = useDynamicContext();
  const address  = primaryWallet?.address ?? null;
  const pairs    = useStore((s) => s.pairs);

  // Real open orders
  const { userOrders, loading: ordersLoading, refetch: refetchOrders } = useUserOrders(address ?? undefined);

  // Real order history
  const [historyOrders, setHistoryOrders] = useState<OrderWithPair[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    if (!address) {
      setHistoryOrders([]);
      return;
    }
    setHistoryLoading(true);
    getHistoryOrders(address)
      .then((res) => setHistoryOrders(res.data || []))
      .catch(() => setHistoryOrders([]))
      .finally(() => setHistoryLoading(false));
  }, [address]);

  // Cancel order
  const { cancelOrder, loading: cancelling } = useOrderCreation();

  async function handleCancel(orderId: string) {
    const result = await cancelOrder(orderId);
    if (result.success) {
      refetchOrders();
    }
  }

  const openOrdersCount = userOrders.length;

  function renderContent() {
    if (!primaryWallet) {
      return <NoWallet />;
    }
    switch (activeTab) {
      case "Open Orders":
        return (
          <OpenOrdersView
            orders={userOrders}
            pairs={pairs}
            loading={ordersLoading}
            onCancel={handleCancel}
            cancelling={cancelling}
          />
        );
      case "Order History":
        return (
          <OrderHistoryView
            orders={historyOrders}
            pairs={pairs}
            loading={historyLoading}
          />
        );
      case "Trade History":
        return <Empty msg="No trade history" />;
    }
  }

  return (
    <div className="flex flex-col bg-[#000000] border-t border-[#1a1a1a] h-full overflow-hidden">
      {/* Tab bar */}
      <div className="flex items-center h-[36px] border-b border-[#141414] bg-[#000000] shrink-0 px-1">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            data-testid={`bottom-tab-${tab.toLowerCase().replace(/ /g,"-")}`}
            className={`h-full px-3 text-[12px] font-semibold whitespace-nowrap transition-colors relative ${
              activeTab === tab
                ? "text-white after:absolute after:bottom-0 after:left-1 after:right-1 after:h-[2px] after:bg-[#f5c518] after:content-['']"
                : "text-[#555] hover:text-[#aaa]"
            }`}
          >
            {tab}
            {tab === "Open Orders" && openOrdersCount > 0 && (
              <span className="ml-1 text-[10px] bg-[#f5c518]/20 text-[#f5c518] px-1 rounded-full">{openOrdersCount}</span>
            )}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-3 px-3 shrink-0">
          {activeTab === "Open Orders" && address && (
            <button onClick={() => refetchOrders()} className="text-[#555] hover:text-white transition-colors">
              <RefreshCw className="w-3 h-3" />
            </button>
          )}
          <button className="text-[#555] hover:text-white transition-colors"><Filter className="w-3.5 h-3.5" /></button>
          <button className="text-[#555] hover:text-white transition-colors"><Download className="w-3.5 h-3.5" /></button>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden text-white">
        {renderContent()}
      </div>
    </div>
  );
}
