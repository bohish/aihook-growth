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

interface EmailChangeEmailProps {
  siteName: string
  oldEmail: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  siteName,
  oldEmail,
  email,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <Html lang="ar" dir="rtl">
    <Head>
      <style>{darkModeCss}</style>
    </Head>
    <Preview>أكّد بريدك الجديد في {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>تأكيد البريد الجديد</Heading>
        <Text style={text}>
          طلبت تغيير بريد حسابك في <strong>{siteName}</strong>
          {oldEmail ? (
            <>
              {' '}
              من <span dir="ltr">{oldEmail}</span>
            </>
          ) : null}
          {newEmail ? (
            <>
              {' '}
              إلى <span dir="ltr">{newEmail}</span>
            </>
          ) : (
            <>
              {' '}
              إلى <span dir="ltr">{email}</span>
            </>
          )}
          . اضغط الزر أدناه لتأكيد التغيير.
        </Text>
        <Button className="dm-btn" style={button} href={confirmationUrl}>
          تأكيد التغيير
        </Button>
        <Text style={footer}>إذا لم تطلب هذا التغيير، تجاهل الرسالة وسيبقى بريدك كما هو.</Text>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail

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
