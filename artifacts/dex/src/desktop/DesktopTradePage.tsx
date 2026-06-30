import { useLiveMarket } from "@/hooks/useLiveMarket";
import { useStore } from "@/stores/useStore";
import { TopNav } from "./components/TopNav";
import { TradingPairHeader } from "./components/TradingPairHeader";
import { CandlestickChart } from "./components/CandlestickChart";
import { OrderBook } from "./components/OrderBook";
import { OrderEntryPanel } from "./components/OrderEntryPanel";
import { TickerBar } from "./components/TickerBar";
import { BottomPanel } from "./components/BottomPanel";

const HEADER_HEIGHT = 44 + 52 + 28; // TopNav + PairHeader + TickerBar

export function DesktopTradePage() {
  const market = useLiveMarket();
  const activePairId = useStore((s) => s.selectedPair?.id);

  return (
    <div className="h-screen w-full bg-[#000000] flex flex-col overflow-hidden text-sm text-white select-none">
      <TopNav />
      <TradingPairHeader market={market} />

      {/* Main trading area */}
      <div className="flex-1 min-h-0 flex overflow-hidden">

        {/* LEFT: chart fills the visible viewport height, bottom panel scrolls below */}
        <div className="flex flex-col flex-1 min-w-0 border-r border-[#1a1a1a] overflow-hidden">
          <div className="flex-1 min-h-0 overflow-y-auto">
            {/* Chart — exactly fills the visible area */}
            <div style={{ height: `calc(100vh - ${HEADER_HEIGHT}px)`, minHeight: 400, flexShrink: 0 }}>
              <CandlestickChart livePrice={market.price} pairId={activePairId} />
            </div>
            {/* Bottom panel — scrolls into view below the chart */}
            <div style={{ minHeight: 220, flexShrink: 0 }}>
              <BottomPanel />
            </div>
          </div>
        </div>

        {/* MIDDLE: order book — wider for better readability */}
        <div className="flex flex-col border-r border-[#1a1a1a] overflow-hidden shrink-0" style={{ width: 300 }}>
          <OrderBook market={market} />
        </div>

        {/* RIGHT: order entry */}
        <div className="flex flex-col overflow-y-auto shrink-0" style={{ width: 260 }}>
          <OrderEntryPanel market={market} symbol="BTCUSDT" />
        </div>

      </div>

      <TickerBar market={market} />
    </div>
  );
}
