"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, GraduationCap, Upload, Loader2, X, Image as ImageIcon } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { authFetch } from "@/lib/authenticated-fetch";

export default function EditarCursoPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [titulo, setTitulo] = useState("");
  const [descripcionCorta, setDescripcionCorta] = useState("");
  const [descripcionCompleta, setDescripcionCompleta] = useState("");
  const [imagenUrl, setImagenUrl] = useState("");
  const [notaAprobacion, setNotaAprobacion] = useState(70);
  const [estado, setEstado] = useState("borrador");
  const [permiteReintentos, setPermiteReintentos] = useState(false);
  const [maxIntentos, setMaxIntentos] = useState(2);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const res = await authFetch(`/api/capacitaciones/cursos/${id}`);
        if (!res.ok) throw new Error("Error al cargar");
        const data = await res.json();
        setTitulo(data.titulo || "");
        setDescripcionCorta(data.descripcion_corta || "");
        setDescripcionCompleta(data.descripcion_completa || "");
        setImagenUrl(data.imagen_destacada_url || "");
        setNotaAprobacion(data.nota_aprobacion ?? 70);
        setEstado(data.estado || "borrador");
        setPermiteReintentos(data.permite_reintentos === true);
        setMaxIntentos(Math.max(2, Number(data.max_intentos) || 2));
      } catch (e: any) {
        setError(e?.message || "Error");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleUploadImagen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImg(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "capacitaciones/cursos/portadas");
      const res = await fetch("/api/cloudinary/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Error al subir");
      setImagenUrl(json.url);
    } catch (err: any) {
      setError(err?.message || "Error al subir");
    } finally {
      setUploadingImg(false);
      e.target.value = "";
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) return setError("El título es obligatorio");
    if (!descripcionCorta.trim()) return setError("La descripción corta es obligatoria");
    try {
      setSaving(true);
      const res = await authFetch(`/api/capacitaciones/cursos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: titulo.trim(),
          descripcion_corta: descripcionCorta.trim(),
          descripcion_completa: descripcionCompleta.trim() || null,
          imagen_destacada_url: imagenUrl || null,
          nota_aprobacion: notaAprobacion,
          estado,
          permite_reintentos: permiteReintentos,
          max_intentos: maxIntentos,
        }),
      });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j?.error || "Error");
      }
      router.push(`/administracion/capacitaciones/${id}`);
    } catch (err: any) {
      setError(err?.message || "Error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-6 flex min-h-screen">
        <div className="w-full mx-auto flex-1">
          <Card><CardContent className="p-6">Cargando...</CardContent></Card>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6 flex min-h-screen">
      <div className="w-full mx-auto flex-1">
        <Card className="shadow-md">
          <CardHeader className="bg-primary/5 pb-6">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <CardTitle className="text-2xl font-bold flex items-center gap-2">
                <GraduationCap className="h-6 w-6 text-primary" />
                Editar curso
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSave} className="space-y-6">
              <div className="space-y-2">
                <Label>Título *</Label>
                <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={200} />
              </div>
              <div className="space-y-2">
                <Label>Descripción corta *</Label>
                <Textarea
                  value={descripcionCorta}
                  onChange={(e) => setDescripcionCorta(e.target.value)}
                  maxLength={500}
                  className="min-h-[80px]"
                />
                <p className="text-xs text-muted-foreground">{descripcionCorta.length}/500</p>
              </div>
              <div className="space-y-2">
                <Label>Descripción completa</Label>
                <Textarea
                  value={descripcionCompleta}
                  onChange={(e) => setDescripcionCompleta(e.target.value)}
                  className="min-h-[140px]"
                />
              </div>
              <div className="space-y-2">
                <Label>Imagen destacada</Label>
                {imagenUrl ? (
                  <div className="relative inline-block">
                    <img src={imagenUrl} alt="Imagen" className="max-h-48 rounded border" />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-7 w-7"
                      onClick={() => setImagenUrl("")}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <input type="file" accept="image/*" onChange={handleUploadImagen} className="hidden" id="img-upload" disabled={uploadingImg} />
                    <Label htmlFor="img-upload" className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-gray-50">
                      {uploadingImg ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      {uploadingImg ? "Subiendo..." : "Subir imagen"}
                    </Label>
                    <span className="text-xs text-muted-foreground"><ImageIcon className="inline h-3 w-3" /> PNG, JPG</span>
                  </div>
                )}
              </div>
              <div className="space-y-2 max-w-xs">
                <Label>Nota mínima de aprobación (%)</Label>
                <Input type="number" min={0} max={100} value={notaAprobacion} onChange={(e) => setNotaAprobacion(Number(e.target.value))} />
              </div>
              <div className="space-y-2 max-w-xs">
                <Label>Estado</Label>
                <select className="w-full border rounded px-3 py-2" value={estado} onChange={(e) => setEstado(e.target.value)}>
                  <option value="borrador">Borrador</option>
                  <option value="publicado">Publicado</option>
                  <option value="archivado">Archivado</option>
                </select>
              </div>

              <div className="space-y-3 border rounded-md p-4 bg-gray-50">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="permite_reintentos"
                    checked={permiteReintentos}
                    onCheckedChange={(c) => setPermiteReintentos(!!c)}
                  />
                  <Label htmlFor="permite_reintentos" className="cursor-pointer">
                    Permitir reintentos del examen
                  </Label>
                </div>
                {permiteReintentos && (
                  <div className="space-y-2 max-w-xs pl-6">
                    <Label>Número máximo de intentos</Label>
                    <Input
                      type="number"
                      min={2}
                      max={10}
                      value={maxIntentos}
                      onChange={(e) =>
                        setMaxIntentos(Math.max(2, Math.min(10, Number(e.target.value) || 2)))
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Si el usuario aprueba, no podrá reintentar aunque queden intentos.
                    </p>
                  </div>
                )}
              </div>

              {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>}
              <div className="flex gap-3">
                <Button type="submit" disabled={saving} className="btn-custom">
                  {saving ? "Guardando..." : "Guardar cambios"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}