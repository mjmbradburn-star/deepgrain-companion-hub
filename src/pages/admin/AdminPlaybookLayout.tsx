import { ReactNode } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  Activity,
  Beaker,
  ClipboardList,
  Grid3x3,
  TimerReset,
} from "lucide-react";

import { AdminGuard } from "@/components/admin/AdminGuard";
import { BackfillMoveCopyButton } from "@/components/admin/BackfillMoveCopyButton";
import { BackfillReportsButton } from "@/components/admin/BackfillReportsButton";
import { Seo } from "@/components/aioi/Seo";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/admin/playbook", label: "Moves", icon: ClipboardList, end: true },
  { to: "/admin/playbook/coverage", label: "Coverage", icon: Grid3x3 },
  { to: "/admin/playbook/stale", label: "Stale (>90d)", icon: TimerReset },
  { to: "/admin/playbook/test", label: "Test report", icon: Beaker },
];

export default function AdminPlaybookLayout({ children }: { children?: ReactNode }) {
  const location = useLocation();

  return (
    <AdminGuard>
      <Seo title="Admin · Playbook" description="Manage the AIOI Moves library." noindex />
      <div className="min-h-screen bg-background">
        <header className="border-b">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <Activity className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  Deepgrain
                </p>
                <h1 className="text-base font-semibold">Playbook admin</h1>
              </div>
            </div>
            <nav className="hidden items-center gap-1 md:flex">
              {NAV.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition",
                      isActive
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                    )
                  }
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              ))}
              <div className="ml-2 border-l pl-2">
                <BackfillMoveCopyButton />
              </div>
            </nav>
          </div>
          <div className="border-t md:hidden">
            <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 py-2">
              {NAV.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      "shrink-0 rounded-md px-3 py-1.5 text-xs",
                      isActive ? "bg-muted text-foreground" : "text-muted-foreground",
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
        </header>
        <main key={location.pathname} className="mx-auto max-w-7xl px-6 py-8">
          {children ?? <Outlet />}
        </main>
      </div>
    </AdminGuard>
  );
}
