import * as React from 'react'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from '@react-email/components'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({ siteName, confirmationUrl }: MagicLinkEmailProps) => (
  <Html lang="ar" dir="rtl">
    <Head>
      <style>{darkModeCss}</style>
    </Head>
    <Preview>رابط الدخول إلى {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>رابط الدخول</Heading>
        <Text style={text}>
          اضغط الزر أدناه للدخول إلى حسابك في <strong>{siteName}</strong>. الرابط صالح لمرة
          واحدة ولفترة قصيرة.
        </Text>
        <Button className="dm-btn" style={button} href={confirmationUrl}>
          الدخول الآن
        </Button>
        <Text style={footer}>إذا لم تطلب رابط الدخول، تجاهل هذه الرسالة.</Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif' }
const container = { padding: '20px 25px' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: '#000000',
  margin: '0 0 20px',
}
const text = {
  fontSize: '14px',
  color: '#55575d',
  lineHeight: '1.7',
  margin: '0 0 25px',
}
const button = {
  backgroundColor: '#000000',
  color: '#ffffff',
  fontSize: '14px',
  border: '1px solid #000000',
  borderRadius: '8px',
  padding: '12px 20px',
  textDecoration: 'none',
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
const darkModeCss = `
  @media (prefers-color-scheme: dark) {
    .dm-btn { background-color: #ffffff !important; color: #000000 !important; }
  }
  [data-ogsc] .dm-btn { background-color: #ffffff !important; color: #000000 !important; }
  [data-ogsb] .dm-btn { background-color: #ffffff !important; color: #000000 !important; }
`
