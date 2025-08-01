"use client";

import { useState, useRef } from "react";
import { createSupabaseClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ImageUploadProps {
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

export function ImageUpload({
  value,
  onChange,
  onRemove,
  bucket = "bienestar",
  folder = "images",
  label = "Imagen",
  accept = "image/*",
  maxSize = 1,
  className = "",
  showPreview = true,
}: ImageUploadProps) {
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

    // Validar tipo
    if (!file.type.startsWith('image/')) {
      setError('Solo se permiten archivos de imagen');
      return;
    }

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
      console.error('Error al subir imagen:', error);
      setError('Error al subir la imagen. Por favor, intente nuevamente.');
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
      console.error('Error al eliminar imagen:', error);
    }

    if (onRemove) {
      onRemove();
    } else {
      onChange('');
    }
  };

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
          <Upload className="h-4 w-4" />
          {uploading ? 'Subiendo...' : 'Seleccionar imagen'}
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
              Imagen subida
            </Badge>
          </div>
        </div>
      )}
      
      <div className="text-xs text-gray-500">
        Formatos permitidos: JPG, PNG, WebP, GIF. Tamaño máximo: {maxSize}MB
      </div>
    </div>
  );
}

// Componente para galería de imágenes múltiples
interface ImageGalleryUploadProps {
  images: string[];
  onChange: (images: string[]) => void;
  bucket?: string;
  folder?: string;
  maxImages?: number;
  maxSize?: number;
}

export function ImageGalleryUpload({
  images,
  onChange,
  bucket = "bienestar",
  folder = "gallery",
  maxImages = 10,
  maxSize = 1,
}: ImageGalleryUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    if (images.length + files.length > maxImages) {
      setError(`Solo se permiten máximo ${maxImages} imágenes`);
      return;
    }

    try {
      setUploading(true);
      setError(null);

      const supabase = createSupabaseClient();
      const uploadPromises = files.map(async (file) => {
        // Validar tamaño
        if (file.size > maxSize * 1024 * 1024) {
          throw new Error(`${file.name} debe ser menor a ${maxSize}MB`);
        }

        // Validar tipo
        if (!file.type.startsWith('image/')) {
          throw new Error(`${file.name} no es un archivo de imagen válido`);
        }

        // Generar nombre único
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

        if (uploadError) throw uploadError;

        // Obtener URL pública
        const { data: { publicUrl } } = supabase.storage
          .from(bucket)
          .getPublicUrl(filePath);

        return publicUrl;
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      onChange([...images, ...uploadedUrls]);
      
      // Limpiar input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
    } catch (error: any) {
      console.error('Error al subir imágenes:', error);
      setError(error.message || 'Error al subir las imágenes. Por favor, intente nuevamente.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = async (index: number) => {
    const imageUrl = images[index];
    
    try {
      // Extraer el path del archivo de la URL
      const url = new URL(imageUrl);
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
      console.error('Error al eliminar imagen:', error);
    }

    const newImages = images.filter((_, i) => i !== index);
    onChange(newImages);
  };

  return (
    <div className="space-y-2">
      <Label>Galería de Imágenes</Label>
      
      <div className="flex items-center gap-2">
        <Input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          disabled={uploading || images.length >= maxImages}
          className="hidden"
          id={`gallery-upload-${Math.random()}`}
        />
        
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || images.length >= maxImages}
          className="flex items-center gap-2"
        >
          <Upload className="h-4 w-4" />
          {uploading ? 'Subiendo...' : 'Agregar imágenes'}
        </Button>
        
        <Badge variant="outline">
          {images.length}/{maxImages}
        </Badge>
      </div>

      {error && (
        <div className="text-red-600 text-sm">{error}</div>
      )}

      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mt-4">
          {images.map((url, index) => (
            <div key={index} className="relative group">
              <img
                src={url}
                alt={`Imagen ${index + 1}`}
                className="w-full h-20 object-cover rounded border"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <Button
                type="button"
                onClick={() => handleRemoveImage(index)}
                variant="destructive"
                size="icon"
                className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
      
      <div className="text-xs text-gray-500">
        Formatos permitidos: JPG, PNG, WebP, GIF. Tamaño máximo por imagen: {maxSize}MB. Máximo {maxImages} imágenes.
      </div>
    </div>
  );
}
