"use client";

import { useState, useRef } from "react";
import { createSupabaseClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, X, FileText, Image as ImageIcon, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface FileUploadProps {
  value?: string;
  onChange: (url: string) => void;
  onRemove?: () => void;
  bucket?: string;
  folder?: string;
  label?: string;
  accept?: string;
  maxSize?: number; // en MB
  className?: string;
  showPreview?: boolean;
}

export function FileUpload({
  value,
  onChange,
  onRemove,
  bucket = "documentos",
  folder = "uploads",
  label = "Archivo",
  accept = "*",
  maxSize = 5,
  className = "",
  showPreview = true,
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tamaño
    if (file.size > maxSize * 1024 * 1024) {
      setError(`El archivo debe ser menor a ${maxSize}MB`);
      return;
    }

    // Validar tipo (básico, basado en accept si se provee)
    // Nota: el input accept ya filtra en el diálogo, pero validamos aquí también si es necesario
    // Para simplificar, confiamos en el input accept o validamos extensiones si fuera crítico.

    try {
      setUploading(true);
      setError(null);

      const supabase = createSupabaseClient();
      
      // Generar nombre único para el archivo
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${folder}/${fileName}`;

      // Subir archivo
      const { data, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      // Obtener URL pública
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      onChange(publicUrl);
      
      // Limpiar input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
    } catch (error: any) {
      console.error('Error al subir archivo:', error);
      setError('Error al subir el archivo. Verifique permisos o conexión.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!value) return;

    try {
      // Extraer el path del archivo de la URL
      const url = new URL(value);
      const pathParts = url.pathname.split('/');
      const bucketIndex = pathParts.findIndex(part => part === bucket);
      
      if (bucketIndex !== -1 && bucketIndex < pathParts.length - 1) {
        const filePath = pathParts.slice(bucketIndex + 1).join('/');
        
        const supabase = createSupabaseClient();
        await supabase.storage
          .from(bucket)
          .remove([filePath]);
      }
    } catch (error) {
      console.error('Error al eliminar archivo:', error);
    }

    if (onRemove) {
      onRemove();
    } else {
      onChange('');
    }
  };

  const isImage = value?.match(/\.(jpeg|jpg|gif|png|webp)$/i) != null;

  return (
    <div className={`space-y-2 ${className}`}>
      <Label>{label}</Label>
      
      <div className="flex items-center gap-2">
        <Input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileSelect}
          disabled={uploading}
          className="hidden"
          id={`file-upload-${Math.random()}`}
        />
        
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {uploading ? 'Subiendo...' : 'Seleccionar archivo'}
        </Button>
        
        {value && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleRemove}
            className="text-red-600 hover:text-red-700"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {error && (
        <div className="text-red-600 text-sm">{error}</div>
      )}

      {value && showPreview && (
        <div className="mt-2">
          {isImage ? (
            <div className="relative inline-block">
              <img
                src={value}
                alt="Vista previa"
                className="max-w-xs h-32 object-cover rounded border"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <Badge 
                variant="secondary" 
                className="absolute top-1 left-1 text-xs"
              >
                <ImageIcon className="h-3 w-3 mr-1" />
                Imagen
              </Badge>
            </div>
          ) : (
             <div className="flex items-center gap-2 p-2 border rounded bg-gray-50 max-w-xs">
                <FileText className="h-8 w-8 text-blue-500" />
                <div className="overflow-hidden">
                    <p className="text-xs font-medium truncate w-full">Documento adjunto</p>
                    <a href={value} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">Ver archivo</a>
                </div>
             </div>
          )}
        </div>
      )}
      
      <div className="text-xs text-gray-500">
        Formatos permitidos: Imágenes y PDF. Tamaño máximo: {maxSize}MB
      </div>
    </div>
  );
}
