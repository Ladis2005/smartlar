/**
 * Formato do número de encomenda. Espelha a função SQL next_order_number(),
 * que é a fonte de verdade: usa uma sequência do Postgres, por isso o número
 * nunca se repete mesmo com pedidos simultâneos.
 */
export function formatOrderNumber(sequence: number): string {
  return `SL-${String(Math.max(1, Math.trunc(sequence))).padStart(6, '0')}`;
}

export function isValidOrderNumber(value: string): boolean {
  return /^SL-\d{6,}$/.test(value.trim().toUpperCase());
}

/** Total calculado no servidor: subtotal dos itens + taxa de entrega. */
export function calculateOrderTotal(
  items: { unitPriceCents: number; quantity: number }[],
  deliveryFeeCents = 0,
): { subtotalCents: number; totalCents: number } {
  const subtotalCents = items.reduce((total, item) => total + item.unitPriceCents * item.quantity, 0);
  return { subtotalCents, totalCents: subtotalCents + deliveryFeeCents };
}
