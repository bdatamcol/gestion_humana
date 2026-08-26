"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, PackagePlus, Search, Trash2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { authFetch } from "@/lib/authenticated-fetch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface ItemDraft {
  descripcion: string;
  cantidad: number;
  serial_identificador: string;
  observaciones_entrega: string;
}

const emptyItem = (): ItemDraft => ({ descripcion: "", cantidad: 1, serial_identificador: "", observaciones_entrega: "" });

export default function NuevaActaEntregaPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [receptor, setReceptor] = useState<any>(null);
  const [items, setItems] = useState<ItemDraft[]>([emptyItem()]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(async () => {
      const response = await authFetch(`/api/actas-entrega/usuarios?buscar=${encodeURIComponent(search)}`);
      if (response.ok) setUsers(await response.json());
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [search]);

  const updateItem = (index: number, key: keyof ItemDraft, value: string | number) => {
    setItems((current) => current.map((item, position) => position === index ? { ...item, [key]: value } : item));
  };

  const save = async () => {
    if (!receptor) return toast.error("Selecciona quién recibe");
    if (items.some((item) => item.descripcion.trim().length < 2 || item.cantidad < 1)) return toast.error("Completa la descripción y cantidad de todos los ítems");
    setSaving(true);
    try {
      const response = await authFetch("/api/actas-entrega", {
        method: "POST",
        body: JSON.stringify({ receptor_id: receptor.auth_user_id, items }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "No fue posible crear el acta");
      toast.success("Borrador creado. Revisa y firma el acta.");
      router.push(`/perfil/actas-entrega/${body.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error inesperado");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative z-10 mx-auto max-w-5xl space-y-6 p-4 md:p-8">
      <Button variant="ghost" onClick={() => router.back()}><ArrowLeft className="mr-2 h-4 w-4" />Volver</Button>
      <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7d4029]">Nueva solicitud</p><h1 className="mt-1 text-3xl font-semibold text-[#35150c]">Preparar acta de entrega</h1><p className="mt-2 text-muted-foreground">Tu empresa se tomará automáticamente del perfil y quedará guardada como dato histórico.</p></div>

      <Card className="border-0 shadow-lg">
        <CardHeader><CardTitle className="flex items-center gap-2"><UserRound className="h-5 w-5 text-[#6b2b16]" />¿Quién recibe?</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {receptor ? <div className="flex items-start justify-between rounded-xl border border-amber-200 bg-amber-50 p-4"><div><p className="font-semibold text-[#441404]">{receptor.colaborador}</p><p className="text-sm text-muted-foreground">{receptor.cargo} · {receptor.empresa}</p><p className="text-xs text-muted-foreground">{receptor.correo_electronico}</p></div><Button variant="outline" size="sm" onClick={() => setReceptor(null)}>Cambiar</Button></div> : <>
            <div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre, correo o cédula" /></div>
            <div className="max-h-64 divide-y overflow-auto rounded-lg border">{users.map((user) => <button type="button" key={user.auth_user_id} className="block w-full p-3 text-left hover:bg-amber-50" onClick={() => setReceptor(user)}><span className="font-medium">{user.colaborador}</span><span className="ml-2 text-sm text-muted-foreground">{user.cargo} · {user.empresa}</span></button>)}</div>
          </>}
        </CardContent>
      </Card>

      <Card className="border-0 shadow-lg">
        <CardHeader className="flex-row items-center justify-between"><CardTitle className="flex items-center gap-2"><PackagePlus className="h-5 w-5 text-[#6b2b16]" />Elementos a entregar</CardTitle><Button type="button" variant="outline" onClick={() => setItems((current) => [...current, emptyItem()])}><PackagePlus className="mr-2 h-4 w-4" />Agregar ítem</Button></CardHeader>
        <CardContent className="space-y-4">
          {items.map((item, index) => <div key={index} className="rounded-xl border bg-stone-50/70 p-4">
            <div className="mb-4 flex items-center justify-between"><span className="font-semibold text-[#441404]">Ítem {index + 1}</span><Button type="button" variant="ghost" size="icon" disabled={items.length === 1} onClick={() => setItems((current) => current.filter((_, position) => position !== index))}><Trash2 className="h-4 w-4 text-red-600" /></Button></div>
            <div className="grid gap-4 md:grid-cols-[1fr_130px]">
              <div className="space-y-2"><Label>Descripción *</Label><Input value={item.descripcion} maxLength={500} onChange={(event) => updateItem(index, "descripcion", event.target.value)} placeholder="Ej. Computador portátil Lenovo" /></div>
              <div className="space-y-2"><Label>Cantidad *</Label><Input type="number" min={1} value={item.cantidad} onChange={(event) => updateItem(index, "cantidad", Number(event.target.value))} /></div>
              <div className="space-y-2 md:col-span-2"><Label>Serial, placa o identificador</Label><Input value={item.serial_identificador} maxLength={200} onChange={(event) => updateItem(index, "serial_identificador", event.target.value)} placeholder="Opcional" /></div>
              <div className="space-y-2 md:col-span-2"><Label>Observaciones de entrega</Label><Textarea value={item.observaciones_entrega} maxLength={2000} onChange={(event) => updateItem(index, "observaciones_entrega", event.target.value)} placeholder="Accesorios, características u otra información relevante" /></div>
            </div>
          </div>)}
        </CardContent>
      </Card>
      <div className="flex justify-end"><Button size="lg" className="bg-[#441404] hover:bg-[#5c1d0a]" disabled={saving} onClick={save}>{saving ? "Guardando..." : "Guardar y continuar a firma"}</Button></div>
    </div>
  );
}
