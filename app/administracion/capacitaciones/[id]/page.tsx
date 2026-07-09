"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  GraduationCap,
  Edit,
  Trash2,
  Plus,
  ArrowUp,
  ArrowDown,
  Save,
  Image as ImageIcon,
  FileText,
  Video,
  Type,
  Upload,
  Loader2,
  X,
  ClipboardList,
  Users,
  Eye,
  CheckCircle2,
  Circle,
  Pencil,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { authFetch } from "@/lib/authenticated-fetch";

type Recurso = {
  id: string;
  tipo: "texto" | "video" | "imagen" | "documento";
  titulo: string | null;
  contenido_texto: string | null;
  video_url: string | null;
  archivo_url: string | null;
  orden: number;
};

type Leccion = {
  id: string;
  curso_id: string;
  titulo: string;
  descripcion: string | null;
  orden: number;
  recursos: Recurso[];
};

type Pregunta = {
  id: string;
  enunciado: string;
  tipo: "seleccion_unica" | "seleccion_multiple" | "verdadero_falso";
  puntos: number;
  orden: number;
  opciones: Array<{ id: string; texto: string; es_correcta: boolean; orden: number }>;
};

type Examen = {
  id: string;
  titulo: string;
  preguntas: Pregunta[];
};

type Curso = {
  id: string;
  titulo: string;
  descripcion_corta: string;
  descripcion_completa: string | null;
  imagen_destacada_url: string | null;
  estado: string;
  nota_aprobacion: number;
  lecciones: Leccion[];
  examen: Examen | null;
};

type Tab = "info" | "lecciones" | "examen" | "resultados";

