"use client"

import React, { useState, useEffect, useRef } from 'react'
import { Bell, Check, CheckCheck, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { createSupabaseClient } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'

interface Notificacion {
  id: string
  tipo: string
  titulo: string
  mensaje: string
  solicitud_id?: string
  leida: boolean
  created_at: string
}

interface NotificationsDropdownProps {
  className?: string
}

export function NotificationsDropdown({ className }: NotificationsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([])
  const [noLeidasCount, setNoLeidasCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const supabase = createSupabaseClient()
  const router = useRouter()

  // Funciones para manejar animaciones
  const handleOpen = () => {
    setIsOpen(true)
    setIsAnimating(true)
  }

  const handleClose = () => {
    setIsAnimating(false)
    setTimeout(() => setIsOpen(false), 200) // Aumentar duración para evitar parpadeo
  }

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        handleClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Cargar notificaciones
  const cargarNotificaciones = async (retryCount = 0) => {
    try {
      setLoading(true)
      setError(null)

      console.log('🔄 Cargando notificaciones...')
      
      // Obtener el token de acceso de Supabase
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        console.log('❌ No hay sesión activa')
        setError('Sesión no válida. Por favor, inicia sesión nuevamente.')
        return
      }

      // Solo cargar notificaciones no leídas para el dropdown
      const response = await fetch('/api/notificaciones?limit=10&solo_no_leidas=true', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      console.log('📡 Response status:', response.status)
      
      if (!response.ok) {
        if (response.status === 401) {
          setError('Sesión expirada. Por favor, recarga la página.')
          return
        }
        if (response.status === 404) {
          setError('Servicio no disponible temporalmente.')
          return
        }
        const errorText = await response.text()
        console.error('❌ Error response:', errorText)
        throw new Error(`Error al cargar notificaciones: ${response.status}`)
      }

      const data = await response.json()
      console.log('📦 Data received:', data)
      setNotificaciones(data.notificaciones || [])
      setNoLeidasCount(data.no_leidas_count || 0)
      console.log('✅ Notificaciones cargadas:', data.notificaciones?.length || 0)
    } catch (err) {
      console.error('❌ Error al cargar notificaciones:', err)
      
      // Retry logic para errores de red
      if (retryCount < 2 && err instanceof Error && err.message.includes('fetch')) {
        console.log(`🔄 Reintentando... (${retryCount + 1}/2)`)
        setTimeout(() => cargarNotificaciones(retryCount + 1), 1000)
        return
      }
      
      setError('Error al cargar notificaciones. Verifica tu conexión.')
    } finally {
      setLoading(false)
    }
  }

  // Cargar notificaciones al montar el componente
  useEffect(() => {
    cargarNotificaciones()
  }, [])

  // Configurar suscripción en tiempo real
  useEffect(() => {
    const channel = supabase
      .channel('notificaciones-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notificaciones'
        },
        (payload) => {
          console.log('Cambio en notificaciones:', payload)
          cargarNotificaciones() // Recargar notificaciones cuando hay cambios
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  // Marcar notificación como leída
  const marcarComoLeida = async (notificacionId: string) => {
    try {
      // Obtener el token de acceso de Supabase
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        console.log('❌ No hay sesión activa para marcar como leída')
        return
      }

      const response = await fetch('/api/notificaciones', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          notificacion_ids: [notificacionId]
        })
      })

      if (!response.ok) {
        console.error('Error al marcar como leída:', response.status)
        return // Fallar silenciosamente para no interrumpir la UX
      }

      // Remover la notificación del estado local ya que solo mostramos no leídas
      setNotificaciones(prev => 
        prev.filter(notif => notif.id !== notificacionId)
      )
      setNoLeidasCount(prev => Math.max(0, prev - 1))
    } catch (err) {
      console.error('Error al marcar como leída:', err)
    }
  }

  // Marcar todas como leídas
  const marcarTodasComoLeidas = async () => {
    try {
      // Obtener el token de acceso de Supabase
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        console.log('❌ No hay sesión activa para marcar todas como leídas')
        return
      }

      const response = await fetch('/api/notificaciones', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          marcar_todas: true
        })
      })

      if (!response.ok) {
        throw new Error('Error al marcar todas como leídas')
      }

      // Limpiar todas las notificaciones ya que solo mostramos no leídas
      setNotificaciones([])
      setNoLeidasCount(0)
    } catch (err) {
      console.error('Error al marcar todas como leídas:', err)
    }
  }

  // Formatear fecha
  const formatearFecha = (fecha: string) => {
    const ahora = new Date()
    const fechaNotif = new Date(fecha)
    const diffMs = ahora.getTime() - fechaNotif.getTime()
    const diffMinutos = Math.floor(diffMs / (1000 * 60))
    const diffHoras = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMinutos < 1) return 'Ahora'
    if (diffMinutos < 60) return `Hace ${diffMinutos}m`
    if (diffHoras < 24) return `Hace ${diffHoras}h`
    if (diffDias < 7) return `Hace ${diffDias}d`
    return fechaNotif.toLocaleDateString()
  }

  // Obtener icono según tipo de notificación
  const obtenerIconoTipo = (tipo: string) => {
    switch (tipo) {
      case 'certificacion_laboral':
        return '📄'
      case 'vacaciones':
        return '🏖️'
      case 'comentario_vacaciones':
        return '💬'
      case 'comentario_permisos':
        return '💬'
      case 'comentario_incapacidades':
        return '💬'
      case 'permisos':
        return '📝'
      case 'incapacidades':
        return '🏥'
      default:
        return '📢'
    }
  }

  // Obtener URL de redirección según tipo de notificación
  const obtenerUrlRedireccion = (tipo: string) => {
    switch (tipo) {
      case 'certificacion_laboral':
        return '/administracion/solicitudes/certificacion-laboral'
      case 'vacaciones':
        return '/administracion/solicitudes/vacaciones'
      case 'comentario_vacaciones':
        return '/administracion/solicitudes/vacaciones'
      case 'comentario_permisos':
        return '/administracion/solicitudes/permisos'
      case 'comentario_incapacidades':
        return '/administracion/novedades/incapacidades'
      case 'permisos':
        return '/administracion/solicitudes/permisos'
      case 'incapacidades':
        return '/administracion/novedades/incapacidades'
      default:
        return '/administracion/notificaciones'
    }
  }

  return (
    <div className={cn('relative', className)} ref={dropdownRef}>
      {/* Botón de notificaciones */}
      <Button
        variant="ghost"
        size="sm"
        className="relative p-2 h-10 w-10 rounded-full hover:bg-transparent"
        onClick={() => isOpen ? handleClose() : handleOpen()}
      >
        <Bell className="h-5 w-5" />
        {noLeidasCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
          >
            {noLeidasCount > 99 ? '99+' : noLeidasCount}
          </Badge>
        )}
      </Button>

      {/* Dropdown de notificaciones */}
      {isOpen && (
        <Card className={cn(
          "fixed right-4 top-20 w-[30vw] max-h-96 overflow-hidden shadow-lg border bg-white z-50 transition-all duration-200 ease-out",
          isAnimating 
            ? "animate-in fade-in-0 zoom-in-95" 
            : "animate-out fade-out-0 zoom-out-95"
        )}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Notificaciones</CardTitle>
              <div className="flex items-center gap-2">
                {noLeidasCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-6 px-2"
                    onClick={marcarTodasComoLeidas}
                  >
                    <CheckCheck className="h-3 w-3 mr-1" />
                    Marcar todas
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={handleClose}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            {loading ? (
              <div className="p-4 text-center text-sm text-gray-500">
                Cargando notificaciones...
              </div>
            ) : error ? (
              <div className="p-4 text-center text-sm text-red-500">
                {error}
              </div>
            ) : notificaciones.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500">
                No tienes notificaciones
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto">
                {notificaciones.map((notificacion, index) => (
                  <div key={notificacion.id}>
                    <div 
                      className={cn(
                        'p-3 hover:bg-gray-50 cursor-pointer transition-colors',
                        !notificacion.leida && 'bg-blue-50 border-l-2 border-l-blue-500'
                      )}
                      onClick={async () => {
                        // Marcar como leída si no lo está
                        if (!notificacion.leida) {
                          await marcarComoLeida(notificacion.id)
                        }
                        
                        // Cerrar el dropdown
                        setIsOpen(false)
                        
                        // Redirigir a la sección correspondiente
                        const url = obtenerUrlRedireccion(notificacion.tipo)
                        
                        // Usar router.replace para forzar la navegación
                        router.replace(url)
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="text-lg flex-shrink-0">
                          {obtenerIconoTipo(notificacion.tipo)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className={cn(
                              'text-sm font-medium truncate',
                              !notificacion.leida && 'text-blue-900'
                            )}>
                              {notificacion.titulo}
                            </p>
                            {!notificacion.leida && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 ml-2" />
                            )}
                          </div>
                          <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                            {notificacion.mensaje}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {formatearFecha(notificacion.created_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                    {index < notificaciones.length - 1 && <Separator />}
                  </div>
                ))}
              </div>
            )}
            
            <>
              <Separator />
              <div className="p-3">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full text-xs"
                  onClick={() => {
                    setIsOpen(false)
                    router.push('/administracion/notificaciones')
                  }}
                >
                  Ver todas las notificaciones
                </Button>
              </div>
            </>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
