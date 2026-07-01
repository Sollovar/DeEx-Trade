import { useState, useRef, useCallback } from "react";
import { ChevronDown, Wallet } from "lucide-react";
import { LiveMarketState } from "@/hooks/useLiveMarket";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { DynamicConnectButton } from "@dynamic-labs/sdk-react-core";
import { useOrderCreation } from "@/hooks/useOrderCreation";
import { useStore } from "@/stores/useStore";
import type { Network } from "@/utils/contracts";

interface Props {
  market: LiveMarketState;
  symbol?: string;
}

type OrderTab = "Limit" | "Market" | "Ladder";

function Check({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none" onClick={onChange}>
      <div
        className="w-3.5 h-3.5 border flex items-center justify-center shrink-0 transition-colors rounded-sm"
        style={{
          borderColor: checked ? "#f5c518" : "#333",
          backgroundColor: checked ? "rgba(245,197,24,0.12)" : "transparent",
        }}
      >
        {checked && (
          <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
            <polyline points="1,3 3,5 7,1" stroke="#f5c518" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>
      <span className="text-[12px] text-[#888]">{label}</span>
    </label>
  );
}

const INPUT_ROW = "flex items-center bg-[#111] border border-[#222] focus-within:border-[#3a3a3a] px-3 h-[40px] gap-2 transition-colors rounded-full";

export function OrderEntryPanel({ market }: Props) {
  const { primaryWallet } = useDynamicContext();
  const { createOrder, loading: submitting, error: submitError } = useOrderCreation();
  const selectedPair = useStore((s) => s.selectedPair);
  const pairs = useStore((s) => s.pairs);
  const activePair = selectedPair ?? pairs[0] ?? null;

  const baseToken  = activePair?.baseToken?.symbol  ?? "BASE";
  const quoteToken = activePair?.quoteToken?.symbol ?? "USDT";

  const [tab, setTab]               = useState<OrderTab>("Limit");
  const [side, setSide]             = useState<"long" | "short">("long");
  const [limitPrice, setLimitPrice] = useState("");
  const [sliderPct, setSliderPct]   = useState(0);
  const [size, setSize]             = useState("");
  const [sizeUnit, setSizeUnit]     = useState<"base" | "quote">("base");
  const [postOnly, setPostOnly]     = useState(false);
  const [tpsl, setTpsl]             = useState(false);
  const [tpPrice, setTpPrice]       = useState("");
  const [slPrice, setSlPrice]       = useState("");
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");
  const [statusMsg, setStatusMsg]   = useState("");

  // Ladder state
  const [ladderStart, setLadderStart]   = useState("");
  const [ladderEnd, setLadderEnd]       = useState("");
  const [ladderLevels, setLadderLevels] = useState("10");

  // Draggable slider
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const computePct = useCallback((clientX: number) => {
    const el = trackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setSliderPct(Math.round(Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)) * 100));
  }, []);

  const onPtrDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    dragging.current = true;
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    computePct(e.clientX);
  }, [computePct]);

  const onPtrMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (dragging.current) computePct(e.clientX);
  }, [computePct]);

  const onPtrUp = useCallback(() => { dragging.current = false; }, []);

  const displayPrice = market.price > 0
    ? market.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 6 })
    : "—";

  // Live order value calculation
  const sizeNum   = parseFloat(size);
  const execPrice = tab === "Limit" && limitPrice ? parseFloat(limitPrice) : market.price;
  const orderValue = !isNaN(sizeNum) && sizeNum > 0 && !isNaN(execPrice) && execPrice > 0
    ? sizeUnit === "base"
      ? (sizeNum * execPrice).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " " + quoteToken
      : sizeNum.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " " + quoteToken
    : "N/A";
  const tokenEquiv = sizeUnit === "quote" && !isNaN(sizeNum) && sizeNum > 0 && execPrice > 0
    ? (sizeNum / execPrice).toFixed(6) + " " + baseToken
    : null;

  // Ladder preview calc
  const lStart  = parseFloat(ladderStart);
  const lEnd    = parseFloat(ladderEnd);
  const lLevels = parseInt(ladderLevels) || 0;
  const ladderValid = !isNaN(lStart) && !isNaN(lEnd) && lStart > 0 && lEnd > 0 && lLevels >= 2;
  const ladderInterval = ladderValid ? Math.abs(lEnd - lStart) / (lLevels - 1) : null;
  const ladderDir = ladderValid ? (lEnd > lStart ? "ascending" : "descending") : null;

  async function handleSubmit() {
    if (!primaryWallet) return;
    if (!activePair) {
      setSubmitStatus("error");
      setStatusMsg("No trading pair selected");
      return;
    }

    // Determine price string
    let priceStr: string;
    if (tab === "Market") {
      priceStr = market.price.toString();
    } else if (tab === "Limit") {
      priceStr = limitPrice || market.price.toString();
    } else {
      priceStr = ladderStart || market.price.toString();
    }

    // Determine amount
    let amountStr: string;
    if (!size || parseFloat(size) <= 0) {
      setSubmitStatus("error");
      setStatusMsg("Enter a valid amount");
      return;
    }

    if (sizeUnit === "quote") {
      const px = parseFloat(priceStr);
      if (px > 0) {
        amountStr = (parseFloat(size) / px).toFixed(8);
      } else {
        amountStr = size;
      }
    } else {
      amountStr = size;
    }

    setSubmitStatus("idle");
    setStatusMsg("");

    const result = await createOrder({
      pairId: activePair.id,
      side: side === "long" ? "buy" : "sell",
      orderType: tab === "Market" ? "market" : "limit",
      price: priceStr,
      amount: amountStr,
      network: (activePair.network as Network) || "bsc",
      advanced: postOnly ? "postOnly" : "none",
      triggerPrice: tpsl && tpPrice ? tpPrice : undefined,
      isLadder: tab === "Ladder" && ladderValid,
      ladderConfig: tab === "Ladder" && ladderValid ? {
        priceStart: ladderStart,
        priceEnd: ladderEnd,
        levels: lLevels,
      } : undefined,
    });

    if (result.success) {
      setSubmitStatus("success");
      setStatusMsg("Order placed!");
      setSize("");
      setLimitPrice("");
      setSliderPct(0);
      setTpPrice("");
      setSlPrice("");
      setTimeout(() => setSubmitStatus("idle"), 3000);
    } else {
      setSubmitStatus("error");
      setStatusMsg(result.error || "Order failed");
      setTimeout(() => setSubmitStatus("idle"), 5000);
    }
  }

  const isConnected = !!primaryWallet;
  const canSubmit = isConnected && !submitting && activePair != null;

  const buttonBg = tab === "Ladder"
    ? "#a78bfa"
    : submitStatus === "success"
    ? "#00c853"
    : submitStatus === "error"
    ? "#ff4d6a"
    : "#f5c518";

  const buttonLabel = (() => {
    if (!isConnected) return "Connect Wallet";
    if (submitting) return "Placing Order…";
    if (submitStatus === "success") return statusMsg;
    if (submitStatus === "error") return statusMsg;
    if (tab === "Ladder") return "Place Ladder Order";
    return `${side === "long" ? "Buy" : "Sell"}`;
  })();

  return (
    <div className="flex flex-col bg-[#000000]">
      {/* Tabs — 3-column grid so Market is always truly centered */}
      <div className="grid grid-cols-3 h-[38px] px-3 border-b border-[#1a1a1a] bg-[#000000] shrink-0">
        <button
          onClick={() => setTab("Limit")}
          className="h-full flex items-center text-[13px] font-semibold transition-colors justify-start"
          style={{
            color: tab === "Limit" ? "#fff" : "#555",
            borderBottom: tab === "Limit" ? "2px solid #f5c518" : "2px solid transparent",
          }}
        >
          Limit
        </button>
        <button
          onClick={() => setTab("Market")}
          className="h-full flex items-center text-[13px] font-semibold transition-colors justify-center"
          style={{
            color: tab === "Market" ? "#fff" : "#555",
            borderBottom: tab === "Market" ? "2px solid #f5c518" : "2px solid transparent",
          }}
        >
          Market
        </button>
        <button
          onClick={() => setTab("Ladder")}
          className="h-full flex items-center text-[13px] font-semibold transition-colors justify-end"
          style={{
            color: tab === "Ladder" ? "#a78bfa" : "#555",
            borderBottom: tab === "Ladder" ? "2px solid #a78bfa" : "2px solid transparent",
          }}
        >
          Ladder
        </button>
      </div>

      <div className="p-3 flex flex-col gap-3">
        {/* Available */}
        <div className="flex items-center justify-between text-[12px]">
          <span className="text-[#555]">Avail. to Trade</span>
          <span className="text-[#888]">0.00 {quoteToken}</span>
        </div>

        {/* Price input — Limit only */}
        {tab === "Limit" && (
          <div className={INPUT_ROW}>
            <span className="text-[11px] font-semibold text-[#555] shrink-0">Price</span>
            <div className="w-px h-3.5 bg-[#222] shrink-0" />
            <input
              type="text"
              placeholder={displayPrice}
              value={limitPrice}
              onChange={(e) => setLimitPrice(e.target.value)}
              className="bg-transparent outline-none flex-1 tabular-nums text-white text-[13px] font-medium w-0 text-right"
            />
            <span className="text-[11px] text-[#555] shrink-0">{quoteToken}</span>
          </div>
        )}

        {/* Ladder inputs */}
        {tab === "Ladder" && (
          <div className="flex flex-col gap-2">
            {[
              { label: "Start", val: ladderStart, set: setLadderStart, ph: "Price start" },
              { label: "End",   val: ladderEnd,   set: setLadderEnd,   ph: "Price end"   },
            ].map(({ label, val, set, ph }) => (
              <div key={label} className={INPUT_ROW} style={{ borderColor: "rgba(167,139,250,0.3)" }}>
                <span className="text-[11px] font-semibold shrink-0" style={{ color: "#a78bfa" }}>{label}</span>
                <div className="w-px h-3.5 bg-[#222] shrink-0" />
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder={ph}
                  value={val}
                  onChange={(e) => set(e.target.value)}
                  className="bg-transparent outline-none flex-1 text-white text-[13px] w-0 text-right placeholder:text-[#333]"
                />
                <span className="text-[11px] text-[#555] shrink-0">{quoteToken}</span>
              </div>
            ))}
            <div className={INPUT_ROW} style={{ borderColor: "rgba(167,139,250,0.3)" }}>
              <span className="text-[11px] font-semibold shrink-0" style={{ color: "#a78bfa" }}>Levels</span>
              <div className="w-px h-3.5 bg-[#222] shrink-0" />
              <input
                type="text"
                inputMode="numeric"
                placeholder="e.g. 10"
                value={ladderLevels}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "");
                  const n = Math.min(30, Math.max(1, Number(v) || 1));
                  setLadderLevels(v === "" ? "" : String(n));
                }}
                className="bg-transparent outline-none flex-1 text-white text-[13px] w-0 text-right placeholder:text-[#333]"
              />
              <span className="text-[11px] text-[#555] shrink-0">/ 30</span>
            </div>
          </div>
        )}

        {/* Buy / Sell toggle */}
        <div className="flex gap-1.5">
          <button
            onClick={() => setSide("long")}
            className="flex-1 py-2 text-[13px] font-bold transition-all rounded-full"
            style={{
              backgroundColor: side === "long" ? "#f5c518" : "transparent",
              color: side === "long" ? "#000" : "#555",
              border: `1px solid ${side === "long" ? "#f5c518" : "#222"}`,
            }}
          >
            Buy
          </button>
          <button
            onClick={() => setSide("short")}
            className="flex-1 py-2 text-[13px] font-bold transition-all rounded-full"
            style={{
              backgroundColor: side === "short" ? "#ff4d6a" : "transparent",
              color: side === "short" ? "#fff" : "#555",
              border: `1px solid ${side === "short" ? "#ff4d6a" : "#222"}`,
            }}
          >
            Sell
          </button>
        </div>

        {/* Size input */}
        <div className="flex flex-col gap-1">
          <div className={INPUT_ROW}>
            <span className="text-[11px] font-semibold text-[#555] shrink-0">Size</span>
            <input
              type="text"
              inputMode="decimal"
              placeholder="0"
              value={size}
              onChange={(e) => setSize(e.target.value.replace(/[^0-9.]/g, ""))}
              className="bg-transparent outline-none flex-1 text-white text-right text-[13px] w-0 placeholder:text-[#333]"
            />
            <div className="w-px h-3.5 bg-[#222] shrink-0" />
            <button
              onClick={() => { setSizeUnit(u => u === "base" ? "quote" : "base"); setSize(""); }}
              className="flex items-center gap-0.5 text-[11px] font-semibold shrink-0 transition-colors rounded px-1 py-0.5 hover:bg-[#1e1e1e]"
              style={{ color: sizeUnit === "quote" ? "#f5c518" : "#888" }}
            >
              {sizeUnit === "base" ? baseToken : quoteToken} <ChevronDown className="w-3 h-3" />
            </button>
          </div>
          {tokenEquiv && (
            <div className="flex justify-end items-center gap-1 px-1">
              <span className="text-[11px] text-[#555]">≈</span>
              <span className="text-[11px] font-medium text-[#f5c518]">{tokenEquiv}</span>
            </div>
          )}
        </div>

        {/* Slider — draggable */}
        <div className="px-0.5 pt-1 pb-1">
          <div
            ref={trackRef}
            className="relative flex items-center cursor-pointer select-none rounded-full"
            style={{ height: 20 }}
            onPointerDown={onPtrDown}
            onPointerMove={onPtrMove}
            onPointerUp={onPtrUp}
            onPointerCancel={onPtrUp}
          >
            <div className="absolute left-0 right-0 rounded-full" style={{ height: 3, top: "50%", transform: "translateY(-50%)", backgroundColor: "#1a1a1a" }} />
            <div className="absolute left-0 rounded-full" style={{ height: 3, top: "50%", transform: "translateY(-50%)", width: `${sliderPct}%`, backgroundColor: "#f5c518" }} />
            {[0, 25, 50, 75, 100].map((pct) => (
              <div
                key={pct}
                className="absolute rounded-full pointer-events-none"
                style={{
                  width: 8, height: 8,
                  top: "50%", transform: "translate(-50%, -50%)",
                  left: `${pct}%`,
                  backgroundColor: sliderPct >= pct ? "#f5c518" : "#2a2a2a",
                  border: "2px solid #0a0a0a",
                }}
              />
            ))}
            <div
              className="absolute rounded-full pointer-events-none shadow"
              style={{
                width: 14, height: 14,
                top: "50%", transform: "translate(-50%, -50%)",
                left: `${sliderPct}%`,
                backgroundColor: "#f5c518",
                border: "2.5px solid #0a0a0a",
                boxShadow: "0 0 0 3px rgba(245,197,24,0.18)",
              }}
            />
          </div>
          <div className="flex justify-between mt-2 text-[11px] text-[#444]">
            {[0, 25, 50, 75, 100].map((pct) => (
              <button
                key={pct}
                onClick={() => setSliderPct(pct)}
                className="transition-colors"
                style={{ color: sliderPct === pct ? "#f5c518" : "#444" }}
              >
                {pct}%
              </button>
            ))}
          </div>
        </div>

        {/* Checkboxes + TP/SL — hidden in Ladder mode */}
        {tab !== "Ladder" && (
          <div className="flex flex-col gap-2.5">
            <Check checked={postOnly} onChange={() => setPostOnly(!postOnly)} label="Post Only" />
            <Check checked={tpsl} onChange={() => setTpsl(!tpsl)} label="Take Profit / Stop Loss" />
            {tpsl && (
              <div className="flex flex-col gap-2 mt-0.5">
                <div className={INPUT_ROW}>
                  <span className="text-[11px] font-semibold text-[#555] shrink-0">TP</span>
                  <div className="w-px h-3.5 bg-[#222] shrink-0" />
                  <input
                    type="text"
                    placeholder="Take Profit price"
                    value={tpPrice}
                    onChange={(e) => setTpPrice(e.target.value)}
                    className="bg-transparent outline-none flex-1 text-white text-[13px] w-0 text-right placeholder:text-[#333]"
                  />
                  <span className="text-[11px] text-[#555] shrink-0">{quoteToken}</span>
                </div>
                <div className={INPUT_ROW}>
                  <span className="text-[11px] font-semibold text-[#555] shrink-0">SL</span>
                  <div className="w-px h-3.5 bg-[#222] shrink-0" />
                  <input
                    type="text"
                    placeholder="Stop Loss price"
                    value={slPrice}
                    onChange={(e) => setSlPrice(e.target.value)}
                    className="bg-transparent outline-none flex-1 text-white text-[13px] w-0 text-right placeholder:text-[#333]"
                  />
                  <span className="text-[11px] text-[#555] shrink-0">{quoteToken}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Order stats — hidden in Ladder mode */}
        {tab !== "Ladder" && (
          <div className="flex flex-col gap-2">
            {[
              ["Order Value", orderValue, false],
              ["Slippage", "Est: 0% / Max: 0.50%", true],
            ].map(([label, value, yellow]) => (
              <div key={label as string} className="flex items-center justify-between">
                <span className="text-[12px] text-[#555]">{label as string}</span>
                <span className="text-[12px]" style={{ color: yellow ? "#f5c518" : "#888" }}>{value as string}</span>
              </div>
            ))}
          </div>
        )}

        {/* Ladder preview */}
        {tab === "Ladder" && (
          <div
            className="rounded-lg px-3 py-3 flex flex-col gap-2"
            style={{ backgroundColor: "rgba(167,139,250,0.06)", border: "1px solid rgba(167,139,250,0.18)" }}
          >
            <div className="flex items-center gap-1.5 mb-0.5">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <rect x="0"   y="7"   width="2" height="3"  rx="0.5" fill="#a78bfa" />
                <rect x="2.5" y="4.5" width="2" height="5.5" rx="0.5" fill="#a78bfa" opacity="0.7" />
                <rect x="5"   y="2"   width="2" height="8"  rx="0.5" fill="#a78bfa" opacity="0.5" />
                <rect x="7.5" y="0"   width="2" height="10" rx="0.5" fill="#a78bfa" opacity="0.3" />
              </svg>
              <span className="text-[11px] font-bold tracking-wide" style={{ color: "#a78bfa" }}>Ladder Preview</span>
            </div>

            {ladderValid ? (
              <>
                {[
                  ["Child Orders",    String(lLevels),                              "#a78bfa"],
                  ["Price Interval",  `${ladderInterval!.toFixed(3)} ${quoteToken}`, "#888"],
                  ["Range",           `${Math.min(lStart,lEnd).toFixed(3)} → ${Math.max(lStart,lEnd).toFixed(3)}`, "#888"],
                  ["Fill Direction",  ladderDir === "ascending" ? "↑ Low → High" : "↓ High → Low",
                                      ladderDir === "ascending" ? "#00c8a0" : "#ff4d6a"],
                ].map(([label, value, color]) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-[12px] text-[#555]">{label}</span>
                    <span className="text-[12px] font-medium" style={{ color }}>{value}</span>
                  </div>
                ))}
                <div className="flex items-end gap-[2px] mt-1" style={{ height: 20 }}>
                  {Array.from({ length: Math.min(lLevels, 20) }).map((_, i) => {
                    const total = Math.min(lLevels, 20);
                    const h = ladderDir === "ascending" ? ((i + 1) / total) * 100 : ((total - i) / total) * 100;
                    return (
                      <div
                        key={i}
                        className="flex-1 rounded-sm"
                        style={{ height: `${h}%`, backgroundColor: "#a78bfa", opacity: 0.3 + (i / total) * 0.6 }}
                      />
                    );
                  })}
                </div>
              </>
            ) : (
              <p className="text-[12px] text-center py-1 text-[#444]">Enter price range &amp; levels to preview</p>
            )}
          </div>
        )}

        {/* Submit / Connect button */}
        {!isConnected ? (
          <div style={{ width: "100%", marginTop: 4 }}>
            <DynamicConnectButton buttonContainerClassName="nexus-panel-connect">
              <button
                style={{
                  width: "100%",
                  backgroundColor: "#f5c518",
                  color: "#000",
                  fontWeight: 700,
                  fontSize: 13,
                  height: 40,
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  border: "none",
                  cursor: "pointer",
                  boxSizing: "border-box",
                }}
              >
                <Wallet style={{ width: 14, height: 14, flexShrink: 0 }} />
                Connect Wallet
              </button>
            </DynamicConnectButton>
          </div>
        ) : (
          <button
            disabled={!canSubmit}
            onClick={handleSubmit}
            className="w-full font-bold py-3 text-[14px] transition-colors mt-1 disabled:opacity-60"
            style={{
              backgroundColor: buttonBg,
              color: tab === "Ladder" || submitStatus === "error" ? "#fff" : "#000",
              borderRadius: 8,
            }}
          >
            {buttonLabel}
          </button>
        )}
      </div>
    </div>
  );
}
