import { describe, it, expect } from 'vitest';

import {
  addToCart,
  cartCount,
  cartSubtotal,
  cartTotal,
  checkStockAvailability,
  removeFromCart,
  updateQuantity,
  type CartItem,
} from '@/lib/cart';

function item(overrides: Partial<CartItem> = {}): CartItem {
  return {
    productId: 'p1',
    slug: 'irrigador-oral-eletrico',
    name: 'Irrigador Oral Elétrico',
    priceCents: 209900,
    image: null,
    stock: 10,
    quantity: 1,
    ...overrides,
  };
}

describe('carrinho', () => {
  it('adiciona um produto novo', () => {
    const items = addToCart([], item());
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(1);
  });

  it('junta quantidades do mesmo produto em vez de duplicar a linha', () => {
    const items = addToCart(addToCart([], item({ quantity: 2 })), item({ quantity: 3 }));
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(5);
  });

  it('nunca deixa a quantidade passar do stock disponível', () => {
    const items = addToCart([], item({ quantity: 25, stock: 4 }));
    expect(items[0].quantity).toBe(4);

    const updated = updateQuantity(items, 'p1', 99);
    expect(updated[0].quantity).toBe(4);
  });

  it('remove a linha quando a quantidade desce abaixo de 1', () => {
    const items = addToCart([], item());
    expect(updateQuantity(items, 'p1', 0)).toHaveLength(0);
    expect(removeFromCart(items, 'p1')).toHaveLength(0);
  });

  it('calcula subtotal, contagem e total com entrega', () => {
    const items = [item({ quantity: 2 }), item({ productId: 'p2', priceCents: 59900, quantity: 3 })];
    expect(cartSubtotal(items)).toBe(2 * 209900 + 3 * 59900);
    expect(cartCount(items)).toBe(5);
    expect(cartTotal(items, 25000)).toBe(cartSubtotal(items) + 25000);
  });

  it('assinala produtos sem stock suficiente', () => {
    const items = [item({ quantity: 3 }), item({ productId: 'p2', name: 'Air Fryer', quantity: 1 })];
    const issues = checkStockAvailability(items, { p1: 2, p2: 5 });

    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ productId: 'p1', available: 2, requested: 3 });
  });
});
