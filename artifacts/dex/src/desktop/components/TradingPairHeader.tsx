import { useEffect, useRef, useState } from "react";
import { LiveMarketState } from "@/hooks/useLiveMarket";
import { PairSelectorPanel } from "./PairSelectorPanel";
import { useStore } from "@/stores/useStore";
import { usePairs } from "@/hooks/usePairs";

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

function symbolColor(symbol: string): string {
  const palette = [
    "#f7931a","#627eea","#9945ff","#f3ba2f","#00aae4",
    "#4caf50","#ff6b35","#e84142","#2a5ada","#8b5cf6",
  ];
  let h = 0;
  for (let i = 0; i < symbol.length; i++) h = (h * 31 + symbol.charCodeAt(i)) & 0x7fffffff;
  return palette[h % palette.length];
}

function chainLabel(network?: string): string {
  if (!network) return "BSC";
  if (network === "bsc") return "BSC";
  if (network === "base") return "Base";
  if (network === "solana") return "Solana";
  return network.charAt(0).toUpperCase() + network.slice(1);
}

export function TradingPairHeader({ market }: Props) {
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelPos, setPanelPos]   = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);

  usePairs();
  const pairs         = useStore((s) => s.pairs);
  const selectedPair  = useStore((s) => s.selectedPair);
  const setSelectedPair = useStore((s) => s.setSelectedPair);

  // Initialize selectedPair to first pair once pairs load
  useEffect(() => {
    if (!selectedPair && pairs.length > 0) {
      setSelectedPair(pairs[0]);
    }
  }, [pairs, selectedPair, setSelectedPair]);

  const activePair = selectedPair ?? pairs[0] ?? null;

  const baseSymbol    = activePair?.baseToken?.symbol  ?? "—";
  const quoteSymbol   = activePair?.quoteToken?.symbol ?? "—";
  const displaySymbol = `${baseSymbol}${quoteSymbol}`;
  const baseName      = activePair?.baseToken?.name ?? baseSymbol;
  const baseLogo      = activePair?.baseToken?.logo ?? "";
  const network       = chainLabel(activePair?.network);
  const tokenColor    = symbolColor(baseSymbol);

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
      <div className="flex items-center h-[52px] px-4 border-b border-[#1a1a1a] bg-[#000000] shrink-0 gap-5 whitespace-nowrap overflow-x-auto">

        {/* Pair selector trigger */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 overflow-hidden"
            style={{ backgroundColor: tokenColor + "22" }}
          >
            {baseLogo ? (
              <img
                src={baseLogo}
                alt={baseSymbol}
                className="w-6 h-6 rounded-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            ) : (
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                style={{ backgroundColor: tokenColor }}
              >
                {baseSymbol.charAt(0)}
              </div>
            )}
          </div>
          <div className="flex flex-col justify-center leading-none gap-0.5">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-[15px] text-white">{displaySymbol}</span>
              <span className="text-[10px] bg-[#f5c518]/10 text-[#f5c518] px-1 py-0.5 rounded font-semibold">{network}</span>
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
            <span className="text-[11px] text-[#555]">{baseName}</span>
          </div>
        </div>

        {/* Live price */}
        <div className="flex flex-col justify-center leading-none shrink-0 gap-0.5">
          <span className="text-[20px] font-bold font-mono tabular-nums" style={{ color: priceColor }}>
            {market.price > 0
              ? market.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 6 })
              : "—"}
          </span>
          <span className="text-[12px] font-mono tabular-nums" style={{ color: changeColor }}>
            {market.change24h >= 0 ? "+" : ""}{changePct}%
          </span>
        </div>

        <Stat label="24h High" value={
          activePair?.priceHigh24h
            ? activePair.priceHigh24h.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 6 })
            : market.price > 0
            ? (market.price * 1.018).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            : "—"
        } color="#00c853" />
        <Stat label="24h Low" value={
          activePair?.priceLow24h
            ? activePair.priceLow24h.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 6 })
            : market.price > 0
            ? (market.price * 0.983).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            : "—"
        } color="#ff1744" />
        <Stat label="24h Volume" value={fmtVolume(activePair?.volume24hUSD ?? activePair?.volume24h ?? market.volume24h)} />
        <Stat label="Liquidity" value={
          activePair?.liquidityUSD
            ? "$" + fmtVolume(activePair.liquidityUSD)
            : "$—"
        } />
      </div>

      {panelOpen && (
        <PairSelectorPanel
          top={panelPos.top}
          left={panelPos.left}
          onClose={() => setPanelOpen(false)}
          onSelect={(sym, pairId) => {
            const pair = pairs.find((p) => p.id === pairId) ?? null;
            if (pair) setSelectedPair(pair);
            setPanelOpen(false);
          }}
          currentSymbol={activePair ? `${activePair.baseToken?.symbol}/${activePair.quoteToken?.symbol}` : ""}
        />
      )}
    </>
  );
}
