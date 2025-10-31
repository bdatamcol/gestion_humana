"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { createSupabaseClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { MessageSquare, Send, UserIcon, Smile, X } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

interface Comentario {
  id: number
  usuario_id: string
  nombre_usuario: string
  avatarUrl: string
  contenido: string
  fecha: string
  respuesta_a: number | null
  respuestas?: Comentario[]
}

interface UserState {
  id: string
  nombre: string
  avatarUrl: string
}

const commonEmojis = [
  "👍","👏","❤️","🎉","🙌","😊","👌",
  "✅","✨","🔥","💯","⭐","🤔","😂",
  "😍","👀","🙏","💪","👉","👈",
  "🚀","💼","📝","📊",
]

export function ComentariosPermisos({ solicitudId, isAdmin }: { solicitudId?: string; isAdmin?: boolean }) {
  const supabase = createSupabaseClient()

  const [comentarios, setComentarios] = useState<Comentario[]>([])
  const [nuevoComentario, setNuevoComentario] = useState("")
  const [respondiendoA, setRespondiendoA] = useState<number | null>(null)
  const [respuestaTexto, setRespuestaTexto] = useState("")
  const [loading, setLoading] = useState(false)
  const [errorFetch, setErrorFetch] = useState<string | null>(null)
  const [user, setUser] = useState<UserState | null>(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [expandedComments, setExpandedComments] = useState<Record<number, boolean>>({})
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showReplyEmojiPicker, setShowReplyEmojiPicker] = useState(false)
  const [unreadCount, setUnreadCount] = useState<number>(0)

  const rootRef = useRef<HTMLDivElement>(null)

  // 1) Cargo info de usuario actual
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: authUser } }) => {
      if (!authUser) return
      supabase
        .from("usuario_nomina")
        .select("colaborador, avatar_path, genero")
        .eq("auth_user_id", authUser.id)
        .single()
        .then(({ data: perfil }) => {
          const nombre: string = String(perfil?.colaborador || "Usuario")
          const path = perfil?.avatar_path
          const gender = perfil?.genero
          let avatarUrl: string

          if (path && typeof path === 'string') {
            const { data } = supabase.storage.from("avatar").getPublicUrl(path)
            avatarUrl = data.publicUrl
          } else if (gender === "F") {
            const { data } = supabase.storage.from("avatar").getPublicUrl("defecto/avatar-f.webp")
            avatarUrl = data.publicUrl
          } else {
            const { data } = supabase.storage.from("avatar").getPublicUrl("defecto/avatar-m.webp")
            avatarUrl = data.publicUrl
          }

          setUser({ id: authUser.id, nombre: nombre, avatarUrl: avatarUrl })
        })
    })
  }, [supabase])

  // 2) Fetch árbol de comentarios
  const fetchComentarios = useCallback(async () => {
    if (!solicitudId) return
    setLoading(true)
    const { data, error } = await supabase
      .from("comentarios_permisos")
      .select(
        `id, usuario_id, contenido, fecha_creacion, respuesta_a, visto_admin, usuario_nomina!inner(colaborador, avatar_path, genero)`
      )
      .eq("solicitud_id", solicitudId)
      .order("fecha_creacion", { ascending: false })

    if (error) {
      console.error(error)
      setErrorFetch(error.message)
      setComentarios([])
      setLoading(false)
      return
    }

    const mapComentarios = new Map<number, Comentario>()
    data.forEach((c: any) => {
      const nombre = c.usuario_nomina?.colaborador ?? "Usuario"
      const path = c.usuario_nomina?.avatar_path
      const gender = c.usuario_nomina?.genero
      let avatarUrl: string

      if (path && typeof path === 'string') {
            const { data } = supabase.storage.from("avatar").getPublicUrl(path)
            avatarUrl = data.publicUrl
          } else if (gender === "F") {
            const { data } = supabase.storage.from("avatar").getPublicUrl("defecto/avatar-f.webp")
            avatarUrl = data.publicUrl
          } else {
            const { data } = supabase.storage.from("avatar").getPublicUrl("defecto/avatar-m.webp")
            avatarUrl = data.publicUrl
          }

      mapComentarios.set(c.id, {
        id: c.id,
        usuario_id: c.usuario_id,
        nombre_usuario: nombre,
        avatarUrl,
        contenido: c.contenido,
        fecha: c.fecha_creacion,
        respuesta_a: c.respuesta_a,
        respuestas: [],
      })
    })

    const roots: Comentario[] = []
    data.forEach((c: any) => {
      const nodo = mapComentarios.get(c.id)!
      if (c.respuesta_a && mapComentarios.has(c.respuesta_a)) {
        mapComentarios.get(c.respuesta_a)!.respuestas!.push(nodo)
      } else {
        roots.push(nodo)
      }
    })

    setComentarios(roots)
    setLoading(false)
  }, [solicitudId, supabase])

  // 3) Fetch contador mensajes sin leer
  const fetchUnreadCount = useCallback(async () => {
    if (!solicitudId || !isAdmin) return
    const { count } = await supabase
      .from("comentarios_permisos")
      .select("id", { count: 'exact', head: true })
      .eq("solicitud_id", solicitudId)
      .eq("visto_admin", false)
    setUnreadCount(count ?? 0)
  }, [solicitudId, isAdmin, supabase])

  // 4) Fetch inicial
  useEffect(() => {
    fetchComentarios()
    fetchUnreadCount()
  }, [fetchComentarios, fetchUnreadCount])

  // 5) Marcar como leídos al montar
  useEffect(() => {
    if (solicitudId && isAdmin) {
      supabase
        .from("comentarios_permisos")
        .update({ visto_admin: true })
        .eq("solicitud_id", solicitudId)
        .eq("visto_admin", false)
        .then(() => fetchUnreadCount())
    }
  }, [solicitudId, isAdmin, supabase, fetchUnreadCount])

  // 6) Realtime
  useEffect((): (() => void) => {
    if (!solicitudId) return () => {}
    const channel = supabase
      .channel("realtime_comentarios_permisos")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "comentarios_permisos", filter: `solicitud_id=eq.${solicitudId}` },
        () => {
          fetchComentarios()
          fetchUnreadCount()
        }
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [solicitudId, supabase, fetchComentarios, fetchUnreadCount])

  // 7) Publicar comentario raíz
  const handleComentar = async () => {
    if (!user || !nuevoComentario.trim() || !solicitudId) return
    setLoading(true)
    await supabase.from("comentarios_permisos").insert({
      solicitud_id: solicitudId,
      usuario_id: user.id,
      contenido: nuevoComentario.trim(),
      respuesta_a: null,
      visto_admin: isAdmin === true,
      visto_usuario: isAdmin !== true,
    })
    setNuevoComentario("")
    setShowConfirmModal(false)
    await fetchComentarios()
    setTimeout(() => rootRef.current?.scrollIntoView({ behavior: "smooth" }), 100)
    setLoading(false)
  }

  // 8) Publicar respuesta
  const handleResponder = async (parentId: number) => {
    if (!user || !respuestaTexto.trim() || !solicitudId) return
    setLoading(true)
    await supabase.from("comentarios_permisos").insert({
      solicitud_id: solicitudId,
      usuario_id: user.id,
      contenido: respuestaTexto.trim(),
      respuesta_a: parentId,
      visto_admin: isAdmin === true,
      visto_usuario: isAdmin !==	true,
    })
    setRespuestaTexto("")
    setRespondiendoA(null)
    await fetchComentarios()
    setTimeout(() => rootRef.current?.scrollIntoView({ behavior: "smooth" }), 100)
    setLoading(false)
  }

  // 9) Formatear fechas
  const formatDate = (iso: string) => {
    const then = new Date(iso)
    const diff = Date.now() - then.getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return "Hace un momento"
    if (mins < 60) return `Hace ${mins} minuto${mins === 1 ? "" : "s"}`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `Hace ${hrs} hora${hrs === 1 ? "" : "s"}`
    const days = Math.floor(hrs / 24)
    if (days < 7) return `Hace ${days} día${days === 1 ? "" : "s"}`
    return then.toLocaleDateString("es-ES", { year: "numeric", month: "short", day: "numeric" })
  }

  // 10) Emojis
  const insertEmoji = (e: string) => { setNuevoComentario(n => n + e); setShowEmojiPicker(false) }
  const insertReplyEmoji = (e: string) => { setRespuestaTexto(t => t + e); setShowReplyEmojiPicker(false) }

  // 11) Render respuestas anidadas
  const renderRespuestas = (resps: Comentario[]) => (
    <div className="space-y-3 mt-2">
      {resps.map(r => (
        <div key={r.id} className="group">
          <div className="flex gap-2">
            <img src={r.avatarUrl} alt={r.nombre_usuario} className="h-8 w-8 rounded-full object-cover" />
            <div className="flex-1 min-w-0">
              <div className="bg-gray-100 rounded-lg px-3 py-2">
                <div className="font-medium text-sm text-[#441404]">{r.nombre_usuario}</div>
                <p className="text-sm whitespace-pre-line break-words">{r.contenido}</p>
              </div>
              <div className="flex items-center gap-2 mt-1 pl-2 text-xs">
                <span className="text-gray-500">{formatDate(r.fecha)}</span>
              </div>
              {r.respuestas && r.respuestas.length > 0 && renderRespuestas(r.respuestas)}
            </div>
          </div>
        </div>
      ))}
    </div>
  )

  if (!solicitudId) {
    return (
      <div className="p-6 text-center text-red-600 bg-red-50 rounded-lg">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mb-3">⚠️</div>
        <p className="font-medium">Error: no recibí el ID de la solicitud.</p>
        <p className="text-sm mt-1">
          Asegúrate de pasar <code className="bg-red-100 px-1 py-0.5 rounded">solicitudId</code>.
        </p>
      </div>
    )
  }

  return (
    <div ref={rootRef} className="bg-white rounded-lg shadow">
      <div className="border-b px-4 py-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-[#441404]" />
          <span>Comentarios de permiso</span>
        </h2>
      </div>

      <div className="bg-gray-100 p-4">
        {user ? (
          <>
            <div className="flex gap-3 mb-4 bg-white p-3 rounded-lg shadow-sm">
              <img src={user.avatarUrl} alt={user.nombre} className="h-10 w-10 rounded-full object-cover" />
              <div className="flex-1">
                <Textarea
                  rows={1}
                  className="resize-none border-0 bg-gray-100 p-2 focus-visible:ring-0 text-sm placeholder:text-gray-500"
                  placeholder={`¿Qué estás pensando, ${user.nombre}?`}
                  value={nuevoComentario}
                  onChange={e => setNuevoComentario(e.target.value)}
                />
                <div className="flex items-center justify-between mt-2">
                  <div className="relative">
                    <button onClick={() => setShowEmojiPicker(v => !v)} className="p-1 rounded-full hover:bg-gray-200"><Smile className="h-5 w-5 text-gray-500" /></button>
                    {showEmojiPicker && (
                      <div className="absolute top-full left-0 mt-2 bg-white border rounded-lg shadow-lg p-2 z-50 w-64">
                        <div className="flex justify-between items-center mb-2 pb-2 border-b">
                          <span className="font-medium text-sm">Emojis</span>
                          <button onClick={() => setShowEmojiPicker(false)}><X className="h-4 w-4 text-gray-500" /></button>
                        </div>
                        <div className="grid grid-cols-6 gap-1">
                          {commonEmojis.map(e => (<button key={e} onClick={() => insertEmoji(e)} className="text-xl p-1 hover:bg-gray-100 rounded">{e}</button>))}
                        </div>
                      </div>
                    )}
                  </div>
                  <Button size="sm" disabled={!nuevoComentario.trim()} onClick={() => setShowConfirmModal(true)} className="rounded-full bg-[#441404] hover:bg-[#5a1a05]"><Send className="h-4 w-4" /></Button>
                </div>
              </div>
            </div>

            <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Confirmar publicación</DialogTitle>
                  <DialogDescription>
                    ¿Seguro que quieres publicar este comentario?
                    <br /><strong>No podrás eliminarlo luego.</strong>
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowConfirmModal(false)}>Cancelar</Button>
                  <Button onClick={handleComentar} disabled={loading} className="bg-[#441404] hover:bg-[#5a1a05]">Confirmar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        ) : (
          <div className="bg-white p-4 rounded-lg text-center mb-4 shadow-sm">
            <UserIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="font-medium text-gray-700">Inicia sesión para comentar</p>
            <p className="text-sm text-gray-500">Necesitas una cuenta para participar</p>
          </div>
        )}

        {errorFetch && (
          <div className="bg-red-50 p-4 rounded-lg text-red-600 mb-4">
            <p className="font-medium">Error al cargar comentarios:</p>
            <p className="text-sm">{errorFetch}</p>
          </div>
        )}

        {loading && comentarios.length === 0 ? (
          <div className="flex flex-col items-center py-8">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#441404] border-t-transparent mb-4" />
            <p className="text-gray-500">Cargando comentarios...</p>
          </div>
        ) : comentarios.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-2" />
            <p className="font-medium text-gray-700">No hay comentarios aún</p>
            <p className="text-sm text-gray-500">Sé el primero en comentar</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4 px-1">
              <span className="text-sm font-medium text-gray-700">{comentarios.length} {comentarios.length === 1 ? "comentario" : "comentarios"}</span>
              <Badge variant="outline" className="bg-white text-xs">Más recientes primero</Badge>
            </div>
            <div className="space-y-4">
              {comentarios.map(c => (
                <div key={c.id} className="bg-white rounded-lg shadow-sm p-3">
                  <div className="flex gap-2">
                    <img src={c.avatarUrl} alt={c.nombre_usuario} className="h-10 w-10 rounded-full object-cover" />
                    <div className="flex-1">
                      <div className="bg-gray-100 rounded-lg px-4 py-2">
                        <div className="font-medium text-[#441404]">{c.nombre_usuario}</div>
                        <p className="whitespace-pre-line">{c.contenido}</p>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                        <button onClick={() => { setRespondiendoA(c.id); setRespuestaTexto(""); }} className="hover:text-gray-700">Responder</button>
                        <span>·</span>
                        <span>{formatDate(c.fecha)}</span>
                      </div>

                      {respondiendoA === c.id && (
                        <div className="mt-3 pl-2">
                          <div className="flex gap-2 items-start">
                            <img src={user?.avatarUrl} alt={user?.nombre} className="h-8 w-8 rounded-full" />
                            <div className="flex-1 bg-gray-100 rounded-lg p-2">
                              <Textarea rows={1} className="resize-none border-0 bg-transparent focus-visible:ring-0 text-sm" placeholder="Escribe una respuesta..." value={respuestaTexto} onChange={e => setRespuestaTexto(e.target.value)} />
                              <div className="flex justify-between items-center mt-2">
                                <div className="relative">
                                  <button onClick={() => setShowReplyEmojiPicker(v => !v)} className="p-1 rounded-full hover:bg-gray-200"><Smile className="h-5 w-5 text-gray-500" /></button>
                                  {showReplyEmojiPicker && (
                                    <div className="absolute top-full left-0 mt-2 bg-white border rounded-lg shadow-lg p-2 z-50 w-64">
                                      <div className="flex justify-between items-center mb-2 pb-2 border-b">
                                        <span className="font-medium text-sm">Emojis</span>
                                        <button onClick={() => setShowReplyEmojiPicker(false)}><X className="h-4 w-4 text-gray-500" /></button>
                                      </div>
                                      <div className="grid grid-cols-6 gap-1">
                                        {commonEmojis.map(e => (<button key={e} onClick={() => insertReplyEmoji(e)} className="text-xl p-1 hover:bg-gray-100 rounded">{e}</button>))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                                <div className="flex gap-2">
                                  <Button size="sm" variant="ghost" onClick={() => setRespondiendoA(null)}>Cancelar</Button>
                                  <Button size="sm" onClick={() => handleResponder(c.id)} disabled={loading || !respuestaTexto.trim()} className="bg-[#441404] hover:bg-[#5a1a05]">Responder</Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {c.respuestas && c.respuestas.length > 0 && (
                        <div className="mt-3 pl-12">
                          {!expandedComments[c.id] ? (
                            <button onClick={() => setExpandedComments(e => ({ ...e, [c.id]: true }))} className="font-medium text-sm text-[#441404] mb-2 flex items-center gap-1">▶ Ver {c.respuestas.length} {c.respuestas.length === 1 ? "respuesta" : "respuestas"}</button>
                          ) : (
                            <>
                              {renderRespuestas(c.respuestas!)}
                              {c.respuestas.length > 2 && (<button onClick={() => setExpandedComments(e => ({ ...e, [c.id]: false }))} className="font-medium text-sm text-[#441404] mt-1">▼ Ocultar respuestas</button>)}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {comentarios.length > 10 && (<div className="flex justify-center mt-4"><Button variant="outline" size="sm">Ver más comentarios</Button></div>)}
          </>
        )}
      </div>
    </div>
  )
}
