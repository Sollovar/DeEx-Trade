import { useState, useRef } from "react";
import { Globe, Settings, Wallet } from "lucide-react";
import { DynamicConnectButton, useDynamicContext } from "@dynamic-labs/sdk-react-core";

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
        <Wallet style={{ width: 13, height: 13, flexShrink: 0, color: "#f5c518" }} />
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
          paddingLeft: 12,
          paddingRight: 14,
          height: 28,
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          gap: 5,
          border: "none",
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        <Wallet style={{ width: 13, height: 13, flexShrink: 0 }} />
        Connect Wallet
      </button>
    </DynamicConnectButton>
  );
}

function MoreDropdown() {
  const [open, setOpen] = useState(false);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleEnter = () => {
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    setOpen(true);
  };

  const handleLeave = () => {
    leaveTimer.current = setTimeout(() => setOpen(false), 120);
  };

  return (
    <div
      className="relative h-full flex items-center"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <a
        href="#"
        className="hover:text-foreground transition-colors flex items-center text-muted-foreground font-medium"
      >
        More <span className="ml-1 text-[10px]">▼</span>
      </a>

      {open && (
        <div
          className="absolute left-0 top-full mt-0 z-50 flex flex-col py-1 rounded-lg border border-border"
          style={{ backgroundColor: "#161616", minWidth: 140 }}
        >
          <a
            href="#"
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
          >
            Docs
          </a>
          <a
            href="#"
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
          >
            API
          </a>
        </div>
      )}
    </div>
  );
}

export function TopNav() {
  return (
    <div className="flex items-center justify-between h-[44px] px-4 border-b border-[#1a1a1a] bg-[#0d0d0d] shrink-0 text-xs">
      <div className="flex items-center gap-6 h-full">
        <div className="flex items-center gap-2 font-bold text-lg tracking-wider text-primary">
          <div className="w-5 h-5 bg-primary rotate-45 rounded-sm" />
          NEXUS
        </div>
        <nav className="flex items-center gap-4 h-full text-muted-foreground font-medium">
          <a href="#" className="text-foreground flex items-center h-full border-b-2 border-primary">
            Trade <span className="ml-1 text-[10px]">▼</span>
          </a>
          <a href="#" className="hover:text-foreground transition-colors">Portfolio</a>
          <MoreDropdown />
        </nav>
      </div>

      <div className="flex items-center gap-3">
        <WalletButton />
        <div className="w-[1px] h-4 bg-border mx-1" />
        <button className="text-muted-foreground hover:text-foreground transition-colors">
          <Globe className="w-4 h-4" />
        </button>
        <button className="text-muted-foreground hover:text-foreground transition-colors">
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
