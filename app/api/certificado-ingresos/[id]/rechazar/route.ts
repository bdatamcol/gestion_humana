import { NextResponse } from "next/server";
import { CERTIFICADO_INGRESOS_SELECT, requireCertificadoIngresosUser } from "@/lib/certificado-ingresos-server";
import { CERTIFICADO_INGRESOS_NOTIFICACION_TIPO } from "@/lib/certificado-ingresos";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireCertificadoIngresosUser(request);
  if ("error" in ctx) return ctx.error;
  if (!ctx.isAdmin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const motivo = typeof body.motivo === "string" ? body.motivo.trim() : "";
  if (!motivo) return NextResponse.json({ error: "Indica el motivo del rechazo" }, { status: 400 });
  const { id } = await params;
  const { data: solicitud, error } = await ctx.admin.from("solicitudes_certificado_ingresos")
    .update({ estado: "rechazado", revisado_por: ctx.authUserId, fecha_revision: new Date().toISOString(), motivo_rechazo: motivo })
    .eq("id", id).eq("estado", "certificado_cargado").select(CERTIFICADO_INGRESOS_SELECT).maybeSingle();
  if (error) return NextResponse.json({ error: "No se pudo rechazar el certificado" }, { status: 500 });
  if (!solicitud) return NextResponse.json({ error: "La solicitud no está lista para rechazo" }, { status: 409 });
  await ctx.admin.from("notificaciones").insert({ usuario_id: solicitud.usuario_id, tipo: CERTIFICADO_INGRESOS_NOTIFICACION_TIPO, titulo: "Certificado de ingresos y retenciones rechazado", mensaje: `El certificado del año gravable ${solicitud.anio_gravable} requiere una nueva carga. Motivo: ${motivo}`, solicitud_id: solicitud.id });
  return NextResponse.json({ solicitud });
}
