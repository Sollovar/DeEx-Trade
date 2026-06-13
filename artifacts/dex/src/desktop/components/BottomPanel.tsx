import { useState } from "react";
import { Filter, Download, RefreshCw, TrendingUp, TrendingDown } from "lucide-react";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { useConnectedNetwork, type Network } from "@/hooks/useConnectedNetwork";
import { useCoinStatsPortfolio } from "@/hooks/useCoinStatsPortfolio";
import { PortfolioChart } from "@/components/PortfolioChart";
import { PortfolioLoader } from "@/components/PortfolioLoader";

type BottomTab = "Open Orders" | "Positions" | "Predictions" | "Assets" | "Order History" | "Trade History" | "Transaction History";
const TABS: BottomTab[] = ["Open Orders", "Positions", "Predictions", "Assets", "Order History", "Trade History", "Transaction History"];

interface Position {
  symbol: string; side: "Long" | "Short"; size: number;
  entryPrice: number; markPrice: number; liqPrice: number;
  margin: number; leverage: number; unrealizedPnl: number; roe: number;
}
interface OpenOrder {
  id: string; symbol: string; type: string; side: "Buy" | "Sell";
  price: number; amount: number; filled: number; total: number; time: string;
}
interface TradeHistoryRow {
  symbol: string; side: "Buy" | "Sell"; price: number;
  quantity: number; fee: number; realizedPnl: number; time: string;
}

const MOCK_POSITIONS: Position[] = [
  { symbol: "BTC/USDT", side: "Long",  size: 0.05, entryPrice: 60420.0, markPrice: 61202.0, liqPrice: 55814.0, margin: 152.10, leverage: 20, unrealizedPnl:  39.10, roe:  0.257 },
  { symbol: "ETH/USDT", side: "Short", size: 0.8,  entryPrice: 1680.0,  markPrice: 1617.8,  liqPrice: 1820.0,  margin:  67.20, leverage: 20, unrealizedPnl:  49.80, roe:  0.741 },
  { symbol: "SOL/USDT", side: "Long",  size: 10.0, entryPrice: 65.4,    markPrice: 62.84,   liqPrice: 58.0,    margin:  65.40, leverage: 10, unrealizedPnl: -25.60, roe: -0.391 },
];
const MOCK_ORDERS: OpenOrder[] = [
  { id: "001", symbol: "BTC/USDT", type: "Limit", side: "Buy",  price: 60500.0, amount: 0.02, filled: 0,   total: 1210.0, time: "10:31:04" },
  { id: "002", symbol: "ETH/USDT", type: "Limit", side: "Sell", price: 1700.0,  amount: 0.5,  filled: 0,   total:  850.0, time: "10:28:17" },
  { id: "003", symbol: "BNB/USDT", type: "Limit", side: "Buy",  price: 572.0,   amount: 1.0,  filled: 0.3, total:  572.0, time: "10:14:55" },
];
const MOCK_TRADES: TradeHistoryRow[] = [
  { symbol: "BTC/USDT", side: "Buy",  price: 60420.0, quantity: 0.05, fee: 1.51,  realizedPnl: 0,     time: "2026-06-10 09:14:22" },
  { symbol: "ETH/USDT", side: "Sell", price: 1680.0,  quantity: 0.8,  fee: 0.672, realizedPnl: 0,     time: "2026-06-10 09:10:11" },
  { symbol: "SOL/USDT", side: "Buy",  price: 65.4,    quantity: 10,   fee: 0.327, realizedPnl: 0,     time: "2026-06-10 08:55:43" },
  { symbol: "BTC/USDT", side: "Sell", price: 62100.0, quantity: 0.04, fee: 1.24,  realizedPnl: 68.0,  time: "2026-06-09 22:30:01" },
  { symbol: "ETH/USDT", side: "Buy",  price: 1590.0,  quantity: 1.2,  fee: 0.954, realizedPnl: -28.8, time: "2026-06-09 18:14:09" },
];

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

