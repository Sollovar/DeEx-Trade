import { useState, useRef, useEffect, useMemo } from "react";
import { Star, Search, X, Loader2 } from "lucide-react";
import { usePairs } from "@/hooks/usePairs";
import type { Pair as APIPair } from "@/types";

interface DisplayPair {
  id: string;
  symbol: string;
  base: string;
  quote: string;
  chain: string;
  lastPrice: number;
  change24h: number;
  volume: number;
  marketCap: number;
  color: string;
  logo: string;
  starred: boolean;
  poolAddress: string;
  baseAddress: string;
  quoteAddress: string;
}

function symbolColor(symbol: string): string {
  const palette = [
    "#f7931a","#627eea","#9945ff","#f3ba2f","#00aae4",
    "#4caf50","#ff6b35","#e84142","#2a5ada","#8b5cf6",
    "#7b61ff","#ff0420","#28a0f0","#4da2ff","#c2a633",
  ];
  let h = 0;
  for (let i = 0; i < symbol.length; i++) h = (h * 31 + symbol.charCodeAt(i)) & 0x7fffffff;
  return palette[h % palette.length];
}

function chainLabel(network?: string): string {
  if (!network) return "—";
  if (network === "bsc") return "BSC";
  if (network === "base") return "Base";
  if (network === "solana") return "Solana";
  return network.charAt(0).toUpperCase() + network.slice(1);
}

function apiPairToDisplay(p: APIPair, starred: boolean): DisplayPair {
  const base = p.baseToken?.symbol || "?";
  const quote = p.quoteToken?.symbol || "?";
  return {
    id: p.id,
    symbol: `${base}/${quote}`,
    base,
    quote,
    chain: chainLabel(p.network),
    lastPrice: p.priceUSD ?? p.price ?? 0,
    change24h: p.priceChange24h ?? 0,
    volume: p.volume24hUSD ?? p.volume24h ?? 0,
    marketCap: p.marketCapUSD ?? p.marketCap ?? 0,
    color: symbolColor(base),
    logo: p.baseToken?.logo || "",
    starred,
    poolAddress: (p.pairAddress ?? "").toLowerCase(),
    baseAddress: (p.baseToken?.address ?? "").toLowerCase(),
    quoteAddress: (p.quoteToken?.address ?? "").toLowerCase(),
  };
}

function fmtNum(n: number) {
  if (n >= 1_000_000_000) return "$" + (n / 1_000_000_000).toFixed(2) + "B";
  if (n >= 1_000_000)     return "$" + (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000)         return "$" + (n / 1_000).toFixed(1) + "K";
  if (n === 0)            return "—";
  return "$" + n.toFixed(4);
}

