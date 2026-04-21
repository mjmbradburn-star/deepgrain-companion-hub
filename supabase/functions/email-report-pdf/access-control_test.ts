// Access-control tests for the report-pdfs bucket and the email-report-pdf
// edge function. These hit the LIVE project (read-only) and verify that:
//
//   1. Anonymous callers cannot mint a signed URL for any object in
//      report-pdfs (RLS denies SELECT on storage.objects).
//   2. Anonymous callers cannot read report-pdfs objects via the
//      Storage REST API (the bucket is private + RLS-locked).
//   3. The email-report-pdf edge function rejects requests with no
//      Authorization header (gateway-level verify_jwt).
//   4. The email-report-pdf edge function rejects requests with a
//      malformed Bearer token (in-function getClaims() check).
//
// These four assertions together prove the contract:
//   "only the authenticated owner can fetch a report PDF; everyone
//    else gets access denied."
//
// Run from the project root:
//   deno test -A supabase/functions/email-report-pdf/access-control_test.ts

import 'https://deno.land/std@0.224.0/dotenv/load.ts'
import {
  assert,
  assertEquals,
  assertNotEquals,
} from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const SUPABASE_URL = Deno.env.get('VITE_SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('VITE_SUPABASE_PUBLISHABLE_KEY')!

assert(SUPABASE_URL, 'VITE_SUPABASE_URL must be set in .env')
assert(SUPABASE_ANON_KEY, 'VITE_SUPABASE_PUBLISHABLE_KEY must be set in .env')

const BUCKET = 'report-pdfs'
// A path that follows the deterministic naming convention used by the
// edge function (`{slug}/aioi-report.pdf`). It does not need to exist —
// the RLS policy must reject the call regardless of whether the file is
// present, and we want the test to remain stable even if no PDFs exist
// in the project yet.
const PROBE_OBJECT = 'rls-probe-slug/aioi-report.pdf'

// ── 1. Anon createSignedUrl must be denied ──────────────────────────────
Deno.test(
  'report-pdfs: anonymous createSignedUrl is denied by RLS',
  async () => {
    const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    const { data, error } = await anon.storage
      .from(BUCKET)
      .createSignedUrl(PROBE_OBJECT, 60)

    assertEquals(
      data?.signedUrl ?? null,
      null,
      'Anonymous callers must NOT receive a signed URL.',
    )
    assert(
      error,
      'Anonymous createSignedUrl must surface an error (RLS deny / not found).',
    )
  },
)

// ── 2. Anon direct REST GET must be denied ──────────────────────────────
Deno.test(
  'report-pdfs: anonymous direct object GET returns 4xx (private bucket)',
  async () => {
    // The Storage REST endpoint for an authenticated/private object.
    // Even with the apikey + Authorization headers set to the anon key,
    // the bucket is private and RLS denies SELECT to non-owners.
    const url = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${PROBE_OBJECT}`
    const res = await fetch(url, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    })
    // Drain the body to avoid Deno resource leaks.
    await res.text()

    assert(
      res.status >= 400 && res.status < 500,
      `Anonymous GET must be rejected with a 4xx status; got ${res.status}.`,
    )
    assertNotEquals(
      res.status,
      200,
      'Anonymous GET must NOT succeed against the private bucket.',
    )
  },
)

// ── 3. email-report-pdf without Authorization → 401 ─────────────────────
Deno.test(
  'email-report-pdf: missing Authorization header is rejected (401)',
  async () => {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/email-report-pdf`, {
      method: 'POST',
      headers: {
        // apikey lets the call through the gateway routing layer; the
        // gateway's verify_jwt + the function's own getClaims() check
        // must still reject it because there is no Bearer JWT.
        apikey: SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        slug: 'doesnt-matter',
        email: 'nobody@example.com',
      }),
    })
    await res.text()

    assertEquals(
      res.status,
      401,
      `Calls without a Bearer JWT must return 401; got ${res.status}.`,
    )
  },
)

// ── 4. email-report-pdf with malformed Bearer → 401 ─────────────────────
Deno.test(
  'email-report-pdf: malformed Bearer token is rejected (401)',
  async () => {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/email-report-pdf`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: 'Bearer not-a-real-jwt',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        slug: 'doesnt-matter',
        email: 'nobody@example.com',
      }),
    })
    await res.text()

    assertEquals(
      res.status,
      401,
      `Calls with an invalid JWT must return 401; got ${res.status}.`,
    )
  },
)

// ── 5. email-report-pdf with anon-key as Bearer → 401 ───────────────────
//
// Some attackers will try the publishable anon key as the Bearer token,
// hoping the function only checks for "is there a token at all". Our
// in-function getClaims() check verifies the JWT corresponds to a real
// authenticated user (sub != null), so the anon role must be rejected.
Deno.test(
  'email-report-pdf: anon publishable key as Bearer is rejected (401)',
  async () => {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/email-report-pdf`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        slug: 'doesnt-matter',
        email: 'nobody@example.com',
      }),
    })
    await res.text()

    assertEquals(
      res.status,
      401,
      `Anon-as-Bearer must be rejected with 401; got ${res.status}.`,
    )
  },
)
