"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Shield,
  Calendar,
  User,
  Eye,
  Tag,
  Star,
} from "lucide-react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ContentBlock, renderContentBlocks } from '@/components/ui/multimedia-content-editor';

export default function DetallePublicacionSST() {
  const router = useRouter();
  const params = useParams();
  const publicacionId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [publicacion, setPublicacion] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);

  useEffect(() => {
    const loadPublicacion = async () => {
      const supabase = createSupabaseClient();
      const {
        data: { session },
        error: authError,
      } = await supabase.auth.getSession();

      if (authError || !session) {
        router.push("/");
        return;
      }

      // Verificar rol
      const { data: userData, error: userError } = await supabase
        .from("usuario_nomina")
        .select("rol")
        .eq("auth_user_id", session.user.id)
        .single();

      if (userError || userData?.rol !== "administrador") {
        router.push("/perfil");
        return;
      }

      // Cargar datos básicos de la publicación con información de la categoría
      const { data: publicacionData, error: publicacionError } = await supabase
        .from("publicaciones_sst")
        .select(`
          id, titulo, contenido, imagen_principal, galeria_imagenes, 
          fecha_publicacion, autor, vistas, destacado, estado, 
          created_at, updated_at, tipo_seccion,
          categoria:categorias_sst(nombre)
        `)
        .eq("id", publicacionId)
        .single();

      if (publicacionError || !publicacionData) {
        console.error('Error al cargar publicación SST:', publicacionError);
        setError("No se pudo cargar la publicación.");
        setLoading(false);
        return;
      }

      // Intentar obtener contenido_bloques por separado para evitar errores si la columna no existe
      let contenidoBloques = null;
      try {
        const { data: contenidoData } = await supabase
          .from('publicaciones_sst')
          .select('contenido_bloques')
          .eq('id', publicacionId)
          .single();
        contenidoBloques = contenidoData?.contenido_bloques;
      } catch (contenidoError) {
        console.log('Campo contenido_bloques no disponible para SST:', contenidoError);
      }

      // Combinar los datos
      const publicacionCompleta = {
        ...publicacionData,
        contenido_bloques: contenidoBloques
      };

      setPublicacion(publicacionCompleta);

      // Incrementar el contador de visualizaciones
      await supabase
        .from("publicaciones_sst")
        .update({ vistas: ((publicacionData.vistas as number) || 0) + 1 })
        .eq("id", publicacionId);

      setLoading(false);
    };

    if (publicacionId) {
      loadPublicacion();
    }
  }, [publicacionId]);

  const openImageDialog = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setImageDialogOpen(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="py-6 flex min-h-screen">
        <div className="w-full mx-auto flex-1">
          <Card className="shadow-md">
            <CardHeader>
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 animate-pulse">
                <div className="h-64 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                <div className="h-4 bg-gray-200 rounded w-4/6"></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error || !publicacion) {
    return (
      <div className="py-6 flex min-h-screen">
        <div className="w-full mx-auto flex-1">
          <Card className="shadow-md">
            <CardContent className="p-6">
              <div className="text-center py-8">
                <p className="text-red-600 mb-4">
                  {error || "Publicación no encontrada"}
                </p>
                <Button
                  onClick={() => router.push("/administracion/sst")}
                  className="btn-custom"
                >
                  Volver a SST
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6 flex min-h-screen">
      <div className="w-full mx-auto flex-1">
        <Card className="shadow-md">
          <CardHeader className="bg-primary/5 pb-6">
            <div className="flex items-center gap-4 mb-4">
              <Button
                variant="ghost"
                onClick={() => router.push("/administracion/sst")}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver
              </Button>
              <div className="flex items-center gap-2">
                <Shield className="h-6 w-6 text-green-500" />
                <span className="text-sm text-gray-600">SST</span>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <CardTitle className="text-2xl font-bold leading-tight">
                  {publicacion.titulo}
                </CardTitle>
                {publicacion.destacado && (
                  <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
                    <Star className="h-3 w-3 mr-1" />
                    Destacado
                  </Badge>
                )}
              </div>
              
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>{formatDate(publicacion.created_at)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  <span>{publicacion.autor}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Tag className="h-4 w-4" />
                  <span>{publicacion.categoria?.nombre}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Eye className="h-4 w-4" />
                  <span>{publicacion.vistas || 0} visualizaciones</span>
                </div>
                <Badge
                  variant={publicacion.estado === "publicado" ? "default" : "secondary"}
                >
                  {publicacion.estado === "publicado" ? "Publicado" : "Borrador"}
                </Badge>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-6 space-y-6">
            {/* Imagen Principal */}
            {publicacion.imagen_principal && (
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Imagen Principal</h3>
                <div className="relative w-full max-w-2xl mx-auto">
                  <Image
                    src={publicacion.imagen_principal}
                    alt={publicacion.titulo}
                    className="rounded-lg object-cover w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => openImageDialog(publicacion.imagen_principal)}
                  />
                </div>
              </div>
            )}

            {/* Contenido */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Contenido</h3>
              <div className="prose max-w-none">
                {publicacion.contenido_bloques && publicacion.contenido_bloques.length > 0 ? (
                  <div dangerouslySetInnerHTML={{ __html: renderContentBlocks(publicacion.contenido_bloques) }} />
                ) : (
                  <div dangerouslySetInnerHTML={{ __html: publicacion.contenido }} />
                )}
              </div>
            </div>

            {/* Galería de Imágenes */}
            {publicacion.galeria_imagenes && publicacion.galeria_imagenes.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Galería de Imágenes</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {publicacion.galeria_imagenes.map((imagen: string, index: number) => (
                    <div key={index} className="relative group">
                      <Image
                        src={imagen}
                        alt={`Galería ${index + 1}`}
                        width={200}
                        height={150}
                        className="rounded-lg object-cover w-full h-32 cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => openImageDialog(imagen)}
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded-lg flex items-center justify-center">
                        <Eye className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Información adicional */}
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <h3 className="text-lg font-semibold">Información de la Publicación</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-600">Fecha de creación:</span>
                  <p>{formatDate(publicacion.created_at)}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Última actualización:</span>
                  <p>{formatDate(publicacion.updated_at)}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Autor:</span>
                  <p>{publicacion.autor}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Categoría:</span>
                  <p>{publicacion.categoria?.nombre}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Estado:</span>
                  <p>{publicacion.estado === "publicado" ? "Publicado" : "Borrador"}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Visualizaciones:</span>
                  <p>{publicacion.vistas || 0}</p>
                </div>
              </div>
            </div>

            {/* Botones de acción */}
            <div className="flex gap-4 pt-6 border-t">
              <Button
                onClick={() => router.push(`/administracion/sst/editar/${publicacion.id}`)}
                className="btn-custom flex-1"
              >
                Editar Publicación
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push("/administracion/sst")}
                className="flex-1"
              >
                Volver a la Lista
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Dialog para mostrar imágenes en tamaño completo */}
        <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] p-0">
            <DialogHeader className="p-6 pb-0">
              <DialogTitle>Vista de Imagen</DialogTitle>
            </DialogHeader>
            <div className="p-6 pt-0">
              {selectedImage && (
                <Image
                  src={selectedImage}
                  alt="Imagen ampliada"
                  width={1000}
                  height={600}
                  className="rounded-lg object-contain w-full h-auto max-h-[90vh]"
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
