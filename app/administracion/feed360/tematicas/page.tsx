'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Edit, Trash2, Calendar, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { createSupabaseClient } from '@/lib/supabase';
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
}

export default function Feed360TematicasPage() {
  const router = useRouter();
  const [tematicas, setTematicas] = useState<Tematica[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

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
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Temáticas Feed360</h1>
          <p className="text-muted-foreground">
            Gestiona las temáticas para las publicaciones
          </p>
        </div>
        <Button asChild>
          <a href="/administracion/feed360/tematicas/nueva">
            <Plus className="h-4 w-4 mr-2" />
            Nueva Temática
          </a>
        </Button>
      </div>

      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar temáticas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Fecha Inicio</TableHead>
              <TableHead>Fecha Fin</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  Cargando...
                </TableCell>
              </TableRow>
            ) : filteredTematicas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  No hay temáticas
                </TableCell>
              </TableRow>
            ) : (
              filteredTematicas.map((tematica) => (
                <TableRow key={tematica.id}>
                  <TableCell className="font-medium">{tematica.titulo}</TableCell>
                  <TableCell className="text-muted-foreground max-w-xs truncate">
                    {tematica.descripcion || '-'}
                  </TableCell>
                  <TableCell>
                    {format(new Date(tematica.fecha_inicio), 'dd MMM yyyy', {
                      locale: es,
                    })}
                  </TableCell>
                  <TableCell>
                    {format(new Date(tematica.fecha_fin), 'dd MMM yyyy', {
                      locale: es,
                    })}
                  </TableCell>
                  <TableCell>{getEstadoBadge(tematica.estado)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        asChild
                      >
                        <a href={`/administracion/feed360/tematicas/${tematica.id}/edit`}>
                          <Edit className="h-4 w-4" />
                        </a>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
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