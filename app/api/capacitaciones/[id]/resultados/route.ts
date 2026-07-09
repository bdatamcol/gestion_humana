import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/capacitaciones-helpers';

/**
 * GET /api/capacitaciones/[id]/resultados
 * Devuelve resumen y lista de usuarios con su estado respecto al curso.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAdmin(req);
  if ('error' in ctx) return ctx.error;
  const { supabase } = ctx;
  const { id: cursoId } = await params;

  const { data: curso, error: cErr } = await supabase
    .from('capacitaciones_cursos')
    .select('id, titulo, nota_aprobacion')
    .eq('id', cursoId)
    .single();

  if (cErr || !curso) {
    return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 });
  }

  const { data: examen } = await supabase
    .from('capacitaciones_examenes')
    .select('id')
    .eq('curso_id', cursoId)
    .maybeSingle();

  const { data: lecciones } = await supabase
    .from('capacitaciones_lecciones')
    .select('id')
    .eq('curso_id', cursoId);

  const leccionIds = (lecciones || []).map((l: any) => l.id);
  const totalLecciones = leccionIds.length;

  const { data: usuarios } = await supabase
    .from('usuario_nomina')
    .select('id, auth_user_id, colaborador, cedula, genero, avatar_path, cargos:cargo_id(nombre), empresas:empresa_id(nombre)')
    .eq('estado', 'activo')
    .order('colaborador', { ascending: true });

  let intentos: any[] = [];
  let progresoPorUsuario = new Map<string, Set<string>>();

  if (examen) {
    const { data: intData } = await supabase
      .from('capacitaciones_intentos')
      .select('id, usuario_id, calificacion, aprobado, fecha_intento')
      .eq('examen_id', (examen as any).id);
    intentos = intData || [];
  }

  if (leccionIds.length > 0) {
    const { data: progData } = await supabase
      .from('capacitaciones_progreso')
      .select('usuario_id, leccion_id')
      .in('leccion_id', leccionIds);
    for (const p of progData || []) {
      const set = progresoPorUsuario.get((p as any).usuario_id) || new Set();
      set.add((p as any).leccion_id);
      progresoPorUsuario.set((p as any).usuario_id, set);
    }
  }

  // Agrupar intentos por usuario para calcular mejor calificación y conteo.
  const resumenPorUsuario = new Map<string, { intentos: number; mejorCalificacion: number; mejorAprobado: boolean; ultimaFecha: string | null }>();
  for (const i of intentos) {
    const uid = (i as any).usuario_id;
    const calif = Number((i as any).calificacion) || 0;
    const aprobado = (i as any).aprobado === true;
    const fecha = (i as any).fecha_intento;
    const current = resumenPorUsuario.get(uid);
    if (!current) {
      resumenPorUsuario.set(uid, {
        intentos: 1,
        mejorCalificacion: calif,
        mejorAprobado: aprobado,
        ultimaFecha: fecha,
      });
    } else {
      current.intentos += 1;
      if (calif > current.mejorCalificacion) {
        current.mejorCalificacion = calif;
        current.mejorAprobado = aprobado;
      }
      if (!current.ultimaFecha || (fecha && new Date(fecha) > new Date(current.ultimaFecha))) {
        current.ultimaFecha = fecha;
      }
    }
  }

  let realizados = 0;
  let aprobados = 0;
  let reprobados = 0;

  // Filtrar usuarios sin auth_user_id: no pueden tener progreso ni intento
  // (las FKs lo impiden), y provocarían keys duplicadas en la tabla del cliente.
  const usuariosValidos = (usuarios || []).filter((u: any) => !!u.auth_user_id);

  const maxIntentosCurso = Number((curso as any).max_intentos) || 1;

  const lista = usuariosValidos.map((u: any) => {
    const resumen = resumenPorUsuario.get(u.auth_user_id);
    const leccCompletadas = progresoPorUsuario.get(u.auth_user_id)?.size || 0;

    let estado = 'Sin iniciar';
    if (resumen) {
      // Aprobado si la mejor calificación >= nota_aprobacion
      if (resumen.mejorAprobado) {
        estado = 'Aprobado';
        aprobados += 1;
      } else {
        // Si agotó todos los intentos disponibles, sigue siendo Reprobado.
        estado = resumen.intentos >= maxIntentosCurso ? 'Reprobado' : 'Reprobado (con reintentos)';
        reprobados += 1;
      }
      realizados += 1;
    } else if (leccCompletadas > 0) {
      estado = leccCompletadas >= totalLecciones && totalLecciones > 0
        ? 'Pendiente de examen'
        : 'En curso';
    }

    return {
      usuario_id: u.auth_user_id,
      colaborador: u.colaborador,
      cedula: u.cedula,
      cargo: u.cargos?.nombre || null,
      empresa: u.empresas?.nombre || null,
      estado,
      leccion_completadas: leccCompletadas,
      total_lecciones: totalLecciones,
      intentos_realizados: resumen?.intentos ?? 0,
      max_intentos: maxIntentosCurso,
      calificacion: resumen?.mejorCalificacion ?? null,
      fecha_intento: resumen?.ultimaFecha ?? null,
    };
  });

  return NextResponse.json({
    curso,
    resumen: {
      total: lista.length,
      realizados,
      no_realizados: lista.length - realizados,
      aprobados,
      reprobados,
      nota_aprobacion: curso.nota_aprobacion,
      max_intentos: maxIntentosCurso,
    },
    usuarios: lista,
  });
}