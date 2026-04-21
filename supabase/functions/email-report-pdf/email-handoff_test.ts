// Integration test for the email-report-pdf → send-transactional-email handoff.
//
// Simulates the upstream `send-transactional-email` function returning the
// 401 UNAUTHORIZED_INVALID_JWT_FORMAT failure we historically hit when
// `admin.functions.invoke` was used (it forwards the caller's JWT instead
// of the service-role key, which the gateway rejects against
// `verify_jwt = true` functions).
//
// What we assert:
//   1. The handoff uses direct `fetch` against /functions/v1/send-transactional-email
//   2. `Authorization: Bearer <SERVICE_ROLE_KEY>` is set
//   3. `apikey: <SERVICE_ROLE_KEY>` is set (gateway-level fallback)
//   4. Content-Type is application/json
//   5. Body carries the templateName + recipientEmail + idempotencyKey + templateData
//   6. When upstream returns 401 with the JWT-format body, the helper surfaces
//      it as { ok: false, status: 401, errorBody } so the handler can fall
//      back to the recoverable "PDF generated, email queue failed" branch.

import { assertEquals, assert } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { sendTransactionalEmailViaFetch } from './email-handoff.ts'

const SUPABASE_URL = 'https://example.supabase.co'
const SERVICE_ROLE_KEY = 'sb_secret_test_service_role_key_xyz'

const UNAUTHORIZED_INVALID_JWT_FORMAT_BODY = JSON.stringify({
  code: 401,
  message: 'Invalid JWT',
  hint: 'UNAUTHORIZED_INVALID_JWT_FORMAT',
})

interface CapturedRequest {
  url: string
  method: string
  headers: Record<string, string>
  body: unknown
}

function makeMockFetch(opts: {
  status: number
  body: string
}): { fetch: typeof fetch; captured: CapturedRequest[] } {
  const captured: CapturedRequest[] = []
  const mock: typeof fetch = (input, init) => {
    const url = typeof input === 'string' ? input : (input as URL | Request).toString()
    const headersIn = new Headers(init?.headers)
    const headers: Record<string, string> = {}
    headersIn.forEach((v, k) => { headers[k.toLowerCase()] = v })
    let parsedBody: unknown = null
    try {
      parsedBody = init?.body ? JSON.parse(init.body as string) : null
    } catch {
      parsedBody = init?.body ?? null
    }
    captured.push({
      url,
      method: (init?.method ?? 'GET').toUpperCase(),
      headers,
      body: parsedBody,
    })
    return Promise.resolve(
      new Response(opts.body, {
        status: opts.status,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
  }
  return { fetch: mock, captured }
}

Deno.test('email-handoff: hits the correct send-transactional-email URL with POST', async () => {
  const { fetch: mockFetch, captured } = makeMockFetch({ status: 200, body: '{"ok":true}' })

  await sendTransactionalEmailViaFetch({
    supabaseUrl: SUPABASE_URL,
    serviceRoleKey: SERVICE_ROLE_KEY,
    templateName: 'report-pdf-ready',
    recipientEmail: 'user@example.com',
    idempotencyKey: 'report-pdf-abc-user@example.com',
    templateData: { score: 42, tier: 'Reactive', pdfUrl: 'https://x/y.pdf', reportUrl: 'https://x/r/abc' },
    fetchImpl: mockFetch,
  })

  assertEquals(captured.length, 1, 'exactly one upstream request should be made')
  const req = captured[0]
  assertEquals(req.url, `${SUPABASE_URL}/functions/v1/send-transactional-email`)
  assertEquals(req.method, 'POST')
})

Deno.test('email-handoff: forwards the service-role key as Bearer + apikey', async () => {
  const { fetch: mockFetch, captured } = makeMockFetch({ status: 200, body: '{"ok":true}' })

  await sendTransactionalEmailViaFetch({
    supabaseUrl: SUPABASE_URL,
    serviceRoleKey: SERVICE_ROLE_KEY,
    templateName: 'report-pdf-ready',
    recipientEmail: 'user@example.com',
    idempotencyKey: 'k-1',
    templateData: {},
    fetchImpl: mockFetch,
  })

  const headers = captured[0].headers
  assertEquals(
    headers['authorization'],
    `Bearer ${SERVICE_ROLE_KEY}`,
    'Authorization must use the service-role key, NOT the caller JWT',
  )
  assertEquals(
    headers['apikey'],
    SERVICE_ROLE_KEY,
    'apikey header must also carry the service-role key for gateway validation',
  )
  assertEquals(headers['content-type'], 'application/json')
})

Deno.test('email-handoff: serialises template payload as JSON body', async () => {
  const { fetch: mockFetch, captured } = makeMockFetch({ status: 200, body: '{"ok":true}' })

  await sendTransactionalEmailViaFetch({
    supabaseUrl: SUPABASE_URL,
    serviceRoleKey: SERVICE_ROLE_KEY,
    templateName: 'report-pdf-ready',
    recipientEmail: 'user@example.com',
    idempotencyKey: 'report-pdf-slug-user@example.com',
    templateData: { score: 73, tier: 'Operational', pdfUrl: 'https://cdn/x.pdf', reportUrl: 'https://app/r/slug' },
    fetchImpl: mockFetch,
  })

  assertEquals(captured[0].body, {
    templateName: 'report-pdf-ready',
    recipientEmail: 'user@example.com',
    idempotencyKey: 'report-pdf-slug-user@example.com',
    templateData: { score: 73, tier: 'Operational', pdfUrl: 'https://cdn/x.pdf', reportUrl: 'https://app/r/slug' },
  })
})

Deno.test(
  'email-handoff: surfaces UNAUTHORIZED_INVALID_JWT_FORMAT as a recoverable failure',
  async () => {
    const { fetch: mockFetch, captured } = makeMockFetch({
      status: 401,
      body: UNAUTHORIZED_INVALID_JWT_FORMAT_BODY,
    })

    const result = await sendTransactionalEmailViaFetch({
      supabaseUrl: SUPABASE_URL,
      serviceRoleKey: SERVICE_ROLE_KEY,
      templateName: 'report-pdf-ready',
      recipientEmail: 'user@example.com',
      idempotencyKey: 'k-401',
      templateData: {},
      fetchImpl: mockFetch,
    })

    // The request was still well-formed — auth header used the SR key.
    assertEquals(
      captured[0].headers['authorization'],
      `Bearer ${SERVICE_ROLE_KEY}`,
      'Even on failure, the auth header must have been the service-role key',
    )

    // …and the helper reports a structured failure rather than throwing,
    // so the handler can return ok:false + pdfUrl to the client instead of 5xx.
    assertEquals(result.ok, false)
    assertEquals(result.status, 401)
    assert(
      result.errorBody?.includes('UNAUTHORIZED_INVALID_JWT_FORMAT'),
      `errorBody should preserve the upstream gateway hint (got: ${result.errorBody})`,
    )
  },
)
