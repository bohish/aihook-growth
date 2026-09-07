import * as React from 'react'

import { Body, Container, Head, Heading, Html, Preview, Text } from '@react-email/components'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="ar" dir="rtl">
    <Head />
    <Preview>رمز التحقق الخاص بك</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>رمز التحقق</Heading>
        <Text style={text}>استخدم الرمز التالي لتأكيد هويتك:</Text>
        <Text style={code} dir="ltr">
          {token}
        </Text>
        <Text style={footer}>إذا لم تطلب هذا الرمز، تجاهل هذه الرسالة.</Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

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
  margin: '0 0 16px',
}
const code = {
  fontSize: '28px',
  letterSpacing: '6px',
  fontWeight: 'bold' as const,
  color: '#000000',
  margin: '0 0 25px',
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
