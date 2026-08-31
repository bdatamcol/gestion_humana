import { NextRequest, NextResponse } from "next/server";
import {
  CERTIFICADO_INGRESOS_NOTIFICACION_TIPO,
  usuarioDeSolicitud,
} from "@/lib/certificado-ingresos";
import {
  CERTIFICADO_INGRESOS_SELECT,
  optimizarPdf,
  requireCertificadoIngresosUser,
  validarArchivoPdf,
} from "@/lib/certificado-ingresos-server";
import {
  deleteCertificadoIngresosPdf,
  uploadCertificadoIngresosPdf,
} from "@/lib/certificado-ingresos-cloudinary";
import { enviarCorreoCertificadoIngresosListo } from "@/lib/certificado-ingresos-email";

// POST - El administrador adjunta el PDF del certificado y cierra la solicitud
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireCertificadoIngresosUser(request);
  if ("error" in ctx) return ctx.error;
  if (!ctx.isAdmin) {
    return NextResponse.json({ error: "Permisos insuficientes" }, { status: 403 });
  }

  const { id } = await params;

  const { data: solicitud, error: solicitudError } = await ctx.admin
    .from("solicitudes_certificado_ingresos")
    .select("id, usuario_id, anio_gravable, pdf_public_id")
    .eq("id", id)
    .single();

  if (solicitudError || !solicitud) {
    return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });
  }

  const form = await request.formData();
  const archivo = form.get("archivo");
  if (!(archivo instanceof File)) {
    return NextResponse.json({ error: "Debes adjuntar el certificado en PDF" }, { status: 400 });
  }

  const buffer = Buffer.from(await archivo.arrayBuffer());
  const errorValidacion = validarArchivoPdf(archivo, buffer);
  if (errorValidacion) {
    return NextResponse.json({ error: errorValidacion }, { status: 400 });
  }

  const optimizacion = await optimizarPdf(buffer);

  let upload;
  try {
    upload = await uploadCertificadoIngresosPdf(optimizacion.buffer, {
      solicitudId: solicitud.id,
      anioGravable: solicitud.anio_gravable,
    });
  } catch (error) {
    console.error("Error al subir el certificado a Cloudinary:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No fue posible subir el certificado" },
      { status: 500 },
    );
  }

  const { data: actualizada, error: updateError } = await ctx.admin
    .from("solicitudes_certificado_ingresos")
    .update({
      estado: "certificado_creado",
      admin_id: ctx.authUserId,
      fecha_certificado: new Date().toISOString(),
      pdf_url: upload.secure_url,
      pdf_public_id: upload.public_id,
      pdf_nombre_original: archivo.name.slice(0, 255),
      pdf_tamano: optimizacion.tamanoFinal,
    })
    .eq("id", solicitud.id)
    .select(CERTIFICADO_INGRESOS_SELECT)
    .single();

  if (updateError || !actualizada) {
    console.error("Error al actualizar la solicitud de certificado de ingresos:", updateError);
    await deleteCertificadoIngresosPdf(upload.public_id).catch((error) =>
      console.error("Error al revertir la subida en Cloudinary:", error),
    );
    return NextResponse.json({ error: "Error al guardar el certificado" }, { status: 500 });
  }

  // Si se reemplazó un certificado anterior, se elimina el archivo previo
  if (solicitud.pdf_public_id && solicitud.pdf_public_id !== upload.public_id) {
    await deleteCertificadoIngresosPdf(solicitud.pdf_public_id).catch((error) =>
      console.error("Error al eliminar el certificado anterior:", error),
    );
  }

  const { error: notifError } = await ctx.admin.from("notificaciones").insert({
    usuario_id: solicitud.usuario_id,
    tipo: CERTIFICADO_INGRESOS_NOTIFICACION_TIPO,
    titulo: "Certificado de ingresos y retenciones disponible",
    mensaje: `Tu certificado de ingresos y retenciones del año gravable ${solicitud.anio_gravable} ya está disponible para descarga`,
    solicitud_id: solicitud.id,
  });
  if (notifError) {
    console.error("Error al notificar al colaborador:", notifError);
  }

  const colaborador = usuarioDeSolicitud(actualizada.usuario_nomina);
  await enviarCorreoCertificadoIngresosListo({
    destinatario: colaborador?.correo_electronico ?? null,
    colaborador: colaborador?.colaborador ?? "colaborador",
    anioGravable: solicitud.anio_gravable,
  }).catch((error) => console.error("Error al notificar por correo al colaborador:", error));

  return NextResponse.json({
    solicitud: actualizada,
    optimizacion: {
      tamano_original: optimizacion.tamanoOriginal,
      tamano_final: optimizacion.tamanoFinal,
      optimizado: optimizacion.optimizado,
    },
  });
}