function fmtPrice(p: number) {
  if (p === 0)    return "—";
  if (p < 0.0001) return p.toExponential(2);
  if (p < 1)      return p.toFixed(6);
  if (p < 100)    return p.toFixed(4);
  return p.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const CATEGORY_TABS = ["All markets", "Top", "New", "Meme", "AI", "Pre-launch"];
type MarketTab = "Favorites" | "Futures" | "Spot" | "Prediction";

interface Props {
  top: number;
  left: number;
  onClose: () => void;
  onSelect: (symbol: string, pairId: string) => void;
  currentSymbol: string;
}

export function PairSelectorPanel({ top, left, onClose, onSelect, currentSymbol }: Props) {
  const [query, setQuery]           = useState("");
  const [marketTab, setMarketTab]   = useState<MarketTab>("Futures");
  const [categoryTab, setCategoryTab] = useState("All markets");
  const [starred, setStarred]       = useState<Set<string>>(new Set());
  const inputRef  = useRef<HTMLInputElement>(null);
  const panelRef  = useRef<HTMLDivElement>(null);

  const { pairs: apiPairs, loading } = usePairs();

  const displayPairs = useMemo<DisplayPair[]>(() =>
    apiPairs.map((p) => apiPairToDisplay(p, starred.has(p.id))),
    [apiPairs, starred],
  );

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [onClose]);

  const q = query.toLowerCase();
  const filtered = displayPairs.filter((p) =>
    p.symbol.toLowerCase().includes(q) ||
    p.base.toLowerCase().includes(q) ||
    p.poolAddress.includes(q) ||
    p.baseAddress.includes(q) ||
    p.quoteAddress.includes(q)
  );
  const displayed = marketTab === "Favorites" ? filtered.filter((p) => p.starred) : filtered;

  function toggleStar(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    setStarred((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <div
      ref={panelRef}
      data-testid="pair-selector-panel"
      style={{ position: "fixed", top, left, width: 700, maxHeight: 500, zIndex: 9999 }}
      className="bg-[#0e0e0e] border border-[#252525] shadow-2xl shadow-black/90 flex flex-col"
    >
      {/* Search */}
      <div className="flex items-center gap-2 px-3 h-[38px] border-b border-[#1a1a1a] shrink-0">
        <Search className="w-3.5 h-3.5 text-[#444] shrink-0" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search pair or token"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 bg-transparent outline-none text-[13px] text-white placeholder:text-[#333]"
        />
        {query && (
          <button onClick={() => setQuery("")} className="text-[#444] hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Market type tabs */}
      <div className="flex items-center border-b border-[#1a1a1a] shrink-0 px-1">
        {(["Favorites", "Futures", "Spot", "Prediction"] as MarketTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setMarketTab(t)}
            className={`px-3 py-2.5 text-[12px] font-medium flex items-center gap-1.5 relative transition-colors ${
              marketTab === t
                ? "text-white after:absolute after:bottom-0 after:left-2 after:right-2 after:h-[2px] after:bg-[#f5c518] after:content-['']"
                : "text-[#555] hover:text-[#aaa]"
            }`}
          >
            {t}
            {t === "Prediction" && <span className="w-1.5 h-1.5 rounded-full bg-[#ff1744] shrink-0" />}
          </button>
        ))}
      </div>

      {/* Category chips */}
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-[#1a1a1a] overflow-x-auto shrink-0" style={{ scrollbarWidth: "none" }}>
        {CATEGORY_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setCategoryTab(tab)}
            className={`px-2.5 py-1 text-[11px] rounded shrink-0 transition-colors ${
              categoryTab === tab
                ? "bg-[#f5c518]/15 text-[#f5c518] font-semibold"
                : "text-[#555] hover:text-[#bbb] hover:bg-[#181818]"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Column headers */}
      <div
        className="grid items-center px-3 py-1.5 text-[10px] text-[#444] border-b border-[#141414] shrink-0"
        style={{ gridTemplateColumns: "200px 1fr 1fr 1.1fr 1.2fr" }}
      >
        <span>Symbols</span>
        <span className="text-right">Last price</span>
        <span className="text-right">24h change</span>
        <span className="text-right">Volume</span>
        <span className="text-right">Market Cap</span>
      </div>

      {/* Rows */}
      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: "#222 transparent" }}>
        {loading && (
          <div className="flex items-center justify-center gap-2 py-8 text-[#444] text-xs">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Loading pairs…
          </div>
        )}
        {!loading && displayed.length === 0 && (
          <div className="flex items-center justify-center py-8 text-[#333] text-xs">No pairs found</div>
        )}
        {displayed.map((pair) => {
          const isSelected = pair.symbol === currentSymbol;
          return (
            <div
              key={pair.id}
              onClick={() => { onSelect(pair.symbol, pair.id); onClose(); }}
              data-testid={`pair-row-${pair.base}`}
              className={`grid items-center px-3 cursor-pointer transition-colors hover:bg-[#151515] border-b border-[#111] ${
                isSelected ? "bg-[#151515]" : ""
              }`}
              style={{ gridTemplateColumns: "200px 1fr 1fr 1.1fr 1.2fr", minHeight: "42px" }}
            >
              {/* Symbol */}
              <div className="flex items-center gap-2 min-w-0">
                <button
                  onClick={(e) => toggleStar(e, pair.id)}
                  className={`shrink-0 transition-colors ${pair.starred ? "text-[#f5c518]" : "text-[#2a2a2a] hover:text-[#555]"}`}
                >
                  <Star className="w-3.5 h-3.5" fill={pair.starred ? "#f5c518" : "none"} />
                </button>
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 overflow-hidden"
                  style={{ backgroundColor: pair.color + "22" }}
                >
                  {pair.logo ? (
                    <img src={pair.logo} alt={pair.base} className="w-5 h-5 rounded-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  ) : (
                    <span className="text-[10px] font-bold" style={{ color: pair.color }}>
                      {pair.base.charAt(0)}
                    </span>
                  )}
                </div>
                <div className="flex flex-col leading-none min-w-0">
                  <span className="text-white font-semibold text-[12px]">{pair.symbol.replace("/", "")}</span>
                  <span className="text-[#3a3a3a] text-[10px] mt-0.5">{pair.chain}</span>
                </div>
              </div>

              <div className="text-right font-mono tabular-nums text-[#ccc] text-[12px]">
                {fmtPrice(pair.lastPrice)}
              </div>

              <div
                className="text-right font-mono tabular-nums font-semibold text-[12px]"
                style={{ color: pair.change24h >= 0 ? "#00c853" : "#ff1744" }}
              >
                {pair.change24h >= 0 ? "+" : ""}{pair.change24h.toFixed(2)}%
              </div>

              <div className="text-right font-mono tabular-nums text-[#555] text-[11px]">
                {fmtNum(pair.volume)}
              </div>

              <div className="text-right font-mono tabular-nums text-[#555] text-[11px]">
                {fmtNum(pair.marketCap)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
