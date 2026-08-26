import { NextRequest, NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/actas-entrega";
import { deleteActaImage, getActaImageUrl, uploadActaImage } from "@/lib/actas-entrega-cloudinary";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireActiveUser(request);
  if ("error" in ctx) return ctx.error;
  if (ctx.isActasManager) return NextResponse.json({ error: "Acceso de solo consulta" }, { status: 403 });
  const { id } = await params;
  const form = await request.formData();
  const itemId = form.get("item_id");
  const file = form.get("archivo");
  if (typeof itemId !== "string" || !(file instanceof File) || !ALLOWED_TYPES.has(file.type) || file.size <= 0 || file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "Imagen inválida. Usa JPG, PNG o WebP de máximo 10 MB" }, { status: 400 });
  }
  const { data: acta } = await ctx.admin.from("actas_entrega").select("receptor_id, estado").eq("id", id).single();
  if (!acta || acta.receptor_id !== ctx.authUserId || acta.estado !== "pendiente_recepcion") {
    return NextResponse.json({ error: "No puedes agregar evidencias a esta acta" }, { status: 403 });
  }
  const { data: item } = await ctx.admin.from("actas_entrega_items").select("id").eq("id", itemId).eq("acta_id", id).single();
  if (!item) return NextResponse.json({ error: "Ítem inválido" }, { status: 400 });

  let upload;
  try {
    upload = await uploadActaImage(Buffer.from(await file.arrayBuffer()), {
      folder: `${id}/evidencias/${itemId}`,
      publicId: crypto.randomUUID(),
      evidence: true,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No fue posible subir la imagen" }, { status: 500 });
  }
  const { data: evidence, error } = await ctx.admin.from("actas_entrega_evidencias").insert({
    acta_id: id,
    item_id: itemId,
    storage_path: upload.public_id,
    nombre_original: file.name.slice(0, 255),
    mime_type: file.type,
    tamano: file.size,
    uploaded_by: ctx.authUserId,
  }).select().single();
  if (error) {
    await deleteActaImage(upload.public_id);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  await ctx.admin.from("actas_entrega_eventos").insert({ acta_id: id, actor_id: ctx.authUserId, tipo: "evidencia_agregada", detalle: { item_id: itemId } });
  return NextResponse.json({ ...evidence, url: getActaImageUrl(upload.public_id) }, { status: 201 });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireActiveUser(request);
  if ("error" in ctx) return ctx.error;
  if (ctx.isActasManager) return NextResponse.json({ error: "Acceso de solo consulta" }, { status: 403 });
  const { id } = await params;
  const evidenceId = new URL(request.url).searchParams.get("evidencia_id");
  const { data: acta } = await ctx.admin.from("actas_entrega").select("receptor_id, estado").eq("id", id).single();
  if (!acta || acta.receptor_id !== ctx.authUserId || acta.estado !== "pendiente_recepcion" || !evidenceId) {
    return NextResponse.json({ error: "No puedes eliminar esta evidencia" }, { status: 403 });
  }
  const { data: evidence } = await ctx.admin.from("actas_entrega_evidencias").select("storage_path").eq("id", evidenceId).eq("acta_id", id).single();
  if (!evidence) return NextResponse.json({ error: "Evidencia no encontrada" }, { status: 404 });
  await ctx.admin.from("actas_entrega_evidencias").delete().eq("id", evidenceId);
  await deleteActaImage(evidence.storage_path);
  return NextResponse.json({ ok: true });
}
