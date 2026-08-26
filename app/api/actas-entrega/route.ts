import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { relationName, requireActiveUser } from "@/lib/actas-entrega";

const itemSchema = z.object({
  descripcion: z.string().trim().min(2).max(500),
  cantidad: z.coerce.number().int().min(1).max(10000),
  serial_identificador: z.string().trim().max(200).optional().nullable(),
  observaciones_entrega: z.string().trim().max(2000).optional().nullable(),
});

const createSchema = z.object({
  receptor_id: z.string().uuid(),
  items: z.array(itemSchema).min(1).max(100),
});

export async function GET(request: NextRequest) {
  const ctx = await requireActiveUser(request);
  if ("error" in ctx) return ctx.error;

  const { searchParams } = new URL(request.url);
  const estado = searchParams.get("estado");
  const scope = searchParams.get("scope");
  let query = ctx.admin
    .from("actas_entrega")
    .select("*, actas_entrega_items(count)")
    .order("created_at", { ascending: false });

  if (!ctx.canViewAllActas || scope !== "todas") {
    query = query.or(`entregante_id.eq.${ctx.authUserId},receptor_id.eq.${ctx.authUserId}`);
  }
  if (estado) query = query.eq("estado", estado);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function POST(request: NextRequest) {
  const ctx = await requireActiveUser(request);
  if ("error" in ctx) return ctx.error;
  if (ctx.isActasManager) {
    return NextResponse.json({ error: "El rol Gestor de actas es de solo consulta" }, { status: 403 });
  }

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Receptor e ítems válidos son obligatorios", details: parsed.error.flatten() }, { status: 400 });
  }
  if (parsed.data.receptor_id === ctx.authUserId) {
    return NextResponse.json({ error: "El entregante y el receptor deben ser usuarios diferentes" }, { status: 400 });
  }

  const { data: receptor, error: receptorError } = await ctx.admin
    .from("usuario_nomina")
    .select("auth_user_id, colaborador, cedula, estado, correo_electronico, cargos:cargo_id(nombre)")
    .eq("auth_user_id", parsed.data.receptor_id)
    .eq("estado", "activo")
    .single();
  if (receptorError || !receptor) {
    return NextResponse.json({ error: "El receptor no existe, está inactivo o no tiene acceso" }, { status: 400 });
  }

  const { data: acta, error: actaError } = await ctx.admin
    .from("actas_entrega")
    .insert({
      entregante_id: ctx.authUserId,
      receptor_id: receptor.auth_user_id,
      empresa_id: ctx.profile.empresa_id,
      entregante_nombre: ctx.profile.colaborador,
      entregante_documento: ctx.profile.cedula || null,
      entregante_cargo: relationName(ctx.profile.cargos),
      receptor_nombre: receptor.colaborador,
      receptor_documento: receptor.cedula || null,
      receptor_cargo: relationName((receptor as any).cargos),
      empresa_nombre: relationName(ctx.profile.empresas),
    })
    .select()
    .single();
  if (actaError || !acta) {
    return NextResponse.json({ error: actaError?.message || "No fue posible crear el acta" }, { status: 500 });
  }

  const items = parsed.data.items.map((item, index) => ({
    acta_id: acta.id,
    descripcion: item.descripcion,
    cantidad: item.cantidad,
    serial_identificador: item.serial_identificador || null,
    observaciones_entrega: item.observaciones_entrega || null,
    orden: index,
  }));
  const { error: itemsError } = await ctx.admin.from("actas_entrega_items").insert(items);
  if (itemsError) {
    await ctx.admin.from("actas_entrega").delete().eq("id", acta.id);
    return NextResponse.json({ error: itemsError.message }, { status: 500 });
  }

  await ctx.admin.from("actas_entrega_eventos").insert({
    acta_id: acta.id,
    actor_id: ctx.authUserId,
    tipo: "creada",
    detalle: { total_items: items.length },
  });
  return NextResponse.json(acta, { status: 201 });
}
