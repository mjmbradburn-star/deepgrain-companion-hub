/// <reference types="npm:@types/react@18.3.1" />
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

interface ArchetypeResultProps {
  archetypeName?: string
  tagline?: string
  definition?: string
  whyItMatters?: string
  leveragePoint?: string
  whatGoodLooksLike?: string
  resultUrl?: string
}

const ArchetypeResultEmail = ({
  archetypeName = 'The Architect',
  tagline = 'Designed for scale.',
  definition = '',
  whyItMatters = '',
  leveragePoint = '',
  whatGoodLooksLike = '',
  resultUrl = 'https://aioi.deepgrain.ai/assess/result',
}: ArchetypeResultProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You are {archetypeName} — your AI Operating Archetype</Preview>
    <Body style={main}>
      <Container style={container}>
        {/* Masthead */}
        <Section style={masthead}>
          <table width="100%" style={{ borderCollapse: 'collapse' }}>
            <tr>
              <td style={mastheadLeft}>DEEPGRAIN · AIOI</td>
              <td style={mastheadRight}>VOLUME I · MMXXVI</td>
            </tr>
          </table>
        </Section>
        <Hr style={brassRule} />

        {/* Eyebrow */}
        <Text style={eyebrow}>Issue 01 · Archetype</Text>

        {/* Display headline */}
        <Heading style={hLead}>You are</Heading>
        <Heading style={hName}>
          <em style={{ fontStyle: 'italic', color: brassHex }}>{archetypeName}</em>
        </Heading>
        <Text style={taglineStyle}>{tagline}</Text>

        <Hr style={brassUnderline} />

        {/* Body sections */}
        {definition && (
          <Section style={block}>
            <Text style={kicker}>What this means</Text>
            <Text style={bodyText}>{definition}</Text>
          </Section>
        )}

        {whyItMatters && (
          <Section style={block}>
            <Text style={kicker}>Why it matters</Text>
            <Text style={bodyText}>{whyItMatters}</Text>
          </Section>
        )}

        {leveragePoint && (
          <Section style={block}>
            <Text style={kicker}>Your leverage point</Text>
            <Text style={bodyText}>{leveragePoint}</Text>
          </Section>
        )}

        {whatGoodLooksLike && (
          <Section style={block}>
            <Text style={kicker}>What good looks like</Text>
            <Text style={bodyText}>{whatGoodLooksLike}</Text>
          </Section>
        )}

        {/* CTA */}
        <Section style={{ textAlign: 'center', margin: '40px 0 24px' }}>
          <Button href={resultUrl} style={primaryButton}>
            Open your full result
          </Button>
        </Section>

        <Hr style={hairline} />

        {/* Footer */}
        <table width="100%" style={{ borderCollapse: 'collapse' }}>
          <tr>
            <td style={footLeft}>aioi.deepgrain.ai</td>
            <td style={footRight}>Lite report · 3-question scan</td>
          </tr>
        </table>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ArchetypeResultEmail as unknown as TemplateEntry['component'],
  subject: (data: Record<string, unknown>) => {
    const name = typeof data?.archetypeName === 'string' ? data.archetypeName : 'your AI Operating Archetype'
    return `You are ${name} — AI Operating Index`
  },
  displayName: 'Archetype result summary',
  previewData: {
    archetypeName: 'The Architect',
    tagline: 'Designed for scale.',
    definition:
      'Your operations are built to run. Routine work is handled by systems. People are reserved for exceptions, judgement, and relationships.',
    whyItMatters:
      'This is the operating model that lets you scale without proportionally scaling headcount.',
    leveragePoint:
      'Measure the ratio of routine to exception work in your key functions.',
    whatGoodLooksLike:
      'You are here. The next frontier is optimisation: faster feedback loops, richer context for your agents, and freeing your best people.',
    resultUrl: 'https://aioi.deepgrain.ai/assess/result?a=4',
  },
} satisfies TemplateEntry

