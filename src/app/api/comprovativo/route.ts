import { NextResponse } from 'next/server';

import { createAdminSupabase, hasServiceRole } from '@/lib/supabase/admin';
import { rateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

/**
 * Recebe o comprovativo de pagamento e guarda-o no bucket privado
 * "comprovativos". Devolve apenas o caminho: o ficheiro só é visível através de
 * um link temporário gerado no painel.
 */
export async function POST(request: Request) {
  if (!hasServiceRole()) {
    return NextResponse.json({ ok: false, message: 'Armazenamento não configurado.' }, { status: 503 });
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'desconhecido';
  const limit = rateLimit(`upload:${ip}`, 10, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { ok: false, message: 'Demasiados envios seguidos. Tente daqui a pouco.' },
      { status: 429 },
    );
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get('file');

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ ok: false, message: 'Escolha um ficheiro.' }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ ok: false, message: 'O ficheiro não pode passar de 5 MB.' }, { status: 400 });
  }
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json(
      { ok: false, message: 'Aceitamos imagens JPG, PNG, WebP ou ficheiros PDF.' },
      { status: 400 },
    );
  }

  const supabase = createAdminSupabase();
  const extension = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
  const path = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage
    .from('comprovativos')
    .upload(path, file, { contentType: file.type, upsert: false });

  if (error) {
    logger.warn('receipt_upload_failed', { reason: error.message });
    return NextResponse.json({ ok: false, message: 'Não foi possível guardar o comprovativo.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, path });
}
