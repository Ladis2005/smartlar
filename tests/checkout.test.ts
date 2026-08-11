import { describe, it, expect } from 'vitest';

import { checkoutSchema, isValidMozPhone, normalizePhone, toInternationalPhone } from '@/lib/validation';

const validInput = {
  name: 'João Manuel',
  phone: '+258 84 123 4567',
  alternativePhone: '',
  province: 'Maputo Província',
  city: 'Matola',
  neighborhood: 'Matola Gare',
  addressReference: 'Próximo ao mercado',
  notes: '',
  paymentMethod: 'mpesa' as const,
  payerPhone: '841234567',
  transactionReference: 'CI250809.2130.A12345',
  receiptUrl: '',
  items: [{ productId: '11111111-1111-4111-8111-111111111111', quantity: 2 }],
  idempotencyKey: '22222222-2222-4222-8222-222222222222',
};

describe('telefones moçambicanos', () => {
  it('normaliza os vários formatos para 9 dígitos', () => {
    expect(normalizePhone('+258 84 123 4567')).toBe('841234567');
    expect(normalizePhone('258841234567')).toBe('841234567');
    expect(normalizePhone('84 123 4567')).toBe('841234567');
  });

  it('aceita os prefixos móveis e recusa o resto', () => {
    expect(isValidMozPhone('841234567')).toBe(true);
    expect(isValidMozPhone('871234567')).toBe(true);
    expect(isValidMozPhone('811234567')).toBe(false);
    expect(isValidMozPhone('8412345')).toBe(false);
  });

  it('converte para o formato internacional usado pela API do WhatsApp', () => {
    expect(toInternationalPhone('841234567')).toBe('258841234567');
  });
});

describe('validação do checkout', () => {
  it('aceita um pedido completo e normaliza o telefone', () => {
    const result = checkoutSchema.safeParse(validInput);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.phone).toBe('841234567');
  });

  it('recusa carrinho vazio', () => {
    const result = checkoutSchema.safeParse({ ...validInput, items: [] });
    expect(result.success).toBe(false);
  });

  it('recusa quantidade inválida', () => {
    const result = checkoutSchema.safeParse({
      ...validInput,
      items: [{ productId: validInput.items[0].productId, quantity: 0 }],
    });
    expect(result.success).toBe(false);
  });

  it('exige os campos de entrega obrigatórios', () => {
    for (const field of ['name', 'city', 'neighborhood', 'addressReference'] as const) {
      const result = checkoutSchema.safeParse({ ...validInput, [field]: '' });
      expect(result.success, `${field} deveria ser obrigatório`).toBe(false);
    }
  });

  it('recusa métodos de pagamento fora dos suportados', () => {
    const result = checkoutSchema.safeParse({ ...validInput, paymentMethod: 'cartao' });
    expect(result.success).toBe(false);
  });

  it('exige uma chave de idempotência válida', () => {
    const result = checkoutSchema.safeParse({ ...validInput, idempotencyKey: 'abc' });
    expect(result.success).toBe(false);
  });
});
