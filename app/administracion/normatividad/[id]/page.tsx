"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import {
  ArrowLeft,
  Calendar,
  User,
  Eye,
  Tag,
  Scale,
  Star,
} from "lucide-react";
import Image from "next/image";
import { ContentBlock, renderContentBlocks } from '@/components/ui/multimedia-content-editor';

interface Publicacion {
  id: string;
  titulo: string;
  contenido: string;
  imagen_principal: string | null;
  galeria_imagenes: string[] | null;
  fecha_publicacion: string;
  autor: string;
  vistas: number;
  destacado: boolean;
  estado: string;
}

export default function DetallePublicacionNormatividad() {
  const router = useRouter();
  const params = useParams();
  const publicacionId = params.id as string;

  const [publicacion, setPublicacion] = useState<Publicacion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    const checkAuthAndLoadData = async () => {
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

      // Cargar datos básicos de la publicación
      const { data: publicacionData, error: publicacionError } = await supabase
        .from("publicaciones_bienestar")
        .select(`
          id, titulo, contenido, imagen_principal, galeria_imagenes,
          fecha_publicacion, autor, vistas, destacado, estado
        `)
        .eq("id", publicacionId)
        .eq("tipo_seccion", "normatividad")
        .single();

      if (publicacionError || !publicacionData) {
        console.error('Error al cargar publicación de normatividad:', publicacionError);
        setError("No se pudo cargar la publicación.");
        setLoading(false);
        return;
      }

      // Intentar obtener contenido_bloques por separado para evitar errores si la columna no existe
      let contenidoBloques = null;
      try {
        const { data: contenidoData } = await supabase
          .from('publicaciones_bienestar')
          .select('contenido_bloques')
          .eq('id', publicacionId)
          .single();
        contenidoBloques = contenidoData?.contenido_bloques;
      } catch (contenidoError) {
        console.log('Campo contenido_bloques no disponible para normatividad:', contenidoError);
      }

      // Combinar los datos
      const publicacionCompleta = {
        ...publicacionData,
        contenido_bloques: contenidoBloques
      };

      setPublicacion(publicacionCompleta as any);

      // Incrementar contador de vistas
      await supabase
        .from("publicaciones_bienestar")
        .update({ vistas: ((publicacionData.vistas as number) || 0) + 1 })
        .eq("id", publicacionId);

      setLoading(false);
    };

    if (publicacionId) {
      checkAuthAndLoadData();
    }
  }, [publicacionId, router]);

  if (loading) {
    return (
      <div className="py-6 flex min-h-screen">
        <div className="w-full mx-auto flex-1">
          <Card className="shadow-md">
            <CardHeader>
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 animate-pulse">
                <div className="h-64 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
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
              <div className="text-center">
                <p className="text-red-600 mb-4">
                  {error || "Publicación no encontrada"}
                </p>
                <Button
                  onClick={() => router.push("/administracion/normatividad")}
                  className="btn-custom"
                >
                  Volver a Normatividad
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
                onClick={() => router.push("/administracion/normatividad")}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver
              </Button>
              <div className="flex items-center gap-2">
                <Scale className="h-6 w-6 text-blue-500" />
                <span className="text-sm text-gray-600">Normatividad</span>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <CardTitle className="text-3xl font-bold leading-tight">
                  {publicacion.titulo}
                </CardTitle>
                {publicacion.destacado && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Star className="h-3 w-3" />
                    Destacado
                  </Badge>
                )}
              </div>
              
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {new Date(publicacion.fecha_publicacion).toLocaleDateString(
                    "es-ES",
                    {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    }
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  {publicacion.autor}
                </div>
                <div className="flex items-center gap-1">
                  <Eye className="h-4 w-4" />
                  {publicacion.vistas} vistas
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
              <div className="w-full">
                <Dialog>
                  <DialogTrigger asChild>
                    <div className="cursor-pointer">
                      <Image
                        src={publicacion.imagen_principal}
                        alt={publicacion.titulo}
                        width={800}
                        height={400}
                        className="w-full h-64 md:h-96 object-cover rounded-lg shadow-md hover:shadow-lg transition-shadow"
                      />
                    </div>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl">
                    <Image
                      src={publicacion.imagen_principal}
                      alt={publicacion.titulo}
                      width={1200}
                      height={800}
                      className="w-full h-auto object-contain"
                    />
                  </DialogContent>
                </Dialog>
              </div>
            )}

            {/* Contenido */}
            <div className="prose max-w-none">
              {(publicacion as any).contenido_bloques && (publicacion as any).contenido_bloques.length > 0 ? (
                <div dangerouslySetInnerHTML={{ __html: renderContentBlocks((publicacion as any).contenido_bloques) }} />
              ) : (
                <div dangerouslySetInnerHTML={{ __html: publicacion.contenido }} />
              )}
            </div>

            {/* Galería de Imágenes */}
            {publicacion.galeria_imagenes && publicacion.galeria_imagenes.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-xl font-semibold">Galería de Imágenes</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {publicacion.galeria_imagenes.map((imagen, index) => (
                    <Dialog key={index}>
                      <DialogTrigger asChild>
                        <div className="cursor-pointer">
                          <Image
                            src={imagen}
                            alt={`Galería ${index + 1}`}
                            width={200}
                            height={150}
                            className="w-full h-32 object-cover rounded-lg shadow-md hover:shadow-lg transition-shadow"
                          />
                        </div>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl">
                        <Image
                          src={imagen}
                          alt={`Galería ${index + 1}`}
                          width={1200}
                          height={800}
                          className="w-full h-auto object-contain"
                        />
                      </DialogContent>
                    </Dialog>
                  ))}
                </div>
              </div>
            )}

            {/* Botones de Acción */}
            <div className="flex gap-4 pt-6 border-t">
              <Button
                onClick={() =>
                  router.push(`/administracion/normatividad/editar/${publicacion.id}`)
                }
                className="btn-custom"
              >
                Editar Publicación
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push("/administracion/normatividad")}
              >
                Volver a la Lista
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
