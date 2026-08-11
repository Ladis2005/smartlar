import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="container-page py-20">
      <div className="mx-auto max-w-md text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-orange-600">Erro 404</p>
        <h1 className="mt-2 text-2xl font-extrabold text-navy-900">Esta página não existe</h1>
        <p className="mt-2 text-sm text-navy-600">
          O endereço pode ter mudado ou o produto já não está disponível.
        </p>
        <Link href="/produtos" className="btn-primary mt-6 inline-flex">
          Ver produtos
        </Link>
      </div>
    </div>
  );
}
