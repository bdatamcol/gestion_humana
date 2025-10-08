// app/administracion/solicitudes/vacaciones/page.tsx
"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createSupabaseClient } from "@/lib/supabase"
// AdminSidebar removido - ya está en el layout
import AdminVacacionesCalendar from "@/components/vacaciones/AdminVacacionesCalendar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle2, XCircle, AlertCircle, Loader2, MessageSquare } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { ComentariosVacaciones } from "@/components/vacaciones/comentarios-vacaciones"

interface SolicitudVacacion {
  id: string
  usuario_id: string
  estado: string
  fecha_inicio: string
  fecha_fin: string
  fecha_solicitud: string
  usuario?: {
    colaborador: string
    cedula: string
    cargo: string
    empresas?: {
      nombre: string
    }
  }
}

export default function AdminVacacionesPage() {
  const router = useRouter()
  const supabase = createSupabaseClient()

  const [solicitudesPendientes, setSolicitudesPendientes] = useState<SolicitudVacacion[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [showCommentsModal, setShowCommentsModal] = useState(false)
  const [selectedSolicitudId, setSelectedSolicitudId] = useState<string | null>(null)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectReason, setRejectReason] = useState("")
  const [solicitudToReject, setSolicitudToReject] = useState<string | null>(null)

  // Carga solicitudes pendientes
  const fetchSolicitudesPendientes = async () => {
    try {
      // Ejecutar consultas en paralelo para mejor rendimiento
      const [solicitudesResult] = await Promise.all([
        supabase
          .from("solicitudes_vacaciones")
          .select(`
            id,
            usuario_id,
            estado,
            fecha_inicio,
            fecha_fin,
            fecha_solicitud
          `)
          .eq("estado", "pendiente")
          .order("fecha_solicitud", { ascending: true })
      ])

      if (solicitudesResult.error) throw solicitudesResult.error

      if (solicitudesResult.data && solicitudesResult.data.length > 0) {
        // Obtener datos de usuarios en paralelo
        const userIds = solicitudesResult.data.map(s => s.usuario_id)
        const [usuariosResult] = await Promise.all([
          supabase
            .from("usuario_nomina")
            .select(`
              auth_user_id,
              colaborador,
              cedula,
              cargo_id,
              empresa_id,
              empresas:empresa_id(nombre),
              cargos:cargo_id(nombre)
            `)
            .in("auth_user_id", userIds)
        ])

        if (usuariosResult.error) throw usuariosResult.error

        // Combinar datos
        const solicitudesCompletas = solicitudesResult.data.map(s => {
          const usuario = usuariosResult.data?.find(u => u.auth_user_id === s.usuario_id)
          return {
            id: s.id as string,
            usuario_id: s.usuario_id as string,
            estado: s.estado as string,
            fecha_inicio: s.fecha_inicio as string,
            fecha_fin: s.fecha_fin as string,
            fecha_solicitud: s.fecha_solicitud as string,
            usuario: usuario ? {
              colaborador: usuario.colaborador as string,
              cedula: usuario.cedula as string,
              cargo: usuario.cargos ? (usuario.cargos as any).nombre as string : 'N/A',
              empresas: usuario.empresas ? {
                nombre: (usuario.empresas as any).nombre as string
              } : undefined
            } : undefined
          } as SolicitudVacacion
        })

        setSolicitudesPendientes(solicitudesCompletas)
      } else {
        setSolicitudesPendientes([])
      }
    } catch (err: any) {
      console.error("Error al cargar solicitudes:", err.message)
      setError("No se pudieron cargar las solicitudes pendientes.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSolicitudesPendientes()
  }, [supabase])

  const handleApprove = async (solicitudId: string) => {
    setActionLoading(solicitudId)
    setError(null)
    try {
      const { error } = await supabase
        .from("solicitudes_vacaciones")
        .update({
          estado: "aprobado",
          fecha_resolucion: new Date().toISOString()
        })
        .eq("id", solicitudId)

      if (error) throw error

      setSuccessMessage("Solicitud aprobada correctamente")
      await fetchSolicitudesPendientes()
    } catch (err: any) {
      console.error(err)
      setError(err.message || "Error al aprobar la solicitud")
    } finally {
      setActionLoading(null)
    }
  }

  const handleRejectClick = (solicitudId: string) => {
    setSolicitudToReject(solicitudId)
    setRejectReason("")
    setShowRejectModal(true)
  }

  const handleRejectConfirm = async () => {
    if (!solicitudToReject || !rejectReason.trim()) {
      setError("Debe proporcionar una razón para el rechazo")
      return
    }

    setActionLoading(solicitudToReject)
    setError(null)
    try {
      const { error } = await supabase
        .from("solicitudes_vacaciones")
        .update({
          estado: "rechazado",
          fecha_resolucion: new Date().toISOString(),
          motivo_rechazo: rejectReason.trim()
        })
        .eq("id", solicitudToReject)

      if (error) throw error

      setSuccessMessage("Solicitud rechazada correctamente")
      await fetchSolicitudesPendientes()
      setShowRejectModal(false)
      setSolicitudToReject(null)
      setRejectReason("")
    } catch (err: any) {
      console.error(err)
      setError(err.message || "Error al rechazar la solicitud")
    } finally {
      setActionLoading(null)
    }
  }

  const formatDate = (fecha: string) => {
    // If it's a string in YYYY-MM-DD format, parse it manually to avoid timezone issues
    if (fecha.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = fecha.split('-').map(Number)
      return new Date(year, month - 1, day).toLocaleDateString("es-CO", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    }
    
    return new Date(fecha).toLocaleDateString("es-CO", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const calcularDiasVacaciones = (inicio: string, fin: string) => {
    // Crear fechas en zona horaria local para evitar problemas de UTC
    const start = new Date(inicio + 'T00:00:00')
    const end = new Date(fin + 'T00:00:00')
    
    let diasVacaciones = 0
    const fechaActual = new Date(start.getFullYear(), start.getMonth(), start.getDate())
    
    // Iterar día por día desde la fecha de inicio hasta la fecha de fin
    while (fechaActual <= end) {
      // Solo contar si no es domingo (día 0)
      if (fechaActual.getDay() !== 0) {
        diasVacaciones++
      }
      // Avanzar al siguiente día
      fechaActual.setDate(fechaActual.getDate() + 1)
    }
    
    return diasVacaciones
  }

  const handleShowComments = (solicitudId: string) => {
    setSelectedSolicitudId(solicitudId)
    setShowCommentsModal(true)
  }

  if (loading) {
    return (
      <div className="flex min-h-screen">
        <div className="flex-1">
          <div className="w-full mx-auto space-y-6">
            {/* Header Skeleton */}
            <div className="flex justify-between items-center">
              <Skeleton className="h-9 w-64" />
              <Skeleton className="h-10 w-32" />
            </div>

            {/* Calendar Skeleton */}
            <div className="space-y-4">
              <Skeleton className="h-8 w-48" />
              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: 35 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            </div>

            {/* Solicitudes Pendientes Skeleton */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-5 rounded-full" />
                  <Skeleton className="h-6 w-48" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {Array.from({ length: 10 }).map((_, i) => (
                          <TableHead key={i}>
                            <Skeleton className="h-4 w-20" />
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Array.from({ length: 3 }).map((_, i) => (
                        <TableRow key={i}>
                          {Array.from({ length: 10 }).map((_, j) => (
                            <TableCell key={j}>
                              <Skeleton className="h-4 w-16" />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen py-6">
      <div className="flex-1">
        <div className="w-full mx-auto space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold">Gestión de Vacaciones</h1>
            <Button 
              onClick={() => router.push('/administracion/solicitudes/vacaciones/historico')}
              className="btn-custom"
            >
              Ver Histórico
            </Button>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {successMessage && (
            <Alert variant="default" className="bg-green-50 text-green-700 border-green-200">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>{successMessage}</AlertDescription>
            </Alert>
          )}

          {/* Calendario de Vacaciones */}
          <AdminVacacionesCalendar />

          {/* Tabla de Solicitudes Pendientes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-500" />
                Solicitudes Pendientes ({solicitudesPendientes.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {solicitudesPendientes.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p>No hay solicitudes pendientes</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Colaborador</TableHead>
                        <TableHead>Empresa</TableHead>
                        <TableHead>Cargo</TableHead>
                        <TableHead>Fecha Inicio</TableHead>
                        <TableHead>Fecha Fin</TableHead>
                        <TableHead>Días</TableHead>
                        <TableHead>Fecha Solicitud</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {solicitudesPendientes.map((solicitud) => (
                        <TableRow key={solicitud.id}>
                          <TableCell className="font-medium">
                            <div>
                              <p>{solicitud.usuario?.colaborador || "N/A"}</p>
                              <p className="text-sm text-gray-500">{solicitud.usuario?.cedula || "N/A"}</p>
                            </div>
                          </TableCell>
                          <TableCell>{solicitud.usuario?.empresas?.nombre || "N/A"}</TableCell>
                          <TableCell>{solicitud.usuario?.cargo || "N/A"}</TableCell>
                          <TableCell>{formatDate(solicitud.fecha_inicio)}</TableCell>
                          <TableCell>{formatDate(solicitud.fecha_fin)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {calcularDiasVacaciones(solicitud.fecha_inicio, solicitud.fecha_fin)}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDate(solicitud.fecha_solicitud)}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                              {solicitud.estado}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleRejectClick(solicitud.id)}
                                disabled={actionLoading === solicitud.id}
                              >
                                {actionLoading === solicitud.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <XCircle className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleApprove(solicitud.id)}
                                disabled={actionLoading === solicitud.id}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                {actionLoading === solicitud.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="h-4 w-4" />
                                )}
                              </Button>
                              <div className="relative inline-block">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleShowComments(solicitud.id)}
                                >
                                  <MessageSquare className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal de Comentarios */}
      <Dialog open={showCommentsModal} onOpenChange={setShowCommentsModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Comentarios de la solicitud</DialogTitle>
          </DialogHeader>
          {selectedSolicitudId && (
            <ComentariosVacaciones solicitudId={selectedSolicitudId} />
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Rechazo */}
      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Rechazar Solicitud</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Motivo del rechazo *</label>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Ingrese la razón del rechazo..."
                className="mt-1"
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowRejectModal(false)
                  setSolicitudToReject(null)
                  setRejectReason("")
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleRejectConfirm}
                disabled={!rejectReason.trim() || actionLoading === solicitudToReject}
              >
                {actionLoading === solicitudToReject ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Rechazar"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