function PositionsView() {
  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full min-w-[820px]">
        <thead className="sticky top-0 bg-[#0a0a0a]">
          <tr className="border-b border-[#141414]">
            {["Symbol","Side","Size","Entry Price","Current Price","Value (USDT)","Unrealized PnL (ROE%)","Actions"].map(h=>(
              <th key={h} className={TH}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {MOCK_POSITIONS.map((p, i) => (
            <tr key={i} className="border-b border-[#111] hover:bg-[#111] transition-colors">
              <td className={`${TD} font-semibold text-white`}>{p.symbol}</td>
              <td className={TD}>
                <span className={`font-bold ${p.side === "Long" ? "text-[#00c853]" : "text-[#ff1744]"}`}>{p.side}</span>
              </td>
              <td className={`${TD} font-mono tabular-nums text-[#ccc]`}>{p.size}</td>
              <td className={`${TD} font-mono tabular-nums text-[#ccc]`}>{p.entryPrice.toLocaleString("en-US",{minimumFractionDigits:1})}</td>
              <td className={`${TD} font-mono tabular-nums text-[#ccc]`}>{p.markPrice.toLocaleString("en-US",{minimumFractionDigits:1})}</td>
              <td className={`${TD} font-mono tabular-nums text-[#ccc]`}>{p.margin.toFixed(2)}</td>
              <td className={TD}>
                <span className={`font-mono tabular-nums font-semibold ${p.unrealizedPnl >= 0 ? "text-[#00c853]" : "text-[#ff1744]"}`}>
                  {p.unrealizedPnl >= 0 ? "+" : ""}{p.unrealizedPnl.toFixed(2)}
                </span>
                <span className={`ml-2 text-[11px] ${p.roe >= 0 ? "text-[#00c853]" : "text-[#ff1744]"}`}>
                  ({p.roe >= 0 ? "+" : ""}{(p.roe * 100).toFixed(2)}%)
                </span>
              </td>
              <td className={TD}>
                <div className="flex items-center gap-3">
                  <button className="text-[12px] text-[#f5c518] hover:text-[#ffe066] font-medium transition-colors">TP/SL</button>
                  <button className="text-[12px] text-[#555] hover:text-[#ff1744] transition-colors">Close</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OpenOrdersView() {
  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full min-w-[750px]">
        <thead className="sticky top-0 bg-[#0a0a0a]">
          <tr className="border-b border-[#141414]">
            {["Symbol","Type","Side","Price","Amount","Filled","Total (USDT)","Time",""].map(h=>(
              <th key={h} className={TH}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {MOCK_ORDERS.map((o) => (
            <tr key={o.id} className="border-b border-[#111] hover:bg-[#111] transition-colors">
              <td className={`${TD} font-semibold text-white`}>{o.symbol}</td>
              <td className={`${TD} text-[#888]`}>{o.type}</td>
              <td className={TD}>
                <span className={`font-bold ${o.side === "Buy" ? "text-[#00c853]" : "text-[#ff1744]"}`}>{o.side}</span>
              </td>
              <td className={`${TD} font-mono tabular-nums text-[#ccc]`}>{o.price.toLocaleString("en-US",{minimumFractionDigits:1})}</td>
              <td className={`${TD} font-mono tabular-nums text-[#ccc]`}>{o.amount}</td>
              <td className={TD}>
                <div className="flex items-center gap-2">
                  <div className="w-14 h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                    <div className="h-full bg-[#f5c518]/70 rounded-full" style={{ width: `${(o.filled / o.amount) * 100}%` }} />
                  </div>
                  <span className="font-mono tabular-nums text-[#888] text-[11px]">{((o.filled / o.amount) * 100).toFixed(0)}%</span>
                </div>
              </td>
              <td className={`${TD} font-mono tabular-nums text-[#ccc]`}>{o.total.toFixed(2)}</td>
              <td className={`${TD} font-mono tabular-nums text-[#555]`}>{o.time}</td>
              <td className={TD}>
                <button className="text-[12px] text-[#555] hover:text-[#ff1744] transition-colors font-medium">Cancel</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OrderHistoryView() {
  const statuses = ["Filled", "Cancelled", "Partial"];
  const statusColors: Record<string, string> = {
    Filled: "bg-[#00c853]/15 text-[#00c853]",
    Cancelled: "bg-[#ff1744]/15 text-[#ff1744]",
    Partial: "bg-[#f5c518]/15 text-[#f5c518]",
  };
  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full min-w-[750px]">
        <thead className="sticky top-0 bg-[#0a0a0a]">
          <tr className="border-b border-[#141414]">
            {["Symbol","Type","Side","Price","Amount","Filled","Status","Time"].map(h=>(
              <th key={h} className={TH}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[...MOCK_ORDERS, ...MOCK_ORDERS].map((o, i) => {
            const status = statuses[i % 3];
            return (
              <tr key={i} className="border-b border-[#111] hover:bg-[#111] transition-colors">
                <td className={`${TD} font-semibold text-white`}>{o.symbol}</td>
                <td className={`${TD} text-[#888]`}>{o.type}</td>
                <td className={TD}>
                  <span className={`font-bold ${o.side === "Buy" ? "text-[#00c853]" : "text-[#ff1744]"}`}>{o.side}</span>
                </td>
                <td className={`${TD} font-mono tabular-nums text-[#ccc]`}>{o.price.toLocaleString("en-US",{minimumFractionDigits:1})}</td>
                <td className={`${TD} font-mono tabular-nums text-[#ccc]`}>{o.amount}</td>
                <td className={`${TD} font-mono tabular-nums text-[#ccc]`}>{o.filled}</td>
                <td className={TD}>
                  <span className={`text-[11px] px-1.5 py-0.5 rounded font-medium ${statusColors[status]}`}>{status}</span>
                </td>
                <td className={`${TD} font-mono tabular-nums text-[#555]`}>2026-06-{(10 - Math.floor(i / 2)).toString().padStart(2,"0")} {o.time}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function TradeHistoryView() {
  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full min-w-[700px]">
        <thead className="sticky top-0 bg-[#0a0a0a]">
          <tr className="border-b border-[#141414]">
            {["Symbol","Side","Price","Quantity","Fee (USDT)","Realized PnL","Time"].map(h=>(
              <th key={h} className={TH}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {MOCK_TRADES.map((t, i) => (
            <tr key={i} className="border-b border-[#111] hover:bg-[#111] transition-colors">
              <td className={`${TD} font-semibold text-white`}>{t.symbol}</td>
              <td className={TD}><span className={`font-bold ${t.side==="Buy"?"text-[#00c853]":"text-[#ff1744]"}`}>{t.side}</span></td>
              <td className={`${TD} font-mono tabular-nums text-[#ccc]`}>{t.price.toLocaleString("en-US",{minimumFractionDigits:1})}</td>
              <td className={`${TD} font-mono tabular-nums text-[#ccc]`}>{t.quantity}</td>
              <td className={`${TD} font-mono tabular-nums text-[#888]`}>{t.fee.toFixed(3)}</td>
              <td className={TD}>
                {t.realizedPnl === 0
                  ? <span className="text-[#444] font-mono">—</span>
                  : <span className={`font-mono tabular-nums font-semibold ${t.realizedPnl > 0 ? "text-[#00c853]" : "text-[#ff1744]"}`}>
                      {t.realizedPnl > 0 ? "+" : ""}{t.realizedPnl.toFixed(2)}
                    </span>
                }
              </td>
              <td className={`${TD} font-mono tabular-nums text-[#555]`}>{t.time}</td>
            </tr>
          ))}
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
  address: string | null;
  network: Network;
}

function AssetsView({ holdings, summary, loading, syncing, error, refetch, hasWallet, address, network }: AssetsViewProps) {
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
    return <PortfolioLoader message={syncing ? "Syncing wallet…" : "Loading portfolio…"} size="sm" />;
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2">
        <p className="text-[#ff1744] text-[12px]">Failed to load portfolio</p>
        <button
          onClick={refetch}
          className="text-[11px] text-[#f5c518] hover:text-[#ffe066] flex items-center gap-1"
        >
          <RefreshCw className="w-3 h-3" /> Retry
        </button>
      </div>
    );
  }

  if (holdings.length === 0) {
    return <Empty msg="No assets found for this wallet on this network" />;
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Stats header */}
      <div className="flex items-center gap-6 px-3 py-2 border-b border-[#141414] shrink-0">
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

      {/* Portfolio chart */}
      {address && (
        <div className="border-b border-[#141414] shrink-0 bg-[#0a0a0a]">
          <PortfolioChart address={address} network={network} />
        </div>
      )}

      {/* Scrollable holdings table */}
      <div className="flex-1 overflow-auto">
      <table className="w-full min-w-[600px]">
        <thead className="sticky top-0 bg-[#0a0a0a]">
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
    </div>
  );
}

function TxHistoryView() {
  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full min-w-[600px]">
        <thead className="sticky top-0 bg-[#0a0a0a]">
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

function PredictionsView() {
  return <Empty msg="No active predictions" />;
}

export function BottomPanel() {
  const [activeTab, setActiveTab] = useState<BottomTab>("Positions");
  const totalPnl = MOCK_POSITIONS.reduce((s, p) => s + p.unrealizedPnl, 0);

  const { primaryWallet } = useDynamicContext();
  const network = useConnectedNetwork();
  const address = primaryWallet?.address ?? null;
  const portfolio = useCoinStatsPortfolio(address, network);

  function renderContent() {
    switch (activeTab) {
      case "Open Orders":         return <OpenOrdersView />;
      case "Positions":           return <PositionsView />;
      case "Predictions":         return <PredictionsView />;
      case "Assets":              return (
        <AssetsView
          holdings={portfolio.holdings}
          summary={portfolio.summary}
          loading={portfolio.loading}
          syncing={portfolio.syncing}
          error={portfolio.error}
          refetch={portfolio.refetch}
          hasWallet={!!primaryWallet}
          address={address}
          network={network}
        />
      );
      case "Order History":       return <OrderHistoryView />;
      case "Trade History":       return <TradeHistoryView />;
      case "Transaction History": return <TxHistoryView />;
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
            {tab === "Open Orders" && (
              <span className="ml-1 text-[10px] bg-[#f5c518]/20 text-[#f5c518] px-1 rounded-full">{MOCK_ORDERS.length}</span>
            )}
            {tab === "Positions" && (
              <span className="ml-1 text-[10px] bg-[#00c853]/20 text-[#00c853] px-1 rounded-full">{MOCK_POSITIONS.length}</span>
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
          {activeTab !== "Assets" && (
            <span className="text-[12px] text-[#555]">
              Unrealized PnL:
              <span className={`ml-1 font-mono font-bold ${totalPnl >= 0 ? "text-[#00c853]" : "text-[#ff1744]"}`}>
                {totalPnl >= 0 ? "+" : ""}{totalPnl.toFixed(2)} USDT
              </span>
            </span>
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
