import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'

// Función auxiliar para eliminar usuario
async function deleteUserOnline(token: string) {
  // Crear cliente con el token del usuario autenticado
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    }
  )
  
  // Verificar el token y obtener el usuario
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  
  if (authError || !user) {
    throw new Error('Token inválido')
  }

  // Eliminar el usuario de la tabla online_users
  const { error: deleteError } = await supabase
    .from('online_users')
    .delete()
    .eq('user_id', user.id)

  if (deleteError) {
    throw new Error('Error al eliminar usuario online')
  }

  return { success: true }
}

// DELETE - Eliminar usuario cuando sale de la plataforma
export async function DELETE(request: NextRequest) {
  try {
    let token = ''
    
    // Obtener token del header Authorization
    const authHeader = request.headers.get('authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.replace('Bearer ', '')
    }

    if (!token) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const result = await deleteUserOnline(token)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error en DELETE heartbeat:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// POST - Manejar tanto heartbeat como eliminación via sendBeacon
export async function POST(request: NextRequest) {
  try {
    // Verificar si es una eliminación via sendBeacon
    const url = new URL(request.url)
    const method = url.searchParams.get('_method')
    
    if (method === 'DELETE') {
      // Manejar eliminación via sendBeacon
      let token = ''
      
      try {
        const formData = await request.formData()
        token = formData.get('token') as string
      } catch {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
      }

      if (!token) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
      }

      const result = await deleteUserOnline(token)
      return NextResponse.json(result)
    }

    // Manejar heartbeat normal
    // Obtener token del header Authorization
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Crear cliente con el token del usuario autenticado
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    )
    
    // Verificar el token y obtener el usuario
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      console.error('Error de autenticación:', authError)
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
    }

    // Actualizar o insertar el heartbeat del usuario
    const { error: upsertError } = await supabase
      .from('online_users')
      .upsert({
        user_id: user.id,
        last_seen_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })

    if (upsertError) {
      console.error('Error al actualizar heartbeat:', upsertError)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error en POST heartbeat:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}


// GET - Obtener cantidad de usuarios en línea
export async function GET(request: NextRequest) {
  try {
    // Obtener token del header Authorization
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Crear cliente con el token del usuario autenticado
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    )
    
    // Verificar el token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      console.error('Error de autenticación en GET:', authError)
      // Si hay error de autenticación, aún podemos devolver datos vacíos en lugar de error
      return NextResponse.json({ 
        count: 0,
        users: [],
        timestamp: new Date().toISOString()
      })
    }

    // Limpiar usuarios inactivos usando service role
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
    
    // Limpieza más agresiva: 90 segundos para casos de cierre abrupto del navegador
    const ninetySecondsAgoCleanup = new Date(Date.now() - 90 * 1000).toISOString()
    const { error: cleanupError, count: deletedCount } = await adminSupabase
      .from('online_users')
      .delete({ count: 'exact' })
      .lt('last_seen_at', ninetySecondsAgoCleanup)
    
    if (cleanupError) {
      console.error('Error al limpiar usuarios inactivos:', cleanupError)
    } else if (deletedCount && deletedCount > 0) {
      console.log(`Limpieza automática: ${deletedCount} usuarios inactivos eliminados`)
    }

    // Obtener usuarios en línea (últimos 90 segundos, consistente con la limpieza)
    const ninetySecondsAgo = new Date(Date.now() - 90 * 1000).toISOString()
    
    const { data: onlineUsers, error: queryError } = await supabase
      .from('online_users')
      .select('user_id, last_seen_at')
      .gte('last_seen_at', ninetySecondsAgo)
      .order('last_seen_at', { ascending: false })

    if (queryError) {
      console.error('Error al consultar usuarios en línea:', queryError)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }

    // Obtener información adicional de los usuarios desde usuario_nomina
    // Filtrar solo usuarios con rol 'usuario'
    const usersWithInfo = []
    if (onlineUsers && onlineUsers.length > 0) {
      for (const onlineUser of onlineUsers) {
        const { data: userData, error: userError } = await supabase
          .from('usuario_nomina')
          .select('colaborador, avatar_path, rol')
          .eq('auth_user_id', onlineUser.user_id)
          .eq('rol', 'usuario')
          .single()
        
        // Solo agregar si el usuario tiene rol 'usuario'
        if (userData && !userError) {
          usersWithInfo.push({
            user_id: onlineUser.user_id,
            last_seen_at: onlineUser.last_seen_at,
            colaborador: userData?.colaborador || 'Usuario',
            avatar_path: userData?.avatar_path
          })
        }
      }
    }

    const count = usersWithInfo.length

    return NextResponse.json({ 
      count,
      users: usersWithInfo,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error al obtener usuarios en línea:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
