import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
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
import { Seo } from "@/components/aioi/Seo";
import { FounderBio } from "@/components/aioi/FounderBio";
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
import { ReportCta } from "@/components/aioi/ReportCta";
import { HotspotCard } from "@/components/aioi/HotspotCard";
import { MoveCard, type RecommendationMove } from "@/components/aioi/MoveCard";
import { sendMagicLink, SyncError } from "@/lib/sync";
import { seoRoutes } from "@/lib/seo";
import { trackEvent } from "@/lib/analytics";
import { buildAuthCallbackUrl } from "@/lib/auth-callback-url";
import { AdminRegenerateButton } from "@/components/admin/AdminRegenerateButton";
import { ReportChatLauncher } from "@/components/aioi/ReportChatLauncher";
import { NextActionsModule } from "@/components/aioi/NextActionsModule";

// ─── Types coming back from the report row ────────────────────────────────
export interface PillarTierEntry {
  tier: number;
  label: Tier;
  name: string;
}
export interface Hotspot {
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
export interface Recommendations {
  headline_diagnosis: string;
  personalised_intro: string;
  closing_cta: string;
  moves: RecommendationMove[];
  generated_at?: string;
  voice_model?: string;
  used_fallback?: boolean;
}
export interface ReportData {
  respondent: {
    id: string;
    slug: string;
    level: string;
    function: string | null;
    region: string | null;
    org_size: string | null;
    submitted_at: string | null;
    is_anonymous: boolean;
    is_owned?: boolean;
    is_owner?: boolean;
  };
  report: {
    aioi_score: number;
    overall_tier: Tier;
    pillar_tiers: Record<string, PillarTierEntry>;
    hotspots: Hotspot[];
    diagnosis: string | null;
    plan: PlanMonth[];
    recommendations: Recommendations | null;
    recommendations_generated_at: string | null;
    move_ids: string[] | null;
    generated_at: string | null;
    cap_flags?: Array<{ code: string; label: string }>;
    benchmark_excluded?: boolean;
    score_audit?: Record<string, unknown>;
  } | null;
  outcomes: OutcomeRow[];
  cohort: Record<number, number> | null;
  slice: MatchedSlice | null;
  hasDeepdive: boolean;
}

function confidenceCopy(hasDeepdive: boolean, capCount: number) {
  if (capCount > 0) return "Adjusted for internal contradictions";
  return hasDeepdive ? "High confidence · Deep Dive complete" : "Directional · Quickscan only";
}

function narrativeReadout(report: NonNullable<ReportData["report"]>, hasDeepdive: boolean) {
  const primary = report.hotspots[0];
  const secondary = report.hotspots[1];
  const capCount = report.cap_flags?.length ?? 0;
  return {
    pattern: `${report.overall_tier} organisations typically have visible AI activity, but the operating system is only as strong as the weakest dependency between mandate, data, workflow and measurement.`,
    bottleneck: primary ? `${primary.name} is the main bottleneck to resolve first.` : "No single bottleneck dominates the current read.",
    leverage: secondary ? `The next leverage point is ${secondary.name}, because it determines whether gains repeat outside one pocket of the organisation.` : "The next leverage point is turning isolated practice into a repeatable operating rhythm.",
    confidence: confidenceCopy(hasDeepdive, capCount),
  };
}

/** Short pillar-aware blurb for the HotspotCard headline. */
function tierBlurb(tierLabel: Tier, pillarName: string): string {
  switch (tierLabel) {
    case "Dormant": return `${pillarName} is pre-AI. Foundations come before tooling.`;
    case "Exploring": return `${pillarName} has activity but no operating shape yet.`;
    case "Deployed": return `${pillarName} ships, but it does not yet compound.`;
    case "Integrated": return `${pillarName} is part of the flow. Now make it consistent.`;
    case "Leveraged": return `${pillarName} drives outcomes. Defend the gains.`;
    case "AI-Native": return `${pillarName} is the substrate. Keep raising the floor.`;
    default: return `${pillarName} needs sequencing before scale.`;
  }
}

// ─── Moves (new — backed by the Voice Wrapper recommendations) ────────────
type MoveSortKey = "default" | "effort_asc" | "effort_desc" | "impact_desc" | "impact_asc";
type MoveTierFilter = "all" | "low" | "mid" | "high";
type MovePillarFilter = "all" | number;

const SORT_OPTIONS: ReadonlyArray<{ value: MoveSortKey; label: string }> = [
  { value: "default", label: "Recommended order" },
  { value: "impact_desc", label: "Impact · high → low" },
  { value: "impact_asc", label: "Impact · low → high" },
  { value: "effort_asc", label: "Effort · low → high" },
  { value: "effort_desc", label: "Effort · high → low" },
];

const TIER_BAND_FILTER_LABEL: Record<Exclude<MoveTierFilter, "all">, string> = {
  low: "Foundation",
  mid: "Build",
  high: "Sharpen",
};

export function MovesTab({
  recommendations,
  tier,
  slug,
  level,
  hasDeepdive,
  isAnonymous,
  respondentId,
  isOwner,
}: {
  recommendations: Recommendations;
  tier: Tier;
  slug: string;
  level: string;
  hasDeepdive: boolean;
  isAnonymous: boolean;
  respondentId: string;
  isOwner: boolean;
}) {
  const moves = recommendations.moves;
  // When the user hasn't done the deep dive, show the first three Moves in the
  // clear and lock the rest behind a normal-flow upsell. We always lock based
  // on the *recommended* order, then apply user filters/sorts to the visible
  // portion so locking behaviour can't be gamed by re-sorting.
  const VISIBLE_PRE_DEEPDIVE = 3;
  const baseVisible = hasDeepdive ? moves : moves.slice(0, VISIBLE_PRE_DEEPDIVE);
  const lockedCount = hasDeepdive ? 0 : Math.max(0, moves.length - VISIBLE_PRE_DEEPDIVE);
  const usedFallback = recommendations.used_fallback === true;

  // Persist sort + filters in the URL so they survive navigating away and
  // back (and are shareable). Defaults are omitted from the querystring so
  // the URL stays clean for the common case.
  const [searchParams, setSearchParams] = useSearchParams();

  const SORT_KEYS: readonly MoveSortKey[] = ["default", "effort_asc", "effort_desc", "impact_desc", "impact_asc"];
  const TIER_KEYS: readonly MoveTierFilter[] = ["all", "low", "mid", "high"];

  const sortParam = searchParams.get("sort");
  const sort: MoveSortKey = (SORT_KEYS as readonly string[]).includes(sortParam ?? "")
    ? (sortParam as MoveSortKey)
    : "default";

  const tierParam = searchParams.get("band");
  const tierFilter: MoveTierFilter = (TIER_KEYS as readonly string[]).includes(tierParam ?? "")
    ? (tierParam as MoveTierFilter)
    : "all";

  const pillarParam = searchParams.get("pillar");
  const pillarParsed = pillarParam ? Number.parseInt(pillarParam, 10) : NaN;
  const pillarFilter: MovePillarFilter =
    Number.isFinite(pillarParsed) && pillarParsed >= 1 && pillarParsed <= 8
      ? (pillarParsed as number)
      : "all";

  // Helper: update one query param, dropping it when it equals the default.
  const updateParam = (key: string, value: string | null, defaultValue: string) => {
    const next = new URLSearchParams(searchParams);
    if (value === null || value === defaultValue) next.delete(key);
    else next.set(key, value);
    setSearchParams(next, { replace: true });
  };

  const setSort = (s: MoveSortKey) => updateParam("sort", s, "default");
  const setTierFilter = (t: MoveTierFilter) => updateParam("band", t, "all");
  const setPillarFilter = (p: MovePillarFilter) =>
    updateParam("pillar", p === "all" ? null : String(p), "all");
  const resetFilters = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("sort");
    next.delete("band");
    next.delete("pillar");
    setSearchParams(next, { replace: true });
  };


