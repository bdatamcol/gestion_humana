import { NextRequest, NextResponse } from "next/server";
import {
  CERTIFICADO_INGRESOS_ESTADOS,
  CERTIFICADO_INGRESOS_NOTIFICACION_TIPO,
  esAnioGravableValido,
  ultimoAnioGravableVencido,
  type CertificadoIngresosEstado,
} from "@/lib/certificado-ingresos";
import {
  CERTIFICADO_INGRESOS_SELECT,
  requireCertificadoIngresosUser,
} from "@/lib/certificado-ingresos-server";
import { enviarCorreoNuevaSolicitudCertificadoIngresos } from "@/lib/certificado-ingresos-email";

// GET - Listar solicitudes (propias para el colaborador, todas para el administrador)
export async function GET(request: NextRequest) {
  const ctx = await requireCertificadoIngresosUser(request);
  if ("error" in ctx) return ctx.error;

  const estadoParam = new URL(request.url).searchParams.get("estado");
  if (estadoParam && !CERTIFICADO_INGRESOS_ESTADOS.includes(estadoParam as CertificadoIngresosEstado)) {
    return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
  }

  let query = ctx.admin
    .from("solicitudes_certificado_ingresos")
    .select(CERTIFICADO_INGRESOS_SELECT)
    .order("fecha_solicitud", { ascending: false });

  if (!ctx.isAdmin && !ctx.isCertificateManager) {
    query = query.eq("usuario_id", ctx.authUserId);
  }
  if (estadoParam) {
    query = query.eq("estado", estadoParam);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Error al listar solicitudes de certificado de ingresos:", error);
    return NextResponse.json({ error: "Error al obtener las solicitudes" }, { status: 500 });
  }

  const solicitudes = (data ?? []).map((solicitud) => {
    if (!ctx.isAdmin && !ctx.isCertificateManager && solicitud.estado !== "aprobado") {
      return {
        ...solicitud,
        pdf_url: null,
        pdf_public_id: null,
        pdf_nombre_original: null,
        pdf_tamano: null,
      };
    }
    return solicitud;
  });

  return NextResponse.json({
    solicitudes,
    access: ctx.isAdmin ? "admin" : ctx.isCertificateManager ? "manager" : "user",
  });
}

// POST - Crear una nueva solicitud en estado pendiente y notificar a los administradores
export async function POST(request: NextRequest) {
  const ctx = await requireCertificadoIngresosUser(request);
  if ("error" in ctx) return ctx.error;
  if (ctx.isCertificateManager) {
    return NextResponse.json({ error: "El gestor de certificados no puede crear solicitudes" }, { status: 403 });
  }

  let body: { anio_gravable?: unknown; observaciones?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo de la petición inválido" }, { status: 400 });
  }

  const anioGravable = Number(body.anio_gravable);
  if (!esAnioGravableValido(anioGravable)) {
    return NextResponse.json(
      {
        error: `El certificado solo se expide por año gravable vencido. El último año disponible es ${ultimoAnioGravableVencido()}`,
      },
      { status: 400 },
    );
  }

  const observaciones =
    typeof body.observaciones === "string" && body.observaciones.trim().length > 0
      ? body.observaciones.trim().slice(0, 1000)
      : null;

  const { data: existente } = await ctx.admin
    .from("solicitudes_certificado_ingresos")
    .select("id")
    .eq("usuario_id", ctx.authUserId)
    .eq("anio_gravable", anioGravable)
    .eq("estado", "pendiente")
    .maybeSingle();

  if (existente) {
    return NextResponse.json(
      { error: `Ya tienes una solicitud pendiente para el año gravable ${anioGravable}` },
      { status: 409 },
    );
  }

  const { data: solicitud, error } = await ctx.admin
    .from("solicitudes_certificado_ingresos")
    .insert({
      usuario_id: ctx.authUserId,
      estado: "pendiente",
      anio_gravable: anioGravable,
      observaciones,
    })
    .select(CERTIFICADO_INGRESOS_SELECT)
    .single();

  if (error || !solicitud) {
    console.error("Error al crear la solicitud de certificado de ingresos:", error);
    return NextResponse.json({ error: "Error al crear la solicitud" }, { status: 500 });
  }

  // Notificación en plataforma para administradores y moderadores activos
  const { data: administradores } = await ctx.admin
    .from("usuario_nomina")
    .select("auth_user_id")
    .in("rol", ["administrador", "moderador"])
    .eq("estado", "activo");

  if (administradores && administradores.length > 0) {
    const { error: notifError } = await ctx.admin.from("notificaciones").insert(
      administradores.map((administrador) => ({
        usuario_id: administrador.auth_user_id,
        tipo: CERTIFICADO_INGRESOS_NOTIFICACION_TIPO,
        titulo: "Nueva solicitud de certificado de ingresos y retenciones",
        mensaje: `${ctx.profile.colaborador} solicitó el certificado de ingresos y retenciones del año gravable ${anioGravable}`,
        solicitud_id: solicitud.id,
      })),
    );
    if (notifError) {
      console.error("Error al crear notificaciones para administradores:", notifError);
    }
  }

  // El correo no debe interrumpir el flujo si falla
  await enviarCorreoNuevaSolicitudCertificadoIngresos({
    colaborador: ctx.profile.colaborador,
    cedula: ctx.profile.cedula,
    anioGravable,
    observaciones,
    fechaSolicitud: solicitud.fecha_solicitud,
  }).catch((error) => console.error("Error al notificar por correo la nueva solicitud:", error));

  return NextResponse.json({ solicitud }, { status: 201 });
}
