import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

type AuthEmailState = 'new' | 'unconfirmed' | 'confirmed' | 'invalid_email' | 'unknown'

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') return json({ ok: false, error: 'Method not allowed' }, 405)

  const body = await req.json().catch(() => null)
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''

  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ ok: true, state: 'invalid_email' satisfies AuthEmailState })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[auth-email-status] missing backend configuration')
    return json({ ok: false, state: 'unknown' satisfies AuthEmailState, error: 'Server configuration error' }, 500)
  }

  const admin = createClient(supabaseUrl, serviceRoleKey)
  const { data, error } = await admin.rpc('get_auth_email_state', { _email: email })

  if (error) {
    console.error('[auth-email-status] lookup failed', error)
    return json({ ok: false, state: 'unknown' satisfies AuthEmailState })
  }

  const result = data as { ok?: boolean; state?: AuthEmailState } | null
  return json({ ok: result?.ok !== false, state: result?.state ?? 'unknown' })
})