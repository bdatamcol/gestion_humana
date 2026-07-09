import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/capacitaciones-helpers';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAdmin(req);
  if ('error' in ctx) return ctx.error;
  const { supabase } = ctx;
  const { id } = await params;

  const body = await req.json();
  const updates: any = {};
  if (body.titulo !== undefined) updates.titulo = body.titulo;
  if (body.descripcion !== undefined) updates.descripcion = body.descripcion;

  const { data, error } = await supabase
    .from('capacitaciones_lecciones')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAdmin(req);
  if ('error' in ctx) return ctx.error;
  const { supabase } = ctx;
  const { id } = await params;

  const { error } = await supabase
    .from('capacitaciones_lecciones')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}