'use server';

import { revalidatePath } from 'next/cache';

import { requireAdmin } from '@/lib/auth';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { centsFromInput } from '@/lib/money';
import { productSchema, slugify } from '@/lib/validation';
import { logger } from '@/lib/logger';

export interface ProductActionResult {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string>;
}

function refresh(slug?: string) {
  revalidatePath('/');
  revalidatePath('/produtos');
  revalidatePath('/admin/produtos');
  if (slug) revalidatePath(`/produto/${slug}`);
}

export async function saveProduct(formData: FormData): Promise<ProductActionResult> {
  await requireAdmin();

  const id = (formData.get('id') as string) || undefined;
  const name = (formData.get('name') as string)?.trim() ?? '';
  const slugInput = (formData.get('slug') as string)?.trim() ?? '';

  const parsed = productSchema.safeParse({
    id,
    name,
    slug: slugInput ? slugify(slugInput) : slugify(name),
    sku: (formData.get('sku') as string) ?? '',
    shortDescription: (formData.get('shortDescription') as string) ?? '',
    description: (formData.get('description') as string) ?? '',
    categoryId: (formData.get('categoryId') as string) ?? '',
    priceCents: centsFromInput((formData.get('price') as string) ?? '0'),
    compareAtPriceCents: formData.get('comparePrice')
      ? centsFromInput(formData.get('comparePrice') as string) || null
      : null,
    stock: Number.parseInt((formData.get('stock') as string) ?? '0', 10) || 0,
    images: (formData.getAll('images') as string[]).filter(Boolean),
    isActive: formData.get('isActive') === 'on',
    isFeatured: formData.get('isFeatured') === 'on',
    isNew: formData.get('isNew') === 'on',
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === 'string' && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, message: 'Verifique os campos assinalados.', fieldErrors };
  }

  const values = parsed.data;
  const supabase = createAdminSupabase();

  const row = {
    name: values.name,
    slug: values.slug,
    sku: values.sku || null,
    short_description: values.shortDescription || null,
    description: values.description || null,
    category_id: values.categoryId || null,
    price_cents: values.priceCents,
    compare_at_price_cents: values.compareAtPriceCents ?? null,
    stock: values.stock,
    images: values.images,
    is_active: values.isActive,
    is_featured: values.isFeatured,
    is_new: values.isNew,
  };

  const { error } = values.id
    ? await supabase.from('products').update(row).eq('id', values.id)
    : await supabase.from('products').insert(row);

  if (error) {
    logger.warn('product_save_failed', { reason: error.message });
    return {
      ok: false,
      message: error.message.includes('duplicate')
        ? 'Já existe um produto com este endereço (slug) ou SKU.'
        : 'Não foi possível guardar o produto.',
    };
  }

  logger.info('product_saved', { slug: values.slug, isNew: !values.id });
  refresh(values.slug);
  return { ok: true, message: values.id ? 'Produto atualizado.' : 'Produto criado.' };
}

export async function setProductActive(id: string, isActive: boolean): Promise<ProductActionResult> {
  await requireAdmin();
  const supabase = createAdminSupabase();
  const { error } = await supabase.from('products').update({ is_active: isActive }).eq('id', id);
  if (error) return { ok: false, message: 'Não foi possível alterar o produto.' };
  refresh();
  return { ok: true, message: isActive ? 'Produto publicado.' : 'Produto retirado da loja.' };
}

export async function deleteProduct(id: string): Promise<ProductActionResult> {
  await requireAdmin();
  const supabase = createAdminSupabase();

  // Se o produto já tem vendas, desativa em vez de apagar: os pedidos antigos
  // precisam da referência.
  const { count } = await supabase
    .from('order_items')
    .select('id', { count: 'exact', head: true })
    .eq('product_id', id);

  if ((count ?? 0) > 0) {
    await supabase.from('products').update({ is_active: false }).eq('id', id);
    refresh();
    return { ok: true, message: 'Produto com vendas registadas: foi desativado em vez de apagado.' };
  }

  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) return { ok: false, message: 'Não foi possível apagar o produto.' };
  refresh();
  return { ok: true, message: 'Produto apagado.' };
}

export async function uploadProductImage(formData: FormData): Promise<{ ok: boolean; url?: string; message: string }> {
  await requireAdmin();

  const file = formData.get('file') as File | null;
  if (!file || file.size === 0) return { ok: false, message: 'Escolha uma imagem.' };
  if (file.size > 5 * 1024 * 1024) return { ok: false, message: 'A imagem não pode passar de 5 MB.' };
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(file.type)) {
    return { ok: false, message: 'Formatos aceites: JPG, PNG, WebP ou AVIF.' };
  }

  const supabase = createAdminSupabase();
  const extension = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
  const path = `produtos/${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage
    .from('produtos')
    .upload(path, file, { contentType: file.type, upsert: false });

  if (error) return { ok: false, message: `Falha ao carregar a imagem: ${error.message}` };

  const { data } = supabase.storage.from('produtos').getPublicUrl(path);
  return { ok: true, url: data.publicUrl, message: 'Imagem carregada.' };
}
