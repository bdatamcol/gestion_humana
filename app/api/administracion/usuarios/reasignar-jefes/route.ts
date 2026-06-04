import { NextRequest, NextResponse } from "next/server"
import { createClient } from '@supabase/supabase-js'

function createSupabaseFromRequest(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const authHeader = req.headers.get('authorization') || ''

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase env vars are missing')
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: authHeader ? { Authorization: authHeader } : {},
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

function createAdminSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase service role key not configured')
  }
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization') || ''
    const accessToken = authHeader.toLowerCase().startsWith('bearer ')
      ? authHeader.slice(7).trim()
      : ''

    if (!accessToken) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const supabase = createSupabaseFromRequest(request)
    const { data: authData, error: authError } = await supabase.auth.getUser(accessToken)

    if (authError || !authData.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { data: currentUser, error: currentUserError } = await supabase
      .from("usuario_nomina")
      .select("rol")
      .eq("auth_user_id", authData.user.id)
      .single()

    if (currentUserError || currentUser?.rol !== "administrador") {
      return NextResponse.json(
        { error: "Solo administradores pueden realizar esta acción" },
        { status: 403 }
      )
    }

    const adminSupabase = createAdminSupabaseClient()

    const body = await request.json()
    const { jefe_origen_id, jefe_destino_id } = body

    if (!jefe_origen_id || !jefe_destino_id) {
      return NextResponse.json(
        { error: "Se requiere jefe_origen_id y jefe_destino_id" },
        { status: 400 }
      )
    }

    if (jefe_origen_id === jefe_destino_id) {
      return NextResponse.json(
        { error: "El jefe origen y destino no pueden ser el mismo" },
        { status: 400 }
      )
    }

    const { data: jefeOrigen, error: errorJefeOrigen } = await adminSupabase
      .from("usuario_nomina")
      .select("id, auth_user_id, estado")
      .eq("auth_user_id", jefe_origen_id)
      .single()

    if (errorJefeOrigen || !jefeOrigen) {
      return NextResponse.json(
        { error: "Jefe origen no encontrado" },
        { status: 404 }
      )
    }

    if (jefeOrigen.estado !== "activo") {
      return NextResponse.json(
        { error: "El jefe origen debe estar activo" },
        { status: 400 }
      )
    }

    const { data: jefeDestino, error: errorJefeDestino } = await adminSupabase
      .from("usuario_nomina")
      .select("id, auth_user_id, estado")
      .eq("auth_user_id", jefe_destino_id)
      .single()

    if (errorJefeDestino || !jefeDestino) {
      return NextResponse.json(
        { error: "Jefe destino no encontrado" },
        { status: 404 }
      )
    }

    if (jefeDestino.estado !== "activo") {
      return NextResponse.json(
        { error: "El jefe destino debe estar activo" },
        { status: 400 }
      )
    }

    const { data: subordinados, error: errorSubordinados } = await adminSupabase
      .from("usuario_jefes")
      .select("usuario_id")
      .eq("jefe_id", jefe_origen_id)

    if (errorSubordinados) {
      return NextResponse.json(
        { error: "Error al obtener subordinados del jefe origen" },
        { status: 500 }
      )
    }

    if (!subordinados || subordinados.length === 0) {
      return NextResponse.json({
        message: "El jefe origen no tiene subordinados asignados",
        subordinados_reasignados: 0,
      })
    }

    const subordinadosIds = subordinados.map((s) => s.usuario_id)

    const { data: subordinadosActivos, error: errorActivos } = await adminSupabase
      .from("usuario_nomina")
      .select("auth_user_id")
      .in("auth_user_id", subordinadosIds)
      .eq("estado", "activo")

    if (errorActivos) {
      return NextResponse.json(
        { error: "Error al verificar estado de subordinados" },
        { status: 500 }
      )
    }

    const subordinadosActivosIds = subordinadosActivos?.map((s) => s.auth_user_id) || []

    if (subordinadosActivosIds.length === 0) {
      return NextResponse.json({
        message: "No hay subordinados activos para reasignar",
        subordinados_reasignados: 0,
      })
    }

    const { data: relacionesDestinoExistentes } = await adminSupabase
      .from("usuario_jefes")
      .select("usuario_id")
      .eq("jefe_id", jefe_destino_id)
      .in("usuario_id", subordinadosActivosIds)

    const yaTienenDestino = new Set((relacionesDestinoExistentes || []).map((r: any) => r.usuario_id))

    const subordinadosSinDestino = subordinadosActivosIds.filter(id => !yaTienenDestino.has(id))
    const subordinadosConDestino = subordinadosActivosIds.filter(id => yaTienenDestino.has(id))

    let reasignados = 0

    if (subordinadosConDestino.length > 0) {
      const { error: errorDeleteConDestino } = await adminSupabase
        .from("usuario_jefes")
        .delete()
        .eq("jefe_id", jefe_origen_id)
        .in("usuario_id", subordinadosConDestino)

      if (errorDeleteConDestino) {
        return NextResponse.json(
          { error: "Error al eliminar asignaciones: " + errorDeleteConDestino.message },
          { status: 500 }
        )
      }
      reasignados += subordinadosConDestino.length
    }

    if (subordinadosSinDestino.length > 0) {
      const { error: errorDeleteSinDestino } = await adminSupabase
        .from("usuario_jefes")
        .delete()
        .eq("jefe_id", jefe_origen_id)
        .in("usuario_id", subordinadosSinDestino)

      if (errorDeleteSinDestino) {
        return NextResponse.json(
          { error: "Error al eliminar asignaciones: " + errorDeleteSinDestino.message },
          { status: 500 }
        )
      }

      const nuevasAsignaciones = subordinadosSinDestino.map((usuario_id) => ({
        usuario_id,
        jefe_id: jefe_destino_id,
      }))

      const { error: errorInsert } = await adminSupabase
        .from("usuario_jefes")
        .insert(nuevasAsignaciones)

      if (errorInsert) {
        return NextResponse.json(
          { error: "Error al crear nuevas asignaciones: " + errorInsert.message },
          { status: 500 }
        )
      }
      reasignados += subordinadosSinDestino.length
    }

    return NextResponse.json({
      message: "Jefes reasignados exitosamente",
      subordinados_reasignados: reasignados,
      detalles: {
        solo_quitado_origen: subordinadosConDestino.length,
        reasignados_completamente: subordinadosSinDestino.length,
      },
    })
  } catch (error: any) {
    console.error("Error en reasignar-jefes:", error)
    return NextResponse.json(
      { error: "Error interno del servidor: " + (error?.message || 'Unknown error') },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization') || ''
    const accessToken = authHeader.toLowerCase().startsWith('bearer ')
      ? authHeader.slice(7).trim()
      : ''

    if (!accessToken) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const supabase = createSupabaseFromRequest(request)
    const { data: authData, error: authError } = await supabase.auth.getUser(accessToken)

    if (authError || !authData.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { data: currentUser, error: currentUserError } = await supabase
      .from("usuario_nomina")
      .select("rol")
      .eq("auth_user_id", authData.user.id)
      .single()

    if (currentUserError || currentUser?.rol !== "administrador") {
      return NextResponse.json(
        { error: "Solo administradores pueden realizar esta acción" },
        { status: 403 }
      )
    }

    const adminSupabase = createAdminSupabaseClient()

    const { searchParams } = new URL(request.url)
    const jefe_id = searchParams.get("jefe_id")

    if (!jefe_id) {
      const { data: subordinados, error } = await adminSupabase
        .from("usuario_jefes")
        .select("usuario_id, jefe_id")

      if (error) {
        return NextResponse.json(
          { error: "Error al obtener relaciones" },
          { status: 500 }
        )
      }

      return NextResponse.json({ subordinados })
    }

    const { data: subordinados, error } = await adminSupabase
      .from("usuario_jefes")
      .select("usuario_id")
      .eq("jefe_id", jefe_id)

    if (error) {
      return NextResponse.json(
        { error: "Error al obtener subordinados" },
        { status: 500 }
      )
    }

    const subordinadosIds = subordinados?.map((s) => s.usuario_id) || []

    if (subordinadosIds.length === 0) {
      return NextResponse.json({
        count: 0,
        subordinados: [],
      })
    }

    const { data: subordinadosActivos, error: errorActivos } = await adminSupabase
      .from("usuario_nomina")
      .select("auth_user_id, colaborador, estado")
      .in("auth_user_id", subordinadosIds)

    if (errorActivos) {
      return NextResponse.json(
        { error: "Error al obtener datos de subordinados" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      count: subordinadosActivos?.length || 0,
      subordinados: subordinadosActivos,
    })
  } catch (error: any) {
    console.error("Error en GET reasignar-jefes:", error)
    return NextResponse.json(
      { error: "Error interno del servidor: " + (error?.message || 'Unknown error') },
      { status: 500 }
    )
  }
}
