import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, FileText, Loader2, LogOut, Plus } from "lucide-react";

import { SiteNav } from "@/components/aioi/SiteNav";
import { SiteFooter } from "@/components/aioi/SiteFooter";
import { TierBadge, type Tier } from "@/components/aioi/TierBadge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface RespondentRow {
  id: string;
  slug: string;
  level: "company" | "function" | "individual";
  function: string | null;
  region: string | null;
  submitted_at: string | null;
  created_at: string;
  reports: { aioi_score: number | null; overall_tier: Tier | null }[] | null;
}

export default function MyReports() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [rows, setRows] = useState<RespondentRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!sess.session) {
        navigate("/signin?next=/reports", { replace: true });
        return;
      }
      setEmail(sess.session.user.email ?? null);

      const { data, error } = await supabase
        .from("respondents")
        .select("id, slug, level, function, region, submitted_at, created_at, reports(aioi_score, overall_tier)")
        .order("created_at", { ascending: false });

      if (cancelled) return;
      if (error) {
        toast({ title: "Could not load your reports", description: error.message, variant: "destructive" });
      } else {
        setRows((data ?? []) as RespondentRow[]);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [navigate, toast]);

  const onSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen bg-walnut text-cream flex flex-col">
      <SiteNav />

      <main className="flex-1 container max-w-5xl pt-28 sm:pt-36 pb-20">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-10 sm:mb-14">
          <div>
            <p className="eyebrow mb-3">Your account</p>
            <h1 className="font-display text-4xl sm:text-5xl text-cream leading-tight tracking-tight">
              My reports
            </h1>
            {email && (
              <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.18em] text-cream/45 truncate max-w-xs sm:max-w-md">
                Signed in as {email}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              asChild
              size="sm"
              className="rounded-sm bg-brass text-walnut hover:bg-brass-bright font-ui text-[11px] uppercase tracking-[0.18em] h-9"
            >
              <Link to="/assess">
                <Plus className="h-3.5 w-3.5 mr-1.5" /> New assessment
              </Link>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onSignOut}
              className="border-cream/20 bg-transparent text-cream/80 hover:bg-cream/5 font-ui text-[11px] uppercase tracking-[0.18em] h-9"
            >
              <LogOut className="h-3.5 w-3.5 mr-1.5" /> Sign out
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-3 text-cream/55 font-mono text-xs uppercase tracking-[0.2em]">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading
          </div>
        ) : rows.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="divide-y divide-cream/10 border-y border-cream/10">
            {rows.map((r) => (
              <ReportRow key={r.id} row={r} />
            ))}
          </ul>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}

function ReportRow({ row }: { row: RespondentRow }) {
  const report = row.reports?.[0] ?? null;
  const inProgress = !row.submitted_at;
  const date = row.submitted_at ?? row.created_at;

  return (
    <li className="py-6 sm:py-7 flex flex-wrap items-center justify-between gap-4">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-brass-bright/80">
            {row.level} level
          </span>
          {row.function && (
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-cream/45">
              · {row.function}
            </span>
          )}
          {row.region && (
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-cream/45">
              · {row.region}
            </span>
          )}
          {inProgress && (
            <span className="ml-1 inline-flex items-center rounded-sm bg-brass/15 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.2em] text-brass-bright ring-1 ring-inset ring-brass/30">
              In progress
            </span>
          )}
        </div>
        <div className="flex items-baseline gap-3">
          {report?.aioi_score != null ? (
            <span className="font-display text-3xl text-cream tabular-nums leading-none">
              {report.aioi_score}
              <span className="text-cream/35 text-base font-mono ml-1">/100</span>
            </span>
          ) : (
            <span className="font-display text-xl text-cream/55 italic">
              {inProgress ? "Not submitted" : "Scoring…"}
            </span>
          )}
          {report?.overall_tier && <TierBadge tier={report.overall_tier} showIndex={false} />}
        </div>
        <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.18em] text-cream/40">
          {formatDate(date)} · slug {row.slug}
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {inProgress ? (
          <Button
            asChild
            size="sm"
            variant="outline"
            className="border-cream/20 bg-transparent text-cream hover:bg-cream/5 font-ui text-[11px] uppercase tracking-[0.18em] h-9"
          >
            <Link to="/assess">Resume</Link>
          </Button>
        ) : (
          <Button
            asChild
            size="sm"
            className="rounded-sm bg-brass text-walnut hover:bg-brass-bright font-ui text-[11px] uppercase tracking-[0.18em] h-9"
          >
            <Link to={`/assess/r/${row.slug}`}>
              <FileText className="h-3.5 w-3.5 mr-1.5" /> View report
            </Link>
          </Button>
        )}
      </div>
    </li>
  );
}

function EmptyState() {
  return (
    <div className="border border-dashed border-cream/15 rounded-sm p-10 sm:p-14 text-center">
      <p className="font-display text-2xl text-cream/85 mb-3">No reports yet.</p>
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-cream/45 mb-6">
        Take the eight-question scan to generate one.
      </p>
      <Button
        asChild
        className="rounded-sm bg-brass text-walnut hover:bg-brass-bright font-ui text-[11px] uppercase tracking-[0.2em]"
      >
        <Link to="/assess">
          Start the assessment <ArrowRight className="h-3.5 w-3.5 ml-2" />
        </Link>
      </Button>
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric", month: "short", year: "numeric",
    });
  } catch {
    return iso;
  }
}
