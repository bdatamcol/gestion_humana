import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/capacitaciones-helpers';

/**
 * GET /api/capacitaciones/examenes/[cursoId]
 * Devuelve el examen del curso (con preguntas y opciones) o 404 si no existe.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ cursoId: string }> }) {
  const ctx = await requireAdmin(req);
  if ('error' in ctx) return ctx.error;
  const { supabase } = ctx;
  const { cursoId } = await params;

  const { data: examen, error } = await supabase
    .from('capacitaciones_examenes')
    .select('*, capacitaciones_preguntas(*, capacitaciones_opciones(*))')
    .eq('curso_id', cursoId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!examen) {
    return NextResponse.json({ examen: null });
  }

  const result: any = { ...examen };
  result.preguntas = (result.capacitaciones_preguntas || [])
    .sort((a: any, b: any) => a.orden - b.orden)
    .map((p: any) => ({
      ...p,
      opciones: (p.capacitaciones_opciones || []).sort((a: any, b: any) => a.orden - b.orden),
    }));
  delete result.capacitaciones_preguntas;
  return NextResponse.json({ examen: result });
}

/**
 * POST /api/capacitaciones/examenes/[cursoId]
 * Crea el examen (vacío) para el curso. Solo si no existe.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ cursoId: string }> }) {
  const ctx = await requireAdmin(req);
  if ('error' in ctx) return ctx.error;
  const { supabase } = ctx;
  const { cursoId } = await params;

  const body = await req.json().catch(() => ({}));
  const titulo = body?.titulo || 'Examen final';

  const { data: existing } = await supabase
    .from('capacitaciones_examenes')
    .select('id')
    .eq('curso_id', cursoId)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: 'El examen ya existe' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('capacitaciones_examenes')
    .insert({ curso_id: cursoId, titulo })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}