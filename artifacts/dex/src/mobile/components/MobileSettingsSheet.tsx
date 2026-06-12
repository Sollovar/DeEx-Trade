import { useState } from "react";
import { X, Sun, Moon, Bell, Volume2, Shield, Sliders, ChevronRight, Check } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

interface Props {
  open: boolean;
  onClose: () => void;
}

type Slippage = "0.1" | "0.5" | "1.0" | "custom";
type OrderConfirm = "always" | "large" | "never";

function Row({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex flex-col gap-0.5">
        <span className="text-[13px] font-semibold" style={{ color: "var(--m-fg)" }}>{label}</span>
        {sub && <span className="text-[11px]" style={{ color: "var(--m-fg-5)" }}>{sub}</span>}
      </div>
      {children}
    </div>
  );
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="relative w-11 h-6 rounded-full transition-all duration-200 shrink-0"
      style={{ backgroundColor: on ? "#f5c518" : "var(--m-bg-4)" }}
    >
      <span
        className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200"
        style={{ left: on ? "calc(100% - 22px)" : "2px" }}
      />
    </button>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <p className="text-[10px] font-bold tracking-widest uppercase px-4 pt-4 pb-1" style={{ color: "var(--m-fg-5)" }}>
      {label}
    </p>
  );
}

function Divider() {
  return <div className="mx-4 h-px" style={{ backgroundColor: "var(--m-bdr)" }} />;
}

