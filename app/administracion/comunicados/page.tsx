"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase";
// AdminSidebar removido - ya está en el layout
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
  BarChart2 as StatsIcon,
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

export default function Comunicados() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [comunicados, setComunicados] = useState<any[]>([]);
  const [filteredComunicados, setFilteredComunicados] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategoria, setSelectedCategoria] = useState<string>("all");
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc";
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  // Modal de eliminación
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteComunicadoId, setDeleteComunicadoId] = useState<string>("");
  const [deleteInput, setDeleteInput] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  const openDeleteDialog = (comunicadoId: string) => {
    if (comunicadoId) {
      setDeleteComunicadoId(comunicadoId);
      setDeleteInput("");
      setDeleteDialogOpen(true);
    }
  };

  const confirmDeleteComunicado = async () => {
    if (deleteInput.trim().toLowerCase() !== "eliminar") {
      setError("Debe escribir 'eliminar' para confirmar.");
      return;
    }
    setDeleteLoading(true);
    setError(null);
    try {
      const supabase = createSupabaseClient();
      if (!deleteComunicadoId) {
        setError("ID del comunicado no válido");
        return;
      }

      // Eliminar registros relacionados primero
      await supabase
        .from("comunicados_cargos")
        .delete()
        .eq("comunicado_id", deleteComunicadoId);

      await supabase
        .from("comunicados_empresas")
        .delete()
        .eq("comunicado_id", deleteComunicadoId);

      await supabase
        .from("comunicados_usuarios")
        .delete()
        .eq("comunicado_id", deleteComunicadoId);

      await supabase
        .from("comunicados_leidos")
        .delete()
        .eq("comunicado_id", deleteComunicadoId);

      // Ahora eliminar el comunicado principal
      const { error } = await supabase
        .from("comunicados")
        .delete()
        .eq("id", deleteComunicadoId);

      if (error) {
        setError(
          "Error al eliminar el comunicado. Por favor, intente nuevamente."
        );
      } else {
        setComunicados((prev) =>
          prev.filter((c) => c.id !== deleteComunicadoId)
        );
        setFilteredComunicados((prev) =>
          prev.filter((c) => c.id !== deleteComunicadoId)
        );
        setSuccess("Comunicado eliminado correctamente.");
        setDeleteDialogOpen(false);
      }
    } catch {
      setError("Error al eliminar el comunicado. Por favor, intente nuevamente.");
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

      // Cargar categorías y comunicados en paralelo
      const [categoriasResult, comunicadosResult] = await Promise.all([
        supabase
          .from("categorias_comunicados")
          .select("*")
          .order("nombre", { ascending: true }),
        supabase
          .from("comunicados")
          .select(`
            *,
            categorias_comunicados:categoria_id(nombre),
            usuario_nomina:autor_id(colaborador)
          `)
          .order("fecha_publicacion", { ascending: false })
      ]);

      if (!categoriasResult.error) {
        setCategorias(categoriasResult.data || []);
      }

      if (!comunicadosResult.error) {
        setComunicados(comunicadosResult.data || []);
        setFilteredComunicados(comunicadosResult.data || []);
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
    const sorted = [...filteredComunicados].sort((a, b) => {
      let aVal: any, bVal: any;
      switch (sortConfig.key) {
        case "categoria":
          aVal = a.categorias_comunicados?.nombre || "";
          bVal = b.categorias_comunicados?.nombre || "";
          break;
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
    setFilteredComunicados(sorted);
  }, [sortConfig]);

  // Búsqueda y filtros
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setSearchLoading(true);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      filterComunicados(value, selectedCategoria);
      setSearchLoading(false);
    }, 300);
  };
  const handleCategoriaChange = (value: string) => {
    setSelectedCategoria(value);
    filterComunicados(searchTerm, value);
  };
  const filterComunicados = (search: string, categoria: string) => {
    let filtered = [...comunicados];
    if (search) {
      const low = search.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.titulo.toLowerCase().includes(low) ||
          item.contenido.toLowerCase().includes(low) ||
          item.usuario_nomina?.colaborador.toLowerCase().includes(low)
      );
    }
    if (categoria !== "all") {
      filtered = filtered.filter((item) => item.categoria_id === categoria);
    }
    setFilteredComunicados(filtered);
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
              <CardTitle className="text-2xl font-bold">
                Comunicados Internos
              </CardTitle>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  onClick={() =>
                    router.push("/administracion/comunicados/nuevo")
                  }
                  className="btn-custom"
                >
                  <Plus className="h-4 w-4" /> Añadir nuevo
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    router.push("/administracion/comunicados/categorias")
                  }
                  className="flex items-center gap-2"
                >
                  Gestionar categorías
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
                  placeholder="Buscar comunicados..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </div>
              <Select
                value={selectedCategoria}
                onValueChange={handleCategoriaChange}
              >
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="Filtrar por categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  {categorias.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                        onClick={() => requestSort("categoria")}
                      >
                        Categoría
                        {sortConfig?.key === "categoria" &&
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
                        Autor/Área
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
                          <Skeleton className="h-4 w-[100px]" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-[80px]" />
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Skeleton className="h-4 w-[120px]" />
                            <Skeleton className="h-3 w-[80px]" />
                          </div>
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-6 w-[80px] rounded-full" />
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
                  ) : filteredComunicados.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        No se encontraron comunicados
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredComunicados.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.titulo}</TableCell>
                        <TableCell>
                          {c.categorias_comunicados?.nombre || "Sin categoría"}
                        </TableCell>
                        <TableCell>{formatDate(c.fecha_publicacion)}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span>
                              {c.usuario_nomina?.colaborador || ""}
                            </span>
                            <span className="text-xs text-gray-500">
                              {c.area_responsable}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              c.estado === "publicado"
                                ? "default"
                                : c.estado === "borrador"
                                ? "outline"
                                : "secondary"
                            }
                          >
                            {c.estado === "publicado"
                              ? "Publicado"
                              : c.estado === "borrador"
                              ? "Borrador"
                              : "Archivado"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                router.push(
                                  `/administracion/comunicados/${c.id}`
                                )
                              }
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {/* Estadísticas */}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                router.push(
                                  `/administracion/comunicados/detalles/${c.id}`
                                )
                              }
                            >
                              <StatsIcon className="h-4 w-4" />
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

            {/* Modal de confirmación de eliminación */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirmar eliminación</DialogTitle>
                  <DialogDescription>
                    ¿Está seguro de que desea eliminar este comunicado? Esta
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
                    onClick={confirmDeleteComunicado}
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
