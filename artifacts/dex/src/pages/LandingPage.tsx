import { useEffect, useRef, useState } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { ArrowRight, Shield, Zap, Globe, Lock, TrendingUp, Layers, ChevronRight, Menu, X } from "lucide-react";
import { useLiveMarket } from "@/hooks/useLiveMarket";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

/* ── Lightweight count-up via requestAnimationFrame ── */
function useCountUp(target: number, duration = 1600, started = true) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!started) return;
    const start = performance.now();
    let rafId: number;
    function tick(now: number) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.floor(eased * target));
      if (progress < 1) rafId = requestAnimationFrame(tick);
    }
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [target, duration, started]);
  return value;
}

/* ── Scroll-based nav opacity (no framer useScroll) ── */
function useScrolled(threshold = 60) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > threshold);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, [threshold]);
  return scrolled;
}

/* ── Fade-in wrapper (lightweight) ── */
function FadeIn({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function GlowOrb({ className }: { className?: string }) {
  return <div className={`absolute rounded-full blur-[100px] pointer-events-none ${className}`} />;
}

function StatCard({ label, value, prefix = "", suffix = "" }: { label: string; value: number; prefix?: string; suffix?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  const count = useCountUp(value, 1600, inView);
  return (
    <div ref={ref} className="flex flex-col gap-1">
      <span className="text-2xl md:text-3xl font-bold text-white">{prefix}{count.toLocaleString()}{suffix}</span>
      <span className="text-xs text-white/40 uppercase tracking-widest">{label}</span>
    </div>
  );
}

/* ── Static candlestick chart (no individual animations) ── */
const BARS = [40,42,38,45,50,47,43,48,52,55,50,48,60,65,62,58,70,68,72,75,70,68,80,78,82,85,80,78,90,88,85,92,95,90,88,85,90,95,100,98,95,100,105,102,98,105,108,105,100,105,110,108,105,112,115,110,108,115,120,118,125,120,118,125,128,125,120,128,130,128,125,130,132,128];

const NAV_LINKS = ["Trade", "Portfolio", "Chain", "Rewards", "Docs"];

/* ── Ticker tape ── */
const TICKER_SEEDS = [
  { symbol: "ETH",  base: 3521,   change: +1.12 },
  { symbol: "SOL",  base: 185.4,  change: -0.81 },
  { symbol: "BNB",  base: 412.2,  change: +3.21 },
  { symbol: "ARB",  base: 1.24,   change: -1.43 },
  { symbol: "OP",   base: 2.87,   change: +0.67 },
  { symbol: "DOGE", base: 0.1621, change: +5.14 },
  { symbol: "AVAX", base: 38.72,  change: -0.32 },
  { symbol: "LINK", base: 18.43,  change: +2.09 },
  { symbol: "SUI",  base: 1.83,   change: +4.77 },
  { symbol: "INJ",  base: 28.11,  change: -2.61 },
];

function TickerTape({ btcPrice }: { btcPrice: number }) {
  const [prices, setPrices] = useState(() =>
    TICKER_SEEDS.map(s => ({ ...s, price: s.base }))
  );

  useEffect(() => {
    const id = setInterval(() => {
      setPrices(prev => prev.map(p => ({
        ...p,
        price: +(p.price + p.price * (Math.random() - 0.5) * 0.0008).toFixed(
          p.base < 1 ? 4 : p.base < 10 ? 3 : p.base < 100 ? 2 : 1
        ),
      })));
    }, 1200);
    return () => clearInterval(id);
  }, []);

  const items = [
    { symbol: "BTC", price: btcPrice, change: -0.7 },
    ...prices,
  ];
  const doubled = [...items, ...items]; // seamless loop

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] h-8 overflow-hidden bg-[#0a0a0a] border-b border-white/[0.06] flex items-center">
      <div className="ticker-track flex items-center gap-0 whitespace-nowrap">
        {doubled.map((item, i) => (
          <span key={i} className="inline-flex items-center gap-2 px-5 border-r border-white/[0.06] h-8 text-[11px] font-medium shrink-0">
            <span className="text-white/40">{item.symbol}/USDT</span>
            <span className="text-white font-semibold">
              {item.price < 1 ? item.price.toFixed(4) : item.price < 10 ? item.price.toFixed(3) : item.price < 100 ? item.price.toFixed(2) : item.price.toFixed(1)}
            </span>
            <span className={item.change >= 0 ? "text-[#22c55e]" : "text-[#ef4444]"}>
              {item.change >= 0 ? "+" : ""}{item.change.toFixed(2)}%
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const scrolled = useScrolled(60);
  const market = useLiveMarket();

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden font-sans">
      {/* CSS-only animations */}
      <style>{`
        @keyframes spin-slow { to { transform: rotate(360deg); } }
        @keyframes spin-rev  { to { transform: rotate(-360deg); } }
        .ring-1 { animation: spin-slow 40s linear infinite; }
        .ring-2 { animation: spin-rev  60s linear infinite; }
        .ring-3 { animation: spin-slow 90s linear infinite; }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        .float-tag { animation: float 3s ease-in-out infinite; }
        @keyframes ticker-scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .ticker-track { animation: ticker-scroll 60s linear infinite; }
        .ticker-track:hover { animation-play-state: paused; }
      `}</style>

      {/* ── Ticker tape (fixed above navbar) ── */}
      <TickerTape btcPrice={market.price} />

      {/* ── Navbar (sits below 32px ticker) ── */}
      <nav
        className="fixed left-0 right-0 z-50 border-b border-white/[0.06] transition-all duration-300"
        style={{ top: 32, backgroundColor: scrolled ? "rgba(0,0,0,0.95)" : "transparent", backdropFilter: scrolled ? "blur(12px)" : "none" }}
      >
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl tracking-wider text-[#f5c518]">
            <div className="w-5 h-5 bg-[#f5c518] rotate-45 rounded-sm shrink-0" />
            NEXUS
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-white/50">
            {NAV_LINKS.map(l => (
              <a key={l} href="#" className="hover:text-white transition-colors duration-200">{l}</a>
            ))}
          </div>
          <div className="hidden md:flex items-center gap-3">
            <a
              href={BASE + "/?app=1"}
              className="btn-gold-glow px-5 py-2 bg-[#f5c518] text-black text-sm font-bold rounded-full flex items-center gap-2 group"
            >
              Launch App
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </a>
          </div>
          {/* Mobile: Launch App + hamburger */}
          <div className="md:hidden flex items-center gap-2">
            <a
              href={BASE + "/?app=1"}
              className="btn-gold-glow px-3.5 py-1.5 bg-[#f5c518] text-black text-xs font-bold rounded-full"
            >
              Launch App
            </a>
            <button className="text-white/60 hover:text-white p-1" onClick={() => setMenuOpen(v => !v)}>
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden bg-black border-t border-white/5 overflow-hidden"
            >
              <div className="px-6 py-4 flex flex-col gap-4 text-sm text-white/60">
                {NAV_LINKS.map(l => <a key={l} href="#" className="hover:text-white transition-colors">{l}</a>)}
                <a href={BASE + "/?app=1"} className="btn-gold-glow mt-2 px-5 py-2.5 bg-[#f5c518] text-black font-bold rounded-full text-center">Launch App</a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ── Hero ── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center pt-[88px] pb-20 px-6 overflow-hidden">
        {/* Glow orbs — pure CSS, no JS */}
        <GlowOrb className="w-[600px] h-[600px] bg-[#f5c518]/[0.07] top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/4" />
        <GlowOrb className="w-[280px] h-[280px] bg-[#f5c518]/[0.04] top-10 right-10" />

        {/* CSS-only rotating rings */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="ring-1 w-[680px] h-[680px] rounded-full border border-[#f5c518]/[0.08]" />
          <div className="ring-2 absolute w-[480px] h-[480px] rounded-full border border-white/[0.05]" />
          <div className="ring-3 absolute w-[920px] h-[920px] rounded-full border border-white/[0.025]" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <motion.h1
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="text-5xl md:text-7xl font-bold leading-[1.05] tracking-tight mb-6"
          >
            The Frontier of<br />
            <span className="text-[#f5c518]">On-chain Trading</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-white/50 text-lg md:text-xl max-w-xl mx-auto mb-10 leading-relaxed"
          >
            Built on advanced on-chain tech for efficiency, scale, and real privacy.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-24"
          >
            <a
              href={BASE + "/?app=1"}
              className="btn-gold-glow flex items-center gap-2 px-8 py-3.5 bg-[#f5c518] text-black font-bold rounded-full group text-sm"
            >
              Start Trading
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </a>
            <a href="#why" className="btn-ghost-glow flex items-center gap-2 px-8 py-3.5 bg-white/[0.05] border border-white/10 text-white text-sm font-medium rounded-full hover:bg-white/10">
              Learn More
            </a>
          </motion.div>

          {/* Stats — trigger count-up once in view */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.45 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 border-t border-white/[0.08] pt-10"
          >
            <StatCard label="Assets" value={380} />
            <StatCard label="Open Interest" value={5438} prefix="$" suffix="M" />
            <StatCard label="Users" value={12400} />
            <StatCard label="Total Trading Volume" value={4441} prefix="$" suffix="M" />
          </motion.div>
        </div>
      </section>

      {/* ── Why NEXUS ── */}
      <section id="why" className="py-28 px-6 relative bg-black">
        <GlowOrb className="w-[350px] h-[350px] bg-[#f5c518]/[0.04] bottom-0 left-0" />
        <div className="max-w-6xl mx-auto">
          <FadeIn className="text-center mb-16">
            <p className="text-[#f5c518] text-xs uppercase tracking-widest mb-3 font-medium">Why Choose Us</p>
            <h2 className="text-4xl md:text-5xl font-bold">Why NEXUS</h2>
          </FadeIn>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { icon: Globe, title: "Universal Access", desc: "Trade any asset in every market. No restrictions, no borders.", delay: 0 },
              { icon: Lock, title: "Native Privacy", desc: "Higher leverage margin that earns. Nobody needs to see, privacy by default.", delay: 0.08 },
              { icon: Zap, title: "Capital Efficiency", desc: "Maximum output from your capital. Sub-second settlement, zero slippage.", delay: 0.16 },
              { icon: Layers, title: "Open Composability", desc: "Permissionless building blocks for the next generation of DeFi apps.", delay: 0.24 },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <FadeIn key={item.title} delay={item.delay}>
                  <div className="group p-6 bg-[#0d0d0d] border border-white/[0.06] rounded-2xl hover:border-[#f5c518]/30 transition-all duration-300 h-full">
                    <div className="w-11 h-11 rounded-2xl bg-[#f5c518]/10 flex items-center justify-center mb-5 group-hover:bg-[#f5c518]/20 transition-colors">
                      <Icon className="w-5 h-5 text-[#f5c518]" />
                    </div>
                    <h3 className="font-semibold text-base mb-2 text-white">{item.title}</h3>
                    <p className="text-white/40 text-sm leading-relaxed">{item.desc}</p>
                  </div>
                </FadeIn>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── The NEXUS Experience ── */}
      <section className="py-28 px-6 bg-[#050505] relative">
        <GlowOrb className="w-[450px] h-[450px] bg-[#f5c518]/[0.04] top-1/2 right-0 -translate-y-1/2" />
        <div className="max-w-6xl mx-auto">
          <FadeIn className="text-center mb-16">
            <p className="text-[#f5c518] text-xs uppercase tracking-widest mb-3 font-medium">Platform</p>
            <h2 className="text-4xl md:text-5xl font-bold">The NEXUS Experience</h2>
            <p className="text-white/40 mt-4 max-w-lg mx-auto">
              Deploy across every frontier. Commodities, prediction markets, AI, and more — all in one terminal.
            </p>
          </FadeIn>
          <FadeIn delay={0.15}>
            <div className="bg-[#0a0a0a] border border-white/[0.07] rounded-2xl overflow-hidden">
              {/* Tab bar */}
              <div className="flex items-center gap-3 px-5 py-3 border-b border-white/5 bg-[#0d0d0d]">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
                </div>
                <div className="flex-1 flex items-center gap-4 text-xs text-white/30 ml-4">
                  {["BTC/USDT", "ETH/USDT", "SOL/USDT", "BNB/USDT"].map((p, i) => (
                    <span key={p} className={i === 0 ? "text-[#f5c518]" : ""}>{p}</span>
                  ))}
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2 py-0.5 rounded-lg bg-white/5 text-white/40">24H</span>
                  <span className="px-2 py-0.5 rounded-lg bg-white/5 text-white/40">Permissionless</span>
                </div>
              </div>
              {/* Static chart — no per-bar animations */}
              <div className="relative h-56 md:h-64 overflow-hidden px-5 pt-4">
                <div className="flex items-end gap-[2px] h-full pb-4 opacity-70">
                  {BARS.map((h, i) => {
                    const isUp = i === 0 || h >= BARS[i - 1];
                    return (
                      <div
                        key={i}
                        className={`flex-1 min-w-0 rounded-[2px] transition-none ${isUp ? "bg-[#22c55e]" : "bg-[#ef4444]"}`}
                        style={{ height: `${h * 0.62}%` }}
                      />
                    );
                  })}
                </div>
                <div className="absolute top-4 left-5">
                  <div className="text-2xl font-bold text-white">$67,420.50</div>
                  <div className="text-sm text-[#22c55e] flex items-center gap-1 mt-0.5">
                    <TrendingUp className="w-3 h-3" />
                    +2.34% (24h)
                  </div>
                </div>
              </div>
              {/* Stats bar */}
              <div className="grid grid-cols-2 md:grid-cols-4 border-t border-white/5">
                {[
                  { label: "Mark Price", value: "$67,420.50" },
                  { label: "Index Price", value: "$67,415.20" },
                  { label: "Funding", value: "0.0100%" },
                  { label: "Open Interest", value: "$1.2B" },
                ].map((s, i) => (
                  <div key={i} className={`px-5 py-3 ${i < 3 ? "border-r border-white/5" : ""}`}>
                    <div className="text-[10px] text-white/30 uppercase tracking-wider mb-0.5">{s.label}</div>
                    <div className="text-sm font-semibold text-white">{s.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── Feature Rows ── */}
      {([
        { badge: "24 / 7", title: "Trade every frontier", desc: "Equities, commodities, prediction markets, AI tokens. NEXUS gives you access to every on-chain market — anytime, anywhere.", accent: "24/7 · Permissionless", reverse: false, bg: "bg-black" },
        { badge: "Privacy", title: "Move without being watched", desc: "NEXUS has privacy baked in at the protocol level. Your strategy is yours. Stealth addresses and shielded transactions keep your positions private.", accent: "ZK-Verified · Stealth Addresses", reverse: true, bg: "bg-[#050505]" },
        { badge: "Yield", title: "Earn on idle margin", desc: "Margin deposits earn yield automatically. Every dollar sitting in your account works for you — even when you're not actively trading.", accent: "Yield Bearing Stablecoin · Dual Yield", reverse: false, bg: "bg-black" },
      ] as const).map((item, idx) => (
        <section key={idx} className={`py-24 px-6 ${item.bg} relative overflow-hidden`}>
          <div className="max-w-6xl mx-auto">
            <div className={`flex flex-col ${item.reverse ? "md:flex-row-reverse" : "md:flex-row"} items-center gap-16`}>
              <FadeIn className="flex-1">
                <span className="inline-flex items-center px-4 py-1.5 rounded-full bg-[#f5c518]/10 text-[#f5c518] text-xs font-medium tracking-wider mb-5 border border-[#f5c518]/20">
                  {item.badge}
                </span>
                <h2 className="text-3xl md:text-4xl font-bold leading-tight mb-5">{item.title}</h2>
                <p className="text-white/40 leading-relaxed mb-6 max-w-md">{item.desc}</p>
                <div className="flex flex-wrap gap-2">
                  {item.accent.split(" · ").map(tag => (
                    <span key={tag} className="px-3 py-1.5 bg-white/[0.05] border border-white/10 text-xs text-white/60 rounded-xl">{tag}</span>
                  ))}
                </div>
              </FadeIn>
              <FadeIn delay={0.12} className="flex-1 w-full">
                <div className="bg-[#0a0a0a] border border-white/[0.07] rounded-2xl p-6 overflow-hidden">
                  <div className="space-y-3">
                    {[
                      { pair: "BTC/USDT", price: "$67,420", change: "+2.3%", green: true },
                      { pair: "ETH/USDT", price: "$3,521",  change: "+1.1%", green: true },
                      { pair: "SOL/USDT", price: "$185.4",  change: "-0.8%", green: false },
                      { pair: "BNB/USDT", price: "$412.2",  change: "+3.2%", green: true },
                    ].map((row) => (
                      <div key={row.pair} className="flex items-center justify-between py-2.5 border-b border-white/[0.05] last:border-0">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-[#f5c518]/10 flex items-center justify-center text-[10px] font-bold text-[#f5c518]">
                            {row.pair[0]}
                          </div>
                          <span className="text-sm font-medium">{row.pair}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold">{row.price}</div>
                          <div className={`text-xs ${row.green ? "text-[#22c55e]" : "text-[#ef4444]"}`}>{row.change}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </FadeIn>
            </div>
          </div>
        </section>
      ))}

      {/* ── NEXUS Chain ── */}
      <section className="py-28 px-6 bg-[#030303] relative overflow-hidden">
        <GlowOrb className="w-[500px] h-[500px] bg-[#f5c518]/[0.05] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        <div className="max-w-6xl mx-auto text-center relative z-10">
          <FadeIn>
            <p className="text-[#f5c518] text-xs uppercase tracking-widest mb-3 font-medium">Infrastructure</p>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">NEXUS Chain</h2>
            <p className="text-white/40 max-w-lg mx-auto mb-16">
              A purpose-built blockchain designed for high-frequency trading at internet scale.
            </p>
          </FadeIn>
          <div className="grid md:grid-cols-3 gap-5 mb-12">
            {[
              { title: "Sub-Second Finality", desc: "Up to 100,000 TPS. Sub-gas, PoSA. Every trade generates a fresh zero-knowledge proof for immediate trustless settlement.", icon: Zap },
              { title: "Built-in Privacy",    desc: "Stealth addresses and shielded accounts. Your trades, your portfolio — fully private by default.", icon: Shield },
              { title: "Multi-Chain by Design", desc: "Supports BNB Chain, Arbitrum, Ethereum and Solana. Bridging handled automatically, unified liquidity across chains.", icon: Layers },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <FadeIn key={item.title} delay={i * 0.08}>
                  <div className="p-7 bg-[#0a0a0a] border border-white/[0.07] rounded-2xl text-left group hover:border-[#f5c518]/25 transition-colors h-full">
                    <div className="w-12 h-12 rounded-2xl bg-[#f5c518]/10 flex items-center justify-center mb-5 group-hover:bg-[#f5c518]/20 transition-colors">
                      <Icon className="w-6 h-6 text-[#f5c518]" />
                    </div>
                    <h3 className="text-base font-bold mb-3">{item.title}</h3>
                    <p className="text-white/40 text-sm leading-relaxed">{item.desc}</p>
                  </div>
                </FadeIn>
              );
            })}
          </div>
          {/* CSS-animated floating tags */}
          <FadeIn delay={0.2}>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              {["Finality", "Privacy", "Speed", "Scale", "Assets"].map((tag, i) => (
                <div
                  key={tag}
                  className="float-tag px-5 py-2 bg-[#111] border border-white/10 rounded-full text-sm text-white/60 font-medium"
                  style={{ animationDelay: `${i * 0.4}s` }}
                >
                  {tag}
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── Ecosystem ── */}
      <section className="py-24 px-6 bg-black">
        <div className="max-w-5xl mx-auto">
          <FadeIn className="text-center mb-14">
            <p className="text-[#f5c518] text-xs uppercase tracking-widest mb-3 font-medium">Partners</p>
            <h2 className="text-3xl md:text-4xl font-bold">Trusted by the Ecosystem</h2>
          </FadeIn>
          <FadeIn delay={0.1}>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
              {[
                { name: "PancakeSwap", abbr: "PS" },
                { name: "LayerZero",   abbr: "LZ" },
                { name: "Chainlink",   abbr: "CL" },
                { name: "KERNEL",      abbr: "KN" },
                { name: "Pyth",        abbr: "PY" },
                { name: "Stargate",    abbr: "SG" },
              ].map((p) => (
                <div key={p.name} className="flex flex-col items-center justify-center gap-2.5 p-4 bg-[#0a0a0a] border border-white/[0.06] rounded-2xl hover:border-white/15 transition-colors group">
                  <div className="w-11 h-11 rounded-2xl bg-[#f5c518]/10 flex items-center justify-center text-xs font-bold text-[#f5c518] group-hover:bg-[#f5c518]/20 transition-colors">
                    {p.abbr}
                  </div>
                  <span className="text-[10px] text-white/30">{p.name}</span>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── Mobile Section ── */}
      <section className="py-28 px-6 bg-[#050505] relative overflow-hidden">
        <GlowOrb className="w-[380px] h-[380px] bg-[#f5c518]/[0.05] bottom-0 right-0" />
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center gap-16">
            <FadeIn className="flex-1">
              <p className="text-[#f5c518] text-xs uppercase tracking-widest mb-3 font-medium">Mobile</p>
              <h2 className="text-4xl md:text-5xl font-bold mb-5">NEXUS in Your Pocket</h2>
              <p className="text-white/40 leading-relaxed mb-8 max-w-md">
                Never miss an opportunity with the NEXUS mobile app. Trade BTC, ETH, SOL and thousands of altcoins from anywhere. Available on iOS and Android.
              </p>
              <div className="flex gap-3">
                <a href="#" className="flex items-center gap-2 px-5 py-2.5 bg-white/[0.05] border border-white/[0.12] rounded-xl hover:bg-white/10 transition-colors text-sm font-medium">
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
                  App Store
                </a>
                <a href="#" className="flex items-center gap-2 px-5 py-2.5 bg-white/[0.05] border border-white/[0.12] rounded-xl hover:bg-white/10 transition-colors text-sm font-medium">
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M3.18 23.76c.34.19.73.22 1.1.08L14.93 12 4.28.16C3.91.02 3.52.05 3.18.24 2.5.61 2.04 1.34 2.04 2.24v19.52c0 .9.46 1.63 1.14 2zM16.79 9.27l-2.12-2.12-9.3-5.37 9.86 9.86 1.56-2.37zM20.34 11c-.31-.19-.65-.34-1-.45l-1.94 2.94 1.94 2.94c.35-.11.69-.26 1-.45C21.21 15.5 21.72 14.5 21.72 13s-.51-2.5-1.38-2z"/><path d="M5.37 21.22l9.3-5.37 2.12-2.12-1.56-2.37-9.86 9.86z"/></svg>
                  Google Play
                </a>
              </div>
            </FadeIn>
            <FadeIn delay={0.12} className="flex-1 flex justify-center">
              <div className="relative w-60">
                <div className="relative bg-[#0d0d0d] border-2 border-white/10 rounded-[44px] overflow-hidden shadow-2xl" style={{ aspectRatio: "9/19" }}>
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-[#0d0d0d] border-b border-white/10 rounded-b-2xl z-10" />
                  <div className="h-full bg-[#050505] p-4 pt-8 flex flex-col gap-3">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1.5 text-[#f5c518] font-bold text-sm mb-1">
                        <div className="w-3 h-3 bg-[#f5c518] rotate-45 rounded-[2px] shrink-0" /> NEXUS
                      </div>
                      <div className="text-2xl font-bold text-white">$67,420</div>
                      <div className="text-[#22c55e] text-xs">+2.34% today</div>
                    </div>
                    <div className="h-16 relative overflow-hidden rounded-2xl bg-[#111]">
                      <svg viewBox="0 0 200 60" className="w-full h-full" preserveAspectRatio="none">
                        <polyline points="0,50 20,45 40,48 60,35 80,30 100,32 120,20 140,18 160,22 180,15 200,10" fill="none" stroke="#f5c518" strokeWidth="1.5"/>
                        <polyline points="0,50 20,45 40,48 60,35 80,30 100,32 120,20 140,18 160,22 180,15 200,10 200,60 0,60" fill="url(#pg)"/>
                        <defs>
                          <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#f5c518" stopOpacity="0.2"/>
                            <stop offset="100%" stopColor="#f5c518" stopOpacity="0"/>
                          </linearGradient>
                        </defs>
                      </svg>
                    </div>
                    {["BTC +2.3%", "ETH +1.1%", "SOL -0.8%"].map((t, i) => (
                      <div key={i} className="flex justify-between items-center py-1.5 border-b border-white/5 text-xs">
                        <span className="text-white/60">{t.split(" ")[0]}/USDT</span>
                        <span className={t.includes("+") ? "text-[#22c55e]" : "text-[#ef4444]"}>{t.split(" ")[1]}</span>
                      </div>
                    ))}
                    <div className="mt-auto">
                      <div className="w-full py-2.5 bg-[#f5c518] text-black text-xs font-bold text-center rounded-xl">Start Trading</div>
                    </div>
                  </div>
                </div>
                <div className="absolute inset-0 rounded-[44px] bg-[#f5c518]/5 blur-2xl -z-10 scale-110" />
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-28 px-6 bg-black relative overflow-hidden">
        <GlowOrb className="w-[550px] h-[550px] bg-[#f5c518]/[0.07] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        <FadeIn className="max-w-3xl mx-auto text-center relative z-10">
          <h2 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            Trade at the<br /><span className="text-[#f5c518]">speed of thought.</span>
          </h2>
          <p className="text-white/40 text-lg mb-10 max-w-lg mx-auto">
            Join thousands of traders already on NEXUS. No KYC. No limits. Full control.
          </p>
          <a
            href={BASE + "/?app=1"}
            className="btn-gold-glow inline-flex items-center gap-2 px-10 py-4 bg-[#f5c518] text-black text-base font-bold rounded-full group"
          >
            Start Trading Now
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </a>
        </FadeIn>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/[0.05] bg-[#030303] py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-start justify-between gap-10 mb-10">
            <div>
              <div className="flex items-center gap-2 font-bold text-lg tracking-wider text-[#f5c518] mb-3">
                <div className="w-4 h-4 bg-[#f5c518] rotate-45 rounded-sm shrink-0" />
                NEXUS
              </div>
              <p className="text-white/30 text-sm max-w-xs">The frontier of on-chain trading. Built for everyone.</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
              {[
                { label: "Product", links: ["Trade", "Portfolio", "Mobile App", "Roadmap"] },
                { label: "Learn",   links: ["Docs", "Whitepaper", "Blog", "Tutorials"] },
                { label: "Chain",   links: ["Explorer", "Bridge", "Validators", "Grant"] },
                { label: "Company", links: ["About", "Careers", "Press", "Contact"] },
              ].map(col => (
                <div key={col.label}>
                  <div className="text-white/60 font-medium mb-3">{col.label}</div>
                  {col.links.map(l => (
                    <a key={l} href="#" className="block text-white/30 hover:text-white/60 transition-colors mb-1.5">{l}</a>
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-6 border-t border-white/[0.05] text-xs text-white/20">
            <span>© 2025 NEXUS Foundation. All rights reserved.</span>
            <div className="flex gap-6">
              <a href="#" className="hover:text-white/40 transition-colors">Terms</a>
              <a href="#" className="hover:text-white/40 transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white/40 transition-colors">Risk Disclaimer</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
