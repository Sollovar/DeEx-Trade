import { useState, useMemo } from "react";
import { X, Search, Star, Loader2 } from "lucide-react";
import { usePairs } from "@/hooks/usePairs";

interface DisplayPair {
  symbol: string; base: string; quote: string; chain: string;
  baseName: string;
  price: number; change: number; volume: number;
  color: string; initial: string; logo: string; id: string;
}

function symbolColor(s: string): string {
  const p = ["#f7931a","#627eea","#9945ff","#f3ba2f","#00aae4","#4caf50","#ff6b35","#e84142","#2a5ada","#8b5cf6","#7b61ff","#ff0420","#28a0f0","#4da2ff","#c2a633"];
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0x7fffffff;
  return p[h % p.length];
}

function chainLabel(n?: string): string {
  if (!n) return "—";
  if (n === "bsc") return "BSC";
  if (n === "base") return "Base";
  if (n === "solana") return "Solana";
  return n.charAt(0).toUpperCase() + n.slice(1);
}

function fmtCompact(n: number): string {
  if (n >= 1_000_000_000) return "$" + (n / 1_000_000_000).toFixed(2) + "B";
  if (n >= 1_000_000)     return "$" + (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000)         return "$" + (n / 1_000).toFixed(0) + "K";
  if (n === 0)            return "—";
  return "$" + n.toFixed(4);
}

const SUBSCRIPT_DIGITS = ["₀","₁","₂","₃","₄","₅","₆","₇","₈","₉"];
function toSubscript(n: number): string {
  return String(n).split("").map(c => SUBSCRIPT_DIGITS[parseInt(c)] ?? c).join("");
}

function fmtPrice(n: number): string {
  if (n === 0)     return "—";
  if (n >= 10000)  return n.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  if (n >= 100)    return n.toFixed(2);
  if (n >= 1)      return n.toFixed(4);
  if (n >= 0.0001) return n.toFixed(6);
  const str = n.toFixed(20);
  const afterDot = str.split(".")[1] ?? "";
  let zeros = 0;
  for (const c of afterDot) { if (c === "0") zeros++; else break; }
  const sigRaw = afterDot.slice(zeros, zeros + 4).replace(/0+$/, "") || "0";
  if (zeros < 4) return n.toFixed(6);
  return `0.0${toSubscript(zeros - 1)}${sigRaw}`;
}

type CategoryTab = "Favorites" | "Futures" | "Spot" | "Prediction";
type FilterChip = "All" | "Top" | "New" | "Meme" | "AI" | "Pre-launch" | "Stocks";

const CATEGORY_TABS: CategoryTab[] = ["Favorites", "Futures", "Spot", "Prediction"];
const FILTER_CHIPS: FilterChip[] = ["All", "Top", "New", "Meme", "AI", "Pre-launch", "Stocks"];

interface Props {
  onClose: () => void;
  onSelect: (pairId: string) => void;
  currentPairId: string;
}

