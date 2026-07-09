"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, GraduationCap, Upload, Loader2, X, Image as ImageIcon } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { authFetch } from "@/lib/authenticated-fetch";

export default function NuevoCursoPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [titulo, setTitulo] = useState("");
  const [descripcionCorta, setDescripcionCorta] = useState("");
  const [descripcionCompleta, setDescripcionCompleta] = useState("");
  const [imagenUrl, setImagenUrl] = useState("");
  const [notaAprobacion, setNotaAprobacion] = useState(70);
  const [estado, setEstado] = useState<"borrador" | "publicado">("borrador");
  const [permiteReintentos, setPermiteReintentos] = useState(false);
  const [maxIntentos, setMaxIntentos] = useState(2);

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
      if (!res.ok) throw new Error(json?.error || "Error al subir imagen");
      setImagenUrl(json.url);
    } catch (err: any) {
      setError(err?.message || "Error al subir imagen");
    } finally {
      setUploadingImg(false);
      e.target.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent, publicar: boolean) => {
    e.preventDefault();
    if (!titulo.trim()) return setError("El título es obligatorio");
    if (!descripcionCorta.trim()) return setError("La descripción corta es obligatoria");

    try {
      setSaving(true);
      setError(null);
      const res = await authFetch("/api/capacitaciones/cursos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: titulo.trim(),
          descripcion_corta: descripcionCorta.trim(),
          descripcion_completa: descripcionCompleta.trim() || null,
          imagen_destacada_url: imagenUrl || null,
          nota_aprobacion: notaAprobacion,
          estado: publicar ? "publicado" : estado,
          permite_reintentos: permiteReintentos,
          max_intentos: maxIntentos,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Error al crear curso");
      router.push(`/administracion/capacitaciones/${json.id}`);
    } catch (err: any) {
      setError(err?.message || "Error al crear curso");
    } finally {
      setSaving(false);
    }
  };

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
                Nuevo curso de capacitación
              </CardTitle>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            <form className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="titulo">Título *</Label>
                <Input
                  id="titulo"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ej. Inducción a la compañía"
                  maxLength={200}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="desc-corta">Descripción corta *</Label>
                <Textarea
                  id="desc-corta"
                  value={descripcionCorta}
                  onChange={(e) => setDescripcionCorta(e.target.value)}
                  placeholder="Resumen breve que verán los usuarios en el listado (máx. 500 caracteres)"
                  maxLength={500}
                  className="min-h-[80px]"
                />
                <p className="text-xs text-muted-foreground">{descripcionCorta.length}/500</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="desc-completa">Descripción completa</Label>
                <Textarea
                  id="desc-completa"
                  value={descripcionCompleta}
                  onChange={(e) => setDescripcionCompleta(e.target.value)}
                  placeholder="Descripción detallada que verá el usuario al iniciar el curso"
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
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleUploadImagen}
                      className="hidden"
                      id="img-upload"
                      disabled={uploadingImg}
                    />
                    <Label
                      htmlFor="img-upload"
                      className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-gray-50"
                    >
                      {uploadingImg ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      {uploadingImg ? "Subiendo..." : "Subir imagen"}
                    </Label>
                    <span className="text-xs text-muted-foreground">
                      <ImageIcon className="inline h-3 w-3" /> PNG, JPG (recomendado 1200x600)
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-2 max-w-xs">
                <Label htmlFor="nota">Nota mínima de aprobación (%)</Label>
                <Input
                  id="nota"
                  type="number"
                  min={0}
                  max={100}
                  value={notaAprobacion}
                  onChange={(e) => setNotaAprobacion(Number(e.target.value))}
                />
              </div>

              <div className="space-y-2 max-w-xs">
                <Label htmlFor="estado">Estado inicial</Label>
                <select
                  id="estado"
                  className="w-full border rounded px-3 py-2"
                  value={estado}
                  onChange={(e) => setEstado(e.target.value as any)}
                >
                  <option value="borrador">Borrador</option>
                  <option value="publicado">Publicado</option>
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
                      Total de oportunidades (incluye el primer intento). Si el usuario aprueba,
                      no podrá reintentar aunque queden intentos.
                    </p>
                  </div>
                )}
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button
                  type="button"
                  onClick={(e) => handleSubmit(e, false)}
                  disabled={saving}
                  className="btn-custom flex-1"
                >
                  {saving ? "Guardando..." : "Guardar borrador"}
                </Button>
                <Button
                  type="button"
                  onClick={(e) => handleSubmit(e, true)}
                  disabled={saving}
                  className="bg-green-600 hover:bg-green-700 text-white flex-1"
                >
                  {saving ? "Publicando..." : "Guardar y publicar"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}