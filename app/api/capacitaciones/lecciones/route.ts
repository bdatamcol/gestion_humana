import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/capacitaciones-helpers';

export async function POST(req: NextRequest) {
  const ctx = await requireAdmin(req);
  if ('error' in ctx) return ctx.error;
  const { supabase } = ctx;

  const body = await req.json();
  const { curso_id, titulo, descripcion } = body || {};

  if (!curso_id || !titulo) {
    return NextResponse.json(
      { error: 'curso_id y titulo son obligatorios' },
      { status: 400 }
    );
  }

  const { data: maxRow } = await supabase
    .from('capacitaciones_lecciones')
    .select('orden')
    .eq('curso_id', curso_id)
    .order('orden', { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextOrden = maxRow ? (maxRow as any).orden + 1 : 0;

  const { data, error } = await supabase
    .from('capacitaciones_lecciones')
    .insert({
      curso_id,
      titulo,
      descripcion: descripcion || null,
      orden: nextOrden,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}