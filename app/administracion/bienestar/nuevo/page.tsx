"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Heart, Upload, X, Plus, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ImageUpload, ImageGalleryUpload } from "@/components/ui/image-upload";

interface FormData {
  titulo: string;
  contenido: string;
  imagen_principal: string;
  galeria_imagenes: string[];
  destacado: boolean;
}

export default function NuevaPublicacionBienestar() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  
  const [formData, setFormData] = useState<FormData>({
    titulo: "",
    contenido: "",
    imagen_principal: "",
    galeria_imagenes: [],
    destacado: false,
  });

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createSupabaseClient();
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error || !session) {
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

      setLoading(false);
    };

    checkAuth();
  }, []);

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent, publicar = false) => {
    e.preventDefault();
    if (!formData.titulo.trim()) return setError("El título es obligatorio");
    if (!formData.contenido.trim()) return setError("El contenido es obligatorio");

    try {
      setSaving(true);
      setError(null);

      const supabase = createSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sesión no encontrada");

      // Verificar que el usuario existe en usuario_nomina
      const { data: userData, error: userError } = await supabase
        .from("usuario_nomina")
        .select("auth_user_id, rol")
        .eq("auth_user_id", session.user.id)
        .single();

      if (userError || !userData) {
        throw new Error("Usuario no encontrado en el sistema. Contacte al administrador.");
      }

      if (userData.rol !== "administrador") {
        throw new Error("No tiene permisos para crear publicaciones.");
      }

      // Insertar publicación
      const { data: insertData, error: insertError } = await supabase
        .from("publicaciones_bienestar")
        .insert({
          titulo: formData.titulo,
          contenido: formData.contenido,
          imagen_principal: formData.imagen_principal || null,
          galeria_imagenes: formData.galeria_imagenes.length > 0 ? formData.galeria_imagenes : [],
          autor_id: session.user.id,
          estado: publicar ? "publicado" : "borrador",
          destacado: formData.destacado,
          tipo_seccion: "bienestar",
        })
        .select("id");
        
      if (insertError || !insertData?.length) throw insertError;

      const mensaje = publicar 
        ? "¡Publicación creada y publicada exitosamente!" 
        : "¡Publicación guardada como borrador exitosamente!";
      
      setSuccess(mensaje);
      
      // Redirigir después de un breve delay
      setTimeout(() => {
        router.push("/administracion/bienestar");
      }, 2000);
      
    } catch (error: any) {
      console.error("Error al guardar:", error);
      
      // Mostrar error más específico
      let errorMessage = "Error al guardar la publicación. Por favor, intente nuevamente.";
      
      if (error?.message) {
        errorMessage = `Error: ${error.message}`;
      } else if (error?.details) {
        errorMessage = `Error: ${error.details}`;
      } else if (error?.hint) {
        errorMessage = `Error: ${error.hint}`;
      }
      
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

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
    );
  }

  return (
    <div className="py-6 flex min-h-screen">
      <div className="w-full mx-auto flex-1">
        <Card className="shadow-md">
          <CardHeader className="bg-primary/5 pb-6">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.back()}
                className="shrink-0"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <CardTitle className="text-2xl font-bold flex items-center gap-2">
                <Heart className="h-6 w-6 text-red-500" />
                Nueva Publicación de Bienestar
              </CardTitle>
            </div>
          </CardHeader>
          
          <CardContent className="p-6">
            <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-6">
              {/* Título */}
              <div className="space-y-2">
                <Label htmlFor="titulo">Título *</Label>
                <Input
                  id="titulo"
                  value={formData.titulo}
                  onChange={(e) => handleInputChange("titulo", e.target.value)}
                  placeholder="Ingrese el título de la publicación"
                  className="w-full"
                />
              </div>

              {/* Imagen Principal */}
              <div className="space-y-2">
                <Label>Imagen Principal</Label>
                <ImageUpload
                  value={formData.imagen_principal}
                  onChange={(url) => handleInputChange("imagen_principal", url)}
                  className="w-full"
                />
              </div>

              {/* Contenido */}
              <div className="space-y-2">
                <Label htmlFor="contenido">Contenido *</Label>
                <Textarea
                  id="contenido"
                  value={formData.contenido}
                  onChange={(e) => handleInputChange("contenido", e.target.value)}
                  placeholder="Escriba el contenido de la publicación..."
                  className="min-h-[200px] w-full"
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

              {/* Mensajes */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}
              
              {success && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
                  {success}
                </div>
              )}

              {/* Botones */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button
                  type="submit"
                  disabled={saving}
                  className="btn-custom flex-1"
                >
                  {saving ? "Guardando..." : "Guardar como borrador"}
                </Button>
                <Button
                  type="button"
                  onClick={(e) => handleSubmit(e, true)}
                  disabled={saving}
                  className="bg-green-600 hover:bg-green-700 text-white flex-1"
                >
                  {saving ? "Publicando..." : "Publicar ahora"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
