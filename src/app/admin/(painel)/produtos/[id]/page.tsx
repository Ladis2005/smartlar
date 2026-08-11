import { notFound } from 'next/navigation';

import { ProductForm } from '@/components/admin/ProductForm';
import { getAdminProduct, listAdminCategories } from '@/server/admin-data';

export const dynamic = 'force-dynamic';

export default async function EditProductPage({ params }: { params: { id: string } }) {
  const [product, categories] = await Promise.all([getAdminProduct(params.id), listAdminCategories()]);
  if (!product) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-extrabold text-navy-900">Editar produto</h1>
      <ProductForm product={product} categories={categories} />
    </div>
  );
}
