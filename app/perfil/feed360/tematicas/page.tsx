"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { createSupabaseClient } from "@/lib/supabase";

interface Tematica {
  id: string;
  titulo: string;
  descripcion: string | null;
  fecha_inicio: string;
  fecha_fin: string;
  estado: "abierta" | "cerrada" | "eliminada";
}

export default function PerfilFeed360TematicasPage() {
  const [loading, setLoading] = useState(true);
  const [usuarioId, setUsuarioId] = useState<number | null>(null);
  const [tematicas, setTematicas] = useState<Tematica[]>([]);
  const [publicadasIds, setPublicadasIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const loadData = async () => {
      const supabase = createSupabaseClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setLoading(false);
        return;
      }

      const { data: userNomina } = await supabase
        .from("usuario_nomina")
        .select("id")
        .eq("auth_user_id", session.user.id)
        .single();

      if (!userNomina?.id) {
        setLoading(false);
        return;
      }

      setUsuarioId(userNomina.id);

      const [tematicasRes, publicacionesRes] = await Promise.all([
        fetch("/api/feed360/tematicas"),
        supabase
          .from("publicaciones_feed360")
          .select("tematica_id")
          .eq("usuario_id", userNomina.id),
      ]);

      if (tematicasRes.ok) {
        const tematicasData = await tematicasRes.json();
        setTematicas(tematicasData);
      }

      if (publicacionesRes.data) {
        setPublicadasIds(new Set(publicacionesRes.data.map((p) => p.tematica_id)));
      }

      setLoading(false);
    };

    loadData();
  }, []);

  const now = useMemo(() => new Date(), []);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Temáticas Feed360</h1>
        <p className="text-muted-foreground">Publica en la temática activa cuando esté habilitada.</p>
      </div>

      <div className="grid gap-4">
        {tematicas.length === 0 && (
          <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
            No hay temáticas disponibles.
          </div>
        )}

        {tematicas.map((tematica) => {
          const isOpen = tematica.estado === "abierta";
          const inWindow = new Date(tematica.fecha_inicio) <= now && now <= new Date(tematica.fecha_fin);
          const canPublish = isOpen && inWindow && usuarioId && !publicadasIds.has(tematica.id);

          return (
            <div key={tematica.id} className="rounded-lg border bg-card p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold">{tematica.titulo}</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {tematica.descripcion || "Sin descripción"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {format(new Date(tematica.fecha_inicio), "dd MMM yyyy, HH:mm", { locale: es })}
                    {" - "}
                    {format(new Date(tematica.fecha_fin), "dd MMM yyyy, HH:mm", { locale: es })}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {canPublish ? (
                    <Button asChild>
                      <a href={`/perfil/feed360/${tematica.id}`}>Publicar</a>
                    </Button>
                  ) : publicadasIds.has(tematica.id) ? (
                    <span className="text-xs px-2 py-1 rounded bg-emerald-100 text-emerald-700">Ya publicaste</span>
                  ) : !isOpen ? (
                    <span className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-700">Cerrada</span>
                  ) : (
                    <span className="text-xs px-2 py-1 rounded bg-amber-100 text-amber-700">Fuera de fecha</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
