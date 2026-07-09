"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  ClipboardList,
  CheckCircle2,
  XCircle,
  Send,
  GraduationCap,
} from "lucide-react";
import { authFetch } from "@/lib/authenticated-fetch";

type Pregunta = {
  id: string;
  enunciado: string;
  tipo: "seleccion_unica" | "seleccion_multiple" | "verdadero_falso";
  opciones: Array<{ id: string; texto: string }>;
};

type Resultado = {
  intento_id: string;
  calificacion: number;
  aprobado: boolean;
  nota_aprobacion: number;
  numero_intento?: number;
  max_intentos?: number;
  intentos_restantes?: number;
  permite_reintentos?: boolean;
  mejor_calificacion?: number;
};

export default function ExamenUsuarioPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const cursoId = params?.id;

  const [loading, setLoading] = useState(true);
  const [curso, setCurso] = useState<any>(null);
  const [examenId, setExamenId] = useState<string | null>(null);
  const [preguntas, setPreguntas] = useState<Pregunta[]>([]);
  const [respuestas, setRespuestas] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [intentoExistente, setIntentoExistente] = useState<any>(null);

  useEffect(() => {
    if (!cursoId) return;
    (async () => {
      try {
        const supabase = createSupabaseClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) throw new Error("No autenticado");
        const user = session.user;

        const { data: cursoData } = await supabase
          .from("capacitaciones_cursos")
          .select("*")
          .eq("id", cursoId)
          .single();
        if (!cursoData) throw new Error("Curso no encontrado");
        setCurso(cursoData);

        const { data: examenData } = await supabase
          .from("capacitaciones_examenes")
          .select("id, capacitaciones_preguntas(id, enunciado, tipo, orden, capacitaciones_opciones(id, texto, orden))")
          .eq("curso_id", cursoId)
          .maybeSingle();

        if (!examenData) throw new Error("Este curso no tiene examen.");
        setExamenId((examenData as any).id);

        const preguntasList: Pregunta[] = ((examenData as any).capacitaciones_preguntas || [])
          .sort((a: any, b: any) => a.orden - b.orden)
          .map((p: any) => ({
            id: p.id,
            enunciado: p.enunciado,
            tipo: p.tipo,
            opciones: (p.capacitaciones_opciones || []).sort((a: any, b: any) => a.orden - b.orden),
          }));
        setPreguntas(preguntasList);

        // Verificar TODOS los intentos previos del usuario (para calcular mejor calificación
        // y saber si aún quedan reintentos disponibles).
        const { data: intentosPrevios } = await supabase
          .from("capacitaciones_intentos")
          .select("id, calificacion, aprobado, fecha_intento")
          .eq("usuario_id", user.id)
          .eq("examen_id", (examenData as any).id)
          .order("fecha_intento", { ascending: true });

        const maxIntentos = Number((cursoData as any).max_intentos) || 1;
        const notaAprobacionCurso = Number((cursoData as any).nota_aprobacion) || 70;
        const intentosHechos = intentosPrevios?.length || 0;
        const mejorCalificacion = (intentosPrevios || []).reduce(
          (max, i) => Math.max(max, Number((i as any).calificacion) || 0),
          0
        );
        const yaAprobo = mejorCalificacion >= notaAprobacionCurso;
        const agotados = intentosHechos >= maxIntentos;

        if (intentosHechos > 0) {
          setIntentoExistente(intentosPrevios?.[intentosPrevios.length - 1] || null);
        }

        // Solo mostrar la pantalla de resultado si ya no puede reintentar
        // (aprobó o agotó intentos). Si aún le quedan, mostrar el formulario.
        if (yaAprobo || agotados) {
          setResultado({
            intento_id: (intentosPrevios?.[intentosPrevios.length - 1] as any)?.id || "",
            calificacion: mejorCalificacion,
            aprobado: yaAprobo,
            nota_aprobacion: notaAprobacionCurso,
            numero_intento: intentosHechos,
            max_intentos: maxIntentos,
            intentos_restantes: Math.max(0, maxIntentos - intentosHechos),
            permite_reintentos: maxIntentos > 1,
            mejor_calificacion: mejorCalificacion,
          });
        }
      } catch (e: any) {
        setError(e?.message || "Error");
      } finally {
        setLoading(false);
      }
    })();
  }, [cursoId]);

  const toggleSeleccion = (preguntaId: string, opcionId: string, multiple: boolean) => {
    setRespuestas((prev) => {
      const current = prev[preguntaId] || [];
      if (multiple) {
        if (current.includes(opcionId)) {
          return { ...prev, [preguntaId]: current.filter((x) => x !== opcionId) };
        }
        return { ...prev, [preguntaId]: [...current, opcionId] };
      }
      return { ...prev, [preguntaId]: [opcionId] };
    });
  };

  const handleSubmit = async () => {
    if (!examenId) return;
    const sinResponder = preguntas.filter((p) => !respuestas[p.id] || respuestas[p.id].length === 0);
    if (sinResponder.length > 0) {
      const ok = confirm(`Tienes ${sinResponder.length} pregunta(s) sin responder. ¿Enviar de todas formas?`);
      if (!ok) return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        examen_id: examenId,
        respuestas: preguntas.map((p) => ({
          pregunta_id: p.id,
          opciones_seleccionadas: respuestas[p.id] || [],
        })),
      };
      const res = await authFetch("/api/capacitaciones/intentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error("Tu sesión ha expirado. Vuelve a iniciar sesión.");
        }
        throw new Error(json?.error || "Error al enviar");
      }
      setResultado(json);
    } catch (e: any) {
      setError(e?.message || "Error al enviar");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-6">
        <Card><CardContent className="p-6">Cargando examen...</CardContent></Card>
      </div>
    );
  }

  if (error || !curso) {
    return (
      <div className="py-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-red-600">{error || "Examen no disponible"}</p>
            <Button variant="outline" onClick={() => router.push(`/perfil/capacitaciones/${cursoId}`)} className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-1" /> Volver al curso
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Pantalla de resultado (también si ya tenía intento previo)
  if (resultado) {
    const numeroIntento = resultado.numero_intento ?? 1;
    const maxIntentos = resultado.max_intentos ?? 1;
    const intentosRestantes = resultado.intentos_restantes ?? 0;
    const permiteReintentosResultado = resultado.permite_reintentos === true && maxIntentos > 1;
    const puedeReintentar = !resultado.aprobado && permiteReintentosResultado && intentosRestantes > 0;

    return (
      <div className="py-6">
        <Card className="shadow-md max-w-2xl mx-auto">
          <CardContent className="p-8 text-center space-y-4">
            {resultado.aprobado ? (
              <CheckCircle2 className="h-20 w-20 mx-auto text-green-500" />
            ) : (
              <XCircle className="h-20 w-20 mx-auto text-red-500" />
            )}
            <h1 className="text-3xl font-bold">
              {resultado.aprobado ? "¡Aprobado!" : "No aprobado"}
            </h1>
            <div className="text-6xl font-bold">
              {resultado.calificacion.toFixed(2)}
            </div>
            <p className="text-muted-foreground">
              Calificación mínima de aprobación: <strong>{resultado.nota_aprobacion}%</strong>
            </p>
            {permiteReintentosResultado && (
              <p className="text-sm text-muted-foreground">
                Intento {numeroIntento} de {maxIntentos}
                {!resultado.aprobado && intentosRestantes > 0 && (
                  <> · Te {intentosRestantes === 1 ? "queda" : "quedan"} {intentosRestantes} intento{intentosRestantes !== 1 ? "s" : ""}</>
                )}
              </p>
            )}
            {resultado.aprobado ? (
              <p className="text-sm text-green-700">Has completado exitosamente este curso.</p>
            ) : puedeReintentar ? (
              <p className="text-sm text-orange-700">Puedes reintentar para mejorar tu calificación.</p>
            ) : (
              <p className="text-sm text-red-700">Has agotado tus intentos.</p>
            )}
            <div className="flex justify-center gap-3 pt-4">
              <Button variant="outline" onClick={() => router.push("/perfil/capacitaciones")}>
                Volver a capacitaciones
              </Button>
              {puedeReintentar && (
                <Button onClick={() => router.push(`/perfil/capacitaciones/${cursoId}/examen`)}>
                  Reintentar examen
                </Button>
              )}
              <Button onClick={() => router.push(`/perfil/capacitaciones/${cursoId}`)}>
                Ver el curso
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const respondidas = preguntas.filter((p) => respuestas[p.id]?.length > 0).length;
  const progreso = preguntas.length > 0 ? Math.round((respondidas / preguntas.length) * 100) : 0;

  return (
    <div className="py-6">
      <Card className="shadow-md max-w-3xl mx-auto">
        <CardHeader className="bg-primary/5 pb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.push(`/perfil/capacitaciones/${cursoId}`)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex-1">
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-primary" />
                Examen final
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">{curso.titulo}</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm text-yellow-900">
            <strong>Atención:</strong> Una vez enviado, no podrás volver a presentar el examen.
          </div>

          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium">Respondidas: {respondidas} / {preguntas.length}</span>
              <span className="text-muted-foreground">{progreso}%</span>
            </div>
            <Progress value={progreso} />
          </div>

          <div className="space-y-6">
            {preguntas.map((p, idx) => (
              <div key={p.id} className="border rounded p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <span className="font-mono text-sm text-muted-foreground">{idx + 1}.</span>
                  <div className="flex-1">
                    <p className="font-medium">{p.enunciado}</p>
                    <Badge variant="outline" className="mt-1 text-xs">
                      {p.tipo === "seleccion_unica" ? "Selección única" : p.tipo === "seleccion_multiple" ? "Selección múltiple" : "Verdadero / Falso"}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-2 pl-6">
                  {p.opciones.map((o) => {
                    const checked = (respuestas[p.id] || []).includes(o.id);
                    return (
                      <label
                        key={o.id}
                        className={`flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-gray-50 ${
                          checked ? "border-primary bg-primary/5" : ""
                        }`}
                      >
                        <input
                          type={p.tipo === "seleccion_multiple" ? "checkbox" : "radio"}
                          name={p.tipo === "seleccion_multiple" ? undefined : `preg-${p.id}`}
                          checked={checked}
                          onChange={() => toggleSeleccion(p.id, o.id, p.tipo === "seleccion_multiple")}
                        />
                        <span className="text-sm">{o.texto}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {error && <div className="bg-red-50 text-red-700 px-4 py-2 rounded">{error}</div>}

          <div className="flex justify-end pt-4 border-t">
            <Button onClick={handleSubmit} disabled={submitting} className="btn-custom">
              <Send className="h-4 w-4 mr-1" />
              {submitting ? "Enviando..." : "Finalizar examen"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}