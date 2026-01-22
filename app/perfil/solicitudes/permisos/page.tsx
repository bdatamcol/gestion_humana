"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createSupabaseClient } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, CheckCircle2, Calendar, Download, Plus, MessageSquare, Eye, XCircle, Clock } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { ComentariosPermisos } from "@/components/permisos/comentarios-permisos"

export default function SolicitudPermisos() {
  const [showReasonModal, setShowReasonModal] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [showComentariosModal, setShowComentariosModal] = useState(false)
  const [solicitudComentariosId, setSolicitudComentariosId] = useState<string | undefined>(undefined)
  const [unseenCounts, setUnseenCounts] = useState<Record<string, number>>({})
  const [userId, setUserId] = useState<string | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedDetailsSolicitud, setSelectedDetailsSolicitud] = useState<any>(null)

  const handleShowReason = (reason: string) => {
    setRejectionReason(reason)
    setShowReasonModal(true)
  }

  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [userData, setUserData] = useState<any>(null)
  const [solicitudes, setSolicitudes] = useState<any[]>([])
  const [solicitudesEquipo, setSolicitudesEquipo] = useState<any[]>([])
  const [esJefe, setEsJefe] = useState<boolean>(false)
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
          empresas:empresa_id(nombre, razon_social, nit),
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
        // Enriquecer con resumen de aprobaciones de jefes
        const solIds = sols.map(s => s.id)
        let aprobacionesMap: Record<string, { total: number; aprobadas: number; rechazadas: number; pendientes: number }> = {}
        if (solIds.length > 0) {
          const { data: approvals } = await supabase
            .from('permisos_aprobaciones')
            .select('solicitud_id, estado')
            .in('solicitud_id', solIds)
          aprobacionesMap = {}
          solIds.forEach(id => {
            aprobacionesMap[id] = { total: 0, aprobadas: 0, rechazadas: 0, pendientes: 0 }
          })
          approvals?.forEach(ap => {
            const key = (ap as any).solicitud_id
            if (!aprobacionesMap[key]) aprobacionesMap[key] = { total: 0, aprobadas: 0, rechazadas: 0, pendientes: 0 }
            aprobacionesMap[key].total += 1
            if ((ap as any).estado === 'aprobado') aprobacionesMap[key].aprobadas += 1
            else if ((ap as any).estado === 'rechazado') aprobacionesMap[key].rechazadas += 1
            else aprobacionesMap[key].pendientes += 1
          })
        }
        const enriched = sols.map(s => ({ ...s, aprobaciones: aprobacionesMap[s.id] }))
        setSolicitudes(enriched)
        enriched.forEach(s => typeof s.id === 'string' && fetchUnseenCount(s.id))
      }

      setUserData(userData)
      setEsJefe(userData?.rol === 'jefe')

      // Si es jefe, cargar solicitudes del equipo
      if (userData?.rol === 'jefe') {
        const { data: subordinates } = await supabase
          .from('usuario_jefes')
          .select('usuario_id')
          .eq('jefe_id', session.user.id)
        const ids = (subordinates || []).map(s => s.usuario_id)
        if (ids.length > 0) {
          const { data: teamSolicitudes } = await supabase
            .from('solicitudes_permisos')
            .select('*')
            .in('usuario_id', ids)
            .order('fecha_solicitud', { ascending: false })
          // Enriquecer con nombre del colaborador y estado de mi aprobación
          const { data: usuariosN } = await supabase
            .from('usuario_nomina')
            .select(`
              auth_user_id,
              colaborador,
              cedula,
              empresas:empresa_id(nombre),
              cargos:cargo_id(nombre)
            `)
            .in('auth_user_id', ids)
          const enrichedTeam = (teamSolicitudes || []).map(s => {
            const u = usuariosN?.find((x: any) => x.auth_user_id === s.usuario_id)
            return { 
              ...s, 
              colaborador: u?.colaborador,
              usuario: u // Guardar objeto completo del usuario
            }
          })
          // Obtener aprobaciones para las solicitudes del equipo
          const solIdsEquipo = enrichedTeam.map(s => s.id)
          const { data: todasAprobaciones } = await supabase
            .from('permisos_aprobaciones')
            .select('solicitud_id, estado, jefe_id')
            .in('solicitud_id', solIdsEquipo)

          // Obtener nombres de los jefes
          const jefesIds = [...new Set(todasAprobaciones?.map((a: any) => a.jefe_id) || [])]
          let jefesMap: Record<string, string> = {}
          if (jefesIds.length > 0) {
            const { data: jefesData } = await supabase
              .from('usuario_nomina')
              .select('auth_user_id, colaborador')
              .in('auth_user_id', jefesIds)
            if (jefesData) {
              jefesMap = jefesData.reduce((acc: any, curr: any) => {
                acc[curr.auth_user_id] = curr.colaborador
                return acc
              }, {})
            }
          }

          // Agrupar aprobaciones por solicitud
          const aprobacionesPorSol: Record<string, any[]> = {}
          todasAprobaciones?.forEach((ap: any) => {
             if (!aprobacionesPorSol[ap.solicitud_id]) aprobacionesPorSol[ap.solicitud_id] = []
             aprobacionesPorSol[ap.solicitud_id].push({
                jefe_id: ap.jefe_id,
                estado: ap.estado,
                jefe_nombre: jefesMap[ap.jefe_id] || 'Desconocido'
             })
          })

          setSolicitudesEquipo(
            enrichedTeam.map(s => {
                const miAprobacion = todasAprobaciones?.find((a: any) => a.solicitud_id === s.id && a.jefe_id === session.user.id)
                return { 
                    ...s, 
                    estado_aprobacion_jefe: miAprobacion?.estado || 'pendiente',
                    aprobaciones: {
                        detalles: aprobacionesPorSol[s.id] || []
                    }
                }
            })
          )
        } else {
          setSolicitudesEquipo([])
        }
      }
      setLoading(false)
    }

    checkAuth()
  }, [])

  const formatDate = (date: string | Date) => {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' }
    return new Date(date).toLocaleDateString('es-CO', options)
  }

  const aprobarComoJefe = async (solicitudId: string) => {
    try {
      setLoading(true)
      const supabase = createSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }
      const { error } = await supabase
        .from('permisos_aprobaciones')
        .update({ estado: 'aprobado', fecha_resolucion: new Date().toISOString() })
        .eq('solicitud_id', solicitudId)
        .eq('jefe_id', session.user.id)
      if (error) throw error
      setSolicitudesEquipo(prev => prev.map(s => s.id === solicitudId ? { ...s, estado_aprobacion_jefe: 'aprobado' } : s))
      setSuccess('Aprobación registrada.')
    } catch (e) {
      console.error(e)
      setError('Error al aprobar la solicitud.')
    } finally {
      setLoading(false)
    }
  }

  const rechazarComoJefe = async (solicitudId: string) => {
    const motivo = prompt('Motivo del rechazo:')
    if (!motivo) return
    try {
      setLoading(true)
      const supabase = createSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }
      const { error } = await supabase
        .from('permisos_aprobaciones')
        .update({ estado: 'rechazado', fecha_resolucion: new Date().toISOString(), motivo_rechazo: motivo })
        .eq('solicitud_id', solicitudId)
        .eq('jefe_id', session.user.id)
      if (error) throw error
      setSolicitudesEquipo(prev => prev.map(s => s.id === solicitudId ? { ...s, estado_aprobacion_jefe: 'rechazado' } : s))
      setSuccess('Rechazo registrado.')
    } catch (e) {
      console.error(e)
      setError('Error al rechazar la solicitud.')
    } finally {
      setLoading(false)
    }
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

        {/* Sección de aprobaciones como jefe */}
        {esJefe && (
          <div className="mt-6 w-full">
            <Card className="bg-white/80 backdrop-blur-sm w-full">
              <CardHeader>
                <CardTitle>Solicitudes de mi equipo</CardTitle>
                <CardDescription>Aprueba o rechaza las solicitudes de tus colaboradores</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Colaborador</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Fecha Inicio</TableHead>
                      <TableHead>Fecha Fin</TableHead>
                      <TableHead>Mi aprobación</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {solicitudesEquipo.length > 0 ? (
                      solicitudesEquipo.map((s) => (
                        <TableRow key={`equipo-${s.id}`}>
                          <TableCell>{s.colaborador}</TableCell>
                          <TableCell>
                            {s.tipo_permiso === 'no_remunerado' ? 'No remunerado' :
                             s.tipo_permiso === 'remunerado' ? 'Remunerado' :
                             'Actividad interna'}
                          </TableCell>
                          <TableCell>{new Date(s.fecha_inicio).toLocaleDateString()}</TableCell>
                          <TableCell>{new Date(s.fecha_fin).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Badge variant={
                              s.estado_aprobacion_jefe === 'aprobado' ? 'secondary' :
                              s.estado_aprobacion_jefe === 'rechazado' ? 'destructive' :
                              'default'
                            }>
                              {s.estado_aprobacion_jefe.charAt(0).toUpperCase() + s.estado_aprobacion_jefe.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2 items-center">
                              {s.estado_aprobacion_jefe === 'pendiente' && (
                                <>
                                  <Button size="sm" onClick={() => aprobarComoJefe(s.id)}>Aprobar</Button>
                                  <Button size="sm" variant="outline" onClick={() => rechazarComoJefe(s.id)}>Rechazar</Button>
                                </>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedDetailsSolicitud(s)
                                  setShowDetailsModal(true)
                                }}
                                title="Ver detalles completos"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-4">
                          No hay solicitudes de tu equipo
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

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
                    <TableHead>Aprobaciones jefes</TableHead>
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
                          {solicitud.aprobaciones && solicitud.aprobaciones.total > 0 ? (
                            <div className="text-xs">
                              <div>Total: {solicitud.aprobaciones.total}</div>
                              <div className="text-green-700">Aprobadas: {solicitud.aprobaciones.aprobadas}</div>
                              <div className="text-yellow-700">Pendientes: {solicitud.aprobaciones.pendientes}</div>
                              <div className="text-red-700">Rechazadas: {solicitud.aprobaciones.rechazadas}</div>
                            </div>
                          ) : (
                            <div className="text-xs text-gray-500">Sin jefes asignados</div>
                          )}
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

      {/* Modal de Detalles Completos */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalles de la Solicitud</DialogTitle>
            <DialogDescription>
              Información completa de la solicitud de permiso.
            </DialogDescription>
          </DialogHeader>
          
          {selectedDetailsSolicitud && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-sm text-muted-foreground">Colaborador</h4>
                    <p>{selectedDetailsSolicitud.usuario?.colaborador || selectedDetailsSolicitud.colaborador}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-muted-foreground">Cédula</h4>
                    <p>{selectedDetailsSolicitud.usuario?.cedula || 'No disponible'}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-muted-foreground">Cargo</h4>
                    <p>{selectedDetailsSolicitud.usuario?.cargos?.nombre || 'No disponible'}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-muted-foreground">Empresa</h4>
                    <p>{selectedDetailsSolicitud.usuario?.empresas?.nombre || 'No disponible'}</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-sm text-muted-foreground">Tipo de Permiso</h4>
                    <p className="capitalize">{selectedDetailsSolicitud.tipo_permiso.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-muted-foreground">Estado Actual</h4>
                    <Badge
                      className={
                        selectedDetailsSolicitud.estado === 'aprobado'
                          ? 'bg-green-100 text-green-800'
                          : selectedDetailsSolicitud.estado === 'rechazado'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }
                    >
                      {selectedDetailsSolicitud.estado.charAt(0).toUpperCase() + selectedDetailsSolicitud.estado.slice(1)}
                    </Badge>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-muted-foreground">Fecha Solicitud</h4>
                    <p>{new Date(selectedDetailsSolicitud.fecha_solicitud).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-muted-foreground">Ciudad</h4>
                    <p>{selectedDetailsSolicitud.ciudad || 'No especificada'}</p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3">Detalle del Tiempo</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-muted/30 p-3 rounded-md">
                    <span className="text-sm font-medium block mb-1">Inicio</span>
                    <p>{new Date(selectedDetailsSolicitud.fecha_inicio).toLocaleDateString()} {selectedDetailsSolicitud.hora_inicio || ''}</p>
                  </div>
                  <div className="bg-muted/30 p-3 rounded-md">
                    <span className="text-sm font-medium block mb-1">Fin</span>
                    <p>{new Date(selectedDetailsSolicitud.fecha_fin).toLocaleDateString()} {selectedDetailsSolicitud.hora_fin || ''}</p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-2">Motivo</h4>
                <div className="bg-muted/30 p-4 rounded-md">
                  <p className="text-sm whitespace-pre-wrap">{selectedDetailsSolicitud.motivo || 'No especificado'}</p>
                </div>
              </div>

              {selectedDetailsSolicitud.compensacion && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-2">Compensación</h4>
                  <div className="bg-muted/30 p-4 rounded-md">
                    <p className="text-sm whitespace-pre-wrap">{selectedDetailsSolicitud.compensacion}</p>
                  </div>
                </div>
              )}

              {selectedDetailsSolicitud.aprobaciones && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-3">Aprobaciones de Jefes</h4>
                  <div className="space-y-2">
                    {selectedDetailsSolicitud.aprobaciones.detalles?.map((detalle: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between bg-white border p-3 rounded-md shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-full ${
                            detalle.estado === 'aprobado' ? 'bg-green-100' : 
                            detalle.estado === 'rechazado' ? 'bg-red-100' : 'bg-yellow-100'
                          }`}>
                            {detalle.estado === 'aprobado' ? (
                              <CheckCircle2 className={`h-4 w-4 ${
                                detalle.estado === 'aprobado' ? 'text-green-600' : 
                                detalle.estado === 'rechazado' ? 'text-red-600' : 'text-yellow-600'
                              }`} />
                            ) : detalle.estado === 'rechazado' ? (
                              <XCircle className="h-4 w-4 text-red-600" />
                            ) : (
                              <Clock className="h-4 w-4 text-yellow-600" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{detalle.jefe_nombre}</p>
                            <p className="text-xs text-muted-foreground capitalize">{detalle.estado}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                    {(!selectedDetailsSolicitud.aprobaciones.detalles || selectedDetailsSolicitud.aprobaciones.detalles.length === 0) && (
                      <p className="text-sm text-muted-foreground italic">No hay jefes asignados para aprobación.</p>
                    )}
                  </div>
                </div>
              )}

              {selectedDetailsSolicitud.motivo_rechazo && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-2 text-red-600">Motivo de Rechazo</h4>
                  <div className="bg-red-50 p-4 rounded-md border border-red-100">
                    <p className="text-sm text-red-800">{selectedDetailsSolicitud.motivo_rechazo}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailsModal(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
