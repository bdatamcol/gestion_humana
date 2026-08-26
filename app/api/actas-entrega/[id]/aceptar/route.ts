import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { decodeSignature, hashActaPayload, requestMetadata, requireActiveUser } from "@/lib/actas-entrega";
import { sendActaEmail } from "@/lib/actas-entrega-email";
import { deleteActaImage, uploadActaImage } from "@/lib/actas-entrega-cloudinary";

const schema = z.object({
  acepta: z.literal(true),
  firma: z.string(),
  items: z.array(z.object({
    id: z.string().uuid(),
    recibido: z.boolean(),
    estado_recepcion: z.enum(["bueno", "regular", "malo", "no_recibido"]),
    notas_recepcion: z.string().trim().max(2000).optional().nullable(),
  })).min(1),
});
const CONSENTIMIENTO = "Declaro que revisé los elementos relacionados, registré su estado real y acepto firmar electrónicamente esta acta de recibido.";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireActiveUser(request);
  if ("error" in ctx) return ctx.error;
  if (ctx.isActasManager) return NextResponse.json({ error: "Acceso de solo consulta" }, { status: 403 });
  const { id } = await params;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  const signature = parsed.success ? decodeSignature(parsed.data.firma) : null;
  if (!parsed.success || !signature) return NextResponse.json({ error: "Revisión y firma válidas son obligatorias" }, { status: 400 });

  const { data: acta } = await ctx.admin.from("actas_entrega").select("*").eq("id", id).single();
  if (!acta || acta.receptor_id !== ctx.authUserId || acta.estado !== "pendiente_recepcion") {
    return NextResponse.json({ error: "El acta no está disponible para recepción" }, { status: 403 });
  }
  const { data: storedItems } = await ctx.admin.from("actas_entrega_items").select("*").eq("acta_id", id).order("orden");
  if (!storedItems || storedItems.length !== parsed.data.items.length || storedItems.some((item: any) => !parsed.data.items.some((input) => input.id === item.id))) {
    return NextResponse.json({ error: "Debes revisar todos los ítems" }, { status: 400 });
  }
  const { data: evidence } = await ctx.admin.from("actas_entrega_evidencias").select("item_id").eq("acta_id", id);
  const evidenceItems = new Set((evidence || []).map((file: any) => file.item_id));
  for (const item of parsed.data.items) {
    if ((item.estado_recepcion === "no_recibido") === item.recibido) {
      return NextResponse.json({ error: "El estado y la confirmación de recibido no son consistentes" }, { status: 400 });
    }
    if (item.estado_recepcion !== "bueno" && !item.notas_recepcion) {
      return NextResponse.json({ error: "Las novedades requieren una nota explicativa" }, { status: 400 });
    }
    if (item.recibido && !evidenceItems.has(item.id)) {
      return NextResponse.json({ error: "Cada ítem recibido requiere al menos una fotografía" }, { status: 400 });
    }
  }

  for (const item of parsed.data.items) {
    const { error } = await ctx.admin.from("actas_entrega_items").update({
      recibido: item.recibido,
      estado_recepcion: item.estado_recepcion,
      notas_recepcion: item.notas_recepcion || null,
    }).eq("id", item.id).eq("acta_id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const finalItems = storedItems.map((stored: any) => ({ ...stored, ...parsed.data.items.find((item) => item.id === stored.id) }));
  let upload;
  try {
    upload = await uploadActaImage(signature, {
      folder: `${id}/firmas`,
      publicId: `receptor-${Date.now()}`,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No fue posible guardar la firma" }, { status: 500 });
  }
  const metadata = requestMetadata(request);
  const { error: firmaError } = await ctx.admin.from("actas_entrega_firmas").insert({
    acta_id: id,
    usuario_id: ctx.authUserId,
    rol_firmante: "receptor",
    storage_path: upload.public_id,
    consentimiento: CONSENTIMIENTO,
    contenido_hash: hashActaPayload(acta, finalItems),
    ip: metadata.ip,
    user_agent: metadata.userAgent,
  });
  if (firmaError) {
    await deleteActaImage(upload.public_id);
    return NextResponse.json({ error: firmaError.message }, { status: 500 });
  }

  const conNovedades = parsed.data.items.some((item) => !item.recibido || item.estado_recepcion !== "bueno" || Boolean(item.notas_recepcion));
  const estado = conNovedades ? "aceptada_con_novedades" : "completada";
  const { data: transitioned, error: transitionError } = await ctx.admin.from("actas_entrega")
    .update({ estado, fecha_respuesta: new Date().toISOString() })
    .eq("id", id)
    .eq("estado", "pendiente_recepcion")
    .select("id")
    .maybeSingle();
  if (transitionError || !transitioned) {
    await ctx.admin.from("actas_entrega_firmas").delete().eq("acta_id", id).eq("rol_firmante", "receptor");
    await deleteActaImage(upload.public_id);
    return NextResponse.json({ error: transitionError?.message || "El acta cambió de estado durante la aceptación" }, { status: 409 });
  }
  await Promise.all([
    ctx.admin.from("actas_entrega_eventos").insert({ acta_id: id, actor_id: ctx.authUserId, tipo: estado, detalle: { contenido_hash: hashActaPayload(acta, finalItems) } }),
    ctx.admin.from("notificaciones").insert({ usuario_id: acta.entregante_id, tipo: conNovedades ? "acta_entrega_aceptada_novedades" : "acta_entrega_aceptada", titulo: "Acta de entrega aceptada", mensaje: `${acta.receptor_nombre} aceptó el acta ${acta.numero_acta}${conNovedades ? " con novedades" : ""}.`, solicitud_id: id, enlace: `/perfil/actas-entrega/${id}` }),
  ]);
  const { data: entregante } = await ctx.admin.from("usuario_nomina").select("correo_electronico").eq("auth_user_id", acta.entregante_id).single();
  await sendActaEmail({ actaId: id, tipo: "aceptada", destinatario: entregante?.correo_electronico || null, nombreDestinatario: acta.entregante_nombre, nombreActor: acta.receptor_nombre, numeroActa: acta.numero_acta, mensaje: `El acta fue aceptada${conNovedades ? " con novedades" : ""}.`, ruta: `/perfil/actas-entrega/${id}` });
  return NextResponse.json({ ok: true, estado });
}
