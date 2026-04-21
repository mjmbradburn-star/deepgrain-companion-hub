/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({
  siteName,
  confirmationUrl,
}: MagicLinkEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your sign-in link for {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Your sign-in link</Heading>
        <Text style={text}>
          Click below to sign in to {siteName}. This link expires shortly.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Sign in
        </Button>
        <Text style={footer}>
          If you didn't request this link, you can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail

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
