import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase-server'

// GET - Obtener notificaciones del usuario autenticado
export async function GET(request: NextRequest) {
  try {
    // Obtener token del header Authorization
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ No authorization header found')
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Usar cliente administrativo para verificar el token
    const adminSupabase = createAdminSupabaseClient()
    
    // Verificar el token directamente con el admin client
    const { data: { user }, error: authError } = await adminSupabase.auth.getUser(token)
    
    console.log('Auth error:', authError)
    console.log('User:', user ? 'exists' : 'null')
    
    if (authError || !user) {
      console.log('Authentication failed:', { authError, hasUser: !!user })
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Obtener datos del usuario para verificar que existe en usuario_nomina
    const { data: userData, error: userError } = await adminSupabase
      .from('usuario_nomina')
      .select('auth_user_id, rol')
      .eq('auth_user_id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    // Obtener parámetros de consulta
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')
    const soloNoLeidas = searchParams.get('solo_no_leidas') === 'true'

    // Construir consulta
    let query = adminSupabase
      .from('notificaciones')
      .select('*')
      .eq('usuario_id', userData.auth_user_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (soloNoLeidas) {
      query = query.eq('leida', false)
    }

    const { data: notificaciones, error } = await query

    console.log('Usuario ID:', userData.auth_user_id)
    console.log('Notificaciones encontradas:', notificaciones?.length || 0)
    console.log('Notificaciones:', notificaciones)

    if (error) {
      console.error('Error al obtener notificaciones:', error)
      return NextResponse.json({ error: 'Error al obtener notificaciones' }, { status: 500 })
    }

    // Obtener conteo de notificaciones no leídas
    const { count: noLeidasCount, error: countError } = await adminSupabase
      .from('notificaciones')
      .select('*', { count: 'exact', head: true })
      .eq('usuario_id', userData.auth_user_id)
      .eq('leida', false)

    if (countError) {
      console.error('Error al contar notificaciones no leídas:', countError)
    }

    return NextResponse.json({
      notificaciones,
      no_leidas_count: noLeidasCount || 0
    })

  } catch (error) {
    console.error('Error en GET /api/notificaciones:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// POST - Crear nueva notificación (solo para administradores)
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    
    // Verificar autenticación
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar que el usuario es administrador
    const { data: userData, error: userError } = await supabase
      .from('usuario_nomina')
      .select('rol')
      .eq('auth_user_id', session.user.id)
      .single()

    if (userError || !userData || !['administrador', 'moderador'].includes(userData.rol)) {
      return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 })
    }

    const body = await request.json()
    const { usuario_id, tipo, titulo, mensaje, solicitud_id } = body

    // Validar datos requeridos
    if (!usuario_id || !tipo || !titulo || !mensaje) {
      return NextResponse.json({ 
        error: 'Faltan campos requeridos: usuario_id, tipo, titulo, mensaje' 
      }, { status: 400 })
    }

    // Crear notificación
    const { data: notificacion, error } = await supabase
      .from('notificaciones')
      .insert({
        usuario_id,
        tipo,
        titulo,
        mensaje,
        solicitud_id
      })
      .select()
      .single()

    if (error) {
      console.error('Error al crear notificación:', error)
      return NextResponse.json({ error: 'Error al crear notificación' }, { status: 500 })
    }

    return NextResponse.json({ notificacion }, { status: 201 })

  } catch (error) {
    console.error('Error en POST /api/notificaciones:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// PATCH - Marcar notificaciones como leídas
export async function PATCH(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const adminSupabase = createAdminSupabaseClient()
    
    // Obtener token del header Authorization
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Verificar el token con Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Obtener datos del usuario para verificar que existe en usuario_nomina
    const { data: userData, error: userError } = await supabase
      .from('usuario_nomina')
      .select('auth_user_id, rol')
      .eq('auth_user_id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    const body = await request.json()
    const { notificacion_ids, marcar_todas = false } = body

    let query = adminSupabase
      .from('notificaciones')
      .update({ leida: true, updated_at: new Date().toISOString() })
      .eq('usuario_id', userData.auth_user_id)

    if (marcar_todas) {
      // Marcar todas las notificaciones del usuario como leídas
      query = query.eq('leida', false)
    } else if (notificacion_ids && Array.isArray(notificacion_ids)) {
      // Marcar notificaciones específicas como leídas
      query = query.in('id', notificacion_ids)
    } else {
      return NextResponse.json({ 
        error: 'Debe proporcionar notificacion_ids o marcar_todas=true' 
      }, { status: 400 })
    }

    const { error } = await query

    if (error) {
      console.error('Error al marcar notificaciones como leídas:', error)
      return NextResponse.json({ error: 'Error al actualizar notificaciones' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error en PATCH /api/notificaciones:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
