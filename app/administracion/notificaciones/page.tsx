"use client"

import React, { useState, useEffect } from 'react'
import { Bell, Check, CheckCheck, ArrowLeft, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createSupabaseClient } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface Notificacion {
  id: string
  tipo: string
  titulo: string
  mensaje: string
  solicitud_id?: string
  leida: boolean
  created_at: string
}

export default function NotificacionesPage() {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filtro, setFiltro] = useState<'todas' | 'no_leidas' | 'leidas'>('todas')
  const [tipoFiltro, setTipoFiltro] = useState<string>('todos')
  const [noLeidasCount, setNoLeidasCount] = useState(0)
  const supabase = createSupabaseClient()

  // Cargar notificaciones
  const cargarNotificaciones = async () => {
    try {
      setLoading(true)
      setError(null)

      // Obtener el token de acceso de Supabase
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('No hay sesión activa')
        return
      }

      // Construir URL con filtros
      const params = new URLSearchParams({
        limit: '50'
      })

      if (filtro === 'no_leidas') {
        params.append('solo_no_leidas', 'true')
      }

      const response = await fetch(`/api/notificaciones?${params}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Error al cargar notificaciones: ${response.status}`)
      }

      const data = await response.json()
      let notificacionesFiltradas = data.notificaciones || []

      // Aplicar filtros adicionales en el cliente
      if (filtro === 'leidas') {
        notificacionesFiltradas = notificacionesFiltradas.filter((n: Notificacion) => n.leida)
      }

      if (tipoFiltro !== 'todos') {
        notificacionesFiltradas = notificacionesFiltradas.filter((n: Notificacion) => n.tipo === tipoFiltro)
      }

      setNotificaciones(notificacionesFiltradas)
      setNoLeidasCount(data.no_leidas_count || 0)
    } catch (err) {
      console.error('Error al cargar notificaciones:', err)
      setError('Error al cargar notificaciones')
    } finally {
      setLoading(false)
    }
  }

  // Cargar notificaciones al montar el componente y cuando cambien los filtros
  useEffect(() => {
    cargarNotificaciones()
  }, [filtro, tipoFiltro])

  // Marcar notificación como leída
  const marcarComoLeida = async (notificacionId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

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
        throw new Error('Error al marcar como leída')
      }

      // Actualizar estado local
      setNotificaciones(prev =>
        prev.map(notif =>
          notif.id === notificacionId
            ? { ...notif, leida: true }
            : notif
        )
      )
      setNoLeidasCount(prev => Math.max(0, prev - 1))
    } catch (err) {
      console.error('Error al marcar como leída:', err)
    }
  }

  // Marcar todas como leídas
  const marcarTodasComoLeidas = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

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

      // Actualizar estado local
      setNotificaciones(prev =>
        prev.map(notif => ({ ...notif, leida: true }))
      )
      setNoLeidasCount(0)
    } catch (err) {
      console.error('Error al marcar todas como leídas:', err)
    }
  }

  // Formatear fecha
  const formatearFecha = (fecha: string) => {
    const fechaNotif = new Date(fecha)
    return fechaNotif.toLocaleString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Obtener icono según tipo de notificación
  const obtenerIconoTipo = (tipo: string) => {
    switch (tipo) {
      case 'certificacion_laboral':
        return '📄'
      case 'vacaciones':
        return '🏖️'
      case 'permisos':
        return '📝'
      case 'incapacidades':
        return '🏥'
      default:
        return '📢'
    }
  }

  // Obtener nombre del tipo
  const obtenerNombreTipo = (tipo: string) => {
    switch (tipo) {
      case 'certificacion_laboral':
        return 'Certificación Laboral'
      case 'vacaciones':
        return 'Vacaciones'
      case 'permisos':
        return 'Permisos'
      case 'incapacidades':
        return 'Incapacidades'
      default:
        return 'General'
    }
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="h-6 w-6" />
            Notificaciones
          </h1>
          <p className="text-gray-600">
            {noLeidasCount > 0 ? `${noLeidasCount} notificaciones sin leer` : 'Todas las notificaciones están leídas'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {noLeidasCount > 0 && (
            <Button onClick={marcarTodasComoLeidas} className="flex items-center gap-2">
              <CheckCheck className="h-4 w-4" />
              Marcar todas como leídas
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => window.location.href = '/administracion'}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" /> Volver al dashboard
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Estado</label>
              <Select value={filtro} onValueChange={(value: any) => setFiltro(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas las notificaciones</SelectItem>
                  <SelectItem value="no_leidas">Solo no leídas</SelectItem>
                  <SelectItem value="leidas">Solo leídas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Tipo</label>
              <Select value={tipoFiltro} onValueChange={setTipoFiltro}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los tipos</SelectItem>
                  <SelectItem value="certificacion_laboral">Certificación Laboral</SelectItem>
                  <SelectItem value="vacaciones">Vacaciones</SelectItem>
                  <SelectItem value="permisos">Permisos</SelectItem>
                  <SelectItem value="incapacidades">Incapacidades</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de notificaciones */}
      <Card>
        <CardHeader>
          <CardTitle>Notificaciones ({notificaciones.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-gray-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
              Cargando notificaciones...
            </div>
          ) : error ? (
            <div className="p-8 text-center text-red-500">
              {error}
            </div>
          ) : notificaciones.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Bell className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              No hay notificaciones que mostrar
            </div>
          ) : (
            <div className="divide-y">
              {notificaciones.map((notificacion) => (
                <div
                  key={notificacion.id}
                  className={cn(
                    'p-4 hover:bg-gray-50 transition-colors cursor-pointer',
                    !notificacion.leida && 'bg-blue-50 border-l-4 border-l-blue-500'
                  )}
                  onClick={() => {
                    if (!notificacion.leida) {
                      marcarComoLeida(notificacion.id)
                    }
                  }}
                >
                  <div className="flex items-start gap-4">
                    <div className="text-2xl flex-shrink-0">
                      {obtenerIconoTipo(notificacion.tipo)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className={cn(
                              'font-medium',
                              !notificacion.leida && 'text-blue-900'
                            )}>
                              {notificacion.titulo}
                            </h3>
                            {!notificacion.leida && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full" />
                            )}
                          </div>
                          <p className="text-gray-600 mb-2">
                            {notificacion.mensaje}
                          </p>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span>{formatearFecha(notificacion.created_at)}</span>
                            <Badge variant="outline" className="text-xs">
                              {obtenerNombreTipo(notificacion.tipo)}
                            </Badge>
                            <Badge variant={notificacion.leida ? 'secondary' : 'default'} className="text-xs">
                              {notificacion.leida ? 'Leída' : 'Sin leer'}
                            </Badge>
                          </div>
                        </div>
                        {!notificacion.leida && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              marcarComoLeida(notificacion.id)
                            }}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
