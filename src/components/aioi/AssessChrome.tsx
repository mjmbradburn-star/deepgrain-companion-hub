import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export function AssessChrome({
  step,
  total,
  back,
  children,
  ariaLabel,
}: {
  step?: number;
  total?: number;
  back?: { to: string; label?: string };
  children: React.ReactNode;
  ariaLabel?: string;
}) {
  return (
    <div className="min-h-[100svh] bg-walnut text-cream flex flex-col" aria-label={ariaLabel}>
      <header className="border-b border-cream/10 backdrop-blur bg-walnut/70 sticky top-0 z-30">
        <div className="container flex items-center justify-between h-14">
          <Link to="/" className="flex items-baseline gap-2">
            <span className="font-display text-xl text-cream">AIOI</span>
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-cream/40 hidden sm:inline">
              Assessment
            </span>
          </Link>
          <div className="flex items-center gap-5">
            {typeof step === "number" && typeof total === "number" && (
              <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-cream/50 tabular-nums">
                {String(step).padStart(2, "0")} / {String(total).padStart(2, "0")}
              </span>
            )}
            {back && (
              <Link
                to={back.to}
                className="inline-flex items-center gap-1.5 font-ui text-xs uppercase tracking-[0.16em] text-cream/60 hover:text-cream transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                {back.label ?? "Back"}
              </Link>
            )}
          </div>
        </div>
      </header>
      <div className="flex-1 flex">{children}</div>
    </div>
  );
}
