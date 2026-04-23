import { Download, FileText } from "lucide-react";

import { SiteFooter } from "@/components/aioi/SiteFooter";
import { SiteNav } from "@/components/aioi/SiteNav";
import { Button } from "@/components/ui/button";

const E2E_REPORT_PATH = "/e2e-production-deploy-summary.pdf";

export default function DeployReview() {
  return (
    <div className="min-h-screen bg-walnut text-cream">
      <SiteNav />
      <main className="container flex min-h-screen items-center pt-20 pb-16">
        <section className="w-full max-w-3xl">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-brass-bright">
            Production deploy review
          </p>
          <h1 className="mt-5 font-display text-5xl leading-none text-cream sm:text-7xl">
            E2E release evidence
          </h1>
          <p className="mt-6 max-w-2xl font-display text-lg leading-relaxed text-cream/70 sm:text-xl">
            Open the one-page regression summary before approving the production deploy.
          </p>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="rounded-sm bg-brass text-walnut hover:bg-brass-bright font-ui uppercase tracking-[0.16em]">
              <a href={E2E_REPORT_PATH} target="_blank" rel="noopener noreferrer">
                <FileText className="h-4 w-4" />
                View E2E PDF report
              </a>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-sm border-cream/15 bg-transparent text-cream hover:bg-cream/10 hover:text-cream font-ui uppercase tracking-[0.16em]">
              <a href={E2E_REPORT_PATH} download>
                <Download className="h-4 w-4" />
                Download PDF
              </a>
            </Button>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
