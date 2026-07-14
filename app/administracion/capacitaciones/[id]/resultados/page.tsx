"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
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
import { ArrowLeft, Users, Search, CheckCircle2, XCircle, Clock, AlertCircle, Download } from "lucide-react";
import { authFetch } from "@/lib/authenticated-fetch";
import * as XLSX from "xlsx";
import { toast } from "sonner";

interface Resumen {
  total: number;
  realizados: number;
  no_realizados: number;
  aprobados: number;
  reprobados: number;
  nota_aprobacion: number;
}

interface UsuarioResultado {
  usuario_id: string;
  colaborador: string;
  cedula: string | null;
  cargo: string | null;
  empresa: string | null;
  estado: string;
  leccion_completadas: number;
  total_lecciones: number;
  intentos_realizados: number;
  max_intentos: number;
  calificacion: number | null;
  fecha_intento: string | null;
}

export default function ResultadosPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const cursoId = params?.id;

  const [loading, setLoading] = useState(true);
  const [curso, setCurso] = useState<any>(null);
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [usuarios, setUsuarios] = useState<UsuarioResultado[]>([]);
  const [filtered, setFiltered] = useState<UsuarioResultado[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [estadoFilter, setEstadoFilter] = useState<string>("all");
  const [empresaFilter, setEmpresaFilter] = useState<string>("all");
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Lista única de empresas presentes en los datos, para alimentar el filtro.
  const empresasDisponibles = useMemo(() => {
    const set = new Set<string>();
    for (const u of usuarios) {
      if (u.empresa && u.empresa.trim().length > 0) set.add(u.empresa);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "es"));
  }, [usuarios]);

  useEffect(() => {
    if (!cursoId) return;
    (async () => {
      try {
        const res = await authFetch(`/api/capacitaciones/${cursoId}/resultados`);
        if (!res.ok) throw new Error("Error al cargar");
        const data = await res.json();
        setCurso(data.curso);
        setResumen(data.resumen);
        setUsuarios(data.usuarios || []);
        setFiltered(data.usuarios || []);
      } catch (e: any) {
        setError(e?.message || "Error");
      } finally {
        setLoading(false);
      }
    })();
  }, [cursoId]);

  useEffect(() => {
    let list = usuarios;
    if (searchTerm) {
      const low = searchTerm.toLowerCase();
      list = list.filter(
        (u) =>
          (u.colaborador || "").toLowerCase().includes(low) ||
          (u.cedula || "").toLowerCase().includes(low) ||
          (u.cargo || "").toLowerCase().includes(low)
      );
    }
    if (estadoFilter !== "all") {
      list = list.filter((u) => u.estado === estadoFilter);
    }
    if (empresaFilter !== "all") {
      list = list.filter((u) => (u.empresa || "") === empresaFilter);
    }
    setFiltered(list);
  }, [searchTerm, estadoFilter, empresaFilter, usuarios]);

  // Si la empresa seleccionada deja de existir (p. ej. tras recargar datos),
  // reseteamos el filtro a "all" para no dejar la tabla vacía por inconsistencia.
  useEffect(() => {
    if (
      empresaFilter !== "all" &&
      empresasDisponibles.length > 0 &&
      !empresasDisponibles.includes(empresaFilter)
    ) {
      setEmpresaFilter("all");
    }
  }, [empresaFilter, empresasDisponibles]);

  const handleSearch = (v: string) => {
    setSearchTerm(v);
  };

  const formatDate = (s: string | null) => {
    if (!s) return "—";
    return new Date(s).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  const handleExport = () => {
    try {
      if (filtered.length === 0) {
        toast.error("No hay datos para exportar con los filtros actuales.");
        return;
      }
      const rows = filtered.map((u) => ({
        "Nombre de usuario": u.colaborador || "",
        "Cédula": u.cedula || "",
        "Cargo": u.cargo || "",
        "Empresa": u.empresa || "",
        "Estado": u.estado,
        "Intentos": u.intentos_realizados > 0
          ? `${u.intentos_realizados}/${u.max_intentos}`
          : "0/" + (u.max_intentos || 1),
        "Calificación": u.calificacion != null ? Number(u.calificacion).toFixed(2) : "",
        "Fecha": u.fecha_intento ? new Date(u.fecha_intento) : null,
      }));
      const ws = XLSX.utils.json_to_sheet(rows, {
        header: [
          "Nombre de usuario",
          "Cédula",
          "Cargo",
          "Empresa",
          "Estado",
          "Intentos",
          "Calificación",
          "Fecha",
        ],
      });
      // Dar formato de fecha a la columna Fecha para que Excel la reconozca.
      const ref = XLSX.utils.decode_range(ws["!ref"] || "A1");
      for (let r = ref.s.r + 1; r <= ref.e.r; r++) {
        const cellRef = XLSX.utils.encode_cell({ r, c: 7 });
        if (ws[cellRef] && ws[cellRef].v instanceof Date) {
          ws[cellRef].t = "d";
          ws[cellRef].z = "dd/mm/yyyy";
        }
      }
      // Ancho de columnas aproximado.
      ws["!cols"] = [
        { wch: 32 }, // Nombre
        { wch: 14 }, // Cédula
        { wch: 24 }, // Cargo
        { wch: 22 }, // Empresa
        { wch: 22 }, // Estado
        { wch: 10 }, // Intentos
        { wch: 12 }, // Calificación
        { wch: 14 }, // Fecha
      ];
      const wb = XLSX.utils.book_new();
      const sheetName = (curso?.titulo || "Resultados")
        .toString()
        .replace(/[\\/?*[\]:]/g, "")
        .slice(0, 28);
      XLSX.utils.book_append_sheet(wb, ws, sheetName || "Resultados");

      const fecha = new Date().toISOString().split("T")[0];
      const filename = `resultados_${(curso?.titulo || "capacitacion")
        .toString()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 40)}_${fecha}.xlsx`;

      XLSX.writeFile(wb, filename);
      toast.success("Archivo exportado correctamente");
    } catch (err) {
      console.error(err);
      toast.error("Error al exportar los datos");
    }
  };

  const estadoBadge = (estado: string) => {
    switch (estado) {
      case "Aprobado":
        return <Badge className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" /> Aprobado</Badge>;
      case "Reprobado":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Reprobado</Badge>;
      case "Pendiente de examen":
        return <Badge className="bg-yellow-500"><Clock className="h-3 w-3 mr-1" /> Pendiente examen</Badge>;
      case "En curso":
        return <Badge variant="outline"><AlertCircle className="h-3 w-3 mr-1" /> En curso</Badge>;
      default:
        return <Badge variant="secondary">Sin iniciar</Badge>;
    }
  };

  return (
    <div className="py-6 flex min-h-screen">
      <div className="w-full mx-auto flex-1">
        <Card className="shadow-md">
          <CardHeader className="bg-primary/5 pb-6">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => router.push(`/administracion/capacitaciones/${cursoId}`)}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex-1">
                <CardTitle className="text-2xl font-bold flex items-center gap-2">
                  <Users className="h-6 w-6 text-primary" />
                  Resultados
                </CardTitle>
                {curso && <p className="text-sm text-muted-foreground mt-1">{curso.titulo}</p>}
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-64 w-full" />
              </div>
            ) : (
              <>
                {resumen && (
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <Stat label="Total usuarios" value={resumen.total} />
                    <Stat label="Realizaron examen" value={resumen.realizados} accent="blue" />
                    <Stat label="Pendientes" value={resumen.no_realizados} accent="yellow" />
                    <Stat label="Aprobados" value={resumen.aprobados} accent="green" />
                    <Stat label="Reprobados" value={resumen.reprobados} accent="red" />
                  </div>
                )}

                <div className="flex flex-col md:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                    <Input
                      type="search"
                      placeholder="Buscar por nombre, cédula o cargo..."
                      className="pl-8"
                      value={searchTerm}
                      onChange={(e) => handleSearch(e.target.value)}
                    />
                  </div>
                  <select
                    className="border rounded px-3 py-2"
                    value={estadoFilter}
                    onChange={(e) => setEstadoFilter(e.target.value)}
                  >
                    <option value="all">Todos los estados</option>
                    <option value="Sin iniciar">Sin iniciar</option>
                    <option value="En curso">En curso</option>
                    <option value="Pendiente de examen">Pendiente examen</option>
                    <option value="Aprobado">Aprobado</option>
                    <option value="Reprobado">Reprobado</option>
                    <option value="Reprobado (con reintentos)">Reprobado (con reintentos)</option>
                  </select>
                  <select
                    className="border rounded px-3 py-2"
                    value={empresaFilter}
                    onChange={(e) => setEmpresaFilter(e.target.value)}
                    disabled={empresasDisponibles.length === 0}
                    title={empresasDisponibles.length === 0 ? "No hay empresas con usuarios" : "Filtrar por empresa"}
                  >
                    <option value="all">Todas las empresas</option>
                    {empresasDisponibles.map((emp) => (
                      <option key={emp} value={emp}>
                        {emp}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleExport}
                    className="flex items-center gap-2"
                    title="Exportar la lista filtrada a Excel"
                  >
                    <Download className="h-4 w-4" />
                    Exportar datos
                  </Button>
                </div>

                {error && <div className="bg-red-50 text-red-700 px-4 py-2 rounded">{error}</div>}

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Usuario</TableHead>
                        <TableHead>Cédula</TableHead>
                        <TableHead>Cargo</TableHead>
                        <TableHead>Empresa</TableHead>
                        <TableHead>Progreso</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Intentos</TableHead>
                        <TableHead>Calificación</TableHead>
                        <TableHead>Fecha intento</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-6 text-gray-500">
                            No hay resultados
                          </TableCell>
                        </TableRow>
                      ) : (
                        filtered.map((u, idx) => (
                          <TableRow key={u.usuario_id ?? `row-${u.cedula ?? u.colaborador ?? idx}`}>
                            <TableCell className="font-medium">{u.colaborador}</TableCell>
                            <TableCell>{u.cedula || "—"}</TableCell>
                            <TableCell>{u.cargo || "—"}</TableCell>
                            <TableCell>{u.empresa || "—"}</TableCell>
                            <TableCell>
                              <span className="text-sm">
                                {u.leccion_completadas}/{u.total_lecciones} lecciones
                              </span>
                            </TableCell>
                            <TableCell>{estadoBadge(u.estado)}</TableCell>
                            <TableCell>
                              {u.intentos_realizados > 0 ? (
                                <span className="text-sm">
                                  {u.intentos_realizados}/{u.max_intentos}
                                </span>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {u.calificacion != null ? (
                                <span className="font-medium">{u.calificacion.toFixed(2)}</span>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </TableCell>
                            <TableCell>{formatDate(u.fecha_intento)}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: "blue" | "green" | "red" | "yellow" }) {
  const colors: Record<string, string> = {
    blue: "border-blue-200 bg-blue-50 text-blue-900",
    green: "border-green-200 bg-green-50 text-green-900",
    red: "border-red-200 bg-red-50 text-red-900",
    yellow: "border-yellow-200 bg-yellow-50 text-yellow-900",
  };
  return (
    <div className={`border rounded p-4 ${accent ? colors[accent] : "bg-white"}`}>
      <div className="text-xs uppercase tracking-wide opacity-70">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  );
}