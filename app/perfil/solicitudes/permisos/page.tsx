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
import { AlertCircle, CheckCircle2, Calendar, Download, Plus, MessageSquare } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { ComentariosPermisos } from "@/components/permisos/comentarios-permisos"
// import { crearNotificacionNuevaSolicitud } from "@/lib/notificaciones" // Removido - se maneja desde el servidor

export default function SolicitudPermisos() {
  const [showReasonModal, setShowReasonModal] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [showComentariosModal, setShowComentariosModal] = useState(false)
  const [solicitudComentariosId, setSolicitudComentariosId] = useState<string | undefined>(undefined)
  const [unseenCounts, setUnseenCounts] = useState<Record<string, number>>({})
  const [userId, setUserId] = useState<string | null>(null)

  const handleShowReason = (reason: string) => {
    setRejectionReason(reason)
    setShowReasonModal(true)
  }

  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [userData, setUserData] = useState<any>(null)
  const [solicitudes, setSolicitudes] = useState<any[]>([])
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    tipoPermiso: "no_remunerado",
    fechaInicio: "",
    fechaFin: "",
    horaInicio: "",
    horaFin: "",
    motivo: "",
    compensacion: "",
    ciudad: "",
  })
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  // Suscribirse a cambios en tiempo real
  useEffect(() => {
    const supabase = createSupabaseClient()
    
    // Suscribirse a cambios en la tabla de permisos
    const channel = supabase
      .channel('user_permisos_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'solicitudes_permisos',
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

  // Obtener conteo de mensajes no leídos
  const fetchUnseenCount = async (solId: string) => {
    if (!userId) return
    const supabase = createSupabaseClient()
    const { count, error } = await supabase
      .from("comentarios_permisos")
      .select("*", { head: true, count: "exact" })
      .eq("solicitud_id", solId)
      .eq("visto_usuario", false)
      .neq("usuario_id", userId)

    if (!error) {
      setUnseenCounts(prev => ({ ...prev, [solId]: count || 0 }))
    }
  }

  // Suscribirse a nuevos comentarios
  useEffect(() => {
    if (!userId) return
    const supabase = createSupabaseClient()

    const channel = supabase
      .channel("user_comentarios_permisos")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "comentarios_permisos" },
        ({ new: n }: any) => {
          if (n.usuario_id !== userId) {
            setUnseenCounts(prev => ({
              ...prev,
              [n.solicitud_id]: (prev[n.solicitud_id] || 0) + 1,
            }))
          }
        }
      )
      .subscribe()

    return () => void supabase.removeChannel(channel)
  }, [userId])

  // Marcar comentarios como leídos y abrir modal
  const markReadAndOpen = async (solId: string) => {
    if (!userId) return
    const supabase = createSupabaseClient()

    // Actualizar en BD
    await supabase
      .from("comentarios_permisos")
      .update({ visto_usuario: true })
      .eq("solicitud_id", solId)
      .eq("visto_usuario", false)
      .neq("usuario_id", userId)

    // Limpiar contador local
    setUnseenCounts(prev => ({ ...prev, [solId]: 0 }))

    // Abrir modal
    setSolicitudComentariosId(solId)
    setShowComentariosModal(true)
  }

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

      setUserId(session.user.id)

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
        .from('solicitudes_permisos')
        .select('*')
        .eq('usuario_id', session.user.id)
        .order('fecha_solicitud', { ascending: false })

      if (solicitudesError) {
        console.error("Error al obtener solicitudes:", solicitudesError)
      } else {
        const sols = solicitudesData || []
        setSolicitudes(sols)
        sols.forEach(s => typeof s.id === 'string' && fetchUnseenCount(s.id))
      }

      setUserData(userData)
      setLoading(false)
    }

    checkAuth()
  }, [])

  const formatDate = (date: string | Date) => {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' }
    return new Date(date).toLocaleDateString('es-CO', options)
  }

  const enviarSolicitud = async () => {
    // Validar campos requeridos según el tipo de permiso
    if (!formData.tipoPermiso || !formData.fechaInicio || !formData.fechaFin || !formData.motivo) {
      setError("Por favor complete todos los campos requeridos.")
      return
    }

    // Validar que la fecha de fin sea posterior o igual a la fecha de inicio
    const fechaInicio = new Date(formData.fechaInicio)
    const fechaFin = new Date(formData.fechaFin)
    
    if (fechaFin < fechaInicio) {
      setError("La fecha de fin debe ser posterior o igual a la fecha de inicio.")
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
        .from('solicitudes_permisos')
        .insert([{
          usuario_id: session.user.id,
          tipo_permiso: formData.tipoPermiso,
          fecha_inicio: formData.fechaInicio,
          fecha_fin: formData.fechaFin,
          hora_inicio: formData.horaInicio || null,
          hora_fin: formData.horaFin || null,
          motivo: formData.motivo,
          compensacion: formData.compensacion || null,
          ciudad: formData.ciudad || null,
          fecha_solicitud: new Date().toISOString(),
          estado: 'pendiente'
        }])
        .select()
        .single()

      if (error) throw error

      // Enviar notificación por email
      try {
        const notificationResponse = await fetch('/api/notificaciones/solicitud-permisos', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            solicitudId: data.id,
            usuarioId: session.user.id
          })
        })

        if (!notificationResponse.ok) {
          console.error('Error al enviar notificación por correo')
        }
      } catch (notificationError) {
        console.error('Error al enviar notificación:', notificationError)
      }

      // Actualizar la lista de solicitudes
      const { data: solicitudesData } = await supabase
        .from('solicitudes_permisos')
        .select('*')
        .eq('usuario_id', session.user.id)
        .order('fecha_solicitud', { ascending: false })

      setSolicitudes(solicitudesData || [])
      setSuccess("Solicitud de permiso enviada correctamente. Espera la aprobación del administrador.")
      setShowModal(false)
      setFormData({
        tipoPermiso: "no_remunerado",
        fechaInicio: "",
        fechaFin: "",
        horaInicio: "",
        horaFin: "",
        motivo: "",
        compensacion: "",
        ciudad: "",
      })
    } catch (err: any) {
      console.error("Error al enviar la solicitud:", err)
      setError("Error al enviar la solicitud. Por favor intente nuevamente.")
    } finally {
      setLoading(false)
    }
  }

  const descargarPermiso = async (pdfUrl: string) => {
    try {
      const response = await fetch(pdfUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'permiso-laboral.pdf'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error al descargar el permiso:', error)
      setError('Error al descargar el permiso. Por favor intente nuevamente.')
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex justify-between items-center">
          <div className="h-8 bg-gray-200 rounded-md w-64 animate-pulse"></div>
          <div className="h-10 bg-gray-200 rounded-md w-40 animate-pulse"></div>
        </div>

        {/* Card Skeleton */}
        <Card className="bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <div className="h-6 bg-gray-200 rounded-md w-48 animate-pulse mb-2"></div>
            <div className="h-4 bg-gray-200 rounded-md w-72 animate-pulse"></div>
          </CardHeader>
          <CardContent>
            {/* Table Header Skeleton */}
            <div className="space-y-3">
              <div className="grid grid-cols-6 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-4 bg-gray-200 rounded animate-pulse"></div>
                ))}
              </div>
              
              {/* Table Rows Skeleton */}
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="grid grid-cols-6 gap-4 py-3 border-b">
                  {Array.from({ length: 6 }).map((_, j) => (
                    <div key={j} className="h-4 bg-gray-200 rounded animate-pulse"></div>
                  ))}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
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

      <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                  <h1 className="text-2xl font-bold tracking-tight w-full sm:w-auto">Solicitudes de Permisos</h1>
                  <Button onClick={() => setShowModal(true)} className="flex items-center gap-2 w-full sm:w-auto justify-center">
                    <Plus className="h-4 w-4" /> Solicitar Permiso
                  </Button>
                </div>

                {/* Mensajes de error y éxito */}
                {error && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {success && (
                  <Alert className="mt-4 bg-green-50 text-green-800 border-green-200">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertDescription>{success}</AlertDescription>
                  </Alert>
                )}

                {/* Modal de solicitud */}
                <Dialog open={showModal} onOpenChange={setShowModal}>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>Solicitar Permiso</DialogTitle>
                      <DialogDescription>
                        Complete el formulario para solicitar un permiso laboral.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="tipoPermiso" className="text-right">
                          Tipo de Permiso
                        </Label>
                        <select
                          id="tipoPermiso"
                          className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          value={formData.tipoPermiso}
                          onChange={(e) => setFormData({ ...formData, tipoPermiso: e.target.value })}
                        >
                          <option value="no_remunerado">Permiso No Remunerado</option>
                          <option value="remunerado">Permiso Remunerado</option>
                          <option value="actividad_interna">Actividad Interna</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="fechaInicio" className="text-right">
                          Fecha Inicio
                        </Label>
                        <Input
                          id="fechaInicio"
                          type="date"
                          className="col-span-3"
                          value={formData.fechaInicio}
                          onChange={(e) => setFormData({ ...formData, fechaInicio: e.target.value })}
                        />
                      </div>

                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="fechaFin" className="text-right">
                          Fecha Fin
                        </Label>
                        <Input
                          id="fechaFin"
                          type="date"
                          className="col-span-3"
                          value={formData.fechaFin}
                          onChange={(e) => setFormData({ ...formData, fechaFin: e.target.value })}
                        />
                      </div>

                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="horaInicio" className="text-right">
                          Hora Inicio
                        </Label>
                        <Input
                          id="horaInicio"
                          type="time"
                          className="col-span-3"
                          value={formData.horaInicio}
                          onChange={(e) => setFormData({ ...formData, horaInicio: e.target.value })}
                        />
                      </div>

                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="horaFin" className="text-right">
                          Hora Fin
                        </Label>
                        <Input
                          id="horaFin"
                          type="time"
                          className="col-span-3"
                          value={formData.horaFin}
                          onChange={(e) => setFormData({ ...formData, horaFin: e.target.value })}
                        />
                      </div>

                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="ciudad" className="text-right">
                          Ciudad
                        </Label>
                        <Input
                          id="ciudad"
                          className="col-span-3"
                          placeholder="Ingrese la ciudad"
                          value={formData.ciudad}
                          onChange={(e) => setFormData({ ...formData, ciudad: e.target.value })}
                        />
                      </div>

                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="motivo" className="text-right">
                          Motivo
                        </Label>
                        <Textarea
                          id="motivo"
                          className="col-span-3"
                          value={formData.motivo}
                          onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
                        />
                      </div>

                      {formData.tipoPermiso === "remunerado" && (
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="compensacion" className="text-right">
                            Compensación
                          </Label>
                          <Textarea
                            id="compensacion"
                            className="col-span-3"
                            placeholder="Indique cómo compensará el tiempo"
                            value={formData.compensacion}
                            onChange={(e) => setFormData({ ...formData, compensacion: e.target.value })}
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end gap-3">
                      <Button variant="outline" onClick={() => setShowModal(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={enviarSolicitud} disabled={loading}>
                        {loading ? "Enviando..." : "Enviar Solicitud"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                {/* Tabla de solicitudes */}
                <div className="mt-6 w-full">
                  <Card className="bg-white/80 backdrop-blur-sm w-full">
                    <CardHeader>
                      <CardTitle>Mis Solicitudes de Permisos</CardTitle>
                      <CardDescription>
                        Historial de solicitudes de permisos realizadas
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Fecha Solicitud</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Fecha Inicio</TableHead>
                            <TableHead>Fecha Fin</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead>Acciones</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {solicitudes.length > 0 ? (
                            solicitudes.map((solicitud) => (
                              <TableRow key={solicitud.id}>
                                <TableCell>{new Date(solicitud.fecha_solicitud).toLocaleDateString()}</TableCell>
                                <TableCell>
                                  {solicitud.tipo_permiso === 'no_remunerado' ? 'No remunerado' :
                                   solicitud.tipo_permiso === 'remunerado' ? 'Remunerado' :
                                   'Actividad interna'}
                                </TableCell>
                                <TableCell>{new Date(solicitud.fecha_inicio).toLocaleDateString()}</TableCell>
                                <TableCell>{new Date(solicitud.fecha_fin).toLocaleDateString()}</TableCell>
                                <TableCell>
                                  <Badge
                                    variant={solicitud.estado === 'aprobado' ? 'secondary' :
                                            solicitud.estado === 'rechazado' ? 'destructive' :
                                            'default'}
                                  >
                                    {solicitud.estado.charAt(0).toUpperCase() + solicitud.estado.slice(1)}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {solicitud.estado === 'rechazado' && solicitud.motivo_rechazo && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleShowReason(solicitud.motivo_rechazo)}
                                    >
                                      Ver motivo
                                    </Button>
                                  )}
                                  {solicitud.estado === 'aprobado' && solicitud.pdf_url && (
                                    <div className="flex gap-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => markReadAndOpen(solicitud.id)}
                                        className="relative"
                                      >
                                        <MessageSquare className="h-4 w-4" />
                                        {unseenCounts[solicitud.id] > 0 && (
                                          <Badge
                                            variant="destructive"
                                            className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
                                          >
                                            {unseenCounts[solicitud.id]}
                                          </Badge>
                                        )}
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => descargarPermiso(solicitud.pdf_url)}
                                      >
                                        <Download className="h-4 w-4 mr-1" />
                                        Descargar
                                      </Button>
                                    </div>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center py-4">
                                No hay solicitudes registradas
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>
              </div>
      {/* Modal de comentarios */}
      <Dialog open={showComentariosModal} onOpenChange={setShowComentariosModal}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Comentarios de la solicitud</DialogTitle>
          </DialogHeader>
          {solicitudComentariosId && (
            <ComentariosPermisos
              solicitudId={solicitudComentariosId}
              isAdmin={false}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
