import { useState, useRef, useEffect } from "react";
import { Star, Search, X } from "lucide-react";

interface Pair {
  symbol: string;
  base: string;
  chain: string;
  lastPrice: number;
  change24h: number;
  volume: number;
  marketCap: number;
  color: string;
  letter: string;
  starred: boolean;
}

const INITIAL_PAIRS: Pair[] = [
  { symbol: "BTC/USDT", base: "BTC", chain: "BSC",     lastPrice: 61206.2,   change24h: -0.77, volume: 1012394618, marketCap: 1210000000000, color: "#f7931a", letter: "₿", starred: true  },
  { symbol: "ETH/USDT", base: "ETH", chain: "Base",    lastPrice: 1617.86,   change24h: -1.77, volume: 554611662,  marketCap: 388000000000,  color: "#627eea", letter: "Ξ", starred: false },
  { symbol: "BNB/USDT", base: "BNB", chain: "BSC",     lastPrice: 585.45,    change24h: -1.61, volume: 22620158,   marketCap: 87000000000,   color: "#f3ba2f", letter: "B", starred: false },
  { symbol: "SOL/USDT", base: "SOL", chain: "Solana",  lastPrice: 62.84,     change24h: -3.56, volume: 87236575,   marketCap: 92000000000,   color: "#9945ff", letter: "S", starred: true  },
  { symbol: "XRP/USDT", base: "XRP", chain: "BSC",     lastPrice: 1.0954,    change24h: -3.79, volume: 17568366,   marketCap: 60000000000,   color: "#00aae4", letter: "X", starred: false },
  { symbol: "DOGE/USDT",base: "DOGE",chain: "BSC",     lastPrice: 0.08242,   change24h: -3.01, volume: 13702600,   marketCap: 11800000000,   color: "#c2a633", letter: "D", starred: false },
  { symbol: "AVAX/USDT",base: "AVAX",chain: "Base",    lastPrice: 17.64,     change24h: -4.12, volume: 8921043,    marketCap: 7200000000,    color: "#e84142", letter: "A", starred: false },
  { symbol: "LINK/USDT",base: "LINK",chain: "BSC",     lastPrice: 10.42,     change24h: -2.44, volume: 5632100,    marketCap: 6400000000,    color: "#2a5ada", letter: "L", starred: false },
  { symbol: "ARB/USDT", base: "ARB", chain: "Base",    lastPrice: 0.3812,    change24h: -5.21, volume: 3102455,    marketCap: 1500000000,    color: "#28a0f0", letter: "A", starred: false },
  { symbol: "OP/USDT",  base: "OP",  chain: "Base",    lastPrice: 0.7141,    change24h: -4.98, volume: 2841230,    marketCap: 880000000,     color: "#ff0420", letter: "O", starred: false },
  { symbol: "SUI/USDT", base: "SUI", chain: "Solana",  lastPrice: 2.814,     change24h: -2.11, volume: 6312000,    marketCap: 7100000000,    color: "#4da2ff", letter: "S", starred: false },
  { symbol: "PEPE/USDT",base: "PEPE",chain: "BSC",     lastPrice: 0.0000089, change24h: -6.43, volume: 4512300,    marketCap: 3700000000,    color: "#4caf50", letter: "P", starred: false },
  { symbol: "WIF/USDT", base: "WIF", chain: "Solana",  lastPrice: 0.8321,    change24h: -7.12, volume: 2310000,    marketCap: 830000000,     color: "#ff6b35", letter: "W", starred: false },
  { symbol: "JUP/USDT", base: "JUP", chain: "Solana",  lastPrice: 0.4512,    change24h: -4.55, volume: 1980000,    marketCap: 620000000,     color: "#7b61ff", letter: "J", starred: false },
  { symbol: "TIA/USDT", base: "TIA", chain: "Base",    lastPrice: 3.241,     change24h: -3.87, volume: 3210000,    marketCap: 1200000000,    color: "#8b5cf6", letter: "T", starred: false },
];

const CATEGORY_TABS = ["All markets", "Top", "New", "Meme", "AI", "Pre-launch", "Stocks", "Commodities", "ETF", "Semiconductor", "Listing Vote"];

type MarketTab = "Favorites" | "Futures" | "Spot" | "Prediction";

