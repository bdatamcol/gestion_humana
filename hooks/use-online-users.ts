"use client"

import { useState, useEffect, useCallback } from 'react'
import { createSupabaseClient } from '@/lib/supabase'

interface OnlineUser {
  user_id: string
  last_seen_at: string
  colaborador?: string
  avatar_path?: string
}

interface OnlineUsersData {
  count: number
  users: OnlineUser[]
  timestamp: string
}

export function useOnlineUsers() {
  const [onlineCount, setOnlineCount] = useState<number>(0)
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const supabase = createSupabaseClient()

  // Función para enviar heartbeat
  const sendHeartbeat = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        return
      }

      const response = await fetch('/api/online-users', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        console.error('Error al enviar heartbeat:', response.statusText)
      }
    } catch (error) {
      console.error('Error al enviar heartbeat:', error)
    }
  }, [supabase])

  // Función para eliminar usuario cuando sale de la plataforma
  const removeUserOnline = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        return
      }

      // Usar sendBeacon si está disponible para mayor confiabilidad
      if (navigator.sendBeacon) {
        const data = new FormData()
        data.append('token', session.access_token)
        
        // Crear una URL con método DELETE simulado
        const url = new URL('/api/online-users', window.location.origin)
        url.searchParams.set('_method', 'DELETE')
        
        const success = navigator.sendBeacon(url.toString(), data)
        if (!success) {
          console.warn('sendBeacon falló, intentando con fetch')
          // Fallback inmediato si sendBeacon falla
          fetch('/api/online-users', {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json'
            },
            keepalive: true
          }).catch(err => console.error('Error en fallback fetch:', err))
        }
      } else {
        // Fallback con fetch
        await fetch('/api/online-users', {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          keepalive: true
        })
      }
    } catch (error) {
      console.error('Error al eliminar usuario online:', error)
    }
  }, [supabase])

  // Función para obtener usuarios en línea
  const fetchOnlineUsers = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        setLoading(false)
        setOnlineCount(0)
        setOnlineUsers([])
        return
      }

      const response = await fetch('/api/online-users', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data: OnlineUsersData = await response.json()
        setOnlineCount(data.count)
        setOnlineUsers(data.users)
        setError(null)
      } else if (response.status === 401) {
        // Error de autenticación, establecer valores por defecto
        console.warn('Token expirado o inválido, estableciendo valores por defecto')
        setOnlineCount(0)
        setOnlineUsers([])
        setError(null)
      } else {
        console.error('Error al obtener usuarios en línea:', response.statusText)
        setError('Error al obtener usuarios en línea')
      }
    } catch (error) {
      console.error('Error al obtener usuarios en línea:', error)
      setError('Error al obtener usuarios en línea')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  // Efecto para configurar heartbeat y polling
  useEffect(() => {
    let heartbeatInterval: NodeJS.Timeout
    let fetchInterval: NodeJS.Timeout

    const startHeartbeat = async () => {
      // Enviar heartbeat inicial
      await sendHeartbeat()
      
      // Configurar intervalo de heartbeat cada 20 segundos (más frecuente para mejor detección)
      heartbeatInterval = setInterval(sendHeartbeat, 20000)
    }

    const startFetching = async () => {
      // Obtener usuarios en línea inicial
      await fetchOnlineUsers()
      
      // Configurar intervalo para actualizar la lista cada 25 segundos
      fetchInterval = setInterval(fetchOnlineUsers, 25000)
    }

    // Verificar si hay sesión activa
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session) {
        startHeartbeat()
        startFetching()
      } else {
        setLoading(false)
      }
    }

    checkSession()

    // Limpiar intervalos al desmontar
    return () => {
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval)
      }
      if (fetchInterval) {
        clearInterval(fetchInterval)
      }
    }
  }, [sendHeartbeat, fetchOnlineUsers, supabase])

  // Efecto para manejar la salida del usuario de la plataforma
  useEffect(() => {
    let visibilityTimer: NodeJS.Timeout

    const handleBeforeUnload = () => {
      removeUserOnline()
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Esperar un poco antes de eliminar por si el usuario vuelve rápidamente
        visibilityTimer = setTimeout(() => {
          removeUserOnline()
        }, 5000) // 5 segundos de gracia
      } else if (document.visibilityState === 'visible') {
        // Si el usuario vuelve, cancelar la eliminación y enviar heartbeat
        if (visibilityTimer) {
          clearTimeout(visibilityTimer)
        }
        sendHeartbeat()
      }
    }

    const handlePageHide = () => {
      removeUserOnline()
    }

    const handleUnload = () => {
      removeUserOnline()
    }

    // Agregar event listeners
    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('unload', handleUnload)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('pagehide', handlePageHide)

    // Limpiar event listeners al desmontar
    return () => {
      if (visibilityTimer) {
        clearTimeout(visibilityTimer)
      }
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('unload', handleUnload)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('pagehide', handlePageHide)
    }
  }, [removeUserOnline, sendHeartbeat])

  // Suscripción a cambios en tiempo real (opcional)
  useEffect(() => {
    const channel = supabase
      .channel('online-users-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'online_users'
        },
        () => {
          // Actualizar la lista cuando hay cambios
          fetchOnlineUsers()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, fetchOnlineUsers])

  return {
    onlineCount,
    onlineUsers,
    loading,
    error,
    refresh: fetchOnlineUsers
  }
}
