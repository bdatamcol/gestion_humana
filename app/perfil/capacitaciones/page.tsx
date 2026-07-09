"use client";

import { useEffect, useRef, useState } from "react";
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
  ChevronDown,
  ChevronUp,
  GraduationCap,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
} from "lucide-react";

interface CursoUsuario {
  id: string;
  titulo: string;
  descripcion_corta: string;
  imagen_destacada_url: string | null;
  total_lecciones: number;
  lecciones_completadas: number;
  estado: "Sin iniciar" | "En curso" | "Pendiente de examen" | "Aprobado" | "Reprobado";
  calificacion: number | null;
  nota_aprobacion: number;
  fecha_intento: string | null;
  intentos_realizados: number;
}

export default function CapacitacionesUsuarioPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [cursos, setCursos] = useState<CursoUsuario[]>([]);
  const [filtered, setFiltered] = useState<CursoUsuario[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const supabase = createSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setError("No autenticado");
          setLoading(false);
          return;
        }

        // Cursos publicados
        const { data: cursosData, error: cErr } = await supabase
          .from("capacitaciones_cursos")
          .select("id, titulo, descripcion_corta, imagen_destacada_url, nota_aprobacion")
          .eq("estado", "publicado")
          .order("created_at", { ascending: false });
        if (cErr) throw cErr;

        const cursos = cursosData || [];
        if (cursos.length === 0) {
          setCursos([]);
          setFiltered([]);
          setLoading(false);
          return;
        }

        const cursoIds = cursos.map((c: any) => c.id);

        // Lecciones por curso
        const { data: leccionesData } = await supabase
          .from("capacitaciones_lecciones")
          .select("id, curso_id")
          .in("curso_id", cursoIds);
        const totalLeccionesPorCurso = new Map<string, number>();
        for (const l of leccionesData || []) {
          totalLeccionesPorCurso.set((l as any).curso_id, (totalLeccionesPorCurso.get((l as any).curso_id) || 0) + 1);
        }

        // Progreso del usuario
        const { data: progData } = await supabase
          .from("capacitaciones_progreso")
          .select("leccion_id")
          .eq("usuario_id", user.id);
        const leccionesCompletadasSet = new Set((progData || []).map((p: any) => p.leccion_id));

        // Intentos del usuario
        const { data: examenesData } = await supabase
          .from("capacitaciones_examenes")
          .select("id, curso_id")
          .in("curso_id", cursoIds);
        const examenPorCurso = new Map<string, string>();
        for (const e of examenesData || []) {
          examenPorCurso.set((e as any).curso_id, (e as any).id);
        }

        const examenIds = Array.from(examenPorCurso.values());
        let intentosData: any[] = [];
        if (examenIds.length > 0) {
          const { data } = await supabase
            .from("capacitaciones_intentos")
            .select("examen_id, calificacion, aprobado, fecha_intento, numero_intento")
            .eq("usuario_id", user.id)
            .in("examen_id", examenIds);
          intentosData = data || [];
        }
        // Agrupar intentos por examen y calcular la mejor calificación + el último intento.
        const mejorPorExamen = new Map<string, { calificacion: number; aprobado: boolean; fecha_intento: string | null; intentos: number; ultimoIntento: any }>();
        for (const i of intentosData) {
          const examId = (i as any).examen_id;
          const current = mejorPorExamen.get(examId);
          const calif = Number((i as any).calificacion) || 0;
          const fecha = (i as any).fecha_intento;
          if (!current) {
            mejorPorExamen.set(examId, {
              calificacion: calif,
              aprobado: (i as any).aprobado === true,
              fecha_intento: fecha,
              intentos: 1,
              ultimoIntento: i,
            });
          } else {
            current.intentos += 1;
            if (calif > current.calificacion) {
              current.calificacion = calif;
              current.aprobado = (i as any).aprobado === true;
            }
            if (!current.fecha_intento || (fecha && new Date(fecha) > new Date(current.fecha_intento))) {
              current.fecha_intento = fecha;
              current.ultimoIntento = i;
            }
          }
        }

        const lista: CursoUsuario[] = cursos.map((c: any) => {
          const total = totalLeccionesPorCurso.get(c.id) || 0;
          const leccCompletadas = (leccionesData || []).filter(
            (l: any) => l.curso_id === c.id && leccionesCompletadasSet.has(l.id)
          ).length;
          const examenId = examenPorCurso.get(c.id);
          const resumen = examenId ? mejorPorExamen.get(examenId) : null;
          const intento = resumen?.ultimoIntento || null;

          let estado: CursoUsuario["estado"] = "Sin iniciar";
          if (resumen && resumen.aprobado) {
            estado = "Aprobado";
          } else if (resumen) {
            estado = "Reprobado";
          } else if (leccCompletadas > 0) {
            estado = leccCompletadas >= total && total > 0 ? "Pendiente de examen" : "En curso";
          }

          return {
            id: c.id,
            titulo: c.titulo,
            descripcion_corta: c.descripcion_corta,
            imagen_destacada_url: c.imagen_destacada_url,
            total_lecciones: total,
            lecciones_completadas: leccCompletadas,
            estado,
            calificacion: resumen?.calificacion ?? null,
            nota_aprobacion: c.nota_aprobacion,
            fecha_intento: resumen?.fecha_intento ?? null,
            intentos_realizados: resumen?.intentos ?? 0,
          };
        });

        setCursos(lista);
        setFiltered(lista);
      } catch (e: any) {
        setError(e?.message || "Error al cargar");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!sortConfig) return;
    const sorted = [...filtered].sort((a, b) => {
      let aVal: any = (a as any)[sortConfig.key];
      let bVal: any = (b as any)[sortConfig.key];
      if (aVal == null) aVal = "";
      if (bVal == null) bVal = "";
      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
    setFiltered(sorted);
  }, [sortConfig]);

  const handleSearch = (v: string) => {
    setSearchTerm(v);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      const low = v.toLowerCase();
      setFiltered(
        cursos.filter(
          (c) => c.titulo.toLowerCase().includes(low) || c.descripcion_corta.toLowerCase().includes(low)
        )
      );
    }, 300);
  };

  const requestSort = (key: string) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig?.key === key && sortConfig.direction === "asc") direction = "desc";
    setSortConfig({ key, direction });
  };

  const sortIcon = (key: string) => {
    if (sortConfig?.key !== key) return null;
    return sortConfig.direction === "asc" ? <ChevronUp className="inline h-4 w-4 ml-1" /> : <ChevronDown className="inline h-4 w-4 ml-1" />;
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
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <GraduationCap className="h-6 w-6 text-primary" />
              Mis Capacitaciones
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Aquí encontrarás los cursos de capacitación disponibles para ti.
            </p>
          </CardHeader>

          <CardContent className="p-6 space-y-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                type="search"
                placeholder="Buscar capacitaciones..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>

            {error && <div className="bg-red-50 text-red-700 px-4 py-2 rounded">{error}</div>}

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <div className="cursor-pointer" onClick={() => requestSort("titulo")}>
                        Nombre {sortIcon("titulo")}
                      </div>
                    </TableHead>
                    <TableHead>Descripción corta</TableHead>
                    <TableHead className="w-[140px]">Calificación obtenida</TableHead>
                    <TableHead className="w-[180px]">Estado</TableHead>
                    <TableHead className="w-[120px] text-right">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-64" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-28 rounded-full" /></TableCell>
                        <TableCell><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                      </TableRow>
                    ))
                  ) : filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                        No hay capacitaciones disponibles
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((c) => (
                      <TableRow
                        key={c.id}
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => router.push(`/perfil/capacitaciones/${c.id}`)}
                      >
                        <TableCell className="font-medium">{c.titulo}</TableCell>
                        <TableCell className="max-w-[320px] truncate" title={c.descripcion_corta}>
                          {c.descripcion_corta}
                        </TableCell>
                        <TableCell>
                          {c.calificacion != null ? (
                            <span className="font-medium">{c.calificacion.toFixed(2)}</span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </TableCell>
                        <TableCell>{estadoBadge(c.estado)}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); router.push(`/perfil/capacitaciones/${c.id}`); }}>
                            <Play className="h-3 w-3 mr-1" /> Iniciar
                          </Button>
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
    </div>
  );
}