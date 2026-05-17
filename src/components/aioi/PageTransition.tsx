/**
 * PageTransition — scrolls to top on route change.
 * Removed the key={pathname} remount that was causing navigation jank.
 */
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export function PageTransition({ children }: { children?: React.ReactNode }) {
  const { pathname } = useLocation();

  useEffect(() => {
    if (window.location.hash) return;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);

  return <>{children}</>;
}
