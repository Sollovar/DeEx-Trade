import { Search, Globe, Settings, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

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
            Chain <span className="ml-1 text-[10px]">▼</span>
          </a>
          <a href="#" className="hover:text-foreground transition-colors flex items-center">
            Rewards <span className="ml-1 text-[10px]">▼</span>
          </a>
          <a href="#" className="hover:text-foreground transition-colors flex items-center">
            More <span className="ml-1 text-[10px]">▼</span>
          </a>
        </nav>
      </div>

      <div className="flex items-center gap-3">
        <button className="flex items-center gap-2 px-3 py-1.5 rounded bg-[#1a1a1a] hover:bg-[#222] transition-colors border border-border">
          <div className="w-4 h-4 rounded-full bg-[#f3ba2f] flex items-center justify-center text-[10px] text-black font-bold">B</div>
          <span className="font-medium text-foreground">BNB</span>
          <span className="text-[10px] text-muted-foreground">▼</span>
        </button>
        <Button variant="outline" className="h-7 text-xs border-primary text-primary hover:bg-primary/10 rounded">
          Connect Wallet
        </Button>
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