  // Pillars actually represented in the visible Move set — drives chip options.
  const availablePillars = useMemo(() => {
    const set = new Set<number>();
    for (const m of baseVisible) set.add(m.snapshot.pillar);
    return Array.from(set).sort((a, b) => a - b);
  }, [baseVisible]);

  // Tier bands actually present — hide chips that would never match.
  const availableTierBands = useMemo(() => {
    const set = new Set<string>();
    for (const m of baseVisible) if (m.snapshot.tier_band) set.add(m.snapshot.tier_band);
    return (["low", "mid", "high"] as const).filter((b) => set.has(b));
  }, [baseVisible]);

  const filteredSorted = useMemo(() => {
    let out = baseVisible.slice();
    if (pillarFilter !== "all") {
      out = out.filter((m) => m.snapshot.pillar === pillarFilter);
    }
    if (tierFilter !== "all") {
      out = out.filter((m) => m.snapshot.tier_band === tierFilter);
    }
    const valOrInf = (n: number | null | undefined, asc: boolean) =>
      typeof n === "number" ? n : asc ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
    switch (sort) {
      case "effort_asc":
        out.sort((a, b) => valOrInf(a.snapshot.effort, true) - valOrInf(b.snapshot.effort, true));
        break;
      case "effort_desc":
        out.sort((a, b) => valOrInf(b.snapshot.effort, false) - valOrInf(a.snapshot.effort, false));
        break;
      case "impact_desc":
        out.sort((a, b) => valOrInf(b.snapshot.impact, false) - valOrInf(a.snapshot.impact, false));
        break;
      case "impact_asc":
        out.sort((a, b) => valOrInf(a.snapshot.impact, true) - valOrInf(b.snapshot.impact, true));
        break;
      default:
        // keep recommended order
        break;
    }
    return out;
  }, [baseVisible, pillarFilter, tierFilter, sort]);

