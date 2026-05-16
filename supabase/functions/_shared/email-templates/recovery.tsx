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

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({
  siteName,
  confirmationUrl,
}: RecoveryEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Reset your password for {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <table width="100%" style={{ borderCollapse: 'collapse' }}>
          <tr>
            <td style={mastheadLeft}>DEEPGRAIN · AIOI</td>
            <td style={mastheadRight}>VOLUME I · MMXXVI</td>
          </tr>
        </table>
        <Hr style={brassRule} />

        <Text style={eyebrow}>Issue 01 · Recovery</Text>
        <Heading style={h1}>Reset your password.</Heading>
        <Hr style={brassUnderline} />

        <Text style={text}>
          We received a request to reset your password for {siteName}. Use the button below to choose a new one. The link expires shortly.
        </Text>

        <Section style={{ textAlign: 'left', margin: '28px 0 24px' }}>
          <Button style={button} href={confirmationUrl}>
            Reset password
          </Button>
        </Section>

        <Hr style={hairline} />
        <Text style={footer}>
          If you didn't request this, ignore the email — your password will stay the same.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

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
const button = { backgroundColor: inkHex, color: paperHex, fontFamily: "'Inter', Helvetica, Arial, sans-serif", fontSize: '12px', fontWeight: 500 as const, letterSpacing: '0.18em', textTransform: 'uppercase' as const, borderRadius: '2px', padding: '15px 32px', textDecoration: 'none', display: 'inline-block' }
const hairline = { borderColor: hairlineHex, borderTopWidth: '1px', margin: '24px 0 16px' }
const footer = { fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: mutedHex, margin: '0', lineHeight: 1.5 }
