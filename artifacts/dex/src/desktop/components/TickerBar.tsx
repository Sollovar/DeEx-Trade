import { LiveMarketState } from "@/hooks/useLiveMarket";

interface Props {
  market: LiveMarketState;
}

const ITEMS = [
  { text: "Small Amount Exchange Now Available on Spot", highlight: false },
  { text: "0% Fee on USDC \u2194 USDT for 30 Days", highlight: true },
  { text: "Migrate to Pro API | V1 API Sunset Notice", highlight: false },
  { text: "Staking is live on NEXUS Chain", highlight: false },
  { text: "New Listing: SOL/USDT on Base", highlight: true },
  { text: "New Listing: ETH/BTC on Solana", highlight: false },
  { text: "Referral program now live — earn 20% commission", highlight: false },
];

export function TickerBar({ market }: Props) {
  const items = [...ITEMS, ...ITEMS];

  return (
    <div className="h-[28px] bg-[#080808] border-t border-[#1a1a1a] shrink-0 flex items-center overflow-hidden text-[11px] text-[#555]">
      {/* Status */}
      <div className="px-3 flex items-center gap-1.5 border-r border-[#1a1a1a] h-full shrink-0 bg-[#080808] z-10">
        <span className="w-1.5 h-1.5 rounded-full bg-[#00c853] animate-pulse" />
        <span className="text-[#888]">
          Connected <span className="font-mono tabular-nums text-[#aaa]">{market.latencyMs}ms</span>
        </span>
      </div>

      {/* Scrolling ticker */}
      <div className="flex-1 overflow-hidden relative h-full flex items-center">
        <style>{`
          @keyframes marquee-scroll {
            0%   { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          .marquee-track {
            display: flex;
            width: max-content;
            animation: marquee-scroll 40s linear infinite;
          }
          .marquee-track:hover {
            animation-play-state: paused;
          }
        `}</style>
        <div className="marquee-track gap-0">
          {items.map((item, i) => (
            <span
              key={i}
              className={`px-5 cursor-pointer hover:text-white transition-colors whitespace-nowrap border-r border-[#151515] ${
                item.highlight ? "text-[#f5c518] hover:text-[#ffe066]" : "hover:text-[#ccc]"
              }`}
            >
              {item.text}
            </span>
          ))}
        </div>
      </div>

      {/* Right icons */}
      <div className="px-3 flex items-center gap-2 border-l border-[#1a1a1a] h-full shrink-0 text-[#555]">
        <button className="hover:text-white transition-colors">𝕏</button>
        <button className="hover:text-white transition-colors">✉</button>
        <button className="hover:text-white transition-colors">⊕</button>
      </div>
    </div>
  );
}
