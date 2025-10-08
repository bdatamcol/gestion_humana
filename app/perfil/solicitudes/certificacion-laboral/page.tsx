"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
// Sidebar removido - ya está en el layout
import { createSupabaseClient } from "@/lib/supabase"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Download,
  Plus,
  MessageSquare,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { ComentariosCertificacion } from "@/components/certificacion-laboral/certificacion-laboral"

export default function CertificacionLaboral() {
  const router = useRouter()
  const supabase = createSupabaseClient()

  // — ID del usuario actual
  const [userId, setUserId] = useState<string | null>(null)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setUserId(session.user.id)
    })
  }, [])

  // — estados para solicitudes
  const [loading, setLoading] = useState(false)
  const [solicitudes, setSolicitudes] = useState<any[]>([])
  const [showNewModal, setShowNewModal] = useState(false)
  const [formData, setFormData] = useState({ dirigidoA: "", incluirSalario: false })
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  // — estados para comentarios
  const [unseenCounts, setUnseenCounts] = useState<Record<string, number>>({})
  const [showCommentsModal, setShowCommentsModal] = useState(false)
  const [currentSolicId, setCurrentSolicId] = useState<string | null>(null)

  // 1️⃣ Carga inicial de tus solicitudes
  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return router.push("/login")
      const { data: solData } = await supabase
        .from("solicitudes_certificacion")
        .select("*")
        .eq("usuario_id", session.user.id)
        .order("fecha_solicitud", { ascending: false })
      setSolicitudes(solData || [])
      setLoading(false)
    }
    load()
  }, [])

  // 2️⃣ Cuenta comentarios no vistos (solo de admin)
  const fetchUnseen = async (solId: string) => {
    if (!userId) return
    const { count, error } = await supabase
      .from("comentarios_certificacion")
      .select("*", { head: true, count: "exact" })
      .eq("solicitud_id", solId)
      .eq("visto_usuario", false)
      .neq("usuario_id", userId)
    if (!error) {
      setUnseenCounts(prev => ({ ...prev, [solId]: count || 0 }))
    }
  }
  useEffect(() => {
    solicitudes.forEach(s => fetchUnseen(s.id))
  }, [solicitudes, userId])

  // 3️⃣ Realtime: sumar badge solo si lo envía el admin
  useEffect(() => {
    if (!userId) return
    const channel = supabase
      .channel("user_comentarios_nuevos")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "comentarios_certificacion" },
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

  // 4️⃣ Marca comentarios como leídos y limpia badge **antes** de abrir el modal
  const markReadAndOpen = async (solId: string) => {
    if (!userId) return

    // actualizar BD
    await supabase
      .from("comentarios_certificacion")
      .update({ visto_usuario: true })
      .eq("solicitud_id", solId)
      .eq("visto_usuario", false)
      .neq("usuario_id", userId)

    // limpiar badge local
    setUnseenCounts(prev => ({ ...prev, [solId]: 0 }))

    // abrir modal
    setCurrentSolicId(solId)
    setShowCommentsModal(true)
  }

  // formatea fecha
  const formatDate = (d: Date) =>
    d.toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" })

  // enviar nueva solicitud
  const enviarSolicitud = async () => {
    if (!formData.dirigidoA) {
      setError("Por favor completa el campo 'Dirigido a'")
      return
    }
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return router.push("/login")
      
      // Obtener datos del usuario para la notificación
      const { data: userData, error: userError } = await supabase
        .from("usuario_nomina")
        .select("colaborador")
        .eq("auth_user_id", session.user.id)
        .single()
      
      if (userError) {
        console.error("Error al obtener datos del usuario:", userError)
      }
      
      const { data: nuevaSolicitud, error: insErr } = await supabase
        .from("solicitudes_certificacion")
        .insert([{
          usuario_id: session.user.id,
          dirigido_a: formData.dirigidoA,
          ciudad: "Cúcuta",
          estado: "pendiente",
          salario_contrato: formData.incluirSalario ? "Si" : "No",
        }])
        .select()
        .single()
      
      if (insErr) throw insErr

      // Enviar notificación por correo automáticamente
      try {
        const notificationResponse = await fetch('/api/notificaciones/certificacion-laboral', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            solicitudId: nuevaSolicitud.id,
            usuarioId: session.user.id
          })
        })

        if (!notificationResponse.ok) {
          const errorData = await notificationResponse.json()
          console.error('Error al enviar notificación por correo:', errorData)
          // No interrumpimos el flujo si falla el correo, solo lo registramos
        } else {
          const successData = await notificationResponse.json()
          console.log('Notificación por correo enviada exitosamente:', successData)
        }
      } catch (emailError) {
        console.error('Error al procesar notificación por correo:', emailError)
        // No interrumpimos el flujo si falla el correo
      }

      // Las notificaciones se crean automáticamente desde el servidor

      // recarga lista
      const { data: solData } = await supabase
        .from("solicitudes_certificacion")
        .select("*")
        .eq("usuario_id", session.user.id)
        .order("fecha_solicitud", { ascending: false })
      setSolicitudes(solData || [])
      setSuccess("Solicitud enviada correctamente.")
      setFormData({ dirigidoA: "", incluirSalario: false })
      setShowNewModal(false)
    } catch (e) {
      console.error(e)
      setError("Error al enviar solicitud.")
    } finally {
      setLoading(false)
    }
  }

  // descargar PDF
  const descargar = async (url: string) => {
    try {
      const r = await fetch(url)
      const b = await r.blob()
      const u = URL.createObjectURL(b)
      const a = document.createElement("a")
      a.href = u
      a.download = "certificado-laboral.pdf"
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(u)
    } catch {
      setError("Error al descargar el certificado.")
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex justify-between items-center">
          <div className="h-8 bg-gray-200 rounded-md w-80 animate-pulse"></div>
          <div className="flex gap-2">
            <div className="h-10 bg-gray-200 rounded-md w-24 animate-pulse"></div>
            <div className="h-10 bg-gray-200 rounded-md w-36 animate-pulse"></div>
          </div>
        </div>

        {/* Card Skeleton */}
        <Card className="bg-white/80 backdrop-blur-sm">
          <CardContent className="p-0">
            {/* Table Header Skeleton */}
            <div className="space-y-3 p-4">
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
      {/* --------------------------- */}
      {/* Modal de comentarios */}
      <Dialog
        open={showCommentsModal}
        onOpenChange={open => {
          if (!open) setShowCommentsModal(false)
        }}
      >
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Comentarios de la solicitud</DialogTitle>
          </DialogHeader>
          {currentSolicId && (
            <ComentariosCertificacion solicitudId={currentSolicId} />
          )}
        </DialogContent>
      </Dialog>

      {/* --------------------------- */}
      {/* Página principal */}
      <div className="space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <h1 className="text-2xl font-bold w-full">
                  Solicitudes de Certificación Laboral
                </h1>
                <div className="grid grid-cols-2 sm:flex gap-2 w-full sm:w-auto">
                  <Button
                    variant="outline"
                    onClick={() => router.push('/perfil/solicitudes/certificacion-laboral/historico')}
                    className="flex items-center gap-2"
                  >
                    <FileText className="h-4 w-4" /> Histórico
                  </Button>
                  <Button
                    onClick={() => setShowNewModal(true)}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" /> Nueva solicitud
                  </Button>
                </div>
              </div>

              {/* Alerts */}
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

              {/* Tabla de solicitudes */}
              <Card className="bg-white/80 backdrop-blur-sm">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Dirigido a</TableHead>
                        <TableHead>Ciudad</TableHead>
                        <TableHead>Incluye Salario</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {solicitudes.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center">
                            No hay solicitudes registradas.
                          </TableCell>
                        </TableRow>
                      )}
                      {solicitudes.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell>
                            {formatDate(new Date(s.fecha_solicitud))}
                          </TableCell>
                          <TableCell>{s.dirigido_a}</TableCell>
                          <TableCell>{s.ciudad}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                s.salario_contrato === "Si"
                                  ? "secondary"
                                  : "destructive"
                              }
                            >
                              {s.salario_contrato || "No"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                s.estado === "aprobado"
                                  ? "secondary"
                                  : s.estado === "rechazado"
                                    ? "destructive"
                                    : "default"
                              }
                            >
                              {s.estado.charAt(0).toUpperCase() +
                                s.estado.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell className="flex items-center gap-2">
                            {s.estado === "aprobado" && s.pdf_url && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => descargar(s.pdf_url)}
                              >
                                <Download className="h-4 w-4 mr-1" />
                                Descargar
                              </Button>
                            )}
                            <div className="relative inline-block">
                              {unseenCounts[s.id] > 0 && (
                                <span className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full text-xs w-5 h-5 flex items-center justify-center">
                                  {unseenCounts[s.id]}
                                </span>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => markReadAndOpen(s.id)}
                              >
                                <MessageSquare className="h-4 w-4" />
                              </Button>
                            </div>
                            {s.estado === "rechazado" && s.motivo_rechazo && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  alert(`Motivo: ${s.motivo_rechazo}`)
                                }
                              >
                                Ver motivo
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Modal de nueva solicitud */}
              <Dialog
                open={showNewModal}
                onOpenChange={(o) => {
                  if (!o) setShowNewModal(false)
                }}
              >
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nueva Solicitud</DialogTitle>
                    <DialogDescription>
                      Completa los datos para generar tu certificado.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div>
                      <Label htmlFor="dirigidoA">Dirigido a</Label>
                      <Input
                        id="dirigidoA"
                        value={formData.dirigidoA}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            dirigidoA: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label>Incluir salario y tipo de contrato</Label>
                      <div className="flex gap-4 mt-1">
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            checked={formData.incluirSalario === true}
                            onChange={() =>
                              setFormData({
                                ...formData,
                                incluirSalario: true,
                              })
                            }
                          />
                          Sí
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            checked={formData.incluirSalario === false}
                            onChange={() =>
                              setFormData({
                                ...formData,
                                incluirSalario: false,
                              })
                            }
                          />
                          No
                        </label>
                      </div>
                    </div>
                    <Button
                      onClick={enviarSolicitud}
                      disabled={loading}
                      className="w-full"
                    >
                      {loading ? "⏳ Generando..." : <FileText className="mr-2" />}
                      Generar certificado
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
    </>
  )
}
