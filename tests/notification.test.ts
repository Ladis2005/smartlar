import { describe, it, expect } from 'vitest';

import {
  buildAdminOrderMessage,
  buildCustomerOrderMessage,
  formatMaputoDateTime,
  type NotificationOrderData,
} from '@/lib/whatsapp/message';

const baseOrder: NotificationOrderData = {
  orderNumber: 'SL-000125',
  createdAt: new Date('2026-08-09T19:30:00.000Z'), // 21:30 em Maputo (UTC+2)
  items: [{ name: 'Irrigador Oral Elétrico', quantity: 1 }],
  totalCents: 209900,
  customer: { name: 'João Manuel', phone: '841234567' },
  delivery: { city: 'Matola', neighborhood: 'Matola Gare', reference: 'Próximo ao mercado' },
  payment: { method: 'mpesa', status: 'awaiting_confirmation' },
};

describe('mensagem de nova encomenda', () => {
  it('inclui o cabeçalho, o número e os dados do cliente', () => {
    const message = buildAdminOrderMessage(baseOrder);

    expect(message).toContain('🔔 NOVO PEDIDO — SMARTLAR');
    expect(message).toContain('Pedido: #SL-000125');
    expect(message).toContain('Nome: João Manuel');
    expect(message).toContain('Telefone: 841234567');
    expect(message).toContain('Cidade: Matola');
    expect(message).toContain('Bairro: Matola Gare');
    expect(message).toContain('Referência: Próximo ao mercado');
    expect(message).toContain('Método: M-Pesa');
    expect(message).toContain('Estado: Aguardando confirmação');
    expect(message).toContain('2.099 MT');
  });

  it('usa a data e hora de Moçambique', () => {
    expect(formatMaputoDateTime(baseOrder.createdAt)).toBe('09/08/2026 21:30');
    expect(buildAdminOrderMessage(baseOrder)).toContain('09/08/2026 21:30');
  });

  it('lista todos os produtos quando há mais do que um', () => {
    const message = buildAdminOrderMessage({
      ...baseOrder,
      items: [
        { name: 'Irrigador Oral Elétrico', quantity: 1 },
        { name: 'Air Fryer 5,5 L Digital', quantity: 2 },
        { name: 'Garrafa Térmica Inox 1 L', quantity: 3 },
      ],
      totalCents: 2069600,
    });

    expect(message).toContain('🛒 Produtos:');
    expect(message).toContain('• Irrigador Oral Elétrico × 1');
    expect(message).toContain('• Air Fryer 5,5 L Digital × 2');
    expect(message).toContain('• Garrafa Térmica Inox 1 L × 3');
    expect(message).toContain('20.696 MT');
  });

  it('mostra a taxa de entrega apenas quando existe', () => {
    expect(buildAdminOrderMessage(baseOrder)).not.toContain('🚚 Entrega');
    expect(buildAdminOrderMessage({ ...baseOrder, deliveryFeeCents: 25000 })).toContain('🚚 Entrega: 250 MT');
  });

  it('trata o cliente pelo primeiro nome na mensagem de confirmação', () => {
    const message = buildCustomerOrderMessage(baseOrder);
    expect(message).toContain('Olá João 👋');
    expect(message).toContain('Pedido: #SL-000125');
    expect(message).toContain('Total: 2.099 MT');
  });
});
