"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createSupabaseClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Upload, CheckCircle2, X, Clock, Settings, CheckCircle, XCircle } from "lucide-react"
import { toast } from "@/hooks/use-toast"

const tiposFalla = [
  { value: "sistema", label: "Problema del Sistema" },
  { value: "funcionalidad", label: "Funcionalidad No Funciona" },
  { value: "rendimiento", label: "Problema de Rendimiento" },
  { value: "interfaz", label: "Problema de Interfaz" },
  { value: "datos", label: "Problema con Datos" },
  { value: "otro", label: "Otro" }
]

const estadosConfig = {
  pendiente: { label: "Pendiente", color: "bg-yellow-100 text-yellow-800", icon: Clock },
  en_proceso: { label: "En Proceso", color: "bg-blue-100 text-blue-800", icon: Settings },
  resuelto: { label: "Resuelto", color: "bg-green-100 text-green-800", icon: CheckCircle },
  cerrado: { label: "Cerrado", color: "bg-gray-100 text-gray-800", icon: XCircle }
}

interface ReporteFalla {
  id: string
  tipo_falla: string
  descripcion: string
  imagen_path: string | null
  estado: 'pendiente' | 'en_proceso' | 'resuelto' | 'cerrado'
  fecha_creacion: string
  fecha_actualizacion: string
}

