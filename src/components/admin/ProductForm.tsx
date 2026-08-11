'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { ProductImage } from '@/components/ProductImage';
import { saveProduct, uploadProductImage } from '@/server/actions/products';
import { slugify } from '@/lib/validation';
import type { Category, Product } from '@/lib/types';

interface Props {
  product?: Product | null;
  categories: Category[];
}

function toAmount(cents?: number | null): string {
  if (!cents) return '';
  return (cents / 100).toFixed(2).replace('.', ',');
}

export function ProductForm({ product, categories }: Props) {
  const router = useRouter();
  const [images, setImages] = useState<string[]>(product?.images ?? []);
  const [slug, setSlug] = useState(product?.slug ?? '');
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  async function handleUpload(file: File | null) {
    if (!file) return;
    setUploading(true);
    setMessage('');

    const body = new FormData();
    body.append('file', file);
    const result = await uploadProductImage(body);

    if (result.ok && result.url) setImages((current) => [...current, result.url as string]);
    else setMessage(result.message);

    setUploading(false);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    setErrors({});

    const formData = new FormData(event.currentTarget);
    images.forEach((image) => formData.append('images', image));

    const result = await saveProduct(formData);
    setMessage(result.message);
    setErrors(result.fieldErrors ?? {});
    setSaving(false);

    if (result.ok) {
      router.push('/admin/produtos');
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {product?.id ? <input type="hidden" name="id" value={product.id} /> : null}

      <section className="card space-y-4 p-5">
        <div>
          <label className="label" htmlFor="name">
            Nome *
          </label>
          <input
            id="name"
            name="name"
            className="field"
            defaultValue={product?.name ?? ''}
            onChange={(event) => {
              if (!product?.id) setSlug(slugify(event.target.value));
            }}
            required
          />
          {errors.name ? <p className="mt-1 text-xs text-red-600">{errors.name}</p> : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="slug">
              Endereço na loja (slug) *
            </label>
            <input
              id="slug"
              name="slug"
              className="field"
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
              required
            />
            {errors.slug ? <p className="mt-1 text-xs text-red-600">{errors.slug}</p> : null}
          </div>

          <div>
            <label className="label" htmlFor="sku">
              SKU
            </label>
            <input id="sku" name="sku" className="field" defaultValue={product?.sku ?? ''} />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="shortDescription">
            Descrição curta
          </label>
          <input
            id="shortDescription"
            name="shortDescription"
            className="field"
            defaultValue={product?.short_description ?? ''}
            placeholder="Uma linha que aparece na listagem"
          />
        </div>

        <div>
          <label className="label" htmlFor="description">
            Descrição
          </label>
          <textarea
            id="description"
            name="description"
            className="field min-h-32"
            defaultValue={product?.description ?? ''}
          />
        </div>
      </section>

      <section className="card space-y-4 p-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="price">
              Preço (MT) *
            </label>
            <input
              id="price"
              name="price"
              className="field"
              inputMode="decimal"
              defaultValue={toAmount(product?.price_cents)}
              placeholder="2099,00"
              required
            />
            {errors.priceCents ? <p className="mt-1 text-xs text-red-600">{errors.priceCents}</p> : null}
          </div>

          <div>
            <label className="label" htmlFor="comparePrice">
              Preço anterior (MT)
            </label>
            <input
              id="comparePrice"
              name="comparePrice"
              className="field"
              inputMode="decimal"
              defaultValue={toAmount(product?.compare_at_price_cents)}
              placeholder="Opcional"
            />
          </div>

          <div>
            <label className="label" htmlFor="stock">
              Stock *
            </label>
            <input
              id="stock"
              name="stock"
              type="number"
              min={0}
              className="field"
              defaultValue={product?.stock ?? 0}
              required
            />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="categoryId">
            Categoria
          </label>
          <select id="categoryId" name="categoryId" className="field" defaultValue={product?.category_id ?? ''}>
            <option value="">Sem categoria</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap gap-6 pt-2">
          <label className="flex items-center gap-2 text-sm text-navy-800">
            <input type="checkbox" name="isActive" defaultChecked={product?.is_active ?? true} className="h-4 w-4" />
            Visível na loja
          </label>
          <label className="flex items-center gap-2 text-sm text-navy-800">
            <input type="checkbox" name="isFeatured" defaultChecked={product?.is_featured ?? false} className="h-4 w-4" />
            Produto em destaque
          </label>
          <label className="flex items-center gap-2 text-sm text-navy-800">
            <input type="checkbox" name="isNew" defaultChecked={product?.is_new ?? false} className="h-4 w-4" />
            Novidade
          </label>
        </div>
      </section>

      <section className="card space-y-4 p-5">
        <h2 className="text-sm font-bold uppercase tracking-wide text-navy-500">Fotografias</h2>

        {images.length > 0 ? (
          <ul className="flex flex-wrap gap-3">
            {images.map((image, index) => (
              <li key={image} className="relative">
                <div className="relative h-20 w-20 overflow-hidden rounded-xl border border-navy-100 bg-navy-50">
                  <ProductImage src={image} alt={`Fotografia ${index + 1}`} sizes="80px" />
                </div>
                <button
                  type="button"
                  onClick={() => setImages((current) => current.filter((item) => item !== image))}
                  className="mt-1 w-full text-center text-xs text-navy-500 hover:text-red-600"
                >
                  Remover
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-navy-500">Ainda sem fotografias. A loja mostra um marcador neutro.</p>
        )}

        <input
          type="file"
          accept="image/*"
          disabled={uploading}
          onChange={(event) => handleUpload(event.target.files?.[0] ?? null)}
          className="field py-2.5 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-navy-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-navy-800"
        />
        {uploading ? <p className="text-xs text-navy-500">A carregar…</p> : null}
      </section>

      {message ? (
        <p role="status" className="rounded-xl bg-navy-50 px-4 py-3 text-sm text-navy-800">
          {message}
        </p>
      ) : null}

      <div className="flex gap-3">
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'A guardar…' : 'Guardar produto'}
        </button>
        <button type="button" className="btn-outline" onClick={() => router.push('/admin/produtos')}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
