import { useEffect, useState } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";

const CONSENT_KEY = "aioi_cookie_consent_v1";

type ConsentChoice = "accepted" | "essential";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      setVisible(!localStorage.getItem(CONSENT_KEY));
    } catch {
      setVisible(false);
    }
  }, []);

  const saveChoice = (choice: ConsentChoice) => {
    try {
      localStorage.setItem(
        CONSENT_KEY,
        JSON.stringify({ choice, updatedAt: new Date().toISOString() }),
      );
    } catch {
      /* ignore private browsing storage failures */
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <section
      aria-label="Cookie notice"
      className="fixed inset-x-3 bottom-3 z-[70] mx-auto max-w-5xl rounded-sm border border-cream/15 bg-surface-0/95 p-4 text-cream shadow-2xl shadow-green/10 backdrop-blur-md sm:inset-x-6 sm:bottom-6 sm:p-5"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="max-w-3xl">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-brass/90">Privacy controls</p>
          <p className="mt-2 font-display text-lg leading-snug text-cream">
            We use essential storage to run the assessment and, with consent, analytics cookies to improve AIOI.
          </p>
          <a href="/privacy" className="mt-2 inline-flex font-ui text-xs text-cream/60 underline-offset-4 hover:text-brass hover:underline">
            Read the privacy policy
          </a>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row md:items-center">
          <Button
            type="button"
            variant="outline"
            onClick={() => saveChoice("essential")}
            className="h-11 rounded-sm border-cream/20 bg-transparent px-4 font-ui text-xs uppercase tracking-[0.16em] text-cream hover:bg-cream/5 hover:text-cream"
          >
            Essential only
          </Button>
          <Button
            type="button"
            onClick={() => saveChoice("accepted")}
            className="h-11 rounded-sm bg-brass px-4 font-ui text-xs uppercase tracking-[0.16em] text-walnut hover:bg-brass-bright"
          >
            Accept all
          </Button>
          <button
            type="button"
            aria-label="Dismiss cookie notice"
            onClick={() => saveChoice("essential")}
            className="absolute right-2 top-2 inline-flex h-9 w-9 items-center justify-center text-cream/45 hover:text-cream md:static"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}