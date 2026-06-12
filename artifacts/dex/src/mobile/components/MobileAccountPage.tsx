import { useState } from "react";
import { TrendingUp, TrendingDown, Copy, ExternalLink, RefreshCw, ArrowDownLeft, ArrowUpRight } from "lucide-react";

const MOCK_BALANCES = [
  { token: "USDT",  name: "Tether",          amount: 4_823.50,  usdValue: 4_823.50,  color: "#26a17b", initial: "U" },
  { token: "BTC",   name: "Bitcoin",          amount: 0.08312,   usdValue: 5_095.23,  color: "#f7931a", initial: "B" },
  { token: "ETH",   name: "Ethereum",         amount: 1.4420,    usdValue: 2_388.18,  color: "#627eea", initial: "E" },
  { token: "BNB",   name: "BNB",             amount: 3.201,     usdValue: 1_918.84,  color: "#f3ba2f", initial: "B" },
  { token: "SOL",   name: "Solana",           amount: 12.50,     usdValue: 813.63,    color: "#9945ff", initial: "S" },
];

const TOTAL_PORTFOLIO = MOCK_BALANCES.reduce((s, b) => s + b.usdValue, 0);

const MOCK_HISTORY = [
  { id: "t1", type: "buy",  symbol: "BTC/USDT",  price: 60_420.0, qty: 0.05, total: 3_021.00,  time: "Jun 10 · 09:14", status: "Filled" },
  { id: "t2", type: "sell", symbol: "ETH/USDT",  price: 1_680.0,  qty: 0.80, total: 1_344.00,  time: "Jun 10 · 09:10", status: "Filled" },
  { id: "t3", type: "buy",  symbol: "SOL/USDT",  price: 65.40,    qty: 10,   total: 654.00,    time: "Jun 10 · 08:55", status: "Filled" },
  { id: "t4", type: "sell", symbol: "BTC/USDT",  price: 62_100.0, qty: 0.04, total: 2_484.00,  time: "Jun 09 · 22:30", status: "Cancelled" },
  { id: "t5", type: "buy",  symbol: "ETH/USDT",  price: 1_590.0,  qty: 1.20, total: 1_908.00,  time: "Jun 09 · 18:14", status: "Filled" },
  { id: "t6", type: "buy",  symbol: "BNB/USDT",  price: 597.0,    qty: 2.0,  total: 1_194.00,  time: "Jun 09 · 14:02", status: "Filled" },
];

type AccountTab = "Assets" | "History";

