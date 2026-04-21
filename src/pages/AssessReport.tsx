import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import {
  ArrowRight,
  Check,
  Copy,
  Download,
  FileText,
  Loader2,
  Lock,
  Mail,
  Printer,
  Send,
  Share2,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import { SiteNav } from "@/components/aioi/SiteNav";
import { SiteFooter } from "@/components/aioi/SiteFooter";
import { PillarBarChart } from "@/components/aioi/PillarBarChart";
import { PillarChartVariantToggle, usePillarChartVariant } from "@/components/aioi/PillarChartVariantToggle";
import { TierBadge, type Tier } from "@/components/aioi/TierBadge";
import { PillarChip } from "@/components/aioi/PillarChip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { PILLAR_NAMES } from "@/lib/assessment";
import { fetchBestSlice, pillarsFromRow, type MatchedSlice } from "@/lib/benchmarks";
import { BenchmarkSliceCard } from "@/components/aioi/BenchmarkSliceCard";
import { DeepDiveUnlock } from "@/components/aioi/DeepDiveUnlock";
import { sendMagicLink, SyncError } from "@/lib/sync";

// ─── Types coming back from the report row ────────────────────────────────
interface PillarTierEntry {
  tier: number;
  label: Tier;
  name: string;
}
interface Hotspot {
  pillar: number;
  name: string;
  tier: number;
  tierLabel: Tier;
}
interface PlanMonth {
  month: number;
  title: string;
  rationale: string;
  outcome_ids: string[];
}
interface OutcomeRow {
  id: string;
  pillar: number;
  applies_to_tier: number;
  title: string;
  body: string;
  effort: number | null;
  impact: number | null;
  time_to_value: string | null;
}
interface ReportData {
  respondent: {
    id: string;
    slug: string;
    level: string;
    function: string | null;
    region: string | null;
    submitted_at: string | null;
    is_anonymous: boolean;
  };
  report: {
    aioi_score: number;
    overall_tier: Tier;
    pillar_tiers: Record<string, PillarTierEntry>;
    hotspots: Hotspot[];
    diagnosis: string | null;
    plan: PlanMonth[];
    generated_at: string | null;
  } | null;
  outcomes: OutcomeRow[];
  cohort: Record<number, number> | null;
  slice: MatchedSlice | null;
  hasDeepdive: boolean;
}

type LoadState = "loading" | "ready" | "missing" | "no-report" | "error";

export default function AssessReport() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [state, setState] = useState<LoadState>("loading");
  const [data, setData] = useState<ReportData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!slug) return;

      // Public RPC — no auth required. Slug is the secret.
      const { data: rpcData, error: rpcErr } = await supabase
        .rpc("get_report_by_slug", { _slug: slug });
      if (cancelled) return;
      if (rpcErr) {
        setState("error");
        setError(rpcErr.message);
        return;
      }
      const payload = (rpcData as unknown) as {
        respondent: ReportData["respondent"] | null;
        report: ReportData["report"];
        response_count: number;
        has_deepdive: boolean;
      } | null;
      if (!payload?.respondent) {
        setState("missing");
        return;
      }
      if (!payload.report) {
        setState("no-report");
        return;
      }

      // Outcomes referenced by the plan (public RPC)
      const { data: outs } = await supabase
        .rpc("get_outcomes_for_report", { _slug: slug });
      const outcomes = ((outs ?? []) as unknown as OutcomeRow[]);

      // Resolve the most specific benchmark slice for this respondent.
      const slice = await fetchBestSlice({
        level: payload.respondent.level as "company" | "function" | "individual",
        function: payload.respondent.function ?? null,
        region: payload.respondent.region ?? null,
      });
      const cohort = slice ? pillarsFromRow(slice.row) : null;
      if (cancelled) return;

      // Telemetry — fire-and-forget
      void supabase.from("events").insert({
        name: "report_viewed",
        payload: { slug, has_deepdive: payload.has_deepdive },
      });

      setData({
        respondent: payload.respondent,
        report: payload.report,
        outcomes,
        cohort,
        slice,
        hasDeepdive: payload.has_deepdive,
      });
      setState("ready");
    }
    void load();
    return () => { cancelled = true; };
  }, [slug, navigate]);

  if (state === "loading") return <FullPageMessage eyebrow="Loading" line1="Pulling your report…" />;
  if (state === "missing") return <FullPageMessage eyebrow="Not found" line1="No report at this address." cta="/assess" />;
  if (state === "no-report") return <FullPageMessage eyebrow="Almost there" line1="Your answers landed, the report is still building." line2="Refresh in a few seconds." />;
  if (state === "error") return <FullPageMessage eyebrow="Error" line1={error ?? "Something went wrong."} cta="/" />;
  if (!data?.report) return null;

  return <ReportView data={data} />;
}

