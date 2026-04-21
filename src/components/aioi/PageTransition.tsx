/**
 * PageTransition — wraps the Routes tree and re-keys on pathname so each
 * navigation triggers a brief fade + lift entrance. Pure CSS via the
 * `page-enter` keyframe in index.css; respects prefers-reduced-motion.
 *
 * Also scrolls to top on route change so transitions don't start mid-page.
 */
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export function PageTransition({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();

  useEffect(() => {
    // Avoid hijacking back/forward restoration on hash links within the same page.
    if (window.location.hash) return;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);

  return (
    <div key={pathname} className="motion-safe:animate-page-enter">
      {children}
    </div>
  );
}
