import { ProductForm } from '@/components/admin/ProductForm';
import { listAdminCategories } from '@/server/admin-data';

export const dynamic = 'force-dynamic';

export default async function NewProductPage() {
  const categories = await listAdminCategories();

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-extrabold text-navy-900">Novo produto</h1>
      <ProductForm categories={categories} />
    </div>
  );
}
