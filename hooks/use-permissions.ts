import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

interface UserData {
  id: string
  rol: 'usuario' | 'jefe' | 'administrador'
  estado: 'activo' | 'inactivo'
}

export function usePermissions() {
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadUserData()
  }, [])

  const loadUserData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Obtener sesión actual
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session) {
        console.log('No hay sesión activa')
        setUserData(null)
        return
      }

      // Obtener datos del usuario
      const { data: user, error: userError } = await supabase
        .from('usuario_nomina')
        .select('id, rol, estado')
        .eq('auth_user_id', session.user.id)
        .single()

      if (userError) {
        console.error('Error al obtener datos del usuario:', userError)
        setUserData(null)
        return
      }

      setUserData(user)
      console.log('Usuario cargado:', user)

    } catch (err) {
      console.error('Error en loadUserData:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
      setUserData(null)
    } finally {
      setLoading(false)
    }
  }

  // Función para verificar si el usuario puede acceder a una ruta
  const canAccess = (ruta: string): boolean => {
    if (!userData) return false
    
    // Los administradores pueden acceder a todo
    if (userData.rol === 'administrador') return true
    
    // Usuarios y jefes acceden a rutas básicas de perfil
    const rutasUsuario = ['/perfil', '/perfil/solicitudes', '/perfil/comunicados', '/perfil/novedades']
    return rutasUsuario.includes(ruta)
  }

  // Función para verificar permisos específicos
  const hasPermission = (moduloRuta: string, accion: 'ver' | 'crear' | 'editar' | 'eliminar'): boolean => {
    if (!userData) return false
    
    // Los administradores tienen todos los permisos
    if (userData.rol === 'administrador') return true
    
    // Los usuarios regulares solo pueden ver y crear en sus módulos
    const rutasUsuario = ['/perfil', '/perfil/solicitudes', '/perfil/comunicados', '/perfil/novedades']
    if (!rutasUsuario.includes(moduloRuta)) return false
    
    // Jefes pueden editar en solicitudes (para aprobar/rechazar)
    if (userData.rol === 'jefe' && moduloRuta === '/perfil/solicitudes') {
      return accion === 'ver' || accion === 'crear' || accion === 'editar'
    }
    // Usuarios pueden ver y crear, pero no editar ni eliminar
    return accion === 'ver' || accion === 'crear'
  }

  // Función para verificar si es administrador
  const isAdministrator = (): boolean => {
    return userData?.rol === 'administrador'
  }

  // Función para verificar si es administrador
  const isAdmin = (): boolean => {
    return userData?.rol === 'administrador'
  }

  // Función para verificar si es jefe
  const isBoss = (): boolean => {
    return userData?.rol === 'jefe'
  }

  // Función para refrescar datos
  const refreshPermissions = () => {
    loadUserData()
  }

  return {
    userData,
    loading,
    error,
    canAccess,
    hasPermission,
    isAdministrator,
    isAdmin,
    isBoss,
    refreshPermissions
  }
}
