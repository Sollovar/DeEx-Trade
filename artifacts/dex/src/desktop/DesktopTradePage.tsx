import { useRef, useEffect } from "react";
import { useLiveMarket } from "@/hooks/useLiveMarket";
import { useStore } from "@/stores/useStore";
import { TopNav } from "./components/TopNav";
import { TradingPairHeader } from "./components/TradingPairHeader";
import { CandlestickChart } from "./components/CandlestickChart";
import { OrderBook } from "./components/OrderBook";
import { OrderEntryPanel } from "./components/OrderEntryPanel";
import { TickerBar } from "./components/TickerBar";
import { BottomPanel } from "./components/BottomPanel";

const CHART_H = "calc(100vh - 142px)";
const SCROLL_STEP = 120;

export function DesktopTradePage() {
  const market = useLiveMarket();
  const activePairId = useStore((s) => s.selectedPair?.id);
  const chartScrollRef = useRef<HTMLDivElement>(null);
  const orderEntryScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        chartScrollRef.current?.scrollBy({ top: SCROLL_STEP, behavior: "smooth" });
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        chartScrollRef.current?.scrollBy({ top: -SCROLL_STEP, behavior: "smooth" });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden text-sm text-white select-none" style={{ background: "#0d0d0d" }}>
      <TopNav />
      <TradingPairHeader market={market} />

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
          <div ref={chartScrollRef} className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
            <div style={{ height: CHART_H, minHeight: 400, flexShrink: 0 }}>
              <CandlestickChart livePrice={market.price} pairId={activePairId} />
            </div>
            <div style={{ minHeight: 220, flexShrink: 0 }}>
              <BottomPanel />
            </div>
          </div>
        </div>

        {/* MIDDLE: order book card */}
        <div
          className="flex flex-col overflow-hidden shrink-0"
          style={{
            width: 272,
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
          ref={orderEntryScrollRef}
          className="flex flex-col overflow-y-auto no-scrollbar shrink-0"
          style={{
            width: 272,
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
