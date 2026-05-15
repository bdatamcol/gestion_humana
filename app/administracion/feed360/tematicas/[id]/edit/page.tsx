'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Feed360ImageUpload } from '@/components/feed360/Feed360ImageUpload';
import { toast } from 'sonner';
import { bogotaDateTimeLocalToIso, isoToBogotaDateTimeLocal } from '@/lib/date-utils';

interface Tematica {
  id: string;
  titulo: string;
  descripcion: string | null;
  fecha_inicio: string;
  fecha_fin: string;
  estado: string;
  imagen_url: string;
}

export default function EditarTematicaPage() {
  const router = useRouter();
  const params = useParams();
  const tematicaId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imagenUrl, setImagenUrl] = useState('');
  const [formData, setFormData] = useState({
    titulo: '',
    descripcion: '',
    fecha_inicio: '',
    fecha_fin: '',
    estado: 'abierta',
  });

  useEffect(() => {
    const fetchTematica = async () => {
      try {
        const res = await fetch(`/api/feed360/tematicas/${tematicaId}`);
        if (res.ok) {
          const data: Tematica = await res.json();
          setFormData({
            titulo: data.titulo,
            descripcion: data.descripcion || '',
            fecha_inicio: isoToBogotaDateTimeLocal(data.fecha_inicio),
            fecha_fin: isoToBogotaDateTimeLocal(data.fecha_fin),
            estado: data.estado,
          });
          setImagenUrl(data.imagen_url || '');
        } else {
          toast.error('Temática no encontrada');
          router.push('/administracion/feed360/tematicas');
        }
      } catch (error) {
        toast.error('Error al cargar');
      } finally {
        setLoading(false);
      }
    };

    fetchTematica();
  }, [tematicaId, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.titulo || !formData.fecha_inicio || !formData.fecha_fin) {
      toast.error('Completa los campos requeridos');
      return;
    }

    if (!imagenUrl) {
      toast.error('La imagen es requerida');
      return;
    }

    setSaving(true);

    try {
      const res = await fetch(`/api/feed360/tematicas/${tematicaId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          imagen_url: imagenUrl,
          fecha_inicio: bogotaDateTimeLocalToIso(formData.fecha_inicio),
          fecha_fin: bogotaDateTimeLocalToIso(formData.fecha_fin),
        }),
      });

      if (res.ok) {
        toast.success('Temática actualizada');
        router.push('/administracion/feed360/tematicas');
      } else {
        const error = await res.json();
        toast.error(error.error || 'Error al actualizar');
      }
    } catch (error) {
      toast.error('Error al actualizar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Editar Temática</h1>
          <p className="text-muted-foreground">
            Modifica los datos de la temática
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 bg-card p-6 rounded-lg border">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Título *
            </label>
            <Input
              placeholder="Nombre de la temática"
              value={formData.titulo}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, titulo: e.target.value }))
              }
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Descripción</label>
            <Textarea
              placeholder="Descripción de la temática (opcional)"
              value={formData.descripcion}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, descripcion: e.target.value }))
              }
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Fecha Inicio *
              </label>
              <Input
                type="datetime-local"
                value={formData.fecha_inicio}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, fecha_inicio: e.target.value }))
                }
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Fecha Fin *
              </label>
              <Input
                type="datetime-local"
                value={formData.fecha_fin}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, fecha_fin: e.target.value }))
                }
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Estado</label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              value={formData.estado}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, estado: e.target.value }))
              }
            >
              <option value="abierta">Abierta</option>
              <option value="cerrada">Cerrada</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Imagen Destacada *
            </label>
            <Feed360ImageUpload
              value={imagenUrl}
              onChange={setImagenUrl}
              folder="feed360/tematicas"
              className="max-w-xs"
            />
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </form>
    </div>
  );
}
