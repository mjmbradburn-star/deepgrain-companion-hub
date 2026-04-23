// Lightweight health-check endpoint.
//
// Reports reachability for the scoring functions and the email pipeline
// (functions, DB tables, RPCs, queue config). No emails are ever sent.
//
// Public on purpose: returns no secrets and has no destructive side effects.
// Recipient addresses from email_send_log are NOT exposed — only aggregated
// status counts.

import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Scoring + email functions we want to confirm are deployed.
const TARGETS = [
  'submit-quickscan',
  'score-responses',
  'rescore-respondent',
  'email-report-pdf',
  'send-transactional-email',
  'process-email-queue',
] as const

// Functions that expose ?health=1 for a no-side-effect probe.
const HEALTH_PROBE_TARGETS = new Set<string>([
  'send-transactional-email',
  'process-email-queue',
])

interface ProbeResult {
  name: string
  reachable: boolean
  status: number | null
  latencyMs: number
  note: string
}

async function probe(name: string): Promise<ProbeResult> {
  const useHealthMode = HEALTH_PROBE_TARGETS.has(name)
  const url = useHealthMode
    ? `${SUPABASE_URL}/functions/v1/${name}?health=1`
    : `${SUPABASE_URL}/functions/v1/${name}`
  const started = performance.now()
  try {
    // For health-mode endpoints we POST so the in-code service auth runs.
    // For everything else, OPTIONS is the cheapest reachability ping.
    const res = await fetch(url, {
      method: useHealthMode ? 'POST' : 'OPTIONS',
      headers: {
        Authorization: `Bearer ${SERVICE_ROLE}`,
        apikey: SERVICE_ROLE,
        'Content-Type': 'application/json',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'authorization, content-type',
        Origin: 'https://health-check.local',
      },
      body: useHealthMode ? '{}' : undefined,
    })
    const latencyMs = Math.round(performance.now() - started)
    // 5xx → function not deployed / crashed on boot.
    // For health-mode probes we want a true 2xx; that proves both that the
    // gateway is letting us through AND that in-code service auth is wired
    // correctly.
    const reachable = useHealthMode
      ? res.status >= 200 && res.status < 300
      : res.status < 500
    return {
      name,
      reachable,
      status: res.status,
      latencyMs,
      note: reachable ? 'ok' : `gateway returned ${res.status}`,
    }
  } catch (err) {
    return {
      name,
      reachable: false,
      status: null,
      latencyMs: Math.round(performance.now() - started),
      note: err instanceof Error ? err.message : 'network error',
    }
  }
}

// Aggregate the email-pipeline DB picture: required tables, RPCs, queue config,
// and a sanitised status histogram from the last 24h of email_send_log.
async function probeEmailDb() {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)
  const result: Record<string, unknown> = {}

  // Required tables — head:true count is cheap and errors if the table
  // does not exist.
  const tables = ['email_send_log', 'email_send_state', 'suppressed_emails', 'email_unsubscribe_tokens']
  const tableStatus: Record<string, boolean> = {}
  for (const t of tables) {
    const { error } = await supabase.from(t as never).select('*', { count: 'exact', head: true })
    tableStatus[t] = !error
  }
  result.tables = tableStatus

  // Required RPCs — calling with empty args returns PGRST202 only when the
  // function does not exist. Other errors mean it exists but rejected args.
  const rpcs = ['enqueue_email', 'read_email_batch', 'delete_email', 'move_to_dlq']
  const rpcStatus: Record<string, boolean> = {}
  for (const fn of rpcs) {
    let exists = true
    try {
      const { error } = await supabase.rpc(fn as never, {} as never)
      if (error && (error as { code?: string }).code === 'PGRST202') exists = false
    } catch {
      // Network errors are not function-existence errors.
    }
    rpcStatus[fn] = exists
  }
  result.rpcs = rpcStatus

  // Queue config row should exist (id=1) with sane defaults.
  const { data: state } = await supabase
    .from('email_send_state')
    .select('id, batch_size, send_delay_ms, retry_after_until')
    .eq('id', 1)
    .maybeSingle()
  result.queue_config_present = Boolean(state)
  if (state) {
    result.queue_config = {
      batch_size: state.batch_size,
      send_delay_ms: state.send_delay_ms,
      rate_limited_until: state.retry_after_until,
    }
  }

  // Status histogram + delivery diagnostics — last 24h, no recipient addresses exposed.
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { data: rows } = await supabase
    .from('email_send_log')
    .select('message_id, template_name, status, error_message, created_at')
    .gte('created_at', since)
    .order('created_at', { ascending: false })

  const latest = new Map<string, { template_name: string; status: string; error_message: string | null; created_at: string }>()
  for (const r of rows ?? []) {
    const key = r.message_id || `${r.template_name}:${r.created_at}`
    if (!latest.has(key)) latest.set(key, r)
  }

  const counts: Record<string, number> = {}
  const pendingAuth: Array<{ age_seconds: number; template_name: string }> = []
  const recentFailures: Array<{ status: string; template_name: string; error: string | null; age_seconds: number }> = []
  const nowMs = Date.now()
  for (const r of latest.values()) {
    counts[r.status] = (counts[r.status] ?? 0) + 1
    const age_seconds = Math.max(0, Math.round((nowMs - new Date(r.created_at).getTime()) / 1000))
    if (r.status === 'pending' && ['signup', 'magiclink', 'recovery', 'reauthentication', 'email_change', 'invite', 'auth_emails'].includes(r.template_name)) {
      pendingAuth.push({ age_seconds, template_name: r.template_name })
    }
    if (['failed', 'dlq', 'suppressed', 'bounced', 'complained'].includes(r.status)) {
      recentFailures.push({ status: r.status, template_name: r.template_name, error: r.error_message, age_seconds })
    }
  }
  result.recent_status_counts_24h = counts
  result.auth_email_backlog = {
    pending_count: pendingAuth.length,
    oldest_pending_age_seconds: pendingAuth.reduce((max, row) => Math.max(max, row.age_seconds), 0),
  }
  result.recent_problem_emails = recentFailures.slice(0, 10)

  return result
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const [functions, emailDb] = await Promise.all([
    Promise.all(TARGETS.map(probe)),
    probeEmailDb().catch((err) => ({ error: err instanceof Error ? err.message : 'unknown' })),
  ])

  const allFunctionsHealthy = functions.every((r) => r.reachable)
  const tablesOk =
    emailDb && typeof emailDb === 'object' && 'tables' in emailDb
      ? Object.values((emailDb as { tables: Record<string, boolean> }).tables).every(Boolean)
      : false
  const rpcsOk =
    emailDb && typeof emailDb === 'object' && 'rpcs' in emailDb
      ? Object.values((emailDb as { rpcs: Record<string, boolean> }).rpcs).every(Boolean)
      : false
  const emailHealthy =
    tablesOk &&
    rpcsOk &&
    Boolean((emailDb as { queue_config_present?: boolean }).queue_config_present)

  const ok = allFunctionsHealthy && emailHealthy

  const body = {
    ok,
    checkedAt: new Date().toISOString(),
    functions,
    email: emailDb,
  }

  return new Response(JSON.stringify(body, null, 2), {
    status: ok ? 200 : 503,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
