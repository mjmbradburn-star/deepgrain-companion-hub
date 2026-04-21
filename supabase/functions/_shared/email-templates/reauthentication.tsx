/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
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
        <Heading style={h1}>Confirm reauthentication</Heading>
        <Text style={text}>Use the code below to confirm your identity:</Text>
        <Text style={codeStyle}>{token}</Text>
        <Text style={footer}>
          This code expires shortly. If you didn't request this, you can
          safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Helvetica, Arial, sans-serif" }
const container = { padding: '32px 28px', maxWidth: '560px' }
const h1 = {
  fontFamily: "'Cormorant Garamond', 'Times New Roman', Georgia, serif",
  fontSize: '32px',
  fontWeight: 500 as const,
  color: 'hsl(152, 60%, 9%)',
  letterSpacing: '-0.01em',
  margin: '0 0 24px',
}
const text = {
  fontSize: '15px',
  color: 'hsl(152, 20%, 28%)',
  lineHeight: '1.6',
  margin: '0 0 20px',
}
const codeStyle = {
  fontFamily: "'Courier New', Courier, monospace",
  fontSize: '28px',
  fontWeight: 700 as const,
  letterSpacing: '0.18em',
  color: 'hsl(152, 60%, 9%)',
  backgroundColor: '#F5EFE0',
  padding: '16px 24px',
  borderRadius: '4px',
  display: 'inline-block',
  margin: '0 0 28px',
}
const footer = {
  fontSize: '12px',
  color: 'hsl(152, 20%, 40%)',
  margin: '32px 0 0',
  lineHeight: '1.5',
}
