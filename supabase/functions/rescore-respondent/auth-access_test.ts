import 'https://deno.land/std@0.224.0/dotenv/load.ts'
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'

const SUPABASE_URL = Deno.env.get('VITE_SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('VITE_SUPABASE_PUBLISHABLE_KEY')!

assert(SUPABASE_URL, 'VITE_SUPABASE_URL must be set in .env')
assert(SUPABASE_ANON_KEY, 'VITE_SUPABASE_PUBLISHABLE_KEY must be set in .env')

function fakeExpiredJwt() {
  const encode = (value: unknown) => btoa(JSON.stringify(value)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: 'expired-user', role: 'authenticated', exp: 1 })}.not-a-real-signature`
}

async function assertSafeUnauthorized(res: Response, context: string) {
  const bodyText = await res.text()
  const body = JSON.parse(bodyText) as { error?: string }
  assertEquals(res.status, 401, `${context} must return 401; got ${res.status}.`)
  assertEquals(body.error, 'Unauthorized', `${context} must return a safe generic error.`)
  assertEquals(res.headers.get('access-control-allow-origin'), '*', `${context} must include CORS headers.`)
}

Deno.test('rescore-respondent: malformed token returns a safe auth state', async () => {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/rescore-respondent`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: 'Bearer not-a-real-jwt',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ slug: 'doesnt-matter' }),
  })

  await assertSafeUnauthorized(res, 'Malformed rescore-respondent token')
})

Deno.test('rescore-respondent: expired-looking token returns a safe auth state', async () => {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/rescore-respondent`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${fakeExpiredJwt()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ slug: 'doesnt-matter' }),
  })

  await assertSafeUnauthorized(res, 'Expired rescore-respondent token')
})