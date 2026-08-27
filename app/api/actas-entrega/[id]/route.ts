import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ACTA_MANIFIESTO, requireActiveUser } from "@/lib/actas-entrega";
import { getActaImageUrl } from "@/lib/actas-entrega-cloudinary";

const updateSchema = z.object({
  receptor_id: z.string().uuid(),
  items: z.array(z.object({
    descripcion: z.string().trim().min(2).max(500),
    cantidad: z.coerce.number().int().min(1).max(10000),
    serial_identificador: z.string().trim().max(200).optional().nullable(),
    observaciones_entrega: z.string().trim().max(2000).optional().nullable(),
  })).min(1).max(100),
});

async function getActa(ctx: any, id: string) {
  return ctx.admin
    .from("actas_entrega")
    .select("*, actas_entrega_items(*), actas_entrega_evidencias(*), actas_entrega_firmas(*), actas_entrega_eventos(*)")
    .eq("id", id)
    .single();
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireActiveUser(request);
  if ("error" in ctx) return ctx.error;
  const { id } = await params;
  const { data, error } = await getActa(ctx, id);
  if (error || !data) return NextResponse.json({ error: "Acta no encontrada" }, { status: 404 });
  if (!ctx.canViewAllActas && data.entregante_id !== ctx.authUserId && data.receptor_id !== ctx.authUserId) {
    return NextResponse.json({ error: "Sin acceso al acta" }, { status: 403 });
  }

  data.actas_entrega_evidencias = (data.actas_entrega_evidencias || []).map((file: any) => ({
    ...file,
    url: getActaImageUrl(file.storage_path),
  }));
  data.actas_entrega_firmas = (data.actas_entrega_firmas || []).map((file: any) => ({
    ...file,
    url: getActaImageUrl(file.storage_path),
  }));
  data.actas_entrega_items.sort((a: any, b: any) => a.orden - b.orden);
  data.actas_entrega_eventos.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  return NextResponse.json(data);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireActiveUser(request);
  if ("error" in ctx) return ctx.error;
  const { id } = await params;
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  const { data: acta } = await ctx.admin.from("actas_entrega").select("*").eq("id", id).single();
  if (!acta || acta.entregante_id !== ctx.authUserId || acta.estado !== "borrador") {
    return NextResponse.json({ error: "Solo el entregante puede editar un borrador" }, { status: 403 });
  }
  if (parsed.data.receptor_id === ctx.authUserId) return NextResponse.json({ error: "Receptor inválido" }, { status: 400 });
  const { data: receptor } = await ctx.admin
    .from("usuario_nomina")
    .select("auth_user_id, colaborador, cedula, estado, empresa_id, cargos:cargo_id(nombre), empresas:empresa_id(nombre)")
    .eq("auth_user_id", parsed.data.receptor_id).eq("estado", "activo").single();
  if (!receptor) return NextResponse.json({ error: "Receptor inválido" }, { status: 400 });
  const empresa = Array.isArray((receptor as any).empresas) ? (receptor as any).empresas[0]?.nombre : (receptor as any).empresas?.nombre;
  if (!receptor.empresa_id || !empresa) return NextResponse.json({ error: "El receptor debe tener una empresa asignada" }, { status: 400 });

  await ctx.admin.from("actas_entrega_items").delete().eq("acta_id", id);
  const { error: itemsError } = await ctx.admin.from("actas_entrega_items").insert(parsed.data.items.map((item, orden) => ({
    ...item,
    serial_identificador: item.serial_identificador || null,
    observaciones_entrega: item.observaciones_entrega || null,
    acta_id: id,
    orden,
  })));
  if (itemsError) return NextResponse.json({ error: itemsError.message }, { status: 500 });

  const cargo = Array.isArray((receptor as any).cargos) ? (receptor as any).cargos[0]?.nombre : (receptor as any).cargos?.nombre;
  const { error } = await ctx.admin.from("actas_entrega").update({
    receptor_id: receptor.auth_user_id,
    receptor_nombre: receptor.colaborador,
    receptor_documento: receptor.cedula || null,
    receptor_cargo: cargo || "Sin información",
    empresa_id: receptor.empresa_id,
    empresa_nombre: empresa,
    manifiesto: acta.manifiesto || ACTA_MANIFIESTO,
  }).eq("id", id).eq("estado", "borrador");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await ctx.admin.from("actas_entrega_eventos").insert({ acta_id: id, actor_id: ctx.authUserId, tipo: "borrador_actualizado" });
  return NextResponse.json({ ok: true });
}
