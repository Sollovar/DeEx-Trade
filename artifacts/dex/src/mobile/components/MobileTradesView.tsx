import { useEffect, useRef, useState } from "react";
import { ExternalLink } from "lucide-react";
import { LiveMarketState } from "@/hooks/useLiveMarket";

interface Props {
  market: LiveMarketState;
}

interface Trade {
  id: number;
  price: number;
  size: number;
  isBuy: boolean;
  time: string;
}

function fmtPrice(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
}

function fmtSize(n: number) {
  if (n >= 10000) return (n / 1000).toFixed(2) + "K";
  if (n >= 1000)  return n.toFixed(0);
  return n.toFixed(2);
}

function nowTime() {
  return new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

const ROW_H = 34;
let tradeIdCounter = 0;

function makeTrade(basePrice: number): Trade {
  const price = parseFloat((basePrice + (Math.random() - 0.5) * 4).toFixed(3));
  const size   = parseFloat((Math.random() * 500 + 0.1).toFixed(2));
  return { id: ++tradeIdCounter, price, size, isBuy: Math.random() > 0.45, time: nowTime() };
}

export function MobileTradesView({ market }: Props) {
  const [trades, setTrades] = useState<Trade[]>(() =>
    Array.from({ length: 28 }, (_, i) => {
      const t = makeTrade(market.price);
      t.time = new Date(Date.now() - i * 950).toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
      return t;
    })
  );
  const priceRef = useRef(market.price);
  priceRef.current = market.price;

  const base = "BTC";

  useEffect(() => {
    const id = setInterval(() => {
      setTrades((prev) => [makeTrade(priceRef.current), ...prev.slice(0, 59)]);
    }, 1100);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ backgroundColor: "var(--m-bg)" }}>
      <div
        className="grid px-4 text-[11px] font-semibold shrink-0"
        style={{ gridTemplateColumns: "1fr 1fr 1fr", height: 34, color: "var(--m-fg-4)", borderBottom: "1px solid var(--m-bdr-subtle)" }}
      >
        <div className="flex items-center">Price</div>
        <div className="flex items-center justify-end">Size ({base})</div>
        <div className="flex items-center justify-end">Time</div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {trades.map((t) => (
          <div
            key={t.id}
            className="grid px-4 transition-colors"
            style={{ gridTemplateColumns: "1fr 1fr 1fr", height: ROW_H, borderBottom: "1px solid var(--m-bg-1)" }}
          >
            <div
              className="flex items-center font-mono tabular-nums text-[13px] font-medium"
              style={{ color: t.isBuy ? "#00c853" : "#ff1744" }}
            >
              {fmtPrice(t.price)}
            </div>
            <div className="flex items-center justify-end font-mono tabular-nums text-[12px]" style={{ color: "var(--m-fg-3)" }}>
              {fmtSize(t.size)}
            </div>
            <div className="flex items-center justify-end gap-1.5">
              <span className="font-mono tabular-nums text-[12px]" style={{ color: "var(--m-fg-4)" }}>{t.time}</span>
              <ExternalLink className="w-3 h-3 shrink-0" style={{ color: "var(--m-fg-5)" }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
