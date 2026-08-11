'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

import { ProductImage } from './ProductImage';
import { useCartStore } from '@/lib/cart-store';
import { cartCount, cartSubtotal, contentIds } from '@/lib/cart';
import { formatMzn } from '@/lib/money';
import { trackInitiateCheckout } from '@/lib/pixel';
import { PROVINCES, DELIVERY_CITIES } from '@/lib/validation';
import { createOrderAction } from '@/server/actions/checkout';
import type { PaymentMethod, SiteSettings } from '@/lib/types';

interface Props {
  settings: SiteSettings;
}

const initialForm = {
  name: '',
  phone: '',
  alternativePhone: '',
  province: 'Maputo Cidade',
  city: 'Maputo',
  neighborhood: '',
  addressReference: '',
  notes: '',
  payerPhone: '',
  transactionReference: '',
};

export function CheckoutForm({ settings }: Props) {
  const router = useRouter();
  const items = useCartStore((state) => state.items);
  const hydrated = useCartStore((state) => state.hydrated);
  const clear = useCartStore((state) => state.clear);

  const [form, setForm] = useState(initialForm);
  const [method, setMethod] = useState<PaymentMethod | ''>('');
  const [receiptPath, setReceiptPath] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Uma chave por tentativa de compra: se o botão for clicado duas vezes ou a
  // ligação cair a meio, o servidor devolve a mesma encomenda em vez de criar outra.
  const idempotencyKey = useRef<string>('');
  if (!idempotencyKey.current && typeof crypto !== 'undefined') {
    idempotencyKey.current = crypto.randomUUID();
  }

  const subtotal = useMemo(() => cartSubtotal(items), [items]);
  const deliveryFee = settings.delivery_fee_cents ?? 0;
  const total = subtotal + deliveryFee;
  const count = cartCount(items);

  const trackedRef = useRef(false);
  useEffect(() => {
    if (!hydrated || trackedRef.current || items.length === 0) return;
    trackedRef.current = true;
    trackInitiateCheckout({ contentIds: contentIds(items), valueCents: subtotal, numItems: count });
  }, [hydrated, items, subtotal, count]);

  useEffect(() => {
    if (hydrated && items.length === 0 && !submitting) {
      router.replace('/carrinho');
    }
  }, [hydrated, items.length, submitting, router]);

  function update(field: keyof typeof initialForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: '' }));
  }

  async function handleReceipt(file: File | null) {
    if (!file) return;
    setUploading(true);
    setUploadMessage('');

    const body = new FormData();
    body.append('file', file);

    try {
      const response = await fetch('/api/comprovativo', { method: 'POST', body });
      const data = (await response.json()) as { ok: boolean; path?: string; message?: string };
      if (data.ok && data.path) {
        setReceiptPath(data.path);
        setUploadMessage('Comprovativo anexado.');
      } else {
        setUploadMessage(data.message ?? 'Não foi possível anexar o comprovativo.');
      }
    } catch {
      setUploadMessage('Não foi possível anexar o comprovativo. Pode enviá-lo depois por WhatsApp.');
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;

    setError('');
    setFieldErrors({});

    if (!method) {
      setError('Escolha a forma de pagamento.');
      return;
    }

    setSubmitting(true);

    const result = await createOrderAction({
      ...form,
      paymentMethod: method,
      receiptUrl: receiptPath,
      items: items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
      idempotencyKey: idempotencyKey.current,
    });

    if (!result.ok) {
      setError(result.error);
      setFieldErrors(result.fieldErrors ?? {});
      setSubmitting(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    clear();
    router.push(`/pedido-confirmado/${result.orderNumber}?t=${result.purchaseEventId}`);
  }

  if (!hydrated) {
    return <div className="card h-64 animate-pulse bg-navy-50" aria-hidden />;
  }

  if (items.length === 0) {
    return (
      <div className="card px-6 py-12 text-center">
        <p className="text-base font-semibold text-navy-900">O carrinho está vazio</p>
        <Link href="/produtos" className="btn-primary mt-4 inline-flex">
          Ver produtos
        </Link>
      </div>
    );
  }

  const paymentNumber =
    method === 'mpesa' ? settings.mpesa_number : method === 'emola' ? settings.emola_number : null;
  const isWalletMethod = method === 'mpesa' || method === 'emola';

  return (
    <form onSubmit={handleSubmit} className="grid gap-8 lg:grid-cols-[1.3fr_1fr] lg:items-start">
      <div className="space-y-6">
        {error ? (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <section className="card p-5">
          <h2 className="text-base font-bold text-navy-900">Dados do cliente</h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label" htmlFor="name">
                Nome completo *
              </label>
              <input
                id="name"
                className="field"
                value={form.name}
                onChange={(event) => update('name', event.target.value)}
                autoComplete="name"
                required
              />
              {fieldErrors.name ? <p className="mt-1 text-xs text-red-600">{fieldErrors.name}</p> : null}
            </div>

            <div>
              <label className="label" htmlFor="phone">
                Telefone / WhatsApp *
              </label>
              <input
                id="phone"
                className="field"
                inputMode="tel"
                placeholder="84XXXXXXX"
                value={form.phone}
                onChange={(event) => update('phone', event.target.value)}
                autoComplete="tel"
                required
              />
              {fieldErrors.phone ? <p className="mt-1 text-xs text-red-600">{fieldErrors.phone}</p> : null}
            </div>

            <div>
              <label className="label" htmlFor="alternativePhone">
                Telefone alternativo
              </label>
              <input
                id="alternativePhone"
                className="field"
                inputMode="tel"
                placeholder="Opcional"
                value={form.alternativePhone}
                onChange={(event) => update('alternativePhone', event.target.value)}
              />
              {fieldErrors.alternativePhone ? (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.alternativePhone}</p>
              ) : null}
            </div>
          </div>
        </section>

        <section className="card p-5">
          <h2 className="text-base font-bold text-navy-900">Entrega</h2>
          <p className="mt-1 text-xs text-navy-500">
            Entregamos em {settings.delivery_areas.join(' e ')}. Para outras zonas, falamos consigo antes de enviar.
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="province">
                Província *
              </label>
              <select
                id="province"
                className="field"
                value={form.province}
                onChange={(event) => update('province', event.target.value)}
                required
              >
                {PROVINCES.map((province) => (
                  <option key={province} value={province}>
                    {province}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label" htmlFor="city">
                Cidade / Distrito *
              </label>
              <input
                id="city"
                className="field"
                list="cidades"
                value={form.city}
                onChange={(event) => update('city', event.target.value)}
                required
              />
              <datalist id="cidades">
                {DELIVERY_CITIES.map((city) => (
                  <option key={city} value={city} />
                ))}
              </datalist>
              {fieldErrors.city ? <p className="mt-1 text-xs text-red-600">{fieldErrors.city}</p> : null}
            </div>

            <div>
              <label className="label" htmlFor="neighborhood">
                Bairro *
              </label>
              <input
                id="neighborhood"
                className="field"
                value={form.neighborhood}
                onChange={(event) => update('neighborhood', event.target.value)}
                required
              />
              {fieldErrors.neighborhood ? (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.neighborhood}</p>
              ) : null}
            </div>

            <div>
              <label className="label" htmlFor="addressReference">
                Morada / ponto de referência *
              </label>
              <input
                id="addressReference"
                className="field"
                placeholder="Ex.: Av. Julius Nyerere, próximo ao mercado"
                value={form.addressReference}
                onChange={(event) => update('addressReference', event.target.value)}
                required
              />
              {fieldErrors.addressReference ? (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.addressReference}</p>
              ) : null}
            </div>

            <div className="sm:col-span-2">
              <label className="label" htmlFor="notes">
                Observações
              </label>
              <textarea
                id="notes"
                className="field min-h-20"
                placeholder="Alguma indicação para a entrega? (opcional)"
                value={form.notes}
                onChange={(event) => update('notes', event.target.value)}
              />
            </div>
          </div>
        </section>

        <section className="card p-5">
          <h2 className="text-base font-bold text-navy-900">Pagamento</h2>
          <p className="mt-1 text-xs text-navy-500">Escolha como quer pagar.</p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {settings.mpesa_enabled && settings.mpesa_number ? (
              <PaymentCard
                selected={method === 'mpesa'}
                onSelect={() => setMethod('mpesa')}
                title="M-Pesa"
                subtitle="Vodacom"
                number={settings.mpesa_number}
              />
            ) : null}
            {settings.emola_enabled && settings.emola_number ? (
              <PaymentCard
                selected={method === 'emola'}
                onSelect={() => setMethod('emola')}
                title="e-Mola"
                subtitle="Movitel"
                number={settings.emola_number}
              />
            ) : null}
            {settings.cod_enabled ? (
              <PaymentCard
                selected={method === 'cod'}
                onSelect={() => setMethod('cod')}
                title="Na entrega"
                subtitle="Dinheiro"
                number="Pague ao receber"
              />
            ) : null}
          </div>

          {method === 'cod' ? (
            <div className="mt-5 rounded-2xl border border-orange-200 bg-orange-50 p-4">
              <p className="text-sm font-semibold text-navy-900">Pagamento na entrega</p>
              <p className="mt-2 text-sm text-navy-700">
                Vai pagar <strong>{formatMzn(total)}</strong> em dinheiro, diretamente ao entregador, no momento em
                que receber a encomenda.
              </p>
            </div>
          ) : null}

          {isWalletMethod && paymentNumber ? (
            <div className="mt-5 rounded-2xl border border-orange-200 bg-orange-50 p-4">
              <p className="text-sm font-semibold text-navy-900">Efetue o pagamento para:</p>
              <p className="mt-1 text-2xl font-extrabold tracking-wide text-navy-900">{paymentNumber}</p>
              <p className="mt-2 text-sm text-navy-700">
                Valor a transferir: <strong>{formatMzn(total)}</strong>
              </p>
              <p className="mt-2 text-xs text-navy-600">
                Depois de transferir, preencha os campos abaixo. O pagamento é confirmado por nós antes do envio.
              </p>
            </div>
          ) : null}

          {isWalletMethod ? (
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="payerPhone">
                  Número usado no pagamento
                </label>
                <input
                  id="payerPhone"
                  className="field"
                  inputMode="tel"
                  placeholder="84XXXXXXX"
                  value={form.payerPhone}
                  onChange={(event) => update('payerPhone', event.target.value)}
                />
                {fieldErrors.payerPhone ? (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.payerPhone}</p>
                ) : null}
              </div>

              <div>
                <label className="label" htmlFor="transactionReference">
                  ID / referência da transação
                </label>
                <input
                  id="transactionReference"
                  className="field"
                  placeholder="Ex.: CI250809.2130.A12345"
                  value={form.transactionReference}
                  onChange={(event) => update('transactionReference', event.target.value)}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="label" htmlFor="receipt">
                  Comprovativo (opcional)
                </label>
                <input
                  id="receipt"
                  type="file"
                  accept="image/*,application/pdf"
                  className="field py-2.5 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-navy-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-navy-800"
                  onChange={(event) => handleReceipt(event.target.files?.[0] ?? null)}
                  disabled={uploading}
                />
                {uploading ? <p className="mt-1 text-xs text-navy-500">A carregar…</p> : null}
                {uploadMessage ? <p className="mt-1 text-xs text-navy-600">{uploadMessage}</p> : null}
              </div>
            </div>
          ) : null}
        </section>
      </div>

      <aside className="card sticky top-32 space-y-4 p-5">
        <h2 className="text-base font-bold text-navy-900">Resumo da compra</h2>

        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.productId} className="flex gap-3">
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-navy-50">
                <ProductImage src={item.image} alt={item.name} sizes="56px" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm font-medium text-navy-900">{item.name}</p>
                <p className="text-xs text-navy-500">
                  {item.quantity} × {formatMzn(item.priceCents)}
                </p>
              </div>
              <p className="text-sm font-semibold text-navy-900">{formatMzn(item.priceCents * item.quantity)}</p>
            </li>
          ))}
        </ul>

        <dl className="space-y-2 border-t border-navy-100 pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-navy-600">Subtotal</dt>
            <dd className="font-semibold text-navy-900">{formatMzn(subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-navy-600">Entrega</dt>
            <dd className="font-semibold text-navy-900">
              {deliveryFee > 0 ? formatMzn(deliveryFee) : 'A combinar'}
            </dd>
          </div>
          <div className="flex justify-between border-t border-navy-100 pt-3 text-base">
            <dt className="font-bold text-navy-900">Total</dt>
            <dd className="font-extrabold text-navy-900">{formatMzn(total)}</dd>
          </div>
        </dl>

        <button type="submit" className="btn-primary w-full text-base" disabled={submitting}>
          {submitting ? 'A registar o pedido…' : 'FINALIZAR PEDIDO'}
        </button>

        <p className="text-center text-xs text-navy-500">
          Ao finalizar, guardamos o seu pedido e entramos em contacto para confirmar a entrega.
        </p>
      </aside>
    </form>
  );
}

function PaymentCard({
  selected,
  onSelect,
  title,
  subtitle,
  number,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  subtitle: string;
  number: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`flex items-center gap-3 rounded-2xl border-2 p-4 text-left transition ${
        selected ? 'border-orange-500 bg-orange-50' : 'border-navy-100 bg-white hover:border-navy-300'
      }`}
    >
      <span
        aria-hidden
        className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold ${
          selected ? 'bg-orange-500 text-white' : 'bg-navy-100 text-navy-700'
        }`}
      >
        {title.slice(0, 1)}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-bold text-navy-900">{title}</span>
        <span className="block text-xs text-navy-500">{subtitle}</span>
        <span className="mt-0.5 block text-xs font-semibold text-navy-700">{number}</span>
      </span>
    </button>
  );
}
