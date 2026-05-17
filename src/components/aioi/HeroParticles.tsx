/**
 * HeroParticles — subtle archetype-coloured orbs.
 *
 * Previously animated 5 large `blur-3xl` (64px filter blur) divs continuously.
 * Each one forces the compositor to re-rasterise a huge blurred layer on
 * every frame, which tanked scroll FPS on long pages. We now render only a
 * couple of *static* orbs — visual effect is preserved, scroll cost is gone.
 */
export function HeroParticles() {
  const orbs = [
    { size: 280, x: "75%", y: "20%", color: "hsl(var(--pillar-1) / 0.12)" },
    { size: 160, x: "20%", y: "65%", color: "hsl(var(--pillar-3) / 0.10)" },
    { size: 120, x: "85%", y: "55%", color: "hsl(var(--pillar-6) / 0.10)" },
  ];

  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 overflow-hidden pointer-events-none"
      style={{ contain: "strict" }}
    >
      {orbs.map((orb, i) => (
        <div
          key={i}
          className="absolute rounded-full blur-3xl"
          style={{
            width: orb.size,
            height: orb.size,
            left: orb.x,
            top: orb.y,
            backgroundColor: orb.color,
            transform: "translate3d(-50%, -50%, 0)",
          }}
        />
      ))}
    </div>
  );
}
