import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/capacitaciones-helpers';

export async function POST(req: NextRequest) {
  const ctx = await requireAdmin(req);
  if ('error' in ctx) return ctx.error;
  const { supabase } = ctx;

  const body = await req.json();
  const { leccion_id, tipo, titulo, contenido_texto, video_url, archivo_url } = body || {};

  if (!leccion_id || !tipo) {
    return NextResponse.json(
      { error: 'leccion_id y tipo son obligatorios' },
      { status: 400 }
    );
  }

  if (!['texto', 'video', 'imagen', 'documento'].includes(tipo)) {
    return NextResponse.json({ error: 'tipo inválido' }, { status: 400 });
  }

  const { data: maxRow } = await supabase
    .from('capacitaciones_recursos')
    .select('orden')
    .eq('leccion_id', leccion_id)
    .order('orden', { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextOrden = maxRow ? (maxRow as any).orden + 1 : 0;

  const insertData: any = {
    leccion_id,
    tipo,
    titulo: titulo || null,
    orden: nextOrden,
  };
  if (tipo === 'texto') insertData.contenido_texto = contenido_texto || null;
  if (tipo === 'video') insertData.video_url = video_url || null;
  if (tipo === 'imagen' || tipo === 'documento') insertData.archivo_url = archivo_url || null;

  const { data, error } = await supabase
    .from('capacitaciones_recursos')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}