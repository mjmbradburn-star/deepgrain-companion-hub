import * as React from 'npm:react@18.3.1'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Deepgrain · AIOI'

interface ReportPdfReadyProps {
  /** Numeric AIOI score 0–100 */
  score?: number
  /** Tier label, e.g. "Operational" */
  tier?: string
  /** Short-lived signed URL to the PDF in the private report-pdfs bucket. */
  pdfUrl?: string
  /** Canonical app URL back to the live report (no secrets). */
  reportUrl?: string
}

const ReportPdfReadyEmail = ({
  score,
  tier,
  pdfUrl,
  reportUrl,
}: ReportPdfReadyProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>
      Your AIOI report is ready{typeof score === 'number' ? ` — score ${score}` : ''}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Your AIOI report is ready.</Heading>

        {typeof score === 'number' && (
          <Section style={scoreBox}>
            <Text style={scoreLabel}>AIOI Score</Text>
            <Text style={scoreValue}>{score}</Text>
            {tier && <Text style={tierLabel}>Tier · {tier}</Text>}
          </Section>
        )}

        <Text style={text}>
          We've packaged your lite report as a one-page PDF. Download it, share
          it with a colleague, or keep it for your records.
        </Text>

        {pdfUrl && (
          <Section style={{ textAlign: 'center', margin: '28px 0' }}>
            <Button href={pdfUrl} style={primaryButton}>
              Download PDF
            </Button>
          </Section>
        )}

        {reportUrl && (
          <Text style={text}>
            Prefer the interactive version?{' '}
            <a href={reportUrl} style={link}>
              Open your report online
            </a>
            .
          </Text>
        )}

        <Hr style={hr} />

        <Text style={footer}>
          Sent by {SITE_NAME}. Your report stays private — only people with the
          link can view it.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ReportPdfReadyEmail as unknown as TemplateEntry['component'],
  subject: (data: Record<string, unknown>) => {
    const score = typeof data?.score === 'number' ? data.score : null
    return score !== null
      ? `Your AIOI report (${score}/100) is ready`
      : 'Your AIOI report is ready'
  },
  displayName: 'AIOI report PDF delivery',
  previewData: {
    score: 62,
    tier: 'Operational',
    pdfUrl: 'https://example.com/report.pdf',
    reportUrl: 'https://example.com/assess/r/abc123',
  },
} satisfies TemplateEntry

// ── Styles ────────────────────────────────────────────────────────────────
const main = {
  backgroundColor: '#ffffff',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
}
const container = {
  maxWidth: '560px',
  margin: '0 auto',
  padding: '32px 28px',
}
const h1 = {
  fontSize: '26px',
  fontWeight: 600,
  color: '#2a1a0f',
  lineHeight: 1.2,
  margin: '0 0 24px',
  letterSpacing: '-0.01em',
}
const text = {
  fontSize: '15px',
  color: '#3d2a1a',
  lineHeight: 1.6,
  margin: '0 0 16px',
}
const scoreBox = {
  backgroundColor: '#faf6ef',
  border: '1px solid #e6dcc8',
  borderRadius: '6px',
  padding: '20px 24px',
  margin: '0 0 24px',
  textAlign: 'center' as const,
}
const scoreLabel = {
  fontSize: '11px',
  fontWeight: 600,
  letterSpacing: '0.18em',
  textTransform: 'uppercase' as const,
  color: '#8a7355',
  margin: '0 0 4px',
}
const scoreValue = {
  fontSize: '52px',
  fontWeight: 300,
  color: '#2a1a0f',
  lineHeight: 1,
  margin: '0',
  letterSpacing: '-0.02em',
}
const tierLabel = {
  fontSize: '11px',
  fontWeight: 600,
  letterSpacing: '0.18em',
  textTransform: 'uppercase' as const,
  color: '#8a7355',
  margin: '8px 0 0',
}
const primaryButton = {
  backgroundColor: '#b08d3a',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 600,
  letterSpacing: '0.04em',
  textDecoration: 'none',
  padding: '12px 28px',
  borderRadius: '4px',
  display: 'inline-block',
}
const link = {
  color: '#8a6d2c',
  textDecoration: 'underline',
}
const hr = {
  borderColor: '#ece4d2',
  margin: '32px 0 20px',
}
const footer = {
  fontSize: '12px',
  color: '#8a7355',
  lineHeight: 1.5,
  margin: '0',
}
