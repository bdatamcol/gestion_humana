"use client"

import { useState, useEffect } from "react"
import { createClient } from "@supabase/supabase-js"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { AlertTriangle, Eye, Edit, Calendar, User, FileText, Image as ImageIcon } from "lucide-react"
import { toast } from "sonner"
import Image from "next/image"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
)

interface ReporteFalla {
  id: string
  usuario_id: string
  tipo_falla: string
  descripcion: string
  imagen_path: string | null
  estado: 'pendiente' | 'en_proceso' | 'resuelto'
  fecha_creacion: string
  fecha_actualizacion: string
  resuelto_por: string | null
  fecha_resolucion: string | null
  comentarios_resolucion: string | null
  usuario_nomina?: {
    colaborador: string
    cedula: string
    empresas?: {
      nombre: string
    }
  }
}

const estadoColors = {
  pendiente: "bg-yellow-100 text-yellow-800",
  en_proceso: "bg-blue-100 text-blue-800",
  resuelto: "bg-green-100 text-green-800"
}

const estadoLabels = {
  pendiente: "Pendiente",
  en_proceso: "En Proceso",
  resuelto: "Resuelto"
}

export default function ReporteFallasAdmin() {
  const [reportes, setReportes] = useState<ReporteFalla[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedReporte, setSelectedReporte] = useState<ReporteFalla | null>(null)
  const [nuevoEstado, setNuevoEstado] = useState<string>('')
  const [comentarios, setComentarios] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<string>('todos')
  const [estadisticas, setEstadisticas] = useState({
    total: 0,
    pendiente: 0,
    en_proceso: 0,
    resuelto: 0
  })
  const [imageDialogOpen, setImageDialogOpen] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  useEffect(() => {
    fetchReportes()
  }, [filtroEstado])

  const calcularEstadisticas = (reportes: ReporteFalla[]) => {
    setEstadisticas({
      total: reportes.length,
      pendiente: reportes.filter(r => r.estado === 'pendiente').length,
      en_proceso: reportes.filter(r => r.estado === 'en_proceso').length,
      resuelto: reportes.filter(r => r.estado === 'resuelto').length
    })
  }

  const fetchReportes = async () => {
    try {
      setLoading(true)
      
      let query = supabase
        .from('reportes_fallas')
        .select('*')
        .order('fecha_creacion', { ascending: false })
      
      if (filtroEstado !== 'todos') {
        query = query.eq('estado', filtroEstado)
      }
      
      const { data: reportesData, error: reportesError } = await query
      
      if (reportesError) {
        console.error('Error fetching reportes:', reportesError)
        toast.error('Error al cargar los reportes de fallas')
        return
      }
      
      const { data: usuariosData, error: usuariosError } = await supabase
        .from('usuario_nomina')
        .select(`
          auth_user_id,
          colaborador,
          cedula,
          empresas (
            nombre
          )
        `)
      
      if (usuariosError) {
        console.error('Error fetching usuarios:', usuariosError)
        toast.error('Error al cargar la información de usuarios')
        return
      }
      
      const reportesConUsuarios = reportesData?.map(reporte => {
        const usuario = usuariosData?.find(u => u.auth_user_id === reporte.usuario_id)
        return {
          ...reporte,
          usuario_nomina: usuario
        }
      }) || []
      
      setReportes(reportesConUsuarios)
      calcularEstadisticas(reportesConUsuarios)
      
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al cargar los reportes de fallas')
    } finally {
      setLoading(false)
    }
  }

  const actualizarEstado = async () => {
    if (!selectedReporte || !nuevoEstado) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('No estás autenticado')
        return
      }

      const updateData: any = {
        estado: nuevoEstado,
        fecha_actualizacion: new Date().toISOString()
      }

      if (nuevoEstado === 'resuelto') {
        updateData.resuelto_por = user.id
        updateData.fecha_resolucion = new Date().toISOString()
        if (comentarios.trim()) {
          updateData.comentarios_resolucion = comentarios.trim()
        }
      }

      const { error } = await supabase
        .from('reportes_fallas')
        .update(updateData)
        .eq('id', selectedReporte.id)

      if (error) {
        console.error('Error updating reporte:', error)
        toast.error('Error al actualizar el estado del reporte')
        return
      }

      toast.success('Estado del reporte actualizado correctamente')
      setSelectedReporte(null)
      setNuevoEstado('')
      setComentarios('')
      fetchReportes()
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al actualizar el estado del reporte')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getImageUrl = (imagePath: string) => {
    if (!imagePath) return null
    const { data } = supabase.storage.from('fallas').getPublicUrl(imagePath)
    return data.publicUrl
  }

  const openImageDialog = (imagePath: string) => {
    const imageUrl = getImageUrl(imagePath)
    if (imageUrl) {
      setSelectedImage(imageUrl)
      setImageDialogOpen(true)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Reportes de Fallas</h1>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{estadisticas.total}</div>
                <div className="text-sm text-gray-500">Total</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{estadisticas.pendiente}</div>
                <div className="text-sm text-gray-500">Pendientes</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{estadisticas.en_proceso}</div>
                <div className="text-sm text-gray-500">En Proceso</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{estadisticas.resuelto}</div>
                <div className="text-sm text-gray-500">Resueltos</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label htmlFor="filtro-estado" className="text-sm font-medium">
              Filtrar por estado:
            </label>
            <Select value={filtroEstado} onValueChange={setFiltroEstado}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Seleccionar estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="pendiente">Pendiente</SelectItem>
                <SelectItem value="en_proceso">En Proceso</SelectItem>
                <SelectItem value="resuelto">Resuelto</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {reportes.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertTriangle className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No hay reportes de fallas
              </h3>
              <p className="text-gray-500 text-center">
                {filtroEstado === 'todos' 
                  ? 'No se han enviado reportes de fallas aún.'
                  : `No hay reportes con estado "${estadoLabels[filtroEstado as keyof typeof estadoLabels]}".`
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {reportes.map((reporte) => (
              <Card key={reporte.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                        {reporte.tipo_falla}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        <div className="flex items-center gap-3 text-xs">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {reporte.usuario_nomina?.colaborador || 'Usuario desconocido'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(reporte.fecha_creacion)}
                          </span>
                          {reporte.usuario_nomina?.empresas?.nombre && (
                            <span className="text-gray-500">
                              {reporte.usuario_nomina.empresas.nombre}
                            </span>
                          )}
                        </div>
                      </CardDescription>
                    </div>
                    <Badge className={estadoColors[reporte.estado]}>
                      {estadoLabels[reporte.estado]}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-3">
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1 flex items-center gap-1 text-sm">
                        <FileText className="h-3 w-3" />
                        Descripción
                      </h4>
                      <p className="text-gray-700 bg-gray-50 p-2 rounded text-sm">
                        {reporte.descripcion}
                      </p>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {reporte.imagen_path && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openImageDialog(reporte.imagen_path!)}
                            className="flex items-center gap-1 h-7 px-2 text-xs"
                          >
                            <Eye className="h-3 w-3" />
                            Ver imagen
                          </Button>
                        )}
                        
                        {reporte.comentarios_resolucion && (
                          <div className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                            ✓ Resuelto {reporte.fecha_resolucion && `el ${formatDate(reporte.fecha_resolucion)}`}
                          </div>
                        )}
                      </div>

                      <div className="flex justify-end">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedReporte(reporte)
                                setNuevoEstado(reporte.estado)
                                setComentarios(reporte.comentarios_resolucion || '')
                              }}
                              className="flex items-center gap-1 h-7 px-2 text-xs"
                            >
                              <Edit className="h-3 w-3" />
                              Cambiar estado
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Actualizar estado del reporte</DialogTitle>
                              <DialogDescription>
                                Cambia el estado del reporte y agrega comentarios si es necesario.
                              </DialogDescription>
                            </DialogHeader>
                            
                            <div className="space-y-4">
                              <div>
                                <label className="text-sm font-medium text-gray-700 mb-2 block">
                                  Nuevo estado
                                </label>
                                <Select value={nuevoEstado} onValueChange={setNuevoEstado}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecciona un estado" />
                                  </SelectTrigger>
                                  <SelectContent>
                                   <SelectItem value="pendiente">Pendiente</SelectItem>
                                   <SelectItem value="en_proceso">En Proceso</SelectItem>
                                   <SelectItem value="resuelto">Resuelto</SelectItem>
                                 </SelectContent>
                                </Select>
                              </div>

                              {nuevoEstado === 'resuelto' && (
                                <div>
                                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                                    Comentarios de resolución
                                  </label>
                                  <Textarea
                                    value={comentarios}
                                    onChange={(e) => setComentarios(e.target.value)}
                                    placeholder="Describe cómo se resolvió el problema..."
                                    rows={3}
                                  />
                                </div>
                              )}

                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedReporte(null)
                                    setNuevoEstado('')
                                    setComentarios('')
                                  }}
                                >
                                  Cancelar
                                </Button>
                                <Button onClick={actualizarEstado}>
                                  Actualizar estado
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Dialog para ver imágenes */}
        <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Imagen del reporte</DialogTitle>
            </DialogHeader>
            {selectedImage && (
              <div className="flex justify-center">
                <Image
                  src={selectedImage}
                  alt="Imagen del reporte de falla"
                  width={800}
                  height={600}
                  className="max-w-full h-auto rounded-lg"
                  style={{ objectFit: 'contain' }}
                />
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}