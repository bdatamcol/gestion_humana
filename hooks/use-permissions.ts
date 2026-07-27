import { useState, useEffect } from 'react'
import { createSupabaseClient, normRol } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'

interface UserData {
  id: string
  rol: 'usuario' | 'jefe' | 'administrador'
  estado: 'activo' | 'inactivo'
  empresa_id?: number | null
  empresa_nombre?: string | null
}

export function usePermissions() {
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Sesion centralizada via AuthProvider.
  const { userId } = useAuth()

  useEffect(() => {
    // Esperar a que AuthProvider termine.
    if (userId === null) {
      setLoading(true)
      return
    }
    let cancelled = false
    void loadUserData(cancelled)
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  const loadUserData = async (cancelled = false) => {
    try {
      setLoading(true)
      setError(null)

      // Usamos el helper compartido para evitar multiples GoTrueClient
      // (el warning "Multiple GoTrueClient instances detected" provenia
      // de este hook creando su propio cliente ademas del singleton).
      const supabase = createSupabaseClient()

      // Obtener datos del usuario (incluye empresa para reglas especiales como BOLSA)
      const { data: user, error: userError } = await supabase
        .from('usuario_nomina')
        .select('id, rol, estado, empresa_id, empresas:empresa_id(nombre)')
        .eq('auth_user_id', userId)
        .single()

      if (cancelled) return

      if (userError) {
        console.error('Error al obtener datos del usuario:', userError)
        setUserData(null)
        return
      }

      const empresaNombre = (user as any)?.empresas?.nombre ?? null
      setUserData({
        id: (user as any).id,
        rol: (user as any).rol,
        estado: (user as any).estado,
        empresa_id: (user as any).empresa_id ?? null,
        empresa_nombre: empresaNombre,
      })

    } catch (err) {
      console.error('Error en loadUserData:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
      setUserData(null)
    } finally {
      if (!cancelled) setLoading(false)
    }
  }

  // Función para verificar si el usuario puede acceder a una ruta
  const canAccess = (ruta: string): boolean => {
    if (!userData) return false

    // Los administradores pueden acceder a todo
    if (normRol(userData.rol) === 'administrador') return true

    // Usuarios y jefes acceden a rutas básicas de perfil
    const rutasUsuario = ['/perfil', '/perfil/solicitudes', '/perfil/comunicados', '/perfil/novedades']
    return rutasUsuario.includes(ruta)
  }

  // Función para verificar permisos específicos
  const hasPermission = (moduloRuta: string, accion: 'ver' | 'crear' | 'editar' | 'eliminar'): boolean => {
    if (!userData) return false

    // Los administradores tienen todos los permisos
    if (normRol(userData.rol) === 'administrador') return true

    // Los usuarios regulares solo pueden ver y crear en sus módulos
    const rutasUsuario = ['/perfil', '/perfil/solicitudes', '/perfil/comunicados', '/perfil/novedades']
    if (!rutasUsuario.includes(moduloRuta)) return false

    // Jefes pueden editar en solicitudes (para aprobar/rechazar)
    if (normRol(userData.rol) === 'jefe' && moduloRuta === '/perfil/solicitudes') {
      return accion === 'ver' || accion === 'crear' || accion === 'editar'
    }
    // Usuarios pueden ver y crear, pero no editar ni eliminar
    return accion === 'ver' || accion === 'crear'
  }

  // Función para verificar si es administrador
  const isAdministrator = (): boolean => {
    return normRol(userData?.rol) === 'administrador'
  }

  // Función para verificar si es administrador
  const isAdmin = (): boolean => {
    return normRol(userData?.rol) === 'administrador'
  }

  // Función para verificar si es jefe
  const isBoss = (): boolean => {
    return normRol(userData?.rol) === 'jefe'
  }

  // Empresa con accesos restringidos (ej. BOLSA: solo Mis datos y Capacitaciones)
  const RESTRICTED_EMPRESAS = ['BOLSA'] as const
  const isRestrictedEmpresa = (): boolean => {
    const nombre = (userData?.empresa_nombre ?? '').toString().trim().toUpperCase()
    return RESTRICTED_EMPRESAS.includes(nombre as any)
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
    isRestrictedEmpresa,
    refreshPermissions
  }
}
