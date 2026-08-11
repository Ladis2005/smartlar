import { logger } from '../logger';

export interface EmailSendResult {
  ok: boolean;
  messageId?: string;
  error?: string;
}

export interface EmailProvider {
  readonly name: string;
  isConfigured(): boolean;
  missingConfig(): string[];
  send(to: string, subject: string, text: string): Promise<EmailSendResult>;
}

export const NOT_CONFIGURED_ERROR = 'Email API não configurada.';

/**
 * Integração com a Resend (https://resend.com). O token vive apenas em
 * variáveis de ambiente do servidor, nunca chega ao navegador.
 */
class ResendProvider implements EmailProvider {
  readonly name = 'resend';

  missingConfig(): string[] {
    const missing: string[] = [];
    if (!process.env.RESEND_API_KEY) missing.push('RESEND_API_KEY');
    if (!process.env.RESEND_FROM_EMAIL) missing.push('RESEND_FROM_EMAIL');
    return missing;
  }

  isConfigured(): boolean {
    return this.missingConfig().length === 0;
  }

  async send(to: string, subject: string, text: string): Promise<EmailSendResult> {
    if (!this.isConfigured()) {
      return { ok: false, error: `${NOT_CONFIGURED_ERROR} Em falta: ${this.missingConfig().join(', ')}` };
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM_EMAIL,
          to: [to],
          subject,
          text,
        }),
        cache: 'no-store',
      });

      const data = (await response.json().catch(() => ({}))) as { id?: string; message?: string };

      if (!response.ok) {
        const message = data.message ?? `HTTP ${response.status}`;
        logger.warn('email_send_failed', { status: response.status, reason: message });
        return { ok: false, error: message };
      }

      return { ok: true, messageId: data.id };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro de rede desconhecido';
      logger.error('email_send_error', { reason: message });
      return { ok: false, error: message };
    }
  }
}

let provider: EmailProvider | null = null;

/** Ponto único de troca de fornecedor de e-mail. */
export function getEmailProvider(): EmailProvider {
  if (!provider) provider = new ResendProvider();
  return provider;
}

export function getAdminNotificationEmail(): string | null {
  const raw = (process.env.ADMIN_NOTIFICATION_EMAIL ?? '').trim();
  return raw ? raw : null;
}

export interface EmailConfigStatus {
  configured: boolean;
  missing: string[];
  adminEmailSet: boolean;
}

export function getEmailConfigStatus(): EmailConfigStatus {
  const p = getEmailProvider();
  const missing = p.missingConfig();
  if (!getAdminNotificationEmail()) missing.push('ADMIN_NOTIFICATION_EMAIL');
  return {
    configured: missing.length === 0,
    missing,
    adminEmailSet: Boolean(getAdminNotificationEmail()),
  };
}
