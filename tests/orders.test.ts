import { describe, it, expect } from 'vitest';

import { calculateOrderTotal, formatOrderNumber, isValidOrderNumber } from '@/lib/orders';

describe('número da encomenda', () => {
  it('usa o formato SL-000001', () => {
    expect(formatOrderNumber(1)).toBe('SL-000001');
    expect(formatOrderNumber(125)).toBe('SL-000125');
    expect(formatOrderNumber(999999)).toBe('SL-999999');
  });

  it('não repete números quando a sequência avança', () => {
    const numbers = Array.from({ length: 500 }, (_, index) => formatOrderNumber(index + 1));
    expect(new Set(numbers).size).toBe(500);
  });

  it('reconhece números válidos e rejeita o resto', () => {
    expect(isValidOrderNumber('SL-000125')).toBe(true);
    expect(isValidOrderNumber('sl-000125')).toBe(true);
    expect(isValidOrderNumber('SL-125')).toBe(false);
    expect(isValidOrderNumber('000125')).toBe(false);
  });
});

describe('cálculo do total no servidor', () => {
  it('soma os itens e acrescenta a entrega', () => {
    const result = calculateOrderTotal(
      [
        { unitPriceCents: 209900, quantity: 1 },
        { unitPriceCents: 59900, quantity: 2 },
      ],
      25000,
    );

    expect(result.subtotalCents).toBe(329700);
    expect(result.totalCents).toBe(354700);
  });

  it('trata carrinho vazio sem rebentar', () => {
    expect(calculateOrderTotal([])).toEqual({ subtotalCents: 0, totalCents: 0 });
  });
});
