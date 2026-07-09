import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/capacitaciones-helpers';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAdmin(req);
  if ('error' in ctx) return ctx.error;
  const { supabase } = ctx;
  const { id } = await params;

  const body = await req.json();
  const updates: any = {};
  if (body.enunciado !== undefined) updates.enunciado = body.enunciado;
  if (body.puntos !== undefined) updates.puntos = body.puntos;

  if (Object.keys(updates).length > 0) {
    const { error } = await supabase
      .from('capacitaciones_preguntas')
      .update(updates)
      .eq('id', id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  if (Array.isArray(body.opciones)) {
    // Reemplazar todas las opciones (transacción simple)
    const { error: delErr } = await supabase
      .from('capacitaciones_opciones')
      .delete()
      .eq('pregunta_id', id);
    if (delErr) {
      return NextResponse.json({ error: delErr.message }, { status: 500 });
    }
    if (body.opciones.length > 0) {
      const rows = body.opciones.map((o: any, idx: number) => ({
        pregunta_id: id,
        texto: o.texto,
        es_correcta: !!o.es_correcta,
        orden: typeof o.orden === 'number' ? o.orden : idx,
      }));
      const { error: insErr } = await supabase
        .from('capacitaciones_opciones')
        .insert(rows);
      if (insErr) {
        return NextResponse.json({ error: insErr.message }, { status: 500 });
      }
    }
  }

  const { data } = await supabase
    .from('capacitaciones_preguntas')
    .select('*, capacitaciones_opciones(*)')
    .eq('id', id)
    .single();

  const result: any = data || {};
  if (result.capacitaciones_opciones) {
    result.opciones = result.capacitaciones_opciones.sort((a: any, b: any) => a.orden - b.orden);
    delete result.capacitaciones_opciones;
  }
  return NextResponse.json(result);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAdmin(req);
  if ('error' in ctx) return ctx.error;
  const { supabase } = ctx;
  const { id } = await params;

  const { error } = await supabase
    .from('capacitaciones_preguntas')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}