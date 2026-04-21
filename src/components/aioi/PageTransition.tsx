/**
 * PageTransition — wraps the Routes tree and re-keys on pathname so each
 * navigation triggers a brief fade + lift entrance. Pure CSS via the
 * `page-enter` keyframe in index.css; respects prefers-reduced-motion.
 *
 * Also:
 *  - Scrolls to top on route change so transitions don't start mid-page.
 *  - Auto-attaches an IntersectionObserver to every `.reveal` element on the
 *    page (including those rendered without the <Reveal /> wrapper). This
 *    prevents "permanently invisible" content when an author adds the
 *    `.reveal` class directly without wiring up the hook.
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

  // Global safety net: ensure every .reveal element actually becomes visible.
  // Re-runs on every route change (PageTransition re-mounts via key={pathname}).
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const activate = (el: Element) => el.classList.add("is-visible");

    const scan = () => {
      const nodes = document.querySelectorAll<HTMLElement>(".reveal:not(.is-visible)");
      if (reduced || typeof IntersectionObserver === "undefined") {
        nodes.forEach(activate);
        return null;
      }
      const io = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              activate(entry.target);
              io.unobserve(entry.target);
            }
          }
        },
        { rootMargin: "0px 0px -5% 0px", threshold: 0.01 },
      );
      nodes.forEach((n) => io.observe(n));
      return io;
    };

    // Initial scan after paint, then a follow-up pass to catch late-mounted nodes.
    let io: IntersectionObserver | null = null;
    const raf = requestAnimationFrame(() => {
      io = scan();
    });
    const t = window.setTimeout(() => {
      const io2 = scan();
      if (io2) {
        // Merge: keep both running until unmount.
        const prev = io;
        io = {
          disconnect() {
            prev?.disconnect();
            io2.disconnect();
          },
        } as IntersectionObserver;
      }
    }, 600);

    // Fail-safe: after 2.5s, force any still-hidden .reveal visible. Prevents
    // permanently blank sections if observers never fire (e.g. element starts
    // already in view but below threshold due to layout race).
    const safety = window.setTimeout(() => {
      document.querySelectorAll(".reveal:not(.is-visible)").forEach(activate);
    }, 2500);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(t);
      window.clearTimeout(safety);
      io?.disconnect();
    };
  }, [pathname]);

  return (
    <div key={pathname} className="motion-safe:animate-page-enter">
      {children}
    </div>
  );
}
