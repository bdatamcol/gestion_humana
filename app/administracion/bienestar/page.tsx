"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase";
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
  Heart,
  Star,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export default function Bienestar() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [publicaciones, setPublicaciones] = useState<any[]>([]);
  const [filteredPublicaciones, setFilteredPublicaciones] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc";
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  // Modal de eliminación
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletePublicacionId, setDeletePublicacionId] = useState<string>("");
  const [deleteInput, setDeleteInput] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  const openDeleteDialog = (publicacionId: string) => {
    if (publicacionId) {
      setDeletePublicacionId(publicacionId);
      setDeleteInput("");
      setDeleteDialogOpen(true);
    }
  };

  const confirmDeletePublicacion = async () => {
    if (deleteInput.trim().toLowerCase() !== "eliminar") {
      setError("Debe escribir 'eliminar' para confirmar.");
      return;
    }
    setDeleteLoading(true);
    setError(null);
    try {
      const supabase = createSupabaseClient();
      if (!deletePublicacionId) {
        setError("ID de la publicación no válido");
        return;
      }

      // Eliminar la publicación principal
      const { error } = await supabase
        .from("publicaciones_bienestar")
        .delete()
        .eq("id", deletePublicacionId);

      if (error) {
        setError(
          "Error al eliminar la publicación. Por favor, intente nuevamente."
        );
      } else {
        setPublicaciones((prev) =>
          prev.filter((p) => p.id !== deletePublicacionId)
        );
        setFilteredPublicaciones((prev) =>
          prev.filter((p) => p.id !== deletePublicacionId)
        );
        setSuccess("Publicación eliminada correctamente.");
        setDeleteDialogOpen(false);
      }
    } catch {
      setError("Error al eliminar la publicación. Por favor, intente nuevamente.");
    } finally {
      setDeleteLoading(false);
    }
  };

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

      // Cargar publicaciones
      const { data: publicacionesData, error: publicacionesError } = await supabase
        .from("publicaciones_bienestar")
        .select(`
          *,
          usuario_nomina:autor_id(colaborador)
        `)
        .eq("tipo_seccion", "bienestar")
        .order("fecha_publicacion", { ascending: false });

      if (!publicacionesError) {
        setPublicaciones(publicacionesData || []);
        setFilteredPublicaciones(publicacionesData || []);
      }

      setLoading(false);
    };

    checkAuth();
  }, []);

  // Ordenamiento
  const requestSort = (key: string) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig?.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  useEffect(() => {
    if (!sortConfig) return;
    const sorted = [...filteredPublicaciones].sort((a, b) => {
      let aVal: any, bVal: any;
      switch (sortConfig.key) {
        case "autor":
          aVal = a.usuario_nomina?.colaborador || "";
          bVal = b.usuario_nomina?.colaborador || "";
          break;
        case "fecha":
          aVal = new Date(a.fecha_publicacion).getTime();
          bVal = new Date(b.fecha_publicacion).getTime();
          break;
        default:
          aVal = a[sortConfig.key] || "";
          bVal = b[sortConfig.key] || "";
      }
      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
    setFilteredPublicaciones(sorted);
  }, [sortConfig]);

  // Búsqueda y filtros
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setSearchLoading(true);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      filterPublicaciones(value);
      setSearchLoading(false);
    }, 300);
  };
  

  
  const filterPublicaciones = (search: string) => {
    let filtered = [...publicaciones];
    if (search) {
      const low = search.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.titulo.toLowerCase().includes(low) ||
          item.contenido.toLowerCase().includes(low) ||
          item.usuario_nomina?.colaborador.toLowerCase().includes(low)
      );
    }
    setFilteredPublicaciones(filtered);
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  return (
    <div className="py-6 flex min-h-screen">
      <div className="w-full mx-auto flex-1">
        <Card className="shadow-md">
          <CardHeader className="bg-primary/5 pb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <CardTitle className="text-2xl font-bold flex items-center gap-2">
                <Heart className="h-6 w-6 text-red-500" />
                Blog de Bienestar
              </CardTitle>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  onClick={() =>
                    router.push("/administracion/bienestar/nuevo")
                  }
                  className="btn-custom"
                >
                  <Plus className="h-4 w-4" /> Nueva publicación
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  type="search"
                  placeholder="Buscar publicaciones..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </div>

            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[300px]">
                      <div
                        className="flex items-center cursor-pointer"
                        onClick={() => requestSort("titulo")}
                      >
                        Título
                        {sortConfig?.key === "titulo" &&
                          (sortConfig.direction === "asc" ? (
                            <ChevronUp className="ml-1 h-4 w-4" />
                          ) : (
                            <ChevronDown className="ml-1 h-4 w-4" />
                          ))}
                      </div>
                    </TableHead>

                    <TableHead>
                      <div
                        className="flex items-center cursor-pointer"
                        onClick={() => requestSort("fecha")}
                      >
                        Fecha
                        {sortConfig?.key === "fecha" &&
                          (sortConfig.direction === "asc" ? (
                            <ChevronUp className="ml-1 h-4 w-4" />
                          ) : (
                            <ChevronDown className="ml-1 h-4 w-4" />
                          ))}
                      </div>
                    </TableHead>
                    <TableHead>
                      <div
                        className="flex items-center cursor-pointer"
                        onClick={() => requestSort("autor")}
                      >
                        Autor
                        {sortConfig?.key === "autor" &&
                          (sortConfig.direction === "asc" ? (
                            <ChevronUp className="ml-1 h-4 w-4" />
                          ) : (
                            <ChevronDown className="ml-1 h-4 w-4" />
                          ))}
                      </div>
                    </TableHead>
                    <TableHead>
                      <div
                        className="flex items-center cursor-pointer"
                        onClick={() => requestSort("estado")}
                      >
                        Estado
                        {sortConfig?.key === "estado" &&
                          (sortConfig.direction === "asc" ? (
                            <ChevronUp className="ml-1 h-4 w-4" />
                          ) : (
                            <ChevronDown className="ml-1 h-4 w-4" />
                          ))}
                      </div>
                    </TableHead>
                    <TableHead>Vistas</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    // Skeleton loader para las filas
                    Array.from({ length: 5 }).map((_, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Skeleton className="h-4 w-[250px]" />
                        </TableCell>

                        <TableCell>
                          <Skeleton className="h-4 w-[80px]" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-[120px]" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-6 w-[80px] rounded-full" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-[40px]" />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Skeleton className="h-8 w-8 rounded" />
                            <Skeleton className="h-8 w-8 rounded" />
                            <Skeleton className="h-8 w-8 rounded" />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : filteredPublicaciones.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        No se encontraron publicaciones
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPublicaciones.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {p.destacado && (
                              <Star className="h-4 w-4 text-yellow-500 fill-current" />
                            )}
                            {p.titulo}
                          </div>
                        </TableCell>

                        <TableCell>{formatDate(p.fecha_publicacion)}</TableCell>
                        <TableCell>
                          {p.usuario_nomina?.colaborador || ""}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              p.estado === "publicado"
                                ? "default"
                                : p.estado === "borrador"
                                ? "outline"
                                : "secondary"
                            }
                          >
                            {p.estado === "publicado"
                              ? "Publicado"
                              : p.estado === "borrador"
                              ? "Borrador"
                              : "Archivado"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-600">{p.vistas || 0}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                router.push(
                                  `/administracion/bienestar/${p.id}`
                                )
                              }
                              title="Ver publicación"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                router.push(
                                  `/administracion/bienestar/editar/${p.id}`
                                )
                              }
                              title="Editar publicación"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => openDeleteDialog(p.id)}
                              title="Eliminar publicación"
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

            {/* Modal de confirmación de eliminación */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirmar eliminación</DialogTitle>
                  <DialogDescription>
                    ¿Está seguro de que desea eliminar esta publicación? Esta
                    acción no se puede deshacer.
                    <br />
                    Para confirmar, escriba{" "}
                    <span className="font-bold">eliminar</span> en el campo de
                    abajo.
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
                {error && (
                  <div className="text-red-600 text-sm mt-2">{error}</div>
                )}
                <DialogFooter className="mt-4 flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setDeleteDialogOpen(false)}
                    disabled={deleteLoading}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={confirmDeletePublicacion}
                    disabled={
                      deleteInput.trim().toLowerCase() !== "eliminar" ||
                      deleteLoading
                    }
                  >
                    {deleteLoading ? "Eliminando..." : "Eliminar"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
