import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { normRol } from "@/lib/roles";

export const ACTA_ESTADOS = [
  "borrador",
  "pendiente_recepcion",
  "completada",
  "aceptada_con_novedades",
  "rechazada",
  "anulada",
] as const;

export type ActaEstado = (typeof ACTA_ESTADOS)[number];

export const ACTA_MANIFIESTO = `Al firmar la presente acta, la persona receptora manifiesta:

1. Que es responsable del bien y/o suministro que recibe mediante esta acta, así como de su adecuado y buen uso a partir de la fecha.
2. Que, en caso de daño, deterioro o pérdida, se hará responsable del mismo.
3. Que, si el bien y/o suministro es entregado posteriormente a otro colaborador, deberá formalizar dicha entrega mediante una nueva acta, incluyendo las recomendaciones adicionales a que haya lugar.`;

export interface ActaItemInput {
  id?: string;
  descripcion: string;
  cantidad: number;
  serial_identificador?: string | null;
  observaciones_entrega?: string | null;
}

export async function requireActiveUser(request: NextRequest) {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.toLowerCase().startsWith("bearer ")
    ? authorization.slice(7).trim()
    : "";
  if (!token) {
    return { error: NextResponse.json({ error: "No autenticado" }, { status: 401 }) };
  }

  const admin = createAdminSupabaseClient();
  const { data: authData, error: authError } = await admin.auth.getUser(token);
  if (authError || !authData.user) {
    return { error: NextResponse.json({ error: "Sesión inválida" }, { status: 401 }) };
  }

  const { data: profile, error: profileError } = await admin
    .from("usuario_nomina")
    .select("auth_user_id, colaborador, correo_electronico, cedula, rol, estado, empresa_id, cargo_id, empresas:empresa_id(nombre), cargos:cargo_id(nombre)")
    .eq("auth_user_id", authData.user.id)
    .single();

  if (profileError || !profile || profile.estado !== "activo") {
    return { error: NextResponse.json({ error: "Usuario inexistente o inactivo" }, { status: 403 }) };
  }

  return {
    admin,
    authUserId: authData.user.id,
    profile: profile as any,
    isAdmin: normRol(profile.rol) === "administrador",
    isActasManager: normRol(profile.rol) === "gestor_actas",
    canViewAllActas: ["administrador", "gestor_actas"].includes(normRol(profile.rol)),
  };
}

export function relationName(value: any): string {
  const relation = Array.isArray(value) ? value[0] : value;
  return relation?.nombre || "Sin información";
}

export function hashActaPayload(acta: any, items: any[]): string {
  const payload = JSON.stringify({
    id: acta.id,
    numero_acta: acta.numero_acta,
    entregante_id: acta.entregante_id,
    receptor_id: acta.receptor_id,
    empresa_nombre: acta.empresa_nombre,
    ...(acta.manifiesto ? { manifiesto: acta.manifiesto } : {}),
    items: items.map((item) => ({
      id: item.id,
      descripcion: item.descripcion,
      cantidad: item.cantidad,
      serial_identificador: item.serial_identificador,
      observaciones_entrega: item.observaciones_entrega,
      recibido: item.recibido,
      estado_recepcion: item.estado_recepcion,
      notas_recepcion: item.notas_recepcion,
    })),
  });
  return createHash("sha256").update(payload).digest("hex");
}

export function decodeSignature(dataUrl: unknown): Buffer | null {
  if (typeof dataUrl !== "string") return null;
  const match = dataUrl.match(/^data:image\/png;base64,([A-Za-z0-9+/=]+)$/);
  if (!match) return null;
  const buffer = Buffer.from(match[1], "base64");
  return buffer.length > 0 && buffer.length <= 2 * 1024 * 1024 ? buffer : null;
}

export function requestMetadata(request: NextRequest) {
  return {
    ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip"),
    userAgent: request.headers.get("user-agent"),
  };
}
