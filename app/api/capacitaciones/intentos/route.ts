import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/capacitaciones-helpers';

/**
 * POST /api/capacitaciones/intentos
 * Body: { examen_id, respuestas: [{ pregunta_id, opciones_seleccionadas: [uuid] }] }
 *
 * Reglas:
 * - Un solo intento por usuario/examen (UNIQUE en BD + 409 si ya existe).
 * - Selección única / V/F: correcto si y solo si la opción marcada es la correcta.
 * - Selección múltiple: puntos × max(0, (correctas_marcadas/total_correctas) - (incorrectas_marcadas/total_incorrectas))
 *   Si no hay opciones incorrectas (todas son correctas), se exige que estén todas marcadas.
 */
export async function POST(req: NextRequest) {
  const ctx = await requireAuth(req);
  if ('error' in ctx) return ctx.error;
  const { supabase, authUserId } = ctx;

  const body = await req.json();
  const { examen_id, respuestas } = body || {};

  if (!examen_id || !Array.isArray(respuestas)) {
    return NextResponse.json(
      { error: 'examen_id y respuestas son obligatorios' },
      { status: 400 }
    );
  }

  // 1. Verificar que el examen existe y traer curso + nota_aprobacion + config reintentos
  const { data: examen, error: eErr } = await supabase
    .from('capacitaciones_examenes')
    .select('id, curso_id, capacitaciones_cursos!inner(nota_aprobacion)')
    .eq('id', examen_id)
    .single();

  if (eErr || !examen) {
    return NextResponse.json({ error: 'Examen no encontrado' }, { status: 404 });
  }
  const curso = (examen as any).capacitaciones_cursos;
  const notaAprobacion = Number(curso?.nota_aprobacion ?? 70);
  // Defaults defensivos: si la migración 049 no se ha ejecutado, max_intentos = 1.
  const limiteIntentos = curso?.permite_reintentos === true
    ? Math.max(1, Number(curso.max_intentos) || 1)
    : 1;

  // 2. Obtener intentos previos del usuario para este examen
  const { data: intentosPrevios } = await supabase
    .from('capacitaciones_intentos')
    .select('id, calificacion, aprobado')
    .eq('usuario_id', authUserId)
    .eq('examen_id', examen_id)
    .order('id', { ascending: true });

  const intentosHechos = intentosPrevios?.length || 0;

  // Verificar si ya aprobó (mejor calificación >= nota_aprobacion)
  const mejorCalificacionPrevia = (intentosPrevios || []).reduce(
    (max, i) => Math.max(max, Number(i.calificacion) || 0),
    0
  );
  if (mejorCalificacionPrevia >= notaAprobacion) {
    return NextResponse.json(
      {
        error: 'Ya aprobaste este examen. No es necesario reintentarlo.',
      },
      { status: 409 }
    );
  }

  // Verificar límite de intentos
  if (intentosHechos >= limiteIntentos) {
    return NextResponse.json(
      {
        error: `Has agotado tus ${limiteIntentos} intentos disponibles para este examen.`,
      },
      { status: 409 }
    );
  }

  const numeroIntento = intentosHechos + 1;

  // 3. Traer preguntas y opciones
  const { data: preguntas } = await supabase
    .from('capacitaciones_preguntas')
    .select('id, tipo, puntos')
    .eq('examen_id', examen_id);

  const preguntaIds = (preguntas || []).map((p: any) => p.id);
  if (preguntaIds.length === 0) {
    return NextResponse.json({ error: 'El examen no tiene preguntas' }, { status: 400 });
  }

  const { data: opciones } = await supabase
    .from('capacitaciones_opciones')
    .select('id, pregunta_id, es_correcta')
    .in('pregunta_id', preguntaIds);

  const opcionesPorPregunta = new Map<string, any[]>();
  for (const o of opciones || []) {
    const arr = opcionesPorPregunta.get(o.pregunta_id) || [];
    arr.push(o);
    opcionesPorPregunta.set(o.pregunta_id, arr);
  }

  // 4. Calificar
  let puntosObtenidos = 0;
  let puntosTotales = 0;
  const respuestasCalculadas: Array<{
    pregunta_id: string;
    opciones_seleccionadas: string[];
    correcta: boolean;
    puntos_obtenidos: number;
  }> = [];

  for (const pregunta of preguntas || []) {
    const puntos = Number(pregunta.puntos || 1);
    puntosTotales += puntos;

    const todasOpciones = opcionesPorPregunta.get(pregunta.id) || [];
    const correctas = todasOpciones.filter((o) => o.es_correcta).map((o) => o.id);
    const incorrectas = todasOpciones.filter((o) => !o.es_correcta).map((o) => o.id);

    const userResp = respuestas.find((r: any) => r.pregunta_id === pregunta.id);
    const marcadas: string[] = Array.isArray(userResp?.opciones_seleccionadas)
      ? userResp.opciones_seleccionadas
      : [];

    let puntosPregunta = 0;
    let correcta = false;

    if (pregunta.tipo === 'seleccion_unica' || pregunta.tipo === 'verdadero_falso') {
      correcta = marcadas.length === 1 && correctas.length === 1 && marcadas[0] === correctas[0];
      puntosPregunta = correcta ? puntos : 0;
    } else if (pregunta.tipo === 'seleccion_multiple') {
      const correctasMarcadas = marcadas.filter((id) => correctas.includes(id)).length;
      const incorrectasMarcadas = marcadas.filter((id) => incorrectas.includes(id)).length;
      const totalCorrectas = correctas.length;
      const totalIncorrectas = incorrectas.length;

      if (totalIncorrectas === 0) {
        // Todas las opciones son correctas: exigir todas marcadas
        correcta = correctasMarcadas === totalCorrectas && marcadas.length === totalCorrectas;
        puntosPregunta = correcta ? puntos : 0;
      } else {
        const proporcion =
          correctasMarcadas / totalCorrectas - incorrectasMarcadas / totalIncorrectas;
        puntosPregunta = Math.max(0, proporcion) * puntos;
        correcta = puntosPregunta === puntos;
      }
    }

    puntosObtenidos += puntosPregunta;
    respuestasCalculadas.push({
      pregunta_id: pregunta.id,
      opciones_seleccionadas: marcadas,
      correcta,
      puntos_obtenidos: puntosPregunta,
    });
  }

  const calificacion = puntosTotales > 0 ? Math.round((puntosObtenidos / puntosTotales) * 10000) / 100 : 0;
  const aprobado = calificacion >= notaAprobacion;

  // 5. Insertar intento + respuestas
  const intentoPayload: any = {
    usuario_id: authUserId,
    examen_id,
    calificacion,
    aprobado,
    numero_intento: numeroIntento,
  };
  let intentoRes = await supabase
    .from('capacitaciones_intentos')
    .insert(intentoPayload)
    .select()
    .single();

  // Si la migración 049 no está aplicada, reintentar sin numero_intento.
  if (intentoRes.error && /column.*does not exist/i.test(intentoRes.error.message || '')) {
    const payloadLegacy = {
      usuario_id: authUserId,
      examen_id,
      calificacion,
      aprobado,
    };
    intentoRes = await supabase
      .from('capacitaciones_intentos')
      .insert(payloadLegacy)
      .select()
      .single();
  }

  const { data: intento, error: iErr } = intentoRes;

  if (iErr || !intento) {
    return NextResponse.json(
      { error: iErr?.message || 'Error al guardar el intento' },
      { status: 500 }
    );
  }

  if (respuestasCalculadas.length > 0) {
    const rows = respuestasCalculadas.map((r) => ({
      intento_id: intento.id,
      pregunta_id: r.pregunta_id,
      opciones_seleccionadas: r.opciones_seleccionadas,
      correcta: r.correcta,
      puntos_obtenidos: r.puntos_obtenidos,
    }));
    const { error: rErr } = await supabase.from('capacitaciones_respuestas').insert(rows);
    if (rErr) {
      return NextResponse.json({ error: rErr.message }, { status: 500 });
    }
  }

  const intentosRestantes = Math.max(0, limiteIntentos - numeroIntento);
  const mejorCalificacionFinal = Math.max(mejorCalificacionPrevia, calificacion);

  return NextResponse.json(
    {
      intento_id: intento.id,
      calificacion,
      aprobado,
      nota_aprobacion: notaAprobacion,
      numero_intento: numeroIntento,
      max_intentos: limiteIntentos,
      intentos_restantes: intentosRestantes,
      permite_reintentos: limiteIntentos > 1,
      mejor_calificacion: mejorCalificacionFinal,
    },
    { status: 201 }
  );
}