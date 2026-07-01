import { useLiveMarket } from "@/hooks/useLiveMarket";
import { useStore } from "@/stores/useStore";
import { TopNav } from "./components/TopNav";
import { TradingPairHeader } from "./components/TradingPairHeader";
import { CandlestickChart } from "./components/CandlestickChart";
import { OrderBook } from "./components/OrderBook";
import { OrderEntryPanel } from "./components/OrderEntryPanel";
import { TickerBar } from "./components/TickerBar";
import { BottomPanel } from "./components/BottomPanel";

// TopNav(44) + PairHeader(52) + TickerBar(28) + vertical padding(16) + card borders(2)
const CHART_H = "calc(100vh - 142px)";

export function DesktopTradePage() {
  const market = useLiveMarket();
  const activePairId = useStore((s) => s.selectedPair?.id);

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden text-sm text-white select-none" style={{ background: "#0d0d0d" }}>
      <TopNav />
      <TradingPairHeader market={market} />

      {/* Main trading area — padded with gap between cards */}
      <div className="flex-1 min-h-0 flex gap-2 p-2 overflow-hidden">

        {/* LEFT: chart card */}
        <div
          className="flex flex-col flex-1 min-w-0 overflow-hidden"
          style={{
            background: "#000000",
            borderRadius: 12,
            border: "1px solid #1e1e1e",
            boxShadow: "0 2px 16px rgba(0,0,0,0.8)",
          }}
        >
          <div className="flex-1 min-h-0 overflow-y-auto">
            {/* Chart fills the visible screen height */}
            <div style={{ height: CHART_H, minHeight: 400, flexShrink: 0 }}>
              <CandlestickChart livePrice={market.price} pairId={activePairId} />
            </div>
            {/* Open Orders / Order History scrolls into view below */}
            <div style={{ minHeight: 220, flexShrink: 0 }}>
              <BottomPanel />
            </div>
          </div>
        </div>

        {/* MIDDLE: order book card */}
        <div
          className="flex flex-col overflow-hidden shrink-0"
          style={{
            width: 300,
            background: "#000000",
            borderRadius: 12,
            border: "1px solid #1e1e1e",
            boxShadow: "0 2px 16px rgba(0,0,0,0.8)",
          }}
        >
          <OrderBook market={market} />
        </div>

        {/* RIGHT: order entry card */}
        <div
          className="flex flex-col overflow-y-auto shrink-0"
          style={{
            width: 268,
            background: "#000000",
            borderRadius: 12,
            border: "1px solid #1e1e1e",
            boxShadow: "0 2px 16px rgba(0,0,0,0.8)",
          }}
        >
          <OrderEntryPanel market={market} symbol="BTCUSDT" />
        </div>

      </div>

      <TickerBar market={market} />
    </div>
  );
}
