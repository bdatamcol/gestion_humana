'use client';

import { useState, useCallback } from 'react';
import { Upload, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface Feed360ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  className?: string;
  folder?: string;
}

export function Feed360ImageUpload({
  value,
  onChange,
  className,
  folder = 'feed360/publicaciones',
}: Feed360ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(value || null);

  const handleUpload = useCallback(
    async (file: File) => {
      setUploading(true);
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', folder);

        const res = await fetch('/api/cloudinary/upload', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || 'Upload failed');
        }

        const data = await res.json();
        setPreview(data.url);
        onChange(data.url);
      } catch (error: any) {
        console.error('Upload error:', error);
        alert(error.message || 'Error al subir imagen');
      } finally {
        setUploading(false);
      }
    },
    [onChange, folder]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      handleUpload(file);
    }
  };

  const removeImage = () => {
    setPreview(null);
    onChange('');
  };

  return (
    <div className={cn('relative', className)}>
      {preview ? (
        <div className="relative aspect-square w-full rounded-lg overflow-hidden border">
          <img
            src={preview}
            alt="Preview"
            className="object-cover w-full h-full"
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 h-8 w-8"
            onClick={removeImage}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center w-full aspect-square rounded-lg border-2 border-dashed cursor-pointer hover:bg-accent/50 transition-colors">
          {uploading ? (
            <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
          ) : (
            <>
              <Upload className="h-10 w-10 text-muted-foreground mb-2" />
              <span className="text-sm text-muted-foreground">
                Subir imagen
              </span>
            </>
          )}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
            disabled={uploading}
          />
        </label>
      )}
    </div>
  );
}