// ─── Main view ────────────────────────────────────────────────────────────
function ReportView({ data }: { data: ReportData }) {
  const { respondent, report, outcomes, cohort } = data;

  const pillarValues = useMemo(() => {
    const out: Record<number, number> = {};
    if (!report) return out;
    for (const [k, v] of Object.entries(report.pillar_tiers)) {
      out[Number(k)] = v.tier;
    }
    return out;
  }, [report]);

  if (!report) return null;

  return (
    <div className="min-h-screen bg-walnut text-cream">
      <SiteNav />

      <TabsPrimitive.Root defaultValue="overview" className="w-full">
        {/* ─── Masthead ─── */}
        <header className="border-b border-cream/10 pt-24 sm:pt-36 pb-6 sm:pb-8">
          <div className="container max-w-6xl">
            <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4 mb-5 sm:mb-6">
              <div className="flex flex-wrap items-center gap-x-4 sm:gap-x-6 gap-y-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] sm:tracking-[0.22em] text-brass-bright/80">
                  AIOI Report · {capitalise(respondent.level)} level
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] sm:tracking-[0.22em] text-cream/35">
                  Slug · {respondent.slug}
                </span>
                {report.generated_at && (
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] sm:tracking-[0.22em] text-cream/35">
                    Generated · {formatDate(report.generated_at)}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    void navigator.clipboard.writeText(window.location.href);
                  }}
                  className="border-cream/20 bg-transparent text-cream hover:bg-cream/5 font-ui text-[11px] uppercase tracking-[0.16em] sm:tracking-[0.18em] h-9"
                >
                  <Share2 className="h-3.5 w-3.5 mr-2" /> Share link
                </Button>
                <EmailPdfButton slug={respondent.slug} />
                {!data.hasDeepdive && (
                  <Button
                    size="sm"
                    asChild
                    className="rounded-sm bg-brass text-walnut hover:bg-brass-bright font-ui text-[11px] uppercase tracking-[0.16em] sm:tracking-[0.18em] h-9"
                  >
                    <Link to={`/assess/deep/${respondent.slug}`}>
                      Go deeper <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </Link>
                  </Button>
                )}
                <ResendReportLink slug={respondent.slug} />
              </div>
            </div>

            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl text-cream leading-tight tracking-tight max-w-3xl text-balance">
              Your operating shape, in one picture.
            </h1>

            {/* Tab bar */}
            <TabsPrimitive.List className="mt-10 -mb-px flex flex-wrap items-end gap-x-8 gap-y-2 border-b border-cream/10">
              {[
                { value: "overview", label: "Overview" },
                { value: "plan", label: "Plan" },
                { value: "report", label: "Report" },
                { value: "invite", label: "Invite" },
              ].map((t) => (
                <TabsPrimitive.Trigger
                  key={t.value}
                  value={t.value}
                  className="group relative pb-3 font-ui text-xs uppercase tracking-[0.18em] text-cream/40 hover:text-cream transition-colors data-[state=active]:text-cream data-[state=active]:font-medium focus-visible:outline-none focus-visible:text-cream"
                >
                  {t.label}
                  <span className="absolute -bottom-px left-0 right-0 h-px bg-brass-bright scale-x-0 group-data-[state=active]:scale-x-100 transition-transform origin-left" />
                </TabsPrimitive.Trigger>
              ))}
            </TabsPrimitive.List>
          </div>
        </header>

        {/* ─── Tabs ─── */}
        <TabsPrimitive.Content value="overview" className="focus-visible:outline-none">
          <OverviewTab
            report={report}
            pillarValues={pillarValues}
            cohort={cohort ?? undefined}
            slice={data.slice}
            slug={respondent.slug}
            hasDeepdive={data.hasDeepdive}
          />
        </TabsPrimitive.Content>

        <TabsPrimitive.Content value="plan" className="focus-visible:outline-none">
          <PlanTab plan={report.plan} outcomes={outcomes} slug={respondent.slug} hasDeepdive={data.hasDeepdive} />
        </TabsPrimitive.Content>

        <TabsPrimitive.Content value="report" className="focus-visible:outline-none">
          <ReportTab
            data={data}
            pillarValues={pillarValues}
            cohort={cohort ?? undefined}
            slice={data.slice}
          />
        </TabsPrimitive.Content>

        <TabsPrimitive.Content value="invite" className="focus-visible:outline-none">
          <InviteTab respondentId={respondent.id} slug={respondent.slug} />
        </TabsPrimitive.Content>
      </TabsPrimitive.Root>

      <SiteFooter />
    </div>
  );
}

