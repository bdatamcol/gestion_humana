'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase";
// AdminSidebar removido - ya está en el layout
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Alert } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Search, X, FileDown } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton";

type SolicitudPermiso = {
  id: string;
  usuario_id: string;
  tipo_permiso: string;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  fecha_solicitud: string | null;
  estado: string;
  fecha_resolucion: string | null;
  pdf_url: string | null;
  hora_inicio: string | null;
  hora_fin: string | null;
  ciudad: string | null;
  motivo: string | null;
  compensacion: boolean | null;
  usuario?: {
    colaborador: string;
    cedula: string;
  };
};

type PermisoRow = Omit<SolicitudPermiso, "usuario">;

export default function AdminPermisosHistorico() {
  const router = useRouter();
  const [solicitudes, setSolicitudes] = useState<SolicitudPermiso[]>([]);
  const [filteredSolicitudes, setFilteredSolicitudes] = useState<SolicitudPermiso[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEstado, setSelectedEstado] = useState("all");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError("");
      try {
        const supabase = createSupabaseClient();

        const solicitudesPromise = supabase
          .from("solicitudes_permisos")
          .select(`
            id,
            usuario_id,
            tipo_permiso,
            fecha_inicio,
            fecha_fin,
            fecha_solicitud,
            estado,
            fecha_resolucion,
            pdf_url,
            hora_inicio,
            hora_fin,
            ciudad,
            motivo,
            compensacion
          `)
          .order("fecha_solicitud", { ascending: false });

        const [{ data: solData, error: solError }] = await Promise.all([solicitudesPromise]);
        if (solError) throw solError;
        if (!solData) {
          setSolicitudes([]);
          setFilteredSolicitudes([]);
          return;
        }

        const userIds = Array.from(new Set(solData.map((s: any) => s.usuario_id)));
        const usersPromise = supabase
          .from("usuario_nomina")
          .select("auth_user_id, colaborador, cedula")
          .in("auth_user_id", userIds);

        const [{ data: usersData, error: usersError }] = await Promise.all([usersPromise]);
        if (usersError) throw usersError;

        const combined: SolicitudPermiso[] = solData.map((s: any) => {
          const u = usersData?.find((u: any) => u.auth_user_id === s.usuario_id);
          return {
            ...s,
            usuario: u
              ? { colaborador: u.colaborador, cedula: u.cedula }
              : undefined,
          };
        });

        setSolicitudes(combined);
        setFilteredSolicitudes(combined);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Error al cargar el histórico");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    let result = solicitudes;
    if (searchTerm) {
      const lc = searchTerm.toLowerCase();
      result = result.filter(
        (s) =>
          s.usuario?.colaborador.toLowerCase().includes(lc) ||
          s.usuario?.cedula.includes(lc)
      );
    }
    if (selectedEstado !== "all") {
      result = result.filter((s) => s.estado === selectedEstado);
    }
    setFilteredSolicitudes(result);
  }, [searchTerm, selectedEstado, solicitudes]);

  const formatDate = (d: string | null) =>
    d
      ? new Date(d).toLocaleDateString("es-CO", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
      : "N/A";

  const humanType = (t: string) => {
    switch (t) {
      case "no_remunerado":
        return "No remunerado";
      case "remunerado":
        return "Remunerado";
      case "actividad_interna":
        return "Actividad interna";
      default:
        return t;
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedEstado("all");
  };

  return (
    <div className="min-h-screen">
      <div className="flex flex-col flex-1">
        <main className="flex-1 py-6">
          <div className="w-full mx-auto space-y-6">
            {/* Título */}
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold">
                  Histórico - Solicitudes de Permisos
                </h1>
                <p className="text-muted-foreground">
                  Consulta y filtra el historial de permisos laborales.
                </p>
              </div>
              <Button variant="outline"
                onClick={() =>
                  router.push("/administracion/solicitudes/permisos")
                }
              >
                Volver a Permisos
              </Button>
            </div>

            {/* Filtros */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-wrap gap-4 items-end">
                  {/* Buscar */}
                  <div className="flex-1 min-w-[220px]">
                    <Label htmlFor="search" className="mb-1 block text-sm">
                      Buscar
                    </Label>
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                      <Input
                        id="search"
                        placeholder="Por nombre o cédula..."
                        className="pl-8 h-9"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                      {searchTerm && (
                        <button
                          onClick={() => setSearchTerm("")}
                          className="absolute right-2 top-1/2 -translate-y-1/2"
                          aria-label="Limpiar búsqueda"
                        >
                          <X className="h-4 w-4 text-gray-500" />
                        </button>
                      )}
                    </div>
                  </div>
                  {/* Estado */}
                  <div className="min-w-[150px]">
                    <Label htmlFor="estado" className="mb-1 block text-sm">
                      Estado
                    </Label>
                    <Select
                      name="estado"
                      value={selectedEstado}
                      onValueChange={setSelectedEstado}
                    >
                      <SelectTrigger className="h-9 w-full">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="pendiente">Pendiente</SelectItem>
                        <SelectItem value="aprobado">Aprobado</SelectItem>
                        <SelectItem value="rechazado">Rechazado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {/* Limpiar */}
                  <button
                    className="h-9 px-4 border rounded"
                    onClick={clearFilters}
                  >
                    Limpiar
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* Tabla */}
            <Card>
              <CardContent className="p-0">
                {error && (
                  <Alert variant="destructive" className="mb-4">
                    {error}
                  </Alert>
                )}

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Colaborador</TableHead>
                        <TableHead>Cédula</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Ciudad</TableHead>
                        <TableHead>Motivo</TableHead>
                        <TableHead>Fecha y Hora Inicio</TableHead>
                        <TableHead>Fecha y Hora Fin</TableHead>
                        <TableHead>Compensación</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">
                          Acciones
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        Array.from({ length: 5 }).map((_, index) => (
                          <TableRow key={index}>
                            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                            <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                            <TableCell className="text-right"><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                          </TableRow>
                        ))
                      ) : filteredSolicitudes.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={10} className="text-center py-6">
                            No se encontraron solicitudes.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredSolicitudes.map((s) => (
                          <TableRow key={s.id}>
                            <TableCell>
                              {s.usuario?.colaborador ?? s.usuario_id}
                            </TableCell>
                            <TableCell>
                              {s.usuario?.cedula ?? "-"}
                            </TableCell>
                            <TableCell>
                              {humanType(s.tipo_permiso)}
                            </TableCell>
                            <TableCell>
                              {s.ciudad ?? "-"}
                            </TableCell>
                            <TableCell>
                              {s.motivo ?? "-"}
                            </TableCell>
                            <TableCell>
                              <div>
                                <div>{formatDate(s.fecha_inicio)}</div>
                                <div className="text-sm text-gray-500">{s.hora_inicio || 'No especificada'}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <div>{formatDate(s.fecha_fin)}</div>
                                <div className="text-sm text-gray-500">{s.hora_fin || 'No especificada'}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {s.compensacion ? "Sí" : "No"}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  s.estado === "aprobado"
                                    ? "secondary"
                                    : s.estado === "rechazado"
                                    ? "destructive"
                                    : "default"
                                }
                              >
                                {s.estado}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {s.pdf_url ? (
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    window.open(s.pdf_url!, "_blank")
                                  }
                                >
                                  <FileDown className="h-4 w-4 mr-1" /> Ver PDF
                                </Button>
                              ) : (
                                <span className="text-xs text-gray-500">
                                  Sin PDF
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
