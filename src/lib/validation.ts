import { z } from 'zod';

export const PROVINCES = [
  'Maputo Cidade',
  'Maputo Província',
  'Gaza',
  'Inhambane',
  'Sofala',
  'Manica',
  'Tete',
  'Zambézia',
  'Nampula',
  'Cabo Delgado',
  'Niassa',
] as const;

export const DELIVERY_CITIES = ['Maputo', 'Matola'] as const;

/**
 * Aceita 84xxxxxxx, +258 84xxxxxxx, 258 84xxxxxxx e devolve sempre 9 dígitos
 * (formato local moçambicano).
 */
export function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (digits.startsWith('258') && digits.length === 12) return digits.slice(3);
  if (digits.startsWith('00258') && digits.length === 14) return digits.slice(5);
  return digits;
}

export function isValidMozPhone(input: string): boolean {
  return /^8[234567]\d{7}$/.test(normalizePhone(input));
}

/** Converte para o formato internacional exigido pela API do WhatsApp: 2588XXXXXXXX. */
export function toInternationalPhone(input: string): string {
  const local = normalizePhone(input);
  return local.length === 9 ? `258${local}` : local;
}

const phoneField = z
  .string()
  .trim()
  .min(1, 'Indique o número de telefone.')
  .refine(isValidMozPhone, 'Número inválido. Use o formato 84XXXXXXX.')
  .transform(normalizePhone);

const optionalPhoneField = z
  .string()
  .trim()
  .transform((value) => (value ? normalizePhone(value) : ''))
  .refine((value) => value === '' || /^8[234567]\d{7}$/.test(value), 'Número alternativo inválido.');

export const checkoutItemSchema = z.object({
  productId: z.string().uuid('Produto inválido.'),
  quantity: z.number().int().min(1, 'Quantidade mínima: 1.').max(50, 'Quantidade máxima por produto: 50.'),
});

export const checkoutSchema = z.object({
  name: z.string().trim().min(3, 'Escreva o nome completo.').max(120),
  phone: phoneField,
  alternativePhone: optionalPhoneField.optional().default(''),
  province: z.string().trim().min(2, 'Escolha a província.').max(60),
  city: z.string().trim().min(2, 'Indique a cidade ou distrito.').max(60),
  neighborhood: z.string().trim().min(2, 'Indique o bairro.').max(80),
  addressReference: z.string().trim().min(5, 'Indique a morada ou um ponto de referência.').max(300),
  notes: z.string().trim().max(500).optional().default(''),
  paymentMethod: z.enum(['mpesa', 'emola', 'cod'], { errorMap: () => ({ message: 'Escolha a forma de pagamento.' }) }),
  payerPhone: optionalPhoneField.optional().default(''),
  transactionReference: z.string().trim().max(60).optional().default(''),
  receiptUrl: z.string().trim().max(500).optional().default(''),
  items: z.array(checkoutItemSchema).min(1, 'O carrinho está vazio.').max(30),
  idempotencyKey: z.string().uuid(),
});

export type CheckoutInput = z.input<typeof checkoutSchema>;
export type CheckoutData = z.output<typeof checkoutSchema>;

export const productSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2, 'Indique o nome do produto.').max(160),
  slug: z
    .string()
    .trim()
    .min(2, 'Indique o endereço (slug).')
    .max(160)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use apenas minúsculas, números e hífens.'),
  sku: z.string().trim().max(60).optional().default(''),
  shortDescription: z.string().trim().max(300).optional().default(''),
  description: z.string().trim().max(4000).optional().default(''),
  categoryId: z.string().uuid().optional().or(z.literal('')),
  priceCents: z.number().int().min(0, 'O preço não pode ser negativo.'),
  compareAtPriceCents: z.number().int().min(0).nullable().optional(),
  stock: z.number().int().min(0, 'O stock não pode ser negativo.'),
  images: z.array(z.string().url()).max(8).default([]),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  isNew: z.boolean().default(false),
});

export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}
