/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1';
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22';

interface ReauthenticationEmailProps {
  token: string;
  siteName?: string;
  siteUrl?: string;
}

export default function ReauthenticationEmail({
  token,
  siteName = 'agrodeo',
  siteUrl = 'https://agrodeo.farm',
}: ReauthenticationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Tu código de verificación de {siteName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={logo}>{siteName}</Heading>
          <Hr style={hr} />
          <Heading style={heading}>Código de verificación</Heading>
          <Text style={text}>
            Ingresá el siguiente código para verificar tu identidad:
          </Text>
          <Section style={codeContainer}>
            <Text style={code}>{token}</Text>
          </Section>
          <Text style={textMuted}>
            Este código expira en pocos minutos. Si no lo solicitaste, ignorá este correo.
          </Text>
          <Hr style={hr} />
          <Text style={footer}>
            © {new Date().getFullYear()} {siteName} · Sistema de Gestión Integral de Ganado
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const main: React.CSSProperties = {
  backgroundColor: '#ffffff',
  fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
};

const container: React.CSSProperties = {
  margin: '0 auto',
  padding: '40px 24px',
  maxWidth: '480px',
};

const logo: React.CSSProperties = {
  color: 'hsl(142, 71%, 45%)',
  fontSize: '28px',
  fontWeight: '700',
  textAlign: 'center' as const,
  margin: '0 0 24px',
};

const hr: React.CSSProperties = {
  borderColor: 'hsl(214, 32%, 91%)',
  margin: '24px 0',
};

const heading: React.CSSProperties = {
  color: 'hsl(215, 25%, 27%)',
  fontSize: '22px',
  fontWeight: '600',
  textAlign: 'center' as const,
  margin: '24px 0 16px',
};

const text: React.CSSProperties = {
  color: 'hsl(215, 25%, 27%)',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '0 0 16px',
  textAlign: 'center' as const,
};

const codeContainer: React.CSSProperties = {
  textAlign: 'center' as const,
  margin: '24px 0',
  padding: '16px',
  backgroundColor: 'hsl(210, 40%, 98%)',
  borderRadius: '8px',
  border: '1px solid hsl(214, 32%, 91%)',
};

const code: React.CSSProperties = {
  color: 'hsl(142, 71%, 45%)',
  fontSize: '32px',
  fontWeight: '700',
  letterSpacing: '6px',
  margin: '0',
};

const textMuted: React.CSSProperties = {
  color: 'hsl(215, 16%, 47%)',
  fontSize: '13px',
  lineHeight: '20px',
  margin: '16px 0 0',
  textAlign: 'center' as const,
};

const footer: React.CSSProperties = {
  color: 'hsl(215, 16%, 47%)',
  fontSize: '12px',
  textAlign: 'center' as const,
  margin: '0',
};
