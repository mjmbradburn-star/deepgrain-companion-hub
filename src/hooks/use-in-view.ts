/**
 * useInView — fire-once IntersectionObserver hook.
 *
 * Adds the `is-visible` class to the target when it enters the viewport so
 * elements with `.reveal` animate in. Skips entirely under
 * `prefers-reduced-motion: reduce` (the CSS overrides also short-circuit
 * any motion that did slip through).
 */
import { useEffect, useRef } from "react";

export function useInView<T extends HTMLElement>(options?: IntersectionObserverInit) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      node.classList.add("is-visible");
      return;
    }

    if (typeof IntersectionObserver === "undefined") {
      node.classList.add("is-visible");
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "-8% 0px", threshold: 0.05, ...options },
    );

    io.observe(node);
    return () => io.disconnect();
  }, [options]);

  return ref;
}
