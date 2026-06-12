import { useEffect, useRef, useState } from "react";
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

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

function generateMockData(): Candle[] {
  const data: Candle[] = [];
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
    });
    price = close;
    if (i > 40) price -= Math.random() * 400;
  }

  // Converge last 20 candles toward 61203
  const offset = 61203.6 - data[data.length - 1].close;
  for (let i = data.length - 20; i < data.length; i++) {
    const r = (i - (data.length - 20)) / 20;
    data[i].open += offset * r;
    data[i].high += offset * r;
    data[i].low += offset * r;
    data[i].close += offset * r;
  }
  return data;
}

function calcMA(data: Candle[], period: number) {
  return data
    .map((d, i) => {
      if (i < period - 1) return null;
      const avg =
        data.slice(i - period + 1, i + 1).reduce((s, x) => s + x.close, 0) / period;
      return { time: d.time, value: Math.round(avg * 10) / 10 };
    })
    .filter(Boolean) as { time: number; value: number }[];
}

const TIMEFRAMES = ["5m", "15m", "1H", "4H", "1D", "1W"];

interface Props {
  livePrice?: number;
  showToolbar?: boolean;
}

export function CandlestickChart({ livePrice = 61203.6, showToolbar = true }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const mockDataRef = useRef<Candle[]>([]);
  const [activeTimeframe, setActiveTimeframe] = useState("1D");

  // Initialize chart once
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: "#000000" },
        textColor: "#555",
        fontFamily: "monospace",
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
      timeScale: { borderColor: "rgba(255,255,255,0.06)", timeVisible: true },
      autoSize: false,
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
    });

    chartRef.current = chart;

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#00c853",
      downColor: "#ff1744",
      borderVisible: false,
      wickUpColor: "#00c853",
      wickDownColor: "#ff1744",
    });
    candleSeriesRef.current = candleSeries;

    const mockData = generateMockData();
    mockDataRef.current = mockData;
    candleSeries.setData(mockData as any);

    candleSeries.createPriceLine({
      price: mockData[mockData.length - 1].close,
      color: "#ff1744",
      lineWidth: 1,
      lineStyle: 2,
      axisLabelVisible: true,
      title: "",
    });

    // Volume
    const volSeries = chart.addSeries(HistogramSeries, {
      color: "#26a69a",
      priceFormat: { type: "volume" },
      priceScaleId: "vol",
    });
    volSeriesRef.current = volSeries;
    chart.priceScale("vol").applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
    volSeries.setData(
      mockData.map((d) => ({
        time: d.time,
        value: Math.random() * 80000 + 5000,
        color: d.close >= d.open ? "rgba(0,200,83,0.35)" : "rgba(255,23,68,0.35)",
      })) as any
    );

    // MA lines
    const ma7 = chart.addSeries(LineSeries, { color: "#f5c518", lineWidth: 1, crosshairMarkerVisible: false, priceLineVisible: false, lastValueVisible: false });
    const ma30 = chart.addSeries(LineSeries, { color: "#2962ff", lineWidth: 1, crosshairMarkerVisible: false, priceLineVisible: false, lastValueVisible: false });
    const ma99 = chart.addSeries(LineSeries, { color: "#9c27b0", lineWidth: 1, crosshairMarkerVisible: false, priceLineVisible: false, lastValueVisible: false });

    ma7.setData(calcMA(mockData, 7) as any);
    ma30.setData(calcMA(mockData, 30) as any);
    ma99.setData(calcMA(mockData, 99) as any);

    chart.timeScale().fitContent();

    // Resize observer
    const ro = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
    };
  }, []);

  // Update last candle with live price
  useEffect(() => {
    const series = candleSeriesRef.current;
    const data = mockDataRef.current;
    if (!series || data.length === 0) return;

    const last = data[data.length - 1];
    const updated: Candle = {
      time: last.time,
      open: last.open,
      high: Math.max(last.high, livePrice),
      low: Math.min(last.low, livePrice),
      close: livePrice,
    };
    mockDataRef.current = [...data.slice(0, -1), updated];
    series.update(updated as any);
  }, [livePrice]);

  return (
    <div className="flex flex-col h-full bg-black">
      {/* Toolbar */}
      {showToolbar && <div className="flex items-center justify-between h-[36px] px-2 border-b border-[#111] shrink-0 text-[11px] text-[#555] bg-[#040404]">
        <div className="flex items-center gap-0.5">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              onClick={() => setActiveTimeframe(tf)}
              className={`px-2 py-0.5 transition-colors ${
                activeTimeframe === tf ? "text-[#f5c518]" : "hover:text-white"
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
      </div>}

      {/* MA legend */}
      {showToolbar && <div className="flex items-center gap-3 px-3 py-[3px] text-[10px] shrink-0 bg-black border-b border-[#111]">
        <span className="text-[#555]">
          O<span className="text-white ml-0.5">61697.8</span>
        </span>
        <span className="text-[#555]">
          H<span className="text-white ml-0.5">62817.6</span>
        </span>
        <span className="text-[#555]">
          L<span className="text-white ml-0.5">60705.4</span>
        </span>
        <span className="text-[#555]">
          C
          <span className="text-[#ff1744] ml-0.5">
            {livePrice.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
          </span>
        </span>
        <div className="w-px h-3 bg-[#222] mx-0.5" />
        <span>
          <span className="text-[#f5c518]">MA 7</span>
          <span className="text-[#f5c518] ml-1">62140.6</span>
        </span>
        <span>
          <span className="text-[#2962ff]">MA 30</span>
          <span className="text-[#aaa] ml-1">72427.8</span>
        </span>
        <span>
          <span className="text-[#9c27b0]">MA 99</span>
          <span className="text-[#aaa] ml-1">72891.9</span>
        </span>
      </div>}

      {/* Chart canvas */}
      <div className="flex-1 relative min-h-0" ref={containerRef}>
        <div className="absolute bottom-8 left-2 text-[#1e1e1e] font-bold text-lg select-none pointer-events-none z-10">
          TV
        </div>
      </div>
    </div>
  );
}
