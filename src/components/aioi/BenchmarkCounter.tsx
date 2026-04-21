import { useEffect, useState } from "react";

export function BenchmarkCounter() {
  const [count, setCount] = useState(2847);
  const [score, setScore] = useState(34);

  useEffect(() => {
    const id = setInterval(() => {
      setCount((c) => c + Math.floor(Math.random() * 2));
    }, 4200);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    // gentle drift on median
    const id = setInterval(() => setScore((s) => Math.max(28, Math.min(42, s + (Math.random() > 0.5 ? 1 : -1)))), 8000);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="relative section-y border-t border-b border-brass/20" style={{ backgroundColor: 'hsl(150 55% 8%)' }}>
      <div className="container grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-10 md:gap-4">
        <div>
          <p className="font-ui uppercase tracking-[0.14em] sm:tracking-[0.18em] text-[11px] sm:text-xs text-brass-bright mb-3">Live benchmark</p>
          <p className="font-display text-5xl sm:text-6xl text-brass-bright tabular-nums">{count.toLocaleString()}</p>
          <p className="mt-2 font-display italic text-base sm:text-lg text-brass/80">assessments completed</p>
        </div>
        <div>
          <p className="font-ui uppercase tracking-[0.14em] sm:tracking-[0.18em] text-[11px] sm:text-xs text-brass-bright mb-3">Median AIOI</p>
          <p className="font-display text-5xl sm:text-6xl text-brass-bright tabular-nums">{score}<span className="text-brass/50 text-2xl sm:text-3xl ml-1">/100</span></p>
          <p className="mt-2 font-display italic text-base sm:text-lg text-brass/80">Most companies are <span className="text-brass-bright">Reactive</span>.</p>
        </div>
        <div>
          <p className="font-ui uppercase tracking-[0.14em] sm:tracking-[0.18em] text-[11px] sm:text-xs text-brass-bright mb-3">Most painful pillar</p>
          <p className="font-display text-5xl sm:text-6xl text-brass-bright">P2</p>
          <p className="mt-2 font-display italic text-base sm:text-lg text-brass/80">Data Foundations. By a long way.</p>
        </div>
      </div>
    </section>
  );
}
