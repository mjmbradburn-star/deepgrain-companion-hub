## Why your survey email didn't send

There is no code path that actually sends an email when someone submits the archetype result form. `src/pages/AssessResult.tsx` (`handleEmailSubmit`) only writes the address to `localStorage` with a comment: *"in production this would trigger a signup + email"*. The transactional infra is healthy — the most recent sent emails in `email_send_log` are auth flows (signup / magic-link) up to early May — but nothing calls `send-transactional-email` from the archetype flow.

That is the first thing we fix. Then we refresh every template to the new site language.

---

## What we'll build

### 1. Wire the archetype "Send my report" flow (save + email)

In `AssessResult.handleEmailSubmit`:

1. Call `supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true, emailRedirectTo: <origin>/auth/callback?next=/assess/result?a=<idx> }})` so the user gets a magic-link / signup link and lands back on their saved result.
2. In parallel, call `supabase.functions.invoke('send-transactional-email', { body: { templateName: 'archetype-result', recipientEmail: email, idempotencyKey: \`archetype-{idx}-{email}, templateData: { archetypeName, archetypeIndex, tagline, summary, strengths, watchouts, level, resultUrl } }})` to deliver the styled archetype summary immediately.
3. Replace the silent `localStorage` stub with real loading/error/success states (we already render them — just hook them to the real promises).

### 2. Refactor `send-transactional-email`

- Change `SITE_NAME` from the project slug `"deepgrain-companion-hub"` to `**"AI Operating Index"**` so the From header reads `AI Operating Index <noreply@notify.www.deepgrain.ai>`.
- No other logic changes — the function already enqueues correctly.
- Allow anon callers: today it 401s unless the caller presents `SUPABASE_SERVICE_ROLE_KEY`. We'll keep that path (for server-to-server use from `email-report-pdf`) but **also accept the public anon key**, since the archetype send is client-triggered and there is no PII risk beyond the recipient's own address (rate-limited per-email by the existing idempotency + suppression checks).

### 3. New transactional template — `archetype-result.tsx`

Editorial card matching the Hero / AssessReport visual language:

- Masthead row: `DEEPGRAIN · AIOI` left, `VOLUME I · MMXXVI` right, JetBrains Mono uppercase, brass hairline under.
- Eyebrow: `ISSUE 01 · ARCHETYPE`
- Display headline (Cormorant Garamond, light, brass italic accent): *"You are"* / **The Architect**.
- Brass underline draw motif → static `<Hr>` 1px brass, 96px wide, left-aligned.
- Tagline + 2-paragraph diagnosis in body Inter.
- Two muted side-by-side panels: *Strengths* / *Where you'll feel friction*, brass labels.
- Primary button (deep phthalo `hsl(152 60% 10%)` on cream, 2px radius, 0.18em tracked uppercase Inter): "Open your full result" → `resultUrl`.
- Footer hairline + `aioi.deepgrain.ai · Lite report · 3-question archetype scan`.

### 4. Rewrite the six auth templates in the same editorial language

Files in `supabase/functions/_shared/email-templates/`:


| File                   | New copy direction                                                                                            |
| ---------------------- | ------------------------------------------------------------------------------------------------------------- |
| `signup.tsx`           | "Confirm your address to save your archetype." Masthead, brass hairline, primary button "Confirm & continue". |
| `magic-link.tsx`       | "Your secure sign-in link." Mentions archetype + saved results.                                               |
| `recovery.tsx`         | "Reset your password" — minimal, on-brand.                                                                    |
| `invite.tsx`           | "You've been invited to Deepgrain · AIOI." Lightweight restyle only.                                          |
| `email-change.tsx`     | "Confirm your new email." Lightweight restyle only.                                                           |
| `reauthentication.tsx` | "Confirm reauthentication" — keeps OTP code block (brass border, JetBrains Mono numerals).                    |


All six share a single internal style sheet (defined at the bottom of each file) so the typography, colours, button shape, masthead rule and footer treatment are identical to the transactional templates.

### 5. Update the auth-email-hook subject lines

In `supabase/functions/auth-email-hook/index.ts`, replace `EMAIL_SUBJECTS` so they match the new tone:

- `signup`: "Confirm your AI Archetype result"
- `magiclink`: "Your sign-in link · AI Operating Index"
- `recovery`: "Reset your AIOI password"
- `invite`: "You've been invited to AIOI"
- `email_change`: "Confirm your new email"
- `reauthentication`: "Your verification code"

Also align `SITE_NAME` in the hook with the transactional function (already `"AI Operating Index"`, no change).

### 6. Add `archetype-result` to the template registry

Add to `supabase/functions/_shared/transactional-email-templates/registry.ts`:

```ts
import { template as archetypeResult } from './archetype-result.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'report-pdf-ready': reportPdfReady,
  'archetype-result': archetypeResult,
}
```

Also refresh `report-pdf-ready.tsx` to use the same masthead + hairline + Cormorant headline + brass button system so all three transactional surfaces (PDF email, archetype email, and any future receipt) feel like one publication.

### 7. Deploy + verify

- `deploy_edge_functions(["send-transactional-email", "auth-email-hook"])`
- Send a test from the archetype result page on the preview URL.
- Tail `email_send_log` for the new `archetype-result` row → `pending` → `sent`.

---

## Visual system (single source of truth for all templates)

```text
Background      #ffffff   (email-body requirement)
Inner surface   #F5EFE0   (warm cream paper, our --walnut)
Ink             hsl(152 60% 9%)   deep phthalo, headlines + body
Muted ink       hsl(152 20% 28%)
Brass accent    hsl(32 60% 36%)   links, eyebrow, 1px rule, OTP frame
Hairline        hsl(152 30% 14% / 0.14)
Display font    'Cormorant Garamond', 'Times New Roman', serif — weight 500, italic accent
Body font       'Inter', system-ui, sans-serif
Mono            'JetBrains Mono', ui-monospace, monospace   (masthead + eyebrow + OTP)
Eyebrow         11px / uppercase / tracking 0.18em / brass
Button          h-12, radius 2px, cream text on phthalo, uppercase 12px, tracking 0.18em
```

## What we are NOT changing

- pgmq queue, RPC wrappers, cron job, suppression list, unsubscribe handler — all healthy.
- DNS / sender domain (`notify.www.deepgrain.ai`).
- The PDF generation in `email-report-pdf` itself (only the email shell around it).

## Open question (will pick a sensible default if you don't reply)

You ticked both "keep all six auth templates" and "only signup + magic-link + recovery". Default assumption: **keep all six files** so nothing breaks if Supabase ever fires one, but only invest deep copy work in signup / magic-link / recovery — the other three get a light visual pass to match. Tell me if you want the inactive three deleted instead.

&nbsp;

okay, specifically there is a new table for you to look at. I've got some updates from the terminal. Go there and utilize that, but of course make these sexy little changes that you came up with as well. Think about exactly how to do it and go from there In Lovable Email Creator: Point it at the email_captures table. When someone submits their email on the result page, it appears there with sent = false. Your email system can poll that table and send the PDF. 