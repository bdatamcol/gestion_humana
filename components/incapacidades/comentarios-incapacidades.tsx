"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { createSupabaseClient } from "@/lib/supabase"
import { getAvatarUrl } from "@/lib/avatar-utils"
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
  fecha_creacion: string
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
  "😍","👀","🙏","💪","👉","👈","🚀",
  "💼","📝","📊",
]

const supabase = createSupabaseClient()

export function ComentariosIncapacidades({ incapacidadId }: { incapacidadId?: string }) {
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
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const replyTextareaRef = useRef<HTMLTextAreaElement>(null)

  // Cargar usuario actual
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: authUser } }) => {
      if (!authUser) return
      supabase
        .from("usuario_nomina")
        .select("colaborador, avatar_path, genero")
        .or(`auth_user_id.eq.${authUser.id},user_id.eq.${authUser.id}`)
        .single()
        .then(({ data: perfil }) => {
          const nombre: string = String(perfil?.colaborador || "Usuario")
          const path = perfil?.avatar_path as string | null
          const gender = perfil?.genero as string | null
          const avatarUrl = getAvatarUrl(path, gender)
          setUser({ id: authUser.id, nombre: nombre, avatarUrl: avatarUrl })
        })
    })
  }, [])

  // Traer comentarios y armar árbol
  const fetchComentarios = useCallback(async () => {
    if (!incapacidadId) return
    setLoading(true)
    setErrorFetch(null)

    const { data, error } = await supabase
      .from("comentarios_incapacidades")
      .select(`
        id,
        usuario_id,
        contenido,
        fecha_creacion,
        respuesta_a,
        usuario_nomina!inner(colaborador, avatar_path, genero)
      `)
      .eq("incapacidad_id", incapacidadId)
      .order("fecha_creacion", { ascending: false })

    if (error) {
      console.error(error)
      setErrorFetch(error.message)
      setComentarios([])
      setLoading(false)
      return
    }

    const nodoMap = new Map<number, Comentario>()
    data.forEach((c: any) => {
      const nombre = c.usuario_nomina?.colaborador ?? "Usuario"
      const path = c.usuario_nomina?.avatar_path
      const gender = c.usuario_nomina?.genero
      let avatarUrl: string
           if (path && typeof path === 'string') {
             const { data } = supabase.storage.from("avatar").getPublicUrl(path)
             avatarUrl = data.publicUrl
           } else {
             const { data } = supabase.storage.from("avatar").getPublicUrl(gender === "F" ? "defecto/avatar-f.webp" : "defecto/avatar-m.webp")
             avatarUrl = data.publicUrl
           }

      nodoMap.set(c.id, {
        id: c.id,
        usuario_id: c.usuario_id,
        nombre_usuario: nombre,
        avatarUrl,
        contenido: c.contenido,
        fecha_creacion: c.fecha_creacion,
        respuesta_a: c.respuesta_a,
        respuestas: [],
      })
    })

    const roots: Comentario[] = []
    data.forEach((c: any) => {
      const nodo = nodoMap.get(c.id)!
      if (c.respuesta_a && nodoMap.has(c.respuesta_a)) {
        nodoMap.get(c.respuesta_a)!.respuestas!.push(nodo)
      } else {
        roots.push(nodo)
      }
    })

    setComentarios(roots)
    setLoading(false)
  }, [incapacidadId])

  useEffect(() => {
    fetchComentarios()
  }, [fetchComentarios])

  // Realtime
  useEffect(() => {
    if (!incapacidadId) return
    const channel = supabase
      .channel("realtime_comentarios_incapacidades")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "comentarios_incapacidades",
          filter: `incapacidad_id=eq.${incapacidadId}`,
        },
        () => {
          fetchComentarios()
        }
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [incapacidadId, fetchComentarios])

  // Publicar comentario raíz
  const handleComentar = async () => {
    if (!user || !nuevoComentario.trim() || !incapacidadId) return
    setLoading(true)
    
    const { error } = await supabase.from("comentarios_incapacidades").insert({
      incapacidad_id: incapacidadId,
      usuario_id: user.id,
      contenido: nuevoComentario,
      respuesta_a: null,
    })
    
    if (error) {
      console.error('Error al guardar comentario:', error)
      setErrorFetch(`Error al guardar comentario: ${error.message}`)
    } else {
      setNuevoComentario("")
      setShowConfirmModal(false)
      setErrorFetch(null)
    }
    
    setLoading(false)
  }

  // Publicar respuesta
  const handleResponder = async (parentId: number) => {
    if (!user || !respuestaTexto.trim() || !incapacidadId) return
    setLoading(true)
    
    const { error } = await supabase.from("comentarios_incapacidades").insert({
      incapacidad_id: incapacidadId,
      usuario_id: user.id,
      contenido: respuestaTexto,
      respuesta_a: parentId,
    })
    
    if (error) {
      console.error('Error al guardar respuesta:', error)
      setErrorFetch(`Error al guardar respuesta: ${error.message}`)
    } else {
      setRespuestaTexto("")
      setRespondiendoA(null)
      setErrorFetch(null)
    }
    
    setLoading(false)
  }

  // Formatear fecha
  const formatDate = (iso: string) => {
    const then = new Date(iso)
    const now = new Date()
    const diff = now.getTime() - then.getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return "Hace un momento"
    if (mins < 60) return `Hace ${mins} minuto${mins === 1 ? "" : "s"}`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `Hace ${hrs} hora${hrs === 1 ? "" : "s"}`
    const days = Math.floor(hrs / 24)
    if (days < 7) return `Hace ${days} día${days === 1 ? "" : "s"}`
    return then.toLocaleDateString("es-ES", { year: "numeric", month: "short", day: "numeric" })
  }

  const insertEmoji = (emoji: string) => {
    setNuevoComentario((t) => t + emoji)
    setShowEmojiPicker(false)
  }
  const insertReplyEmoji = (emoji: string) => {
    setRespuestaTexto((t) => t + emoji)
    setShowReplyEmojiPicker(false)
  }

  if (!incapacidadId) {
    return (
      <div className="p-6 text-center text-red-600 bg-red-50 rounded-lg">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mb-3">⚠️</div>
        <p className="font-medium">Error: no recibí el ID de la incapacidad.</p>
        <p className="text-sm mt-1">
          Asegúrate de pasar <code className="bg-red-100 px-1 py-0.5 rounded">incapacidadId</code>.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="border-b px-4 py-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-[#441404]" />
          <span>Comentarios de incapacidades</span>
        </h2>
      </div>

      <div className="bg-gray-100 p-4">
        {user ? (
          <>
            {/* Nuevo comentario */}
            <div className="flex gap-3 mb-4 bg-white p-3 rounded-lg shadow-sm">
              <div className="flex-shrink-0">
                <img
                  src={user.avatarUrl || "/placeholder.svg"}
                  alt={user.nombre}
                  className="h-10 w-10 rounded-full object-cover"
                />
              </div>
              <div className="flex-1">
                <div className="bg-gray-100 rounded-lg flex items-center px-4 py-2">
                  <Textarea
                    ref={textareaRef}
                    rows={1}
                    className="resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 p-0 placeholder:text-gray-500 text-sm"
                    placeholder={`¿Qué estás pensando, ${user.nombre}?`}
                    value={nuevoComentario}
                    onChange={(e) => setNuevoComentario(e.target.value)}
                  />
                </div>
                <div className="flex items-center justify-between mt-3 px-1">
                  <div className="flex gap-2 relative">
                    <button
                      className="p-2 rounded-full hover:bg-gray-100 text-gray-500"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    >
                      <Smile className="h-5 w-5" />
                    </button>
                    {showEmojiPicker && (
                      <div className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-lg border p-3 z-50 w-64">
                        <div className="flex justify-between items-center mb-2 pb-2 border-b">
                          <h3 className="text-sm font-medium">Emojis</h3>
                          <button
                            onClick={() => setShowEmojiPicker(false)}
                            className="text-gray-500 hover:text-gray-700"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="grid grid-cols-6 gap-2">
                          {commonEmojis.map((emoji) => (
                            <button
                              key={emoji}
                              onClick={() => insertEmoji(emoji)}
                              className="text-xl p-1 hover:bg-gray-100 rounded"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <Button
                    onClick={() => setShowConfirmModal(true)}
                    disabled={!nuevoComentario.trim()}
                    size="sm"
                    className="rounded-full bg-[#441404] hover:bg-[#5a1a05]"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Confirmar publicación</DialogTitle>
                  <DialogDescription>
                    ¿Seguro que quieres publicar este comentario? <br />
                    <strong>No podrás eliminarlo luego.</strong>
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowConfirmModal(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleComentar} disabled={loading} className="bg-[#441404] hover:bg-[#5a1a05]">
                    Confirmar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        ) : (
          <div className="bg-white p-4 rounded-lg text-center mb-4 shadow-sm">
            <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
              <UserIcon className="h-8 w-8 text-gray-400" />
            </div>
            <p className="text-gray-700 font-medium">Inicia sesión para comentar</p>
            <p className="text-gray-500 text-sm mt-1">Necesitas una cuenta para participar.</p>
          </div>
        )}

        {errorFetch && (
          <div className="text-center text-red-600 mb-4 bg-red-50 p-4 rounded-lg">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="h-5 w-5 rounded-full bg-red-100 flex items-center justify-center">❌</div>
              <span className="font-medium">Error al cargar comentarios</span>
            </div>
            <p className="text-sm">{errorFetch}</p>
          </div>
        )}

        {loading && comentarios.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 bg-white rounded-lg shadow-sm">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#441404] border-t-transparent mb-4" />
            <p className="text-gray-500">Cargando comentarios...</p>
          </div>
        ) : comentarios.length === 0 ? (
          <div className="text-center py-8 bg-white rounded-lg shadow-sm">
            <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
              <MessageSquare className="h-8 w-8 text-gray-300" />
            </div>
            <p className="text-gray-700 font-medium">No hay comentarios aún</p>
            <p className="text-gray-500 text-sm mt-1">Sé el primero en comentar sobre esta incapacidad</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4 px-1">
              <h3 className="font-medium text-sm text-gray-700">
                {comentarios.length} {comentarios.length === 1 ? "comentario" : "comentarios"}
              </h3>
              <Badge variant="outline" className="bg-white text-xs">
                Más recientes primero
              </Badge>
            </div>
            <div className="space-y-4">
              {comentarios.map((c) => (
                <div key={c.id} className="bg-white rounded-lg shadow-sm p-3">
                  <div className="flex gap-2">
                    <div className="flex-shrink-0">
                      <img
                        src={c.avatarUrl || "/placeholder.svg"}
                        alt={c.nombre_usuario}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="bg-gray-100 rounded-lg px-4 py-2">
                        <div className="font-medium text-[#441404]">{c.nombre_usuario}</div>
                        <p className="whitespace-pre-line break-words">{c.contenido}</p>
                      </div>
                      <div className="flex items-center gap-2 mt-1 pl-2 text-xs">
                        <button
                          className="font-medium text-gray-500 hover:text-gray-700"
                          onClick={() => {
                            setRespondiendoA(c.id)
                            setRespuestaTexto("")
                          }}
                        >
                          Responder
                        </button>
                        <span className="text-gray-500">·</span>
                        <span className="text-gray-500">{formatDate(c.fecha_creacion)}</span>
                      </div>

                      {respondiendoA === c.id && (
                        <div className="mt-3 pl-2">
                          <div className="flex gap-2 items-start">
                            <div className="flex-shrink-0">
                              <img
                                src={user?.avatarUrl || "/placeholder.svg"}
                                alt={user?.nombre || "Usuario"}
                                className="h-8 w-8 rounded-full object-cover"
                              />
                            </div>
                            <div className="flex-1 bg-gray-100 rounded-lg p-2">
                              <Textarea
                                ref={replyTextareaRef}
                                rows={1}
                                className="resize-none text-sm border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 p-0"
                                placeholder="Escribe una respuesta..."
                                value={respuestaTexto}
                                onChange={(e) => setRespuestaTexto(e.target.value)}
                              />
                              <div className="flex justify-between items-center mt-2">
                                <div className="relative">
                                  <button
                                    className="p-1 rounded-full hover:bg-gray-200 text-gray-500"
                                    onClick={() => setShowReplyEmojiPicker(!showReplyEmojiPicker)}
                                  >
                                    <Smile className="h-5 w-5" />
                                  </button>
                                  {showReplyEmojiPicker && (
                                    <div className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-lg border p-3 z-50 w-64">
                                      <div className="flex justify-between items-center mb-2 pb-2 border-b">
                                        <h3 className="text-sm font-medium">Emojis</h3>
                                        <button
                                          onClick={() => setShowReplyEmojiPicker(false)}
                                          className="text-gray-500 hover:text-gray-700"
                                        >
                                          <X className="h-4 w-4" />
                                        </button>
                                      </div>
                                      <div className="grid grid-cols-6 gap-2">
                                        {commonEmojis.map((emoji) => (
                                          <button
                                            key={emoji}
                                            onClick={() => insertReplyEmoji(emoji)}
                                            className="text-xl p-1 hover:bg-gray-100 rounded"
                                          >
                                            {emoji}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setRespondiendoA(null)}
                                    className="h-8 text-xs rounded-full"
                                  >
                                    Cancelar
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => handleResponder(c.id)}
                                    disabled={loading || !respuestaTexto.trim()}
                                    className="h-8 text-xs rounded-full bg-[#441404] hover:bg-[#5a1a05]"
                                  >
                                    Responder
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {c.respuestas && c.respuestas.length > 0 && (
                        <div className="mt-3 pl-12">
                          {!expandedComments[c.id] && (
                            <button
                              className="flex items-center gap-2 text-[#441404] font-medium text-sm mb-2"
                              onClick={() => setExpandedComments((e) => ({ ...e, [c.id]: true }))}
                            >
                              <div className="w-6 h-0.5 bg-gray-300" />
                              Ver {c.respuestas.length} {c.respuestas.length === 1 ? "respuesta" : "respuestas"}
                            </button>
                          )}
                          {expandedComments[c.id] && (
                            <>
                              {c.respuestas!.map((r) => (
                                <div key={r.id} className="group space-y-3 mt-2">
                                  <div className="flex gap-2">
                                    <div className="flex-shrink-0">
                                      <img
                                        src={r.avatarUrl || "/placeholder.svg"}
                                        alt={r.nombre_usuario}
                                        className="h-8 w-8 rounded-full object-cover"
                                      />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="bg-gray-100 rounded-lg px-3 py-2">
                                        <div className="font-medium text-sm text-[#441404]">{r.nombre_usuario}</div>
                                        <p className="text-sm whitespace-pre-line break-words">
                                          {r.contenido}
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-2 mt-1 pl-2 text-xs">
                                        <span className="text-gray-500">{formatDate(r.fecha_creacion)}</span>
                                      </div>
                                      {r.respuestas && r.respuestas.length > 0 && (
                                        <div className="mt-2 pl-4">
                                          {/* Puedes anidar más si quieres */}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                              {c.respuestas.length > 2 && (
                                <button
                                  className="text-[#441404] font-medium text-sm mt-1 ml-2"
                                  onClick={() => setExpandedComments((e) => ({ ...e, [c.id]: false }))}
                                >
                                  Ocultar respuestas
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {comentarios.length > 10 && (
          <div className="py-3 px-4 flex justify-center mt-4">
            <Button
              variant="outline"
              size="sm"
              className="rounded-lg bg-white text-[#441404] border-gray-300"
            >
              Ver más comentarios
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
