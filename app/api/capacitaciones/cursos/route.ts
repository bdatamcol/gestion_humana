import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/capacitaciones-helpers';

export async function GET(req: NextRequest) {
  const ctx = await requireAdmin(req);
  if ('error' in ctx) return ctx.error;
  const { supabase } = ctx;

  const { data, error } = await supabase
    .from('capacitaciones_cursos')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const cursos = data || [];
  if (cursos.length === 0) {
    return NextResponse.json([]);
  }

  const cursoIds = cursos.map((c: any) => c.id);

  const [leccionesRes, intentosRes] = await Promise.all([
    supabase
      .from('capacitaciones_lecciones')
      .select('curso_id')
      .in('curso_id', cursoIds),
    supabase
      .from('capacitaciones_examenes')
      .select('curso_id, capacitaciones_intentos(calificacion)')
      .in('curso_id', cursoIds),
  ]);

  const leccionesPorCurso = new Map<string, number>();
  for (const l of leccionesRes.data || []) {
    leccionesPorCurso.set(l.curso_id, (leccionesPorCurso.get(l.curso_id) || 0) + 1);
  }

  const calificacionesPorCurso = new Map<string, { total: number; count: number; promedio: number }>();
  for (const e of intentosRes.data || []) {
    const arr = (e as any).capacitaciones_intentos || [];
    if (arr.length > 0) {
      const sum = arr.reduce((s: number, i: any) => s + (i.calificacion || 0), 0);
      calificacionesPorCurso.set(e.curso_id, {
        total: sum,
        count: arr.length,
        promedio: sum / arr.length,
      });
    }
  }

  const enriched = cursos.map((c: any) => {
    const cal = calificacionesPorCurso.get(c.id);
    return {
      ...c,
      total_lecciones: leccionesPorCurso.get(c.id) || 0,
      promedio_calificacion: cal ? Math.round(cal.promedio * 100) / 100 : null,
      total_intentos: cal?.count || 0,
    };
  });

  return NextResponse.json(enriched);
}

export async function POST(req: NextRequest) {
  const ctx = await requireAdmin(req);
  if ('error' in ctx) return ctx.error;
  const { supabase, authUserId } = ctx;

  const body = await req.json();
  const {
    titulo,
    descripcion_corta,
    descripcion_completa,
    imagen_destacada_url,
    estado,
    nota_aprobacion,
  } = body || {};

  if (!titulo || !descripcion_corta) {
    return NextResponse.json(
      { error: 'Título y descripción corta son obligatorios' },
      { status: 400 }
    );
  }

  const insertPayload: any = {
      titulo,
      descripcion_corta,
      descripcion_completa: descripcion_completa || null,
      imagen_destacada_url: imagen_destacada_url || null,
      estado: estado === 'publicado' ? 'publicado' : 'borrador',
      nota_aprobacion: nota_aprobacion ?? 70,
      autor_id: authUserId,
    };
    // Solo incluir los campos de reintentos si la migración 049 está aplicada.
    // Detectamos intentando incluir y dejando que PostgREST ignore columnas inexistentes
    // mediante fallback en el catch.
    insertPayload.permite_reintentos = body.permite_reintentos === true;
    insertPayload.max_intentos = body.permite_reintentos === true
      ? Math.max(2, Number(body.max_intentos) || 2)
      : 1;

    let result = await supabase
      .from('capacitaciones_cursos')
      .insert(insertPayload)
      .select()
      .single();

    // Si falla por columnas inexistentes (migración 049 no aplicada), reintentar sin ellas.
    if (result.error && /column.*does not exist/i.test(result.error.message || '')) {
      delete insertPayload.permite_reintentos;
      delete insertPayload.max_intentos;
      result = await supabase
        .from('capacitaciones_cursos')
        .insert(insertPayload)
        .select()
        .single();
    }

    const { data, error } = result;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}