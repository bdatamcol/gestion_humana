"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { createSupabaseClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Calendar, User, Heart, Star, Eye } from "lucide-react"
import { Dialog, DialogContent } from "@/components/ui/dialog"

interface PublicacionDetalle {
  id: string
  titulo: string
  contenido: string
  imagen_principal: string | null
  galeria_imagenes: string[]
  fecha_publicacion: string | null
  autor_id: string
  destacado: boolean
  vistas: number
  estado: string
  usuario_nomina: {
    colaborador: string
  } | null
}

export default function DetallePublicacionBienestarPage() {
  const params = useParams()
  const router = useRouter()
  const publicacionId = params.id as string
  const [publicacion, setPublicacion] = useState<PublicacionDetalle | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  // Formatear la fecha de publicación
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Fecha no disponible"
    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
    return new Date(dateString).toLocaleDateString("es-ES", options)
  }

  // Obtener las iniciales del autor para el avatar
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }

  // Funciones para el modal de imagen
  const openImageModal = (imageUrl: string) => {
    setSelectedImage(imageUrl)
  }

  const closeImageModal = () => {
    setSelectedImage(null)
  }

  useEffect(() => {
    const fetchPublicacion = async () => {
      setLoading(true)
      setError(null)

      const supabase = createSupabaseClient()

      // Verificar autenticación
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) {
        setError("Debe iniciar sesión para ver esta publicación")
        setLoading(false)
        return
      }

      // Verificar que el usuario es administrador
      const { data: userData } = await supabase
        .from("usuario_nomina")
        .select("rol")
        .eq("auth_user_id", session.user.id)
        .single()

      if (!userData || userData.rol !== "administrador") {
        setError("No tiene permisos para ver esta publicación")
        setLoading(false)
        return
      }

      // Obtener la publicación (sin categoria_id que no existe)
      const { data, error: fetchError } = await supabase
        .from("publicaciones_bienestar")
        .select(`
          id,
          titulo,
          contenido,
          imagen_principal,
          galeria_imagenes,
          fecha_publicacion,
          autor_id,
          destacado,
          vistas,
          estado
        `)
        .eq("id", publicacionId)
        .single()

      // Obtener autor por separado
      let autorData = null
      if (data && !fetchError && data.autor_id) {
        const { data: autor } = await supabase
          .from("usuario_nomina")
          .select("colaborador")
          .eq("auth_user_id", data.autor_id)
          .single()
        autorData = autor
      }

      if (fetchError) {
        console.error("Error al cargar publicación de bienestar:", fetchError)
        setError(`No se pudo cargar la publicación: ${fetchError.message}`)
        setPublicacion(null)
      } else if (!data) {
        setError("Publicación no encontrada")
        setPublicacion(null)
      } else {
        // Incrementar contador de vistas
        await supabase
          .from("publicaciones_bienestar")
          .update({ vistas: ((data.vistas as number) || 0) + 1 })
          .eq("id", publicacionId)

        // Para pruebas, agregar imágenes de ejemplo si no hay galería
        const galeriaImagenes =
          (data.galeria_imagenes as string[]) && (data.galeria_imagenes as string[]).length > 0
            ? (data.galeria_imagenes as string[])
            : [
                "https://picsum.photos/800/600?random=1",
                "https://picsum.photos/800/600?random=2",
                "https://picsum.photos/800/600?random=3",
              ]

        setPublicacion({
          id: data.id as string,
          titulo: data.titulo as string,
          contenido: data.contenido as string,
          imagen_principal: data.imagen_principal as string,
          galeria_imagenes: galeriaImagenes,
          fecha_publicacion: data.fecha_publicacion as string,
          autor_id: data.autor_id as string,
          destacado: data.destacado as boolean,
          vistas: ((data.vistas as number) || 0) + 1,
          estado: data.estado as string,
          usuario_nomina: autorData as { colaborador: string } | null,
        })
      }

      setLoading(false)
    }

    if (publicacionId) {
      fetchPublicacion()
    }
  }, [publicacionId])

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando publicación...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Error</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => router.back()} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!publicacion) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="text-gray-400 text-6xl mb-4">📄</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Publicación no encontrada</h2>
            <p className="text-gray-600 mb-4">La publicación que busca no existe o ha sido eliminada.</p>
            <Button onClick={() => router.back()} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header con botón de volver */}
      <div className="flex items-center justify-between mb-6">
        <Button onClick={() => router.back()} variant="outline" className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Button>

        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-gray-500" />
          <span className="text-sm text-gray-600">{publicacion.vistas} vistas</span>
        </div>
      </div>

      {/* Contenido principal */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                {publicacion.destacado && <Star className="h-5 w-5 text-yellow-500 fill-current" />}
                <CardTitle className="text-2xl font-bold text-gray-800">{publicacion.titulo}</CardTitle>
              </div>

              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>{formatDate(publicacion.fecha_publicacion)}</span>
                </div>

                <div className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  <span>{publicacion.usuario_nomina?.colaborador || "Autor desconocido"}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              <Badge variant={publicacion.estado === "publicado" ? "default" : "secondary"}>
                {publicacion.estado === "publicado" ? "Publicado" : "Borrador"}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Imagen principal */}
          {publicacion.imagen_principal && (
            <div className="w-full">
              <img
                src={publicacion.imagen_principal || "/placeholder.svg"}
                alt={publicacion.titulo}
                className="w-full h-64 md:h-80 object-cover rounded-lg border cursor-pointer"
                onClick={() => openImageModal(publicacion.imagen_principal!)}
                onError={(e) => {
                  e.currentTarget.style.display = "none"
                }}
              />
            </div>
          )}

          {/* Contenido */}
          <div className="prose max-w-none">
            <div
              className="text-gray-700 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: publicacion.contenido }}
            />
          </div>

          {/* Galería de imágenes */}
          {publicacion.galeria_imagenes && publicacion.galeria_imagenes.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <Heart className="h-5 w-5 text-pink-500" />
                Galería de Imágenes
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {publicacion.galeria_imagenes.map((img, index) => (
                  <div
                    key={index}
                    className="cursor-pointer overflow-hidden rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300"
                    onClick={() => openImageModal(img)}
                  >
                    <img
                      src={img || "/placeholder.svg"}
                      alt={`Imagen de la galería ${index + 1}`}
                      className="w-full h-40 object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal for image preview */}
      {selectedImage && (
        <Dialog open={!!selectedImage} onOpenChange={() => closeImageModal()}>
          <DialogContent className="max-w-3xl max-h-[90vh]">
            <img
              src={selectedImage || "/placeholder.svg"}
              alt="Imagen ampliada"
              className="w-full h-auto max-h-[90vh] object-contain rounded-lg"
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
