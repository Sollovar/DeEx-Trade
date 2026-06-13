import { useState } from "react";
import { Menu, Globe, Settings, Check, Bell, ChevronDown } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { MobileSettingsSheet } from "./MobileSettingsSheet";
import { MobileNotificationsSheet } from "./MobileNotificationsSheet";
import { DynamicConnectButton, useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { useConnectedNetwork, useSetNetwork, type Network } from "@/hooks/useConnectedNetwork";

/* ── Wallet button ─────────────────────────────────────────────── */
function WalletButton() {
  const { primaryWallet, setShowDynamicUserProfile } = useDynamicContext();

  if (primaryWallet) {
    const addr = primaryWallet.address ?? "";
    const short = addr.slice(0, 6) + "…" + addr.slice(-4);
    return (
      <button
        onClick={() => setShowDynamicUserProfile(true)}
        style={{
          backgroundColor: "rgba(245,197,24,0.10)",
          border: "1px solid rgba(245,197,24,0.35)",
          color: "#f5c518",
          fontWeight: 700,
          fontSize: 11,
          paddingLeft: 10,
          paddingRight: 10,
          height: 28,
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          gap: 6,
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#22c55e", flexShrink: 0 }} />
        {short}
      </button>
    );
  }

  return (
    <DynamicConnectButton buttonContainerClassName="nexus-connect-wrap">
      <button
        style={{
          backgroundColor: "#f5c518",
          color: "#000",
          fontWeight: 700,
          fontSize: 12,
          paddingLeft: 14,
          paddingRight: 14,
          height: 28,
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          border: "none",
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        Connect
      </button>
    </DynamicConnectButton>
  );
}

/* ── Network config ────────────────────────────────────────────── */
type SupportedNetwork = Extract<Network, "bsc" | "base" | "solana">;

const NETWORKS: { id: SupportedNetwork; label: string; abbr: string; color: string; bg: string }[] = [
  { id: "bsc",    label: "BNB Chain", abbr: "BSC",  color: "#F3BA2F", bg: "rgba(243,186,47,0.15)"  },
  { id: "base",   label: "Base",      abbr: "BASE", color: "#0052FF", bg: "rgba(0,82,255,0.15)"    },
  { id: "solana", label: "Solana",    abbr: "SOL",  color: "#9945FF", bg: "rgba(153,69,255,0.15)"  },
];

function NetworkIcon({ id, size = 16 }: { id: SupportedNetwork; size?: number }) {
  const net = NETWORKS.find((n) => n.id === id) ?? NETWORKS[0];
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        backgroundColor: net.color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        fontSize: size * 0.48,
        fontWeight: 900,
        color: "#fff",
        letterSpacing: "-0.5px",
      }}
    >
      {net.abbr[0]}
    </div>
  );
}

/* ── Network pill + bottom sheet ───────────────────────────────── */
function NetworkPill() {
  const network = useConnectedNetwork() as SupportedNetwork;
  const setNetwork = useSetNetwork();
  const [open, setOpen] = useState(false);

  const active = NETWORKS.find((n) => n.id === network) ?? NETWORKS[0];

  const pick = (id: SupportedNetwork) => {
    setNetwork(id);
    setOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          backgroundColor: "var(--m-bg-3)",
          border: "1px solid var(--m-bdr)",
          color: "var(--m-fg-2)",
          fontSize: 11,
          fontWeight: 700,
          paddingLeft: 8,
          paddingRight: 6,
          height: 28,
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          gap: 4,
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        <NetworkIcon id={active.id} size={14} />
        <span style={{ color: active.color }}>{active.abbr}</span>
        <ChevronDown style={{ width: 10, height: 10, color: "var(--m-fg-4)" }} />
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            style={{ backgroundColor: "rgba(0,0,0,0.55)", backdropFilter: "blur(2px)" }}
            onClick={() => setOpen(false)}
          />

          {/* Sheet */}
          <div
            className="fixed bottom-0 left-0 right-0 z-50 flex flex-col"
            style={{
              backgroundColor: "var(--m-bg-1)",
              borderRadius: "20px 20px 0 0",
              border: "1px solid var(--m-bdr)",
              borderBottom: "none",
              paddingBottom: "env(safe-area-inset-bottom, 16px)",
            }}
          >
            {/* Handle + title */}
            <div className="flex flex-col items-center pt-3 pb-2 shrink-0">
              <div className="w-10 h-1 rounded-full mb-4" style={{ backgroundColor: "var(--m-bg-4)" }} />
              <div className="flex items-center gap-2 w-full px-5">
                <div
                  style={{
                    width: 18, height: 18, borderRadius: "50%",
                    background: "linear-gradient(135deg,#F3BA2F,#9945FF)",
                    flexShrink: 0,
                  }}
                />
                <span className="text-[14px] font-semibold" style={{ color: "var(--m-fg)" }}>
                  Select Network
                </span>
              </div>
            </div>

            <div style={{ height: 1, backgroundColor: "var(--m-bdr)", margin: "0 0 4px" }} />

            {/* Options */}
            <div className="px-3 py-2 flex flex-col gap-2">
              {NETWORKS.map((net) => {
                const isActive = network === net.id;
                return (
                  <button
                    key={net.id}
                    onClick={() => pick(net.id)}
                    className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition-all active:scale-[0.97]"
                    style={{
                      backgroundColor: isActive ? net.bg : "var(--m-bg-2)",
                      border: isActive ? `1px solid ${net.color}40` : "1px solid var(--m-bg-4)",
                    }}
                  >
                    <div
                      style={{
                        width: 36, height: 36, borderRadius: 10,
                        backgroundColor: isActive ? net.bg : "var(--m-bg-3)",
                        border: isActive ? `1px solid ${net.color}50` : "1px solid transparent",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <NetworkIcon id={net.id} size={20} />
                    </div>
                    <div className="flex flex-col leading-none gap-1 min-w-0 flex-1">
                      <span
                        className="text-[14px] font-bold"
                        style={{ color: isActive ? net.color : "var(--m-fg)" }}
                      >
                        {net.label}
                      </span>
                      <span className="text-[11px]" style={{ color: "var(--m-fg-5)" }}>
                        {net.abbr}
                      </span>
                    </div>
                    {isActive && (
                      <div
                        style={{
                          width: 18, height: 18, borderRadius: "50%",
                          backgroundColor: net.color,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <Check style={{ width: 10, height: 10, color: "#fff" }} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Close */}
            <div className="px-4 pt-2 pb-4 shrink-0">
              <button
                onClick={() => setOpen(false)}
                className="w-full h-11 rounded-xl text-[14px] font-semibold transition-all active:scale-[0.98]"
                style={{ backgroundColor: "var(--m-bg-3)", color: "var(--m-fg-3)" }}
              >
                Close
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

/* ── Main component ────────────────────────────────────────────── */
interface Props {
  onMenuClick?: () => void;
}

const LANGUAGES = [
  { code: "EN", name: "English",    native: "English"    },
  { code: "ZH", name: "Chinese",    native: "中文"        },
  { code: "ES", name: "Spanish",    native: "Español"    },
  { code: "RU", name: "Russian",    native: "Русский"    },
  { code: "KO", name: "Korean",     native: "한국어"      },
  { code: "PT", name: "Portuguese", native: "Português"  },
  { code: "TR", name: "Turkish",    native: "Türkçe"     },
  { code: "AR", name: "Arabic",     native: "العربية"    },
];

export function MobileTopBar({ onMenuClick }: Props) {
  const { isDark, toggleTheme } = useTheme();
  const [langOpen,     setLangOpen]     = useState(false);
  const [activeLang,   setActiveLang]   = useState("EN");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [notifsOpen,   setNotifsOpen]   = useState(false);
  const [unreadCount,  setUnreadCount]  = useState(3);

  const pick = (code: string) => {
    setActiveLang(code);
    setLangOpen(false);
  };

  return (
    <>
      <div
        className="flex items-center justify-between h-[52px] px-4 shrink-0"
        style={{ backgroundColor: "var(--m-bg-1)", borderBottom: "1px solid var(--m-bdr)" }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
            style={{ color: "var(--m-fg-3)" }}
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-1.5">
            <div
              className="w-5 h-5 bg-[#f5c518] shrink-0"
              style={{ clipPath: "polygon(50% 0%,100% 50%,50% 100%,0% 50%)" }}
            />
            <span className="font-bold text-[15px] tracking-widest" style={{ color: "var(--m-fg)" }}>
              NEXUS
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <NetworkPill />
          <WalletButton />

          {/* Language button */}
          <button
            onClick={() => setLangOpen(true)}
            className="h-8 px-2 flex items-center gap-1 rounded-lg transition-colors"
            style={{ color: langOpen ? "#f5c518" : "var(--m-fg-4)" }}
          >
            <Globe style={{ width: 15, height: 15 }} />
            <span className="text-[11px] font-bold tracking-wide">{activeLang}</span>
          </button>

          {/* Bell / notifications */}
          <button
            onClick={() => setNotifsOpen(true)}
            className="relative w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
            style={{ color: notifsOpen ? "#f5c518" : "var(--m-fg-4)" }}
          >
            <Bell style={{ width: 17, height: 17 }} />
            {unreadCount > 0 && (
              <span
                className="absolute top-1 right-1 w-[14px] h-[14px] rounded-full flex items-center justify-center text-[8px] font-bold"
                style={{ backgroundColor: "#f5c518", color: "#000" }}
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {/* Settings */}
          <button
            onClick={() => setSettingsOpen(true)}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
            style={{ color: settingsOpen ? "#f5c518" : "var(--m-fg-4)" }}
          >
            <Settings style={{ width: 17, height: 17 }} />
          </button>
        </div>
      </div>

      {/* ── Language bottom sheet ── */}
      {langOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            style={{ backgroundColor: "rgba(0,0,0,0.55)", backdropFilter: "blur(2px)" }}
            onClick={() => setLangOpen(false)}
          />
          <div
            className="fixed bottom-0 left-0 right-0 z-50 flex flex-col"
            style={{
              backgroundColor: "var(--m-bg-1)",
              borderRadius: "20px 20px 0 0",
              border: "1px solid var(--m-bdr)",
              borderBottom: "none",
              paddingBottom: "env(safe-area-inset-bottom, 16px)",
              maxHeight: "80vh",
            }}
          >
            <div className="flex flex-col items-center pt-3 pb-2 shrink-0">
              <div className="w-10 h-1 rounded-full mb-4" style={{ backgroundColor: "var(--m-bg-4)" }} />
              <div className="flex items-center gap-2 w-full px-5">
                <Globe className="w-4 h-4" style={{ color: "var(--m-fg-4)" }} />
                <span className="text-[14px] font-semibold" style={{ color: "var(--m-fg)" }}>Language</span>
              </div>
            </div>
            <div style={{ height: 1, backgroundColor: "var(--m-bdr)", margin: "0 0 4px" }} />
            <div className="overflow-y-auto px-3 py-2 grid grid-cols-2 gap-2">
              {LANGUAGES.map((lang) => {
                const isActive = activeLang === lang.code;
                return (
                  <button
                    key={lang.code}
                    onClick={() => pick(lang.code)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all active:scale-[0.97]"
                    style={{
                      backgroundColor: isActive ? "rgba(245,197,24,0.10)" : "var(--m-bg-2)",
                      border: isActive ? "1px solid rgba(245,197,24,0.35)" : "1px solid var(--m-bg-4)",
                    }}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-[11px] font-bold"
                      style={{
                        backgroundColor: isActive ? "rgba(245,197,24,0.18)" : "var(--m-bg-3)",
                        color: isActive ? "#f5c518" : "var(--m-fg-3)",
                      }}
                    >
                      {lang.code}
                    </div>
                    <div className="flex flex-col leading-none gap-0.5 min-w-0">
                      <span className="text-[13px] font-semibold truncate" style={{ color: isActive ? "#f5c518" : "var(--m-fg)" }}>
                        {lang.native}
                      </span>
                      <span className="text-[10px]" style={{ color: "var(--m-fg-5)" }}>{lang.name}</span>
                    </div>
                    {isActive && <Check className="w-3.5 h-3.5 ml-auto shrink-0" style={{ color: "#f5c518" }} />}
                  </button>
                );
              })}
            </div>
            <div className="px-4 pt-2 pb-4 shrink-0">
              <button
                onClick={() => setLangOpen(false)}
                className="w-full h-11 rounded-xl text-[14px] font-semibold transition-all active:scale-[0.98]"
                style={{ backgroundColor: "var(--m-bg-3)", color: "var(--m-fg-3)" }}
              >
                Close
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Settings sheet ── */}
      <MobileSettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      {/* ── Notifications sheet ── */}
      <MobileNotificationsSheet
        open={notifsOpen}
        onClose={() => setNotifsOpen(false)}
        unreadCount={unreadCount}
        onMarkAllRead={() => setUnreadCount(0)}
      />
    </>
  );
}
