import { useState, useMemo, useRef, useCallback } from "react";
import { Search, Star, TrendingUp, TrendingDown, X, Flame, Zap, LayoutList, BarChart2, Bell } from "lucide-react";
import { MobilePriceAlertSheet, PriceAlert } from "./MobilePriceAlertSheet";
import { useLivePrices } from "../hooks/useLivePrices";
import { LiveMarketState } from "@/hooks/useLiveMarket";
import { MobilePairHeader } from "./MobilePairHeader";
import { MobileChartView } from "./MobileChartView";
import { MobileOrderBookView } from "./MobileOrderBookView";
import { MobileTradesView } from "./MobileTradesView";
import { MobileBottomSection } from "./MobileBottomSection";

/* ─────────────────────────── data ─────────────────────────── */
interface Pair {
  symbol: string; base: string; chain: string;
  price: number; change: number; volume: number; liquidity: number;
  high24h: number; low24h: number;
  color: string; initial: string;
  spark7d: number[];
}

function makeSpark(base: number, trend: number): number[] {
  const pts: number[] = [];
  let v = base * (1 - trend * 0.04);
  for (let i = 0; i < 14; i++) {
    v += base * (Math.random() * 0.014 - 0.006 + trend * 0.004);
    pts.push(v);
  }
  return pts;
}

