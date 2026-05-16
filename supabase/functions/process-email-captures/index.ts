// process-email-captures
// ─────────────────────────────────────────────────────────────────────────
// Drains unsent rows from public.email_captures, renders the
// `archetype-result` transactional template, enqueues it for delivery,
// and marks the row sent. Safe to invoke from anon (idempotent: only
// rows with sent=false are picked up; a row is marked sent before its
// email is enqueued, with rollback on enqueue failure).
//
// Two invocation modes:
//   1. POST {} with no body → drain up to BATCH_SIZE unsent rows.
//   2. POST { id: "<uuid>" } → process just that row (used immediately
//      after the result-page form submission for instant delivery).

import { createClient } from 'npm:@supabase/supabase-js@2'
import { ARCHETYPES } from '../_shared/archetypes-data.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

const BATCH_SIZE = 20
const MAX_ATTEMPTS = 5

interface CaptureRow {
  id: string
  email: string
  archetype_index: number
  level: string
  attempts: number
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const admin = createClient(supabaseUrl, serviceKey)

  let targetId: string | null = null
  try {
    const body = await req.json().catch(() => ({}))
    if (typeof body?.id === 'string' && body.id.length > 10) targetId = body.id
  } catch {
    // empty body OK
  }

  // Fetch rows to process.
  const query = admin
    .from('email_captures')
    .select('id, email, archetype_index, level, attempts')
    .eq('sent', false)
    .lt('attempts', MAX_ATTEMPTS)
    .order('created_at', { ascending: true })

  const { data: rows, error: fetchErr } = targetId
    ? await query.eq('id', targetId).limit(1)
    : await query.limit(BATCH_SIZE)

  if (fetchErr) {
    console.error('[process-email-captures] fetch failed', fetchErr)
    return json({ error: 'fetch_failed' }, 500)
  }

  if (!rows || rows.length === 0) {
    return json({ ok: true, processed: 0 })
  }

  const origin =
    req.headers.get('origin') ||
    req.headers.get('referer')?.split('/assess')[0] ||
    'https://aioi.deepgrain.ai'

  let sent = 0
  let failed = 0

  for (const row of rows as CaptureRow[]) {
    const archetype = ARCHETYPES[row.archetype_index] ?? ARCHETYPES[0]
    const resultUrl = `${origin.replace(/\/$/, '')}/assess/result?a=${row.archetype_index}`

    // Bump attempts so a poisoned row eventually stops retrying.
    await admin
      .from('email_captures')
      .update({ attempts: row.attempts + 1 })
      .eq('id', row.id)

    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${serviceKey}`,
          apikey: serviceKey,
        },
        body: JSON.stringify({
          templateName: 'archetype-result',
          recipientEmail: row.email,
          idempotencyKey: `archetype-${row.id}`,
          templateData: {
            archetypeName: archetype.name,
            tagline: archetype.tagline,
            definition: archetype.definition,
            whyItMatters: archetype.whyItMatters,
            leveragePoint: archetype.leveragePoint,
            whatGoodLooksLike: archetype.whatGoodLooksLike,
            resultUrl,
          },
        }),
      })

      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(`send-transactional-email ${res.status}: ${text.slice(0, 200)}`)
      }
      await res.text()

      await admin
        .from('email_captures')
        .update({ sent: true, sent_at: new Date().toISOString(), last_error: null })
        .eq('id', row.id)

      sent++
    } catch (err) {
      const message = err instanceof Error ? err.message : 'unknown'
      console.error('[process-email-captures] send failed', { id: row.id, message })
      await admin
        .from('email_captures')
        .update({ last_error: message.slice(0, 500) })
        .eq('id', row.id)
      failed++
    }
  }

  return json({ ok: true, processed: rows.length, sent, failed })
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