  const filtersActive = sort !== "default" || tierFilter !== "all" || pillarFilter !== "all";

  return (
    <section className="container max-w-6xl py-10 sm:py-20">
      <div className="max-w-3xl mb-12">
        <p className="eyebrow mb-5">Your moves · ranked for impact</p>
        <h2 className="font-display text-4xl sm:text-5xl text-cream leading-[1.05] tracking-tight text-balance">
          {moves.length} move{moves.length === 1 ? "" : "s"} to take next,<br />
          <span className="italic text-brass-bright">in the right order.</span>
        </h2>
        <p className="mt-6 font-display text-lg text-cream/65 max-w-2xl leading-relaxed">
          {recommendations.personalised_intro}
        </p>
        {usedFallback && (
          <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-cream/35">
            Generated from your scored profile · personalised wrapper unavailable
          </p>
        )}
      </div>

      <MovesControls
        sort={sort}
        onSortChange={setSort}
        tierFilter={tierFilter}
        onTierFilterChange={setTierFilter}
        pillarFilter={pillarFilter}
        onPillarFilterChange={setPillarFilter}
        availablePillars={availablePillars}
        availableTierBands={availableTierBands}
        totalCount={baseVisible.length}
        visibleCount={filteredSorted.length}
        filtersActive={filtersActive}
        onReset={resetFilters}
      />

      {filteredSorted.length === 0 ? (
        <div className="rounded-md border border-cream/15 bg-surface-1/40 px-6 py-10 text-center">
          <p className="font-display text-lg text-cream/75">No moves match these filters.</p>
          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.2em] text-cream/45">
            Clear filters to see all {baseVisible.length} moves.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          {filteredSorted.map((move, i) => (
            <MoveCard key={move.move_id} move={move} index={i} />
          ))}
        </div>
      )}

      {lockedCount > 0 && (
        <LockedMovesContinuation
          lockedCount={lockedCount}
          slug={slug}
          level={level}
          isAnonymous={isAnonymous}
        />
      )}

      {recommendations.closing_cta && (
        <aside
          aria-label="Where to start"
          className="mt-12 sm:mt-16 relative overflow-hidden rounded-md border border-brass/35 bg-gradient-to-br from-brass/12 via-brass/5 to-transparent px-6 sm:px-10 py-7 sm:py-9"
        >
          <span aria-hidden className="absolute left-0 top-0 bottom-0 w-1 bg-brass-bright" />
          <p className="eyebrow text-brass-bright mb-3">Start here · this week</p>
          <p className="font-display text-2xl sm:text-3xl text-cream leading-snug tracking-tight text-balance">
            {recommendations.closing_cta}
          </p>
        </aside>
      )}

      <NextActionsModule
        respondentId={respondentId}
        moves={recommendations.moves}
        isOwner={isOwner}
      />

      <ReportCta tier={tier} />
    </section>
  );
}

interface MovesControlsProps {
  sort: MoveSortKey;
  onSortChange: (s: MoveSortKey) => void;
  tierFilter: MoveTierFilter;
  onTierFilterChange: (t: MoveTierFilter) => void;
  pillarFilter: MovePillarFilter;
  onPillarFilterChange: (p: MovePillarFilter) => void;
  availablePillars: number[];
  availableTierBands: ReadonlyArray<"low" | "mid" | "high">;
  totalCount: number;
  visibleCount: number;
  filtersActive: boolean;
  onReset: () => void;
}

