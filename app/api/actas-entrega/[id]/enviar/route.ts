import { NextRequest, NextResponse } from "next/server";
import { decodeSignature, hashActaPayload, requestMetadata, requireActiveUser } from "@/lib/actas-entrega";
import { sendActaEmail } from "@/lib/actas-entrega-email";
import { deleteActaImage, uploadActaImage } from "@/lib/actas-entrega-cloudinary";

const CONSENTIMIENTO = "Declaro que los elementos relacionados corresponden a la entrega realizada y acepto firmar electrónicamente esta acta.";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireActiveUser(request);
  if ("error" in ctx) return ctx.error;
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const signature = decodeSignature(body?.firma);
  if (!signature || body?.acepta !== true) {
    return NextResponse.json({ error: "La firma y la aceptación son obligatorias" }, { status: 400 });
  }

  const { data: acta } = await ctx.admin.from("actas_entrega").select("*").eq("id", id).single();
  if (!acta || acta.entregante_id !== ctx.authUserId || acta.estado !== "borrador") {
    return NextResponse.json({ error: "El acta no puede enviarse" }, { status: 403 });
  }
  const { data: items } = await ctx.admin.from("actas_entrega_items").select("*").eq("acta_id", id).order("orden");
  if (!items?.length) return NextResponse.json({ error: "El acta debe tener al menos un ítem" }, { status: 400 });

  let upload;
  try {
    upload = await uploadActaImage(signature, {
      folder: `${id}/firmas`,
      publicId: `entregante-${Date.now()}`,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No fue posible guardar la firma" }, { status: 500 });
  }
  const metadata = requestMetadata(request);
  const { error: firmaError } = await ctx.admin.from("actas_entrega_firmas").insert({
    acta_id: id,
    usuario_id: ctx.authUserId,
    rol_firmante: "entregante",
    storage_path: upload.public_id,
    consentimiento: CONSENTIMIENTO,
    contenido_hash: hashActaPayload(acta, items),
    ip: metadata.ip,
    user_agent: metadata.userAgent,
  });
  if (firmaError) {
    await deleteActaImage(upload.public_id);
    return NextResponse.json({ error: firmaError.message }, { status: 500 });
  }

  const { data: transitioned, error: updateError } = await ctx.admin.from("actas_entrega").update({
    estado: "pendiente_recepcion",
    fecha_envio: new Date().toISOString(),
  }).eq("id", id).eq("estado", "borrador").select("id").maybeSingle();
  if (updateError || !transitioned) {
    await ctx.admin.from("actas_entrega_firmas").delete().eq("acta_id", id).eq("rol_firmante", "entregante");
    await deleteActaImage(upload.public_id);
    return NextResponse.json({ error: updateError?.message || "El acta cambió de estado antes de ser enviada" }, { status: 409 });
  }

  await Promise.all([
    ctx.admin.from("actas_entrega_eventos").insert({ acta_id: id, actor_id: ctx.authUserId, tipo: "enviada", detalle: { contenido_hash: hashActaPayload(acta, items) } }),
    ctx.admin.from("notificaciones").insert({
      usuario_id: acta.receptor_id,
      tipo: "acta_entrega_asignada",
      titulo: "Nueva acta de entrega",
      mensaje: `${acta.entregante_nombre} te asignó el acta ${acta.numero_acta}.`,
      solicitud_id: id,
      enlace: `/perfil/actas-entrega/${id}`,
    }),
  ]);

  const { data: receptor } = await ctx.admin.from("usuario_nomina").select("correo_electronico").eq("auth_user_id", acta.receptor_id).single();
  await sendActaEmail({
    actaId: id,
    tipo: "asignada",
    destinatario: receptor?.correo_electronico || null,
    nombreDestinatario: acta.receptor_nombre,
    nombreActor: acta.entregante_nombre,
    numeroActa: acta.numero_acta,
    mensaje: "Se te ha asignado una nueva acta de entrega para revisión y firma.",
    ruta: `/perfil/actas-entrega/${id}`,
  });
  return NextResponse.json({ ok: true });
}
