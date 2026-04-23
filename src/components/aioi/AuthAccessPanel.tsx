import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

type Provider = "google" | "apple";

export function AuthAccessPanel({
  onProvider,
  providerLoading = null,
  disabled = false,
  compact = false,
  children,
}: {
  onProvider: (provider: Provider) => void;
  providerLoading?: Provider | null;
  disabled?: boolean;
  compact?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className={compact ? "space-y-4" : "space-y-5"}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Button
          type="button"
          onClick={() => onProvider("google")}
          disabled={disabled}
          className="h-12 w-full rounded-sm bg-brass px-6 font-ui text-xs uppercase tracking-[0.18em] text-walnut hover:bg-brass-bright disabled:opacity-60"
        >
          {providerLoading === "google" ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Connecting…</> : "Continue with Google"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => onProvider("apple")}
          disabled={disabled}
          className="h-12 w-full rounded-sm border-cream/20 bg-transparent px-6 font-ui text-xs uppercase tracking-[0.18em] text-cream hover:bg-cream/5 hover:text-cream disabled:opacity-60"
        >
          {providerLoading === "apple" ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Connecting…</> : "Continue with Apple"}
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-cream/10" />
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-cream/35">email backup</span>
        <div className="h-px flex-1 bg-cream/10" />
      </div>

      {children}
    </div>
  );
}