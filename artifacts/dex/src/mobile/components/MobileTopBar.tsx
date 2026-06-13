import { useState } from "react";
import { Menu, Globe, Settings, Check, Bell } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { MobileSettingsSheet } from "./MobileSettingsSheet";
import { MobileNotificationsSheet } from "./MobileNotificationsSheet";
import { DynamicWidget } from "@dynamic-labs/sdk-react-core";

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
          <DynamicWidget
            innerButtonComponent={
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
            }
          />

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
