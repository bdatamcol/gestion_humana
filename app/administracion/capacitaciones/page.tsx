"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  ChevronDown,
  ChevronUp,
  Users,
  ClipboardList,
  GraduationCap,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { authFetch } from "@/lib/authenticated-fetch";

interface Curso {
  id: string;
  titulo: string;
  descripcion_corta: string;
  estado: string;
  imagen_destacada_url: string | null;
  nota_aprobacion: number;
  total_lecciones: number;
  promedio_calificacion: number | null;
  total_intentos: number;
  created_at: string;
}

export default function CapacitacionesAdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [filteredCursos, setFilteredCursos] = useState<Curso[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteCursoId, setDeleteCursoId] = useState<string>("");
  const [deleteInput, setDeleteInput] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchCursos = async () => {
    try {
      setLoading(true);
      const res = await authFetch("/api/capacitaciones/cursos");
      if (!res.ok) throw new Error("Error al cargar cursos");
      const data = await res.json();
      setCursos(data || []);
      setFilteredCursos(data || []);
    } catch (e: any) {
      setError(e?.message || "Error al cargar cursos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCursos();
  }, []);

  useEffect(() => {
    if (!sortConfig) return;
    const sorted = [...filteredCursos].sort((a, b) => {
      let aVal: any = (a as any)[sortConfig.key];
      let bVal: any = (b as any)[sortConfig.key];
      if (sortConfig.key === "lecciones") {
        aVal = a.total_lecciones;
        bVal = b.total_lecciones;
      } else if (sortConfig.key === "promedio") {
        aVal = a.promedio_calificacion ?? -1;
        bVal = b.promedio_calificacion ?? -1;
      }
      if (aVal == null) aVal = "";
      if (bVal == null) bVal = "";
      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
    setFilteredCursos(sorted);
  }, [sortConfig]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      const low = value.toLowerCase();
      setFilteredCursos(
        cursos.filter(
          (c) =>
            c.titulo.toLowerCase().includes(low) ||
            c.descripcion_corta.toLowerCase().includes(low)
        )
      );
    }, 300);
  };

  const requestSort = (key: string) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig?.key === key && sortConfig.direction === "asc") direction = "desc";
    setSortConfig({ key, direction });
  };

  const openDeleteDialog = (id: string) => {
    setDeleteCursoId(id);
    setDeleteInput("");
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (deleteInput.trim().toLowerCase() !== "eliminar") {
      setError("Debe escribir 'eliminar' para confirmar.");
      return;
    }
    setDeleteLoading(true);
    setError(null);
    try {
      const res = await authFetch(`/api/capacitaciones/cursos/${deleteCursoId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Error al eliminar");
      setCursos((prev) => prev.filter((c) => c.id !== deleteCursoId));
      setFilteredCursos((prev) => prev.filter((c) => c.id !== deleteCursoId));
      setDeleteDialogOpen(false);
    } catch (e: any) {
      setError(e?.message || "Error al eliminar");
    } finally {
      setDeleteLoading(false);
    }
  };

  const sortIcon = (key: string) => {
    if (sortConfig?.key !== key) return null;
    return sortConfig.direction === "asc" ? (
      <ChevronUp className="ml-1 h-4 w-4" />
    ) : (
      <ChevronDown className="ml-1 h-4 w-4" />
    );
  };

  const formatDate = (s: string) =>
    new Date(s).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });

  return (
    <div className="py-6 flex min-h-screen">
      <div className="w-full mx-auto flex-1">
        <Card className="shadow-md">
          <CardHeader className="bg-primary/5 pb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <CardTitle className="text-2xl font-bold flex items-center gap-2">
                <GraduationCap className="h-6 w-6 text-primary" />
                Capacitaciones
              </CardTitle>
              <Button onClick={() => router.push("/administracion/capacitaciones/nuevo")} className="btn-custom">
                <Plus className="h-4 w-4" /> Nuevo curso
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                type="search"
                placeholder="Buscar cursos..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <div className="flex items-center cursor-pointer" onClick={() => requestSort("titulo")}>
                        Título {sortIcon("titulo")}
                      </div>
                    </TableHead>
                    <TableHead>Descripción corta</TableHead>
                    <TableHead className="w-[120px]">
                      <div className="flex items-center cursor-pointer" onClick={() => requestSort("lecciones")}>
                        N° Lecciones {sortIcon("lecciones")}
                      </div>
                    </TableHead>
                    <TableHead className="w-[140px]">
                      <div className="flex items-center cursor-pointer" onClick={() => requestSort("promedio")}>
                        Prom. calificación {sortIcon("promedio")}
                      </div>
                    </TableHead>
                    <TableHead className="w-[120px]">
                      <div className="flex items-center cursor-pointer" onClick={() => requestSort("estado")}>
                        Estado {sortIcon("estado")}
                      </div>
                    </TableHead>
                    <TableHead className="w-[160px]">
                      <div className="flex items-center cursor-pointer" onClick={() => requestSort("created_at")}>
                        Creado {sortIcon("created_at")}
                      </div>
                    </TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-[220px]" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-[260px]" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-[40px]" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-[60px]" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-[80px] rounded-full" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                        <TableCell><Skeleton className="h-8 w-[140px] ml-auto" /></TableCell>
                      </TableRow>
                    ))
                  ) : filteredCursos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        No se encontraron cursos
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCursos.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.titulo}</TableCell>
                        <TableCell className="max-w-[300px] truncate" title={c.descripcion_corta}>
                          {c.descripcion_corta}
                        </TableCell>
                        <TableCell>{c.total_lecciones}</TableCell>
                        <TableCell>
                          {c.promedio_calificacion != null ? (
                            <span className="font-medium">{c.promedio_calificacion.toFixed(1)}</span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              c.estado === "publicado" ? "default" : c.estado === "borrador" ? "outline" : "secondary"
                            }
                          >
                            {c.estado === "publicado" ? "Publicado" : c.estado === "borrador" ? "Borrador" : "Archivado"}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(c.created_at)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => router.push(`/administracion/capacitaciones/${c.id}`)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => router.push(`/administracion/capacitaciones/editar/${c.id}`)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => router.push(`/administracion/capacitaciones/${c.id}/resultados`)} title="Ver resultados">
                              <Users className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => openDeleteDialog(c.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar eliminación</DialogTitle>
              <DialogDescription>
                ¿Está seguro de que desea eliminar este curso? Esta acción eliminará todas sus lecciones, recursos y examen. No se puede deshacer.
                <br />
                Para confirmar, escriba <span className="font-bold">eliminar</span>.
              </DialogDescription>
            </DialogHeader>
            <input
              type="text"
              className="w-full border rounded px-3 py-2 mt-4"
              placeholder="Escriba 'eliminar' para confirmar"
              value={deleteInput}
              onChange={(e) => setDeleteInput(e.target.value)}
              disabled={deleteLoading}
            />
            {error && <div className="text-red-600 text-sm mt-2">{error}</div>}
            <DialogFooter className="mt-4 flex gap-2">
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={deleteLoading}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDelete}
                disabled={deleteInput.trim().toLowerCase() !== "eliminar" || deleteLoading}
              >
                {deleteLoading ? "Eliminando..." : "Eliminar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}