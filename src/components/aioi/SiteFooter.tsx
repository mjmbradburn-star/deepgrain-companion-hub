export function SiteFooter() {
  return (
    <footer className="border-t border-cream/10 bg-surface-0">
      <div className="container py-10 sm:py-12">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <p className="font-display text-2xl text-cream">AIOI</p>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cream/40 mt-1">
              The AI Operating Index · A Deepgrain instrument
            </p>
          </div>
          <nav className="flex flex-wrap gap-x-8 gap-y-3 font-ui text-sm text-cream/60">
            <a href="/pillars" className="hover:text-cream">Pillars</a>
            <a href="/ladder" className="hover:text-cream">Ladder</a>
            <a href="/benchmarks" className="hover:text-cream">Benchmarks</a>
            <a href="https://deepgrain.ai" target="_blank" rel="noopener noreferrer" className="hover:text-brass-bright">deepgrain.ai ↗</a>
          </nav>
        </div>
        <div className="mt-8 pt-5 border-t border-cream/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 font-mono text-[10px] uppercase tracking-[0.18em] sm:tracking-[0.2em] text-cream/30">
          <span>© {new Date().getFullYear()} Deepgrain Studio</span>
          <span>v1.0 · {new Date().toISOString().slice(0, 10)}</span>
        </div>
      </div>
    </footer>
  );
}
