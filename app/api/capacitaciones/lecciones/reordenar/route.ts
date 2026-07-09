import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/capacitaciones-helpers';

/**
 * POST /api/capacitaciones/lecciones/reordenar
 * Body: { items: [{ id, orden }] }
 * Reordena lecciones según el array recibido.
 */
export async function POST(req: NextRequest) {
  const ctx = await requireAdmin(req);
  if ('error' in ctx) return ctx.error;
  const { supabase } = ctx;

  const body = await req.json();
  const items: Array<{ id: string; orden: number }> = body?.items || [];
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'items requerido' }, { status: 400 });
  }

  try {
    for (const it of items) {
      const { error } = await supabase
        .from('capacitaciones_lecciones')
        .update({ orden: it.orden })
        .eq('id', it.id);
      if (error) throw error;
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Error al reordenar' }, { status: 500 });
  }
}