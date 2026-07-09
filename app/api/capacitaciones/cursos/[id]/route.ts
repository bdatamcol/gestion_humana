import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/capacitaciones-helpers';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAdmin(req);
  if ('error' in ctx) return ctx.error;
  const { supabase } = ctx;
  const { id } = await params;

  const { data, error } = await supabase
    .from('capacitaciones_cursos')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 });
  }

  const [leccionesRes, examenRes] = await Promise.all([
    supabase
      .from('capacitaciones_lecciones')
      .select('*, capacitaciones_recursos(*)')
      .eq('curso_id', id)
      .order('orden', { ascending: true }),
    supabase
      .from('capacitaciones_examenes')
      .select('*, capacitaciones_preguntas(*, capacitaciones_opciones(*))')
      .eq('curso_id', id)
      .maybeSingle(),
  ]);

  const lecciones = (leccionesRes.data || []).map((l: any) => ({
    ...l,
    recursos: (l.capacitaciones_recursos || []).sort((a: any, b: any) => a.orden - b.orden),
  }));

  let examen: any = examenRes.data || null;
  if (examen) {
    examen.preguntas = (examen.capacitaciones_preguntas || [])
      .sort((a: any, b: any) => a.orden - b.orden)
      .map((p: any) => ({
        ...p,
        opciones: (p.capacitaciones_opciones || []).sort((a: any, b: any) => a.orden - b.orden),
      }));
    delete examen.capacitaciones_preguntas;
  }

  return NextResponse.json({ ...data, lecciones, examen });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAdmin(req);
  if ('error' in ctx) return ctx.error;
  const { supabase } = ctx;
  const { id } = await params;

  const body = await req.json();
  const updates: any = {};
  const fields = ['titulo', 'descripcion_corta', 'descripcion_completa', 'imagen_destacada_url', 'estado', 'nota_aprobacion'];
  for (const f of fields) {
    if (body[f] !== undefined) updates[f] = body[f];
  }
  if (body.permite_reintentos !== undefined) {
    updates.permite_reintentos = body.permite_reintentos === true;
    if (body.permite_reintentos === true) {
      updates.max_intentos = Math.max(2, Number(body.max_intentos) || 2);
    } else {
      updates.max_intentos = 1;
    }
  } else if (body.max_intentos !== undefined && Number(body.max_intentos) >= 2) {
    updates.max_intentos = Math.max(2, Number(body.max_intentos));
  }

  const { data, error } = await supabase
    .from('capacitaciones_cursos')
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
    .from('capacitaciones_cursos')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}