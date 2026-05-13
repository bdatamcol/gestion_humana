"use client";

import { useEffect, useState } from "react";
import { createSupabaseClient } from "@/lib/supabase";
import { Feed360Client } from "@/components/feed360/Feed360Client";
import { Skeleton } from "@/components/ui/skeleton";

interface Tematica {
  id: string;
  titulo: string;
  descripcion: string | null;
  fecha_inicio: string;
  fecha_fin: string;
  estado: string;
}

export default function PerfilFeed360PublicacionesPage() {
  const [usuarioId, setUsuarioId] = useState<number | null>(null);
  const [tematicaActiva, setTematicaActiva] = useState<Tematica | null>(null);
  const [loading, setLoading] = useState(true);

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

      const now = new Date().toISOString();
      const { data: tematica } = await supabase
        .from("tematicas_feed360")
        .select("*")
        .eq("estado", "abierta")
        .lte("fecha_inicio", now)
        .gte("fecha_fin", now)
        .order("fecha_inicio", { ascending: false })
        .limit(1)
        .maybeSingle();

      setTematicaActiva(tematica || null);
      setLoading(false);
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!usuarioId) {
    return <div className="text-sm text-muted-foreground">No se pudo cargar el usuario.</div>;
  }

  return (
    <Feed360Client
      usuarioId={usuarioId}
      tematicaActiva={tematicaActiva}
      publishBasePath="/perfil/feed360"
    />
  );
}
