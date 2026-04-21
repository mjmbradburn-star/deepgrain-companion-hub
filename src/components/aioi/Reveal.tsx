/**
 * Reveal — wraps children in a div that fades + lifts in when scrolled into
 * view (once). Pure CSS via `.reveal` + `.is-visible` so it adds no JS to the
 * critical path beyond a single IntersectionObserver per node.
 *
 * Usage:
 *   <Reveal><Card /></Reveal>
 *   <Reveal delay={120}><Card /></Reveal>            // ms
 *   <Reveal as="section" className="...">...</Reveal>
 */
import { type ElementType, type ReactNode, type CSSProperties } from "react";
import { useInView } from "@/hooks/use-in-view";
import { cn } from "@/lib/utils";

type RevealProps = {
  children: ReactNode;
  /** Stagger index — multiplied by 70ms in CSS. */
  index?: number;
  /** Explicit delay in ms (overrides index). */
  delay?: number;
  className?: string;
  as?: ElementType;
};

export function Reveal({ children, index, delay, className, as: Tag = "div" }: RevealProps) {
  const ref = useInView<HTMLElement>();
  const style: CSSProperties = {};
  if (typeof delay === "number") style.transitionDelay = `${delay}ms`;
  else if (typeof index === "number") (style as Record<string, string>)["--i"] = String(index);

  return (
    <Tag ref={ref} className={cn("reveal", className)} style={style}>
      {children}
    </Tag>
  );
}
