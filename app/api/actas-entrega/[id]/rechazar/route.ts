import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireActiveUser } from "@/lib/actas-entrega";
import { sendActaEmail } from "@/lib/actas-entrega-email";

const schema = z.object({ motivo: z.string().trim().min(10).max(2000) });

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireActiveUser(request);
  if ("error" in ctx) return ctx.error;
  const { id } = await params;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Indica un motivo de al menos 10 caracteres" }, { status: 400 });
  const { data: acta } = await ctx.admin.from("actas_entrega").select("*").eq("id", id).single();
  if (!acta || acta.receptor_id !== ctx.authUserId || acta.estado !== "pendiente_recepcion") {
    return NextResponse.json({ error: "El acta no puede rechazarse" }, { status: 403 });
  }
  await ctx.admin.from("actas_entrega").update({ estado: "rechazada", motivo_rechazo: parsed.data.motivo, fecha_respuesta: new Date().toISOString() }).eq("id", id).eq("estado", "pendiente_recepcion");
  await Promise.all([
    ctx.admin.from("actas_entrega_eventos").insert({ acta_id: id, actor_id: ctx.authUserId, tipo: "rechazada", detalle: { motivo: parsed.data.motivo } }),
    ctx.admin.from("notificaciones").insert({ usuario_id: acta.entregante_id, tipo: "acta_entrega_rechazada", titulo: "Acta de entrega rechazada", mensaje: `${acta.receptor_nombre} rechazó el acta ${acta.numero_acta}.`, solicitud_id: id, enlace: `/perfil/actas-entrega/${id}` }),
  ]);
  const { data: entregante } = await ctx.admin.from("usuario_nomina").select("correo_electronico").eq("auth_user_id", acta.entregante_id).single();
  await sendActaEmail({ actaId: id, tipo: "rechazada", destinatario: entregante?.correo_electronico || null, nombreDestinatario: acta.entregante_nombre, nombreActor: acta.receptor_nombre, numeroActa: acta.numero_acta, mensaje: `El acta fue rechazada. Motivo: ${parsed.data.motivo}`, ruta: `/perfil/actas-entrega/${id}` });
  return NextResponse.json({ ok: true });
}
