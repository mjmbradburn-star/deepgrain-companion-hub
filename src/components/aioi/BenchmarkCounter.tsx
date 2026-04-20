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
    <section className="relative py-24 border-t border-b border-cream/10 bg-green-deep/40">
      <div className="container grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-4">
        <div>
          <p className="eyebrow mb-3">Live benchmark</p>
          <p className="font-display text-6xl text-cream tabular-nums">{count.toLocaleString()}</p>
          <p className="mt-2 font-display italic text-lg text-cream/55">assessments completed</p>
        </div>
        <div>
          <p className="eyebrow mb-3">Median AIOI</p>
          <p className="font-display text-6xl text-brass-bright tabular-nums">{score}<span className="text-cream/30 text-3xl ml-1">/100</span></p>
          <p className="mt-2 font-display italic text-lg text-cream/55">— most companies are <span className="text-cream/80">Reactive</span>.</p>
        </div>
        <div>
          <p className="eyebrow mb-3">Most painful pillar</p>
          <p className="font-display text-6xl text-cream">P2</p>
          <p className="mt-2 font-display italic text-lg text-cream/55">Data Foundations. By a long way.</p>
        </div>
      </div>
    </section>
  );
}
