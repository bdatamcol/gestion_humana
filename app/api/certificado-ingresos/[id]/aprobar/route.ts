import { NextResponse } from "next/server";
import { CERTIFICADO_INGRESOS_SELECT, requireCertificadoIngresosUser } from "@/lib/certificado-ingresos-server";
import { enviarCorreoCertificadoIngresosListo } from "@/lib/certificado-ingresos-email";
import { CERTIFICADO_INGRESOS_NOTIFICACION_TIPO, usuarioDeSolicitud } from "@/lib/certificado-ingresos";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireCertificadoIngresosUser(request);
  if ("error" in ctx) return ctx.error;
  if (!ctx.isAdmin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  const { id } = await params;
  const { data: solicitud, error } = await ctx.admin.from("solicitudes_certificado_ingresos")
    .update({ estado: "aprobado", revisado_por: ctx.authUserId, fecha_revision: new Date().toISOString(), motivo_rechazo: null })
    .eq("id", id).eq("estado", "certificado_cargado").select(CERTIFICADO_INGRESOS_SELECT).maybeSingle();
  if (error) return NextResponse.json({ error: "No se pudo aprobar el certificado" }, { status: 500 });
  if (!solicitud) return NextResponse.json({ error: "La solicitud no está lista para aprobación" }, { status: 409 });
  await ctx.admin.from("notificaciones").insert({ usuario_id: solicitud.usuario_id, tipo: CERTIFICADO_INGRESOS_NOTIFICACION_TIPO, titulo: "Certificado de ingresos y retenciones disponible", mensaje: `Tu certificado de ingresos y retenciones del año gravable ${solicitud.anio_gravable} ya está disponible para descarga.`, solicitud_id: solicitud.id });
  const colaborador = usuarioDeSolicitud(solicitud.usuario_nomina);
  await enviarCorreoCertificadoIngresosListo({ destinatario: colaborador?.correo_electronico ?? null, colaborador: colaborador?.colaborador ?? "colaborador", anioGravable: solicitud.anio_gravable }).catch((emailError) => console.error("Error al notificar la aprobación:", emailError));
  return NextResponse.json({ solicitud });
}
