export interface CartItem {
  productId: string;
  slug: string;
  name: string;
  priceCents: number;
  image: string | null;
  stock: number;
  quantity: number;
}

export function cartSubtotal(items: CartItem[]): number {
  return items.reduce((total, item) => total + item.priceCents * item.quantity, 0);
}

export function cartCount(items: CartItem[]): number {
  return items.reduce((total, item) => total + item.quantity, 0);
}

export function cartTotal(items: CartItem[], deliveryFeeCents = 0): number {
  return cartSubtotal(items) + deliveryFeeCents;
}

export function contentIds(items: CartItem[]): string[] {
  return items.map((item) => item.productId);
}

/** Junta quantidades do mesmo produto e nunca ultrapassa o stock disponível. */
export function addToCart(items: CartItem[], incoming: CartItem): CartItem[] {
  const index = items.findIndex((item) => item.productId === incoming.productId);
  if (index === -1) {
    const quantity = Math.min(Math.max(1, incoming.quantity), Math.max(1, incoming.stock));
    return [...items, { ...incoming, quantity }];
  }

  const next = [...items];
  const current = next[index];
  const max = Math.max(1, incoming.stock || current.stock);
  next[index] = {
    ...current,
    ...incoming,
    quantity: Math.min(current.quantity + incoming.quantity, max),
  };
  return next;
}

export function updateQuantity(items: CartItem[], productId: string, quantity: number): CartItem[] {
  if (quantity < 1) return items.filter((item) => item.productId !== productId);
  return items.map((item) =>
    item.productId === productId
      ? { ...item, quantity: Math.min(quantity, Math.max(1, item.stock)) }
      : item,
  );
}

export function removeFromCart(items: CartItem[], productId: string): CartItem[] {
  return items.filter((item) => item.productId !== productId);
}

export interface StockIssue {
  productId: string;
  name: string;
  available: number;
  requested: number;
}

/** Compara o carrinho com o stock atual e devolve os produtos com problema. */
export function checkStockAvailability(
  items: CartItem[],
  stockByProduct: Record<string, number>,
): StockIssue[] {
  const issues: StockIssue[] = [];

  for (const item of items) {
    const available = stockByProduct[item.productId] ?? 0;
    if (available < item.quantity) {
      issues.push({
        productId: item.productId,
        name: item.name,
        available,
        requested: item.quantity,
      });
    }
  }

  return issues;
}
