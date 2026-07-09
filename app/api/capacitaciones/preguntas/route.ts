import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/capacitaciones-helpers';

export async function POST(req: NextRequest) {
  const ctx = await requireAdmin(req);
  if ('error' in ctx) return ctx.error;
  const { supabase } = ctx;

  const body = await req.json();
  const { examen_id, enunciado, tipo, puntos, opciones } = body || {};

  if (!examen_id || !enunciado || !tipo) {
    return NextResponse.json(
      { error: 'examen_id, enunciado y tipo son obligatorios' },
      { status: 400 }
    );
  }

  if (!['seleccion_unica', 'seleccion_multiple', 'verdadero_falso'].includes(tipo)) {
    return NextResponse.json({ error: 'tipo inválido' }, { status: 400 });
  }

  const { data: maxRow } = await supabase
    .from('capacitaciones_preguntas')
    .select('orden')
    .eq('examen_id', examen_id)
    .order('orden', { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextOrden = maxRow ? (maxRow as any).orden + 1 : 0;

  const { data: pregunta, error: pError } = await supabase
    .from('capacitaciones_preguntas')
    .insert({
      examen_id,
      enunciado,
      tipo,
      puntos: puntos ?? 1,
      orden: nextOrden,
    })
    .select()
    .single();

  if (pError || !pregunta) {
    return NextResponse.json({ error: pError?.message || 'Error al crear pregunta' }, { status: 500 });
  }

  // Si es verdadero_falso, creamos automáticamente las dos opciones
  let opcionesFinales: any[] = Array.isArray(opciones) ? opciones : [];
  if (tipo === 'verdadero_falso') {
    opcionesFinales = [
      { texto: 'Verdadero', es_correcta: false, orden: 0 },
      { texto: 'Falso', es_correcta: false, orden: 1 },
    ];
  }

  if (opcionesFinales.length > 0) {
    const rows = opcionesFinales.map((o: any, idx: number) => ({
      pregunta_id: pregunta.id,
      texto: o.texto,
      es_correcta: !!o.es_correcta,
      orden: typeof o.orden === 'number' ? o.orden : idx,
    }));
    const { error: oError } = await supabase
      .from('capacitaciones_opciones')
      .insert(rows);
    if (oError) {
      return NextResponse.json({ error: oError.message }, { status: 500 });
    }
  }

  const { data: fullPregunta } = await supabase
    .from('capacitaciones_preguntas')
    .select('*, capacitaciones_opciones(*)')
    .eq('id', pregunta.id)
    .single();

  const result: any = { ...fullPregunta };
  result.opciones = (result.capacitaciones_opciones || []).sort((a: any, b: any) => a.orden - b.orden);
  delete result.capacitaciones_opciones;

  return NextResponse.json(result, { status: 201 });
}