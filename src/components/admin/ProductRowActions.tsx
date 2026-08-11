'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { deleteProduct, setProductActive } from '@/server/actions/products';

export function ProductRowActions({ id, isActive }: { id: string; isActive: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState('');

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={pending}
        className="text-xs font-semibold text-navy-600 hover:text-orange-600"
        onClick={() =>
          startTransition(async () => {
            const result = await setProductActive(id, !isActive);
            setMessage(result.message);
            router.refresh();
          })
        }
      >
        {isActive ? 'Retirar da loja' : 'Publicar'}
      </button>

      <button
        type="button"
        disabled={pending}
        className="text-xs font-semibold text-red-600 hover:text-red-700"
        onClick={() => {
          if (!window.confirm('Apagar este produto?')) return;
          startTransition(async () => {
            const result = await deleteProduct(id);
            setMessage(result.message);
            router.refresh();
          });
        }}
      >
        Apagar
      </button>

      {message ? <span className="text-xs text-navy-500">{message}</span> : null}
    </div>
  );
}
