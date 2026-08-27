"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, Camera, CheckCircle2, Download, FileSignature, PackageCheck, ScrollText, Trash2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { authFetch } from "@/lib/authenticated-fetch";
import { useAuth } from "@/hooks/use-auth";
import { SignaturePad } from "@/components/actas-entrega/signature-pad";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { downloadActaPdf } from "@/lib/actas-entrega-pdf";

const statusLabel: Record<string, string> = {
  borrador: "Borrador",
  pendiente_recepcion: "Pendiente de recepción",
  completada: "Completada",
  aceptada_con_novedades: "Aceptada con novedades",
  rechazada: "Rechazada",
  anulada: "Anulada",
};

interface Review {
  id: string;
  recibido: boolean;
  estado_recepcion: "bueno" | "regular" | "malo" | "no_recibido";
  notas_recepcion: string;
}

export function ActaDetail({ admin = false, readOnly = false }: { admin?: boolean; readOnly?: boolean }) {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { userId } = useAuth();
  const [acta, setActa] = useState<any>(null);
  const [reviews, setReviews] = useState<Record<string, Review>>({});
  const [signature, setSignature] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const load = async () => {
    try {
      const response = await authFetch(`/api/actas-entrega/${id}`);
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "No fue posible cargar el acta");
      setActa(body);
      setReviews(Object.fromEntries(body.actas_entrega_items.map((item: any) => [item.id, {
        id: item.id,
        recibido: item.recibido ?? true,
        estado_recepcion: item.estado_recepcion || "bueno",
        notas_recepcion: item.notas_recepcion || "",
      }])));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error inesperado");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void load(); }, [id]);

  const updateReview = (itemId: string, patch: Partial<Review>) => {
    setReviews((current) => ({ ...current, [itemId]: { ...current[itemId], ...patch } }));
  };

  const send = async () => {
    if (!signature || !consent) return toast.error("Dibuja tu firma y acepta la declaración");
    setSubmitting(true);
    try {
      const response = await authFetch(`/api/actas-entrega/${id}/enviar`, { method: "POST", body: JSON.stringify({ firma: signature, acepta: true }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "No fue posible enviar el acta");
      toast.success("Acta firmada y enviada al receptor");
      await load();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Error inesperado"); }
    finally { setSubmitting(false); }
  };

  const upload = async (itemId: string, file?: File) => {
    if (!file) return;
    const form = new FormData();
    form.append("item_id", itemId);
    form.append("archivo", file);
    const response = await authFetch(`/api/actas-entrega/${id}/evidencias`, { method: "POST", body: form });
    const body = await response.json();
    if (!response.ok) return toast.error(body.error || "No fue posible cargar la foto");
    toast.success("Evidencia agregada");
    await load();
  };

  const removeEvidence = async (evidenceId: string) => {
    const response = await authFetch(`/api/actas-entrega/${id}/evidencias?evidencia_id=${evidenceId}`, { method: "DELETE" });
    if (!response.ok) return toast.error("No fue posible eliminar la evidencia");
    await load();
  };

  const accept = async () => {
    if (!signature || !consent) return toast.error("Dibuja tu firma y acepta la declaración");
    setSubmitting(true);
    try {
      const response = await authFetch(`/api/actas-entrega/${id}/aceptar`, { method: "POST", body: JSON.stringify({ firma: signature, acepta: true, items: Object.values(reviews) }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "No fue posible aceptar el acta");
      toast.success(body.estado === "aceptada_con_novedades" ? "Acta aceptada con novedades" : "Entrega aceptada");
      await load();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Error inesperado"); }
    finally { setSubmitting(false); }
  };

  const reject = async () => {
    setSubmitting(true);
    try {
      const response = await authFetch(`/api/actas-entrega/${id}/rechazar`, { method: "POST", body: JSON.stringify({ motivo: rejectReason }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "No fue posible rechazar el acta");
      toast.success("Acta rechazada");
      setShowReject(false);
      await load();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Error inesperado"); }
    finally { setSubmitting(false); }
  };

  const downloadPdf = async () => {
    setDownloading(true);
    try {
      await downloadActaPdf(acta);
      toast.success("PDF descargado");
    } catch (error) {
      console.error("Error generando PDF del acta:", error);
      toast.error("No fue posible generar el PDF. Intenta nuevamente.");
    } finally {
      setDownloading(false);
    }
  };

  if (loading) return <div className="relative z-10 p-10 text-center text-muted-foreground">Cargando acta...</div>;
  if (!acta) return <div className="relative z-10 p-10 text-center">Acta no encontrada.</div>;
  const isSender = acta.entregante_id === userId;
  const isReceiver = acta.receptor_id === userId;
  const canReceive = !readOnly && isReceiver && acta.estado === "pendiente_recepcion";

  return (
    <div className="relative z-10 mx-auto max-w-6xl space-y-6 p-4 md:p-8">
      <Button variant="ghost" onClick={() => router.push(admin ? "/administracion/actas-entrega" : "/perfil/actas-entrega")}><ArrowLeft className="mr-2 h-4 w-4" />Volver al listado</Button>
      <div className="rounded-xl border border-gray-200 bg-white/80 p-5 shadow-sm backdrop-blur-sm md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{acta.empresa_nombre}</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900">{acta.numero_acta}</h1><p className="mt-1 text-sm text-muted-foreground">Creada el {new Date(acta.created_at).toLocaleString("es-CO")}</p></div>
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="outline" className="w-fit px-3 py-1">{statusLabel[acta.estado]}</Badge>
            {["completada", "aceptada_con_novedades"].includes(acta.estado) && <Button onClick={downloadPdf} disabled={downloading}><Download className="mr-2 h-4 w-4" />{downloading ? "Generando PDF..." : "Descargar PDF"}</Button>}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-0 shadow-md"><CardHeader><CardTitle className="text-base">Quien entrega</CardTitle></CardHeader><CardContent><p className="font-semibold">{acta.entregante_nombre}</p><p className="text-sm text-muted-foreground">{acta.entregante_cargo}</p><p className="text-sm text-muted-foreground">Documento: {acta.entregante_documento || "No registrado"}</p></CardContent></Card>
        <Card className="border-0 shadow-md"><CardHeader><CardTitle className="text-base">Quien recibe</CardTitle></CardHeader><CardContent><p className="font-semibold">{acta.receptor_nombre}</p><p className="text-sm text-muted-foreground">{acta.receptor_cargo}</p><p className="text-sm text-muted-foreground">Documento: {acta.receptor_documento || "No registrado"}</p></CardContent></Card>
      </div>

      {acta.manifiesto && <Card className="border-cyan-200 bg-cyan-50/70 shadow-sm"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><ScrollText className="h-5 w-5 text-cyan-700" />Manifiesto de responsabilidad</CardTitle></CardHeader><CardContent><p className="whitespace-pre-line text-sm leading-6 text-slate-700">{acta.manifiesto}</p></CardContent></Card>}

      {acta.estado === "rechazada" && <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-800"><div className="flex items-center gap-2 font-semibold"><XCircle className="h-5 w-5" />Acta rechazada</div><p className="mt-2 text-sm">{acta.motivo_rechazo}</p></div>}

      <Card className="border-0 shadow-lg"><CardHeader><CardTitle className="flex items-center gap-2"><PackageCheck className="h-5 w-5 text-[#6b2b16]" />Elementos entregados</CardTitle></CardHeader><CardContent className="space-y-5">
        {acta.actas_entrega_items.map((item: any, index: number) => {
          const review = reviews[item.id];
          const photos = acta.actas_entrega_evidencias.filter((file: any) => file.item_id === item.id);
          return <div key={item.id} className="rounded-xl border bg-white p-4 md:p-5">
            <div className="flex items-start justify-between gap-4"><div><p className="font-semibold text-[#3b2018]">{index + 1}. {item.descripcion}</p><p className="mt-1 text-sm text-muted-foreground">Cantidad: {item.cantidad}{item.serial_identificador ? ` · Identificador: ${item.serial_identificador}` : ""}</p>{item.observaciones_entrega && <p className="mt-2 text-sm">{item.observaciones_entrega}</p>}</div>{item.estado_recepcion && <Badge variant="outline">{item.estado_recepcion.replace("_", " ")}</Badge>}</div>
            {canReceive && review && <div className="mt-5 grid gap-4 border-t pt-4 md:grid-cols-2">
              <label className="flex items-center gap-3 rounded-lg border bg-stone-50 p-3 md:col-span-2"><Checkbox checked={review.recibido} onCheckedChange={(checked) => updateReview(item.id, { recibido: checked === true, estado_recepcion: checked === true ? (review.estado_recepcion === "no_recibido" ? "bueno" : review.estado_recepcion) : "no_recibido" })} /><span className="text-sm font-medium">Confirmo que recibí este ítem</span></label>
              <div className="space-y-2"><Label>Estado del elemento *</Label><Select value={review.estado_recepcion} onValueChange={(value: Review["estado_recepcion"]) => updateReview(item.id, { estado_recepcion: value, recibido: value !== "no_recibido" })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="bueno">Bueno</SelectItem><SelectItem value="regular">Regular</SelectItem><SelectItem value="malo">Malo</SelectItem><SelectItem value="no_recibido">No recibido</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Notas {review.estado_recepcion !== "bueno" && "*"}</Label><Textarea value={review.notas_recepcion} onChange={(event) => updateReview(item.id, { notas_recepcion: event.target.value })} placeholder="Describe daños, faltantes o incidencias" /></div>
            </div>}
            {(canReceive || photos.length > 0) && <div className="mt-4"><div className="mb-2 flex items-center justify-between"><Label>Evidencias fotográficas {canReceive && review?.recibido && "*"}</Label>{canReceive && <label className="inline-flex cursor-pointer items-center rounded-md border px-3 py-2 text-sm font-medium hover:bg-stone-50"><Camera className="mr-2 h-4 w-4" />Agregar foto<input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="hidden" onChange={(event) => { void upload(item.id, event.target.files?.[0]); event.currentTarget.value = ""; }} /></label>}</div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">{photos.map((photo: any) => <div key={photo.id} className="group relative aspect-square overflow-hidden rounded-lg border bg-stone-100"><img src={photo.url} alt={`Evidencia de ${item.descripcion}`} className="h-full w-full object-cover" />{canReceive && <Button size="icon" variant="destructive" className="absolute right-1 top-1 h-7 w-7 opacity-90" onClick={() => removeEvidence(photo.id)}><Trash2 className="h-3.5 w-3.5" /></Button>}</div>)}</div>
            </div>}
            {!canReceive && item.recibido !== null && <p className="mt-3 text-sm font-medium">{item.recibido ? "Recibido" : "No recibido"}</p>}
            {!canReceive && item.notas_recepcion && <div className="mt-4 rounded-lg bg-amber-50 p-3 text-sm"><strong>Notas de recepción:</strong> {item.notas_recepcion}</div>}
          </div>;
        })}
      </CardContent></Card>

      {!readOnly && isSender && acta.estado === "borrador" && <Card className="border-amber-200 shadow-lg"><CardHeader><CardTitle className="flex items-center gap-2"><FileSignature className="h-5 w-5 text-[#6b2b16]" />Firma y envío</CardTitle></CardHeader><CardContent className="space-y-4"><p className="text-sm text-muted-foreground">Al firmar, los datos y elementos quedarán bloqueados y el receptor será notificado.</p><SignaturePad onChange={setSignature} signerName={acta.entregante_nombre} signerDocument={acta.entregante_documento} /><label className="flex items-start gap-3 rounded-lg bg-stone-50 p-4 text-sm"><Checkbox checked={consent} onCheckedChange={(value) => setConsent(value === true)} /><span>Declaro que los elementos relacionados corresponden a la entrega realizada y acepto firmar electrónicamente esta acta.</span></label><Button className="w-full bg-[#441404] hover:bg-[#5c1d0a]" size="lg" disabled={submitting} onClick={send}>{submitting ? "Enviando..." : "Firmar y enviar al receptor"}</Button></CardContent></Card>}

      {canReceive && <Card className="border-amber-200 shadow-lg"><CardHeader><CardTitle className="flex items-center gap-2"><FileSignature className="h-5 w-5 text-[#6b2b16]" />Decisión y firma de recibido</CardTitle></CardHeader><CardContent className="space-y-4"><div className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900"><AlertTriangle className="mr-2 inline h-4 w-4" />Revisa todos los elementos. Los estados distintos de “Bueno” requieren una nota; cada elemento recibido requiere una fotografía.</div><SignaturePad onChange={setSignature} signerName={acta.receptor_nombre} signerDocument={acta.receptor_documento} /><label className="flex items-start gap-3 rounded-lg bg-stone-50 p-4 text-sm"><Checkbox checked={consent} onCheckedChange={(value) => setConsent(value === true)} /><span>{acta.manifiesto ? "Declaro que he leído y acepto el manifiesto de responsabilidad de esta acta, y que la información de recepción registrada es veraz." : "Declaro que revisé los elementos, registré su estado real y acepto firmar electrónicamente esta acta de recibido."}</span></label><div className="flex flex-col gap-3 sm:flex-row"><Button variant="destructive" className="sm:w-1/3" onClick={() => setShowReject((value) => !value)}>Rechazar entrega</Button><Button className="bg-emerald-700 hover:bg-emerald-800 sm:flex-1" disabled={submitting} onClick={accept}><CheckCircle2 className="mr-2 h-4 w-4" />{submitting ? "Procesando..." : "Firmar y aceptar entrega"}</Button></div>{showReject && <div className="space-y-3 rounded-xl border border-red-200 bg-red-50 p-4"><Label>Motivo del rechazo *</Label><Textarea value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} placeholder="Explica claramente por qué no puedes aceptar la entrega" /><Button variant="destructive" disabled={submitting || rejectReason.trim().length < 10} onClick={reject}>Confirmar rechazo</Button></div>}</CardContent></Card>}

      {acta.actas_entrega_firmas.length > 0 && <Card className="border-0 shadow-md"><CardHeader><CardTitle className="text-base">Firmas registradas</CardTitle></CardHeader><CardContent className="grid gap-4 md:grid-cols-2">{acta.actas_entrega_firmas.map((firma: any) => { const isReceiverSignature = firma.rol_firmante === "receptor"; const name = isReceiverSignature ? acta.receptor_nombre : acta.entregante_nombre; const document = isReceiverSignature ? acta.receptor_documento : acta.entregante_documento; return <div key={firma.id} className="rounded-lg border p-4"><p className="mb-2 text-sm font-semibold capitalize">{firma.rol_firmante}</p><img src={firma.url} alt={`Firma del ${firma.rol_firmante}`} className="h-24 max-w-full object-contain" /><p className="mt-3 text-sm font-semibold">{name}</p><p className="text-xs text-muted-foreground">Cédula: {document || "No registrada"}</p><p className="mt-1 text-xs text-muted-foreground">Firmada el {new Date(firma.firmada_at).toLocaleString("es-CO")}</p></div>; })}</CardContent></Card>}
    </div>
  );
}
