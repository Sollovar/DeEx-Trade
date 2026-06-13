import { useState, useRef, useEffect } from "react";
import { Star, Search, X, Loader2 } from "lucide-react";
import { usePairs, type NormalizedPair } from "@/hooks/usePairs";

const CATEGORY_TABS = ["All markets", "Top", "New", "Meme", "AI"];

type MarketTab = "Favorites" | "Futures" | "Spot" | "Prediction";

function fmtNum(n: number) {
  if (n >= 1_000_000_000) return "$" + (n / 1_000_000_000).toFixed(2) + "B";
  if (n >= 1_000_000)     return "$" + (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000)         return "$" + (n / 1_000).toFixed(1) + "K";
  return "$" + n.toFixed(4);
}

function fmtPrice(p: number) {
  if (p < 0.0001) return p.toFixed(7);
  if (p < 1)      return p.toFixed(4);
  if (p < 100)    return p.toFixed(2);
  return p.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function TokenIcon({ pair, size = 28 }: { pair: NormalizedPair; size?: number }) {
  const [imgErr, setImgErr] = useState(false);
  if (pair.logo && !imgErr) {
    return (
      <img
        src={pair.logo}
        alt={pair.base}
        width={size}
        height={size}
        onError={() => setImgErr(true)}
        style={{ borderRadius: "50%", width: size, height: size, objectFit: "cover", flexShrink: 0 }}
      />
    );
  }
  return (
    <div
      style={{
        width: size, height: size, borderRadius: "50%",
        backgroundColor: pair.color + "22", color: pair.color,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 10, fontWeight: 700, flexShrink: 0,
      }}
    >
      {pair.letter}
    </div>
  );
}

interface Props {
  top: number;
  left: number;
  onClose: () => void;
  onSelect: (symbol: string, pairId?: string) => void;
  currentSymbol: string;
}

export function PairSelectorPanel({ top, left, onClose, onSelect, currentSymbol }: Props) {
  const [query, setQuery]             = useState("");
  const [marketTab, setMarketTab]     = useState<MarketTab>("Spot");
  const [categoryTab, setCategoryTab] = useState("All markets");
  const [starred, setStarred]         = useState<Set<string>>(new Set());
  const inputRef  = useRef<HTMLInputElement>(null);
  const panelRef  = useRef<HTMLDivElement>(null);

  const { pairs, loading } = usePairs({ limit: 200 });

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [onClose]);

  const filtered = pairs.filter((p) =>
    p.symbolSlash.toLowerCase().includes(query.toLowerCase()) ||
    p.base.toLowerCase().includes(query.toLowerCase()) ||
    p.quote.toLowerCase().includes(query.toLowerCase())
  );

  const displayed = marketTab === "Favorites"
    ? filtered.filter((p) => starred.has(p.symbol))
    : filtered;

  function toggleStar(e: React.MouseEvent, symbol: string) {
    e.stopPropagation();
    setStarred((prev) => {
      const n = new Set(prev);
      n.has(symbol) ? n.delete(symbol) : n.add(symbol);
      return n;
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
          placeholder="Search pairs"
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
          <div className="flex items-center justify-center py-8 gap-2 text-[#444] text-xs">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading pairs…
          </div>
        )}
        {!loading && displayed.length === 0 && (
          <div className="flex items-center justify-center py-8 text-[#333] text-xs">No pairs found</div>
        )}
        {displayed.map((pair) => {
          const isSelected = pair.symbolSlash === currentSymbol || pair.symbol === currentSymbol;
          const isStarred  = starred.has(pair.symbol);
          return (
            <div
              key={pair.id}
              onClick={() => { onSelect(pair.symbolSlash, pair.id); onClose(); }}
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
                  className={`shrink-0 transition-colors ${isStarred ? "text-[#f5c518]" : "text-[#2a2a2a] hover:text-[#555]"}`}
                >
                  <Star className="w-3.5 h-3.5" fill={isStarred ? "#f5c518" : "none"} />
                </button>
                <TokenIcon pair={pair} size={28} />
                <div className="flex flex-col leading-none min-w-0">
                  <span className="text-white font-semibold text-[12px]">{pair.base}<span className="text-[#555] font-normal">/{pair.quote}</span></span>
                  <span className="text-[#3a3a3a] text-[10px] mt-0.5">{pair.chain} · {pair.dex}</span>
                </div>
              </div>

              {/* Last price */}
              <div className="text-right font-mono tabular-nums text-[#ccc] text-[12px]">
                {fmtPrice(pair.price)}
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
