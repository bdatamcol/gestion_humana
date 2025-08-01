import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseClient } from "@/lib/supabase"

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params; // Resuelve la promesa para obtener el id
  const body = await req.json()
  const supabase = createSupabaseClient()
  const { data, error } = await supabase
    .from("solicitudes_vacaciones")
    .update({
      ...body,
      fecha_resolucion: new Date().toISOString(),
    })
    .eq("id", id) // Usa el id resuelto
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data?.[0] ?? null)
}
