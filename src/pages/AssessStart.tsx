import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { ArrowRight, Check, Loader2 } from "lucide-react";

import { AssessChrome } from "@/components/aioi/AssessChrome";
import { OptionCard } from "@/components/aioi/OptionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { FUNCTIONS, LEVELS, REGIONS, loadDraft, saveDraft, type BusinessFunction, type Region } from "@/lib/assessment";
import { sendMagicLink, SyncError } from "@/lib/sync";

const ROLE_OPTIONS = [
  "Founder / CEO",
  "Function lead",
  "Senior IC / Operator",
  "Consultant / Advisor",
  "Other",
];

const SIZE_OPTIONS = [
  "Just me",
  "2–10 people",
  "11–50 people",
  "51–250 people",
  "251–1,000 people",
  "1,000+ people",
];

const PAIN_OPTIONS = [
  "We're behind and we know it.",
  "We're spending without a clear picture.",
  "We've piloted; nothing has stuck.",
  "We're integrated but plateauing.",
  "We're benchmarking against peers.",
];

const emailSchema = z.object({
  email: z.string().trim().email("That doesn't look like a valid email").max(255),
  consentBenchmark: z.literal(true, { errorMap: () => ({ message: "Required to receive your report" }) }),
  consentMarketing: z.boolean().optional(),
});

type Screen = "role" | "size" | "pain" | "region" | "function" | "email";
const SCREENS: Screen[] = ["role", "size", "pain", "region", "function", "email"];

export default function AssessStart() {
  const navigate = useNavigate();
  const [screen, setScreen] = useState<Screen>("role");
  const [draft, setDraft] = useState(() => loadDraft());

  // Guard: must have a level chosen
  useEffect(() => {
    if (!draft.level) navigate("/assess", { replace: true });
  }, [draft.level, navigate]);

  const stepIndex = SCREENS.indexOf(screen);

  const update = (patch: Partial<NonNullable<typeof draft.qualifier>>) => {
    const next = { ...draft, qualifier: { ...(draft.qualifier ?? {}), ...patch } };
    setDraft(next);
    saveDraft(next);
  };

  const advance = (from: Screen) => {
    const idx = SCREENS.indexOf(from);
    if (idx < SCREENS.length - 1) setScreen(SCREENS[idx + 1]);
  };

  const levelMeta = draft.level ? LEVELS[draft.level] : null;

  return (
    <AssessChrome
      step={stepIndex + 1}
      total={SCREENS.length}
      back={{ to: stepIndex === 0 ? "/assess" : "#", label: stepIndex === 0 ? "Levels" : "Back" }}
      ariaLabel="Qualifier"
    >
      <main className="container max-w-2xl w-full py-16 sm:py-20 flex flex-col">
        {levelMeta && (
          <p className="eyebrow mb-6 animate-fade-in">
            {levelMeta.title} · About you
          </p>
        )}

        {screen === "role" && (
          <Step
            key="role"
            heading={<>What's your <span className="italic text-brass-bright">role?</span></>}
            sub="So we can frame the report for the right reader."
          >
            <div className="space-y-3">
              {ROLE_OPTIONS.map((opt, i) => (
                <OptionCard
                  key={opt}
                  index={i + 1}
                  title={opt}
                  selected={draft.qualifier?.role === opt}
                  onClick={() => {
                    update({ role: opt });
                    setTimeout(() => advance("role"), 180);
                  }}
                />
              ))}
            </div>
          </Step>
        )}

        {screen === "size" && (
          <Step
            key="size"
            heading={<>How big is the <span className="italic text-brass-bright">function?</span></>}
            sub="Headcount is the single best predictor of which interventions land."
          >
            <div className="space-y-3">
              {SIZE_OPTIONS.map((opt, i) => (
                <OptionCard
                  key={opt}
                  index={i + 1}
                  title={opt}
                  selected={draft.qualifier?.size === opt}
                  onClick={() => {
                    update({ size: opt });
                    setTimeout(() => advance("size"), 180);
                  }}
                />
              ))}
            </div>
          </Step>
        )}

        {screen === "pain" && (
          <Step
            key="pain"
            heading={<>What brought you <span className="italic text-brass-bright">here?</span></>}
            sub="Pick the closest. We won't hold you to it."
          >
            <div className="space-y-3">
              {PAIN_OPTIONS.map((opt, i) => (
                <OptionCard
                  key={opt}
                  index={i + 1}
                  title={opt}
                  selected={draft.qualifier?.pain === opt}
                  onClick={() => {
                    update({ pain: opt });
                    setTimeout(() => advance("pain"), 180);
                  }}
                />
              ))}
            </div>
          </Step>
        )}

        {screen === "region" && (
          <Step
            key="region"
            heading={<>Where in the world are you <span className="italic text-brass-bright">based?</span></>}
            sub="So we can place you on the regional benchmark — adoption looks very different across geographies."
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {REGIONS.map((opt, i) => (
                <OptionCard
                  key={opt}
                  index={i + 1}
                  title={opt}
                  selected={draft.qualifier?.region === opt}
                  onClick={() => {
                    update({ region: opt as Region });
                    setTimeout(() => advance("region"), 180);
                  }}
                />
              ))}
            </div>
          </Step>
        )}

        {screen === "function" && draft.level === "function" && (
          <Step
            key="function"
            heading={<>Which <span className="italic text-brass-bright">function</span> are you scoring?</>}
            sub="So the questions feel written for you, not for someone else."
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {FUNCTIONS.map((f, i) => (
                <OptionCard
                  key={f.id}
                  index={i + 1}
                  title={f.title}
                  description={f.tagline}
                  selected={draft.qualifier?.function === f.id}
                  onClick={() => {
                    update({ function: f.id as BusinessFunction });
                    setTimeout(() => advance("function"), 180);
                  }}
                />
              ))}
            </div>
          </Step>
        )}

        {screen === "function" && draft.level !== "function" && (
          <AutoSkip onSkip={() => advance("function")} />
        )}

        {screen === "email" && (
          <EmailScreen
            initial={draft.qualifier}
            magicLinkSent={!!draft.magicLinkSent}
            onSubmit={async (values) => {
              update(values);
              const latest = { ...draft, qualifier: { ...(draft.qualifier ?? {}), ...values } };
              try {
                await sendMagicLink(values.email, `${window.location.origin}/auth/callback`);
                saveDraft({ ...latest, magicLinkSent: true });
              } catch (err) {
                console.warn("[magic-link] initial send failed", err);
              }
              navigate("/assess/q/1");
            }}
          />
        )}

        <ProgressDots index={stepIndex} total={SCREENS.length} onJump={(i) => {
          // Allow jumping back only
          if (i <= stepIndex) setScreen(SCREENS[i]);
        }} />
      </main>
    </AssessChrome>
  );
}

function Step({ heading, sub, children }: { heading: React.ReactNode; sub?: string; children: React.ReactNode }) {
  return (
    <section className="animate-fade-up">
      <h1 className="font-display text-4xl sm:text-5xl text-cream leading-[1.05] tracking-tight text-balance">
        {heading}
      </h1>
      {sub && <p className="mt-4 font-display text-lg text-cream/55 max-w-lg">{sub}</p>}
      <div className="mt-10">{children}</div>
    </section>
  );
}

function ProgressDots({ index, total, onJump }: { index: number; total: number; onJump: (i: number) => void }) {
  return (
    <div className="mt-12 flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <button
          key={i}
          onClick={() => onJump(i)}
          aria-label={`Go to step ${i + 1}`}
          className={`h-1 rounded-full transition-all ${
            i === index ? "w-10 bg-brass" : i < index ? "w-6 bg-cream/40 hover:bg-cream/60" : "w-6 bg-cream/10"
          }`}
        />
      ))}
    </div>
  );
}

