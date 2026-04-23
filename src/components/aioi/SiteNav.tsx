import { ArrowUpRight, FileText, LogOut, Menu, User } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";

export function SiteNav() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setEmail(data.session?.user.email ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const links = [
    { href: "/assess", label: "Assessment" },
    { href: "/pillars", label: "Pillars" },
    { href: "/ladder", label: "Ladder" },
    { href: "/benchmarks", label: "Benchmarks" },
  ];

  const onSignOut = async () => {
    await supabase.auth.signOut();
    setOpen(false);
    navigate("/", { replace: true });
  };

  const truncatedEmail = email ? (email.length > 22 ? email.slice(0, 20) + "…" : email) : null;

  return (
    <header className="fixed top-0 inset-x-0 z-50 backdrop-blur-md bg-walnut/70 border-b border-cream/10">
      <div className="container flex items-center justify-between h-14">
        <a href="/" className="flex items-baseline gap-2 group min-w-0" aria-label="AIOI home">
          <span className="font-display text-xl tracking-tight text-cream">AIOI</span>
          <span className="hidden min-[380px]:inline font-mono text-[10px] uppercase tracking-[0.18em] sm:tracking-[0.2em] text-cream/40 group-hover:text-brass-bright transition-colors truncate">
            AI Operating Index
          </span>
        </a>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6 font-ui text-sm">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="story-link text-cream/70 hover:text-cream transition-colors">
              {l.label}
            </a>
          ))}
          <a
            href="https://deepgrain.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="story-link inline-flex items-center gap-1 text-cream/60 hover:text-brass-bright transition-colors"
          >
            deepgrain.ai
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>

          {email ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex items-center gap-1.5 text-cream/80 hover:text-brass-bright transition-colors focus-visible:outline-none">
                <User className="h-3.5 w-3.5" />
                <span className="text-xs">{truncatedEmail}</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="bg-walnut border border-cream/15 text-cream min-w-[180px]"
              >
                <DropdownMenuItem asChild className="focus:bg-cream/10 focus:text-cream cursor-pointer">
                  <Link to="/reports">
                    <FileText className="h-3.5 w-3.5 mr-2" /> My reports
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-cream/10" />
                <DropdownMenuItem
                  onClick={onSignOut}
                  className="focus:bg-cream/10 focus:text-cream cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5 mr-2" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link
              to="/signin"
              className="text-cream/85 hover:text-brass-bright transition-colors"
            >
              Sign in
            </Link>
          )}
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

            {/* Primary nav links */}
            <nav className="px-6 pt-16 pb-2 flex flex-col font-display text-2xl">
              {links.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="min-h-[52px] flex items-center text-cream/85 active:text-brass-bright hover:text-brass-bright transition-colors border-b border-cream/5"
                >
                  {l.label}
                </a>
              ))}
            </nav>

            {/* Account section */}
            <div className="mt-auto px-6 pt-6 pb-8 border-t border-cream/10 bg-cream/[0.02]">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cream/40 mb-4">
                Account
              </p>

              {email ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 rounded-sm bg-cream/5 border border-cream/10 px-4 py-3">
                    <div className="h-9 w-9 rounded-full bg-brass/15 border border-brass/30 flex items-center justify-center shrink-0">
                      <User className="h-4 w-4 text-brass-bright" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cream/50">
                        Signed in
                      </p>
                      <p className="font-display text-sm text-cream truncate">{email}</p>
                    </div>
                  </div>

                  <Link
                    to="/reports"
                    onClick={() => setOpen(false)}
                    className="min-h-[52px] flex items-center justify-between rounded-sm bg-brass text-walnut hover:bg-brass-bright active:bg-brass-bright transition-colors px-4 font-ui text-xs uppercase tracking-[0.2em]"
                  >
                    <span className="inline-flex items-center gap-2">
                      <FileText className="h-4 w-4" /> My reports
                    </span>
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>

                  <button
                    type="button"
                    onClick={onSignOut}
                    className="w-full min-h-[52px] flex items-center justify-center gap-2 rounded-sm border border-cream/20 text-cream/85 hover:text-cream hover:bg-cream/5 active:bg-cream/10 transition-colors px-4 font-ui text-xs uppercase tracking-[0.2em]"
                  >
                    <LogOut className="h-4 w-4" /> Sign out
                  </button>
                </div>
              ) : (
                <Link
                  to="/signin"
                  onClick={() => setOpen(false)}
                  className="min-h-[52px] flex items-center justify-center gap-2 rounded-sm bg-brass text-walnut hover:bg-brass-bright active:bg-brass-bright transition-colors px-4 font-ui text-xs uppercase tracking-[0.2em]"
                >
                  <User className="h-4 w-4" /> Sign in
                </Link>
              )}

              <a
                href="https://deepgrain.ai"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className="mt-6 inline-flex items-center gap-2 text-cream/55 hover:text-brass-bright text-[11px] font-mono uppercase tracking-[0.2em]"
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
