import { useState, useMemo } from "react";
import { X, Search, Star } from "lucide-react";

interface Pair {
  symbol: string; base: string; chain: string;
  price: number; change: number; volume: number;
  color: string; initial: string;
}

const PAIRS: Pair[] = [
  { symbol: "BTCUSDT",   base: "BTC",   chain: "BSC",    price: 61200.0,  change:  2.88, volume: 1159216131, color: "#f7931a", initial: "B" },
  { symbol: "ETHUSDT",   base: "ETH",   chain: "Base",   price: 1656.16,  change:  2.57, volume:  519235321, color: "#627eea", initial: "E" },
  { symbol: "BNBUSDT",   base: "BNB",   chain: "BSC",    price:  599.30,  change:  2.69, volume:   23222781, color: "#f3ba2f", initial: "B" },
  { symbol: "SOLUSDT",   base: "SOL",   chain: "Solana", price:   65.09,  change:  2.89, volume:   96143135, color: "#9945ff", initial: "S" },
  { symbol: "XRPUSDT",   base: "XRP",   chain: "BSC",    price:    1.116, change:  1.10, volume:   17903004, color: "#346aa9", initial: "X" },
  { symbol: "DOGEUSDT",  base: "DOGE",  chain: "BSC",    price:    0.0848,change:  2.00, volume:   14080979, color: "#c2a633", initial: "D" },
  { symbol: "ADAUSDT",   base: "ADA",   chain: "Base",   price:    0.4821,change:  4.47, volume:     567968, color: "#3468d1", initial: "A" },
  { symbol: "DOTUSDT",   base: "DOT",   chain: "BSC",    price:    4.230, change:  1.71, volume:     163897, color: "#e6007a", initial: "D" },
  { symbol: "AVAXUSDT",  base: "AVAX",  chain: "Base",   price:   28.45,  change:  3.12, volume:   48234567, color: "#e84142", initial: "A" },
  { symbol: "LINKUSDT",  base: "LINK",  chain: "BSC",    price:   14.23,  change:  1.55, volume:   31456789, color: "#375bd2", initial: "L" },
  { symbol: "SUIUSDT",   base: "SUI",   chain: "Solana", price:    3.891, change:  4.67, volume:   78901234, color: "#4ca2f9", initial: "S" },
  { symbol: "NEARUSDT",  base: "NEAR",  chain: "Solana", price:    3.456, change: -1.23, volume:   12345678, color: "#00d5bd", initial: "N" },
  { symbol: "MATICUSDT", base: "MATIC", chain: "Base",   price:    0.482, change:  0.89, volume:    9876543, color: "#8247e5", initial: "M" },
  { symbol: "UNIUSDT",   base: "UNI",   chain: "Base",   price:    7.234, change:  2.14, volume:    6543210, color: "#ff007a", initial: "U" },
  { symbol: "SANDUSDT",  base: "SAND",  chain: "BSC",    price:    0.0516,change:  5.02, volume:        266, color: "#00adef", initial: "S" },
  { symbol: "INJUSDT",   base: "INJ",   chain: "Solana", price:   22.84,  change: -0.73, volume:   19234567, color: "#00b5d8", initial: "I" },
  { symbol: "APTUSDT",   base: "APT",   chain: "Solana", price:    8.120, change:  1.98, volume:   14567890, color: "#66d9e8", initial: "A" },
  { symbol: "ARBUSDT",   base: "ARB",   chain: "Base",   price:    0.642, change: -2.31, volume:   11234567, color: "#2d374b", initial: "A" },
  { symbol: "OPUSDT",    base: "OP",    chain: "Base",   price:    1.534, change:  0.44, volume:    8765432, color: "#ff0420", initial: "O" },
  { symbol: "WIFUSDT",   base: "WIF",   chain: "Solana", price:    1.890, change:  6.12, volume:   34567890, color: "#9945ff", initial: "W" },
];

