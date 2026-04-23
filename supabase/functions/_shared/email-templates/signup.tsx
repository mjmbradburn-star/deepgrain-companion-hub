/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Confirm your email to save your AI Operating Index report</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Confirm your email to continue</Heading>
        <Text style={text}>
          Thanks for using{' '}
          <Link href={siteUrl} style={link}>
            <strong>{siteName}</strong>
          </Link>
          .
        </Text>
        <Text style={text}>
          Confirm your address (
          <Link href={`mailto:${recipient}`} style={link}>
            {recipient}
          </Link>
          ) to save your report and continue the Deep Dive:
        </Text>
        <Button style={button} href={confirmationUrl}>
          Confirm and continue
        </Button>
        <Text style={footer}>
          If you did not request this from the AI Operating Index, you can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

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
const link = { color: 'hsl(32, 60%, 36%)', textDecoration: 'underline' }
const button = {
  backgroundColor: 'hsl(152, 60%, 10%)',
  color: '#F5EFE0',
  fontSize: '13px',
  fontWeight: 500 as const,
  letterSpacing: '0.08em',
  textTransform: 'uppercase' as const,
  borderRadius: '4px',
  padding: '14px 28px',
  textDecoration: 'none',
  display: 'inline-block',
}
const footer = {
  fontSize: '12px',
  color: 'hsl(152, 20%, 40%)',
  margin: '32px 0 0',
  lineHeight: '1.5',
}
