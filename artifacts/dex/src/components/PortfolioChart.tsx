import { useState, useMemo } from "react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import { useCoinStatsChart, type ChartRange } from "@/hooks/useCoinStatsChart";
import type { Network } from "@/hooks/useConnectedNetwork";

const RANGES: ChartRange[] = ["24h", "1w", "1m", "3m", "6m", "1y", "all"];

interface Props {
  address: string;
  network: Network;
  compact?: boolean;
}

function fmtTick(ts: number, range: ChartRange): string {
  const d = new Date(ts);
  if (range === "24h") {
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
  }
  if (range === "1w") {
    return d.toLocaleDateString("en-US", { weekday: "short" });
  }
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fmtTooltipDate(ts: number, range: ChartRange): string {
  const d = new Date(ts);
  if (range === "24h") {
    return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

interface TooltipPayload {
  timestamp: number;
  usd: number;
}

function ChartTooltip({ active, payload, range }: { active?: boolean; payload?: { payload: TooltipPayload }[]; range: ChartRange }) {
  if (!active || !payload?.length) return null;
  const pt = payload[0].payload;
  return (
    <div style={{
      background: "#111",
      border: "1px solid #222",
      borderRadius: 8,
      padding: "6px 10px",
      pointerEvents: "none",
    }}>
      <p style={{ fontSize: 10, color: "#555", margin: 0, marginBottom: 3 }}>
        {fmtTooltipDate(pt.timestamp, range)}
      </p>
      <p style={{ color: "white", fontWeight: 700, fontSize: 13, margin: 0, fontVariantNumeric: "tabular-nums" }}>
        ${pt.usd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </p>
    </div>
  );
}

export function PortfolioChart({ address, network, compact = false }: Props) {
  const [range, setRange] = useState<ChartRange>("1m");
  const { points, loading, error } = useCoinStatsChart(address, network, range);

  const isUp = useMemo(() => {
    if (points.length < 2) return true;
    return points[points.length - 1].usd >= points[0].usd;
  }, [points]);

  const color = isUp ? "#22c55e" : "#ef4444";
  const gradientId = isUp ? "pg-up" : "pg-down";
  const chartH = compact ? 110 : 150;

  return (
    <div>
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 2,
        padding: compact ? "6px 12px 4px" : "8px 8px 4px",
      }}>
        {RANGES.map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            style={{
              padding: compact ? "2px 7px" : "2px 7px",
              fontSize: 11,
              fontWeight: 600,
              borderRadius: 6,
              border: "none",
              cursor: "pointer",
              backgroundColor: range === r
                ? (isUp ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)")
                : "transparent",
              color: range === r ? color : "#555",
              transition: "all 0.12s",
            }}
          >
            {r}
          </button>
        ))}
        {loading && (
          <span style={{ marginLeft: "auto", paddingRight: 4, fontSize: 10, color: "#444" }}>
            loading…
          </span>
        )}
      </div>

      {error ? (
        <div style={{ height: chartH, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 12, color: "#555" }}>Chart unavailable</span>
        </div>
      ) : points.length === 0 && !loading ? (
        <div style={{ height: chartH, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 12, color: "#555" }}>No chart data for this period</span>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={chartH}>
          <AreaChart
            data={points}
            margin={{ top: 4, right: compact ? 12 : 8, bottom: 0, left: 0 }}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={color} stopOpacity={0.22} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="timestamp"
              tickFormatter={(ts) => fmtTick(ts, range)}
              tick={{ fontSize: 9, fill: "#444" }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
              minTickGap={50}
            />
            <YAxis hide domain={["auto", "auto"]} />
            <Tooltip
              content={(props) => (
                <ChartTooltip
                  active={props.active}
                  payload={props.payload as { payload: TooltipPayload }[] | undefined}
                  range={range}
                />
              )}
            />
            <Area
              type="monotone"
              dataKey="usd"
              stroke={color}
              strokeWidth={1.5}
              fill={`url(#${gradientId})`}
              dot={false}
              activeDot={{ r: 3, fill: color, strokeWidth: 0 }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