// ── Editorial style system (shared across all Deepgrain emails) ──────────
const inkHex = 'hsl(152, 60%, 9%)'
const mutedHex = 'hsl(152, 20%, 28%)'
const brassHex = 'hsl(32, 60%, 36%)'
const paperHex = '#F5EFE0'
const hairlineHex = 'rgba(15, 36, 26, 0.14)'

const main = {
  backgroundColor: '#ffffff',
  fontFamily: "'Inter', Helvetica, Arial, sans-serif",
  margin: 0,
  padding: '32px 0',
}
const container = {
  maxWidth: '600px',
  margin: '0 auto',
  padding: '40px 36px',
  backgroundColor: paperHex,
}
const masthead = { margin: '0 0 14px' }
const mastheadLeft = {
  fontFamily: "'JetBrains Mono', ui-monospace, monospace",
  fontSize: '10px',
  letterSpacing: '0.22em',
  textTransform: 'uppercase' as const,
  color: mutedHex,
  textAlign: 'left' as const,
}
const mastheadRight = {
  ...mastheadLeft,
  textAlign: 'right' as const,
}
const brassRule = {
  borderColor: brassHex,
  borderTopWidth: '1px',
  margin: '0 0 28px',
  opacity: 0.7,
}
const eyebrow = {
  fontFamily: "'JetBrains Mono', ui-monospace, monospace",
  fontSize: '11px',
  letterSpacing: '0.22em',
  textTransform: 'uppercase' as const,
  color: brassHex,
  margin: '0 0 18px',
}
const hLead = {
  fontFamily: "'Cormorant Garamond', 'Times New Roman', Georgia, serif",
  fontSize: '36px',
  fontWeight: 300 as const,
  color: inkHex,
  margin: '0',
  lineHeight: 1,
  letterSpacing: '-0.02em',
}
const hName = {
  fontFamily: "'Cormorant Garamond', 'Times New Roman', Georgia, serif",
  fontSize: '52px',
  fontWeight: 400 as const,
  color: inkHex,
  margin: '4px 0 0',
  lineHeight: 1,
  letterSpacing: '-0.025em',
}
const taglineStyle = {
  fontFamily: "'Cormorant Garamond', 'Times New Roman', Georgia, serif",
  fontStyle: 'italic' as const,
  fontSize: '20px',
  color: mutedHex,
  margin: '12px 0 0',
  lineHeight: 1.3,
}
const brassUnderline = {
  borderColor: brassHex,
  borderTopWidth: '1px',
  width: '96px',
  margin: '24px 0 32px',
  marginLeft: '0',
  opacity: 0.9,
}
const block = { margin: '0 0 24px' }
const kicker = {
  fontFamily: "'JetBrains Mono', ui-monospace, monospace",
  fontSize: '10px',
  letterSpacing: '0.22em',
  textTransform: 'uppercase' as const,
  color: brassHex,
  margin: '0 0 8px',
}
const bodyText = {
  fontFamily: "'Cormorant Garamond', 'Times New Roman', Georgia, serif",
  fontSize: '17px',
  color: inkHex,
  lineHeight: 1.5,
  margin: '0',
}
const primaryButton = {
  backgroundColor: inkHex,
  color: paperHex,
  fontFamily: "'Inter', Helvetica, Arial, sans-serif",
  fontSize: '12px',
  fontWeight: 500 as const,
  letterSpacing: '0.18em',
  textTransform: 'uppercase' as const,
  borderRadius: '2px',
  padding: '15px 32px',
  textDecoration: 'none',
  display: 'inline-block',
}
const hairline = {
  borderColor: hairlineHex,
  borderTopWidth: '1px',
  margin: '24px 0 16px',
}
const footLeft = {
  fontFamily: "'JetBrains Mono', ui-monospace, monospace",
  fontSize: '10px',
  letterSpacing: '0.18em',
  textTransform: 'uppercase' as const,
  color: mutedHex,
  textAlign: 'left' as const,
}
const footRight = {
  ...footLeft,
  textAlign: 'right' as const,
}
