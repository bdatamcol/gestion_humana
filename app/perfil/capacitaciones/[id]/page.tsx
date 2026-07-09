"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  GraduationCap,
  ArrowRight,
  ArrowLeft as ArrowLeftIcon,
  CheckCircle2,
  XCircle,
  Circle,
  ClipboardList,
  FileText,
  Image as ImageIcon,
  Video,
  Type,
  Download,
  Play,
} from "lucide-react";
import { authFetch } from "@/lib/authenticated-fetch";

type Recurso = {
  id: string;
  tipo: "texto" | "video" | "imagen" | "documento";
  titulo: string | null;
  contenido_texto: string | null;
  video_url: string | null;
  archivo_url: string | null;
};

type Leccion = {
  id: string;
  titulo: string;
  descripcion: string | null;
  orden: number;
  recursos: Recurso[];
};

type Pregunta = {
  id: string;
  enunciado: string;
  tipo: "seleccion_unica" | "seleccion_multiple" | "verdadero_falso";
  opciones: Array<{ id: string; texto: string }>;
};

type IntentoResumen = {
  id: string;
  calificacion: number;
  aprobado: boolean;
  fecha_intento: string;
  numero_intento: number;
};

type CursoData = {
  id: string;
  titulo: string;
  descripcion_corta: string;
  descripcion_completa: string | null;
  imagen_destacada_url: string | null;
  nota_aprobacion: number;
  permite_reintentos: boolean;
  max_intentos: number;
  lecciones: Leccion[];
  examen: { id: string; preguntas: Pregunta[] } | null;
};

const recursoIcon = (t: string) => {
  switch (t) {
    case "texto": return <Type className="h-4 w-4" />;
    case "video": return <Video className="h-4 w-4" />;
    case "imagen": return <ImageIcon className="h-4 w-4" />;
    default: return <FileText className="h-4 w-4" />;
  }
};

function renderVideo(url: string) {
  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/);
  if (ytMatch) {
    return (
      <iframe
        src={`https://www.youtube.com/embed/${ytMatch[1]}`}
        className="w-full aspect-video rounded border"
        allowFullScreen
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      />
    );
  }
  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    return (
      <iframe
        src={`https://player.vimeo.com/video/${vimeoMatch[1]}`}
        className="w-full aspect-video rounded border"
        allowFullScreen
        allow="autoplay; fullscreen; picture-in-picture"
      />
    );
  }
  // MP4 u otro
  return (
    <video controls className="w-full rounded border">
      <source src={url} />
      Tu navegador no soporta la reproducción de video.
    </video>
  );
}

