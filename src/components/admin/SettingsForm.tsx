'use client';

import { useState } from 'react';

import { saveSiteSettings } from '@/server/actions/settings';
import type { SiteSettings } from '@/lib/types';

function toAmount(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',');
}

export function SettingsForm({ settings }: { settings: SiteSettings }) {
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const result = await saveSiteSettings(new FormData(event.currentTarget));
    setMessage(result.message);
    setSaving(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="card space-y-4 p-5">
        <h2 className="text-sm font-bold uppercase tracking-wide text-navy-500">Loja</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="storeName">
              Nome da loja
            </label>
            <input id="storeName" name="storeName" className="field" defaultValue={settings.store_name} />
          </div>
          <div>
            <label className="label" htmlFor="tagline">
              Slogan
            </label>
            <input id="tagline" name="tagline" className="field" defaultValue={settings.tagline} />
          </div>
          <div>
            <label className="label" htmlFor="contactWhatsapp">
              WhatsApp de contacto
            </label>
            <input
              id="contactWhatsapp"
              name="contactWhatsapp"
              className="field"
              defaultValue={settings.contact_whatsapp ?? ''}
              placeholder="84XXXXXXX"
            />
          </div>
          <div>
            <label className="label" htmlFor="contactEmail">
              E-mail de contacto
            </label>
            <input id="contactEmail" name="contactEmail" type="email" className="field" defaultValue={settings.contact_email ?? ''} />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="announcement">
              Aviso no topo do site
            </label>
            <input
              id="announcement"
              name="announcement"
              className="field"
              defaultValue={settings.announcement ?? ''}
              placeholder="Ex.: Entregas grátis em Maputo esta semana"
            />
          </div>
        </div>
      </section>

      <section className="card space-y-4 p-5">
        <h2 className="text-sm font-bold uppercase tracking-wide text-navy-500">Pagamentos</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="mpesaNumber">
              Número M-Pesa
            </label>
            <input id="mpesaNumber" name="mpesaNumber" className="field" defaultValue={settings.mpesa_number ?? ''} />
            <label className="mt-2 flex items-center gap-2 text-sm text-navy-800">
              <input type="checkbox" name="mpesaEnabled" defaultChecked={settings.mpesa_enabled} className="h-4 w-4" />
              Aceitar M-Pesa
            </label>
          </div>

          <div>
            <label className="label" htmlFor="emolaNumber">
              Número e-Mola
            </label>
            <input id="emolaNumber" name="emolaNumber" className="field" defaultValue={settings.emola_number ?? ''} />
            <label className="mt-2 flex items-center gap-2 text-sm text-navy-800">
              <input type="checkbox" name="emolaEnabled" defaultChecked={settings.emola_enabled} className="h-4 w-4" />
              Aceitar e-Mola
            </label>
          </div>

          <div>
            <p className="label">Pagamento na entrega</p>
            <p className="mt-1 text-xs text-navy-500">Cliente paga em dinheiro ao entregador.</p>
            <label className="mt-2 flex items-center gap-2 text-sm text-navy-800">
              <input type="checkbox" name="codEnabled" defaultChecked={settings.cod_enabled} className="h-4 w-4" />
              Aceitar pagamento na entrega
            </label>
          </div>
        </div>
      </section>

      <section className="card space-y-4 p-5">
        <h2 className="text-sm font-bold uppercase tracking-wide text-navy-500">Entrega</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="deliveryFee">
              Taxa de entrega (MT)
            </label>
            <input
              id="deliveryFee"
              name="deliveryFee"
              className="field"
              inputMode="decimal"
              defaultValue={toAmount(settings.delivery_fee_cents)}
            />
            <p className="mt-1 text-xs text-navy-500">Use 0 para combinar a entrega com cada cliente.</p>
          </div>

          <div>
            <label className="label" htmlFor="deliveryAreas">
              Zonas de entrega
            </label>
            <input
              id="deliveryAreas"
              name="deliveryAreas"
              className="field"
              defaultValue={settings.delivery_areas.join(', ')}
              placeholder="Maputo, Matola"
            />
          </div>
        </div>
      </section>

      {message ? (
        <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {message}
        </p>
      ) : null}

      <button type="submit" className="btn-primary" disabled={saving}>
        {saving ? 'A guardar…' : 'Guardar configurações'}
      </button>
    </form>
  );
}
