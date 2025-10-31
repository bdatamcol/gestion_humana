import { NextResponse } from 'next/server'
import { createSupabaseClient } from "@/lib/supabase"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const empresaId = searchParams.get("empresaId")
  const usuarioId = searchParams.get("usuarioId")
  const supabase = createSupabaseClient()
  let query = supabase
    .from("solicitudes_vacaciones")
    .select("*")
    .order("fecha_solicitud", { ascending: false })

  if (empresaId) query = query.eq("empresa_id", Number(empresaId))
  if (usuarioId)  query = query.eq("usuario_id", usuarioId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const body = await req.json()
  const { usuario_id, empresa_id, fecha_inicio, fecha_fin } = body
  if (!usuario_id || !empresa_id || !fecha_inicio || !fecha_fin) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 })
  }
  const supabase = createSupabaseClient()
  const { data, error } = await supabase
    .from("solicitudes_vacaciones")
    .insert([{
      usuario_id,
      empresa_id,
      fecha_inicio,
      fecha_fin,
      estado: "pendiente",
      fecha_solicitud: new Date().toISOString()
    }])
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data?.[0] ?? null)
}
