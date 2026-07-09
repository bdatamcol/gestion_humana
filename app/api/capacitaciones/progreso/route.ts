import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/capacitaciones-helpers';

/**
 * POST /api/capacitaciones/progreso
 * Body: { leccion_id }
 * Marca la lección como completada para el usuario actual (upsert).
 */
export async function POST(req: NextRequest) {
  const ctx = await requireAuth(req);
  if ('error' in ctx) return ctx.error;
  const { supabase, authUserId } = ctx;

  const body = await req.json();
  const { leccion_id } = body || {};
  if (!leccion_id) {
    return NextResponse.json({ error: 'leccion_id requerido' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('capacitaciones_progreso')
    .upsert(
      { usuario_id: authUserId, leccion_id, completada: true, completada_at: new Date().toISOString() },
      { onConflict: 'usuario_id,leccion_id' }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}