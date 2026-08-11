'use server';

import { revalidatePath } from 'next/cache';

import { requireAdmin } from '@/lib/auth';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { centsFromInput } from '@/lib/money';

export interface SettingsResult {
  ok: boolean;
  message: string;
}

export async function saveSiteSettings(formData: FormData): Promise<SettingsResult> {
  await requireAdmin();
  const supabase = createAdminSupabase();

  const areas = ((formData.get('deliveryAreas') as string) ?? '')
    .split(',')
    .map((area) => area.trim())
    .filter(Boolean);

  const { error } = await supabase
    .from('site_settings')
    .update({
      store_name: ((formData.get('storeName') as string) ?? 'SmartLar').trim(),
      tagline: ((formData.get('tagline') as string) ?? '').trim(),
      contact_whatsapp: ((formData.get('contactWhatsapp') as string) ?? '').replace(/\D/g, '') || null,
      contact_email: ((formData.get('contactEmail') as string) ?? '').trim() || null,
      mpesa_number: ((formData.get('mpesaNumber') as string) ?? '').replace(/\D/g, '') || null,
      emola_number: ((formData.get('emolaNumber') as string) ?? '').replace(/\D/g, '') || null,
      mpesa_enabled: formData.get('mpesaEnabled') === 'on',
      emola_enabled: formData.get('emolaEnabled') === 'on',
      cod_enabled: formData.get('codEnabled') === 'on',
      delivery_fee_cents: centsFromInput((formData.get('deliveryFee') as string) ?? '0'),
      delivery_areas: areas.length ? areas : ['Maputo', 'Matola'],
      announcement: ((formData.get('announcement') as string) ?? '').trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', 1);

  if (error) return { ok: false, message: 'Não foi possível guardar as configurações.' };

  revalidatePath('/');
  revalidatePath('/checkout');
  revalidatePath('/admin/configuracoes');
  return { ok: true, message: 'Configurações guardadas.' };
}
