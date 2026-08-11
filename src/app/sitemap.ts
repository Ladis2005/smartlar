import type { MetadataRoute } from 'next';

import { getAllProductSlugs, getCategories } from '@/lib/queries';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const [products, categories] = await Promise.all([getAllProductSlugs(), getCategories()]);

  return [
    { url: base, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/produtos`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/rastrear-pedido`, changeFrequency: 'monthly', priority: 0.3 },
    ...categories.map((category) => ({
      url: `${base}/categorias/${category.slug}`,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
    ...products.map((product) => ({
      url: `${base}/produto/${product.slug}`,
      lastModified: product.created_at ? new Date(product.created_at) : undefined,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ];
}
