/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1';
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
} from 'npm:@react-email/components@0.0.22';

interface MagicLinkEmailProps {
  confirmationUrl: string;
  siteName?: string;
  siteUrl?: string;
}

export default function MagicLinkEmail({
  confirmationUrl,
  siteName = 'agrodeo',
  siteUrl = 'https://agrodeo.farm',
}: MagicLinkEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Tu enlace de acceso a {siteName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={logo}>{siteName}</Heading>
          <Hr style={hr} />
          <Heading style={heading}>Acceso rápido</Heading>
          <Text style={text}>
            Hacé clic en el botón para ingresar a tu cuenta. Este enlace es válido por tiempo limitado.
          </Text>
          <Section style={buttonContainer}>
            <Button style={button} href={confirmationUrl}>
              Ingresar a {siteName}
            </Button>
          </Section>
          <Text style={textMuted}>
            Si no solicitaste este enlace, podés ignorar este correo.
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
};

const textMuted: React.CSSProperties = {
  color: 'hsl(215, 16%, 47%)',
  fontSize: '13px',
  lineHeight: '20px',
  margin: '16px 0 0',
};

const buttonContainer: React.CSSProperties = {
  textAlign: 'center' as const,
  margin: '24px 0',
};

const button: React.CSSProperties = {
  backgroundColor: 'hsl(142, 71%, 45%)',
  color: '#ffffff',
  borderRadius: '8px',
  fontSize: '15px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 32px',
};

const footer: React.CSSProperties = {
  color: 'hsl(215, 16%, 47%)',
  fontSize: '12px',
  textAlign: 'center' as const,
  margin: '0',
};