// ─── Overview ─────────────────────────────────────────────────────────────
function OverviewTab({
  report, pillarValues, cohort, slice, slug, hasDeepdive,
}: {
  report: NonNullable<ReportData["report"]>;
  pillarValues: Record<number, number>;
  cohort?: Record<number, number>;
  slice: MatchedSlice | null;
  slug: string;
  hasDeepdive: boolean;
}) {
  return (
    <>
    <section className="container max-w-6xl py-10 sm:py-20">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16">
        {/* Left — score + diagnosis */}
        <div className="lg:col-span-5">
          <p className="eyebrow mb-4 sm:mb-5 text-cream/45">AIOI Score</p>
          <div className="flex items-baseline gap-4">
            <span className="font-display font-light text-[72px] sm:text-[96px] leading-none text-brass-bright tabular-nums tracking-[-0.02em]">
              {report.aioi_score}
            </span>
            <span className="font-mono text-xs text-cream/40 uppercase tracking-[0.2em] sm:tracking-[0.22em] mb-2">
              / 100
            </span>
          </div>

          <div className="mt-6">
            <TierBadge tier={report.overall_tier} />
          </div>

          {report.diagnosis && (
            <blockquote className="mt-10 border-l-2 border-brass/60 pl-6">
              <p className="font-display italic text-2xl sm:text-3xl text-cream/90 leading-snug text-balance">
                "{report.diagnosis}"
              </p>
            </blockquote>
          )}

          {/* Hotspots */}
          {report.hotspots.length > 0 && (
            <div className="mt-12 space-y-3">
              <p className="eyebrow text-cream/45">Three pillars to watch</p>
              <ul className="space-y-2">
                {report.hotspots.map((h) => (
                  <li key={h.pillar} className="flex items-center justify-between gap-4 border-b border-cream/10 py-3">
                    <div className="flex items-center gap-3">
                      <PillarChip index={h.pillar as 1|2|3|4|5|6|7|8} label={h.name} />
                    </div>
                    <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-cream/55 tabular-nums">
                      Tier {h.tier} · {h.tierLabel}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Right — radar */}
        <div className="lg:col-span-7">
          <div className="flex items-center justify-between mb-4">
            <p className="eyebrow text-cream/45">Eight pillars</p>
            <div className="flex items-center gap-4 font-mono text-[10px] uppercase tracking-[0.2em] text-cream/40">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-brass-bright" /> You
              </span>
              {cohort && (
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-cream/40" /> Cohort
                </span>
              )}
            </div>
          </div>
          <div className="rounded-lg border border-cream/10 bg-surface-1/40 p-4 sm:p-6 lg:p-8">
            <PillarBarChart values={pillarValues} cohort={cohort} labels={PILLAR_NAMES} />
            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-cream/45">
              <span className="inline-flex items-center gap-1.5">
                <span aria-hidden className="inline-block h-2 w-3 rounded-sm bg-brass-bright" />
                You
              </span>
              {cohort && (
                <span className="inline-flex items-center gap-1.5">
                  <span aria-hidden className="inline-block h-3 w-px bg-cream/70" />
                  Cohort median
                </span>
              )}
              <span aria-hidden className="text-cream/20">·</span>
              <span className="tabular-nums">0–5 maturity scale</span>
            </div>
          </div>
        </div>
      </div>

      {/* Cohort delta card — full width below the score + radar */}
      <div className="mt-16">
        <BenchmarkSliceCard
          values={pillarValues}
          userScore={report.aioi_score}
          slice={slice}
        />
      </div>
    </section>
    {!hasDeepdive && <DeepDiveUnlock slug={slug} variant="card" />}
    </>
  );
}

// ─── Plan ─────────────────────────────────────────────────────────────────
function PlanTab({
  plan, outcomes, slug, hasDeepdive,
}: { plan: PlanMonth[]; outcomes: OutcomeRow[]; slug: string; hasDeepdive: boolean }) {
  const outcomeMap = useMemo(() => new Map(outcomes.map((o) => [o.id, o])), [outcomes]);

  if (plan.length === 0) {
    return (
      <section className="container max-w-3xl py-20">
        <p className="font-display text-xl text-cream/70">
          No plan generated yet. Try refreshing — the engine may still be drafting it.
        </p>
      </section>
    );
  }

  // When the user hasn't done the deep dive, only the first month is shown
  // in the clear; months 2-3 sit behind a blur with an unlock overlay.
  const visiblePlan = hasDeepdive ? plan : plan.slice(0, 1);
  const lockedPlan = hasDeepdive ? [] : plan.slice(1);

  return (
    <section className="container max-w-6xl py-10 sm:py-20">
      <div className="max-w-3xl mb-12">
        <p className="eyebrow mb-5">Three months</p>
        <h2 className="font-display text-4xl sm:text-5xl text-cream leading-[1.05] tracking-tight">
          Where to spend the<br />
          <span className="italic text-brass-bright">next ninety days.</span>
        </h2>
        <p className="mt-6 font-display text-lg text-cream/65 max-w-2xl">
          {hasDeepdive
            ? "Drawn from your hotspot pillars and the outcomes library. Each month picks one or two interventions to ship — sequenced so the foundations land first."
            : "Month 1 is unlocked from your scan. Months 2 and 3 need the deep dive — eight more questions tighten the plan enough to commit to a sequence."}
        </p>
      </div>

      <div className="space-y-12">
        {visiblePlan.map((month) => (
          <PlanMonthArticle key={month.month} month={month} outcomeMap={outcomeMap} />
        ))}
      </div>

      {lockedPlan.length > 0 && (
        <div className="relative mt-12">
          <div className="space-y-12 select-none pointer-events-none blur-sm opacity-60" aria-hidden>
            {lockedPlan.map((month) => (
              <PlanMonthArticle key={month.month} month={month} outcomeMap={outcomeMap} />
            ))}
          </div>
          <DeepDiveUnlock slug={slug} variant="overlay" />
        </div>
      )}
    </section>
  );
}

function PlanMonthArticle({
  month, outcomeMap,
}: { month: PlanMonth; outcomeMap: Map<string, OutcomeRow> }) {
  return (
    <article className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-10 border-t border-cream/10 pt-8 sm:pt-10">
      <aside className="lg:col-span-3">
        <div className="flex items-baseline gap-4">
          <span className="font-display text-5xl sm:text-7xl leading-none text-brass-bright/30 tabular-nums">
            M{month.month}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] sm:tracking-[0.22em] text-cream/35">
            Month {month.month}
          </span>
        </div>
      </aside>
      <div className="lg:col-span-9 space-y-6">
        <h3 className="font-display text-3xl sm:text-4xl text-cream leading-tight tracking-tight">
          {month.title}
        </h3>
        <p className="font-display text-lg text-cream/75 leading-relaxed max-w-2xl">
          {month.rationale}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
          {month.outcome_ids.map((id) => {
            const o = outcomeMap.get(id);
            if (!o) return null;
            return <OutcomeCard key={id} outcome={o} />;
          })}
        </div>
      </div>
    </article>
  );
}

function OutcomeCard({ outcome }: { outcome: OutcomeRow }) {
  return (
    <div className="rounded-md border border-cream/10 bg-surface-1/50 p-5">
      <div className="flex items-center gap-3 mb-3">
        <PillarChip index={outcome.pillar as 1|2|3|4|5|6|7|8} label={PILLAR_NAMES[outcome.pillar as 1|2|3|4|5|6|7|8]} />
      </div>
      <h4 className="font-display text-xl text-cream leading-snug">{outcome.title}</h4>
      <p className="mt-2 text-sm text-cream/65 leading-relaxed">{outcome.body}</p>
      <div className="mt-4 flex items-center gap-4 font-mono text-[10px] uppercase tracking-[0.2em] text-cream/40">
        {outcome.time_to_value && <span>{outcome.time_to_value}</span>}
        {typeof outcome.effort === "number" && <span>Effort {outcome.effort}/5</span>}
        {typeof outcome.impact === "number" && <span>Impact {outcome.impact}/5</span>}
      </div>
    </div>
  );
}

// ─── Report (printable A4 one-pager) ──────────────────────────────────────
function ReportTab({
  data, pillarValues, cohort, slice,
}: {
  data: ReportData;
  pillarValues: Record<number, number>;
  cohort?: Record<number, number>;
  slice: MatchedSlice | null;
}) {
  const { respondent, report, outcomes } = data;
  const outcomeMap = useMemo(() => new Map(outcomes.map((o) => [o.id, o])), [outcomes]);

  if (!report) return null;

  return (
    <section className="container max-w-5xl py-16 sm:py-20 print:py-0">
      <div className="flex items-center justify-between mb-6 print:hidden">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cream/40">
          A4 one-pager · Print or save as PDF
        </p>
        <Button
          onClick={() => window.print()}
          className="rounded-sm bg-brass text-walnut hover:bg-brass-bright font-ui text-xs uppercase tracking-wider"
        >
          <Printer className="h-3.5 w-3.5 mr-2" /> Print / Save PDF
        </Button>
      </div>

      <article
        className="bg-cream text-walnut rounded-md shadow-2xl p-10 sm:p-14 print:rounded-none print:shadow-none print:p-12"
        style={{ aspectRatio: "1 / 1.414" }}
      >
        {/* Masthead */}
        <header className="flex items-baseline justify-between border-b border-walnut/15 pb-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-walnut/55">
              AIOI · {capitalise(respondent.level)} level
            </p>
            <h1 className="font-display text-3xl text-walnut leading-tight mt-1">
              The AI Operating Index
            </h1>
          </div>
          <div className="text-right">
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-walnut/55">
              Volume I · {report.generated_at ? formatDate(report.generated_at) : "—"}
            </p>
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-walnut/55 mt-1">
              Slug · {respondent.slug}
            </p>
          </div>
        </header>

        {/* Score + diagnosis */}
        <div className="grid grid-cols-12 gap-8 mt-8">
          <div className="col-span-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-walnut/55 mb-2">
              AIOI Score
            </p>
            <p className="font-display font-light text-[88px] leading-none text-walnut tabular-nums tracking-[-0.02em]">
              {report.aioi_score}
            </p>
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-walnut/55 mt-3">
              Tier · {report.overall_tier}
            </p>
            {report.diagnosis && (
              <p className="mt-6 font-display italic text-xl text-walnut/85 leading-snug border-l-2 border-walnut/40 pl-4">
                "{report.diagnosis}"
              </p>
            )}
          </div>
          <div className="col-span-7">
            <RadarChartPrintable values={pillarValues} cohort={cohort} />
          </div>
        </div>

        {/* Hotspots */}
        <div className="mt-8 border-t border-walnut/15 pt-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-walnut/55 mb-3">
            Three pillars to watch
          </p>
          <ul className="grid grid-cols-3 gap-4">
            {report.hotspots.map((h) => (
              <li key={h.pillar} className="border border-walnut/15 rounded-sm p-3">
                <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-walnut/60">
                  P{h.pillar}
                </p>
                <p className="font-display text-base text-walnut leading-tight mt-1">{h.name}</p>
                <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-walnut/55 mt-2">
                  Tier {h.tier} · {h.tierLabel}
                </p>
              </li>
            ))}
          </ul>
        </div>

        {/* Versus the field — print-tuned cohort comparison */}
        <PrintableCohortStrip
          slice={slice}
          values={pillarValues}
          userScore={report.aioi_score}
        />

        {/* Plan */}
        {report.plan.length > 0 && (
          <div className="mt-8 border-t border-walnut/15 pt-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-walnut/55 mb-3">
              Ninety-day plan
            </p>
            <ol className="grid grid-cols-3 gap-4">
              {report.plan.map((m) => (
                <li key={m.month}>
                  <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-walnut/60">
                    Month {m.month}
                  </p>
                  <p className="font-display text-base text-walnut leading-tight mt-1">{m.title}</p>
                  <ul className="mt-2 space-y-1">
                    {m.outcome_ids.map((id) => {
                      const o = outcomeMap.get(id);
                      return o ? (
                        <li key={id} className="text-[11px] text-walnut/70 leading-snug flex gap-1">
                          <span>·</span><span>{o.title}</span>
                        </li>
                      ) : null;
                    })}
                  </ul>
                </li>
              ))}
            </ol>
          </div>
        )}

        <footer className="mt-auto pt-8 flex items-baseline justify-between text-[10px] font-mono uppercase tracking-[0.24em] text-walnut/50">
          <span>Deepgrain · The AIOI</span>
          <span>aioi.deepgrain.co</span>
        </footer>
      </article>
    </section>
  );
}

/**
 * Print-tuned cohort comparison strip for the A4 one-pager.
 *
 * Uses walnut tones (matching the cream sheet) and a compact 4-col grid of
 * mini bars so the whole strip fits in one band beneath Hotspots without
 * pushing the Plan onto a second page.
 */
function PrintableCohortStrip({
  slice,
  values,
  userScore,
}: {
  slice: MatchedSlice | null;
  values: Record<number, number>;
  userScore: number;
}) {
  if (!slice) return null;

  const cohortPillars = pillarsFromRow(slice.row);
  const cohortScore =
    slice.row.median_score != null ? Math.round(Number(slice.row.median_score)) : null;
  const sample = slice.row.sample_size;
  const overallDelta = cohortScore != null ? userScore - cohortScore : null;

  const rows = [1, 2, 3, 4, 5, 6, 7, 8].map((p) => {
    const user = values[p] ?? 0;
    const cohort = cohortPillars[p] ?? 0;
    return {
      pillar: p,
      name: PILLAR_NAMES[p as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8],
      user,
      cohort,
      delta: Math.round((user - cohort) * 10) / 10,
    };
  });

  return (
    <div className="mt-8 border-t border-walnut/15 pt-6">
      <div className="flex items-baseline justify-between mb-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-walnut/55">
          Versus the field · {slice.label}
        </p>
        <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-walnut/55 tabular-nums">
          n = {sample.toLocaleString()}
          {cohortScore != null && (
            <>
              {" · "}cohort {cohortScore}
              {overallDelta != null && (
                <> · gap {overallDelta > 0 ? "+" : ""}{overallDelta}</>
              )}
            </>
          )}
        </p>
      </div>
      <ul className="grid grid-cols-4 gap-x-5 gap-y-2.5">
        {rows.map((r) => (
          <li key={r.pillar} className="flex items-center gap-2 min-w-0">
            <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-walnut/55 w-5 shrink-0">
              P{r.pillar}
            </span>
            <PrintCohortBar user={r.user} cohort={r.cohort} />
            <span
              className={`font-mono text-[10px] tabular-nums w-9 text-right shrink-0 ${
                r.delta > 0
                  ? "text-walnut font-semibold"
                  : r.delta < 0
                  ? "text-walnut/55"
                  : "text-walnut/40"
              }`}
            >
              {r.delta > 0 ? "+" : ""}
              {r.delta.toFixed(1)}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex items-center gap-4 font-mono text-[9px] uppercase tracking-[0.22em] text-walnut/55">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-1.5 w-3 rounded-sm bg-walnut/85" aria-hidden />
          Your tier
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-1.5 w-3 rounded-sm bg-walnut/30" aria-hidden />
          Cohort median
        </span>
      </div>
    </div>
  );
}

/** Compact double bar in walnut tones for the printable sheet. */
function PrintCohortBar({ user, cohort }: { user: number; cohort: number }) {
  const max = 5;
  const userPct = Math.max(0, Math.min(1, user / max)) * 100;
  const cohortPct = Math.max(0, Math.min(1, cohort / max)) * 100;
  return (
    <div className="relative h-1.5 flex-1 bg-walnut/8 rounded-sm overflow-hidden">
      <span
        className="absolute top-0 left-0 h-full bg-walnut/30"
        style={{ width: `${cohortPct}%` }}
        aria-hidden
      />
      <span
        className="absolute top-0 left-0 h-full bg-walnut/85"
        style={{ width: `${userPct}%`, mixBlendMode: "multiply" }}
        aria-hidden
      />
    </div>
  );
}

// Variant for the printable cream sheet — same component, inverted via wrapper
function RadarChartPrintable({
  values, cohort,
}: { values: Record<number, number>; cohort?: Record<number, number> }) {
  return (
    <div className="text-walnut">
      <PillarBarChart values={values} cohort={cohort} labels={PILLAR_NAMES} />
    </div>
  );
}

// ─── Invite ───────────────────────────────────────────────────────────────
function InviteTab({ respondentId, slug }: { respondentId: string; slug: string }) {
  const { toast } = useToast();
  const [emails, setEmails] = useState("");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);

  const link = typeof window !== "undefined" ? `${window.location.origin}/assess` : "/assess";

  const copyLink = async () => {
    await navigator.clipboard.writeText(link);
    toast({ title: "Link copied", description: "Paste it wherever your colleagues will see it." });
  };

  const sendInvites = async () => {
    const list = emails.split(/[\s,;]+/).map((e) => e.trim()).filter(Boolean);
    if (list.length === 0) {
      toast({ title: "Add at least one email", variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      await supabase.from("events").insert({
        name: "report_invite_sent",
        payload: {
          respondent_id: respondentId,
          slug,
          recipients: list,
          note: note || null,
        },
      });
      toast({
        title: `Invites recorded for ${list.length} ${list.length === 1 ? "person" : "people"}`,
        description: "Outbound delivery via Lovable Emails arrives in the next phase — for now your colleagues should hit the link directly.",
      });
      setEmails("");
      setNote("");
    } catch (err) {
      toast({ title: "Couldn't record invites", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="container max-w-3xl py-16 sm:py-20">
      <p className="eyebrow mb-5">Invite</p>
      <h2 className="font-display text-4xl sm:text-5xl text-cream leading-[1.05] tracking-tight">
        Run the same diagnostic<br />
        <span className="italic text-brass-bright">on the rest of the team.</span>
      </h2>
      <p className="mt-6 font-display text-lg text-cream/65 max-w-2xl">
        Each colleague gets their own private report. The fanout view (medians, deltas, biggest disagreements) lands as soon as three of you have completed it.
      </p>

      {/* Shareable link */}
      <div className="mt-12 rounded-md border border-cream/10 bg-surface-1/50 p-5">
        <p className="eyebrow mb-3 text-cream/45">Shareable link</p>
        <div className="flex items-center gap-3">
          <Input
            readOnly
            value={link}
            className="bg-surface-0 border-cream/10 text-cream font-mono text-sm focus-visible:ring-brass"
          />
          <Button
            onClick={copyLink}
            className="rounded-sm bg-brass text-walnut hover:bg-brass-bright font-ui text-xs uppercase tracking-wider shrink-0"
          >
            <Copy className="h-3.5 w-3.5 mr-2" /> Copy
          </Button>
        </div>
      </div>

      {/* Email invites */}
      <div className="mt-8 space-y-4 rounded-md border border-cream/10 bg-surface-1/50 p-5">
        <p className="eyebrow text-cream/45">Or send directly</p>
        <div>
          <label className="block font-ui text-xs uppercase tracking-[0.16em] text-cream/55 mb-2">
            Emails (comma-separated)
          </label>
          <Input
            value={emails}
            onChange={(e) => setEmails(e.target.value)}
            placeholder="alex@team.com, jamie@team.com"
            className="bg-surface-0 border-cream/10 text-cream placeholder:text-cream/30 focus-visible:ring-brass"
          />
        </div>
        <div>
          <label className="block font-ui text-xs uppercase tracking-[0.16em] text-cream/55 mb-2">
            Personal note (optional)
          </label>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Eighteen minutes. Worth running before our planning offsite."
            rows={3}
            className="bg-surface-0 border-cream/10 text-cream placeholder:text-cream/30 focus-visible:ring-brass"
          />
        </div>
        <div className="pt-2 flex items-center gap-4">
          <Button
            onClick={sendInvites}
            disabled={sending}
            className="rounded-sm bg-brass text-walnut hover:bg-brass-bright font-ui text-xs uppercase tracking-wider"
          >
            {sending ? <>Sending…</> : <><Send className="h-3.5 w-3.5 mr-2" /> Send invites</>}
          </Button>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-cream/40">
            We'll record these now; outbound delivery follows in Phase 4.
          </span>
        </div>
      </div>
    </section>
  );
}

// ─── Resend report link ───────────────────────────────────────────────────
// One-click "send me the link again" for respondents returning on a new
// device. Pulls the email from the active session, fires a fresh magic
// link pointing back at this report, and locks the button for 60s so the
// rate-limiter on the auth provider isn't pestered.
function ResendReportLink({ slug }: { slug: string }) {
  const { toast } = useToast();
  const [email, setEmail] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) setEmail(data.session?.user.email ?? null);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const onClick = async () => {
    if (!email || sending || cooldown > 0) return;
    setSending(true);
    try {
      const redirectTo = `${window.location.origin}/assess/r/${slug}`;
      await sendMagicLink(email, redirectTo);
      toast({
        title: "Link sent",
        description: `We've emailed a fresh sign-in link to ${email}. Check your inbox.`,
      });
      setCooldown(60);
    } catch (err) {
      const message = err instanceof SyncError ? err.message : "Could not send the link. Try again in a moment.";
      toast({ title: "Send failed", description: message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  if (!email) return null;

  return (
    <Button
      type="button"
      onClick={onClick}
      disabled={sending || cooldown > 0}
      variant="outline"
      size="sm"
      className="border-cream/20 bg-transparent text-cream hover:bg-cream/5 hover:text-cream font-ui text-[11px] uppercase tracking-[0.18em] h-9"
    >
      {sending ? (
        <><Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> Sending…</>
      ) : cooldown > 0 ? (
        <><Mail className="h-3.5 w-3.5 mr-2" /> Sent · {cooldown}s</>
      ) : (
        <><Mail className="h-3.5 w-3.5 mr-2" /> Resend report link</>
      )}
    </Button>
  );
}

// ─── Email-me-the-PDF popover ─────────────────────────────────────────────
// Anyone with the slug can request the lite report PDF be emailed to any
// address. The edge function generates the PDF, hosts it in storage, and
// triggers the transactional `report-pdf-ready` email.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function EmailPdfButton({ slug }: { slug: string }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!EMAIL_RE.test(trimmed)) {
      toast({
        title: "Check the address",
        description: "That doesn't look like a valid email.",
        variant: "destructive",
      });
      return;
    }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("email-report-pdf", {
        body: { slug, email: trimmed },
      });

      // Recoverable case: the edge function returns HTTP 200 with
      // { ok:false, pdfUrl, error } when the PDF was generated but the
      // email queue handoff failed. Surface the download link instead of
      // showing a destructive error.
      const recoverablePdfUrl =
        data && data.ok === false && typeof data.pdfUrl === "string"
          ? (data.pdfUrl as string)
          : null;

      if (data?.ok && data?.pdfUrl) {
        setPdfUrl(data.pdfUrl);
        toast({
          title: "On its way",
          description: `We've emailed the PDF to ${trimmed}. Check your inbox.`,
        });
        return;
      }

      if (recoverablePdfUrl) {
        setPdfUrl(recoverablePdfUrl);
        toast({
          title: "PDF ready — direct link below",
          description:
            data?.error ??
            "We generated the PDF but couldn't queue the email. Use the download link in the popover.",
        });
        return;
      }

      // Genuine failure (no PDF generated).
      if (error) throw error;
      throw new Error(data?.error ?? "Could not send the PDF.");
    } catch (err) {
      console.error("[email-pdf] failed", err);
      toast({
        title: "Send failed",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="border-cream/20 bg-transparent text-cream hover:bg-cream/5 font-ui text-[11px] uppercase tracking-[0.18em] h-9"
        >
          <FileText className="h-3.5 w-3.5 mr-2" /> Email me the PDF
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-80 bg-surface-1 border-cream/15 text-cream"
      >
        <form onSubmit={submit} className="space-y-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cream/45">
              Email me the PDF
            </p>
            <p className="mt-1.5 font-display text-sm text-cream/75 leading-snug">
              We'll generate a one-page PDF and send a download link.
            </p>
          </div>
          <Input
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={sending}
            className="bg-surface-0 border-cream/15 text-cream placeholder:text-cream/30"
          />
          <div className="flex items-center gap-2">
            <Button
              type="submit"
              size="sm"
              disabled={sending}
              className="rounded-sm bg-brass text-walnut hover:bg-brass-bright font-ui text-[11px] uppercase tracking-wider flex-1"
            >
              {sending ? (
                <><Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> Sending…</>
              ) : (
                <><Mail className="h-3.5 w-3.5 mr-2" /> Send link</>
              )}
            </Button>
          </div>
          {pdfUrl && (
            <div className="rounded-sm border border-brass/40 bg-brass/5 p-3 space-y-1.5">
              <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-brass-bright">
                PDF ready
              </p>
              <a
                href={pdfUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 font-ui text-xs text-cream hover:text-brass-bright underline-offset-4 hover:underline break-all"
              >
                <Download className="h-3.5 w-3.5 shrink-0" /> Download the PDF directly
              </a>
            </div>
          )}
          <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-cream/35">
            By submitting, you agree to receive one transactional email at this address.
          </p>
        </form>
      </PopoverContent>
    </Popover>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────
function FullPageMessage({ eyebrow, line1, line2, cta }: { eyebrow: string; line1: string; line2?: string; cta?: string }) {
  return (
    <div className="min-h-screen bg-walnut text-cream">
      <SiteNav />
      <main className="container max-w-2xl pt-40 pb-24">
        <p className="eyebrow mb-5">{eyebrow}</p>
        <h1 className="font-display text-4xl sm:text-5xl text-cream leading-tight tracking-tight">
          {line1}
        </h1>
        {line2 && <p className="mt-4 font-display text-lg text-cream/65">{line2}</p>}
        {cta && (
          <div className="mt-8">
            <Link
              to={cta}
              className="inline-flex items-center gap-2 h-11 px-5 rounded-sm bg-brass text-walnut hover:bg-brass-bright font-ui text-xs uppercase tracking-wider"
            >
              Back <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}

function capitalise(s: string) {
  return s.length === 0 ? s : s[0].toUpperCase() + s.slice(1);
}
function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}
