/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your verification code</Preview>
    <Body style={main}>
      <Container style={container}>
        <table width="100%" style={{ borderCollapse: 'collapse' }}>
          <tr>
            <td style={mastheadLeft}>DEEPGRAIN · AIOI</td>
            <td style={mastheadRight}>VOLUME I · MMXXVI</td>
          </tr>
        </table>
        <Hr style={brassRule} />

        <Text style={eyebrow}>Issue 01 · Verification</Text>
        <Heading style={h1}>Confirm it's you.</Heading>
        <Hr style={brassUnderline} />

        <Text style={text}>Use the code below to confirm your identity:</Text>
        <Text style={codeStyle}>{token}</Text>

        <Hr style={hairline} />
        <Text style={footer}>
          This code expires shortly. If you didn't request it, ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const inkHex = 'hsl(152, 60%, 9%)'
const mutedHex = 'hsl(152, 20%, 28%)'
const brassHex = 'hsl(32, 60%, 36%)'
const paperHex = '#F5EFE0'
const hairlineHex = 'rgba(15, 36, 26, 0.14)'

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Helvetica, Arial, sans-serif", padding: '32px 0', margin: 0 }
const container = { maxWidth: '600px', margin: '0 auto', padding: '40px 36px', backgroundColor: paperHex }
const mastheadLeft = { fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase' as const, color: mutedHex, textAlign: 'left' as const }
const mastheadRight = { ...mastheadLeft, textAlign: 'right' as const }
const brassRule = { borderColor: brassHex, borderTopWidth: '1px', margin: '14px 0 28px', opacity: 0.7 }
const eyebrow = { fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: '11px', letterSpacing: '0.22em', textTransform: 'uppercase' as const, color: brassHex, margin: '0 0 18px' }
const h1 = { fontFamily: "'Cormorant Garamond', 'Times New Roman', Georgia, serif", fontSize: '44px', fontWeight: 400 as const, color: inkHex, letterSpacing: '-0.02em', lineHeight: 1, margin: '0' }
const brassUnderline = { borderColor: brassHex, borderTopWidth: '1px', width: '96px', margin: '24px 0 28px', marginLeft: '0', opacity: 0.9 }
const text = { fontFamily: "'Cormorant Garamond', 'Times New Roman', Georgia, serif", fontSize: '17px', color: inkHex, lineHeight: 1.55, margin: '0 0 18px' }
const codeStyle = {
  fontFamily: "'JetBrains Mono', ui-monospace, monospace",
  fontSize: '32px',
  fontWeight: 600 as const,
  letterSpacing: '0.22em',
  color: inkHex,
  backgroundColor: '#ffffff',
  border: `1px solid ${brassHex}`,
  padding: '18px 28px',
  borderRadius: '2px',
  display: 'inline-block',
  margin: '0 0 28px',
}
const hairline = { borderColor: hairlineHex, borderTopWidth: '1px', margin: '24px 0 16px' }
const footer = { fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: mutedHex, margin: '0', lineHeight: 1.5 }
