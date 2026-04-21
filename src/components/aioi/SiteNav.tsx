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
            <a key={l.href} href={l.href} className="text-cream/70 hover:text-cream transition-colors">
              {l.label}
            </a>
          ))}
          <a
            href="https://deepgrain.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-cream/60 hover:text-brass-bright transition-colors"
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
          <SheetContent side="right" className="bg-walnut border-l border-cream/10 w-[78%] max-w-sm">
            <SheetTitle className="sr-only">Site navigation</SheetTitle>
            <nav className="mt-10 flex flex-col gap-1 font-display text-2xl">
              {links.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="py-3 text-cream/85 hover:text-brass-bright transition-colors"
                >
                  {l.label}
                </a>
              ))}

              {email ? (
                <>
                  <Link
                    to="/reports"
                    onClick={() => setOpen(false)}
                    className="py-3 text-cream/85 hover:text-brass-bright transition-colors"
                  >
                    My reports
                  </Link>
                  <button
                    type="button"
                    onClick={onSignOut}
                    className="py-3 text-left text-cream/85 hover:text-brass-bright transition-colors"
                  >
                    Sign out
                  </button>
                  <p className="pt-2 font-mono text-[11px] uppercase tracking-[0.18em] text-cream/40 truncate">
                    {email}
                  </p>
                </>
              ) : (
                <Link
                  to="/signin"
                  onClick={() => setOpen(false)}
                  className="py-3 text-cream/85 hover:text-brass-bright transition-colors"
                >
                  Sign in
                </Link>
              )}

              <a
                href="https://deepgrain.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 pt-4 border-t border-cream/10 inline-flex items-center gap-2 py-3 text-cream/65 hover:text-brass-bright text-base font-ui uppercase tracking-[0.18em]"
              >
                deepgrain.ai
                <ArrowUpRight className="h-4 w-4" />
              </a>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
