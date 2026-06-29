import { useLiveMarket } from "@/hooks/useLiveMarket";
import { useStore } from "@/stores/useStore";
import { TopNav } from "./components/TopNav";
import { TradingPairHeader } from "./components/TradingPairHeader";
import { CandlestickChart } from "./components/CandlestickChart";
import { OrderBook } from "./components/OrderBook";
import { OrderEntryPanel } from "./components/OrderEntryPanel";
import { TickerBar } from "./components/TickerBar";
import { BottomPanel } from "./components/BottomPanel";

export function DesktopTradePage() {
  const market = useLiveMarket();
  const activePairId = useStore((s) => s.selectedPair?.id);

  return (
    <div className="h-screen w-full bg-[#0a0a0a] flex flex-col overflow-hidden text-sm text-white select-none">
      <TopNav />
      <TradingPairHeader market={market} />

      {/* Main trading area — three columns, each independently scrollable/sized */}
      <div className="flex-1 min-h-0 flex overflow-hidden">

        {/* LEFT: chart on top, bottom panel underneath — both live inside this column */}
        <div className="flex flex-col flex-1 min-w-0 border-r border-[#1a1a1a] overflow-hidden">
          {/* Chart takes all remaining height above the bottom panel */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <CandlestickChart livePrice={market.price} pairId={activePairId} />
          </div>
          {/* Bottom panel — fixed height, only shrinks the chart, not order book */}
          <div className="shrink-0 overflow-hidden" style={{ height: 160 }}>
            <BottomPanel />
          </div>
        </div>

        {/* MIDDLE: order book — full height, unaffected by bottom panel */}
        <div className="flex flex-col border-r border-[#1a1a1a] overflow-hidden shrink-0" style={{ width: 260 }}>
          <OrderBook market={market} />
        </div>

        {/* RIGHT: order entry — full height, unaffected by bottom panel */}
        <div className="flex flex-col overflow-y-auto shrink-0" style={{ width: 280 }}>
          <OrderEntryPanel market={market} symbol="BTCUSDT" />
        </div>

      </div>

      <TickerBar market={market} />
    </div>
  );
}
