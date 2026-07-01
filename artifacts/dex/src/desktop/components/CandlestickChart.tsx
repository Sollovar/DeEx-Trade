import { useEffect, useMemo, useRef, useState } from "react";
import {
  createChart,
  CrosshairMode,
  IChartApi,
  ISeriesApi,
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
} from "lightweight-charts";
import { Expand, Settings2, BarChart2 } from "lucide-react";
import { useCandles, type ChartCandle } from "../../hooks/useCandles";
import { useStore } from "../../stores/useStore";
import { useTokenPrices } from "../../hooks/useTokenUSDPrice";

// ── Mock data (fallback when no pairId is provided) ──────────────────────────

function generateMockData(): ChartCandle[] {
  const data: ChartCandle[] = [];
  let price = 82000;
  const start = Math.floor(Date.now() / 1000) - 80 * 24 * 60 * 60;

  for (let i = 0; i < 80; i++) {
    const vol = price * 0.02;
    const open = price + (Math.random() - 0.5) * vol;
    const close = open + (Math.random() - 0.5) * vol;
    const high = Math.max(open, close) + Math.random() * vol * 0.4;
    const low = Math.min(open, close) - Math.random() * vol * 0.4;
    data.push({
      time: start + i * 24 * 60 * 60,
      open: Math.round(open * 10) / 10,
      high: Math.round(high * 10) / 10,
      low: Math.round(low * 10) / 10,
      close: Math.round(close * 10) / 10,
      volume: Math.random() * 80000 + 5000,
    });
    price = close;
    if (i > 40) price -= Math.random() * 400;
  }

  const offset = 61203.6 - data[data.length - 1].close;
  for (let i = data.length - 20; i < data.length; i++) {
    const r = (i - (data.length - 20)) / 20;
    data[i].open  += offset * r;
    data[i].high  += offset * r;
    data[i].low   += offset * r;
    data[i].close += offset * r;
  }
  return data;
}

function calcMA(data: ChartCandle[], period: number) {
  return data
    .map((d, i) => {
      if (i < period - 1) return null;
      const avg =
        data.slice(i - period + 1, i + 1).reduce((s, x) => s + x.close, 0) / period;
      return { time: d.time, value: Math.round(avg * 100000000) / 100000000 };
    })
    .filter(Boolean) as { time: number; value: number }[];
}

function formatChartPrice(value: number): string {
  if (!Number.isFinite(value)) return "—";
  if (value >= 1000) return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (value >= 1) return value.toFixed(2);
  if (value >= 0.01) return value.toFixed(4);
  return value.toFixed(6);
}

function transformCandles(candles: ChartCandle[], unit: "quote" | "usd", factor: number | null): ChartCandle[] {
  if (unit !== "usd" || !factor || factor <= 0) {
    return candles.map((c) => ({ ...c }));
  }

  return candles.map((c) => ({
    ...c,
    open: c.open * factor,
    high: c.high * factor,
    low: c.low * factor,
    close: c.close * factor,
    volume: c.volume * factor,
  }));
}

const TIMEFRAMES = ["5m", "15m", "1H", "4H", "1D", "1W"];
const DEFAULT_BAR_SPACING = 6;

interface Props {
  livePrice?: number;
  showToolbar?: boolean;
  pairId?: string;
  timeframe?: string;
  quoteTokenSymbol?: string;
  quoteTokenAddress?: string;
  network?: string;
  priceUSD?: number;
  priceChange24h?: number;
}