function fmtUsd(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function PnlBadge({ pct }: { pct: number }) {
  const up = pct >= 0;
  return (
    <span
      className="text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5"
      style={{
        color: up ? "#00c853" : "#ff1744",
        backgroundColor: up ? "rgba(0,200,83,0.12)" : "rgba(255,23,68,0.12)",
      }}
    >
      {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {up ? "+" : ""}{pct.toFixed(2)}%
    </span>
  );
}

interface Props {
  onConnectWallet?: () => void;
}

export function MobileAccountPage({ onConnectWallet }: Props) {
  const [tab, setTab] = useState<AccountTab>("Assets");
  const [copied, setCopied] = useState(false);

  const mockAddr = "0x3fA8...c19B";

  function copyAddr() {
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="flex flex-col flex-1 overflow-y-auto" style={{ paddingBottom: 72 }}>

      {/* ── Portfolio card ── */}
      <div
        className="mx-3 mt-3 mb-2 rounded-2xl p-4 flex flex-col gap-3"
        style={{
          background: "linear-gradient(135deg, rgba(245,197,24,0.10) 0%, rgba(245,197,24,0.04) 100%)",
          border: "1px solid rgba(245,197,24,0.18)",
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold tracking-widest uppercase mb-1" style={{ color: "var(--m-fg-4)" }}>
              Total Portfolio
            </p>
            <p className="text-[28px] font-bold leading-none" style={{ color: "var(--m-fg)" }}>
              ${fmtUsd(TOTAL_PORTFOLIO)}
            </p>
          </div>
          <PnlBadge pct={3.41} />
        </div>

        {/* Wallet address row */}
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
            style={{ backgroundColor: "rgba(245,197,24,0.15)", border: "1px solid rgba(245,197,24,0.3)" }}
          >
            <div className="w-2.5 h-2.5 rounded-full bg-[#f5c518]" />
          </div>
          <span className="font-mono text-[12px]" style={{ color: "var(--m-fg-3)" }}>{mockAddr}</span>
          <button
            onClick={copyAddr}
            className="w-6 h-6 flex items-center justify-center rounded-lg transition-all active:scale-90"
            style={{ backgroundColor: "var(--m-bg-3)", color: copied ? "#f5c518" : "var(--m-fg-4)" }}
          >
            <Copy className="w-3 h-3" />
          </button>
          <button
            className="w-6 h-6 flex items-center justify-center rounded-lg transition-all active:scale-90 ml-auto"
            style={{ backgroundColor: "var(--m-bg-3)", color: "var(--m-fg-4)" }}
          >
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>

        {/* Quick actions */}
        <div className="flex gap-2 mt-1">
          <button
            className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl text-[12px] font-bold transition-all active:scale-[0.97]"
            style={{ backgroundColor: "#f5c518", color: "#000" }}
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            Deposit
          </button>
          <button
            className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl text-[12px] font-bold transition-all active:scale-[0.97]"
            style={{ backgroundColor: "var(--m-bg-3)", color: "var(--m-fg-2)" }}
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            Withdraw
          </button>
          <button
            className="w-9 h-9 flex items-center justify-center rounded-xl transition-all active:scale-90"
            style={{ backgroundColor: "var(--m-bg-3)", color: "var(--m-fg-4)" }}
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Allocation mini bar ── */}
      <div className="mx-3 mb-3 flex h-1.5 rounded-full overflow-hidden gap-px">
        {MOCK_BALANCES.map((b) => (
          <div
            key={b.token}
            style={{
              flex: b.usdValue / TOTAL_PORTFOLIO,
              backgroundColor: b.color,
            }}
          />
        ))}
      </div>

      {/* ── Tabs ── */}
      <div
        className="flex mx-3 mb-2 rounded-xl p-0.5"
        style={{ backgroundColor: "var(--m-bg-2)" }}
      >
        {(["Assets", "History"] as AccountTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 h-8 rounded-lg text-[13px] font-semibold transition-all"
            style={{
              backgroundColor: tab === t ? "var(--m-bg-4)" : "transparent",
              color: tab === t ? "var(--m-fg)" : "var(--m-fg-4)",
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── Assets ── */}
      {tab === "Assets" && (
        <div className="flex flex-col gap-1 px-3">
          {MOCK_BALANCES.map((b) => {
            const allocPct = ((b.usdValue / TOTAL_PORTFOLIO) * 100).toFixed(1);
            return (
              <div
                key={b.token}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                style={{ backgroundColor: "var(--m-bg-2)" }}
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0"
                  style={{ backgroundColor: b.color + "25", border: `1.5px solid ${b.color}50` }}
                >
                  <span style={{ color: b.color }}>{b.initial}</span>
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-bold text-[13px]" style={{ color: "var(--m-fg)" }}>{b.token}</span>
                    <span className="font-bold text-[13px] font-mono" style={{ color: "var(--m-fg)" }}>
                      ${fmtUsd(b.usdValue)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono" style={{ color: "var(--m-fg-4)" }}>
                      {b.amount.toLocaleString("en-US", { maximumFractionDigits: 6 })} {b.token}
                    </span>
                    <span className="text-[10px]" style={{ color: "var(--m-fg-5)" }}>{allocPct}%</span>
                  </div>
                  {/* alloc bar */}
                  <div className="mt-1.5 h-[2px] rounded-full overflow-hidden" style={{ backgroundColor: "var(--m-bg-4)" }}>
                    <div
                      className="h-full rounded-full"
                      style={{ width: allocPct + "%", backgroundColor: b.color }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── History ── */}
      {tab === "History" && (
        <div className="flex flex-col gap-1 px-3">
          {MOCK_HISTORY.map((h) => {
            const isBuy = h.type === "buy";
            const isFilled = h.status === "Filled";
            return (
              <div
                key={h.id}
                className="px-3 py-2.5 rounded-xl"
                style={{ backgroundColor: "var(--m-bg-2)" }}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[13px]" style={{ color: "var(--m-fg)" }}>{h.symbol}</span>
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                      style={{
                        color: isBuy ? "#00c853" : "#ff1744",
                        backgroundColor: isBuy ? "rgba(0,200,83,0.12)" : "rgba(255,23,68,0.12)",
                      }}
                    >
                      {isBuy ? "Buy" : "Sell"}
                    </span>
                    <span
                      className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                      style={{
                        color: isFilled ? "#00c853" : "var(--m-fg-4)",
                        backgroundColor: isFilled ? "rgba(0,200,83,0.1)" : "var(--m-bg-4)",
                      }}
                    >
                      {h.status}
                    </span>
                  </div>
                  <span className="text-[10px]" style={{ color: "var(--m-fg-5)" }}>{h.time}</span>
                </div>
                <div className="flex items-center gap-4">
                  <div>
                    <div className="text-[10px]" style={{ color: "var(--m-fg-4)" }}>Price</div>
                    <div className="text-[12px] font-mono font-semibold" style={{ color: "var(--m-fg-2)" }}>
                      {h.price.toLocaleString("en-US")}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px]" style={{ color: "var(--m-fg-4)" }}>Qty</div>
                    <div className="text-[12px] font-mono font-semibold" style={{ color: "var(--m-fg-2)" }}>{h.qty}</div>
                  </div>
                  <div>
                    <div className="text-[10px]" style={{ color: "var(--m-fg-4)" }}>Total</div>
                    <div className="text-[12px] font-mono font-semibold" style={{ color: "var(--m-fg-2)" }}>
                      ${fmtUsd(h.total)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