const PAIRS: Pair[] = [
  { symbol:"BTCUSDT",   base:"BTC",   chain:"BSC",    price:61200.0,  change: 2.88, volume:1_159_216_131, liquidity:432_000_000, high24h:62100,   low24h:59800,  color:"#f7931a", initial:"B", spark7d: makeSpark(61200,  1) },
  { symbol:"ETHUSDT",   base:"ETH",   chain:"Base",   price:1656.16,  change: 2.57, volume:  519_235_321, liquidity:198_000_000, high24h: 1720,   low24h: 1580,  color:"#627eea", initial:"E", spark7d: makeSpark( 1656,  1) },
  { symbol:"BNBUSDT",   base:"BNB",   chain:"BSC",    price: 599.30,  change: 2.69, volume:   23_222_781, liquidity: 14_500_000, high24h:  612,   low24h:  581,  color:"#f3ba2f", initial:"B", spark7d: makeSpark(  599,  1) },
  { symbol:"SOLUSDT",   base:"SOL",   chain:"Solana", price:  65.09,  change: 2.89, volume:   96_143_135, liquidity: 38_400_000, high24h: 68.5,   low24h: 62.1,  color:"#9945ff", initial:"S", spark7d: makeSpark(   65,  1) },
  { symbol:"WIFUSDT",   base:"WIF",   chain:"Solana", price:   1.890, change: 6.12, volume:   34_567_890, liquidity:  9_200_000, high24h:  2.01,  low24h:  1.74, color:"#9945ff", initial:"W", spark7d: makeSpark(  1.9,  2) },
  { symbol:"SANDUSDT",  base:"SAND",  chain:"BSC",    price:   0.0516,change: 5.02, volume:    3_450_266, liquidity:  1_100_000, high24h:  0.056, low24h:  0.047,color:"#00adef", initial:"S", spark7d: makeSpark(0.052,  2) },
  { symbol:"SUIUSDT",   base:"SUI",   chain:"Solana", price:   3.891, change: 4.67, volume:   78_901_234, liquidity: 28_700_000, high24h:  4.12,  low24h:  3.60, color:"#4ca2f9", initial:"S", spark7d: makeSpark(  3.9,  1) },
  { symbol:"ADAUSDT",   base:"ADA",   chain:"Base",   price:   0.4821,change: 4.47, volume:    5_679_680, liquidity:  3_200_000, high24h:  0.502, low24h:  0.451,color:"#3468d1", initial:"A", spark7d: makeSpark(0.482,  1) },
  { symbol:"XRPUSDT",   base:"XRP",   chain:"BSC",    price:   1.116, change: 1.10, volume:   17_903_004, liquidity:  8_900_000, high24h:  1.14,  low24h:  1.08, color:"#346aa9", initial:"X", spark7d: makeSpark(  1.1,  0) },
  { symbol:"DOGEUSDT",  base:"DOGE",  chain:"BSC",    price:   0.0848,change: 2.00, volume:   14_080_979, liquidity:  5_600_000, high24h:  0.089, low24h:  0.081,color:"#c2a633", initial:"D", spark7d: makeSpark(0.085,  0) },
  { symbol:"AVAXUSDT",  base:"AVAX",  chain:"Base",   price:  28.45,  change: 3.12, volume:   48_234_567, liquidity: 17_800_000, high24h: 29.80,  low24h: 26.90, color:"#e84142", initial:"A", spark7d: makeSpark(   28,  1) },
  { symbol:"LINKUSDT",  base:"LINK",  chain:"BSC",    price:  14.23,  change: 1.55, volume:   31_456_789, liquidity: 11_200_000, high24h: 14.90,  low24h: 13.70, color:"#375bd2", initial:"L", spark7d: makeSpark(   14,  0) },
  { symbol:"NEARUSDT",  base:"NEAR",  chain:"Solana", price:   3.456, change:-1.23, volume:   12_345_678, liquidity:  4_300_000, high24h:  3.61,  low24h:  3.32, color:"#00d5bd", initial:"N", spark7d: makeSpark(  3.5, -1) },
  { symbol:"MATICUSDT", base:"MATIC", chain:"Base",   price:   0.482, change: 0.89, volume:    9_876_543, liquidity:  3_700_000, high24h:  0.498, low24h:  0.467,color:"#8247e5", initial:"M", spark7d: makeSpark(0.482,  0) },
  { symbol:"UNIUSDT",   base:"UNI",   chain:"Base",   price:   7.234, change: 2.14, volume:    6_543_210, liquidity:  2_900_000, high24h:  7.55,  low24h:  6.95, color:"#ff007a", initial:"U", spark7d: makeSpark(  7.2,  1) },
  { symbol:"INJUSDT",   base:"INJ",   chain:"Solana", price:  22.84,  change:-0.73, volume:   19_234_567, liquidity:  7_100_000, high24h: 23.70,  low24h: 22.10, color:"#00b5d8", initial:"I", spark7d: makeSpark(   23, -1) },
  { symbol:"APTUSDT",   base:"APT",   chain:"Solana", price:   8.120, change: 1.98, volume:   14_567_890, liquidity:  5_400_000, high24h:  8.45,  low24h:  7.80, color:"#66d9e8", initial:"A", spark7d: makeSpark(  8.1,  0) },
  { symbol:"ARBUSDT",   base:"ARB",   chain:"Base",   price:   0.642, change:-2.31, volume:   11_234_567, liquidity:  4_100_000, high24h:  0.672, low24h:  0.618,color:"#2d374b", initial:"A", spark7d: makeSpark(0.642, -1) },
  { symbol:"OPUSDT",    base:"OP",    chain:"Base",   price:   1.534, change: 0.44, volume:    8_765_432, liquidity:  3_000_000, high24h:  1.58,  low24h:  1.49, color:"#ff0420", initial:"O", spark7d: makeSpark(  1.5,  0) },
  { symbol:"DOTUSDT",   base:"DOT",   chain:"BSC",    price:   4.230, change:-1.71, volume:    1_638_970, liquidity:    780_000, high24h:  4.42,  low24h:  4.08, color:"#e6007a", initial:"D", spark7d: makeSpark(  4.2, -1) },
];

type FilterTab = "All" | "Favorites" | "Gainers" | "Losers";
type MainTab   = "Chart" | "Order Book" | "Trades";

/* ─────────────────────────── helpers ──────────────────────── */
function fmtCompact(n: number) {
  if (n >= 1_000_000_000) return "$" + (n / 1_000_000_000).toFixed(2) + "B";
  if (n >= 1_000_000)     return "$" + (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000)         return "$" + (n / 1_000).toFixed(0) + "K";
  return "$" + n.toString();
}