export function MobileSettingsSheet({ open, onClose }: Props) {
  const { isDark, toggleTheme } = useTheme();

  const [slippage, setSlippage]             = useState<Slippage>("0.5");
  const [customSlip, setCustomSlip]         = useState("");
  const [orderConfirm, setOrderConfirm]     = useState<OrderConfirm>("large");
  const [soundAlerts, setSoundAlerts]       = useState(true);
  const [pushNotifs, setPushNotifs]         = useState(true);
  const [priceAlerts, setPriceAlerts]       = useState(true);
  const [orderAlerts, setOrderAlerts]       = useState(true);
  const [hideBalance, setHideBalance]       = useState(false);
  const [advancedMode, setAdvancedMode]     = useState(false);

  const SLIPPAGE_OPTS: Slippage[] = ["0.1", "0.5", "1.0", "custom"];
  const CONFIRM_OPTS: { value: OrderConfirm; label: string }[] = [
    { value: "always", label: "Always" },
    { value: "large",  label: "Large orders only" },
    { value: "never",  label: "Never" },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 transition-all duration-300"
        style={{
          backgroundColor: "rgba(0,0,0,0.6)",
          backdropFilter: open ? "blur(3px)" : "none",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
        }}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 flex flex-col"
        style={{
          backgroundColor: "var(--m-bg-1)",
          borderRadius: "20px 20px 0 0",
          border: "1px solid var(--m-bdr)",
          borderBottom: "none",
          maxHeight: "88vh",
          transform: open ? "translateY(0)" : "translateY(100%)",
          transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)",
          paddingBottom: "env(safe-area-inset-bottom, 16px)",
        }}
      >
        {/* Handle */}
        <div className="flex flex-col items-center pt-3 shrink-0">
          <div className="w-10 h-1 rounded-full" style={{ backgroundColor: "var(--m-bg-4)" }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 shrink-0">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4" style={{ color: "var(--m-fg-4)" }} />
            <span className="text-[15px] font-bold" style={{ color: "var(--m-fg)" }}>Settings</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl transition-colors active:scale-90"
            style={{ backgroundColor: "var(--m-bg-3)", color: "var(--m-fg-4)" }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <Divider />

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1">

          {/* ── Appearance ── */}
          <SectionLabel label="Appearance" />
          <div className="mx-3 rounded-2xl overflow-hidden" style={{ backgroundColor: "var(--m-bg-2)" }}>
            <Row
              label="Dark Mode"
              sub={isDark ? "Currently dark" : "Currently light"}
            >
              <div className="flex items-center gap-2">
                {isDark
                  ? <Moon className="w-4 h-4" style={{ color: "#f5c518" }} />
                  : <Sun  className="w-4 h-4" style={{ color: "#f5c518" }} />
                }
                <Toggle on={isDark} onToggle={toggleTheme} />
              </div>
            </Row>
            <Divider />
            <Row label="Hide Balances" sub="Mask portfolio values">
              <Toggle on={hideBalance} onToggle={() => setHideBalance(v => !v)} />
            </Row>
          </div>

          {/* ── Trading ── */}
          <SectionLabel label="Trading" />
          <div className="mx-3 rounded-2xl overflow-hidden" style={{ backgroundColor: "var(--m-bg-2)" }}>
            {/* Slippage tolerance */}
            <div className="px-4 py-3">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[13px] font-semibold" style={{ color: "var(--m-fg)" }}>Slippage Tolerance</span>
                <span className="text-[12px] font-mono font-bold" style={{ color: "#f5c518" }}>
                  {slippage === "custom" ? (customSlip || "—") + "%" : slippage + "%"}
                </span>
              </div>
              <div className="flex gap-2">
                {SLIPPAGE_OPTS.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setSlippage(opt)}
                    className="flex-1 h-8 rounded-xl text-[12px] font-bold transition-all active:scale-95"
                    style={{
                      backgroundColor: slippage === opt ? "#f5c518" : "var(--m-bg-3)",
                      color: slippage === opt ? "#000" : "var(--m-fg-4)",
                    }}
                  >
                    {opt === "custom" ? "Custom" : opt + "%"}
                  </button>
                ))}
              </div>
              {slippage === "custom" && (
                <div
                  className="flex items-center gap-2 mt-2 px-3 h-9 rounded-xl"
                  style={{ backgroundColor: "var(--m-bg-3)", border: "1px solid var(--m-bg-4)" }}
                >
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="e.g. 2.5"
                    value={customSlip}
                    onChange={(e) => setCustomSlip(e.target.value.replace(/[^0-9.]/g, ""))}
                    className="bg-transparent outline-none flex-1 text-[13px] font-mono"
                    style={{ color: "var(--m-fg)" }}
                    autoFocus
                  />
                  <span className="text-[12px] font-semibold" style={{ color: "var(--m-fg-4)" }}>%</span>
                </div>
              )}
            </div>

            <Divider />

            {/* Order confirmation */}
            <div className="px-4 py-3">
              <span className="text-[13px] font-semibold block mb-2.5" style={{ color: "var(--m-fg)" }}>
                Order Confirmation
              </span>
              <div className="flex flex-col gap-1.5">
                {CONFIRM_OPTS.map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setOrderConfirm(value)}
                    className="flex items-center justify-between px-3 h-9 rounded-xl transition-all active:scale-[0.98]"
                    style={{
                      backgroundColor: orderConfirm === value ? "rgba(245,197,24,0.1)" : "var(--m-bg-3)",
                      border: orderConfirm === value ? "1px solid rgba(245,197,24,0.3)" : "1px solid transparent",
                    }}
                  >
                    <span
                      className="text-[13px] font-medium"
                      style={{ color: orderConfirm === value ? "#f5c518" : "var(--m-fg-3)" }}
                    >
                      {label}
                    </span>
                    {orderConfirm === value && <Check className="w-3.5 h-3.5" style={{ color: "#f5c518" }} />}
                  </button>
                ))}
              </div>
            </div>

            <Divider />

            <Row label="Advanced Mode" sub="Show extra order options">
              <Toggle on={advancedMode} onToggle={() => setAdvancedMode(v => !v)} />
            </Row>
          </div>

          {/* ── Notifications ── */}
          <SectionLabel label="Notifications" />
          <div className="mx-3 rounded-2xl overflow-hidden" style={{ backgroundColor: "var(--m-bg-2)" }}>
            <Row label="Push Notifications" sub="Order fills, alerts">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4" style={{ color: pushNotifs ? "#f5c518" : "var(--m-fg-5)" }} />
                <Toggle on={pushNotifs} onToggle={() => setPushNotifs(v => !v)} />
              </div>
            </Row>
            <Divider />
            <Row label="Price Alerts" sub="When target price is hit">
              <Toggle on={priceAlerts} onToggle={() => setPriceAlerts(v => !v)} />
            </Row>
            <Divider />
            <Row label="Order Updates" sub="Fill, cancel, and reject">
              <Toggle on={orderAlerts} onToggle={() => setOrderAlerts(v => !v)} />
            </Row>
            <Divider />
            <Row label="Sound Alerts" sub="Audio on order fill">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4" style={{ color: soundAlerts ? "#f5c518" : "var(--m-fg-5)" }} />
                <Toggle on={soundAlerts} onToggle={() => setSoundAlerts(v => !v)} />
              </div>
            </Row>
          </div>

          {/* ── Security ── */}
          <SectionLabel label="Security" />
          <div className="mx-3 mb-4 rounded-2xl overflow-hidden" style={{ backgroundColor: "var(--m-bg-2)" }}>
            <button
              className="w-full flex items-center justify-between px-4 py-3 transition-all active:opacity-70"
            >
              <div className="flex items-center gap-2.5">
                <Shield className="w-4 h-4" style={{ color: "var(--m-fg-4)" }} />
                <div className="flex flex-col gap-0.5 text-left">
                  <span className="text-[13px] font-semibold" style={{ color: "var(--m-fg)" }}>Connected Apps</span>
                  <span className="text-[11px]" style={{ color: "var(--m-fg-5)" }}>Manage dApp permissions</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4" style={{ color: "var(--m-fg-5)" }} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
