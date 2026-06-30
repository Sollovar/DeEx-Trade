import { useState, useEffect } from "react";
import { Filter, Download, RefreshCw, TrendingUp, TrendingDown } from "lucide-react";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { useConnectedNetwork } from "@/hooks/useConnectedNetwork";
import { useCoinStatsPortfolio } from "@/hooks/useCoinStatsPortfolio";
import { useUserOrders } from "@/hooks/useUserOrders";
import { useOrderCreation } from "@/hooks/useOrderCreation";
import { useStore } from "@/stores/useStore";
import { getHistoryOrders } from "@/services/orderbook";
import type { Order, OrderWithPair } from "@/types";

type BottomTab = "Open Orders" | "Positions" | "Predictions" | "Assets" | "Order History" | "Trade History" | "Transaction History";
const TABS: BottomTab[] = ["Open Orders", "Positions", "Predictions", "Assets", "Order History", "Trade History", "Transaction History"];

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
                <td className={`${TD} font-mono tabular-nums text-[#ccc]`}>{fmtPx(o.price)}</td>
                <td className={`${TD} font-mono tabular-nums text-[#ccc]`}>{o.amount?.toFixed(6)}</td>
                <td className={TD}>
                  <div className="flex items-center gap-2">
                    <div className="w-14 h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                      <div className="h-full bg-[#f5c518]/70 rounded-full" style={{ width: `${filledPct}%` }} />
                    </div>
                    <span className="font-mono tabular-nums text-[#888] text-[11px]">{filledPct.toFixed(0)}%</span>
                  </div>
                </td>
                <td className={TD}>
                  <span className="text-[11px] px-1.5 py-0.5 rounded font-medium bg-[#f5c518]/15 text-[#f5c518]">
                    {o.status ?? "open"}
                  </span>
                </td>
                <td className={`${TD} font-mono tabular-nums text-[#555]`}>{fmtTime(o.createdAt ?? "")}</td>
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
                <td className={`${TD} font-mono tabular-nums text-[#ccc]`}>{fmtPx(parseFloat(o.price ?? "0"))}</td>
                <td className={`${TD} font-mono tabular-nums text-[#ccc]`}>{amount.toFixed(6)}</td>
                <td className={`${TD} font-mono tabular-nums text-[#ccc]`}>{filled.toFixed(6)}</td>
                <td className={TD}>
                  <span className={`text-[11px] px-1.5 py-0.5 rounded font-medium ${colorClass}`}>{status}</span>
                </td>
                <td className={`${TD} font-mono tabular-nums text-[#555]`}>{fmtTime(o.created_at ?? "")}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

interface AssetsViewProps {
  holdings: import("@/hooks/useCoinStatsPortfolio").PortfolioHolding[];
  summary: import("@/hooks/useCoinStatsPortfolio").PortfolioSummary;
  loading: boolean;
  syncing: boolean;
  error: string | null;
  refetch: () => void;
  hasWallet: boolean;
}

function AssetsView({ holdings, summary, loading, syncing, error, refetch, hasWallet }: AssetsViewProps) {
  const fmt = (n: number) =>
    n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (!hasWallet) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2">
        <div className="w-8 h-8 rounded-full bg-[#151515] flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="1.5"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/></svg>
        </div>
        <p className="text-[#444] text-[12px]">Connect a wallet to view your assets</p>
      </div>
    );
  }

  if (loading || syncing) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2">
        <RefreshCw className="w-4 h-4 text-[#444] animate-spin" />
        <p className="text-[#444] text-[12px]">{syncing ? "Syncing wallet…" : "Loading assets…"}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2">
        <p className="text-[#ff1744] text-[12px]">Failed to load portfolio</p>
        <button onClick={refetch} className="text-[11px] text-[#f5c518] hover:text-[#ffe066] flex items-center gap-1">
          <RefreshCw className="w-3 h-3" /> Retry
        </button>
      </div>
    );
  }

  if (holdings.length === 0) {
    return <Empty msg="No assets found for this wallet on this network" />;
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="flex items-center gap-6 px-3 py-2 border-b border-[#141414]">
        <span className="text-[#555] text-[12px]">
          Total Value: <span className="text-white font-mono font-medium">${fmt(summary.totalValueUsd)}</span>
        </span>
        <span className="text-[#555] text-[12px]">
          Unrealized PnL:{" "}
          <span className={`font-mono font-medium ${summary.unrealizedPnlUsd >= 0 ? "text-[#00c853]" : "text-[#ff1744]"}`}>
            {summary.unrealizedPnlUsd >= 0 ? "+" : ""}${fmt(summary.unrealizedPnlUsd)}
          </span>
        </span>
        <span className="text-[#555] text-[12px]">
          24h PnL:{" "}
          <span className={`font-mono font-medium ${summary.pnl24hUsd >= 0 ? "text-[#00c853]" : "text-[#ff1744]"}`}>
            {summary.pnl24hUsd >= 0 ? "+" : ""}${fmt(summary.pnl24hUsd)}
          </span>
        </span>
        <button onClick={refetch} className="ml-auto text-[#555] hover:text-white transition-colors">
          <RefreshCw className="w-3 h-3" />
        </button>
      </div>
      <table className="w-full min-w-[600px]">
        <thead className="sticky top-0 bg-[#000000]">
          <tr className="border-b border-[#141414]">
            {["Asset", "Balance", "Price", "24h", "Value (USD)", "Unrealized PnL", "All-Time PnL"].map(h => (
              <th key={h} className={TH}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {holdings.map((h) => {
            const isUp = h.priceChange24h >= 0;
            const pnlUp = h.unrealizedPnlUsd >= 0;
            const atUp = h.allTimePnlUsd >= 0;
            return (
              <tr key={h.symbol} className="border-b border-[#111] hover:bg-[#111] transition-colors">
                <td className={`${TD}`}>
                  <div className="flex items-center gap-2">
                    {h.icon ? (
                      <img src={h.icon} alt={h.symbol} className="w-5 h-5 rounded-full" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-[#222] flex items-center justify-center text-[9px] font-bold text-[#666]">
                        {h.symbol.slice(0, 2)}
                      </div>
                    )}
                    <div>
                      <span className="font-bold text-white text-[12px]">{h.symbol}</span>
                      <p className="text-[10px] text-[#555] leading-none mt-0.5">{h.name}</p>
                    </div>
                  </div>
                </td>
                <td className={`${TD} font-mono tabular-nums text-[#ccc]`}>
                  {h.count < 0.0001 ? h.count.toExponential(2) : h.count.toFixed(h.count < 0.01 ? 6 : 4)}
                </td>
                <td className={`${TD} font-mono tabular-nums text-[#ccc]`}>${fmt(h.priceUsd)}</td>
                <td className={TD}>
                  <div className={`flex items-center gap-0.5 text-[12px] font-mono font-semibold ${isUp ? "text-[#00c853]" : "text-[#ff1744]"}`}>
                    {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {isUp ? "+" : ""}{h.priceChange24h.toFixed(2)}%
                  </div>
                </td>
                <td className={`${TD} font-mono tabular-nums text-white font-medium`}>${fmt(h.valueUsd)}</td>
                <td className={TD}>
                  <span className={`font-mono tabular-nums font-semibold text-[12px] ${pnlUp ? "text-[#00c853]" : "text-[#ff1744]"}`}>
                    {pnlUp ? "+" : ""}${fmt(h.unrealizedPnlUsd)}
                  </span>
                </td>
                <td className={TD}>
                  <span className={`font-mono tabular-nums font-semibold text-[12px] ${atUp ? "text-[#00c853]" : "text-[#ff1744]"}`}>
                    {atUp ? "+" : ""}${fmt(h.allTimePnlUsd)}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function TxHistoryView() {
  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full min-w-[600px]">
        <thead className="sticky top-0 bg-[#000000]">
          <tr className="border-b border-[#141414]">
            {["Type","Coin","Amount","Status","Time"].map(h=>(<th key={h} className={TH}>{h}</th>))}
          </tr>
        </thead>
        <tbody>
          {[
            { type: "Deposit",  coin: "USDT", amount: "500.00",  status: "Completed", time: "2026-06-09 14:22:00" },
            { type: "Withdraw", coin: "USDT", amount: "200.00",  status: "Completed", time: "2026-06-08 10:11:30" },
            { type: "Deposit",  coin: "BTC",  amount: "0.00500", status: "Completed", time: "2026-06-07 08:44:55" },
          ].map((tx, i) => (
            <tr key={i} className="border-b border-[#111] hover:bg-[#111] transition-colors">
              <td className={TD}><span className={`font-bold ${tx.type==="Deposit"?"text-[#00c853]":"text-[#ff6b35]"}`}>{tx.type}</span></td>
              <td className={`${TD} font-semibold text-white`}>{tx.coin}</td>
              <td className={`${TD} font-mono tabular-nums text-[#ccc]`}>{tx.amount}</td>
              <td className={TD}><span className="text-[11px] bg-[#00c853]/15 text-[#00c853] px-1.5 py-0.5 rounded font-medium">{tx.status}</span></td>
              <td className={`${TD} font-mono tabular-nums text-[#555]`}>{tx.time}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function BottomPanel() {
  const [activeTab, setActiveTab] = useState<BottomTab>("Open Orders");

  const { primaryWallet } = useDynamicContext();
  const network  = useConnectedNetwork();
  const address  = primaryWallet?.address ?? null;
  const portfolio = useCoinStatsPortfolio(address, network);
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
    if (!primaryWallet && activeTab !== "Assets" && activeTab !== "Transaction History" && activeTab !== "Predictions") {
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
      case "Positions":
        return <Empty msg="No open positions" />;
      case "Predictions":
        return <Empty msg="No active predictions" />;
      case "Assets":
        return (
          <AssetsView
            holdings={portfolio.holdings}
            summary={portfolio.summary}
            loading={portfolio.loading}
            syncing={portfolio.syncing}
            error={portfolio.error}
            refetch={portfolio.refetch}
            hasWallet={!!primaryWallet}
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
      case "Transaction History":
        return <TxHistoryView />;
    }
  }

  return (
    <div className="flex flex-col bg-[#0a0a0a] border-t border-[#1a1a1a] h-full overflow-hidden">
      {/* Tab bar */}
      <div className="flex items-center h-[36px] border-b border-[#141414] bg-[#0e0e0e] shrink-0 px-1">
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
          {activeTab === "Assets" && portfolio.summary.totalValueUsd > 0 && (
            <span className="text-[12px] text-[#555]">
              Portfolio:
              <span className="ml-1 font-mono font-bold text-white">
                ${portfolio.summary.totalValueUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </span>
          )}
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