export default function DetalleCursoPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const cursoId = params?.id;
  const [tab, setTab] = useState<Tab>("info");
  const [loading, setLoading] = useState(true);
  const [curso, setCurso] = useState<Curso | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchCurso = useCallback(async () => {
    if (!cursoId) return;
    setLoading(true);
    try {
      const res = await authFetch(`/api/capacitaciones/cursos/${cursoId}`);
      if (!res.ok) throw new Error("Error al cargar el curso");
      const data = await res.json();
      setCurso(data);
    } catch (e: any) {
      setError(e?.message || "Error al cargar el curso");
    } finally {
      setLoading(false);
    }
  }, [cursoId]);

  useEffect(() => {
    fetchCurso();
  }, [fetchCurso]);

  if (!cursoId) return null;

  return (
    <div className="py-6 flex min-h-screen">
      <div className="w-full mx-auto flex-1">
        <Card className="shadow-md mb-6">
          <CardHeader className="bg-primary/5 pb-6">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => router.push("/administracion/capacitaciones")}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex-1">
                <CardTitle className="text-2xl font-bold flex items-center gap-2">
                  <GraduationCap className="h-6 w-6 text-primary" />
                  {loading ? <Skeleton className="h-6 w-64" /> : curso?.titulo}
                </CardTitle>
                {curso && (
                  <div className="flex gap-2 mt-2">
                    <Badge
                      variant={
                        curso.estado === "publicado" ? "default" : curso.estado === "borrador" ? "outline" : "secondary"
                      }
                    >
                      {curso.estado === "publicado" ? "Publicado" : curso.estado === "borrador" ? "Borrador" : "Archivado"}
                    </Badge>
                    <Badge variant="secondary">Nota aprobación: {curso.nota_aprobacion}%</Badge>
                    <Badge variant="secondary">{curso.lecciones?.length || 0} lecciones</Badge>
                  </div>
                )}
              </div>
              {curso && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => router.push(`/administracion/capacitaciones/editar/${curso.id}`)}>
                    <Edit className="h-4 w-4 mr-1" /> Editar info
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="flex border-b">
              <TabButton active={tab === "info"} onClick={() => setTab("info")}>
                <FileText className="h-4 w-4 inline mr-1" /> Información
              </TabButton>
              <TabButton active={tab === "lecciones"} onClick={() => setTab("lecciones")}>
                <GraduationCap className="h-4 w-4 inline mr-1" /> Lecciones ({curso?.lecciones?.length || 0})
              </TabButton>
              <TabButton active={tab === "examen"} onClick={() => setTab("examen")}>
                <ClipboardList className="h-4 w-4 inline mr-1" /> Examen ({curso?.examen?.preguntas?.length || 0})
              </TabButton>
              <TabButton active={tab === "resultados"} onClick={() => setTab("resultados")}>
                <Users className="h-4 w-4 inline mr-1" /> Resultados
              </TabButton>
            </div>
            <div className="p-6">
              {error && <div className="bg-red-50 text-red-700 px-4 py-2 rounded mb-4">{error}</div>}

              {loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-32 w-full" />
                </div>
              ) : curso ? (
                <>
                  {tab === "info" && <TabInfo curso={curso} />}
                  {tab === "lecciones" && (
                    <TabLecciones
                      curso={curso}
                      onChange={fetchCurso}
                    />
                  )}
                  {tab === "examen" && (
                    <TabExamen
                      curso={curso}
                      onChange={fetchCurso}
                    />
                  )}
                  {tab === "resultados" && (
                    <div className="text-center py-8">
                      <Button
                        onClick={() => router.push(`/administracion/capacitaciones/${curso.id}/resultados`)}
                        className="btn-custom"
                      >
                        <Users className="h-4 w-4 mr-2" /> Ver resultados por usuario
                      </Button>
                    </div>
                  )}
                </>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
        active ? "border-primary text-primary" : "border-transparent text-gray-600 hover:text-gray-900"
      }`}
    >
      {children}
    </button>
  );
}

function TabInfo({ curso }: { curso: Curso }) {
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-muted-foreground">Descripción corta</Label>
        <p className="mt-1">{curso.descripcion_corta}</p>
      </div>
      <div>
        <Label className="text-muted-foreground">Descripción completa</Label>
        <p className="mt-1 whitespace-pre-wrap">{curso.descripcion_completa || "—"}</p>
      </div>
      {curso.imagen_destacada_url && (
        <div>
          <Label className="text-muted-foreground">Imagen destacada</Label>
          <img src={curso.imagen_destacada_url} alt="Portada" className="mt-2 max-h-64 rounded border" />
        </div>
      )}
      <div className="grid grid-cols-3 gap-4 pt-2">
        <div className="border rounded p-3">
          <div className="text-xs text-muted-foreground">Lecciones</div>
          <div className="text-2xl font-bold">{curso.lecciones?.length || 0}</div>
        </div>
        <div className="border rounded p-3">
          <div className="text-xs text-muted-foreground">Preguntas examen</div>
          <div className="text-2xl font-bold">{curso.examen?.preguntas?.length || 0}</div>
        </div>
        <div className="border rounded p-3">
          <div className="text-xs text-muted-foreground">Nota aprobación</div>
          <div className="text-2xl font-bold">{curso.nota_aprobacion}%</div>
        </div>
      </div>
    </div>
  );
}

function TabLecciones({ curso, onChange }: { curso: Curso; onChange: () => void }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editingLeccion, setEditingLeccion] = useState<Leccion | null>(null);
  const [expandedLeccion, setExpandedLeccion] = useState<string | null>(null);

  const lecciones = (curso.lecciones || []).slice().sort((a, b) => a.orden - b.orden);

  const moveLeccion = async (idx: number, dir: -1 | 1) => {
    const next = [...lecciones];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    const items = next.map((l, i) => ({ id: l.id, orden: i }));
    await authFetch("/api/capacitaciones/lecciones/reordenar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
    onChange();
  };

  const deleteLeccion = async (id: string) => {
    if (!confirm("¿Eliminar esta lección y todos sus recursos?")) return;
    await authFetch(`/api/capacitaciones/lecciones/${id}`, { method: "DELETE" });
    onChange();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Crea las lecciones del curso. Cada lección puede contener texto, videos, imágenes y documentos.
        </p>
        <Button onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4 mr-1" /> Nueva lección
        </Button>
      </div>

      {lecciones.length === 0 ? (
        <div className="text-center py-8 text-gray-500 border rounded">
          Aún no hay lecciones. Haz clic en "Nueva lección" para empezar.
        </div>
      ) : (
        <div className="space-y-2">
          {lecciones.map((l, idx) => (
            <Card key={l.id} className="bg-white">
              <CardContent className="p-4">
                <div className="flex items-start gap-2">
                  <div className="flex flex-col gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      disabled={idx === 0}
                      onClick={() => moveLeccion(idx, -1)}
                    >
                      <ArrowUp className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      disabled={idx === lecciones.length - 1}
                      onClick={() => moveLeccion(idx, 1)}
                    >
                      <ArrowDown className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{idx + 1}. {l.titulo}</span>
                      <Badge variant="secondary" className="text-xs">{l.recursos?.length || 0} recursos</Badge>
                    </div>
                    {l.descripcion && <p className="text-sm text-muted-foreground mt-1">{l.descripcion}</p>}
                    <Button
                      variant="link"
                      size="sm"
                      className="px-0 mt-1"
                      onClick={() => setExpandedLeccion(expandedLeccion === l.id ? null : l.id)}
                    >
                      {expandedLeccion === l.id ? "Ocultar recursos" : "Gestionar recursos"}
                    </Button>
                    {expandedLeccion === l.id && (
                      <LeccionRecursos leccion={l} onChange={onChange} />
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setEditingLeccion(l)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500"
                      onClick={() => deleteLeccion(l.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showAdd && (
        <LeccionFormDialog
          cursoId={curso.id}
          onClose={() => setShowAdd(false)}
          onSaved={() => {
            setShowAdd(false);
            onChange();
          }}
        />
      )}
      {editingLeccion && (
        <LeccionFormDialog
          cursoId={curso.id}
          leccion={editingLeccion}
          onClose={() => setEditingLeccion(null)}
          onSaved={() => {
            setEditingLeccion(null);
            onChange();
          }}
        />
      )}
    </div>
  );
}

function LeccionFormDialog({
  cursoId,
  leccion,
  onClose,
  onSaved,
}: {
  cursoId: string;
  leccion?: Leccion;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [titulo, setTitulo] = useState(leccion?.titulo || "");
  const [descripcion, setDescripcion] = useState(leccion?.descripcion || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!titulo.trim()) return setError("El título es obligatorio");
    setSaving(true);
    try {
      const url = leccion ? `/api/capacitaciones/lecciones/${leccion.id}` : "/api/capacitaciones/lecciones";
      const method = leccion ? "PATCH" : "POST";
      const body: any = { titulo: titulo.trim(), descripcion: descripcion.trim() || null };
      if (!leccion) body.curso_id = cursoId;
      const res = await authFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j?.error || "Error al guardar");
      }
      onSaved();
    } catch (e: any) {
      setError(e?.message || "Error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{leccion ? "Editar lección" : "Nueva lección"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <div>
            <Label>Título *</Label>
            <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} />
          </div>
          <div>
            <Label>Descripción</Label>
            <Textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
          </div>
          {error && <div className="text-red-600 text-sm">{error}</div>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-1" /> {saving ? "Guardando..." : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LeccionRecursos({ leccion, onChange }: { leccion: Leccion; onChange: () => void }) {
  const [showAdd, setShowAdd] = useState<"texto" | "video" | "imagen" | "documento" | null>(null);
  const recursos = (leccion.recursos || []).slice().sort((a, b) => a.orden - b.orden);

  const tipoIcon = (t: string) => {
    switch (t) {
      case "texto": return <Type className="h-4 w-4" />;
      case "video": return <Video className="h-4 w-4" />;
      case "imagen": return <ImageIcon className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const deleteRecurso = async (id: string) => {
    if (!confirm("¿Eliminar este recurso?")) return;
    await authFetch(`/api/capacitaciones/recursos/${id}`, { method: "DELETE" });
    onChange();
  };

  return (
    <div className="mt-3 border-t pt-3 space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => setShowAdd("texto")}>
          <Type className="h-3 w-3 mr-1" /> + Texto
        </Button>
        <Button size="sm" variant="outline" onClick={() => setShowAdd("video")}>
          <Video className="h-3 w-3 mr-1" /> + Video
        </Button>
        <Button size="sm" variant="outline" onClick={() => setShowAdd("imagen")}>
          <ImageIcon className="h-3 w-3 mr-1" /> + Imagen
        </Button>
        <Button size="sm" variant="outline" onClick={() => setShowAdd("documento")}>
          <FileText className="h-3 w-3 mr-1" /> + Documento
        </Button>
      </div>

      {recursos.length === 0 ? (
        <p className="text-xs text-muted-foreground">Sin recursos aún.</p>
      ) : (
        <ul className="space-y-1">
          {recursos.map((r) => (
            <li key={r.id} className="flex items-center gap-2 text-sm border rounded p-2 bg-gray-50">
              {tipoIcon(r.tipo)}
              <span className="font-medium">{r.titulo || `(${r.tipo})`}</span>
              <span className="text-xs text-muted-foreground truncate flex-1">
                {r.tipo === "texto" && r.contenido_texto?.substring(0, 60)}
                {r.tipo === "video" && r.video_url}
                {r.tipo === "imagen" && r.archivo_url}
                {r.tipo === "documento" && r.archivo_url}
              </span>
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => deleteRecurso(r.id)}>
                <Trash2 className="h-3 w-3 text-red-500" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {showAdd && (
        <RecursoFormDialog
          leccionId={leccion.id}
          tipo={showAdd}
          onClose={() => setShowAdd(null)}
          onSaved={() => {
            setShowAdd(null);
            onChange();
          }}
        />
      )}
    </div>
  );
}

function RecursoFormDialog({
  leccionId,
  tipo,
  onClose,
  onSaved,
}: {
  leccionId: string;
  tipo: "texto" | "video" | "imagen" | "documento";
  onClose: () => void;
  onSaved: () => void;
}) {
  const [titulo, setTitulo] = useState("");
  const [contenidoTexto, setContenidoTexto] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [archivoUrl, setArchivoUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", `capacitaciones/lecciones/${leccionId}/${tipo}s`);
      const res = await fetch("/api/cloudinary/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Error al subir");
      setArchivoUrl(json.url);
    } catch (err: any) {
      setError(err?.message || "Error al subir");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleSave = async () => {
    if (tipo === "texto" && !contenidoTexto.trim()) return setError("Escribe el contenido");
    if (tipo === "video" && !videoUrl.trim()) return setError("Ingresa la URL del video");
    if ((tipo === "imagen" || tipo === "documento") && !archivoUrl) return setError("Sube el archivo");

    setSaving(true);
    try {
      const body: any = { leccion_id: leccionId, tipo, titulo: titulo.trim() || null };
      if (tipo === "texto") body.contenido_texto = contenidoTexto;
      if (tipo === "video") body.video_url = videoUrl.trim();
      if (tipo === "imagen" || tipo === "documento") body.archivo_url = archivoUrl;

      const res = await authFetch("/api/capacitaciones/recursos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j?.error || "Error al guardar");
      }
      onSaved();
    } catch (e: any) {
      setError(e?.message || "Error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Agregar recurso de tipo "{tipo}"</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <div>
            <Label>Título (opcional)</Label>
            <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} />
          </div>
          {tipo === "texto" && (
            <div>
              <Label>Contenido *</Label>
              <Textarea
                value={contenidoTexto}
                onChange={(e) => setContenidoTexto(e.target.value)}
                className="min-h-[140px]"
              />
            </div>
          )}
          {tipo === "video" && (
            <div>
              <Label>URL del video *</Label>
              <Input
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=... o URL .mp4"
              />
              <p className="text-xs text-muted-foreground mt-1">
                YouTube, Vimeo o enlace directo a un .mp4
              </p>
            </div>
          )}
          {(tipo === "imagen" || tipo === "documento") && (
            <div className="min-w-0">
              <Label>Archivo *</Label>
              {archivoUrl ? (
                <div className="relative inline-block w-full">
                  {tipo === "imagen" ? (
                    <img
                      src={archivoUrl}
                      alt="preview"
                      className="w-full max-h-48 object-contain rounded-md border bg-gray-50"
                    />
                  ) : (
                    <div className="flex items-center gap-2 p-3 border rounded-md bg-gray-50">
                      <FileText className="h-5 w-5 text-gray-500 flex-shrink-0" />
                      <span className="text-sm text-gray-700">Documento PDF listo</span>
                    </div>
                  )}
                  <Button
                    size="icon"
                    variant="destructive"
                    className="absolute top-2 right-2 h-7 w-7 rounded-full shadow"
                    onClick={() => setArchivoUrl("")}
                    title="Quitar archivo"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div>
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    onChange={handleUpload}
                    disabled={uploading}
                    accept={tipo === "imagen" ? "image/*" : "application/pdf"}
                  />
                  <Label
                    htmlFor="file-upload"
                    className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-gray-50"
                  >
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    {uploading ? "Subiendo..." : "Seleccionar archivo"}
                  </Label>
                </div>
              )}
            </div>
          )}
          {error && <div className="text-red-600 text-sm">{error}</div>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-1" /> {saving ? "Guardando..." : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TabExamen({ curso, onChange }: { curso: Curso; onChange: () => void }) {
  const [showAddPregunta, setShowAddPregunta] = useState(false);
  const [editingPregunta, setEditingPregunta] = useState<Pregunta | null>(null);
  const [creatingExamen, setCreatingExamen] = useState(false);

  const examen = curso.examen;
  const preguntas = (examen?.preguntas || []).slice().sort((a, b) => a.orden - b.orden);

  const createExamen = async () => {
    setCreatingExamen(true);
    try {
      await authFetch(`/api/capacitaciones/examenes/${curso.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titulo: "Examen final" }),
      });
      onChange();
    } finally {
      setCreatingExamen(false);
    }
  };

  const deletePregunta = async (id: string) => {
    if (!confirm("¿Eliminar esta pregunta?")) return;
    await authFetch(`/api/capacitaciones/preguntas/${id}`, { method: "DELETE" });
    onChange();
  };

  const tipoLabel = (t: string) =>
    t === "seleccion_unica" ? "Selección única" : t === "seleccion_multiple" ? "Selección múltiple" : "Verdadero / Falso";

  return (
    <div className="space-y-4">
      {!examen ? (
        <div className="text-center py-8 border rounded">
          <p className="text-muted-foreground mb-4">Este curso aún no tiene examen.</p>
          <Button onClick={createExamen} disabled={creatingExamen} className="btn-custom">
            <Plus className="h-4 w-4 mr-1" /> {creatingExamen ? "Creando..." : "Crear examen"}
          </Button>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-medium">{examen.titulo}</h3>
              <p className="text-sm text-muted-foreground">
                {preguntas.length} pregunta{preguntas.length !== 1 ? "s" : ""} ·{" "}
                {preguntas.reduce((s, p) => s + Number(p.puntos || 0), 0)} puntos en total
              </p>
            </div>
            <Button onClick={() => setShowAddPregunta(true)}>
              <Plus className="h-4 w-4 mr-1" /> Nueva pregunta
            </Button>
          </div>

          {preguntas.length === 0 ? (
            <div className="text-center py-6 text-gray-500 border rounded">
              Aún no hay preguntas.
            </div>
          ) : (
            <div className="space-y-2">
              {preguntas.map((p, idx) => (
                <Card key={p.id} className="bg-white">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-2">
                      <span className="font-mono text-sm text-muted-foreground">{idx + 1}.</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{p.enunciado}</span>
                          <Badge variant="outline">{tipoLabel(p.tipo)}</Badge>
                          <Badge variant="secondary">{p.puntos} pts</Badge>
                        </div>
                        <ul className="mt-2 space-y-1">
                          {p.opciones.map((o) => (
                            <li key={o.id} className="flex items-center gap-2 text-sm">
                              {o.es_correcta ? (
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                              ) : (
                                <Circle className="h-4 w-4 text-gray-300" />
                              )}
                              <span className={o.es_correcta ? "font-medium text-green-700" : ""}>
                                {o.texto}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => setEditingPregunta(p)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="text-red-500" onClick={() => deletePregunta(p.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {showAddPregunta && (
            <PreguntaFormDialog
              examenId={examen.id}
              onClose={() => setShowAddPregunta(false)}
              onSaved={() => {
                setShowAddPregunta(false);
                onChange();
              }}
            />
          )}
          {editingPregunta && (
            <PreguntaFormDialog
              examenId={examen.id}
              pregunta={editingPregunta}
              onClose={() => setEditingPregunta(null)}
              onSaved={() => {
                setEditingPregunta(null);
                onChange();
              }}
            />
          )}
        </>
      )}
    </div>
  );
}

function PreguntaFormDialog({
  examenId,
  pregunta,
  onClose,
  onSaved,
}: {
  examenId: string;
  pregunta?: Pregunta;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [enunciado, setEnunciado] = useState(pregunta?.enunciado || "");
  const [tipo, setTipo] = useState<Pregunta["tipo"]>(pregunta?.tipo || "seleccion_unica");
  const [puntos, setPuntos] = useState(pregunta?.puntos || 1);
  const [opciones, setOpciones] = useState<Array<{ texto: string; es_correcta: boolean }>>(
    pregunta?.opciones?.length
      ? pregunta.opciones.map((o) => ({ texto: o.texto, es_correcta: o.es_correcta }))
      : [{ texto: "", es_correcta: false }, { texto: "", es_correcta: false }]
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTipoChange = (newTipo: Pregunta["tipo"]) => {
    setTipo(newTipo);
    if (newTipo === "verdadero_falso") {
      setOpciones([
        { texto: "Verdadero", es_correcta: false },
        { texto: "Falso", es_correcta: false },
      ]);
    } else if (opciones.length < 2) {
      setOpciones([
        { texto: "", es_correcta: false },
        { texto: "", es_correcta: false },
      ]);
    }
  };

  const handleSave = async () => {
    if (!enunciado.trim()) return setError("Escribe el enunciado");
    if (tipo !== "verdadero_falso") {
      if (opciones.length < 2) return setError("Agrega al menos 2 opciones");
      if (opciones.some((o) => !o.texto.trim())) return setError("Completa el texto de todas las opciones");
      if (tipo === "seleccion_unica" && opciones.filter((o) => o.es_correcta).length !== 1) {
        return setError("En selección única debe haber exactamente 1 opción correcta");
      }
      if (tipo === "seleccion_multiple" && opciones.filter((o) => o.es_correcta).length < 1) {
        return setError("En selección múltiple debe haber al menos 1 opción correcta");
      }
    } else {
      if (!opciones.some((o) => o.es_correcta)) {
        return setError("Marca cuál es la respuesta correcta");
      }
    }

    setSaving(true);
    try {
      const body: any = {
        examen_id: examenId,
        enunciado: enunciado.trim(),
        tipo,
        puntos,
      };
      if (!pregunta) {
        body.opciones = opciones.map((o) => ({ texto: o.texto.trim(), es_correcta: o.es_correcta }));
      }
      const url = pregunta ? `/api/capacitaciones/preguntas/${pregunta.id}` : "/api/capacitaciones/preguntas";
      const method = pregunta ? "PATCH" : "POST";
      const payload = pregunta ? { ...body, opciones: opciones.map((o) => ({ texto: o.texto.trim(), es_correcta: o.es_correcta })) } : body;

      const res = await authFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j?.error || "Error al guardar");
      }
      onSaved();
    } catch (e: any) {
      setError(e?.message || "Error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{pregunta ? "Editar pregunta" : "Nueva pregunta"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <div>
            <Label>Enunciado *</Label>
            <Textarea value={enunciado} onChange={(e) => setEnunciado(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tipo</Label>
              <select
                className="w-full border rounded px-3 py-2"
                value={tipo}
                onChange={(e) => handleTipoChange(e.target.value as any)}
                disabled={!!pregunta}
              >
                <option value="seleccion_unica">Selección única</option>
                <option value="seleccion_multiple">Selección múltiple</option>
                <option value="verdadero_falso">Verdadero / Falso</option>
              </select>
            </div>
            <div>
              <Label>Puntos</Label>
              <Input type="number" min={0} step={0.5} value={puntos} onChange={(e) => setPuntos(Number(e.target.value))} />
            </div>
          </div>

          <div>
            <Label>Opciones</Label>
            <div className="space-y-2 mt-2">
              {opciones.map((o, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type={tipo === "seleccion_multiple" ? "checkbox" : "radio"}
                    name="correcta"
                    checked={o.es_correcta}
                    onChange={() => {
                      setOpciones((prev) =>
                        prev.map((p, i) => {
                          if (tipo === "seleccion_multiple") {
                            return i === idx ? { ...p, es_correcta: !p.es_correcta } : p;
                          }
                          return { ...p, es_correcta: i === idx };
                        })
                      );
                    }}
                  />
                  <Input
                    value={o.texto}
                    onChange={(e) =>
                      setOpciones((prev) => prev.map((p, i) => (i === idx ? { ...p, texto: e.target.value } : p)))
                    }
                    placeholder={`Opción ${idx + 1}`}
                    disabled={tipo === "verdadero_falso"}
                  />
                  {tipo !== "verdadero_falso" && opciones.length > 2 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setOpciones((prev) => prev.filter((_, i) => i !== idx))}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            {tipo !== "verdadero_falso" && (
              <Button
                size="sm"
                variant="outline"
                className="mt-2"
                onClick={() => setOpciones((prev) => [...prev, { texto: "", es_correcta: false }])}
              >
                <Plus className="h-3 w-3 mr-1" /> Agregar opción
              </Button>
            )}
          </div>

          {error && <div className="text-red-600 text-sm">{error}</div>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-1" /> {saving ? "Guardando..." : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}