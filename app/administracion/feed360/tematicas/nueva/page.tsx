'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

export default function NuevaTematicaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    titulo: '',
    descripcion: '',
    fecha_inicio: '',
    fecha_fin: '',
    estado: 'abierta',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.titulo || !formData.fecha_inicio || !formData.fecha_fin) {
      toast.error('Completa los campos requeridos');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/feed360/tematicas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          fecha_inicio: new Date(formData.fecha_inicio).toISOString(),
          fecha_fin: new Date(formData.fecha_fin).toISOString(),
        }),
      });

      if (res.ok) {
        toast.success('Temática creada');
        router.push('/administracion/feed360/tematicas');
      } else {
        const error = await res.json();
        toast.error(error.error || 'Error al crear');
      }
    } catch (error) {
      toast.error('Error al crear temática');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Nueva Temática</h1>
          <p className="text-muted-foreground">
            Crea una nueva temática para el feed
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
        </div>

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </form>
    </div>
  );
}