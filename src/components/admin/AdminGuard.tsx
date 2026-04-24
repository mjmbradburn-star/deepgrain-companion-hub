import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";

import { useIsAdmin } from "@/hooks/use-is-admin";

type Props = { children: ReactNode };

/**
 * Route wrapper. Redirects unauthenticated users to /signin, and signed-in
 * non-admins to /. While the role check resolves, shows a quiet spinner.
 */
export function AdminGuard({ children }: Props) {
  const { isReady, isAdmin, isAuthenticated } = useIsAdmin();
  const location = useLocation();

  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/signin?next=${next}`} replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
