import { useState } from "react";
import { CandlestickChart } from "../../desktop/components/CandlestickChart";
import { Maximize2 } from "lucide-react";

interface Props {
  livePrice: number;
}

const TIMEFRAMES = ["5m", "1h", "D"];

const DrawingTools = () => (
  <div className="absolute left-0 top-0 bottom-0 w-9 flex flex-col items-center pt-8 gap-3 z-10 pointer-events-none">
    {[
      <svg key="cursor" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3"><line x1="8" y1="1" x2="8" y2="15"/><line x1="1" y1="8" x2="15" y2="8"/></svg>,
      <svg key="line" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3"><line x1="2" y1="14" x2="14" y2="2"/></svg>,
      <svg key="channel" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3"><line x1="2" y1="5" x2="14" y2="5"/><line x1="2" y1="9" x2="14" y2="9"/><line x1="2" y1="13" x2="14" y2="13"/></svg>,
      <svg key="nodes" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3"><circle cx="4" cy="8" r="2"/><circle cx="12" cy="4" r="2"/><circle cx="12" cy="12" r="2"/><line x1="6" y1="8" x2="10" y2="4"/><line x1="6" y1="8" x2="10" y2="12"/></svg>,
      <svg key="scatter" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3"><circle cx="4" cy="12" r="1.5"/><circle cx="7" cy="8" r="1.5"/><circle cx="10" cy="10" r="1.5"/><circle cx="13" cy="4" r="1.5"/></svg>,
      <svg key="pencil" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3"><path d="M2 14L5 11L12 4L14 6L7 13L2 14Z"/><line x1="10" y1="5" x2="12" y2="7"/></svg>,
      <svg key="text" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3"><line x1="3" y1="4" x2="13" y2="4"/><line x1="8" y1="4" x2="8" y2="13"/></svg>,
      <svg key="smiley" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3"><circle cx="8" cy="8" r="6"/><path d="M5.5 9.5C5.5 9.5 6.5 11 8 11C9.5 11 10.5 9.5 10.5 9.5"/><circle cx="6" cy="7" r="0.8" fill="currentColor"/><circle cx="10" cy="7" r="0.8" fill="currentColor"/></svg>,
      <svg key="ruler" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3"><rect x="1" y="5" width="14" height="6" rx="1"/><line x1="4" y1="5" x2="4" y2="8"/><line x1="7" y1="5" x2="7" y2="7"/><line x1="10" y1="5" x2="10" y2="8"/><line x1="13" y1="5" x2="13" y2="7"/></svg>,
      <svg key="plus" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3"><circle cx="8" cy="8" r="6"/><line x1="8" y1="5" x2="8" y2="11"/><line x1="5" y1="8" x2="11" y2="8"/></svg>,
    ].map((icon, i) => (
      <button key={i} className="pointer-events-auto transition-colors" style={{ color: "var(--m-fg-5)" }}>
        {icon}
      </button>
    ))}
  </div>
);

const ALButtons = () => (
  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-1.5 z-10">
    <button className="w-6 h-6 rounded-md bg-[#3366ff] text-white text-[11px] font-bold flex items-center justify-center">A</button>
    <button className="w-6 h-6 rounded-md bg-[#3366ff] text-white text-[11px] font-bold flex items-center justify-center">L</button>
  </div>
);

export function MobileChartView({ livePrice }: Props) {
  const [tf, setTf] = useState("1h");

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      {/* Toolbar */}
      <div
        className="flex items-center h-[40px] px-2.5 shrink-0 gap-1.5"
        style={{ backgroundColor: "var(--m-bg)", borderBottom: "1px solid var(--m-bdr)" }}
      >
        {/* Timeframe buttons — flat, no box */}
        <div className="flex items-center gap-0.5">
          {TIMEFRAMES.map((t) => (
            <button
              key={t}
              onClick={() => setTf(t)}
              className="px-2 h-6 text-[12px] font-semibold transition-all rounded-md"
              style={{
                color: tf === t ? "var(--m-fg)" : "var(--m-fg-4)",
                backgroundColor: tf === t ? "var(--m-bg-3)" : "transparent",
              }}
            >
              {t}
            </button>
          ))}
          <button
            className="px-1 h-6 transition-colors"
            style={{ color: "var(--m-fg-4)" }}
          >
            <svg width="9" height="6" viewBox="0 0 9 6" fill="currentColor"><path d="M0 0.5L4.5 5.5L9 0.5H0Z"/></svg>
          </button>
        </div>

        <div className="w-px h-4" style={{ backgroundColor: "var(--m-bdr)" }} />

        {/* Chart type — flat */}
        <button
          className="flex items-center h-6 px-1.5 transition-opacity hover:opacity-70"
          style={{ color: "var(--m-fg-3)" }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2">
            <rect x="2" y="3" width="3" height="7" rx="0.5" fill="currentColor" stroke="none"/>
            <line x1="3.5" y1="1" x2="3.5" y2="3"/><line x1="3.5" y1="10" x2="3.5" y2="13"/>
            <rect x="9" y="4" width="3" height="5" rx="0.5"/>
            <line x1="10.5" y1="2" x2="10.5" y2="4"/><line x1="10.5" y1="9" x2="10.5" y2="12"/>
          </svg>
        </button>

        {/* Indicators — flat */}
        <button
          className="flex items-center gap-1 h-6 px-1.5 text-[11px] font-semibold transition-opacity hover:opacity-70"
          style={{ color: "var(--m-fg-3)" }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2">
            <path d="M1 9 L4 6 L7 8 L11 3"/>
            <path d="M1 7 L4 4 L7 6 L11 1" strokeDasharray="1.5 1"/>
          </svg>
          Ind.
        </button>

        <div className="ml-auto">
          <button
            className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
            style={{ color: "var(--m-fg-4)" }}
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Chart area */}
      <div className="relative flex-1 min-h-0 overflow-hidden" style={{ minHeight: 240 }}>
        <DrawingTools />
        <div className="absolute inset-0 pl-9">
          <CandlestickChart livePrice={livePrice} showToolbar={false} />
        </div>
        <ALButtons />
      </div>

      {/* Chart footer */}
      <div
        className="flex items-center h-[32px] px-3 shrink-0 gap-3 text-[11px]"
        style={{ backgroundColor: "var(--m-bg)", borderTop: "1px solid var(--m-bdr)", color: "var(--m-fg-4)" }}
      >
        <button className="flex items-center gap-1 hover:opacity-80">
          Date Range <svg width="8" height="5" viewBox="0 0 8 5" fill="currentColor"><path d="M0 0L4 5L8 0H0Z"/></svg>
        </button>
        <div className="w-px h-3" style={{ backgroundColor: "var(--m-bdr)" }} />
        <span className="font-mono text-[10px]">
          {new Date().toLocaleTimeString("en-US", { hour12: false })} UTC+1
        </span>
        <div className="ml-auto flex items-center gap-2">
          <button className="hover:opacity-80">%</button>
          <button className="hover:opacity-80">log</button>
          <button className="text-[#f5c518] font-semibold">auto</button>
        </div>
      </div>
    </div>
  );
}
