// email-report-pdf
// ─────────────────────────────────────────────────────────────────────────
// Generates a server-side PDF of the lite AIOI report for a given slug,
// uploads it to the public `report-pdfs` bucket, and triggers a
// transactional email with a download link.
//
// No auth required — slug is the secret. Anyone who knows the slug
// can request the PDF be sent to any email address (matches the existing
// "share by URL" model on the report page).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { PDFDocument, StandardFonts, rgb } from 'https://esm.sh/pdf-lib@1.17.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

// ── Types ────────────────────────────────────────────────────────────────
interface ReportPayload {
  respondent: {
    id: string
    slug: string
    level: string
    function: string | null
    region: string | null
    submitted_at: string | null
    is_anonymous: boolean
  }
  report: {
    aioi_score: number | null
    overall_tier: string | null
    pillar_tiers: Record<string, { tier: number; label: string; name: string }>
    hotspots: Array<{ pillar: number; name: string; tier: number; tierLabel: string }>
    diagnosis: string | null
    plan: unknown
    generated_at: string | null
  } | null
}

// ── Email validation ─────────────────────────────────────────────────────
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const body = await req.json().catch(() => ({}))
    const slug = typeof body.slug === 'string' ? body.slug.trim() : ''
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''

    if (!slug || slug.length < 6 || slug.length > 64) {
      return json({ error: 'Invalid slug' }, 400)
    }
    if (!email || !EMAIL_RE.test(email) || email.length > 254) {
      return json({ error: 'Please enter a valid email address.' }, 400)
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // 1. Fetch the report via the public RPC (no PII exposed).
    const { data: rpcData, error: rpcErr } = await admin.rpc('get_report_by_slug', {
      _slug: slug,
    })
    if (rpcErr || !rpcData) {
      console.error('[email-report-pdf] report lookup failed', rpcErr)
      return json({ error: 'Report not found' }, 404)
    }
    const payload = rpcData as ReportPayload
    if (!payload?.report) {
      return json({ error: 'Report is not ready yet' }, 409)
    }

    // 2. Build the PDF.
    const pdfBytes = await renderReportPdf(payload)

    // 3. Upload to storage (overwrite any prior version for this slug).
    const objectPath = `${slug}/aioi-report.pdf`
    const { error: uploadErr } = await admin.storage
      .from('report-pdfs')
      .upload(objectPath, pdfBytes, {
        contentType: 'application/pdf',
        upsert: true,
        cacheControl: '3600',
      })
    if (uploadErr) {
      console.error('[email-report-pdf] upload failed', uploadErr)
      return json({ error: 'Could not save the PDF' }, 500)
    }

    const { data: pub } = admin.storage.from('report-pdfs').getPublicUrl(objectPath)
    const pdfUrl = pub.publicUrl

    // 4. Build the report URL from the request's Origin (or fall back to the
    //    custom domain configured for this app).
    const origin =
      req.headers.get('origin') ||
      req.headers.get('referer')?.replace(/\/assess\/r\/.*$/, '') ||
      'https://aioi.deepgrain.ai'
    const reportUrl = `${origin.replace(/\/$/, '')}/assess/r/${slug}`

    // 5. Trigger the transactional email.
    //    Call directly with fetch so we control the Authorization header
    //    (admin.functions.invoke does not forward the service-role key, which
    //    causes UNAUTHORIZED_INVALID_JWT_FORMAT against verify_jwt=true funcs).
    const idempotencyKey = `report-pdf-${slug}-${email}`
    let sendErr: { message: string; status?: number; body?: string } | null = null
    try {
      const sendRes = await fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          apikey: SUPABASE_SERVICE_ROLE_KEY,
        },
        body: JSON.stringify({
          templateName: 'report-pdf-ready',
          recipientEmail: email,
          idempotencyKey,
          templateData: {
            score: payload.report.aioi_score,
            tier: payload.report.overall_tier,
            pdfUrl,
            reportUrl,
          },
        }),
      })
      if (!sendRes.ok) {
        const text = await sendRes.text().catch(() => '')
        sendErr = { message: `send-transactional-email ${sendRes.status}`, status: sendRes.status, body: text }
      }
    } catch (e) {
      sendErr = { message: e instanceof Error ? e.message : 'fetch failed' }
    }
    if (sendErr) {
      console.error('[email-report-pdf] send-transactional-email failed', sendErr)
      // Even if the email send fails, the PDF has been generated. Return a
      // SUCCESSFUL HTTP response so the client receives the fallback URL
      // instead of supabase.functions.invoke throwing on a 5xx. The body
      // signals the recoverable failure with ok:false.
      return json(
        {
          ok: false,
          pdfUrl,
          error: 'We generated your PDF but could not queue the email. Use the download link below.',
        },
        200,
      )
    }

    // Telemetry — fire-and-forget
    void admin.from('events').insert({
      name: 'report_pdf_emailed',
      payload: { slug, email_domain: email.split('@')[1] },
    })

    return json({ ok: true, pdfUrl })
  } catch (err) {
    console.error('[email-report-pdf] error:', err)
    return json({ error: err instanceof Error ? err.message : 'Unknown error' }, 500)
  }
})

