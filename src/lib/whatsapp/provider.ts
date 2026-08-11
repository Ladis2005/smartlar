import { logger } from '../logger';

export interface WhatsAppSendResult {
  ok: boolean;
  messageId?: string;
  error?: string;
  /** true quando o envio falhou por falta de configuração, não por erro da API. */
  notConfigured?: boolean;
}

export interface WhatsAppProvider {
  readonly name: string;
  isConfigured(): boolean;
  missingConfig(): string[];
  sendText(to: string, body: string): Promise<WhatsAppSendResult>;
  sendTemplate(to: string, templateName: string, variables: string[]): Promise<WhatsAppSendResult>;
}

export const NOT_CONFIGURED_ERROR = 'WhatsApp API não configurada.';

/**
 * Integração oficial com a Meta WhatsApp Cloud API.
 * Nada aqui corre no navegador: o token vive apenas em variáveis de ambiente
 * do servidor. Não existe nenhuma automação do WhatsApp Web neste projeto.
 */
class MetaCloudProvider implements WhatsAppProvider {
  readonly name = 'meta-cloud-api';

  missingConfig(): string[] {
    const missing: string[] = [];
    if (!process.env.WHATSAPP_PHONE_NUMBER_ID) missing.push('WHATSAPP_PHONE_NUMBER_ID');
    if (!process.env.WHATSAPP_ACCESS_TOKEN) missing.push('WHATSAPP_ACCESS_TOKEN');
    return missing;
  }

  isConfigured(): boolean {
    return this.missingConfig().length === 0;
  }

  private endpoint(): string {
    const version = process.env.WHATSAPP_API_VERSION || 'v21.0';
    return `https://graph.facebook.com/${version}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
  }

  private async post(payload: Record<string, unknown>): Promise<WhatsAppSendResult> {
    if (!this.isConfigured()) {
      return { ok: false, error: NOT_CONFIGURED_ERROR, notConfigured: true };
    }

    try {
      const response = await fetch(this.endpoint(), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        cache: 'no-store',
      });

      const data = (await response.json().catch(() => ({}))) as {
        messages?: { id: string }[];
        error?: { message?: string; code?: number };
      };

      if (!response.ok) {
        const message = data.error?.message ?? `HTTP ${response.status}`;
        logger.warn('whatsapp_send_failed', { status: response.status, reason: message });
        return { ok: false, error: message };
      }

      return { ok: true, messageId: data.messages?.[0]?.id };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro de rede desconhecido';
      logger.error('whatsapp_send_error', { reason: message });
      return { ok: false, error: message };
    }
  }

  async sendText(to: string, body: string): Promise<WhatsAppSendResult> {
    return this.post({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: { preview_url: false, body },
    });
  }

  async sendTemplate(to: string, templateName: string, variables: string[]): Promise<WhatsAppSendResult> {
    return this.post({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'template',
      template: {
        name: templateName,
        language: { code: process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'pt_PT' },
        components: variables.length
          ? [{ type: 'body', parameters: variables.map((text) => ({ type: 'text', text })) }]
          : [],
      },
    });
  }
}

let provider: WhatsAppProvider | null = null;

/**
 * Ponto único de troca de fornecedor. Para usar outro BSP compatível, basta
 * criar uma classe que implemente WhatsAppProvider e devolvê-la aqui.
 */
export function getWhatsAppProvider(): WhatsAppProvider {
  if (!provider) provider = new MetaCloudProvider();
  return provider;
}

export function getAdminWhatsAppNumber(): string | null {
  const raw = process.env.ADMIN_WHATSAPP_NUMBER?.replace(/\D/g, '') ?? '';
  return raw.length >= 9 ? raw : null;
}

export interface WhatsAppConfigStatus {
  configured: boolean;
  missing: string[];
  adminNumberSet: boolean;
  customerMessagesEnabled: boolean;
}

export function getWhatsAppConfigStatus(): WhatsAppConfigStatus {
  const p = getWhatsAppProvider();
  const missing = p.missingConfig();
  if (!getAdminWhatsAppNumber()) missing.push('ADMIN_WHATSAPP_NUMBER');
  return {
    configured: missing.length === 0,
    missing,
    adminNumberSet: Boolean(getAdminWhatsAppNumber()),
    customerMessagesEnabled: Boolean(process.env.WHATSAPP_CUSTOMER_TEMPLATE_NAME),
  };
}