export function MobileMarketSelectPanel({ onClose, onSelect, currentPairId }: Props) {
  const [search, setSearch]   = useState("");
  const [catTab, setCatTab]   = useState<CategoryTab>("Futures");
  const [chip, setChip]       = useState<FilterChip>("All");
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const { pairs: apiPairs, loading } = usePairs();

  const pairs = useMemo<DisplayPair[]>(() =>
    apiPairs.map(p => {
      const base  = p.baseToken?.symbol  ?? "?";
      const quote = p.quoteToken?.symbol ?? "?";
      return {
        id:       p.id,
        symbol:   `${base}${quote}`,
        base,
        quote,
        chain:    chainLabel(p.network),
        baseName: p.baseToken?.name ?? base,
        price:    p.priceUSD  ?? p.price  ?? 0,
        change:   p.priceChange24h ?? 0,
        volume:   p.volume24hUSD ?? p.volume24h ?? 0,
        color:    symbolColor(base),
        initial:  base.charAt(0),
        logo:     p.baseToken?.logo ?? "",
      };
    }),
    [apiPairs],
  );

  const filtered = useMemo(() => {
    let list = pairs;
    if (catTab === "Favorites") list = list.filter(p => favorites.has(p.symbol));
    if (search.trim()) {
      const q = search.trim().toUpperCase();
      list = list.filter(p => p.symbol.includes(q) || p.base.includes(q));
    }
    return list;
  }, [pairs, search, catTab, favorites]);

  function toggleFav(sym: string, e: React.MouseEvent) {
    e.stopPropagation();
    setFavorites(prev => {
      const next = new Set(prev);
      next.has(sym) ? next.delete(sym) : next.add(sym);
      return next;
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ backgroundColor: "var(--m-bg)", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 shrink-0">
        <span className="text-[15px] font-bold" style={{ color: "var(--m-fg)" }}>Markets</span>
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
            onChange={e => setSearch(e.target.value)}
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
        {CATEGORY_TABS.map(tab => (
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

      {/* Filter chips */}
      <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto scrollbar-none shrink-0">
        {FILTER_CHIPS.map(c => (
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
        <div className="text-right pr-5">Volume</div>
        <div className="text-right" style={{ minWidth: 80 }}>Price / 24h</div>
      </div>

      <div className="mx-4 mb-1 rounded-full h-px" style={{ backgroundColor: "var(--m-bdr)" }} />

      {/* Pairs list */}
      <div className="flex-1 overflow-y-auto px-2">
        {loading && (
          <div className="flex items-center justify-center gap-2 py-12" style={{ color: "var(--m-fg-4)" }}>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-[13px]">Loading markets…</span>
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: "var(--m-bg-2)" }}>
              <Search className="w-5 h-5" style={{ color: "var(--m-fg-5)" }} />
            </div>
            <p className="text-[13px]" style={{ color: "var(--m-fg-4)" }}>No markets found</p>
          </div>
        )}
        {filtered.map(pair => {
          const isFav     = favorites.has(pair.symbol);
          const isCurrent = pair.id === currentPairId;
          return (
            <button
              key={pair.id}
              onClick={() => { onSelect(pair.id); onClose(); }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl mb-0.5 transition-all active:scale-[0.98]"
              style={{ backgroundColor: isCurrent ? "var(--m-bg-3)" : "transparent" }}
              onMouseEnter={e => { if (!isCurrent) e.currentTarget.style.backgroundColor = "var(--m-bg-2)"; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = isCurrent ? "var(--m-bg-3)" : "transparent"; }}
            >
              {/* Star */}
              <button className="shrink-0 p-0.5 transition-transform active:scale-90" onClick={e => toggleFav(pair.symbol, e)}>
                <Star
                  className="w-3.5 h-3.5 transition-colors"
                  style={{ color: isFav ? "#f5c518" : "var(--m-fg-5)" }}
                  fill={isFav ? "#f5c518" : "none"}
                />
              </button>

              {/* Icon */}
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 overflow-hidden"
                style={{ backgroundColor: pair.color + "25", border: `1.5px solid ${pair.color}40` }}
              >
                {pair.logo ? (
                  <img src={pair.logo} alt={pair.base} className="w-6 h-6 rounded-full object-cover"
                    onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                ) : (
                  <span style={{ color: pair.color }}>{pair.initial}</span>
                )}
              </div>

              {/* Name + base token name */}
              <div className="flex flex-col leading-none gap-0.5 flex-1 text-left min-w-0">
                <span className="font-bold text-[13px] truncate" style={{ color: "var(--m-fg)" }}>
                  {pair.base}<span style={{ color: "var(--m-fg-4)", fontWeight: 400 }}>/{pair.quote}</span>
                </span>
                <span className="text-[10px] truncate" style={{ color: "var(--m-fg-4)" }}>{pair.baseName}</span>
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