// ─── PDF renderer (single-page A4) ───────────────────────────────────────
async function renderReportPdf(payload: ReportPayload): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const helv = await doc.embedFont(StandardFonts.Helvetica)
  const helvBold = await doc.embedFont(StandardFonts.HelveticaBold)
  const helvOblique = await doc.embedFont(StandardFonts.HelveticaOblique)

  // A4 in points: 595 × 842
  const page = doc.addPage([595, 842])
  const { width, height } = page.getSize()

  const cream = rgb(0.96, 0.93, 0.86)
  const walnut = rgb(0.16, 0.10, 0.06)
  const muted = rgb(0.42, 0.34, 0.24)
  const brass = rgb(0.69, 0.55, 0.23)
  const hairline = rgb(0.85, 0.79, 0.66)

  // Background
  page.drawRectangle({ x: 0, y: 0, width, height, color: cream })

  const margin = 48
  let cursorY = height - margin

  // ── Masthead ─────────────────────────────────────────────────────────
  page.drawText('DEEPGRAIN · AIOI', {
    x: margin,
    y: cursorY,
    size: 9,
    font: helvBold,
    color: muted,
  })
  page.drawText(
    `${(payload.respondent.level ?? '').toUpperCase()} LEVEL`,
    {
      x: width - margin - helv.widthOfTextAtSize(`${(payload.respondent.level ?? '').toUpperCase()} LEVEL`, 9),
      y: cursorY,
      size: 9,
      font: helvBold,
      color: muted,
    },
  )
  cursorY -= 28

  page.drawText('The AI Operating Index', {
    x: margin,
    y: cursorY - 18,
    size: 24,
    font: helvBold,
    color: walnut,
  })
  cursorY -= 36
  page.drawText(`Generated · ${formatDate(payload.report?.generated_at)}`, {
    x: margin,
    y: cursorY - 12,
    size: 9,
    font: helv,
    color: muted,
  })
  page.drawText(`Slug · ${payload.respondent.slug}`, {
    x: width - margin - helv.widthOfTextAtSize(`Slug · ${payload.respondent.slug}`, 9),
    y: cursorY - 12,
    size: 9,
    font: helv,
    color: muted,
  })
  cursorY -= 24

  // Divider
  page.drawLine({
    start: { x: margin, y: cursorY },
    end: { x: width - margin, y: cursorY },
    thickness: 0.8,
    color: hairline,
  })
  cursorY -= 32

  // ── Score block ──────────────────────────────────────────────────────
  const score = payload.report?.aioi_score ?? 0
  const tier = payload.report?.overall_tier ?? '—'

  page.drawText('AIOI SCORE', {
    x: margin,
    y: cursorY,
    size: 9,
    font: helvBold,
    color: muted,
  })
  cursorY -= 8
  page.drawText(String(score), {
    x: margin,
    y: cursorY - 64,
    size: 88,
    font: helvBold,
    color: walnut,
  })
  page.drawText(`TIER · ${tier.toString().toUpperCase()}`, {
    x: margin,
    y: cursorY - 80,
    size: 9,
    font: helvBold,
    color: brass,
  })

  // Diagnosis (right column)
  if (payload.report?.diagnosis) {
    const diagX = margin + 220
    const diagWidth = width - margin - diagX
    page.drawLine({
      start: { x: diagX, y: cursorY - 10 },
      end: { x: diagX, y: cursorY - 80 },
      thickness: 1.5,
      color: brass,
    })
    drawWrappedText(
      page,
      `"${payload.report.diagnosis}"`,
      diagX + 10,
      cursorY - 4,
      diagWidth - 10,
      11,
      14,
      helvOblique,
      walnut,
    )
  }
  cursorY -= 100

  // ── Pillar bars ──────────────────────────────────────────────────────
  cursorY -= 24
  page.drawText('PILLAR BREAKDOWN', {
    x: margin,
    y: cursorY,
    size: 9,
    font: helvBold,
    color: muted,
  })
  cursorY -= 18

  const pillarTiers = payload.report?.pillar_tiers ?? {}
  const pillarOrder = [1, 2, 3, 4, 5, 6, 7, 8]
  const barWidth = width - margin * 2 - 180
  const barX = margin + 180

  for (const p of pillarOrder) {
    const entry = pillarTiers[String(p)]
    if (!entry) continue
    const t = Number(entry.tier ?? 0)
    const pct = Math.max(0, Math.min(1, t / 5))

    page.drawText(`P${p} · ${entry.name}`, {
      x: margin,
      y: cursorY - 8,
      size: 10,
      font: helv,
      color: walnut,
    })

    // Bar background
    page.drawRectangle({
      x: barX,
      y: cursorY - 8,
      width: barWidth,
      height: 6,
      color: hairline,
    })
    // Bar fill
    page.drawRectangle({
      x: barX,
      y: cursorY - 8,
      width: barWidth * pct,
      height: 6,
      color: brass,
    })
    // Tier label
    page.drawText(entry.label ?? '', {
      x: barX + barWidth + 8,
      y: cursorY - 8,
      size: 9,
      font: helvBold,
      color: muted,
    })

    cursorY -= 18
  }

  // ── Hotspots ────────────────────────────────────────────────────────
  cursorY -= 16
  page.drawLine({
    start: { x: margin, y: cursorY },
    end: { x: width - margin, y: cursorY },
    thickness: 0.5,
    color: hairline,
  })
  cursorY -= 20

  const hotspots = payload.report?.hotspots ?? []
  if (hotspots.length > 0) {
    page.drawText('PILLARS TO WATCH', {
      x: margin,
      y: cursorY,
      size: 9,
      font: helvBold,
      color: muted,
    })
    cursorY -= 18

    const colW = (width - margin * 2 - 16) / Math.min(hotspots.length, 3)
    for (let i = 0; i < Math.min(hotspots.length, 3); i++) {
      const h = hotspots[i]
      const x = margin + i * (colW + 8)
      // Box
      page.drawRectangle({
        x,
        y: cursorY - 60,
        width: colW,
        height: 60,
        borderColor: hairline,
        borderWidth: 0.8,
      })
      page.drawText(`P${h.pillar}`, {
        x: x + 10,
        y: cursorY - 16,
        size: 9,
        font: helvBold,
        color: brass,
      })
      page.drawText(h.tierLabel ?? '', {
        x: x + colW - helv.widthOfTextAtSize(h.tierLabel ?? '', 9) - 10,
        y: cursorY - 16,
        size: 9,
        font: helvBold,
        color: muted,
      })
      drawWrappedText(
        page,
        h.name ?? '',
        x + 10,
        cursorY - 32,
        colW - 20,
        10,
        13,
        helv,
        walnut,
      )
    }
    cursorY -= 76
  }

  // ── Footer ──────────────────────────────────────────────────────────
  const footY = margin
  page.drawLine({
    start: { x: margin, y: footY + 24 },
    end: { x: width - margin, y: footY + 24 },
    thickness: 0.5,
    color: hairline,
  })
  page.drawText('aioi.deepgrain.ai', {
    x: margin,
    y: footY + 8,
    size: 9,
    font: helv,
    color: muted,
  })
  const rightFoot = 'Lite report · 8-question Quickscan'
  page.drawText(rightFoot, {
    x: width - margin - helv.widthOfTextAtSize(rightFoot, 9),
    y: footY + 8,
    size: 9,
    font: helv,
    color: muted,
  })

  return await doc.save()
}

// Word-wrap helper for pdf-lib (which has no native text wrapping).
function drawWrappedText(
  page: ReturnType<PDFDocument['addPage']>,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  size: number,
  lineHeight: number,
  font: Awaited<ReturnType<PDFDocument['embedFont']>>,
  color: ReturnType<typeof rgb>,
) {
  const words = (text ?? '').split(/\s+/)
  let line = ''
  let cursorY = y
  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    const w = font.widthOfTextAtSize(test, size)
    if (w > maxWidth && line) {
      page.drawText(line, { x, y: cursorY, size, font, color })
      line = word
      cursorY -= lineHeight
    } else {
      line = test
    }
  }
  if (line) page.drawText(line, { x, y: cursorY, size, font, color })
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
