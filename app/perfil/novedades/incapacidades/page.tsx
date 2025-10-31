"use client"

import React, { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { createSupabaseClient } from "@/lib/supabase"
// import { crearNotificacionNuevaSolicitud } from "@/lib/notificaciones" // Removido - se maneja desde el servidor
// Sidebar removido - ya está en el layout
import { Card, CardContent, CardHeader, CardDescription, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  AlertCircle,
  CheckCircle2,
  Calendar,
  Download,
  Plus,
  Upload,
  MessageSquare,
  Search,
  Filter,
} from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ComentariosIncapacidades } from "@/components/incapacidades/comentarios-incapacidades"

export default function IncapacidadesUsuario() {
  const router = useRouter()
  const supabase = createSupabaseClient()

  const [loading, setLoading] = useState(false)
  const [userData, setUserData] = useState<any>(null) // perfil de usuario_nomina
  const [sessionUserId, setSessionUserId] = useState<string | null>(null) // auth user ID
  const [incapacidades, setIncapacidades] = useState<any[]>([])
  const [filteredIncapacidades, setFilteredIncapacidades] = useState<any[]>([])
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    fechaInicio: "",
    fechaFin: "",
    documento: null as File | null,
  })
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [fileError, setFileError] = useState("")

  // Estados para búsqueda y filtros
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedEstado, setSelectedEstado] = useState<string>("all")

  // Comentarios
  const [showCommentsModal, setShowCommentsModal] = useState(false)
  const [currentIncapacidadComent, setCurrentIncapacidadComent] = useState<string | null>(null)
  const [unseenCounts, setUnseenCounts] = useState<Record<string, number>>({})

  // Formatea fecha
  const formatDate = (date: string | null | undefined) => {
    if (!date) return "No especificada"
    const options: Intl.DateTimeFormatOptions = { year: "numeric", month: "long", day: "numeric" }
    return new Date(date + 'T00:00:00').toLocaleDateString("es-CO", options)
  }

  // Función para contar comentarios no vistos por el usuario
  const fetchUserUnseenCount = async (incId: string) => {
    if (!sessionUserId) return
    const { count, error: cntErr } = await supabase
      .from("comentarios_incapacidades")
      .select("*", { head: true, count: "exact" })
      .eq("incapacidad_id", incId)
      .eq("visto_usuario", false)
      .neq("usuario_id", sessionUserId)
    if (!cntErr) {
      setUnseenCounts((prev) => ({ ...prev, [incId]: count || 0 }))
    }
  }

  // Carga inicial: auth, perfil e incapacidades
  useEffect(() => {
    const init = async () => {
      setLoading(true)
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !session) {
        router.push("/login")
        return
      }
      setSessionUserId(session.user.id)

      // Obtener perfil de usuario_nomina
      const { data: usuario, error: userError } = await supabase
        .from("usuario_nomina")
        .select(`*, empresas:empresa_id(nombre, razon_social, nit), sedes:sede_id(nombre)`)
        .eq("auth_user_id", session.user.id)
        .single()
      if (userError) {
        console.error(userError)
      } else {
        setUserData(usuario)
      }

      // Obtener incapacidades del usuario - ahora incluyendo el campo estado
      const { data: incs, error: incError } = await supabase
        .from("incapacidades")
        .select("*, estado, motivo_rechazo, fecha_resolucion")
        .eq("usuario_id", session.user.id)
        .order("fecha_subida", { ascending: false })
      if (incError) {
        console.error(incError)
      } else {
        setIncapacidades(incs || [])
        setFilteredIncapacidades(incs || [])
        // Inicializar contador de no leídos
        incs?.forEach((inc) => {
          if (typeof inc.id === 'string') {
            fetchUserUnseenCount(inc.id)
          }
        })
      }

      setLoading(false)
    }
    init()
  }, [router, supabase])

  // Efecto para filtrar incapacidades
  useEffect(() => {
    let filtered = incapacidades

    // Filtrar por término de búsqueda (fechas)
    if (searchTerm) {
      filtered = filtered.filter(inc => 
        formatDate(inc.fecha_inicio).toLowerCase().includes(searchTerm.toLowerCase()) ||
        formatDate(inc.fecha_fin).toLowerCase().includes(searchTerm.toLowerCase()) ||
        formatDate(inc.fecha_subida).toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filtrar por estado
    if (selectedEstado !== "all") {
      filtered = filtered.filter(inc => inc.estado === selectedEstado)
    }

    setFilteredIncapacidades(filtered)
  }, [incapacidades, searchTerm, selectedEstado])

  // Realtime: actualizar contador cuando llega un nuevo comentario
  useEffect(() => {
    if (!sessionUserId) return
    const channel = supabase
      .channel("user_comments_incapacidades")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "comentarios_incapacidades",
        },
        (payload) => {
          const nuevo = payload.new as any
          // Si no lo escribió este usuario, aumentar contador
          if (nuevo.usuario_id !== sessionUserId) {
            setUnseenCounts((prev) => ({
              ...prev,
              [nuevo.incapacidad_id]: (prev[nuevo.incapacidad_id] || 0) + 1,
            }))
          }
        }
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [sessionUserId, supabase])

  // Manejador al abrir comentarios: marcar como vistos y resetear contador
  const openComments = async (incId: string) => {
    if (sessionUserId) {
      await supabase
        .from("comentarios_incapacidades")
        .update({ visto_usuario: true })
        .eq("incapacidad_id", incId)
        .eq("visto_usuario", false)
        .neq("usuario_id", sessionUserId)
    }
    setUnseenCounts((prev) => ({ ...prev, [incId]: 0 }))
    setCurrentIncapacidadComent(incId)
    setShowCommentsModal(true)
  }

  // Manejadores de formulario de nueva incapacidad...
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    setFormData((f) => ({ ...f, documento: file }))
    setFileError("")
    if (file && file.type !== "application/pdf") {
      setFileError("El archivo debe ser un PDF")
    }
    if (file && file.size > 5 * 1024 * 1024) {
      setFileError("Máximo 5MB")
    }
  }

  const enviarIncapacidad = async () => {
    try {
      if (!formData.fechaInicio || !formData.fechaFin || !formData.documento) {
        setError("Complete todos los campos y adjunte un PDF.")
        return
      }
      const fi = new Date(formData.fechaInicio)
      const ff = new Date(formData.fechaFin)
      if (ff < fi) {
        setError("La fecha de fin debe ser igual o posterior a la de inicio.")
        return
      }
      if (formData.documento.type !== "application/pdf") {
        setError("El documento debe ser PDF.")
        return
      }
      setLoading(true)
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

      const fileName = `${session.user.id}_${Date.now().toString(36)}.pdf`
      const { error: uploadError } = await supabase
        .storage.from("incapacidades")
        .upload(fileName, formData.documento, { upsert: false })
      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage.from("incapacidades").getPublicUrl(fileName)
      const { data: incapacidadData, error: dbError } = await supabase
        .from("incapacidades")
        .insert([{
          usuario_id: session.user.id,
          fecha_inicio: formData.fechaInicio,
          fecha_fin: formData.fechaFin,
          fecha_subida: new Date().toISOString(),
          documento_url: urlData.publicUrl,
        }])
        .select()
        .single()
      if (dbError) throw dbError

      // Enviar notificación por correo
      try {
        const notificationResponse = await fetch('/api/notificaciones/solicitud-incapacidades', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            incapacidadId: incapacidadData.id,
            usuarioId: session.user.id
          })
        })

        if (!notificationResponse.ok) {
          console.error('Error al enviar notificación por correo:', await notificationResponse.text())
        } else {
          console.log('Notificación por correo enviada correctamente')
        }
      } catch (notificationError) {
        console.error('Error al enviar notificación por correo:', notificationError)
        // No interrumpir el flujo principal si falla la notificación
      }

      // Refrescar lista y contadores
      const { data: incs } = await supabase
        .from("incapacidades")
        .select("*")
        .eq("usuario_id", session.user.id)
        .order("fecha_subida", { ascending: false })
      setIncapacidades(incs || [])
      incs?.forEach((inc) => {
        if (typeof inc.id === 'string') {
          fetchUserUnseenCount(inc.id)
        }
      })

      setSuccess("Incapacidad registrada correctamente.")
      setShowModal(false)
      setFormData({ fechaInicio: "", fechaFin: "", documento: null })
    } catch (err: any) {
      console.error(err)
      setError(err.message ?? "Error al registrar incapacidad.")
    } finally {
      setLoading(false)
    }
  }

  const descargarDocumento = async (url: string) => {
    try {
      const res = await fetch(url)
      const blob = await res.blob()
      const link = document.createElement("a")
      link.href = URL.createObjectURL(blob)
      link.download = "incapacidad.pdf"
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch {
      setError("Error al descargar documento.")
    }
  }

  return (
    <>
      <div className="py-6 flex">
        <div className="w-full mx-auto flex-1">
          <div className="w-full bg-white rounded-lg shadow-sm p-6">
            <div className="mb-6">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 sm:gap-0">
                <div>
                  <h1 className="text-2xl font-bold">Mis Incapacidades</h1>
                  <p className="text-muted-foreground">
                    Visualiza y gestiona tus incapacidades registradas.
                  </p>
                </div>
                <Button onClick={() => setShowModal(true)} className="w-full sm:w-auto">
                  <Plus className="mr-2 h-4 w-4" /> Nueva
                </Button>
              </div>
            </div>
            <div className="space-y-6">
              {loading ? (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="h-6 bg-gray-200/60 rounded animate-pulse w-32"></div>
                  <div className="h-4 bg-gray-200/40 rounded animate-pulse w-64"></div>
                </div>
                <div className="border-t">
                  <div className="p-4">
                    <div className="space-y-3">
                      <div className="grid grid-cols-5 gap-4">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className="h-4 bg-gray-200/60 rounded animate-pulse"></div>
                        ))}
                      </div>
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="grid grid-cols-5 gap-4">
                          {[...Array(5)].map((_, j) => (
                            <div key={j} className="h-4 bg-gray-200/40 rounded animate-pulse"></div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                {success && (
                  <Alert className="bg-green-100 text-green-800 border-green-200">
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertDescription>{success}</AlertDescription>
                  </Alert>
                )}

                {/* Filtros */}
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                    <Input
                      type="search"
                      placeholder="Buscar por fechas..."
                      className="pl-8"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="w-full md:w-48">
                    <Select value={selectedEstado} onValueChange={setSelectedEstado}>
                      <SelectTrigger>
                        <SelectValue placeholder="Filtrar por estado" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los estados</SelectItem>
                        <SelectItem value="en_revision">En revisión</SelectItem>
                        <SelectItem value="aprobada">Aprobada</SelectItem>
                        <SelectItem value="rechazada">Rechazada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button variant="outline" className="w-full md:w-auto" onClick={() => {
                    setSearchTerm("")
                    setSelectedEstado("all")
                  }}>
                    <Filter className="mr-2 h-4 w-4" />
                    Limpiar filtros
                  </Button>
                </div>

                {/* Tabla */}
                <div className="rounded-md border overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Inicio</TableHead>
                        <TableHead>Fin</TableHead>
                        <TableHead>Registro</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Documento</TableHead>
                        <TableHead>Comentarios</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8">
                              <div className="animate-spin border-4 border-[#441404] border-t-transparent rounded-full w-10 h-10 mx-auto" />
                            </TableCell>
                          </TableRow>
                        ) : filteredIncapacidades.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8">
                              {incapacidades.length === 0 
                                ? "No has registrado incapacidades." 
                                : "No se encontraron incapacidades con los filtros aplicados."
                              }
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredIncapacidades.map(inc => (
                            <TableRow key={inc.id}>
                              <TableCell>{formatDate(inc.fecha_inicio)}</TableCell>
                              <TableCell>{formatDate(inc.fecha_fin)}</TableCell>
                              <TableCell>{formatDate(inc.fecha_subida)}</TableCell>
                              <TableCell>
                                <Badge
                                  className={
                                    inc.estado === 'aprobada'
                                      ? 'bg-green-100 text-green-800'
                                      : inc.estado === 'rechazada'
                                      ? 'bg-red-100 text-red-800'
                                      : 'bg-yellow-100 text-yellow-800'
                                  }
                                >
                                  {inc.estado === 'en_revision' ? 'En revisión' : 
                                   inc.estado === 'aprobada' ? 'Aprobada' : 
                                   inc.estado === 'rechazada' ? 'Rechazada' : 
                                   inc.estado?.charAt(0).toUpperCase() + inc.estado?.slice(1) || 'En revisión'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => descargarDocumento(inc.documento_url)}
                                >
                                  <Download className="h-4 w-4 mr-1" /> PDF
                                </Button>
                              </TableCell>
                              <TableCell>
                                <div className="relative inline-block">
                                  {unseenCounts[inc.id] > 0 && (
                                    <span className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full text-xs w-5 h-5 flex items-center justify-center">
                                      {unseenCounts[inc.id]}
                                    </span>
                                  )}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openComments(inc.id)}
                                  >
                                    <MessageSquare className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal registro */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Incapacidad</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Fecha inicio</Label>
              <Input
                type="date"
                className="col-span-3"
                value={formData.fechaInicio}
                onChange={e => setFormData(f => ({ ...f, fechaInicio: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Fecha fin</Label>
              <Input
                type="date"
                className="col-span-3"
                value={formData.fechaFin}
                onChange={e => setFormData(f => ({ ...f, fechaFin: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Documento (PDF)</Label>
              <Input
                type="file"
                accept="application/pdf"
                className="col-span-3"
                onChange={handleFileChange}
              />
            </div>
            {fileError && <p className="text-sm text-red-500">{fileError}</p>}
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
            <Button onClick={enviarIncapacidad} disabled={loading || !!fileError}>
              <Upload className="h-4 w-4 mr-1" /> Registrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal comentarios */}
      {currentIncapacidadComent && (
        <Dialog
          open={showCommentsModal}
          onOpenChange={open => {
            if (!open) setCurrentIncapacidadComent(null)
            setShowCommentsModal(open)
          }}
        >
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>Comentarios</DialogTitle>
            </DialogHeader>
            <ComentariosIncapacidades incapacidadId={currentIncapacidadComent} />
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
