"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ClipboardCheck, Clock3, FilePlus2, Search } from "lucide-react";
import { authFetch } from "@/lib/authenticated-fetch";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const labels: Record<string, string> = {
  borrador: "Borrador",
  pendiente_recepcion: "Pendiente de recepción",
  completada: "Completada",
  aceptada_con_novedades: "Aceptada con novedades",
  rechazada: "Rechazada",
  anulada: "Anulada",
};
const badgeClass: Record<string, string> = {
  borrador: "bg-stone-100 text-stone-700",
  pendiente_recepcion: "bg-amber-100 text-amber-800",
  completada: "bg-emerald-100 text-emerald-800",
  aceptada_con_novedades: "bg-orange-100 text-orange-800",
  rechazada: "bg-red-100 text-red-800",
  anulada: "bg-slate-100 text-slate-600",
};

export function ActasList({ admin = false }: { admin?: boolean }) {
  const router = useRouter();
  const { userId } = useAuth();
  const [actas, setActas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("todas");

  useEffect(() => {
    authFetch(`/api/actas-entrega${admin ? "?scope=todas" : ""}`)
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "No fue posible cargar las actas");
        setActas(body);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [admin]);

  const filtered = useMemo(() => actas.filter((acta) => {
    const term = search.toLowerCase();
    const matchesSearch = [acta.numero_acta, acta.entregante_nombre, acta.receptor_nombre, acta.empresa_nombre]
      .some((value) => String(value || "").toLowerCase().includes(term));
    const matchesFilter = filter === "todas"
      || (filter === "por_recibir" && acta.receptor_id === userId && acta.estado === "pendiente_recepcion")
      || (filter === "entregadas" && acta.entregante_id === userId)
      || (filter === "recibidas" && acta.receptor_id === userId)
      || acta.estado === filter;
    return matchesSearch && matchesFilter;
  }), [actas, filter, search, userId]);

  const detailBase = admin ? "/administracion/actas-entrega" : "/perfil/actas-entrega";
  return (
    <div className="relative z-10 mx-auto max-w-7xl space-y-6 p-4 md:p-8">
      <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white/80 p-5 shadow-sm backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between md:p-6">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Gestión documental</p>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Actas de entrega</h1>
          <p className="mt-1 text-sm text-muted-foreground">Registra, revisa y conserva la evidencia de cada entrega de puesto de trabajo.</p>
        </div>
        <Button asChild><Link href="/perfil/actas-entrega/nueva"><FilePlus2 className="mr-2 h-4 w-4" />Nueva acta</Link></Button>
      </div>

      <Card className="border-0 shadow-lg">
        <CardHeader className="gap-4 md:flex-row md:items-center md:justify-between">
          <CardTitle className="flex items-center gap-2"><ClipboardCheck className="h-5 w-5 text-[#6b2b16]" />{admin ? "Todas las actas" : "Mis actas"}</CardTitle>
          <div className="relative w-full md:w-80"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar número, usuario o empresa" className="pl-9" /></div>
        </CardHeader>
        <CardContent>
          <div className="mb-5 flex flex-wrap gap-2">
            {(admin ? [["todas", "Todas"], ["pendiente_recepcion", "Pendientes"], ["completada", "Completadas"], ["aceptada_con_novedades", "Con novedades"], ["rechazada", "Rechazadas"]] : [["todas", "Todas"], ["por_recibir", "Por recibir"], ["entregadas", "Entregadas por mí"], ["recibidas", "Recibidas por mí"]]).map(([value, label]) => (
              <Button key={value} size="sm" variant={filter === value ? "default" : "outline"} className={filter === value ? "bg-[#441404] hover:bg-[#5c1d0a]" : ""} onClick={() => setFilter(value)}>{label}</Button>
            ))}
          </div>
          {loading ? <div className="py-14 text-center text-muted-foreground">Cargando actas...</div> : error ? <div className="rounded-lg bg-red-50 p-4 text-red-700">{error}</div> : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader><TableRow><TableHead>Acta</TableHead><TableHead>Entrega</TableHead><TableHead>Recibe</TableHead><TableHead>Ítems</TableHead><TableHead>Estado</TableHead><TableHead>Fecha</TableHead></TableRow></TableHeader>
                <TableBody>
                  {filtered.map((acta) => <TableRow
                    key={acta.id}
                    role="link"
                    tabIndex={0}
                    aria-label={`Ver detalle del acta ${acta.numero_acta}`}
                    className="cursor-pointer transition-colors hover:bg-gray-50 focus-visible:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
                    onClick={() => router.push(`${detailBase}/${acta.id}`)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        router.push(`${detailBase}/${acta.id}`);
                      }
                    }}
                  >
                    <TableCell><span className="font-semibold text-[#5c1d0a]">{acta.numero_acta}</span><div className="text-xs text-muted-foreground">{acta.empresa_nombre}</div></TableCell>
                    <TableCell>{acta.entregante_nombre}</TableCell><TableCell>{acta.receptor_nombre}</TableCell>
                    <TableCell>{acta.actas_entrega_items?.[0]?.count || 0}</TableCell>
                    <TableCell><Badge className={badgeClass[acta.estado]}>{labels[acta.estado] || acta.estado}</Badge></TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{new Date(acta.created_at).toLocaleDateString("es-CO")}</TableCell>
                  </TableRow>)}
                  {!filtered.length && <TableRow><TableCell colSpan={6} className="h-32 text-center text-muted-foreground"><Clock3 className="mx-auto mb-2 h-6 w-6" />No hay actas para este filtro.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
