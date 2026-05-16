import { ArrowUpRight, LogOut, Menu, User } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useAuthReady } from "@/hooks/use-auth-ready";
import { trackEvent } from "@/lib/analytics";

export function SiteNav() {
  const [open, setOpen] = useState(false);
  const { user } = useAuthReady();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    trackEvent("auth_signout");
    navigate("/");
  };

  const links = [
    { href: "/assess", label: "Assessment" },
    { href: "/privacy", label: "Privacy" },
  ];

  return (
    <header className="fixed top-0 inset-x-0 z-50 backdrop-blur-md bg-walnut/70 border-b border-cream/10">
      <div className="container flex items-center justify-between h-14">
        <Link to="/" className="flex items-baseline gap-2 group min-w-0" aria-label="AIOI home">
          <span className="font-display text-xl tracking-tight text-cream">AIOI</span>
          <span className="hidden min-[380px]:inline font-mono text-[10px] uppercase tracking-[0.18em] sm:tracking-[0.2em] text-cream/40 group-hover:text-brass-bright transition-colors truncate">
            AI Operating Index
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6 font-ui text-sm">
          {links.map((l) => (
            <Link key={l.href} to={l.href} className="story-link text-cream/70 hover:text-cream transition-colors">
              {l.label}
            </Link>
          ))}
          {user ? (
            <div className="flex items-center gap-4">
              <span className="text-cream/50 text-xs">{user.email}</span>
              <button
                onClick={handleSignOut}
                className="inline-flex items-center gap-1.5 text-cream/60 hover:text-cream transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" /> Sign out
              </button>
            </div>
          ) : (
            <Link
              to="/signin"
              className="inline-flex items-center gap-1.5 text-cream/70 hover:text-brass-bright transition-colors"
            >
              <User className="h-3.5 w-3.5" /> Sign in
            </Link>
          )}
          <a
            href="https://deepgrain.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="story-link inline-flex items-center gap-1 text-cream/60 hover:text-brass-bright transition-colors"
          >
            deepgrain.ai
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </nav>

        {/* Mobile trigger */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              aria-label="Open menu"
              className="md:hidden inline-flex items-center justify-center h-11 w-11 -mr-2 text-cream/80 hover:text-cream"
            >
              <Menu className="h-5 w-5" />
            </button>
          </SheetTrigger>
          <SheetContent
            side="right"
            className="bg-walnut border-l border-cream/10 w-[82%] max-w-sm p-0 flex flex-col"
          >
            <SheetTitle className="sr-only">Site navigation</SheetTitle>
            <nav className="px-6 pt-16 pb-2 flex flex-col font-display text-2xl">
              {links.map((l) => (
                <Link
                  key={l.href}
                  to={l.href}
                  onClick={() => setOpen(false)}
                  className="min-h-[52px] flex items-center text-cream/85 active:text-brass-bright hover:text-brass-bright transition-colors border-b border-cream/5"
                >
                  {l.label}
                </Link>
              ))}
              {user ? (
                <button
                  onClick={() => {
                    setOpen(false);
                    handleSignOut();
                  }}
                  className="min-h-[52px] flex items-center text-cream/85 hover:text-brass-bright transition-colors border-b border-cream/5 text-left"
                >
                  <LogOut className="h-4 w-4 mr-2" /> Sign out
                </button>
              ) : (
                <Link
                  to="/signin"
                  onClick={() => setOpen(false)}
                  className="min-h-[52px] flex items-center text-cream/85 active:text-brass-bright hover:text-brass-bright transition-colors border-b border-cream/5"
                >
                  <User className="h-4 w-4 mr-2" /> Sign in
                </Link>
              )}
            </nav>
            <div className="mt-auto px-6 pt-6 pb-8 border-t border-cream/10 bg-cream/[0.02]">
              <a
                href="https://deepgrain.ai"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className="inline-flex items-center gap-2 text-cream/55 hover:text-brass-bright text-[11px] font-mono uppercase tracking-[0.2em]"
              >
                deepgrain.ai
                <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
