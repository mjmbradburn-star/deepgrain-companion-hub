// Friendly inline sign-in CTA shown to anonymous viewers of a shared
// report link, in place of the floating "Ask your report" launcher.
//
// Why this exists:
//   - The chat panel only works for the report's owner (RLS gates the
//     report context and quota tracking by `auth.uid()`).
//   - Anonymous viewers used to either see nothing, or click a Move's
//     "Discuss" button and have it silently do nothing / fire a toast.
//   - This component replaces that experience with a clear, persistent
//     card that explains the value and links straight to /signin with
//     the slug pre-loaded so they land back on this exact report after
//     authenticating.
//
// Pinned bottom-right at the same screen position the launcher would
// occupy, so users see it in the same place across signed-in/out states.

import { LogIn, Sparkles } from "lucide-react";
import { persistAuthCallbackContext } from "@/lib/auth-callback-url";

export interface ReportChatGuestCtaProps {
  slug: string;
}

export function ReportChatGuestCta({ slug }: ReportChatGuestCtaProps) {
  const reportPath = `/assess/r/${slug}`;
  // Persist the claim context so AuthCallback knows to claim this slug
  // for the user once they finish signing in.
  const onSignIn = () => {
    persistAuthCallbackContext({
      next: reportPath,
      claim: slug,
      consentMarketing: false,
    });
  };

  // /signin reads ?next=…&claim=… as well, so the sessionStorage write
  // is belt-and-braces for cases where the URL is rewritten.
  const signInHref = `/signin?next=${encodeURIComponent(reportPath)}&claim=${encodeURIComponent(slug)}`;

  return (
    <aside
      aria-label="Sign in to chat with your report"
      className="fixed bottom-5 right-5 z-40 max-w-[19rem] rounded-md border border-brass/40 bg-surface-1/95 backdrop-blur px-4 py-3.5 shadow-lg shadow-black/40"
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brass/15 text-brass-bright"
        >
          <Sparkles className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0">
          <p className="font-display text-sm text-cream leading-snug">
            Want to talk this report through?
          </p>
          <p className="mt-1 font-ui text-[12px] text-cream/60 leading-snug">
            Sign in to ask the AI assistant for clear next steps based on your scores.
          </p>
          <a
            href={signInHref}
            onClick={onSignIn}
            className="mt-3 inline-flex items-center gap-1.5 rounded-sm bg-brass px-3 py-1.5 font-ui text-[11px] uppercase tracking-[0.16em] text-ink hover:bg-brass-bright transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-bright focus-visible:ring-offset-2 focus-visible:ring-offset-surface-0"
          >
            <LogIn className="h-3 w-3" />
            Sign in to chat
          </a>
        </div>
      </div>
    </aside>
  );
}
