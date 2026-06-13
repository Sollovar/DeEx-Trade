import { useState, useRef } from "react";
import { useLiveMarket } from "@/hooks/useLiveMarket";
import { useTheme } from "@/contexts/ThemeContext";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { MobileTopBar } from "./components/MobileTopBar";
import { MobilePairHeader } from "./components/MobilePairHeader";
import { MobileChartView } from "./components/MobileChartView";
import { MobileOrderBookView } from "./components/MobileOrderBookView";
import { MobileTradesView } from "./components/MobileTradesView";
import { MobileBottomSection } from "./components/MobileBottomSection";
import { MobileBottomNav, NavTab } from "./components/MobileBottomNav";
import { MobileTradeView } from "./components/MobileTradeView";
import { MobileMarketSelectPanel } from "./components/MobileMarketSelectPanel";
import { MobileHamburgerMenu } from "./components/MobileHamburgerMenu";
import { MobileMarketsPage } from "./components/MobileMarketsPage";
import { FloatingChainStats } from "./components/MobileTopBar";
import { MobilePortfolioWidget } from "./components/MobilePortfolioWidget";
import { DynamicConnectButton, DynamicWidget } from "@dynamic-labs/sdk-react-core";
import { Wallet, X } from "lucide-react";

type MainTab = "Chart" | "Order Book" | "Trades";

/* ── Swipeable tabs config ──────────────────────────────────────── */
// Pages in left-to-right order. Swipe left = go right, swipe right = go left.
const SWIPE_TABS: NavTab[] = ["Markets", "Trade"];
const SWIPE_THRESHOLD = 55; // px of horizontal movement to trigger switch

/* ── Page dots indicator ────────────────────────────────────────── */
function PageDots({ activeTab }: { activeTab: NavTab }) {
  return (
    <div
      className="flex items-center justify-center gap-1.5 shrink-0"
      style={{ height: 20 }}
    >
      {SWIPE_TABS.map((tab) => {
        const active = tab === activeTab;
        return (
          <div
            key={tab}
            style={{
              width: active ? 18 : 5,
              height: 5,
              borderRadius: 99,
              backgroundColor: active ? "#f5c518" : "var(--m-bg-4)",
              transition: "width 0.25s ease, background-color 0.2s ease",
            }}
          />
        );
      })}
    </div>
  );
}

/* ── No-wallet bottom sheet ─────────────────────────────────────── */
function NoWalletSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <>
      <div
        className="fixed inset-0 z-40 transition-opacity duration-300"
        style={{
          backgroundColor: "rgba(0,0,0,0.65)",
          backdropFilter: "blur(3px)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
        }}
        onClick={onClose}
      />

      <div
        className="fixed bottom-0 left-0 right-0 z-50 flex flex-col items-center"
        style={{
          backgroundColor: "var(--m-bg-1)",
          borderRadius: "24px 24px 0 0",
          border: "1px solid var(--m-bdr)",
          borderBottom: "none",
          paddingBottom: "env(safe-area-inset-bottom, 24px)",
          transform: open ? "translateY(0)" : "translateY(100%)",
          transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        <div className="w-10 h-1 rounded-full mt-3 mb-6" style={{ backgroundColor: "var(--m-bg-4)" }} />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-xl"
          style={{ backgroundColor: "var(--m-bg-3)", color: "var(--m-fg-4)" }}
        >
          <X className="w-4 h-4" />
        </button>

        <div
          className="w-20 h-20 rounded-full flex items-center justify-center mb-5"
          style={{ background: "rgba(245,197,24,0.10)", border: "2px solid rgba(245,197,24,0.25)" }}
        >
          <Wallet className="w-9 h-9" style={{ color: "#f5c518" }} />
        </div>

        <p className="text-[18px] font-bold mb-2" style={{ color: "var(--m-fg)" }}>
          Connect your wallet
        </p>
        <p className="text-[13px] text-center px-8 mb-8" style={{ color: "var(--m-fg-4)" }}>
          Connect to view your profile, balances and trade history.
        </p>

        <div className="w-full px-5 pb-2">
          <DynamicConnectButton buttonContainerClassName="nexus-connect-wrap">
            <button
              style={{
                width: "100%",
                backgroundColor: "#f5c518",
                color: "#000",
                fontWeight: 700,
                fontSize: 15,
                height: 50,
                borderRadius: 14,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "none",
                cursor: "pointer",
                gap: 8,
              }}
            >
              <Wallet className="w-5 h-5" />
              Connect Wallet
            </button>
          </DynamicConnectButton>
        </div>
      </div>
    </>
  );
}

