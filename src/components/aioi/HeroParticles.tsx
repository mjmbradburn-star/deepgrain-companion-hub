/**
 * HeroParticles — subtle floating archetype-coloured orbs.
 * Pure CSS, no JS overhead. 5 orbs representing the 5 archetypes.
 */
export function HeroParticles() {
  const orbs = [
    { size: 280, x: "75%", y: "20%", delay: "0s", duration: "18s", color: "hsl(var(--pillar-1) / 0.12)" },
    { size: 200, x: "15%", y: "65%", delay: "-6s", duration: "22s", color: "hsl(var(--pillar-3) / 0.10)" },
    { size: 160, x: "60%", y: "70%", delay: "-12s", duration: "20s", color: "hsl(var(--pillar-5) / 0.08)" },
    { size: 120, x: "85%", y: "55%", delay: "-3s", duration: "16s", color: "hsl(var(--pillar-6) / 0.10)" },
    { size: 90, x: "30%", y: "30%", delay: "-9s", duration: "24s", color: "hsl(var(--pillar-8) / 0.08)" },
  ];

  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden pointer-events-none">
      {orbs.map((orb, i) => (
        <div
          key={i}
          className="absolute rounded-full blur-3xl motion-safe:animate-float"
          style={{
            width: orb.size,
            height: orb.size,
            left: orb.x,
            top: orb.y,
            backgroundColor: orb.color,
            animationDelay: orb.delay,
            animationDuration: orb.duration,
            transform: "translate(-50%, -50%)",
          }}
        />
      ))}
    </div>
  );
}
