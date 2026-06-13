import { useState } from "react";
import { TrendingUp, TrendingDown, Wallet, RefreshCw, RotateCw } from "lucide-react";
import { DynamicConnectButton, useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { useConnectedNetwork } from "@/hooks/useConnectedNetwork";
import { useWalletPortfolio } from "@/hooks/useWalletPortfolio";

/* ── Skeleton loader ────────────────────────────────────────────── */
function Skeleton({ w, h }: { w: number | string; h: number }) {
  return (
    <div
      className="animate-pulse rounded-xl"
      style={{ width: w, height: h, backgroundColor: "var(--m-bg-3)" }}
    />
  );
}

/* ── No wallet state ────────────────────────────────────────────── */
function NoWalletState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-5 px-6" style={{ paddingBottom: 80 }}>
      <div
        className="w-24 h-24 rounded-full flex items-center justify-center"
        style={{ background: "rgba(245,197,24,0.08)", border: "2px solid rgba(245,197,24,0.2)" }}
      >
        <Wallet className="w-10 h-10" style={{ color: "#f5c518" }} />
      </div>
      <div className="text-center">
        <p className="text-[20px] font-bold mb-2" style={{ color: "var(--m-fg)" }}>No wallet connected</p>
        <p className="text-[13px] leading-relaxed" style={{ color: "var(--m-fg-4)" }}>
          Connect your wallet to view your portfolio balance and asset breakdown.
        </p>
      </div>
      <DynamicConnectButton buttonContainerClassName="nexus-connect-wrap">
        <button
          style={{
            backgroundColor: "#f5c518", color: "#000", fontWeight: 700,
            fontSize: 15, paddingLeft: 32, paddingRight: 32, height: 50,
            borderRadius: 14, display: "flex", alignItems: "center",
            border: "none", cursor: "pointer", gap: 8,
          }}
        >
          <Wallet className="w-5 h-5" />
          Connect Wallet
        </button>
      </DynamicConnectButton>
    </div>
  );
}