/* ── Main page ─────────────────────────────────────────────────── */
function MobileTradePageInner() {
  const market = useLiveMarket();
  const { isDark } = useTheme();
  const { primaryWallet, setShowDynamicUserProfile } = useDynamicContext();
  const [mainTab, setMainTab]             = useState<MainTab>("Chart");
  const [navTab, setNavTab]               = useState<NavTab>("Trade");
  const [noWalletSheet, setNoWalletSheet] = useState(false);
  const [currentSymbol, setCurrentSymbol] = useState("BTCUSDT");
  const [showMarketPanel, setShowMarketPanel] = useState(false);
  const [menuOpen, setMenuOpen]           = useState(false);
  const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

  // Swipe tracking refs — no re-renders during gesture
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const swiping     = useRef(false);

  function handleNavChange(tab: NavTab) {
    if (tab === "Home") {
      window.location.href = BASE + "/";
      return;
    }
    if (tab === "Account") {
      if (primaryWallet) {
        setShowDynamicUserProfile(true);
      } else {
        setNoWalletSheet(true);
      }
      return;
    }
    setNavTab(tab);
  }

  /* Swipe handlers — only active on swipeable tabs */
  function onTouchStart(e: React.TouchEvent) {
    if (!SWIPE_TABS.includes(navTab)) return;
    const t = e.touches[0];
    touchStartX.current = t.clientX;
    touchStartY.current = t.clientY;
    swiping.current = false;
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (!SWIPE_TABS.includes(navTab)) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartX.current;
    const dy = t.clientY - touchStartY.current;

    // Only count as a horizontal swipe if it's dominant axis and long enough
    if (Math.abs(dx) < SWIPE_THRESHOLD) return;
    if (Math.abs(dy) > Math.abs(dx)) return; // vertical scroll wins

    const idx = SWIPE_TABS.indexOf(navTab);
    if (dx < 0) {
      // Swipe left → go to next (right) tab
      if (idx < SWIPE_TABS.length - 1) setNavTab(SWIPE_TABS[idx + 1]);
    } else {
      // Swipe right → go to previous (left) tab
      if (idx > 0) setNavTab(SWIPE_TABS[idx - 1]);
    }
  }

  const isSwipeable = SWIPE_TABS.includes(navTab);

  return (
    <div
      data-mobile-theme={isDark ? "dark" : "light"}
      className="w-full flex flex-col select-none overflow-hidden"
      style={{ height: "100dvh", backgroundColor: "var(--m-bg)", color: "var(--m-fg)" }}
    >
      {/* Hidden DynamicWidget — its portal renders the profile modal */}
      <div style={{ display: "none" }}>
        <DynamicWidget />
      </div>

      <MobileHamburgerMenu open={menuOpen} onClose={() => setMenuOpen(false)} />

      {showMarketPanel && (
        <MobileMarketSelectPanel
          currentSymbol={currentSymbol}
          onClose={() => setShowMarketPanel(false)}
          onSelect={(sym) => { setCurrentSymbol(sym); setShowMarketPanel(false); }}
        />
      )}

      <MobileTopBar onMenuClick={() => setMenuOpen(true)} />

      {/* Page dots — only visible on swipeable tabs */}
      {isSwipeable && (
        <div style={{ backgroundColor: "var(--m-bg)" }}>
          <PageDots activeTab={navTab} />
        </div>
      )}

      {/* Content area — swipe handlers attached here */}
      <div
        className="flex-1 min-h-0 flex flex-col overflow-hidden"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {navTab === "Trade" ? (
          <div className="flex-1 min-h-0 overflow-y-auto" style={{ paddingBottom: 60 }}>
            <MobilePortfolioWidget />
            <MobileTradeView
              market={market}
              currentSymbol={currentSymbol}
              onOpenMarketPanel={() => setShowMarketPanel(true)}
            />
            <div style={{ borderTop: "1px solid var(--m-bdr)" }}>
              <MobileBottomSection />
            </div>
          </div>

        ) : navTab === "Markets" ? (
          <MobileMarketsPage
            market={market}
            currentSymbol={currentSymbol}
            onOpenMarketPanel={() => setShowMarketPanel(true)}
            onSelectPair={(sym) => {
              setCurrentSymbol(sym);
              setNavTab("Trade");
            }}
          />

        ) : (
          <>
            <MobilePairHeader
              market={market}
              currentSymbol={currentSymbol}
              onOpenMarketPanel={() => setShowMarketPanel(true)}
            />

            <div
              className="flex items-center h-[40px] shrink-0"
              style={{ backgroundColor: "var(--m-bg-1)", borderBottom: "1px solid var(--m-bdr)" }}
            >
              {(["Chart", "Order Book", "Trades"] as MainTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setMainTab(tab)}
                  className="flex-1 h-full text-[13px] font-semibold transition-all relative"
                  style={{ color: mainTab === tab ? "var(--m-fg)" : "var(--m-fg-4)" }}
                >
                  {tab}
                  {mainTab === tab && (
                    <span
                      className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[2px] rounded-full"
                      style={{ backgroundColor: "#f5c518", width: "60%" }}
                    />
                  )}
                </button>
              ))}
            </div>

            <div className="flex-1 min-h-0 flex flex-col overflow-hidden" style={{ paddingBottom: 60 }}>
              <div className="flex-1 min-h-0 overflow-hidden">
                {mainTab === "Chart"      && <MobileChartView livePrice={market.price} />}
                {mainTab === "Order Book" && <MobileOrderBookView market={market} />}
                {mainTab === "Trades"     && <MobileTradesView market={market} />}
              </div>
              <div
                className="shrink-0 overflow-y-auto"
                style={{ height: 160, borderTop: "1px solid var(--m-bdr)" }}
              >
                <MobileBottomSection />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Floating gas + block badge */}
      <FloatingChainStats />

      {/* No-wallet sheet */}
      <NoWalletSheet open={noWalletSheet} onClose={() => setNoWalletSheet(false)} />

      <MobileBottomNav
        activeNav={navTab}
        accountActive={noWalletSheet}
        onNavChange={handleNavChange}
      />
    </div>
  );
}

export function MobileTradePage() {
  return <MobileTradePageInner />;
}
