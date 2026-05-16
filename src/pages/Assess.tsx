import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";

import { AssessChrome } from "@/components/aioi/AssessChrome";
import { Seo } from "@/components/aioi/Seo";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics";
import { seoRoutes } from "@/lib/seo";
import { saveScan } from "@/lib/quickscan";

type Level = "company" | "function" | "individual";

const LEVELS: Record<Level, { title: string; tagline: string }> = {
  company: {
    title: "Company",
    tagline: "How the whole organisation operates.",
  },
  function: {
    title: "Function",
    tagline: "A single team or department.",
  },
  individual: {
    title: "Individual",
    tagline: "Your personal operating model.",
  },
};

export default function Assess() {
  const navigate = useNavigate();
  const [level, setLevel] = useState<Level>("company");
  const [hovered, setHovered] = useState<Level | null>(null);

  const start = () => {
    trackEvent("assessment_level_selected", { level });
    saveScan({ level, answers: {} });
    navigate("/assess/scan");
  };

  return (
    <AssessChrome back={{ to: "/", label: "Home" }} ariaLabel="Choose assessment level">
      <Seo {...seoRoutes.landing} path="/assess" />
      <main className="container flex-1 flex items-center justify-center py-16 sm:py-24">
        <div className="w-full max-w-2xl mx-auto">
          <p className="eyebrow mb-4">Assessment</p>
          <h1 className="font-display text-3xl sm:text-4xl text-cream mb-3">
            Choose your level
          </h1>
          <p className="font-display text-cream/60 mb-10 max-w-lg">
            The archetype scan adapts to your context. Select the scope that best describes what you want to assess.
          </p>

          <div className="space-y-3">
            {(Object.keys(LEVELS) as Level[]).map((key) => {
              const active = level === key;
              const isHovered = hovered === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setLevel(key)}
                  onMouseEnter={() => setHovered(key)}
                  onMouseLeave={() => setHovered(null)}
                  className={`w-full text-left rounded-sm border px-6 py-5 transition-all duration-200 ${
                    active
                      ? "border-brass bg-brass/10"
                      : "border-cream/10 bg-surface-0/30 hover:border-cream/20"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`font-display text-lg ${active ? "text-brass-bright" : "text-cream"}`}>
                        {LEVELS[key].title}
                      </p>
                      <p className="font-display text-sm text-cream/55 mt-1">
                        {LEVELS[key].tagline}
                      </p>
                    </div>
                    <div
                      className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                        active ? "border-brass" : "border-cream/25"
                      }`}
                    >
                      {active && <div className="h-2.5 w-2.5 rounded-full bg-brass" />}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <Button
            onClick={start}
            size="lg"
            className="mt-10 h-14 rounded-sm bg-brass text-walnut hover:bg-brass-bright font-ui text-sm uppercase tracking-wider w-full sm:w-auto inline-flex items-center justify-center gap-2"
          >
            Start the scan <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </main>
    </AssessChrome>
  );
}