function fmtNum(n: number) {
  if (n >= 1_000_000_000) return "$" + (n / 1_000_000_000).toFixed(3) + "B";
  if (n >= 1_000_000)     return "$" + (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000)         return "$" + (n / 1_000).toFixed(1) + "K";
  return "$" + n.toFixed(4);
}

function fmtPrice(p: number) {
  if (p < 0.0001) return p.toFixed(7);
  if (p < 1)      return p.toFixed(4);
  if (p < 100)    return p.toFixed(2);
  return p.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

interface Props {
  top: number;
  left: number;
  onClose: () => void;
  onSelect: (symbol: string) => void;
  currentSymbol: string;
}

export function PairSelectorPanel({ top, left, onClose, onSelect, currentSymbol }: Props) {
  const [query, setQuery]           = useState("");
  const [marketTab, setMarketTab]   = useState<MarketTab>("Futures");
  const [categoryTab, setCategoryTab] = useState("All markets");
  const [pairs, setPairs]           = useState<Pair[]>(INITIAL_PAIRS);
  const inputRef  = useRef<HTMLInputElement>(null);
  const panelRef  = useRef<HTMLDivElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [onClose]);

  const filtered = pairs.filter((p) =>
    p.symbol.toLowerCase().includes(query.toLowerCase()) ||
    p.base.toLowerCase().includes(query.toLowerCase())
  );
  const displayed = marketTab === "Favorites" ? filtered.filter((p) => p.starred) : filtered;

  function toggleStar(e: React.MouseEvent, symbol: string) {
    e.stopPropagation();
    setPairs((prev) => prev.map((p) => p.symbol === symbol ? { ...p, starred: !p.starred } : p));
  }

  return (
    <div
      ref={panelRef}
      data-testid="pair-selector-panel"
      style={{
        position: "fixed",
        top,
        left,
        width: 700,
        maxHeight: 500,
        zIndex: 9999,
      }}
      className="bg-[#0e0e0e] border border-[#252525] shadow-2xl shadow-black/90 flex flex-col"
    >
      {/* Search */}
      <div className="flex items-center gap-2 px-3 h-[38px] border-b border-[#1a1a1a] shrink-0">
        <Search className="w-3.5 h-3.5 text-[#444] shrink-0" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search"
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
        {displayed.length === 0 && (
          <div className="flex items-center justify-center py-8 text-[#333] text-xs">No pairs found</div>
        )}
        {displayed.map((pair) => {
          const isSelected = pair.symbol === currentSymbol;
          return (
            <div
              key={pair.symbol}
              onClick={() => { onSelect(pair.symbol); onClose(); }}
              data-testid={`pair-row-${pair.base}`}
              className={`grid items-center px-3 cursor-pointer transition-colors hover:bg-[#151515] border-b border-[#111] ${
                isSelected ? "bg-[#151515]" : ""
              }`}
              style={{ gridTemplateColumns: "200px 1fr 1fr 1.1fr 1.2fr", minHeight: "42px" }}
            >
              {/* Symbol */}
              <div className="flex items-center gap-2 min-w-0">
                <button
                  onClick={(e) => toggleStar(e, pair.symbol)}
                  className={`shrink-0 transition-colors ${pair.starred ? "text-[#f5c518]" : "text-[#2a2a2a] hover:text-[#555]"}`}
                >
                  <Star className="w-3.5 h-3.5" fill={pair.starred ? "#f5c518" : "none"} />
                </button>
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                  style={{ backgroundColor: pair.color + "22", color: pair.color }}
                >
                  {pair.letter}
                </div>
                <div className="flex flex-col leading-none min-w-0">
                  <span className="text-white font-semibold text-[12px]">{pair.symbol.replace("/", "")}</span>
                  <span className="text-[#3a3a3a] text-[10px] mt-0.5">{pair.chain}</span>
                </div>
              </div>

              {/* Last price */}
              <div className="text-right font-mono tabular-nums text-[#ccc] text-[12px]">
                {fmtPrice(pair.lastPrice)}
              </div>

              {/* 24h change */}
              <div
                className="text-right font-mono tabular-nums font-semibold text-[12px]"
                style={{ color: pair.change24h >= 0 ? "#00c853" : "#ff1744" }}
              >
                {pair.change24h >= 0 ? "+" : ""}{pair.change24h.toFixed(2)}%
              </div>

              {/* Volume */}
              <div className="text-right font-mono tabular-nums text-[#555] text-[11px]">
                {fmtNum(pair.volume)}
              </div>

              {/* Market cap */}
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
