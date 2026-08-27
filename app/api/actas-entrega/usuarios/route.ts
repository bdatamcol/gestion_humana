import { NextRequest, NextResponse } from "next/server";
import { requireActiveUser, relationName } from "@/lib/actas-entrega";

export async function GET(request: NextRequest) {
  const ctx = await requireActiveUser(request);
  if ("error" in ctx) return ctx.error;
  const term = new URL(request.url).searchParams.get("buscar")?.trim() || "";

  let query = ctx.admin
    .from("usuario_nomina")
    .select("auth_user_id, colaborador, correo_electronico, cedula, empresas:empresa_id(nombre), cargos:cargo_id(nombre)")
    .eq("estado", "activo")
    .not("auth_user_id", "is", null)
    .neq("auth_user_id", ctx.authUserId)
    .order("colaborador")
    .limit(30);
  if (term.length >= 2) {
    const safe = term.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ@._ -]/g, " ");
    query = query.or(`colaborador.ilike.%${safe}%,correo_electronico.ilike.%${safe}%,cedula.ilike.%${safe}%`);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json((data || []).map((user: any) => ({
    auth_user_id: user.auth_user_id,
    colaborador: user.colaborador,
    correo_electronico: user.correo_electronico,
    cedula: user.cedula,
    empresa: relationName(user.empresas),
    cargo: relationName(user.cargos),
  })));
}