function MovesControls({
  sort, onSortChange,
  tierFilter, onTierFilterChange,
  pillarFilter, onPillarFilterChange,
  availablePillars, availableTierBands,
  totalCount, visibleCount, filtersActive, onReset,
}: MovesControlsProps) {
  return (
    <div
      role="region"
      aria-label="Filter and sort your moves"
      className="mb-8 sm:mb-10 rounded-md border border-cream/10 bg-surface-1/40 px-4 sm:px-5 py-4 sm:py-5"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        {/* Filter chips */}
        <div className="flex flex-col gap-3 min-w-0">
          {availablePillars.length > 1 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-cream/45 mr-1">
                Pillar
              </span>
              <ChipButton
                active={pillarFilter === "all"}
                onClick={() => onPillarFilterChange("all")}
              >
                All
              </ChipButton>
              {availablePillars.map((p) => (
                <ChipButton
                  key={p}
                  active={pillarFilter === p}
                  onClick={() => onPillarFilterChange(p)}
                >
                  {PILLAR_NAMES[p as 1] ?? `Pillar ${p}`}
                </ChipButton>
              ))}
            </div>
          )}

          {availableTierBands.length > 1 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-cream/45 mr-1">
                Tier band
              </span>
              <ChipButton
                active={tierFilter === "all"}
                onClick={() => onTierFilterChange("all")}
              >
                All
              </ChipButton>
              {availableTierBands.map((band) => (
                <ChipButton
                  key={band}
                  active={tierFilter === band}
                  onClick={() => onTierFilterChange(band)}
                >
                  {TIER_BAND_FILTER_LABEL[band]}
                </ChipButton>
              ))}
            </div>
          )}
        </div>

        {/* Sort + meta */}
        <div className="flex flex-wrap items-center gap-3 lg:justify-end shrink-0">
          <label className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-cream/45">
              Sort
            </span>
            <select
              aria-label="Sort moves"
              value={sort}
              onChange={(e) => onSortChange(e.target.value as MoveSortKey)}
              className="h-9 rounded-sm border border-cream/15 bg-surface-1/70 px-2 font-ui text-xs uppercase tracking-[0.14em] text-cream hover:border-cream/30 focus-visible:outline-none focus-visible:border-brass/50"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-walnut text-cream">
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <span
            aria-live="polite"
            className="font-mono text-[10px] uppercase tracking-[0.2em] text-cream/45"
          >
            {visibleCount}/{totalCount} shown
          </span>
          {filtersActive && (
            <button
              type="button"
              onClick={onReset}
              className="font-mono text-[10px] uppercase tracking-[0.2em] text-brass-bright hover:text-brass-bright/80 underline-offset-2 hover:underline"
            >
              Reset
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ChipButton({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={
        "inline-flex items-center h-7 px-2.5 rounded-sm border font-ui text-[11px] uppercase tracking-[0.14em] transition-colors " +
        (active
          ? "border-brass/55 bg-brass/15 text-brass-bright"
          : "border-cream/15 bg-transparent text-cream/65 hover:border-cream/30 hover:text-cream")
      }
    >
      {children}
    </button>
  );
}

function LockedMovesContinuation({
  lockedCount, slug, level, isAnonymous,
}: { lockedCount: number; slug: string; level: string; isAnonymous: boolean }) {
  return (
    <div className="mt-12 border-t border-cream/10 pt-8 sm:pt-10">
      <div className="rounded-lg border border-brass/30 bg-surface-1/55 p-5 sm:p-8 lg:p-10">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-sm border border-brass/35 bg-brass/10 text-brass-bright">
            <Lock className="h-4 w-4" />
          </span>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-brass-bright">
            {lockedCount} more move{lockedCount === 1 ? "" : "s"} locked until Deep Dive
          </p>
        </div>
        <DeepDiveUnlock slug={slug} level={level} variant="inline" isAnonymous={isAnonymous} />
      </div>
    </div>
  );
}

/**
 * Empty state for the Moves tab — shown when the report row exists but the
 * Voice Wrapper / Selection Engine hasn't produced recommendations yet AND
 * there's no legacy plan to bridge from. Communicates that this is in-flight,
 * not broken, and gives the user one clear action.
 */
export function MovesEmptyState({ tier, variant = "pending" }: { tier: Tier; variant?: "pending" | "partial" }) {
  const isPartial = variant === "partial";
  const eyebrow = isPartial ? "Recommendations pending" : "Moves are being drafted";
  const headline = isPartial ? (
    <>Finishing your moves<br /><span className="italic text-brass-bright">just a moment.</span></>
  ) : (
    <>Your moves aren't ready<br /><span className="italic text-brass-bright">just yet.</span></>
  );
  const body = isPartial
    ? `We've drafted your ${tier} recommendations but the selection engine is still finalising the move ordering. We won't show stale plan content while this completes.`
    : null;
  return (
    <section className="container max-w-3xl py-16 sm:py-24">
      <div className="rounded-lg border border-cream/10 bg-surface-1/40 px-6 sm:px-10 py-10 sm:py-14">
        <div className="flex items-center gap-3 mb-6">
          <span aria-hidden className="inline-flex h-9 w-9 items-center justify-center rounded-sm border border-brass/35 bg-brass/10 text-brass-bright">
            <Loader2 className="h-4 w-4 animate-spin" />
          </span>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-brass-bright">
            {eyebrow}
          </p>
        </div>

        <h2 className="font-display text-3xl sm:text-4xl text-cream leading-[1.1] tracking-tight text-balance">
          {headline}
        </h2>

        <p className="mt-5 font-display text-lg text-cream/70 leading-relaxed max-w-xl">
          {body ?? (
            <>
              Your answers landed and your <span className="text-cream">{tier}</span> profile is
              scored. The selection engine is choosing the right Moves and writing them in
              your voice — this usually takes under a minute.
            </>
          )}
        </p>

        <ul className="mt-7 space-y-2 text-sm text-cream/65 max-w-xl">
          <li className="flex gap-3">
            <Check className="h-4 w-4 mt-0.5 shrink-0 text-brass-bright" />
            <span>Your Overview, Report and Methodology tabs are already complete.</span>
          </li>
          <li className="flex gap-3">
            <Check className="h-4 w-4 mt-0.5 shrink-0 text-brass-bright" />
            <span>Refresh in a moment to pick up the personalised Moves once they're written.</span>
          </li>
        </ul>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button
            size="sm"
            onClick={() => window.location.reload()}
            className="rounded-sm bg-brass text-walnut hover:bg-brass-bright font-ui text-[11px] uppercase tracking-[0.16em] h-9"
          >
            Refresh now
          </Button>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cream/35">
            Auto-retried on every page load
          </p>
        </div>
      </div>
    </section>
  );
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
        sizeBand: sizeBandCode(payload.respondent.org_size),
      });
      const cohort = slice ? pillarsFromRow(slice.row) : null;
      if (cancelled) return;

      // Telemetry — fire-and-forget
      trackEvent("report_viewed", { slug, has_deepdive: payload.has_deepdive });

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
  const benchmarkSlice = report.benchmark_excluded && data.slice
    ? { ...data.slice, lockedReason: "This report is excluded from peer benchmarks because three or more consistency checks fired." }
    : data.slice;
  const needsEmailGate = respondent.is_anonymous;

  // URL-driven tab state. Lets HotspotCards deep-link via
  // `/assess/r/:slug?tab=plan#move-<id>` and keeps tab choice shareable.
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const VALID_TABS = ["overview", "plan", "report", "methodology", "invite"] as const;
  type TabValue = typeof VALID_TABS[number];
  const tabParam = searchParams.get("tab");
  const activeTab: TabValue =
    (VALID_TABS as readonly string[]).includes(tabParam ?? "")
      ? (tabParam as TabValue)
      : "overview";

  const handleTabChange = (next: string) => {
    const nextParams = new URLSearchParams(searchParams);
    if (next === "overview") nextParams.delete("tab");
    else nextParams.set("tab", next);
    setSearchParams(nextParams, { replace: true });
  };

  // Honour `#move-<id>` anchors after the Plan tab content mounts.
  // Radix only renders the active tab panel, so a plain hash navigation
  // can't find the element until the tab is open.
  useEffect(() => {
    if (activeTab !== "plan") return;
    const hash = location.hash;
    if (!hash || !hash.startsWith("#move-")) return;
    const id = hash.slice(1);
    // Defer one frame so the panel is in the DOM.
    const raf = requestAnimationFrame(() => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => cancelAnimationFrame(raf);
  }, [activeTab, location.hash]);

  return (
    <div className="min-h-screen bg-walnut text-cream">
      <Seo {...seoRoutes.report} path={`/assess/r/${respondent.slug}`} />
      <SiteNav />

      <TabsPrimitive.Root value={activeTab} onValueChange={handleTabChange} className="w-full">
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
                {!data.hasDeepdive && !needsEmailGate && (
                  <Button size="sm" asChild className="rounded-sm bg-brass text-walnut hover:bg-brass-bright font-ui text-[11px] uppercase tracking-[0.16em] sm:tracking-[0.18em] h-9">
                    <Link to={`/assess/deep/${respondent.slug}`}>Deep Dive <ArrowRight className="h-3.5 w-3.5 ml-1" /></Link>
                  </Button>
                )}
                <ResendReportLink slug={respondent.slug} />
                <AdminRegenerateButton slug={respondent.slug} />
              </div>
            </div>

            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl text-cream leading-tight tracking-tight max-w-3xl text-balance">
              Your operating shape, in one picture.
            </h1>

            {/* Tab bar */}
            <TabsPrimitive.List className="mt-10 -mb-px flex flex-wrap items-end gap-x-8 gap-y-2 border-b border-cream/10">
              {[
                { value: "overview", label: "Overview" },
                { value: "plan", label: "Moves" },
                { value: "report", label: "Report" },
                { value: "methodology", label: "Methodology" },
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
            slice={benchmarkSlice}
            slug={respondent.slug}
            level={respondent.level}
            hasDeepdive={data.hasDeepdive}
            isAnonymous={needsEmailGate}
          />
        </TabsPrimitive.Content>

        <TabsPrimitive.Content value="plan" className="focus-visible:outline-none">
          {(() => {
            const recs = report.recommendations;
            const moveIds = report.move_ids;
            const hasRecs = !!recs && Array.isArray(recs.moves) && recs.moves.length > 0;
            const hasMoveIds = Array.isArray(moveIds) && moveIds.length > 0;
            const hasPlan = Array.isArray(report.plan) && report.plan.length > 0;

            // Fully ready — render the new Moves tab.
            if (hasRecs && hasMoveIds) {
              return (
                <MovesTab
                  recommendations={recs!}
                  tier={report.overall_tier}
                  slug={respondent.slug}
                  level={respondent.level}
                  hasDeepdive={data.hasDeepdive}
                  isAnonymous={needsEmailGate}
                  respondentId={respondent.id}
                  isOwner={!!respondent.is_owner}
                />
              );
            }

            // Partial — recommendations exist on one side but not the other.
            // Do NOT silently fall back to the legacy plan; surface a clear
            // pending state so users (and we) can tell something is in-flight.
            if (hasRecs !== hasMoveIds) {
              return <MovesEmptyState tier={report.overall_tier} variant="partial" />;
            }

            // No recommendations at all — bridge to legacy plan if present.
            if (hasPlan) {
              return (
                <PlanTab
                  plan={report.plan}
                  outcomes={outcomes}
                  slug={respondent.slug}
                  level={respondent.level}
                  hasDeepdive={data.hasDeepdive}
                  isAnonymous={needsEmailGate}
                />
              );
            }

            // Nothing at all — selection engine still drafting.
            return <MovesEmptyState tier={report.overall_tier} />;
          })()}
        </TabsPrimitive.Content>

        <TabsPrimitive.Content value="report" className="focus-visible:outline-none">
          <ReportTab
            data={data}
            pillarValues={pillarValues}
            cohort={cohort ?? undefined}
            slice={benchmarkSlice}
          />
        </TabsPrimitive.Content>

        <TabsPrimitive.Content value="methodology" className="focus-visible:outline-none">
          <MethodologyTab report={report} />
        </TabsPrimitive.Content>

        <TabsPrimitive.Content value="invite" className="focus-visible:outline-none">
          <InviteTab respondentId={respondent.id} slug={respondent.slug} />
        </TabsPrimitive.Content>
      </TabsPrimitive.Root>

      <FounderBio />
      <SiteFooter />

      {/* AI assistant — only when we have Moves to ground on AND the user
          owns the report (signed in). Anonymous link viewers see no chat. */}
      {respondent.is_owner && report?.recommendations?.moves && report.recommendations.moves.length > 0 && (
        <ReportChatLauncher
          respondentId={respondent.id}
          hasDeepdive={data.hasDeepdive}
          enabled={true}
        />
      )}
    </div>
  );
}

// ─── Overview ─────────────────────────────────────────────────────────────
export function OverviewTab({
  report, pillarValues, cohort, slice, slug, level, hasDeepdive, isAnonymous,
}: {
  report: NonNullable<ReportData["report"]>;
  pillarValues: Record<number, number>;
  cohort?: Record<number, number>;
  slice: MatchedSlice | null;
  slug: string;
  level: string;
  hasDeepdive: boolean;
  isAnonymous: boolean;
}) {
  const [chartVariant, setChartVariant] = usePillarChartVariant();
  const readout = narrativeReadout(report, hasDeepdive);
  const recs = report.recommendations;
  const headline = recs?.headline_diagnosis ?? report.diagnosis;
  // Index the first selected Move per pillar so HotspotCards can show
  // the most relevant Move snippet inline.
  const movesByPillar = useMemo(() => {
    const map = new Map<number, RecommendationMove>();
    if (!recs) return map;
    for (const m of recs.moves) {
      if (!map.has(m.snapshot.pillar)) map.set(m.snapshot.pillar, m);
    }
    return map;
  }, [recs]);
  return (
    <>
    <section className="container max-w-6xl py-8 sm:py-20">
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

          <div className="mt-6 rounded-md border border-cream/10 bg-surface-1/45 p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-brass-bright">What this means</p>
            <div className="mt-4 space-y-3 text-sm leading-relaxed text-cream/70">
              <p>{readout.pattern}</p>
              <p>{readout.bottleneck}</p>
              <p>{readout.leverage}</p>
            </div>
            <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.2em] text-cream/45">
              Confidence · <span className="text-cream/70">{readout.confidence}</span>
            </p>
          </div>

          {(report.cap_flags?.length ?? 0) > 0 && (
            <div className="mt-8 rounded-sm border border-brass/25 bg-brass/10 px-4 py-3 text-sm text-cream/70 leading-relaxed">
              Your score has been adjusted where claims in one pillar were not yet supported by the foundations in another. Treat those areas as dependency risks, not failures.
            </div>
          )}

          {headline && (
            <blockquote className="mt-10 border-l-2 border-brass/60 pl-6">
              <p className="font-display italic text-2xl sm:text-3xl text-cream/90 leading-snug text-balance">
                "{headline}"
              </p>
            </blockquote>
          )}

          {/* Hotspots */}
          {report.hotspots.length > 0 && (
            <div className="mt-12 space-y-4">
              <p className="eyebrow text-cream/45">Three pillars to watch</p>
              <div className="grid grid-cols-1 gap-4">
                {report.hotspots.map((h) => {
                  const move = movesByPillar.get(h.pillar);
                  return (
                    <HotspotCard
                      key={h.pillar}
                      pillar={h.pillar as 1|2|3|4|5|6|7|8}
                      pillarLabel={h.name}
                      tier={h.tierLabel}
                      diagnosis={`Tier ${h.tier}. ${tierBlurb(h.tierLabel, h.name)}`}
                      moveTitle={move?.snapshot.title}
                      moveWhy={move?.personalised_why_matters || move?.snapshot.why_matters || undefined}
                      moveEffort={move?.snapshot.effort ?? null}
                      moveImpact={move?.snapshot.impact ?? null}
                      moveId={move?.move_id ?? null}
                      reportSlug={slug}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right — pillar chart */}
        <div className="lg:col-span-7">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow text-cream/45">Eight pillars</p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-cream/40">
                Tier 0–5 · {cohort ? "you vs cohort median" : "your scores"}
              </p>
            </div>
            <PillarChartVariantToggle value={chartVariant} onChange={setChartVariant} />
          </div>
          <div className="rounded-lg border border-cream/10 bg-surface-1/40 p-6 sm:p-8">
            <PillarBarChart values={pillarValues} cohort={cohort} labels={PILLAR_NAMES} variant={chartVariant} />
            {cohort && (
              <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 font-mono text-[10px] uppercase tracking-[0.18em] text-cream/45">
                <span className="inline-flex items-center gap-1.5">
                  <span aria-hidden className="inline-block h-2 w-3 rounded-sm bg-brass-bright" />
                  You
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span aria-hidden className="inline-block h-3 w-px bg-cream/70" />
                  Cohort median
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {!hasDeepdive && (
        <div className="mt-8 sm:mt-10 lg:mt-12">
          <DeepDiveUnlock slug={slug} level={level} variant="inline" isAnonymous={isAnonymous} />
        </div>
      )}

      {/* Cohort delta card — full width below the completion prompt.
          Spacing keeps the benchmark close while making Deep Dive the next action. */}
      <div className="mt-8 sm:mt-10 lg:mt-12">
        <BenchmarkSliceCard
          values={pillarValues}
          userScore={report.aioi_score}
          slice={report.benchmark_excluded ? { ...slice!, lockedReason: "This report is excluded from peer benchmarks because three or more consistency checks fired." } : slice}
        />
      </div>
    </section>
    {recs?.closing_cta && (
      <section className="container max-w-4xl pb-2 sm:pb-4">
        <div className="rounded-md border border-brass/30 bg-brass/8 px-5 sm:px-7 py-5 sm:py-6">
          <p className="eyebrow text-brass-bright/85 mb-2">Where to start</p>
          <p className="font-display text-xl sm:text-2xl text-cream leading-snug text-balance">
            {recs.closing_cta}
          </p>
        </div>
      </section>
    )}
    <ReportCta tier={report.overall_tier} />
    </>
  );
}

// ─── Plan ─────────────────────────────────────────────────────────────────
function PlanTab({
  plan, outcomes, slug, level, hasDeepdive, isAnonymous,
}: { plan: PlanMonth[]; outcomes: OutcomeRow[]; slug: string; level: string; hasDeepdive: boolean; isAnonymous: boolean }) {
  const outcomeMap = useMemo(() => new Map(outcomes.map((o) => [o.id, o])), [outcomes]);

  if (plan.length === 0) {
    return (
      <section className="container max-w-3xl py-20">
        <p className="font-display text-xl text-cream/70">
          No plan generated yet. Try refreshing. The engine may still be drafting it.
        </p>
      </section>
    );
  }

  // When the user hasn't done the deep dive, only the first month is shown
  // in the clear; months 2-3 are represented by a normal-flow locked panel.
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
            ? "Drawn from your hotspot pillars and the outcomes library. Each month picks one or two interventions to ship, sequenced so the foundations land first."
            : "Month 1 is unlocked from your scan. Months 2 and 3 need the Deep Dive to tighten the plan enough to commit to a sequence."}
        </p>
      </div>

      <div className="space-y-12">
        {visiblePlan.map((month) => (
          <PlanMonthArticle key={month.month} month={month} outcomeMap={outcomeMap} />
        ))}
      </div>

      {lockedPlan.length > 0 && (
        <LockedPlanContinuation
          lockedMonths={lockedPlan.map((month) => month.month)}
          slug={slug}
          level={level}
          isAnonymous={isAnonymous}
        />
      )}
    </section>
  );
}

function LockedPlanContinuation({
  lockedMonths, slug, level, isAnonymous,
}: { lockedMonths: number[]; slug: string; level: string; isAnonymous: boolean }) {
  return (
    <div className="mt-12 border-t border-cream/10 pt-8 sm:pt-10">
      <div className="rounded-lg border border-brass/30 bg-surface-1/55 p-5 sm:p-8 lg:p-10">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-sm border border-brass/35 bg-brass/10 text-brass-bright">
            <Lock className="h-4 w-4" />
          </span>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-brass-bright">
            Months {lockedMonths.join(" + ")} locked until Deep Dive
          </p>
        </div>
        <DeepDiveUnlock slug={slug} level={level} variant="inline" isAnonymous={isAnonymous} />
      </div>
    </div>
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

function MethodologyTab({ report }: { report: NonNullable<ReportData["report"]> }) {
  const capFlags = report.cap_flags ?? [];

  return (
    <section className="container max-w-5xl py-10 sm:py-20">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16">
        <div className="lg:col-span-5">
          <p className="eyebrow mb-5">Methodology</p>
          <h2 className="font-display text-4xl sm:text-5xl text-cream leading-[1.05] tracking-tight text-balance">
            How v1.1 keeps the score honest.
          </h2>
          <p className="mt-6 font-display text-lg text-cream/65 leading-relaxed">
            The instrument scores each pillar on a 0–5 maturity tier, then applies cross-pillar consistency checks where one capability depends on another.
          </p>
        </div>

        <div className="lg:col-span-7 space-y-8">
          <div className="rounded-md border border-cream/10 bg-surface-1/45 p-5 sm:p-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-brass-bright">Consistency checks</p>
            <ul className="mt-5 space-y-3 text-sm leading-relaxed text-cream/70">
              <li>Tooling is capped when data foundations are too weak to support it.</li>
              <li>Workflow maturity is capped by tooling and skills maturity.</li>
              <li>Measurement is capped when workflows are not embedded enough to measure.</li>
              <li>Governance and culture are capped when operating reality does not support the claimed tier.</li>
            </ul>
          </div>

          {capFlags.length > 0 && (
            <div className="rounded-md border border-brass/25 bg-brass/10 p-5 sm:p-6">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-brass-bright">Applied to this report</p>
              <ul className="mt-4 space-y-2 text-sm leading-relaxed text-cream/75">
                {capFlags.map((flag) => (
                  <li key={flag.code}>{flag.label}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-md border border-cream/10 bg-surface-1/45 p-5 sm:p-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-brass-bright">v1.1 · April 2026</p>
            <ul className="mt-5 space-y-3 text-sm leading-relaxed text-cream/70">
              <li>Added 9 questions covering agents, corpus, memory, prompting, and skills libraries.</li>
              <li>Retired duplicate Deep Dive questions so Quickscan answers carry forward.</li>
              <li>Populated rationale detail on live questions.</li>
              <li>Implemented cross-pillar consistency caps and benchmark exclusion rules.</li>
              <li>Migrated benchmarking from a 5-band to a 7-band company-size model.</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
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
  const readout = narrativeReadout(report, data.hasDeepdive);

  return (
    <section className="container max-w-5xl py-16 sm:py-20 print:py-0">
      <div className="flex items-center justify-between mb-6 print:hidden">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cream/40">
          Executive one-pager · Print or save as PDF
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

        <div className="mt-6 border border-walnut/15 rounded-sm p-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-walnut/55 mb-2">
            Board / leadership readout · {readout.confidence}
          </p>
          <p className="text-[12px] leading-snug text-walnut/75">
            {readout.pattern} {readout.bottleneck} {readout.leverage}
          </p>
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
  if (slice.lockedReason) {
    return (
      <div className="mt-8 border-t border-walnut/15 pt-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-walnut/55 mb-2">
          Versus the field
        </p>
        <p className="text-[12px] leading-snug text-walnut/65">{slice.lockedReason}</p>
      </div>
    );
  }

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
        title: `Invite list saved for ${list.length} ${list.length === 1 ? "person" : "people"}`,
        description: "Use the shareable link above for direct delivery while team aggregation is being prepared.",
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
            Saved for team follow-up; direct sharing uses the link above.
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
      const redirectTo = buildAuthCallbackUrl({ next: `/assess/r/${slug}`, email });
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
          title: "PDF ready · direct link below",
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
          <FileText className="h-3.5 w-3.5 mr-2" /> Email executive PDF
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-80 bg-surface-1 border-cream/15 text-cream"
      >
        <form onSubmit={submit} className="space-y-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cream/45">
              Executive PDF
            </p>
            <p className="mt-1.5 font-display text-sm text-cream/75 leading-snug">
              We'll generate a board-ready one-page PDF and send a private download link.
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

function sizeBandCode(raw: string | null | undefined): string | null {
  if (!raw) return null;
  if (/Early-stage|1[–-]50|Just me|2[–-]10|11[–-]50/i.test(raw)) return "S";
  if (/Early scale-up|51[–-]100/i.test(raw)) return "M1";
  if (/Mid scale-up|101[–-]200|51[–-]200/i.test(raw)) return "M2";
  if (/Late scale-up|201[–-]500|201[–-]600|51[–-]250/i.test(raw)) return "M3";
  if (/Growth|501[–-]1,000|501[–-]1000|251/i.test(raw)) return "L1";
  if (/Upper-mid-market|1,001[–-]2,000|1001[–-]2000|601[–-]2000/i.test(raw)) return "L2";
  if (/Enterprise|2,001\+|2001\+|2000\+|1,000\+|1000\+|1k\+/i.test(raw)) return "XL";
  return null;
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