export default function ReproductorCursoPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const cursoId = params?.id;
  const [loading, setLoading] = useState(true);
  const [curso, setCurso] = useState<CursoData | null>(null);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [intentos, setIntentos] = useState<IntentoResumen[]>([]);
  const [leccionesCompletadas, setLeccionesCompletadas] = useState<Set<string>>(new Set());
  const [currentIdx, setCurrentIdx] = useState(0);
  const currentLeccionId = curso?.lecciones?.[currentIdx]?.id;
  const [error, setError] = useState<string | null>(null);
  const [savingProgress, setSavingProgress] = useState(false);

  const fetchData = useCallback(async () => {
    if (!cursoId) return;
    setLoading(true);
    try {
      const supabase = createSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error("No autenticado");
      const user = session.user;
      setAuthUserId(user.id);

      const { data: cursoData, error: cErr } = await supabase
        .from("capacitaciones_cursos")
        .select("*")
        .eq("id", cursoId)
        .eq("estado", "publicado")
        .single();

      if (cErr || !cursoData) throw new Error("Curso no encontrado o no disponible");

      const { data: leccionesData } = await supabase
        .from("capacitaciones_lecciones")
        .select("id, titulo, descripcion, orden, capacitaciones_recursos(*)")
        .eq("curso_id", cursoId)
        .order("orden", { ascending: true });

      const lecciones: Leccion[] = (leccionesData || []).map((l: any) => ({
        ...l,
        recursos: (l.capacitaciones_recursos || []).sort((a: any, b: any) => a.orden - b.orden),
      }));

      const { data: examenData } = await supabase
        .from("capacitaciones_examenes")
        .select("id, capacitaciones_preguntas(id, enunciado, tipo, orden, capacitaciones_opciones(id, texto, orden))")
        .eq("curso_id", cursoId)
        .maybeSingle();

      const examen = examenData
        ? {
            id: (examenData as any).id,
            preguntas: ((examenData as any).capacitaciones_preguntas || [])
              .sort((a: any, b: any) => a.orden - b.orden)
              .map((p: any) => ({
                id: p.id,
                enunciado: p.enunciado,
                tipo: p.tipo,
                opciones: (p.capacitaciones_opciones || []).sort((a: any, b: any) => a.orden - b.orden),
              })),
          }
        : null;

      // Progreso
      const { data: progData } = await supabase
        .from("capacitaciones_progreso")
        .select("leccion_id")
        .eq("usuario_id", user.id);
      const set = new Set((progData || []).map((p: any) => p.leccion_id));
      setLeccionesCompletadas(set);

      // Todos los intentos del usuario para este examen (ordenados por número)
      let intentosList: IntentoResumen[] = [];
      if (examen) {
        const { data: intentosData } = await supabase
          .from("capacitaciones_intentos")
          .select("id, calificacion, aprobado, fecha_intento, numero_intento")
          .eq("usuario_id", user.id)
          .eq("examen_id", examen.id)
          .order("numero_intento", { ascending: true });
        intentosList = (intentosData || []).map((i: any) => ({
          id: i.id,
          calificacion: Number(i.calificacion),
          aprobado: !!i.aprobado,
          fecha_intento: i.fecha_intento,
          numero_intento: Number(i.numero_intento) || 1,
        }));
        setIntentos(intentosList);
      } else {
        setIntentos([]);
      }

      const cursoNormalizado: CursoData = {
        ...(cursoData as any),
        lecciones,
        examen,
        // Defaults defensivos por si la migración 049 no se ha ejecutado aún.
        permite_reintentos: (cursoData as any).permite_reintentos === true,
        max_intentos: Number((cursoData as any).max_intentos) || 1,
      };
      setCurso(cursoNormalizado);
    } catch (e: any) {
      setError(e?.message || "Error");
    } finally {
      setLoading(false);
    }
  }, [cursoId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const marcarCompletada = async (leccionId: string) => {
    if (!authUserId) return;
    if (leccionesCompletadas.has(leccionId)) return;
    setSavingProgress(true);
    try {
      const res = await authFetch("/api/capacitaciones/progreso", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leccion_id: leccionId }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "Error");
      }
      setLeccionesCompletadas((prev) => new Set(prev).add(leccionId));
    } catch (e: any) {
      setError(e?.message || "Error al guardar progreso");
    } finally {
      setSavingProgress(false);
    }
  };

  // Marcar como completada SOLO cuando cambia la lección actual.
  // Antes se llamaba en el cuerpo del componente, lo que disparaba
  // múltiples POST en cada re-render y provocaba un "Application error".
  useEffect(() => {
    if (currentLeccionId) {
      marcarCompletada(currentLeccionId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLeccionId]);

  if (loading) {
    return (
      <div className="py-6">
        <Card><CardContent className="p-6 space-y-3"><Skeleton className="h-32 w-full" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-3/4" /></CardContent></Card>
      </div>
    );
  }

  if (error || !curso) {
    return (
      <div className="py-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-red-600">{error || "Curso no encontrado"}</p>
            <Button variant="outline" onClick={() => router.push("/perfil/capacitaciones")} className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-1" /> Volver a capacitaciones
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalLecciones = curso.lecciones.length;
  const completadas = curso.lecciones.filter((l) => leccionesCompletadas.has(l.id)).length;
  const progreso = totalLecciones > 0 ? Math.round((completadas / totalLecciones) * 100) : 0;
  const currentLeccion = curso.lecciones[currentIdx];
  const todasCompletadas = totalLecciones > 0 && completadas === totalLecciones;

  // Derivados de intentos
  const mejorIntento = intentos.reduce<IntentoResumen | null>(
    (best, i) => (!best || i.calificacion > best.calificacion ? i : best),
    null
  );
  const yaAprobo = mejorIntento ? mejorIntento.aprobado : false;
  const intentosHechos = intentos.length;
  const maxIntentos = curso.max_intentos || 1;
  const permiteReintentos = curso.permite_reintentos === true && maxIntentos > 1;
  const intentosRestantes = Math.max(0, maxIntentos - intentosHechos);
  const puedeIniciarExamen =
    todasCompletadas && !!curso.examen && !yaAprobo && intentosRestantes > 0;
  const agotoIntentos = !yaAprobo && intentosHechos >= maxIntentos && maxIntentos > 0;

  return (
    <div className="py-6 space-y-6">
      {/* Header */}
      <Card className="shadow-md">
        <div className="relative h-40 md:h-56 bg-gray-200 overflow-hidden rounded-t-lg">
          {curso.imagen_destacada_url ? (
            <img src={curso.imagen_destacada_url} alt={curso.titulo} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
              <GraduationCap className="h-16 w-16 text-primary/50" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
            <Button variant="ghost" size="sm" onClick={() => router.push("/perfil/capacitaciones")} className="text-white hover:bg-white/20 mb-2">
              <ArrowLeft className="h-4 w-4 mr-1" /> Capacitaciones
            </Button>
            <h1 className="text-2xl md:text-3xl font-bold">{curso.titulo}</h1>
            <p className="text-sm opacity-90 mt-1">{curso.descripcion_corta}</p>
          </div>
        </div>

        <CardContent className="p-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Progreso del curso</span>
            <span className="text-muted-foreground">{completadas} de {totalLecciones} lecciones ({progreso}%)</span>
          </div>
          <Progress value={progreso} />

          {mejorIntento && (
            <div className={`mt-3 p-3 rounded text-sm ${yaAprobo ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
              {yaAprobo ? (
                <p>
                  <CheckCircle2 className="inline h-4 w-4 mr-1" /> Aprobaste este curso con una
                  calificación de <strong>{mejorIntento.calificacion.toFixed(2)}</strong>.
                  {intentos.length > 1 && (
                    <span className="ml-1 text-xs opacity-80">({intentos.length} intentos)</span>
                  )}
                </p>
              ) : agotoIntentos ? (
                <p>
                  <XCircle className="inline h-4 w-4 mr-1" /> Tu calificación final fue{" "}
                  <strong>{mejorIntento.calificacion.toFixed(2)}</strong>. Has agotado tus
                  intentos ({intentos.length}/{maxIntentos}). No es posible reintentarlo.
                </p>
              ) : (
                <p>
                  <XCircle className="inline h-4 w-4 mr-1" /> Tu mejor calificación fue{" "}
                  <strong>{mejorIntento.calificacion.toFixed(2)}</strong>. Te quedan{" "}
                  <strong>{intentosRestantes}</strong> intento{intentosRestantes !== 1 ? "s" : ""}.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar de lecciones */}
        <Card className="lg:col-span-1 shadow-md h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Lecciones</CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <ol className="space-y-1">
              {curso.lecciones.map((l, idx) => {
                const done = leccionesCompletadas.has(l.id);
                const active = idx === currentIdx;
                return (
                  <li key={l.id}>
                    <button
                      onClick={() => setCurrentIdx(idx)}
                      className={`w-full text-left px-3 py-2 rounded flex items-start gap-2 ${
                        active ? "bg-primary/10 text-primary" : "hover:bg-gray-50"
                      }`}
                    >
                      <span className="mt-0.5">
                        {done ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Circle className="h-4 w-4 text-gray-400" />}
                      </span>
                      <span className="flex-1">
                        <span className="block text-xs text-muted-foreground">Lección {idx + 1}</span>
                        <span className="block text-sm font-medium">{l.titulo}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
            {curso.examen && (
              <div className="mt-3 pt-3 border-t">
                <div className="px-3 py-2 flex items-start gap-2">
                  <ClipboardList className="h-4 w-4 mt-0.5 text-primary" />
                  <div className="flex-1">
                    <span className="block text-xs text-muted-foreground">Examen final</span>
                    <span className="block text-sm font-medium">{curso.examen.preguntas.length} preguntas</span>
                    {permiteReintentos && (
                      <span className="block text-xs text-muted-foreground mt-1">
                        Intentos: {intentosHechos}/{maxIntentos}
                      </span>
                    )}
                    {yaAprobo ? (
                      <p className="text-xs mt-1 text-green-700">Curso aprobado.</p>
                    ) : agotoIntentos ? (
                      <p className="text-xs mt-1 text-red-700">Has agotado tus intentos.</p>
                    ) : puedeIniciarExamen ? (
                      <Button
                        size="sm"
                        className="mt-2 w-full"
                        onClick={() => router.push(`/perfil/capacitaciones/${curso.id}/examen`)}
                      >
                        <Play className="h-3 w-3 mr-1" />
                        {intentosHechos > 0 ? "Reintentar examen" : "Iniciar examen"}
                      </Button>
                    ) : intentosHechos > 0 && !todasCompletadas ? (
                      <p className="text-xs mt-1 text-muted-foreground">Completa las lecciones restantes.</p>
                    ) : (
                      <p className="text-xs mt-1 text-muted-foreground">Completa todas las lecciones para habilitar.</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lección actual */}
        <Card className="lg:col-span-3 shadow-md">
          <CardContent className="p-6">
            {currentLeccion ? (
              <>
                <div className="mb-4">
                  <Badge variant="outline" className="mb-2">Lección {currentIdx + 1} de {totalLecciones}</Badge>
                  <h2 className="text-2xl font-bold">{currentLeccion.titulo}</h2>
                  {currentLeccion.descripcion && (
                    <p className="text-muted-foreground mt-2">{currentLeccion.descripcion}</p>
                  )}
                </div>

                <div className="space-y-4">
                  {currentLeccion.recursos.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">Esta lección aún no tiene contenido.</p>
                  ) : (
                    currentLeccion.recursos.map((r) => (
                      <div key={r.id} className="border rounded p-4 space-y-2">
                        <div className="flex items-center gap-2 font-medium text-sm">
                          {recursoIcon(r.tipo)}
                          {r.titulo || `Recurso de ${r.tipo}`}
                        </div>
                        {r.tipo === "texto" && (
                          <p className="whitespace-pre-wrap text-sm">{r.contenido_texto}</p>
                        )}
                        {r.tipo === "video" && r.video_url && renderVideo(r.video_url)}
                        {r.tipo === "imagen" && r.archivo_url && (
                          <img src={r.archivo_url} alt={r.titulo || "Imagen"} className="max-w-full rounded border" />
                        )}
                        {r.tipo === "documento" && r.archivo_url && (
                          <a
                            href={r.archivo_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 text-blue-600 hover:underline text-sm"
                          >
                            <Download className="h-4 w-4" /> Descargar documento
                          </a>
                        )}
                      </div>
                    ))
                  )}
                </div>

                <div className="flex justify-between mt-6 pt-4 border-t">
                  <Button
                    variant="outline"
                    disabled={currentIdx === 0}
                    onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
                  >
                    <ArrowLeftIcon className="h-4 w-4 mr-1" /> Anterior
                  </Button>
                  {currentIdx < totalLecciones - 1 ? (
                    <Button onClick={() => setCurrentIdx((i) => Math.min(totalLecciones - 1, i + 1))}>
                      Siguiente <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  ) : (
                    <Button
                      onClick={() => setCurrentIdx(totalLecciones - 1)}
                      disabled={!todasCompletadas && !yaAprobo}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      {yaAprobo ? "Curso finalizado" : "Has completado todas las lecciones"}
                      <CheckCircle2 className="h-4 w-4 ml-1" />
                    </Button>
                  )}
                </div>
              </>
            ) : (
              <p className="text-center text-muted-foreground">Este curso no tiene lecciones.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}