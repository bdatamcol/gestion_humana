import { createAdminSupabaseClient } from './supabase-server'

interface CrearNotificacionParams {
  tipo: 'certificacion_laboral' | 'vacaciones' | 'permisos' | 'incapacidades'
  solicitud_id: string
  usuario_solicitante_id: string
  nombre_usuario: string
}

/**
 * Crea una notificación para administradores cuando se realiza una nueva solicitud
 */
export async function crearNotificacionNuevaSolicitud({
  tipo,
  solicitud_id,
  usuario_solicitante_id,
  nombre_usuario
}: CrearNotificacionParams) {
  try {
    const supabase = createAdminSupabaseClient()

    // Obtener todos los administradores y moderadores
    const { data: administradores, error: adminError } = await supabase
      .from('usuario_nomina')
      .select('auth_user_id')
      .in('rol', ['administrador', 'moderador'])
      .eq('estado', 'activo')

    if (adminError) {
      console.error('Error al obtener administradores:', adminError)
      return { success: false, error: adminError }
    }

    if (!administradores || administradores.length === 0) {
      console.warn('No se encontraron administradores activos')
      return { success: false, error: 'No hay administradores activos' }
    }

    // Mapear tipos a mensajes legibles
    const tipoTexto = {
      'certificacion_laboral': 'certificación laboral',
      'vacaciones': 'vacaciones',
      'permisos': 'permiso',
      'incapacidades': 'incapacidad'
    }[tipo]

    const titulo = `Nueva solicitud de ${tipoTexto}`
    const mensaje = `Tienes una nueva solicitud de ${tipoTexto} de ${nombre_usuario}`

    // Crear notificaciones para todos los administradores
    const notificaciones = administradores.map(admin => ({
      usuario_id: admin.auth_user_id,
      tipo,
      titulo,
      mensaje,
      solicitud_id
    }))

    const { data, error } = await supabase
      .from('notificaciones')
      .insert(notificaciones)
      .select()

    if (error) {
      console.error('Error al crear notificaciones:', error)
      return { success: false, error }
    }

    console.log(`Notificaciones creadas para ${administradores.length} administradores`)
    return { success: true, data }

  } catch (error) {
    console.error('Error en crearNotificacionNuevaSolicitud:', error)
    return { success: false, error }
  }
}

/**
 * Crea una notificación para el usuario cuando su solicitud cambia de estado
 */
export async function crearNotificacionCambioEstado({
  tipo,
  solicitud_id,
  usuario_id,
  nuevo_estado,
  motivo_rechazo
}: {
  tipo: 'certificacion_laboral' | 'vacaciones' | 'permisos' | 'incapacidades'
  solicitud_id: string
  usuario_id: string
  nuevo_estado: 'aprobado' | 'rechazado'
  motivo_rechazo?: string
}) {
  try {
    const supabase = createAdminSupabaseClient()

    const tipoTexto = {
      'certificacion_laboral': 'certificación laboral',
      'vacaciones': 'vacaciones',
      'permisos': 'permiso',
      'incapacidades': 'incapacidad'
    }[tipo]

    const estadoTexto = nuevo_estado === 'aprobado' ? 'aprobada' : 'rechazada'
    const titulo = `Solicitud de ${tipoTexto} ${estadoTexto}`
    
    let mensaje = `Tu solicitud de ${tipoTexto} ha sido ${estadoTexto}`
    if (nuevo_estado === 'rechazado' && motivo_rechazo) {
      mensaje += `. Motivo: ${motivo_rechazo}`
    }

    const { data, error } = await supabase
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
      console.error('Error al crear notificación de cambio de estado:', error)
      return { success: false, error }
    }

    return { success: true, data }

  } catch (error) {
    console.error('Error en crearNotificacionCambioEstado:', error)
    return { success: false, error }
  }
}

/**
 * Obtiene el conteo de notificaciones no leídas para un usuario
 */
export async function obtenerConteoNotificacionesNoLeidas(usuario_id: string) {
  try {
    const supabase = createAdminSupabaseClient()

    const { count, error } = await supabase
      .from('notificaciones')
      .select('*', { count: 'exact', head: true })
      .eq('usuario_id', usuario_id)
      .eq('leida', false)

    if (error) {
      console.error('Error al obtener conteo de notificaciones:', error)
      return { success: false, error, count: 0 }
    }

    return { success: true, count: count || 0 }

  } catch (error) {
    console.error('Error en obtenerConteoNotificacionesNoLeidas:', error)
    return { success: false, error, count: 0 }
  }
}
