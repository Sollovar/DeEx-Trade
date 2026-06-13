import { useState } from "react";
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
import { MobileAccountPage } from "./components/MobileAccountPage";
import { MobileMarketsPage } from "./components/MobileMarketsPage";

type MainTab = "Chart" | "Order Book" | "Trades";

function MobileTradePageInner() {
  const market = useLiveMarket();
  const { isDark } = useTheme();
  const { primaryWallet, setShowDynamicUserProfile } = useDynamicContext();
  const [mainTab, setMainTab] = useState<MainTab>("Chart");
  const [navTab, setNavTab] = useState<NavTab>("Trade");
  const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

  function handleNavChange(tab: NavTab) {
    if (tab === "Home") {
      window.location.href = BASE + "/";
      return;
    }
    // If wallet connected and user taps Account → pop Dynamic profile immediately
    if (tab === "Account" && primaryWallet) {
      setNavTab("Account");
      setShowDynamicUserProfile(true);
      return;
    }
    setNavTab(tab);
  }
  const [currentSymbol, setCurrentSymbol] = useState("BTCUSDT");
  const [showMarketPanel, setShowMarketPanel] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div
      data-mobile-theme={isDark ? "dark" : "light"}
      className="w-full flex flex-col select-none overflow-hidden"
      style={{ height: "100dvh", backgroundColor: "var(--m-bg)", color: "var(--m-fg)" }}
    >
      <MobileHamburgerMenu open={menuOpen} onClose={() => setMenuOpen(false)} />

      {showMarketPanel && (
        <MobileMarketSelectPanel
          currentSymbol={currentSymbol}
          onClose={() => setShowMarketPanel(false)}
          onSelect={(sym) => { setCurrentSymbol(sym); setShowMarketPanel(false); }}
        />
      )}

      <MobileTopBar onMenuClick={() => setMenuOpen(true)} />

      {navTab === "Trade" ? (
        <div className="flex-1 min-h-0 overflow-y-auto" style={{ paddingBottom: 60 }}>
          <MobileTradeView
            market={market}
            currentSymbol={currentSymbol}
            onOpenMarketPanel={() => setShowMarketPanel(true)}
          />
          <div style={{ borderTop: "1px solid var(--m-bdr)" }}>
            <MobileBottomSection />
          </div>
        </div>

      ) : navTab === "Account" ? (
        <MobileAccountPage />

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

          {/* Chart/Orderbook/Trades tabs — evenly distributed */}
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

      <MobileBottomNav activeNav={navTab} onNavChange={handleNavChange} />
    </div>
  );
}

export function MobileTradePage() {
  return <MobileTradePageInner />;
}
