import { ArrowUpRight } from "lucide-react";

export function SiteNav() {
  return (
    <header className="fixed top-0 inset-x-0 z-50 backdrop-blur-md bg-walnut/70 border-b border-cream/10">
      <div className="container flex items-center justify-between h-14">
        <a href="/" className="flex items-baseline gap-2 group" aria-label="AIOI home">
          <span className="font-display text-xl tracking-tight text-cream">AIOI</span>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-cream/40 group-hover:text-brass-bright transition-colors">
            AI Operating Index
          </span>
        </a>
        <nav className="flex items-center gap-6 font-ui text-sm">
          <a href="/pillars" className="hidden sm:inline text-cream/70 hover:text-cream transition-colors">Pillars</a>
          <a href="/ladder" className="hidden sm:inline text-cream/70 hover:text-cream transition-colors">Ladder</a>
          <a href="/benchmarks" className="hidden sm:inline text-cream/70 hover:text-cream transition-colors">Benchmarks</a>
          <a
            href="https://deepgrain.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-cream/60 hover:text-brass-bright transition-colors"
          >
            deepgrain.ai
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </nav>
      </div>
    </header>
  );
}
