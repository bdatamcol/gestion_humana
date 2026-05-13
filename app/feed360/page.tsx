"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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

export default function Feed360Page() {
  const router = useRouter();
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
        router.push("/login");
        return;
      }

      const { data: userNomina } = await supabase
        .from('usuario_nomina')
        .select('id')
        .eq('auth_user_id', session.user.id)
        .single();

      if (!userNomina?.id) {
        router.push('/perfil/bienvenido');
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
        .single();

      setTematicaActiva(tematica);
      setLoading(false);
    };

    loadData();
  }, [router]);

  if (loading) {
    return (
      <div className="space-y-4 p-8">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!usuarioId) return null;

  return <Feed360Client usuarioId={usuarioId} tematicaActiva={tematicaActiva} />;
}