function fmtPrice(n: number) {
  if (n >= 10000) return n.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  if (n >= 100)   return n.toFixed(2);
  if (n >= 1)     return n.toFixed(3);
  return n.toFixed(4);
}

/* ─────────────────────────── sparkline ────────────────────── */
function Spark({ data, color, w = 56, h = 24 }: { data: number[]; color: string; w?: number; h?: number }) {
  if (data.length < 2) return <div style={{ width: w, height: h }} />;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const pad = 2;
  const coords = data.map((v, i) => ({
    x: (i / (data.length - 1)) * w,
    y: h - pad - ((v - min) / range) * (h - pad * 2),
  }));
  const line = coords.map(c => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
  const area = `M${coords[0].x},${coords[0].y} ` +
    coords.slice(1).map(c => `L${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ") +
    ` L${w},${h} L0,${h} Z`;
  const gid = `sp-${color.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: "block", overflow: "hidden" }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity={0.25} />
          <stop offset="100%" stopColor={color} stopOpacity={0}    />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <polyline points={line} fill="none" stroke={color} strokeWidth="1.5"
        strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/* ─────────────────────────── movers card ──────────────────── */
function MoverCard({ p, onSelect }: { p: Pair; onSelect: () => void }) {
  const up = p.change >= 0;
  return (
    <button
      onClick={onSelect}
      className="flex flex-col gap-1 px-3 py-2.5 rounded-2xl shrink-0 transition-all active:scale-95"
      style={{ backgroundColor:"var(--m-bg-2)", border:"1px solid var(--m-bdr)", minWidth: 90 }}
    >
      <div className="flex items-center gap-1.5">
        <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
          style={{ backgroundColor: p.color + "30", color: p.color }}>{p.initial}</div>
        <span className="text-[11px] font-bold" style={{ color:"var(--m-fg)" }}>{p.base}</span>
      </div>
      <span className="text-[12px] font-mono font-semibold" style={{ color:"var(--m-fg)" }}>{fmtPrice(p.price)}</span>
      <span className="text-[11px] font-bold flex items-center gap-0.5" style={{ color: up ? "#00c853" : "#ff4d6a" }}>
        {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        {up ? "+" : ""}{p.change.toFixed(2)}%
      </span>
    </button>
  );
}

/* ─────────────────────────── props ────────────────────────── */
interface Props {
  market: LiveMarketState;
  currentSymbol: string;
  onSelectPair?: (symbol: string) => void;
  onOpenMarketPanel?: () => void;
}

/* ═══════════════════════════ component ════════════════════════ */
export function MobileMarketsPage({ market, currentSymbol, onSelectPair, onOpenMarketPanel }: Props) {
  const [view,      setView]      = useState<"pairs" | "chart">("pairs");
  const [search,    setSearch]    = useState("");
  const [tab,       setTab]       = useState<FilterTab>("All");
  const [sortBy,    setSortBy]    = useState<"volume" | "change" | "price" | "liquidity">("volume");
  const [favorites, setFavorites] = useState<Set<string>>(new Set(["BTCUSDT","ETHUSDT","SOLUSDT"]));
  const [mainTab,   setMainTab]   = useState<MainTab>("Chart");
  const [alerts,    setAlerts]    = useState<Record<string, PriceAlert[]>>({});
  const [alertPair, setAlertPair] = useState<Pair | null>(null);
  const pressTimer      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressMove       = useRef(false);
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const bodyScrollRef   = useRef<HTMLDivElement>(null);

  const onBodyScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (headerScrollRef.current) headerScrollRef.current.scrollLeft = e.currentTarget.scrollLeft;
  }, []);

  const onHeaderScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (bodyScrollRef.current) bodyScrollRef.current.scrollLeft = e.currentTarget.scrollLeft;
  }, []);

  const startPress = useCallback((pair: Pair) => {
    pressMove.current = false;
    pressTimer.current = setTimeout(() => {
      if (!pressMove.current) setAlertPair(pair);
    }, 500);
  }, []);

  const cancelPress = useCallback(() => {
    if (pressTimer.current) { clearTimeout(pressTimer.current); pressTimer.current = null; }
  }, []);

  function addAlert(alert: PriceAlert) {
    setAlerts(prev => ({ ...prev, [alert.symbol]: [...(prev[alert.symbol] ?? []), alert] }));
  }

  function removeAlert(symbol: string, id: string) {
    setAlerts(prev => {
      const next = (prev[symbol] ?? []).filter(a => a.id !== id);
      return { ...prev, [symbol]: next };
    });
  }

  // ── Live prices with flash states ──
  const INITIAL_PRICES = useMemo(
    () => Object.fromEntries(PAIRS.map(p => [p.symbol, p.price])),
    [],
  );
  const livePrices = useLivePrices(INITIAL_PRICES);

  const topGainers = useMemo(() => [...PAIRS].sort((a,b) => b.change - a.change).slice(0,4), []);
  const topLosers  = useMemo(() => [...PAIRS].filter(p => p.change < 0).sort((a,b) => a.change - b.change).slice(0,4), []);

  const filtered = useMemo(() => {
    let list = [...PAIRS];
    if (tab === "Favorites") list = list.filter(p => favorites.has(p.symbol));
    if (tab === "Gainers")   list = list.filter(p => p.change > 0);
    if (tab === "Losers")    list = list.filter(p => p.change < 0);
    if (search.trim()) {
      const q = search.trim().toUpperCase();
      list = list.filter(p => p.symbol.includes(q) || p.base.includes(q));
    }
    if (sortBy === "volume")    list.sort((a,b) => b.volume    - a.volume);
    if (sortBy === "change")    list.sort((a,b) => b.change    - a.change);
    if (sortBy === "price")     list.sort((a,b) => b.price     - a.price);
    if (sortBy === "liquidity") list.sort((a,b) => b.liquidity - a.liquidity);
    return list;
  }, [tab, search, favorites, sortBy]);

  function toggleFav(sym: string, e: React.MouseEvent) {
    e.stopPropagation();
    setFavorites(prev => { const n = new Set(prev); n.has(sym) ? n.delete(sym) : n.add(sym); return n; });
  }

  /* ── shared header (always visible) ── */
  const Header = (
    <div className="px-4 pt-3 pb-2 shrink-0" style={{ borderBottom:"1px solid var(--m-bdr)" }}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[18px] font-bold" style={{ color:"var(--m-fg)" }}>Markets</p>
        {/* view toggle */}
        <div className="flex items-center rounded-xl p-0.5" style={{ backgroundColor:"var(--m-bg-2)" }}>
          <button
            onClick={() => setView("pairs")}
            className="flex items-center gap-1.5 px-3 h-7 rounded-lg text-[12px] font-semibold transition-all"
            style={{
              backgroundColor: view === "pairs" ? "var(--m-bg-4)" : "transparent",
              color: view === "pairs" ? "var(--m-fg)" : "var(--m-fg-4)",
            }}
          >
            <LayoutList className="w-3.5 h-3.5" />
            Pairs
          </button>
          <button
            onClick={() => setView("chart")}
            className="flex items-center gap-1.5 px-3 h-7 rounded-lg text-[12px] font-semibold transition-all"
            style={{
              backgroundColor: view === "chart" ? "var(--m-bg-4)" : "transparent",
              color: view === "chart" ? "var(--m-fg)" : "var(--m-fg-4)",
            }}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            Chart
          </button>
        </div>
      </div>

      {/* search — only in pairs view */}
      {view === "pairs" && (
        <>
          <div className="flex items-center gap-2.5 h-[40px] px-3 rounded-2xl mb-3" style={{ backgroundColor:"var(--m-bg-2)" }}>
            <Search className="w-4 h-4 shrink-0" style={{ color:"var(--m-fg-4)" }} />
            <input
              type="text"
              placeholder="Search pairs…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-transparent outline-none flex-1 text-[13px] placeholder:opacity-30"
              style={{ color:"var(--m-fg)" }}
            />
            {search && (
              <button onClick={() => setSearch("")}>
                <X className="w-3.5 h-3.5" style={{ color:"var(--m-fg-5)" }} />
              </button>
            )}
          </div>

          {/* filter tabs */}
          <div className="flex gap-1.5">
            {(["All","Favorites","Gainers","Losers"] as FilterTab[]).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className="px-3 h-7 rounded-full text-[12px] font-semibold transition-all shrink-0"
                style={{ backgroundColor: tab===t ? "#f5c518" : "var(--m-bg-2)", color: tab===t ? "#000" : "var(--m-fg-4)" }}>
                {t}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );

  /* ════════════════ CHART VIEW ════════════════ */
  if (view === "chart") {
    return (
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {Header}

        <MobilePairHeader
          market={market}
          currentSymbol={currentSymbol}
          onOpenMarketPanel={() => onOpenMarketPanel?.()}
        />

        {/* Chart / Order Book / Trades sub-tabs */}
        <div
          className="flex items-center h-[40px] shrink-0"
          style={{ backgroundColor:"var(--m-bg-1)", borderBottom:"1px solid var(--m-bdr)" }}
        >
          {(["Chart","Order Book","Trades"] as MainTab[]).map(t => (
            <button key={t} onClick={() => setMainTab(t)}
              className="flex-1 h-full text-[13px] font-semibold transition-all relative"
              style={{ color: mainTab===t ? "var(--m-fg)" : "var(--m-fg-4)" }}
            >
              {t}
              {mainTab === t && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[2px] rounded-full"
                  style={{ backgroundColor:"#f5c518", width:"60%" }} />
              )}
            </button>
          ))}
        </div>

        {/* chart area */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden" style={{ paddingBottom:60 }}>
          <div className="flex-1 min-h-0 overflow-hidden">
            {mainTab === "Chart"      && <MobileChartView livePrice={market.price} />}
            {mainTab === "Order Book" && <MobileOrderBookView market={market} />}
            {mainTab === "Trades"     && <MobileTradesView market={market} />}
          </div>
          <div className="shrink-0 overflow-y-auto" style={{ height:160, borderTop:"1px solid var(--m-bdr)" }}>
            <MobileBottomSection />
          </div>
        </div>
      </div>
    );
  }

  /* ════════════════ PAIRS VIEW ════════════════ */
  const COL_HEADER = "text-[10px] font-bold uppercase tracking-wide whitespace-nowrap";

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden" style={{ paddingBottom:60 }}>
      {Header}

      <div className="flex-1 overflow-y-auto">

        {/* Top movers — only on All tab, no search */}
        {tab === "All" && !search && (
          <div className="px-3 pt-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Flame className="w-3.5 h-3.5 text-[#f5c518]" />
              <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color:"var(--m-fg-4)" }}>Top Gainers</span>
            </div>
            <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1 mb-3">
              {topGainers.map(p => <MoverCard key={p.symbol} p={p} onSelect={() => onSelectPair?.(p.symbol)} />)}
            </div>
            <div className="flex items-center gap-1.5 mb-2">
              <Zap className="w-3.5 h-3.5" style={{ color:"#ff4d6a" }} />
              <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color:"var(--m-fg-4)" }}>Top Losers</span>
            </div>
            <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1 mb-2">
              {topLosers.map(p => <MoverCard key={p.symbol} p={p} onSelect={() => onSelectPair?.(p.symbol)} />)}
            </div>
            <div className="h-px mx-1 mb-1" style={{ backgroundColor:"var(--m-bdr)" }} />
          </div>
        )}

        {/* ── Pairs table ── */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 gap-2">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor:"var(--m-bg-2)" }}>
              <Search className="w-5 h-5" style={{ color:"var(--m-fg-5)" }} />
            </div>
            <p className="text-[13px]" style={{ color:"var(--m-fg-4)" }}>No pairs found</p>
          </div>
        ) : (
          <>
          {/* ── Column header — sticky, synced scroll with body ── */}
          <div
            ref={headerScrollRef}
            className="sticky top-0 z-20 overflow-x-auto scrollbar-none"
            style={{ backgroundColor:"var(--m-bg)", borderBottom:"1px solid var(--m-bdr)" }}
            onScroll={onHeaderScroll}
          >
            <div className="flex items-center" style={{ minWidth: 560, height: 34 }}>
              <div
                className="flex items-center shrink-0 pl-3 pr-2 sticky left-0 z-30 h-full"
                style={{ backgroundColor:"var(--m-bg)", width:148 }}
              >
                <span className={COL_HEADER} style={{ color:"var(--m-fg-5)" }}>Symbol</span>
              </div>
              <div className="flex items-center flex-1 gap-0">
                {(["price","change","volume","liquidity","7d"] as const).map(col => (
                  <button
                    key={col}
                    onClick={() => col !== "7d" && setSortBy(col as any)}
                    className={`${COL_HEADER} text-right transition-colors`}
                    style={{
                      width: col === "7d" ? 68 : col === "price" ? 78 : 74,
                      paddingRight: 8,
                      color: sortBy === col ? "#f5c518" : "var(--m-fg-5)",
                      cursor: col === "7d" ? "default" : "pointer",
                      flexShrink: 0,
                    }}
                  >
                    {col === "change" ? "24h %" : col === "volume" ? "Vol" : col === "liquidity" ? "Liq" : col === "price" ? "Price" : "7d"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Pair rows ── */}
          <div ref={bodyScrollRef} className="overflow-x-auto" onScroll={onBodyScroll}>
            <div style={{ minWidth: 560 }}>

              {/* ── Pair rows ── */}
              {filtered.map(pair => {
                const isFav      = favorites.has(pair.symbol);
                const up         = pair.change >= 0;
                const sparkColor = up ? "#00c853" : "#ff4d6a";
                const pairAlerts = alerts[pair.symbol] ?? [];
                const hasAlerts  = pairAlerts.length > 0;
                const lp         = livePrices[pair.symbol];
                const livePrice  = lp?.price ?? pair.price;
                const flash      = lp?.flash ?? null;

                return (
                  <div
                    key={pair.symbol}
                    className="flex items-center transition-colors active:opacity-70 select-none"
                    style={{ height:52, borderBottom:"1px solid var(--m-bdr)" }}
                    onClick={() => onSelectPair?.(pair.symbol)}
                    onTouchStart={() => startPress(pair)}
                    onTouchMove={() => { pressMove.current = true; cancelPress(); }}
                    onTouchEnd={cancelPress}
                    onTouchCancel={cancelPress}
                  >
                    {/* ── Sticky LEFT: star + icon + symbol ── */}
                    <div
                      className="flex items-center gap-1.5 shrink-0 sticky left-0 z-10 h-full pl-2 pr-2"
                      style={{ backgroundColor:"var(--m-bg)", width:148 }}
                    >
                      {/* star */}
                      <button
                        className="shrink-0 p-0.5 transition-transform active:scale-90"
                        onClick={e => toggleFav(pair.symbol, e)}
                      >
                        <Star className="w-3.5 h-3.5" style={{ color: isFav ? "#f5c518" : "var(--m-fg-5)" }} fill={isFav ? "#f5c518" : "none"} />
                      </button>
                      {/* token icon */}
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                        style={{ backgroundColor: pair.color + "25", border:`1.5px solid ${pair.color}40` }}
                      >
                        <span style={{ color: pair.color }}>{pair.initial}</span>
                      </div>
                      {/* name + bell badge */}
                      <div className="flex flex-col leading-none gap-0.5 min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                          <span className="font-bold text-[12px] leading-tight" style={{ color:"var(--m-fg)" }}>
                            {pair.base}<span style={{ color:"var(--m-fg-5)", fontWeight:400 }}>/USDT</span>
                          </span>
                          {hasAlerts && (
                            <span
                              className="w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0"
                              style={{ backgroundColor: "#f5c518", minWidth:14 }}
                              title={`${pairAlerts.length} alert${pairAlerts.length > 1 ? "s" : ""}`}
                            >
                              <Bell className="w-2 h-2" style={{ color:"#000" }} />
                            </span>
                          )}
                        </div>
                        <span className="text-[9px]" style={{ color:"var(--m-fg-5)" }}>{pair.chain}</span>
                      </div>
                    </div>

                    {/* ── Scrollable RIGHT columns ── */}
                    <div className="flex items-center flex-1">

                      {/* Price — flashes green/red on tick */}
                      <div
                        className="text-right shrink-0 rounded-md"
                        style={{
                          width: 78, paddingRight: 8, paddingLeft: 4,
                          transition: "background-color 0.25s ease",
                          backgroundColor:
                            flash === "up"   ? "rgba(0,200,83,0.13)"  :
                            flash === "down" ? "rgba(255,77,106,0.13)" : "transparent",
                        }}
                      >
                        <span
                          className="text-[12px] font-mono font-semibold tabular-nums"
                          style={{
                            transition: "color 0.25s ease",
                            color:
                              flash === "up"   ? "#00c853"     :
                              flash === "down" ? "#ff4d6a"     : "var(--m-fg)",
                          }}
                        >
                          {fmtPrice(livePrice)}
                        </span>
                      </div>

                      {/* 24h % */}
                      <div className="text-right shrink-0" style={{ width:74, paddingRight:8 }}>
                        <span
                          className="text-[11px] font-bold font-mono tabular-nums px-1.5 py-0.5 rounded-md inline-block"
                          style={{
                            color: up ? "#00c853" : "#ff4d6a",
                            backgroundColor: up ? "rgba(0,200,83,0.1)" : "rgba(255,77,106,0.1)",
                          }}
                        >
                          {up ? "+" : ""}{pair.change.toFixed(2)}%
                        </span>
                      </div>

                      {/* Volume */}
                      <div className="text-right shrink-0" style={{ width:74, paddingRight:8 }}>
                        <span className="text-[11px] font-mono tabular-nums" style={{ color:"var(--m-fg-4)" }}>
                          {fmtCompact(pair.volume)}
                        </span>
                      </div>

                      {/* Liquidity */}
                      <div className="text-right shrink-0" style={{ width:74, paddingRight:8 }}>
                        <span className="text-[11px] font-mono tabular-nums" style={{ color:"var(--m-fg-4)" }}>
                          {fmtCompact(pair.liquidity)}
                        </span>
                      </div>

                      {/* 7d sparkline */}
                      <div className="flex items-center justify-end shrink-0 pr-3" style={{ width:68 }}>
                        <Spark data={pair.spark7d} color={sparkColor} w={56} h={24} />
                      </div>
                    </div>
                  </div>
                );
              })}

            </div>
          </div>
          </>
        )}

        <div className="h-4" />
      </div>

      {/* ── Price alert sheet (long-press) ── */}
      {alertPair && (
        <MobilePriceAlertSheet
          symbol={alertPair.symbol}
          base={alertPair.base}
          currentPrice={alertPair.price}
          color={alertPair.color}
          initial={alertPair.initial}
          alerts={alerts[alertPair.symbol] ?? []}
          onAdd={addAlert}
          onRemove={(id) => removeAlert(alertPair.symbol, id)}
          onClose={() => setAlertPair(null)}
        />
      )}
    </div>
  );
}