/* ── Main page ─────────────────────────────────────────────────── */
export function MobilePortfolioPage() {
  const { primaryWallet } = useDynamicContext();
  const network = useConnectedNetwork();
  const address = primaryWallet?.address ?? null;

  const { balance, balanceUsd, changePercent, symbol, loading, error } =
    useWalletPortfolio(address, network);

  const [refreshKey, setRefreshKey] = useState(0);

  if (!primaryWallet) return <NoWalletState />;

  const isUp     = changePercent >= 0;
  const absChange = Math.abs(changePercent);
  const addr      = address ?? "";
  const shortAddr = addr.slice(0, 6) + "…" + addr.slice(-4);

  const usdNum = parseFloat(balanceUsd);
  const usdFormatted = isNaN(usdNum)
    ? "—"
    : usdNum.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="flex-1 min-h-0 overflow-y-auto" style={{ paddingBottom: 76 }}>

      {/* ── Hero card ── */}
      <div
        className="mx-3 mt-4 rounded-3xl overflow-hidden"
        style={{
          background: "linear-gradient(145deg, var(--m-bg-2) 0%, var(--m-bg-1) 100%)",
          border: "1px solid var(--m-bdr)",
        }}
      >
        {/* Top row: address + refresh */}
        <div className="flex items-center justify-between px-5 pt-5 pb-1">
          <div className="flex items-center gap-2">
            <div
              style={{
                width: 8, height: 8, borderRadius: "50%",
                backgroundColor: "#22c55e", flexShrink: 0,
              }}
            />
            <span style={{ fontSize: 12, color: "var(--m-fg-4)", fontWeight: 600 }}>
              {shortAddr}
            </span>
          </div>
          <button
            onClick={() => setRefreshKey(k => k + 1)}
            className="w-8 h-8 flex items-center justify-center rounded-xl active:opacity-60"
            style={{ backgroundColor: "var(--m-bg-3)", color: "var(--m-fg-4)" }}
          >
            {loading
              ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              : <RotateCw  className="w-3.5 h-3.5" />
            }
          </button>
        </div>

        {/* Balance hero */}
        <div className="px-5 pt-3 pb-5">
          <p style={{ fontSize: 12, color: "var(--m-fg-5)", fontWeight: 600, marginBottom: 6 }}>
            Total Balance
          </p>

          {loading ? (
            <div className="flex flex-col gap-3 mt-1">
              <Skeleton w="60%" h={44} />
              <Skeleton w="40%" h={20} />
            </div>
          ) : error ? (
            <p style={{ fontSize: 14, color: "var(--m-fg-5)" }}>Unable to fetch balance</p>
          ) : (
            <>
              {/* USD total */}
              <div className="flex items-end gap-2 mb-1">
                <span
                  style={{
                    fontSize: 40, fontWeight: 800, lineHeight: 1,
                    color: "var(--m-fg)", fontVariantNumeric: "tabular-nums",
                  }}
                >
                  ${usdFormatted}
                </span>
              </div>

              {/* Native amount */}
              <p style={{ fontSize: 14, color: "var(--m-fg-4)", fontVariantNumeric: "tabular-nums", marginBottom: 16 }}>
                {balance} {symbol}
              </p>

              {/* 24h change pill */}
              <div
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl"
                style={{
                  backgroundColor: isUp ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
                  border: `1px solid ${isUp ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`,
                }}
              >
                {isUp
                  ? <TrendingUp  style={{ width: 13, height: 13, color: "#22c55e" }} />
                  : <TrendingDown style={{ width: 13, height: 13, color: "#ef4444" }} />
                }
                <span
                  style={{
                    fontSize: 13, fontWeight: 700,
                    color: isUp ? "#22c55e" : "#ef4444",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {isUp ? "+" : "-"}{absChange}% today
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Asset breakdown ── */}
      <p
        className="text-[10px] font-bold tracking-widest uppercase px-4 pt-5 pb-2"
        style={{ color: "var(--m-fg-5)" }}
      >
        Assets
      </p>

      <div
        className="mx-3 rounded-2xl overflow-hidden"
        style={{ backgroundColor: "var(--m-bg-1)", border: "1px solid var(--m-bdr)" }}
      >
        {loading ? (
          <div className="flex items-center justify-between px-4 py-4">
            <div className="flex items-center gap-3">
              <Skeleton w={40} h={40} />
              <div className="flex flex-col gap-2">
                <Skeleton w={60} h={14} />
                <Skeleton w={80} h={11} />
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Skeleton w={70} h={14} />
              <Skeleton w={50} h={11} />
            </div>
          </div>
        ) : error ? (
          <p className="px-4 py-4 text-[13px]" style={{ color: "var(--m-fg-5)" }}>
            Could not load assets
          </p>
        ) : (
          <div className="flex items-center justify-between px-4 py-4">
            {/* Token info */}
            <div className="flex items-center gap-3">
              <div
                style={{
                  width: 40, height: 40, borderRadius: 12,
                  backgroundColor: "rgba(245,197,24,0.12)",
                  border: "1px solid rgba(245,197,24,0.2)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <span style={{ fontSize: 15, fontWeight: 800, color: "#f5c518" }}>
                  {symbol.slice(0, 1)}
                </span>
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: "var(--m-fg)" }}>{symbol}</p>
                <p style={{ fontSize: 11, color: "var(--m-fg-5)" }}>Native token</p>
              </div>
            </div>

            {/* Balance + change */}
            <div className="flex flex-col items-end gap-0.5">
              <p
                style={{
                  fontSize: 14, fontWeight: 700, color: "var(--m-fg)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {balance} {symbol}
              </p>
              <p style={{ fontSize: 11, color: "var(--m-fg-4)", fontVariantNumeric: "tabular-nums" }}>
                ${usdFormatted}
              </p>
              <p
                style={{
                  fontSize: 11, fontWeight: 600,
                  color: isUp ? "#22c55e" : "#ef4444",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {isUp ? "+" : "-"}{absChange}%
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Note ── */}
      <p
        className="text-center text-[11px] px-6 mt-5"
        style={{ color: "var(--m-fg-5)", lineHeight: 1.6 }}
      >
        Showing native token balance only.{"\n"}ERC-20 &amp; SPL token support coming soon.
      </p>
    </div>
  );
}
