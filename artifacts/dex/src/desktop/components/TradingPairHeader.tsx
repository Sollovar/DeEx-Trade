import { useState, useRef } from "react";
import { LiveMarketState } from "@/hooks/useLiveMarket";
import { PairSelectorPanel } from "./PairSelectorPanel";

interface Props {
  market: LiveMarketState;
}

function fmtVolume(n: number) {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(3) + "B";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(3) + "M";
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex flex-col justify-center leading-none shrink-0 gap-0.5">
      <span className="text-[11px] text-[#555]">{label}</span>
      <span className="text-[13px] font-mono tabular-nums font-medium" style={{ color: color ?? "#ccc" }}>{value}</span>
    </div>
  );
}

export function TradingPairHeader({ market }: Props) {
  const [panelOpen, setPanelOpen] = useState(false);
  const [currentSymbol, setCurrentSymbol] = useState("BTC/USDT");
  const [panelPos, setPanelPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);

  const priceUp    = market.price >= market.prevPrice;
  const priceColor = priceUp ? "#00c853" : "#ff1744";
  const changePct  = (market.change24h * 100).toFixed(2);
  const changeColor = market.change24h >= 0 ? "#00c853" : "#ff1744";

  function handleToggle() {
    if (!panelOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPanelPos({ top: rect.bottom + 4, left: rect.left });
    }
    setPanelOpen((v) => !v);
  }

  return (
    <>
      <div className="flex items-center h-[52px] px-4 border-b border-[#1a1a1a] bg-[#0e0e0e] shrink-0 gap-5 whitespace-nowrap overflow-x-auto">

        {/* Pair selector */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-full bg-[#f7931a]/20 flex items-center justify-center shrink-0">
            <div className="w-5 h-5 rounded-full bg-[#f7931a] flex items-center justify-center text-white text-[10px] font-bold">B</div>
          </div>
          <div className="flex flex-col justify-center leading-none gap-0.5">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-[15px] text-white">{currentSymbol.replace("/", "")}</span>
              <span className="text-[10px] bg-[#f5c518]/10 text-[#f5c518] px-1 py-0.5 rounded font-semibold">BSC</span>
              <button
                ref={triggerRef}
                onClick={handleToggle}
                className={`w-5 h-5 flex items-center justify-center rounded transition-colors hover:bg-[#1e1e1e] ${panelOpen ? "bg-[#1e1e1e] text-white" : "text-[#555] hover:text-white"}`}
                data-testid="pair-selector-toggle"
              >
                <svg width="10" height="6" viewBox="0 0 10 6" fill="currentColor"
                  style={{ transform: panelOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>
                  <path d="M0 0.5L5 5.5L10 0.5H0Z" />
                </svg>
              </button>
            </div>
            <span className="text-[11px] text-[#555]">Bitcoin</span>
          </div>
        </div>

        {/* Live price */}
        <div className="flex flex-col justify-center leading-none shrink-0 gap-0.5">
          <span className="text-[20px] font-bold font-mono tabular-nums" style={{ color: priceColor }}>
            {market.price.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
          </span>
          <span className="text-[12px] font-mono tabular-nums" style={{ color: changeColor }}>
            {market.change24h >= 0 ? "+" : ""}{changePct}%
          </span>
        </div>

        <div className="w-px h-8 bg-[#1e1e1e] shrink-0" />

        <Stat label="24h High" value={(market.price * 1.018).toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} color="#00c853" />
        <div className="w-px h-8 bg-[#1e1e1e] shrink-0" />
        <Stat label="24h Low" value={(market.price * 0.983).toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} color="#ff1744" />
        <div className="w-px h-8 bg-[#1e1e1e] shrink-0" />
        <Stat label="24h Volume (USDT)" value={fmtVolume(market.volume24h)} />
        <div className="w-px h-8 bg-[#1e1e1e] shrink-0" />
        <Stat label="Liquidity" value="$1.003B" />
      </div>

      {panelOpen && (
        <PairSelectorPanel
          top={panelPos.top}
          left={panelPos.left}
          onClose={() => setPanelOpen(false)}
          onSelect={(sym) => setCurrentSymbol(sym)}
          currentSymbol={currentSymbol}
        />
      )}
    </>
  );
}