function EmailScreen({
  initial,
  magicLinkSent,
  onSubmit,
}: {
  initial?: { email?: string; consentBenchmark?: boolean; consentMarketing?: boolean };
  magicLinkSent?: boolean;
  onSubmit: (v: { email: string; consentBenchmark: boolean; consentMarketing: boolean }) => Promise<void> | void;
}) {
  const [email, setEmail] = useState(initial?.email ?? "");
  const [consentBenchmark, setBench] = useState(!!initial?.consentBenchmark);
  const [consentMarketing, setMkt] = useState(!!initial?.consentMarketing);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const result = emailSchema.safeParse({ email, consentBenchmark, consentMarketing });
    if (!result.success) {
      const first = result.error.issues[0];
      setError(first?.message ?? "Please check the form");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({ email, consentBenchmark: true, consentMarketing });
    } catch (err) {
      setError(err instanceof SyncError ? err.message : "Could not send your magic link.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Step
      heading={<>Where should the <span className="italic text-brass-bright">report land?</span></>}
      sub="One email. We'll send a magic link right now so you can sign in while you answer — your results page is waiting on the other side."
    >
      <form onSubmit={handle} className="space-y-6 max-w-lg">
        <div>
          <Label htmlFor="email" className="text-cream/70 font-ui text-xs uppercase tracking-[0.16em]">Email</Label>
          <Input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            maxLength={255}
            className="mt-2 h-12 bg-surface-1/60 border-cream/15 text-cream placeholder:text-cream/30 font-display text-lg focus-visible:ring-brass"
          />
        </div>

        <div className="space-y-4 pt-2">
          <Consent
            id="consent-benchmark"
            checked={consentBenchmark}
            onChange={setBench}
            label="Use my anonymised answers in the live AIOI benchmark."
            required
          />
          <Consent
            id="consent-marketing"
            checked={consentMarketing}
            onChange={setMkt}
            label="Send me Deepgrain's occasional notes — no more than once a fortnight."
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-pillar-7 font-ui">{error}</p>
        )}

        {magicLinkSent && (
          <p className="text-xs text-cream/55 font-mono uppercase tracking-[0.16em]">
            ✓ Magic link already sent to {initial?.email}. Submitting will refresh it.
          </p>
        )}

        <div className="pt-4 flex items-center gap-4">
          <Button
            type="submit"
            size="lg"
            disabled={submitting}
            className="h-12 px-7 rounded-sm bg-brass text-walnut hover:bg-brass-bright font-ui text-sm tracking-wider uppercase disabled:opacity-60"
          >
            {submitting ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending link…</>) : (<>Send link & begin <ArrowRight className="ml-1 h-4 w-4" /></>)}
          </Button>
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-cream/40">
            ~18 min · sign in while you answer
          </span>
        </div>
      </form>
    </Step>
  );
}

function Consent({
  id, checked, onChange, label, required,
}: {
  id: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  required?: boolean;
}) {
  return (
    <label htmlFor={id} className="flex items-start gap-3 cursor-pointer group">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(v) => onChange(!!v)}
        className="mt-0.5 border-cream/30 data-[state=checked]:bg-brass data-[state=checked]:border-brass data-[state=checked]:text-walnut"
      />
      <span className="text-sm text-cream/70 leading-relaxed group-hover:text-cream/90">
        {label}
        {required && <span className="text-brass-bright/80 ml-1">*</span>}
      </span>
    </label>
  );
}

function AutoSkip({ onSkip }: { onSkip: () => void }) {
  useEffect(() => { onSkip(); }, [onSkip]);
  return null;
}
