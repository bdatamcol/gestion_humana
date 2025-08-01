"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { createSupabaseClient } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, Shield, Star } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { ImageUpload, ImageGalleryUpload } from "@/components/ui/image-upload"
import { MultimediaContentEditor, ContentBlock, renderContentBlocks } from "@/components/ui/multimedia-content-editor"

interface FormData {
  titulo: string
  contenido: string
  contenido_bloques: ContentBlock[]
  imagen_principal: string
  galeria_imagenes: string[]
  destacado: boolean
  estado: string
}

interface Publicacion {
  id: string
  titulo: string
  contenido: string
  contenido_bloques?: ContentBlock[]
  imagen_principal: string | null
  galeria_imagenes: string[]
  destacado: boolean
  estado: string
  autor_id: string
  created_at: string
  updated_at: string
}

export default function EditarSSTPage() {
  const router = useRouter()
  const params = useParams()
  const publicacionId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [publicacion, setPublicacion] = useState<Publicacion | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [formData, setFormData] = useState<FormData>({
    titulo: "",
    contenido: "",
    contenido_bloques: [],
    imagen_principal: "",
    galeria_imagenes: [],
    destacado: false,
    estado: "borrador",
  })

  useEffect(() => {
    const checkAuthAndLoadData = async () => {
      const supabase = createSupabaseClient()
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession()

      if (error || !session) {
        router.push("/")
        return
      }

      // Verificar rol
      const { data: userData, error: userError } = await supabase
        .from("usuario_nomina")
        .select("rol")
        .eq("auth_user_id", session.user.id)
        .single()

      if (userError || userData?.rol !== "administrador") {
        router.push("/perfil")
        return
      }

      // Cargar publicación
      const publicacionResult = await supabase
        .from("publicaciones_bienestar")
        .select("*")
        .eq("id", publicacionId)
        .eq("tipo_seccion", "sst")
        .single()

      if (publicacionResult.error) {
        setError("Publicación de SST no encontrada")
        setTimeout(() => router.push("/administracion/sst"), 2000)
        return
      }

      const pub = publicacionResult.data as any
      setPublicacion(pub)
      setFormData({
        titulo: (pub.titulo as string) || "",
        contenido: (pub.contenido as string) || "",
        contenido_bloques: (pub.contenido_bloques as ContentBlock[]) || [],
        imagen_principal: (pub.imagen_principal as string) || "",
        galeria_imagenes: (pub.galeria_imagenes as string[]) || [],
        destacado: (pub.destacado as boolean) || false,
        estado: (pub.estado as string) || "borrador",
      })

      setLoading(false)
    }

    if (publicacionId) {
      checkAuthAndLoadData()
    }
  }, [publicacionId])

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent, nuevoEstado?: string) => {
    e.preventDefault()
    if (!formData.titulo.trim()) return setError("El título es obligatorio")
    
    // Validar que hay al menos un bloque de contenido con contenido
    const hasContent = formData.contenido_bloques.some(block => 
      block.content.trim() !== '' || (block.type === 'text' && block.title?.trim())
    )
    if (!hasContent) return setError("Debe agregar al menos un bloque de contenido")

    try {
      setSaving(true)
      setError(null)

      const supabase = createSupabaseClient()

      const estadoFinal = nuevoEstado || formData.estado

      // Renderizar el contenido de los bloques a HTML
      const contenidoRenderizado = renderContentBlocks(formData.contenido_bloques)
      
      // Preparar datos para actualizar
      const updateData = {
        titulo: formData.titulo,
        contenido: contenidoRenderizado,
        imagen_principal: formData.imagen_principal || null,
        galeria_imagenes: formData.galeria_imagenes.length > 0 ? formData.galeria_imagenes : [],
        destacado: formData.destacado,
        estado: estadoFinal,
      }
      
      // Intentar incluir contenido_bloques si la columna existe
      try {
        const dataWithBlocks = {
          ...updateData,
          contenido_bloques: formData.contenido_bloques
        }
        Object.assign(updateData, dataWithBlocks)
      } catch (e) {
        console.log('Columna contenido_bloques no disponible, usando solo contenido renderizado')
      }

      const { error: updateError } = await supabase
        .from("publicaciones_bienestar")
        .update(updateData)
        .eq("id", publicacionId)

      if (updateError) throw updateError

      let mensaje = "¡Publicación de SST actualizada exitosamente!"
      if (nuevoEstado === "publicado" && formData.estado !== "publicado") {
        mensaje = "¡Publicación de SST actualizada y publicada exitosamente!"
      } else if (nuevoEstado === "borrador" && formData.estado !== "borrador") {
        mensaje = "¡Publicación de SST guardada como borrador exitosamente!"
      }

      setSuccess(mensaje)

      // Actualizar el estado local
      setFormData((prev) => ({ ...prev, estado: estadoFinal }))

      // Redirigir después de un breve delay
      setTimeout(() => {
        router.push("/administracion/sst")
      }, 2000)
    } catch (error: any) {
      console.error("Error al actualizar:", error)
      const errorMessage = error?.message || error?.details || "Error desconocido al actualizar la publicación de SST"
      setError(`Error al actualizar la publicación de SST: ${errorMessage}. Por favor, intente nuevamente.`)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="py-6 flex min-h-screen">
        <div className="w-full mx-auto flex-1">
          <Card className="shadow-md">
            <CardHeader>
              <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
            </CardHeader>
            <CardContent className="space-y-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-10 bg-gray-200 rounded animate-pulse"></div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!publicacion) {
    return (
      <div className="py-6 flex min-h-screen items-center justify-center">
        <Card className="shadow-md max-w-md w-full">
          <CardContent className="p-6 text-center">
            <p className="text-red-600 mb-4">Publicación de SST no encontrada</p>
            <Button onClick={() => router.push("/administracion/sst")}>Volver a SST</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="py-6 flex min-h-screen">
      <div className="w-full mx-auto flex-1">
        <Card className="shadow-md">
          <CardHeader className="bg-primary/5 pb-6">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => router.back()} className="shrink-0">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex-1">
                <CardTitle className="text-2xl font-bold flex items-center gap-2">
                  <Shield className="h-6 w-6 text-green-500" />
                  Editar Publicación de SST
                </CardTitle>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant={formData.estado === "publicado" ? "default" : "secondary"}>
                    {formData.estado === "publicado" ? "Publicado" : "Borrador"}
                  </Badge>
                  {formData.destacado && (
                    <Badge variant="outline" className="text-yellow-600">
                      <Star className="h-3 w-3 mr-1" />
                      Destacado
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            <form onSubmit={(e) => handleSubmit(e)} className="space-y-6">
              {/* Título */}
              <div className="space-y-2">
                <Label htmlFor="titulo">Título *</Label>
                <Input
                  id="titulo"
                  value={formData.titulo}
                  onChange={(e) => handleInputChange("titulo", e.target.value)}
                  placeholder="Ingrese el título de la publicación de SST"
                  className="w-full"
                />
              </div>

              {/* Imagen Principal */}
              <div className="space-y-2">
                <Label>Imagen Principal</Label>
                <ImageUpload
                  value={formData.imagen_principal}
                  onChange={(url) => handleInputChange("imagen_principal", url)}
                />
              </div>

              {/* Contenido Multimedia */}
              <div className="space-y-2">
                <Label>Contenido *</Label>
                <p className="text-sm text-muted-foreground mb-3">
                  Cree contenido dinámico agregando texto, enlaces, videos y código embebido. 
                  Puede agregar múltiples bloques y reordenarlos según necesite.
                </p>
                <MultimediaContentEditor
                  value={formData.contenido_bloques}
                  onChange={(blocks) => handleInputChange("contenido_bloques", blocks)}
                />
              </div>

              {/* Galería de Imágenes */}
              <div className="space-y-2">
                <Label>Galería de Imágenes</Label>
                <ImageGalleryUpload
                  images={formData.galeria_imagenes}
                  onChange={(urls) => handleInputChange("galeria_imagenes", urls)}
                />
              </div>

              {/* Destacado */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="destacado"
                  checked={formData.destacado}
                  onCheckedChange={(checked) => handleInputChange("destacado", checked)}
                />
                <Label htmlFor="destacado" className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-500" />
                  Marcar como publicación destacada
                </Label>
              </div>

              {/* Estado */}
              <div className="space-y-2">
                <Label htmlFor="estado">Estado</Label>
                <Select value={formData.estado} onValueChange={(value) => handleInputChange("estado", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="borrador">Borrador</SelectItem>
                    <SelectItem value="publicado">Publicado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Mensajes */}
              {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>}

              {success && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">{success}</div>
              )}

              {/* Botones */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button type="submit" disabled={saving} className="btn-custom flex-1">
                  {saving ? "Guardando..." : "Guardar cambios"}
                </Button>

                {formData.estado === "borrador" && (
                  <Button
                    type="button"
                    onClick={(e) => handleSubmit(e, "publicado")}
                    disabled={saving}
                    className="bg-green-600 hover:bg-green-700 text-white flex-1"
                  >
                    {saving ? "Publicando..." : "Publicar ahora"}
                  </Button>
                )}

                {formData.estado === "publicado" && (
                  <Button
                    type="button"
                    onClick={(e) => handleSubmit(e, "borrador")}
                    disabled={saving}
                    variant="outline"
                    className="flex-1"
                  >
                    {saving ? "Guardando..." : "Mover a borrador"}
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
