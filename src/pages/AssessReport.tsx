import { Link } from "react-router-dom";
import { AssessChrome } from "@/components/aioi/AssessChrome";
import { Seo } from "@/components/aioi/Seo";
import { seoRoutes } from "@/lib/seo";

export default function AssessReport() {
  return (
    <AssessChrome back={{ to: "/assess", label: "Assessment" }} ariaLabel="Legacy report">
      <Seo {...seoRoutes.report} />
      <main className="container py-16 sm:py-24 w-full text-center">
        <h1 className="font-display text-4xl sm:text-5xl text-cream">Reports have moved.</h1>
        <p className="mt-6 font-display text-lg text-cream/60 max-w-lg mx-auto">
          The AI Operating Index is now a 60-second archetype scan. Take it to get your AI Operating Archetype instantly.
        </p>
        <Link
          to="/assess"
          className="mt-10 inline-flex items-center gap-2 rounded-sm bg-brass text-walnut hover:bg-brass-bright px-6 py-3 font-ui text-sm uppercase tracking-wider"
        >
          Start the archetype scan
        </Link>
      </main>
    </AssessChrome>
  );
}
