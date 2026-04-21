

## Add a proper sign-in & "My reports" experience, lock down PDF storage

Right now the only way to authenticate is to start a new assessment — the magic link is sent as a side-effect of the qualifier email step. There's no Sign-in button, no way back to past reports, and PDFs in the `report-pdfs` bucket are readable by anyone with the URL. This plan fixes all three.

---

### 1. Add a real sign-in entry point

**Site nav (`SiteNav.tsx`)**
- Add a "Sign in" link (desktop + mobile sheet) that:
  - When signed-out → routes to `/signin`
  - When signed-in → shows the user's email (truncated) as a dropdown with "My reports" and "Sign out"
- Reactive to `supabase.auth.onAuthStateChange` so it updates instantly on magic-link return.

**New page `/signin` (`src/pages/SignIn.tsx`)**
- Single email field + "Send sign-in link" button (reuses `sendMagicLink` from `src/lib/sync.ts`).
- Honest copy: "We'll email you a one-time link. No passwords."
- Optional `?next=/path` query param honoured by the existing `/auth/callback` flow.
- Zod validation, rate-limit-friendly UX (disable for 30s after send, show "Resend" affordance).
- If already signed-in, redirect straight to `/reports`.

**`AuthCallback.tsx`** — already handles `?next`. Small tweak: if there's no draft AND no `next`, send the user to `/reports` (today it sends them to `/`).

---

### 2. New "My reports" page (`/reports`)

`src/pages/MyReports.tsx`
- Auth-gated: if no session, redirect to `/signin?next=/reports`.
- Lists every respondent for the signed-in user (RLS already scopes this), most recent first:
  - Level (Company / Function / Individual) + function/region badges
  - Submitted date, AIOI score + tier badge (from joined `reports`)
  - "In progress" pill if `submitted_at` is null
  - Primary action → `/assess/r/<slug>` (View report)
  - Secondary action → "Resume" for in-progress respondents (jumps back into `/assess/q/<n>`)
- Empty state: short copy + CTA to `/assess`.
- Sign-out button in the page header.

No new tables or columns — uses existing `respondents` + `reports` rows the user already owns.

---

### 3. Lock down report PDF storage (security fix)

Today: bucket `report-pdfs` is public; the SELECT policy lets any anon with the URL fetch any PDF. Slugs are 12 hex chars — guessable enough that this counts as a leak surface.

New approach (single new migration):
1. Flip the bucket to **private** (`UPDATE storage.buckets SET public = false WHERE id = 'report-pdfs'`).
2. Drop the public SELECT policy. PDFs are no longer reachable by URL.
3. Add a security-definer RPC `get_report_pdf_url(_slug text)` that:
   - Looks up the respondent by slug.
   - Verifies `auth.uid() = respondent.user_id` (i.e. the report belongs to the caller).
   - Returns a fresh signed URL (60 min TTL) for the stored `pdf_path`, generated server-side via the storage admin API… **or, simpler and equivalent**: returns the `pdf_path`, and the client calls `supabase.storage.from('report-pdfs').createSignedUrl(path, 3600)` while signed-in. We add a storage RLS SELECT policy that only allows signed-URL creation for objects whose path matches a respondent owned by the caller (lookup via `is_my_respondent`).
4. `AssessReport.tsx` and the email-PDF flow switch from public URLs to signed URLs.

Result: a PDF can only be fetched by the report owner (or via a signed URL Deepgrain mints in the email — which is already short-lived).

---

### 4. Tighten DB RLS gaps surfaced by the audit

While we're here, three small hardenings:
- `events` — currently allows `anon` inserts with `user_id = NULL`. Keep that (we need anonymous funnel telemetry) but add a length cap on `name` and a JSON size guard via a `BEFORE INSERT` trigger to prevent log-stuffing.
- `respondents` — add a CHECK that `user_id IS NOT NULL` on **new** rows by amending the INSERT policy `WITH CHECK` to `(user_id = auth.uid() AND user_id IS NOT NULL)`. Belt-and-braces against null-uid abuse.
- `reports` — already good (own-respondent only via `is_my_respondent`), no change.

---

### Files touched

- **New**: `src/pages/SignIn.tsx`, `src/pages/MyReports.tsx`
- **Edit**: `src/components/aioi/SiteNav.tsx` (auth-aware nav), `src/App.tsx` (routes for `/signin`, `/reports`), `src/pages/AuthCallback.tsx` (default redirect → `/reports`), `src/pages/AssessReport.tsx` (use signed URL for PDF download)
- **Edit edge fn**: `supabase/functions/email-report-pdf/index.ts` (mint signed URL instead of public URL when emailing)
- **New migration**: bucket → private, replace storage policies with owner-scoped, tighten respondents INSERT, add events guard trigger.

### Out of scope (call out so you can confirm)

- No password auth or social providers — magic-link only, matching the current product tone.
- No admin role or "share report with someone else" flow — the existing `/assess/r/<slug>` public view already covers shareable links; we're only securing the PDF asset.

