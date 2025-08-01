import { NextResponse } from "next/server"
import { createSupabaseClient } from "@/lib/supabase"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const empresaId = searchParams.get("empresaId")
  if (!empresaId) {
    return NextResponse.json({ error: "empresaId is required" }, { status: 400 })
  }
  const supabase = createSupabaseClient()
  const { data, error } = await supabase
    .from("vacaciones_disponibilidad")
    .select("*")
    .eq("empresa_id", Number(empresaId))
    .order("fecha_inicio", { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const { empresa_id, fecha_inicio, fecha_fin, disponible } = await req.json()
  if (!empresa_id || !fecha_inicio || !fecha_fin || disponible == null) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 })
  }
  const supabase = createSupabaseClient()
  const { data, error } = await supabase
    .from("vacaciones_disponibilidad")
    .insert([{ empresa_id, fecha_inicio, fecha_fin, disponible }])
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data?.[0] ?? null)
}
