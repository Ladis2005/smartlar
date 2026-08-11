import { SettingsForm } from '@/components/admin/SettingsForm';
import { getAdminSettings } from '@/server/admin-data';
import { getWhatsAppConfigStatus } from '@/lib/whatsapp/provider';
import { isCapiConfigured } from '@/lib/meta-capi';
import { hasServiceRole } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export default async function AdminSettingsPage() {
  const settings = await getAdminSettings();
  const whatsapp = getWhatsAppConfigStatus();

  const integrations = [
    { name: 'Supabase (base de dados)', ok: hasServiceRole(), detail: 'NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY' },
    {
      name: 'WhatsApp Business API',
      ok: whatsapp.configured,
      detail: whatsapp.configured ? 'Notificações ativas' : `Em falta: ${whatsapp.missing.join(', ')}`,
    },
    {
      name: 'Mensagem ao cliente',
      ok: whatsapp.customerMessagesEnabled,
      detail: 'WHATSAPP_CUSTOMER_TEMPLATE_NAME (template aprovado pela Meta)',
    },
    {
      name: 'Meta Pixel',
      ok: Boolean(process.env.NEXT_PUBLIC_META_PIXEL_ID),
      detail: 'NEXT_PUBLIC_META_PIXEL_ID',
    },
    { name: 'Meta Conversions API', ok: isCapiConfigured(), detail: 'META_CAPI_PIXEL_ID + META_CAPI_ACCESS_TOKEN' },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-extrabold text-navy-900">Configurações</h1>

      <section className="card p-5">
        <h2 className="text-sm font-bold uppercase tracking-wide text-navy-500">Integrações</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {integrations.map((integration) => (
            <li key={integration.name} className="flex flex-wrap items-center gap-2">
              <span className={`badge ${integration.ok ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                {integration.ok ? 'Configurado' : 'Por configurar'}
              </span>
              <span className="font-medium text-navy-900">{integration.name}</span>
              <span className="text-xs text-navy-500">{integration.detail}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-navy-500">
          As chaves e tokens vivem apenas nas variáveis de ambiente do servidor. Nada disto é guardado na base de
          dados nem chega ao navegador.
        </p>
      </section>

      <SettingsForm settings={settings} />
    </div>
  );
}