export default function ReporteFallas() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    tipoFalla: "",
    descripcion: ""
  })
  const [imagen, setImagen] = useState<File | null>(null)
  const [imagenPreview, setImagenPreview] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [reportes, setReportes] = useState<ReporteFalla[]>([])
  const [loadingReportes, setLoadingReportes] = useState(true)

  // Cargar reportes del usuario
  const cargarReportes = async () => {
    try {
      const supabase = createSupabaseClient()
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        console.error('Error de autenticación:', authError)
        return
      }

      const { data, error } = await supabase
        .from('reportes_fallas')
        .select('*')
        .eq('usuario_id', user.id)
        .order('fecha_creacion', { ascending: false })

      if (error) {
        console.error('Error al cargar reportes:', error)
        return
      }

      setReportes(data || [])
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoadingReportes(false)
    }
  }

  useEffect(() => {
    cargarReportes()
  }, [])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validar tipo de archivo
      if (!file.type.startsWith('image/')) {
        setError("Por favor selecciona un archivo de imagen válido")
        return
      }
      
      // Validar tamaño (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError("La imagen no puede ser mayor a 5MB")
        return
      }

      setImagen(file)
      
      // Crear preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagenPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
      setError("")
    }
  }

  const removeImage = () => {
    setImagen(null)
    setImagenPreview(null)
    // Reset input file
    const fileInput = document.getElementById('imagen') as HTMLInputElement
    if (fileInput) {
      fileInput.value = ''
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setIsLoading(true)

    try {
      const supabase = createSupabaseClient()
      
      // Verificar autenticación
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        throw new Error("No estás autenticado")
      }

      let imagenPath = null

      // Subir imagen si existe
      if (imagen) {
        const fileExt = imagen.name.split('.').pop()
        const fileName = `${user.id}/${Date.now()}.${fileExt}`
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('fallas')
          .upload(fileName, imagen)

        if (uploadError) {
          throw new Error(`Error al subir la imagen: ${uploadError.message}`)
        }

        imagenPath = uploadData.path
      }

      // Insertar reporte en la base de datos
      const { error: insertError } = await supabase
        .from('reportes_fallas')
        .insert({
          usuario_id: user.id,
          tipo_falla: formData.tipoFalla,
          descripcion: formData.descripcion,
          imagen_path: imagenPath
        })

      if (insertError) {
        throw new Error(`Error al crear el reporte: ${insertError.message}`)
      }

      setSuccess("Reporte de falla enviado exitosamente")
      toast({
        title: "Éxito",
        description: "Tu reporte de falla ha sido enviado correctamente",
      })
      
      // Limpiar formulario
      setFormData({ tipoFalla: "", descripcion: "" })
      removeImage()
      
      // Recargar lista de reportes
      await cargarReportes()

    } catch (err: any) {
      setError(err.message)
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full mx-auto space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Reporte de Fallas</h1>
        <p className="text-gray-600">
          Reporta cualquier problema técnico que encuentres en el sistema
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Nuevo Reporte de Falla
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mb-6 border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">{success}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Tipo de Falla */}
            <div className="space-y-2">
              <Label htmlFor="tipoFalla">Tipo de Falla *</Label>
              <Select
                value={formData.tipoFalla}
                onValueChange={(value) => setFormData({ ...formData, tipoFalla: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona el tipo de falla" />
                </SelectTrigger>
                <SelectContent>
                  {tiposFalla.map((tipo) => (
                    <SelectItem key={tipo.value} value={tipo.value}>
                      {tipo.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Descripción */}
            <div className="space-y-2">
              <Label htmlFor="descripcion">Descripción del Problema *</Label>
              <Textarea
                id="descripcion"
                placeholder="Describe detalladamente el problema que estás experimentando..."
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                rows={5}
                required
                className="resize-none"
              />
            </div>

            {/* Imagen */}
            <div className="space-y-2">
              <Label htmlFor="imagen">Adjuntar Imagen (Opcional)</Label>
              <div className="space-y-4">
                <div className="flex items-center justify-center w-full">
                  <label
                    htmlFor="imagen"
                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 mb-2 text-gray-500" />
                      <p className="mb-2 text-sm text-gray-500">
                        <span className="font-semibold">Haz clic para subir</span> o arrastra una imagen
                      </p>
                      <p className="text-xs text-gray-500">PNG, JPG, GIF hasta 5MB</p>
                    </div>
                    <Input
                      id="imagen"
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Preview de la imagen */}
                {imagenPreview && (
                  <div className="relative">
                    <div className="relative inline-block">
                      <img
                        src={imagenPreview}
                        alt="Preview"
                        className="max-w-full h-48 object-contain rounded-lg border"
                      />
                      <button
                        type="button"
                        onClick={removeImage}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                      {imagen?.name} ({(imagen?.size || 0 / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Botones */}
            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isLoading || !formData.tipoFalla || !formData.descripcion}
                className="flex-1 bg-orange-500 hover:bg-orange-600"
              >
                {isLoading ? "Enviando..." : "Enviar Reporte"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Listado de Reportes */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Mis Reportes de Fallas</CardTitle>
          <CardDescription>
            Historial de todos tus reportes enviados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingReportes ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
            </div>
          ) : reportes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No tienes reportes de fallas aún</p>
              <p className="text-sm">Completa el formulario arriba para enviar tu primer reporte</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reportes.map((reporte) => {
                const estadoConfig = estadosConfig[reporte.estado]
                const tipoFallaLabel = tiposFalla.find(t => t.value === reporte.tipo_falla)?.label || reporte.tipo_falla
                const IconoEstado = estadoConfig.icon
                
                return (
                  <div key={reporte.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-gray-900">{tipoFallaLabel}</h3>
                          <Badge className={`${estadoConfig.color} flex items-center gap-1`}>
                            <IconoEstado className="h-3 w-3" />
                            {estadoConfig.label}
                          </Badge>
                        </div>
                        <p className="text-gray-600 text-sm mb-2">{reporte.descripcion}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>Enviado: {new Date(reporte.fecha_creacion).toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}</span>
                          {reporte.fecha_actualizacion !== reporte.fecha_creacion && (
                            <span>Actualizado: {new Date(reporte.fecha_actualizacion).toLocaleDateString('es-ES', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}</span>
                          )}
                        </div>
                      </div>
                      {reporte.imagen_path && (
                        <div className="ml-4">
                          <img
                            src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/fallas/${reporte.imagen_path}`}
                            alt="Imagen del reporte"
                            className="w-16 h-16 object-cover rounded border"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}