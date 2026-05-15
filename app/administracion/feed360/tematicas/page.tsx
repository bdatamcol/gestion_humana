'use client';

import { useEffect, useState } from 'react';
import { Plus, Search, Edit, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface Tematica {
  id: string;
  titulo: string;
  descripcion: string | null;
  fecha_inicio: string;
  fecha_fin: string;
  estado: string;
  created_at: string;
  imagen_url: string;
}

export default function Feed360TematicasPage() {
  const [tematicas, setTematicas] = useState<Tematica[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const formatBogotaDate = (value: string) =>
    new Intl.DateTimeFormat('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'America/Bogota',
    }).format(new Date(value));

  useEffect(() => {
    fetchTematicas();
  }, []);

  const fetchTematicas = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/feed360/tematicas');
      if (res.ok) {
        const data = await res.json();
        setTematicas(data);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const res = await fetch(`/api/feed360/tematicas/${deleteId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success('Temática eliminada');
        setTematicas((prev) => prev.filter((t) => t.id !== deleteId));
      } else {
        toast.error('Error al eliminar');
      }
    } catch (error) {
      toast.error('Error al eliminar');
    } finally {
      setDeleteId(null);
    }
  };

  const filteredTematicas = tematicas.filter((t) =>
    t.titulo.toLowerCase().includes(search.toLowerCase())
  );

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'abierta':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs">
            <CheckCircle className="h-3 w-3" /> Abierta
          </span>
        );
      case 'cerrada':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs">
            <XCircle className="h-3 w-3" /> Cerrada
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen,radial-gradient(circle_at_74%_36%,rgba(234,215,168,0.45)_0_8%,transparent_8.2%),linear-gradient(120deg,#fafafa,#ededeb)] p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-2xl border border-white/80 bg-white/85 p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black tracking-[-0.03em] text-neutral-900">Temáticas Feed360</h1>
              <p className="mt-1 text-sm text-neutral-600">
                Gestiona las temáticas para las publicaciones
              </p>
            </div>
            <Button className="rounded-xl bg-neutral-950 hover:bg-neutral-800" asChild>
              <a href="/administracion/feed360/tematicas/nueva">
                <Plus className="mr-2 h-4 w-4" />
                Nueva Temática
              </a>
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border border-white/80 bg-white/85 p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar temáticas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-11 rounded-xl border-neutral-200 bg-neutral-50 pl-10"
            />
          </div>

          <div className="mt-5 overflow-hidden rounded-xl border border-neutral-200 bg-white">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-neutral-200 bg-neutral-50/80 hover:bg-neutral-50/80">
                  <TableHead className="w-16 text-neutral-600">Imagen</TableHead>
                  <TableHead className="text-neutral-600">Título</TableHead>
                  <TableHead className="text-neutral-600">Descripción</TableHead>
                  <TableHead className="text-neutral-600">Fecha Inicio</TableHead>
                  <TableHead className="text-neutral-600">Fecha Fin</TableHead>
                  <TableHead className="text-neutral-600">Estado</TableHead>
                  <TableHead className="text-right text-neutral-600">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                      Cargando temáticas...
                    </TableCell>
                  </TableRow>
                ) : filteredTematicas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                      No hay temáticas
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTematicas.map((tematica) => (
                    <TableRow key={tematica.id} className="border-b border-neutral-100 hover:bg-neutral-50/60">
                      <TableCell>
                        {tematica.imagen_url ? (
                          <img
                            src={tematica.imagen_url}
                            alt={tematica.titulo}
                            className="h-11 w-11 rounded-md border border-neutral-200 object-cover"
                          />
                        ) : (
                          <div className="flex h-11 w-11 items-center justify-center rounded-md border border-neutral-200 bg-neutral-100 text-[10px] text-muted-foreground">
                            Sin img
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-semibold text-neutral-900">{tematica.titulo}</TableCell>
                      <TableCell className="max-w-xs truncate text-neutral-600">
                        {tematica.descripcion || '-'}
                      </TableCell>
                      <TableCell>
                        {formatBogotaDate(tematica.fecha_inicio)}
                      </TableCell>
                      <TableCell>
                        {formatBogotaDate(tematica.fecha_fin)}
                      </TableCell>
                      <TableCell>{getEstadoBadge(tematica.estado)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="rounded-lg" asChild>
                            <a href={`/administracion/feed360/tematicas/${tematica.id}/edit`}>
                              <Edit className="h-4 w-4" />
                            </a>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-lg"
                            onClick={() => setDeleteId(tematica.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Temática</DialogTitle>
          </DialogHeader>
          <p>¿Estás seguro de eliminar esta temática? Las publicaciones asociadas se eliminarán también.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
