import { useState, useRef, useEffect } from "react";
import { Globe, Settings, ArrowRight, ChevronDown, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DynamicWidget, useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { useConnectedNetwork, useSetNetwork, type Network } from "@/hooks/useConnectedNetwork";
import { ChainIcon } from "@/components/ChainIcons";

type SupportedNetwork = Extract<Network, "bsc" | "base" | "solana">;

const NETWORKS: { id: SupportedNetwork; label: string; abbr: string; color: string }[] = [
  { id: "bsc",    label: "BNB Chain", abbr: "BNB", color: "#F3BA2F" },
  { id: "base",   label: "Base",      abbr: "BASE", color: "#0052FF" },
  { id: "solana", label: "Solana",    abbr: "SOL",  color: "#9945FF" },
];

const EVM_CHAIN_IDS: Partial<Record<SupportedNetwork, number>> = {
  bsc:  56,
  base: 8453,
};

function NetworkDropdown() {
  const network = useConnectedNetwork() as SupportedNetwork;
  const setNetwork = useSetNetwork();
  const { primaryWallet } = useDynamicContext();
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState<SupportedNetwork | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const active = NETWORKS.find((n) => n.id === network) ?? NETWORKS[0];

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const pick = async (id: SupportedNetwork) => {
    if (id === network) { setOpen(false); return; }

    setOpen(false);
    setNetwork(id);

    const chainId = EVM_CHAIN_IDS[id];
    if (!primaryWallet || !chainId) return;
    if ((primaryWallet as any).chain !== "EVM") return;

    setSwitching(id);
    try {
      await primaryWallet.connector.switchNetwork({ networkChainId: chainId });
    } catch (err) {
      console.warn("[TopNav] switchNetwork failed:", err);
    } finally {
      setSwitching(null);
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-3 py-1.5 rounded bg-[#1a1a1a] hover:bg-[#222] transition-colors border border-border"
      >
        <ChainIcon id={active.id} size={14} />
        <span className="font-medium text-foreground" style={{ color: active.color }}>
          {active.abbr}
        </span>
        {switching ? (
          <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
        ) : (
          <ChevronDown className="w-3 h-3 text-muted-foreground" />
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1 z-50 flex flex-col py-1 rounded-lg border border-border"
          style={{ backgroundColor: "#161616", minWidth: 160 }}
        >
          {NETWORKS.map((net) => {
            const isActive = network === net.id;
            const isSwitchingThis = switching === net.id;
            return (
              <button
                key={net.id}
                onClick={() => pick(net.id)}
                disabled={switching !== null}
                className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium transition-colors hover:bg-white/5 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <ChainIcon id={net.id} size={16} />
                <span className="flex-1 text-left" style={{ color: isActive ? net.color : "var(--foreground)" }}>
                  {net.label}
                </span>
                {isSwitchingThis ? (
                  <Loader2 className="w-3 h-3 animate-spin" style={{ color: net.color }} />
                ) : isActive ? (
                  <Check className="w-3 h-3" style={{ color: net.color }} />
                ) : null}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function TopNav() {
  return (
    <div className="flex items-center justify-between h-[44px] px-4 border-b border-[#1e1e1e] bg-[#111111] shrink-0 text-xs">
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
          <a href="#" className="hover:text-foreground transition-colors">Referral</a>
          <a href="#" className="hover:text-foreground transition-colors flex items-center">
            Rewards <span className="ml-1 text-[10px]">▼</span>
          </a>
          <a href="#" className="hover:text-foreground transition-colors flex items-center">
            More <span className="ml-1 text-[10px]">▼</span>
          </a>
        </nav>
      </div>

      <div className="flex items-center gap-3">
        <NetworkDropdown />
        <DynamicWidget
          innerButtonComponent={
            <Button variant="outline" className="h-7 text-xs border-primary text-primary hover:bg-primary/10 rounded">
              Connect Wallet
            </Button>
          }
        />
        <div className="w-[1px] h-4 bg-border mx-1" />
        <button className="text-muted-foreground hover:text-foreground transition-colors">
          <Globe className="w-4 h-4" />
        </button>
        <button className="text-muted-foreground hover:text-foreground transition-colors">
          <Settings className="w-4 h-4" />
        </button>
        <a href="#" className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors ml-2">
          To Old Version <ArrowRight className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}
