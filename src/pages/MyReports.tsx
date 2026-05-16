import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Loader2, FileText } from "lucide-react";
import { AssessChrome } from "@/components/aioi/AssessChrome";
import { Seo } from "@/components/aioi/Seo";
import { useAuthReady } from "@/hooks/use-auth-ready";
import { fetchMyResults, type ArchetypeResult } from "@/lib/archetype-storage";
import { getArchetype } from "@/lib/archetypes";
import { trackEvent } from "@/lib/analytics";

export default function MyReports() {
  const { user, ready } = useAuthReady();
  const navigate = useNavigate();
  const [results, setResults] = useState<ArchetypeResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      navigate("/signin");
      return;
    }
    trackEvent("my_reports_viewed");
    fetchMyResults()
      .then(setResults)
      .catch((err) => setError(err.message || "Failed to load results."))
      .finally(() => setLoading(false));
  }, [user, ready, navigate]);

  if (!ready || loading) {
    return (
      <AssessChrome ariaLabel="Loading your results">
        <Seo title="My Results | AIOI" path="/reports" noindex />
        <main className="container flex-1 flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-brass" />
        </main>
      </AssessChrome>
    );
  }

  if (error) {
    return (
      <AssessChrome ariaLabel="Error loading results">
        <Seo title="My Results | AIOI" path="/reports" noindex />
        <main className="container py-16 sm:py-24 w-full text-center">
          <h1 className="font-display text-2xl text-cream">Something went wrong.</h1>
          <p className="mt-4 font-display text-cream/60">{error}</p>
        </main>
      </AssessChrome>
    );
  }

  return (
    <AssessChrome ariaLabel="My results">
      <Seo title="My Results | AIOI" path="/reports" noindex />
      <main className="container py-12 sm:py-20 w-full">
        <div className="max-w-3xl mx-auto">
          <p className="eyebrow mb-4">My Results</p>
          <h1 className="font-display text-3xl sm:text-4xl text-cream mb-3">
            Your archetypes
          </h1>
          <p className="font-display text-cream/60 mb-10">
            Results from your past scans.
          </p>

          {results.length === 0 ? (
            <div className="rounded-sm border border-cream/10 bg-surface-0/30 p-8 text-center">
              <FileText className="h-8 w-8 text-cream/30 mx-auto mb-4" />
              <p className="font-display text-cream/70">No results yet.</p>
              <p className="font-display text-cream/50 text-sm mt-2">
                Take the scan to discover your AI Operating Archetype.
              </p>
              <Link
                to="/assess"
                className="mt-6 inline-flex items-center gap-2 rounded-sm bg-brass text-walnut hover:bg-brass-bright px-6 py-3 font-ui text-sm uppercase tracking-wider"
              >
                Start the scan <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {results.map((r) => {
                const archetype = getArchetype(r.archetype_index);
                return (
                  <Link
                    key={r.id}
                    to={`/assess/result?a=${r.archetype_index}`}
                    className="flex items-center justify-between rounded-sm border border-cream/10 bg-surface-0/30 p-5 hover:border-cream/20 transition-colors"
                  >
                    <div>
                      <p className={`font-display text-lg ${archetype.colour}`}>{archetype.name}</p>
                      <p className="font-display italic text-sm text-cream/55">{archetype.tagline}</p>
                      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cream/40 mt-2">
                        {r.level} · {new Date(r.created_at!).toLocaleDateString("en-GB")}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-cream/30" />
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </AssessChrome>
  );
}