function fmtCompact(n: number): string {
  if (n >= 1_000_000_000) return "$" + (n / 1_000_000_000).toFixed(2) + "B";
  if (n >= 1_000_000)     return "$" + (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000)         return "$" + (n / 1_000).toFixed(0) + "K";
  return "$" + n.toString();
}

function fmtPrice(n: number): string {
  if (n >= 10000) return n.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  if (n >= 100)   return n.toFixed(2);
  if (n >= 1)     return n.toFixed(3);
  return n.toFixed(4);
}

type CategoryTab = "Favorites" | "Futures" | "Spot" | "Prediction";
type FilterChip = "All" | "Top" | "New" | "Meme" | "AI" | "Pre-launch" | "Stocks";

const CATEGORY_TABS: CategoryTab[] = ["Favorites", "Futures", "Spot", "Prediction"];
const FILTER_CHIPS: FilterChip[] = ["All", "Top", "New", "Meme", "AI", "Pre-launch", "Stocks"];

interface Props {
  onClose: () => void;
  onSelect: (symbol: string) => void;
  currentSymbol: string;
}

export function MobileMarketSelectPanel({ onClose, onSelect, currentSymbol }: Props) {
  const [search, setSearch]   = useState("");
  const [catTab, setCatTab]   = useState<CategoryTab>("Futures");
  const [chip, setChip]       = useState<FilterChip>("All");
  const [favorites, setFavorites] = useState<Set<string>>(new Set(["BTCUSDT", "ETHUSDT"]));

  const filtered = useMemo(() => {
    let list = PAIRS;
    if (catTab === "Favorites") list = list.filter((p) => favorites.has(p.symbol));
    if (search.trim()) {
      const q = search.trim().toUpperCase();
      list = list.filter((p) => p.symbol.includes(q) || p.base.includes(q));
    }
    return list;
  }, [search, catTab, chip, favorites]);

  function toggleFav(sym: string, e: React.MouseEvent) {
    e.stopPropagation();
    setFavorites((prev) => {
      const next = new Set(prev);
      next.has(sym) ? next.delete(sym) : next.add(sym);
      return next;
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{
        backgroundColor: "var(--m-bg)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 shrink-0">
        <span className="text-[15px] font-bold" style={{ color: "var(--m-fg)" }}>
          Markets
        </span>
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-full transition-colors"
          style={{ backgroundColor: "var(--m-bg-3)", color: "var(--m-fg-3)" }}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Search */}
      <div className="px-4 pb-3 shrink-0">
        <div
          className="flex items-center gap-2.5 h-[44px] px-4 rounded-2xl"
          style={{ backgroundColor: "var(--m-bg-2)" }}
        >
          <Search className="w-4 h-4 shrink-0" style={{ color: "var(--m-fg-4)" }} />
          <input
            type="text"
            placeholder="Search markets…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent outline-none flex-1 text-[14px] placeholder:opacity-30"
            style={{ color: "var(--m-fg)" }}
            autoFocus
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="w-5 h-5 flex items-center justify-center rounded-full transition-colors"
              style={{ backgroundColor: "var(--m-bg-4)", color: "var(--m-fg-3)" }}
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex items-center px-4 gap-1 shrink-0 pb-1">
        {CATEGORY_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setCatTab(tab)}
            className="px-3 h-8 text-[13px] font-semibold relative transition-all rounded-lg"
            style={{
              backgroundColor: catTab === tab ? "var(--m-bg-3)" : "transparent",
              color: catTab === tab ? "var(--m-fg)" : "var(--m-fg-4)",
            }}
          >
            {tab}
            {tab === "Prediction" && (
              <span className="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-[#ff1744] align-super" />
            )}
          </button>
        ))}
      </div>

      {/* Filter chips — pill style */}
      <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto scrollbar-none shrink-0">
        {FILTER_CHIPS.map((c) => (
          <button
            key={c}
            onClick={() => setChip(c)}
            className="px-3.5 h-7 text-[12px] font-semibold whitespace-nowrap transition-all shrink-0 rounded-full"
            style={{
              backgroundColor: chip === c ? "#f5c518" : "var(--m-bg-2)",
              color: chip === c ? "#000" : "var(--m-fg-4)",
            }}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Column headers */}
      <div
        className="grid px-4 py-2 text-[11px] font-semibold shrink-0"
        style={{ gridTemplateColumns: "1fr auto auto", color: "var(--m-fg-4)" }}
      >
        <div>Symbol</div>
        <div className="text-right pr-5">
          <div>Volume</div>
        </div>
        <div className="text-right" style={{ minWidth: 80 }}>
          Price / 24h
        </div>
      </div>

      {/* thin separator */}
      <div className="mx-4 mb-1 rounded-full h-px" style={{ backgroundColor: "var(--m-bdr)" }} />

      {/* Pairs list */}
      <div className="flex-1 overflow-y-auto px-2">
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: "var(--m-bg-2)" }}
            >
              <Search className="w-5 h-5" style={{ color: "var(--m-fg-5)" }} />
            </div>
            <p className="text-[13px]" style={{ color: "var(--m-fg-4)" }}>No markets found</p>
          </div>
        )}
        {filtered.map((pair) => {
          const isFav = favorites.has(pair.symbol);
          const isCurrent = pair.symbol === currentSymbol;
          return (
            <button
              key={pair.symbol}
              onClick={() => { onSelect(pair.symbol); onClose(); }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl mb-0.5 transition-all active:scale-[0.98]"
              style={{
                backgroundColor: isCurrent ? "var(--m-bg-3)" : "transparent",
              }}
              onMouseEnter={(e) => { if (!isCurrent) e.currentTarget.style.backgroundColor = "var(--m-bg-2)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = isCurrent ? "var(--m-bg-3)" : "transparent"; }}
            >
              {/* Star */}
              <button
                className="shrink-0 p-0.5 transition-transform active:scale-90"
                onClick={(e) => toggleFav(pair.symbol, e)}
              >
                <Star
                  className="w-3.5 h-3.5 transition-colors"
                  style={{ color: isFav ? "#f5c518" : "var(--m-fg-5)" }}
                  fill={isFav ? "#f5c518" : "none"}
                />
              </button>

              {/* Icon */}
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                style={{ backgroundColor: pair.color + "25", border: `1.5px solid ${pair.color}40` }}
              >
                <span style={{ color: pair.color }}>{pair.initial}</span>
              </div>

              {/* Name + chain */}
              <div className="flex flex-col leading-none gap-0.5 flex-1 text-left min-w-0">
                <span className="font-bold text-[13px] truncate" style={{ color: "var(--m-fg)" }}>{pair.symbol}</span>
                <span className="text-[10px]" style={{ color: "var(--m-fg-4)" }}>{pair.chain}</span>
              </div>

              {/* Volume */}
              <div className="flex flex-col leading-none gap-0.5 text-right pr-3 shrink-0">
                <span className="text-[11px] font-mono tabular-nums" style={{ color: "var(--m-fg-2)" }}>{fmtCompact(pair.volume)}</span>
              </div>

              {/* Price + change */}
              <div className="flex flex-col leading-none gap-0.5 text-right shrink-0" style={{ minWidth: 72 }}>
                <span className="text-[13px] font-mono tabular-nums font-semibold" style={{ color: "var(--m-fg)" }}>{fmtPrice(pair.price)}</span>
                <span
                  className="text-[10px] font-mono tabular-nums font-semibold"
                  style={{ color: pair.change >= 0 ? "#00c853" : "#ff1744" }}
                >
                  {pair.change >= 0 ? "+" : ""}{pair.change.toFixed(2)}%
                </span>
              </div>
            </button>
          );
        })}
        <div className="h-4" />
      </div>
    </div>
  );
}