export function CandlestickChart({ livePrice = 0, showToolbar = true, pairId, timeframe, quoteTokenSymbol, quoteTokenAddress, network, priceUSD, priceChange24h }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef     = useRef<IChartApi | null>(null);
  const candleRef    = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volRef       = useRef<ISeriesApi<"Histogram"> | null>(null);
  const ma7Ref       = useRef<ISeriesApi<"Line"> | null>(null);
  const ma30Ref      = useRef<ISeriesApi<"Line"> | null>(null);
  const ma99Ref      = useRef<ISeriesApi<"Line"> | null>(null);
  const candleDataRef = useRef<ChartCandle[]>([]);
  const selectedPair = useStore((state) => state.selectedPair);

  const [activeTimeframe, setActiveTimeframe] = useState("1D");
  const [chartUnit, setChartUnit] = useState<"quote" | "usd">("quote");
  const [displayCandles, setDisplayCandles] = useState<ChartCandle[]>([]);
  const effectiveTf = timeframe ?? activeTimeframe;

  const useMock = !pairId;
  const { candles: realCandles, loading } = useCandles(pairId, effectiveTf);

  const effectiveQuoteSymbol = quoteTokenSymbol ?? selectedPair?.quoteToken?.symbol ?? "QUOTE";
  const effectiveQuoteAddress = quoteTokenAddress ?? selectedPair?.quoteToken?.address ?? "";
  const effectiveNetwork = network ?? selectedPair?.network ?? "bsc";
  const { prices: tokenPrices } = useTokenPrices(effectiveQuoteAddress ? [effectiveQuoteAddress] : [], effectiveNetwork);

  const normalizedQuoteAddress = useMemo(() => {
    if (!effectiveQuoteAddress) return "";
    return effectiveNetwork === "solana" ? effectiveQuoteAddress.trim() : effectiveQuoteAddress.trim().toLowerCase();
  }, [effectiveQuoteAddress, effectiveNetwork]);

  const quoteTokenUsdPrice = useMemo(() => {
    if (!effectiveQuoteAddress) return null;
    const price = tokenPrices[normalizedQuoteAddress];
    return typeof price === "number" && price > 0 ? price : null;
  }, [effectiveQuoteAddress, normalizedQuoteAddress, tokenPrices]);

  const conversionFactor = useMemo(() => {
    if (chartUnit === "quote") return 1;
    if (quoteTokenUsdPrice != null) return quoteTokenUsdPrice;
    if (priceUSD && livePrice > 0) return priceUSD / livePrice;
    return null;
  }, [chartUnit, quoteTokenUsdPrice, priceUSD, livePrice]);

  useEffect(() => {
    if (chartUnit === "usd" && conversionFactor == null) {
      setChartUnit("quote");
    }
  }, [chartUnit, conversionFactor]);

  // ── Init chart (once) ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: "#000000" },
        textColor: "#555",
        fontFamily: "inherit",
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.025)" },
        horzLines: { color: "rgba(255,255,255,0.025)" },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { width: 1, color: "rgba(255,255,255,0.12)", style: 1 },
        horzLine: { width: 1, color: "rgba(255,255,255,0.12)", style: 1 },
      },
      rightPriceScale: { borderColor: "rgba(255,255,255,0.06)" },
      timeScale: {
        borderColor: "rgba(255,255,255,0.06)",
        timeVisible: true,
        barSpacing: DEFAULT_BAR_SPACING,
        minBarSpacing: 1,
      },
      autoSize: false,
      width:  containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
    });
    chartRef.current = chart;

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor:      "#00c853",
      downColor:    "#ff1744",
      borderVisible: false,
      wickUpColor:   "#00c853",
      wickDownColor: "#ff1744",
    });
    candleRef.current = candleSeries;

    const volSeries = chart.addSeries(HistogramSeries, {
      color: "#26a69a",
      priceFormat: { type: "volume" },
      priceScaleId: "vol",
    });
    volRef.current = volSeries;
    chart.priceScale("vol").applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });

    const ma7  = chart.addSeries(LineSeries, { color: "#f5c518", lineWidth: 1, crosshairMarkerVisible: false, priceLineVisible: false, lastValueVisible: false });
    const ma30 = chart.addSeries(LineSeries, { color: "#2962ff", lineWidth: 1, crosshairMarkerVisible: false, priceLineVisible: false, lastValueVisible: false });
    const ma99 = chart.addSeries(LineSeries, { color: "#9c27b0", lineWidth: 1, crosshairMarkerVisible: false, priceLineVisible: false, lastValueVisible: false });
    ma7Ref.current  = ma7;
    ma30Ref.current = ma30;
    ma99Ref.current = ma99;

    const ro = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({
          width:  containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current  = null;
      candleRef.current = null;
      volRef.current    = null;
      ma7Ref.current    = null;
      ma30Ref.current   = null;
      ma99Ref.current   = null;
    };
  }, []);

  // ── Load mock data when no pairId ──────────────────────────────────────────
  useEffect(() => {
    if (!useMock) return;
    const series = candleRef.current;
    const vol    = volRef.current;
    if (!series || !vol) return;

    const mockData = generateMockData();
    const transformed = transformCandles(mockData, chartUnit, conversionFactor);
    candleDataRef.current = transformed;
    setDisplayCandles(transformed);
    series.setData(transformed as any);
    vol.setData(transformed.map((d) => ({
      time:  d.time,
      value: d.volume,
      color: d.close >= d.open ? "rgba(0,200,83,0.35)" : "rgba(255,23,68,0.35)",
    })) as any);
    ma7Ref.current?.setData(calcMA(transformed, 7) as any);
    ma30Ref.current?.setData(calcMA(transformed, 30) as any);
    ma99Ref.current?.setData(calcMA(transformed, 99) as any);
    chartRef.current?.applyOptions({ timeScale: { barSpacing: DEFAULT_BAR_SPACING, minBarSpacing: 1 } });
    chartRef.current?.timeScale().scrollToRealTime();
  }, [useMock, chartUnit, conversionFactor]);

  // ── Load real candles when pairId / timeframe changes ─────────────────────
  useEffect(() => {
    if (useMock || realCandles.length === 0) return;
    const series = candleRef.current;
    const vol    = volRef.current;
    if (!series || !vol) return;

    const transformed = transformCandles(realCandles, chartUnit, conversionFactor);
    setDisplayCandles(transformed);
    series.setData(transformed as any);
    vol.setData(transformed.map((c) => ({
      time:  c.time,
      value: c.volume > 0 ? c.volume : 0,
      color: c.close >= c.open ? "rgba(0,200,83,0.35)" : "rgba(255,23,68,0.35)",
    })) as any);
    ma7Ref.current?.setData(calcMA(transformed, 7) as any);
    ma30Ref.current?.setData(calcMA(transformed, 30) as any);
    ma99Ref.current?.setData(calcMA(transformed, 99) as any);
    candleDataRef.current = transformed;
    chartRef.current?.applyOptions({ timeScale: { barSpacing: DEFAULT_BAR_SPACING, minBarSpacing: 1 } });
    chartRef.current?.timeScale().scrollToRealTime();
  }, [realCandles, useMock, chartUnit, conversionFactor]);

  // ── Live price tick — update last candle ───────────────────────────────────
  useEffect(() => {
    const series = candleRef.current;
    const data   = candleDataRef.current;
    if (!series || data.length === 0 || livePrice <= 0) return;

    const last = data[data.length - 1];
    const displayValue = chartUnit === "usd" && conversionFactor != null ? livePrice * conversionFactor : livePrice;
    const next = {
      time:  last.time as any,
      open:  last.open,
      high:  Math.max(last.high, displayValue),
      low:   Math.min(last.low, displayValue),
      close: displayValue,
    };
    series.update(next);
    candleDataRef.current = data.slice(0, -1).concat([{ ...last, open: last.open, high: next.high, low: next.low, close: next.close }]);
    setDisplayCandles(candleDataRef.current);
  }, [livePrice, chartUnit, conversionFactor]);

  const lastCandle = displayCandles[displayCandles.length - 1];
  const previousCandle = displayCandles.length > 1 ? displayCandles[displayCandles.length - 2] : null;
  let candleChange = 0;
  let candleChangePct = 0;

  if (lastCandle && previousCandle) {
    candleChange = lastCandle.close - previousCandle.close;
    candleChangePct = previousCandle.close !== 0 ? (candleChange / previousCandle.close) * 100 : 0;
  }

  const isChangePositive = candleChange >= 0;
  const changeColor = isChangePositive ? "#00c853" : "#ff1744";
  const changePrefix = isChangePositive ? "+" : "";
  const usdAvailable = chartUnit === "quote" || conversionFactor != null;

  return (
    <div className="flex flex-col h-full bg-black relative">
      {/* Toolbar */}
      {showToolbar && (
        <div className="flex items-center justify-between h-[36px] px-2 border-b border-[#111] shrink-0 text-[11px] text-[#555] bg-[#040404]">
          <div className="flex items-center gap-0.5">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf}
                onClick={() => setActiveTimeframe(tf.toLowerCase().replace("h", "h"))}
                className={`px-2 py-0.5 transition-colors ${
                  activeTimeframe === tf.toLowerCase().replace("h", "h") ? "text-[#f5c518]" : "hover:text-white"
                }`}
              >
                {tf}
              </button>
            ))}
            <div className="w-px h-3.5 bg-[#222] mx-1" />
            <button className="p-1 hover:text-white"><BarChart2 className="w-3.5 h-3.5" /></button>
            <button className="px-1.5 hover:text-white">Indicators</button>
            <button className="p-1 hover:text-white"><Settings2 className="w-3.5 h-3.5" /></button>
          </div>
          <div className="flex items-center gap-2">
            <span className="cursor-pointer hover:text-white flex items-center gap-0.5">
              Last Price <span className="text-[9px]">▾</span>
            </span>
            <div className="w-px h-3.5 bg-[#222]" />
            <div className="flex gap-3">
              <span className="text-[#f5c518] border-b border-[#f5c518] py-[9px] cursor-pointer">Chart</span>
              <span className="hover:text-white cursor-pointer py-[9px]">Depth</span>
              <span className="hover:text-white cursor-pointer py-[9px]">Details</span>
            </div>
            <button className="p-1 hover:text-white"><Expand className="w-3.5 h-3.5" /></button>
          </div>
        </div>
      )}

      {/* MA legend */}
      {showToolbar && (
        <div className="flex items-center gap-3 px-3 py-[3px] text-[10px] shrink-0 bg-black border-b border-[#111]">
          <span className="text-[#555]">
            C <span className="text-[#ff1744] ml-0.5">
              {livePrice > 0 ? livePrice.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 8 }) : "—"}
            </span>
          </span>
          {loading && <span className="text-[#444] italic">loading…</span>}
          <div className="w-px h-3 bg-[#222] mx-0.5" />
          <span><span className="text-[#f5c518]">MA 7</span></span>
          <span><span className="text-[#2962ff]">MA 30</span></span>
          <span><span className="text-[#9c27b0]">MA 99</span></span>
        </div>
      )}

      {/* Loading overlay */}
      {loading && !showToolbar && (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
          <span className="text-[#444] text-[11px]">loading chart…</span>
        </div>
      )}

      {/* Chart canvas */}
      {!loading && candleDataRef.current.length === 0 && !useMock && (
        <div className="absolute inset-0 z-10 flex items-center justify-center px-6 text-center" style={{ color: "#6b7280" }}>
          <div>
            <div className="text-[12px] font-semibold mb-1" style={{ color: "#f5c518" }}>No trades yet</div>
            <div className="text-[11px]">This pair has not generated exchange candles yet. Trade it to start seeing the backend chart.</div>
          </div>
        </div>
      )}
      <div className="flex-1 relative min-h-0" ref={containerRef}>
        {displayCandles.length > 0 && (
          <div className="absolute left-2 top-2 z-20 pointer-events-none text-[11px] text-[#9ca3af]">
            <div className="flex items-baseline gap-2">
              <span className="text-[15px] font-semibold text-white">{formatChartPrice(lastCandle?.close ?? 0)}</span>
              <span className="font-semibold" style={{ color: changeColor }}>
                {changePrefix}{formatChartPrice(candleChange)} ({candleChangePct.toFixed(2)}%)
              </span>
            </div>
            <div className="mt-1 flex items-center gap-3">
              <span>H {formatChartPrice(lastCandle?.high ?? 0)}</span>
              <span>L {formatChartPrice(lastCandle?.low ?? 0)}</span>
            </div>
          </div>
        )}

        <div className="absolute right-2 top-2 z-20 pointer-events-auto">
          <div className="flex items-center rounded-full border border-white/10 bg-black/70 p-[3px] backdrop-blur-sm">
            <button
              onClick={() => setChartUnit("quote")}
              className="rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all"
              style={{
                backgroundColor: chartUnit === "quote" ? "#f5c518" : "transparent",
                color: chartUnit === "quote" ? "#000" : "#cbd5e1",
              }}
            >
              Quote
            </button>
            <button
              onClick={() => usdAvailable && setChartUnit("usd")}
              className="rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all"
              style={{
                backgroundColor: chartUnit === "usd" ? "#f5c518" : "transparent",
                color: chartUnit === "usd" ? "#000" : usdAvailable ? "#cbd5e1" : "#6b7280",
                opacity: usdAvailable ? 1 : 0.5,
              }}
              disabled={!usdAvailable}
            >
              USD
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
