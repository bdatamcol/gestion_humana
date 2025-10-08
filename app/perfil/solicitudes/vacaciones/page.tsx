"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
// Sidebar removido - ya está en el layout
import { createSupabaseClient } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, CheckCircle2, Calendar, MessageSquare } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import UserVacacionesCalendar from "@/components/vacaciones/UserVacacionesCalendar"
import { ComentariosVacaciones } from "@/components/vacaciones/comentarios-vacaciones"
// import { crearNotificacionNuevaSolicitud } from "@/lib/notificaciones" // Removido - se maneja desde el servidor

export default function SolicitudVacaciones() {
  const [showReasonModal, setShowReasonModal] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [showCommentsModal, setShowCommentsModal] = useState(false)
  const [selectedSolicitudId, setSelectedSolicitudId] = useState<string | null>(null)

  const handleShowReason = (reason: string) => {
    setRejectionReason(reason)
    setShowReasonModal(true)
  }

  const handleShowComments = (solicitudId: string) => {
    setSelectedSolicitudId(solicitudId)
    setShowCommentsModal(true)
  }

  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [userData, setUserData] = useState<any>(null)
  const [solicitudes, setSolicitudes] = useState<any[]>([])
  const [showModal, setShowModal] = useState(false)
  const [selectedRange, setSelectedRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  })
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  // Suscribirse a cambios en tiempo real
  useEffect(() => {
    const supabase = createSupabaseClient()
    
    // Suscribirse a cambios en la tabla de vacaciones
    const channel = supabase
      .channel('user_vacaciones_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'solicitudes_vacaciones',
          filter: `usuario_id=eq.${userData?.auth_user_id}`
        },
        (payload) => {
          // Actualizar la lista de solicitudes cuando haya cambios
          if (payload.eventType === 'INSERT') {
            setSolicitudes(prev => [payload.new, ...prev])
          } else if (payload.eventType === 'UPDATE') {
            setSolicitudes(prev =>
              prev.map(sol => sol.id === payload.new.id ? payload.new : sol)
            )
          } else if (payload.eventType === 'DELETE') {
            setSolicitudes(prev =>
              prev.filter(sol => sol.id !== payload.old.id)
            )
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userData])

  // Verificar autenticación y obtener datos del usuario
  useEffect(() => {
    const checkAuth = async () => {
      setLoading(true)
      const supabase = createSupabaseClient()
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession()

      if (error || !session) {
        router.push("/login")
        return
      }

      // Obtener datos del usuario
      const { data: userData, error: userError } = await supabase
        .from("usuario_nomina")
        .select(`
          *,
          empresas:empresa_id(nombre, razon_social, nit)
          sedes:sede_id(nombre)
        `)
        .eq("auth_user_id", session.user.id)
        .single()

      if (userError) {
        console.error("Error al obtener datos del usuario:", userError)
        setLoading(false)
        return
      }

      // Obtener solicitudes del usuario
      const { data: solicitudesData, error: solicitudesError } = await supabase
        .from('solicitudes_vacaciones')
        .select('*')
        .eq('usuario_id', session.user.id)
        .order('fecha_solicitud', { ascending: false })

      if (solicitudesError) {
        console.error("Error al obtener solicitudes:", solicitudesError)
      } else {
        setSolicitudes(solicitudesData || [])
      }

      setUserData(userData)
      setLoading(false)
    }

    checkAuth()
  }, [])

  const formatDate = (date: string | Date | null | undefined) => {
    if (!date) return 'Fecha no disponible'
    
    try {
      const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' }
      
      // If it's a string in YYYY-MM-DD format, parse it manually to avoid timezone issues
      if (typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = date.split('-').map(Number)
        return new Date(year, month - 1, day).toLocaleDateString('es-CO', options)
      }
      
      // Handle timestamp strings from PostgreSQL
      if (typeof date === 'string') {
        const parsedDate = new Date(date)
        if (!isNaN(parsedDate.getTime())) {
          return parsedDate.toLocaleDateString('es-CO', options)
        }
      }
      
      // Handle Date objects
      if (date instanceof Date) {
        return date.toLocaleDateString('es-CO', options)
      }
      
      // Fallback for other string formats
      return new Date(date + 'T00:00:00').toLocaleDateString('es-CO', options)
    } catch (error) {
      console.error('Error al formatear fecha:', date, error)
      return 'Fecha inválida'
    }
  }

  const enviarSolicitud = async () => {
    if (!selectedRange.from || !selectedRange.to) {
      setError("Por favor seleccione un rango de fechas válido.")
      return
    }

    // Validar que la fecha de fin sea posterior a la fecha de inicio
    if (selectedRange.to < selectedRange.from) {
      setError("La fecha de fin debe ser posterior a la fecha de inicio.")
      return
    }

    try {
      setLoading(true)
      setError("")
      
      const supabase = createSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        router.push("/login")
        return
      }

      // Obtener datos del usuario para la notificación
      const { data: userData, error: userError } = await supabase
        .from("usuario_nomina")
        .select("colaborador")
        .eq("auth_user_id", session.user.id)
        .single()
      
      if (userError) {
        console.error("Error al obtener datos del usuario:", userError)
      }

      // Crear la solicitud en la base de datos
      const { data, error } = await supabase
        .from('solicitudes_vacaciones')
        .insert([{
          usuario_id: session.user.id,
          fecha_inicio: selectedRange.from.toISOString().slice(0, 10),
          fecha_fin: selectedRange.to.toISOString().slice(0, 10),
          fecha_solicitud: new Date().toISOString(),
          estado: 'pendiente'
        }])
        .select()
        .single()

      if (error) throw error

      // Enviar notificación por email
      try {
        const notificationResponse = await fetch('/api/notificaciones/solicitud-vacaciones', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            solicitudId: data.id,
            usuarioId: session.user.id
          }),
        })

        if (!notificationResponse.ok) {
          console.error('Error al enviar notificación por correo:', await notificationResponse.text())
        }
      } catch (notificationError) {
        console.error('Error al enviar notificación por correo:', notificationError)
        // No interrumpir el flujo si falla la notificación
      }

      // Actualizar la lista de solicitudes
      const { data: solicitudesData } = await supabase
        .from('solicitudes_vacaciones')
        .select('*')
        .eq('usuario_id', session.user.id)
        .order('fecha_solicitud', { ascending: false })

      setSolicitudes(solicitudesData || [])
      setSuccess("Solicitud de vacaciones enviada correctamente. Espera la aprobación del administrador.")
      setShowModal(false)
      setSelectedRange({ from: undefined, to: undefined })
    } catch (err: any) {
      console.error("Error al enviar la solicitud:", err)
      setError("Error al enviar la solicitud. Por favor intente nuevamente.")
    } finally {
      setLoading(false)
    }
  }

  const calcularDiasVacaciones = (fechaInicio: string | Date, fechaFin: string | Date) => {
    // Crear fechas en zona horaria local para evitar problemas de UTC
    const inicio = typeof fechaInicio === 'string' 
      ? new Date(fechaInicio + 'T00:00:00') 
      : new Date(fechaInicio.getFullYear(), fechaInicio.getMonth(), fechaInicio.getDate())
    const fin = typeof fechaFin === 'string' 
      ? new Date(fechaFin + 'T00:00:00') 
      : new Date(fechaFin.getFullYear(), fechaFin.getMonth(), fechaFin.getDate())
    
    let diasVacaciones = 0
    const fechaActual = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate())
    
    // Iterar día por día desde la fecha de inicio hasta la fecha de fin
    while (fechaActual <= fin) {
      // Solo contar si no es domingo (día 0)
      if (fechaActual.getDay() !== 0) {
        diasVacaciones++
      }
      // Avanzar al siguiente día
      fechaActual.setDate(fechaActual.getDate() + 1)
    }
    
    return diasVacaciones
  }

  const handleDateRangeSelect = (range: { from: Date | undefined; to: Date | undefined }) => {
    setSelectedRange(range)
    setError("") // Limpiar errores cuando se selecciona un nuevo rango
  }

  return (
    <>
      <Dialog open={showReasonModal} onOpenChange={setShowReasonModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Motivo de rechazo</DialogTitle>
          </DialogHeader>
          <p>{rejectionReason}</p>
        </DialogContent>
      </Dialog>

      <Dialog open={showCommentsModal} onOpenChange={setShowCommentsModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Comentarios de la solicitud</DialogTitle>
            <DialogDescription>
              Comunícate con el administrador sobre tu solicitud de vacaciones.
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[70vh]">
            {selectedSolicitudId && (
              <ComentariosVacaciones 
                solicitudId={selectedSolicitudId} 
                isAdmin={false}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-[90vh] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Solicitar Vacaciones</DialogTitle>
            <DialogDescription>
              Selecciona las fechas de tus vacaciones en el calendario. Las fechas en gris no están disponibles y las fechas en rojo ya están ocupadas.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Columna del calendario */}
            <div className="flex justify-center">
              <UserVacacionesCalendar 
              onDateRangeSelect={handleDateRangeSelect}
              selectedRange={selectedRange}
              userCompanyId={userData?.empresa_id ? userData.empresa_id.toString() : undefined}
            />
            </div>
            
            {/* Columna de información y acciones */}
            <div className="space-y-4 min-w-[300px]">
              {selectedRange.from && selectedRange.to && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="space-y-3">
                    <div>
                      <p className="font-semibold text-blue-900">Rango seleccionado:</p>
                      <p className="text-sm text-blue-700 mt-1">
                        <span className="font-medium">Inicio:</span> {selectedRange.from.toLocaleDateString('es-CO', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </p>
                      <p className="text-sm text-blue-700">
                        <span className="font-medium">Fin:</span> {selectedRange.to.toLocaleDateString('es-CO', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </p>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-blue-200">
                      <span className="text-sm font-medium text-blue-900">Total de días:</span>
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-lg px-3 py-1">
                        {calcularDiasVacaciones(selectedRange.from, selectedRange.to)} días
                      </Badge>
                    </div>
                  </div>
                </div>
              )}
              
              {!selectedRange.from && (
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-600 text-center">
                    Selecciona las fechas en el calendario para ver el resumen de tu solicitud
                  </p>
                </div>
              )}
              
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <div className="flex flex-col gap-2 pt-4">
                <Button 
                  onClick={enviarSolicitud} 
                  disabled={loading || !selectedRange.from || !selectedRange.to}
                  className="w-full"
                >
                  {loading ? "Enviando..." : "Enviar solicitud"}
                </Button>
                <Button variant="outline" onClick={() => setShowModal(false)} className="w-full">
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {loading ? (
        <div className="space-y-6">
          <div className="bg-white/80 backdrop-blur-sm rounded-lg p-6 shadow-sm">
            <div className="flex justify-between items-center">
              <div className="space-y-2">
                <div className="h-8 bg-gray-200/60 rounded animate-pulse w-64"></div>
                <div className="h-4 bg-gray-200/40 rounded animate-pulse w-80"></div>
              </div>
              <div className="h-10 bg-gray-200/40 rounded animate-pulse w-40"></div>
            </div>
          </div>
          
          <div className="bg-white/80 backdrop-blur-sm rounded-lg border shadow-sm">
            <div className="p-6">
              <div className="space-y-4">
                <div className="h-6 bg-gray-200/60 rounded animate-pulse w-40"></div>
                <div className="h-4 bg-gray-200/40 rounded animate-pulse w-72"></div>
              </div>
            </div>
            <div className="border-t">
              <div className="p-4">
                <div className="space-y-3">
                  <div className="grid grid-cols-7 gap-4">
                    {[...Array(7)].map((_, i) => (
                      <div key={i} className="h-4 bg-gray-200/60 rounded animate-pulse"></div>
                    ))}
                  </div>
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="grid grid-cols-7 gap-4">
                      {[...Array(7)].map((_, j) => (
                        <div key={j} className="h-4 bg-gray-200/40 rounded animate-pulse"></div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                      <div className="w-full">
                        <h1 className="text-2xl font-bold tracking-tight">Solicitudes de Vacaciones</h1>
                        <p className="text-muted-foreground">
                          Gestiona tus solicitudes de vacaciones.
                        </p>
                      </div>
                      <Button className="w-full sm:w-auto" onClick={() => setShowModal(true)}>
                        <Calendar className="mr-2 h-4 w-4" /> Solicitar vacaciones
                      </Button>
                    </div>

                    {error && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}

                    {success && (
                      <Alert className="bg-green-50 text-green-800 border-green-200">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <AlertDescription>{success}</AlertDescription>
                      </Alert>
                    )}

                    <Card className="bg-white/80 backdrop-blur-sm shadow-sm">
                      <CardHeader>
                        <CardTitle>Mis solicitudes</CardTitle>
                        <CardDescription>
                          Historial de solicitudes de vacaciones realizadas.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Fecha de solicitud</TableHead>
                                <TableHead>Fecha de inicio</TableHead>
                                <TableHead>Fecha de fin</TableHead>
                                <TableHead>Días</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead>Acciones</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {solicitudes.length === 0 ? (
                                <TableRow>
                                  <TableCell colSpan={6} className="text-center">
                                    No has realizado ninguna solicitud de vacaciones.
                                  </TableCell>
                                </TableRow>
                              ) : (
                                solicitudes.map((solicitud) => (
                                  <TableRow key={solicitud.id}>
                                    <TableCell>{formatDate(solicitud.fecha_solicitud)}</TableCell>
                                    <TableCell>{formatDate(solicitud.fecha_inicio)}</TableCell>
                                    <TableCell>{formatDate(solicitud.fecha_fin)}</TableCell>
                                    <TableCell>
                                      {calcularDiasVacaciones(solicitud.fecha_inicio, solicitud.fecha_fin)} días
                                    </TableCell>
                                    <TableCell>
                                      <Badge
                                        variant={
                                          solicitud.estado === "aprobado"
                                            ? "secondary"
                                            : solicitud.estado === "rechazado"
                                            ? "destructive"
                                            : "default"
                                        }
                                        className={
                                          solicitud.estado === "aprobado"
                                            ? "bg-green-100 text-green-800 hover:bg-green-100"
                                            : solicitud.estado === "rechazado"
                                            ? "bg-red-100 text-red-800 hover:bg-red-100"
                                            : "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
                                        }
                                      >
                                        {solicitud.estado.charAt(0).toUpperCase() + solicitud.estado.slice(1)}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex gap-2">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleShowComments(solicitud.id.toString())}
                                        >
                                          <MessageSquare className="h-4 w-4" />
                                        </Button>
                                        {solicitud.estado === "rechazado" && solicitud.motivo_rechazo && (
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleShowReason(solicitud.motivo_rechazo)}
                                          >
                                            Ver motivo
                                          </Button>
                                        )}
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </CardContent>
                    </Card>
        </div>
      )}
    </>
  )
}
