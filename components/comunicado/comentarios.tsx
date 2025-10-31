"use client"

import { useEffect, useState } from "react"
import { createSupabaseClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { MessageSquare, Reply, Send, UserIcon, ChevronDown, ChevronUp } from "lucide-react"
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
  comentario: string
  fecha: string
  respuesta_a: number | null
  respuestas?: Comentario[]
}

interface UserState {
  id: string
  nombre: string
  avatarUrl: string
}

// Creamos una única instancia de Supabase al cargar el módulo
const supabase = createSupabaseClient()

export function ComentariosComunicados({ comunicadoId }: { comunicadoId: string }) {
  const [comentarios, setComentarios] = useState<Comentario[]>([])
  const [nuevoComentario, setNuevoComentario] = useState("")
  const [respondiendoA, setRespondiendoA] = useState<number | null>(null)
  const [respuestaTexto, setRespuestaTexto] = useState("")
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<UserState | null>(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [expandedComments, setExpandedComments] = useState<Record<number, boolean>>({})

  // Alterna visibilidad de respuestas
  const toggleRespuestas = (comentarioId: number) => {
    setExpandedComments((prev) => ({
      ...prev,
      [comentarioId]: !prev[comentarioId],
    }))
  }

  // Carga datos de usuario actual (tanto si usa auth_user_id como user_id)
  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()
      if (!authUser) return

      const { data: perfil, error } = await supabase
        .from("usuario_nomina")
        .select("colaborador, avatar_path, genero")
        // buscamos por auth_user_id O por user_id
        .or(`auth_user_id.eq.${authUser.id},user_id.eq.${authUser.id}`)
        .single()

      const nombre: string = perfil?.colaborador ? String(perfil.colaborador) : 'Usuario'
      const path   = perfil?.avatar_path
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
    }
    fetchUser()
  }, [])

  // Carga comentarios cada vez que cambia el comunicadoId
  useEffect(() => {
    fetchComentarios()
  }, [comunicadoId])

  const fetchComentarios = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from("comentarios_comunicados")
      .select(`
        id,
        usuario_id,
        comentario,
        fecha,
        respuesta_a,
        usuario_nomina:usuario_id (
          colaborador,
          avatar_path,
          genero
        )
      `)
      .eq("comunicado_id", comunicadoId)
      .order("fecha", { ascending: false })

    if (!error && data) {
      const map: Record<number, Comentario> = {}
      const roots: Comentario[] = []

      data.forEach((c: any) => {
        const nombre = c.usuario_nomina?.colaborador || "Usuario"
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

        map[c.id] = {
          id: c.id,
          usuario_id: c.usuario_id,
          nombre_usuario: nombre,
          avatarUrl,
          comentario: c.comentario,
          fecha: c.fecha,
          respuesta_a: c.respuesta_a,
          respuestas: [],
        }
      })

      Object.values(map).forEach((c) => {
        if (c.respuesta_a && map[c.respuesta_a]) {
          map[c.respuesta_a].respuestas!.push(c)
        } else {
          roots.push(c)
        }
      })

      setComentarios(roots)
    }
    setLoading(false)
  }

  const handleComentar = async () => {
    if (!nuevoComentario.trim() || !user) return
    setLoading(true)
    await supabase.from("comentarios_comunicados").insert({
      comunicado_id: comunicadoId,
      usuario_id: user.id,
      comentario: nuevoComentario,
      respuesta_a: null,
    })
    setNuevoComentario("")
    setShowConfirmModal(false)
    await fetchComentarios()
    setLoading(false)
  }

  const handleResponder = async (comentarioId: number) => {
    if (!respuestaTexto.trim() || !user) return
    setLoading(true)
    await supabase.from("comentarios_comunicados").insert({
      comunicado_id: comunicadoId,
      usuario_id: user.id,
      comentario: respuestaTexto,
      respuesta_a: comentarioId,
    })
    setRespuestaTexto("")
    setRespondiendoA(null)
    setExpandedComments((prev) => ({ ...prev, [comentarioId]: true }))
    await fetchComentarios()
    setLoading(false)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return "Hace un momento"
    if (diffMins < 60) return `Hace ${diffMins} minuto${diffMins === 1 ? "" : "s"}`
    if (diffHours < 24) return `Hace ${diffHours} hora${diffHours === 1 ? "" : "s"}`
    if (diffDays < 7) return `Hace ${diffDays} día${diffDays === 1 ? "" : "s"}`

    return date.toLocaleDateString("es-ES", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const renderRespuestas = (respuestas: Comentario[]) => (
    <div className="space-y-3 mt-3 pl-4 ml-4 border-l-2 border-slate-200">
      {respuestas.map((respuesta) => (
        <div key={respuesta.id}>
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 mt-1 rounded-full overflow-hidden">
                  <img
                    src={respuesta.avatarUrl || "/placeholder.svg"}
                    alt={respuesta.nombre_usuario}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-2 mb-1">
                    <span className="font-medium text-sm">{respuesta.nombre_usuario}</span>
                    <span className="text-xs text-muted-foreground">{formatDate(respuesta.fecha)}</span>
                  </div>
                  <div className="text-sm whitespace-pre-line break-words">{respuesta.comentario}</div>
                  <div className="mt-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        setRespondiendoA(respuesta.id)
                        setRespuestaTexto("")
                      }}
                    >
                      <Reply className="h-3 w-3 mr-1" />
                      Responder
                    </Button>
                  </div>

                  {respondiendoA === respuesta.id && (
                    <div className="mt-3 bg-slate-50 p-3 rounded-md">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-xs px-1.5 py-0">
                          Respondiendo a {respuesta.nombre_usuario}
                        </Badge>
                      </div>
                      <Textarea
                        value={respuestaTexto}
                        onChange={(e) => setRespuestaTexto(e.target.value)}
                        placeholder="Escribe tu respuesta..."
                        rows={2}
                        className="resize-none text-sm"
                      />
                      <div className="flex gap-2 mt-2 justify-end">
                        <Button size="sm" variant="outline" className="h-8" onClick={() => setRespondiendoA(null)}>
                          Cancelar
                        </Button>
                        <Button
                          size="sm"
                          className="h-8"
                          onClick={() => handleResponder(respuesta.id)}
                          disabled={loading || !respuestaTexto.trim()}
                        >
                          <Send className="h-3.5 w-3.5 mr-1.5" />
                          Enviar
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {respuesta.respuestas && respuesta.respuestas.length > 0 && renderRespuestas(respuesta.respuestas)}
        </div>
      ))}
    </div>
  )

  return (
    <Card className="shadow-md border-none">
      <CardHeader className="pb-3 bg-slate-50">
        <CardTitle className="text-xl flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          Comentarios y discusión
        </CardTitle>
      </CardHeader>

      <CardContent className="p-6">
        {user ? (
          <div className="mb-6">
            <div className="flex items-start gap-3 mb-3">
              <div className="h-8 w-8 mt-1 rounded-full overflow-hidden">
                <img
                  src={user.avatarUrl || "/placeholder.svg"}
                  alt={user.nombre}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="flex-1">
                <Textarea
                  value={nuevoComentario}
                  onChange={(e) => setNuevoComentario(e.target.value)}
                  placeholder="Escribe un comentario o pregunta sobre este comunicado..."
                  rows={3}
                  className="resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                onClick={() => setShowConfirmModal(true)}
                disabled={loading || !nuevoComentario.trim()}
                className="gap-1.5"
              >
                <Send className="h-4 w-4" />
                Publicar comentario
              </Button>
            </div>

            <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirmar publicación</DialogTitle>
                  <DialogDescription>
                    ¿Estás seguro de que deseas publicar este comentario? <br />
                    <strong>Una vez enviado, no podrás eliminarlo.</strong>
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setShowConfirmModal(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleComentar} disabled={loading}>
                    Confirmar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        ) : (
          <div className="bg-slate-50 p-4 rounded-md text-center mb-6">
            <UserIcon className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-40" />
            <p className="text-muted-foreground">Inicia sesión para comentar en este comunicado.</p>
          </div>
        )}

        <Separator className="my-6" />

        {loading && comentarios.length === 0 ? (
          <div className="flex justify-center items-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          </div>
        ) : comentarios.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-20" />
            <p className="text-muted-foreground">No hay comentarios aún. Sé el primero en comentar.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-sm">
                {comentarios.length} {comentarios.length === 1 ? "comentario" : "comentarios"}
              </h3>
              <Badge variant="outline" className="text-xs">
                Más recientes primero
              </Badge>
            </div>

            <div className="space-y-4">
              {comentarios.map((comentario) => (
                <div key={comentario.id}>
                  <Card className="shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="h-8 w-8 mt-1 rounded-full overflow-hidden">
                          <img
                            src={comentario.avatarUrl || "/placeholder.svg"}
                            alt={comentario.nombre_usuario}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-baseline gap-x-2 mb-1">
                            <span className="font-medium text-sm">{comentario.nombre_usuario}</span>
                            <span className="text-xs text-muted-foreground">{formatDate(comentario.fecha)}</span>
                          </div>
                          <div className="text-sm whitespace-pre-line break-words">{comentario.comentario}</div>
                          <div className="mt-2 flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                              onClick={() => {
                                setRespondiendoA(comentario.id)
                                setRespuestaTexto("")
                              }}
                            >
                              <Reply className="h-3 w-3 mr-1" />
                              Responder
                            </Button>

                            {comentario.respuestas && comentario.respuestas.length > 0 && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-xs flex items-center gap-1 text-primary hover:text-primary/80"
                                onClick={() => toggleRespuestas(comentario.id)}
                              >
                                <MessageSquare className="h-3 w-3" />
                                {comentario.respuestas.length}{" "}
                                {comentario.respuestas.length === 1 ? "respuesta" : "respuestas"}
                                {expandedComments[comentario.id] ? (
                                  <ChevronUp className="h-3 w-3" />
                                ) : (
                                  <ChevronDown className="h-3 w-3" />
                                )}
                              </Button>
                            )}
                          </div>

                          {respondiendoA === comentario.id && (
                            <div className="mt-3 bg-slate-50 p-3 rounded-md">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline" className="text-xs px-1.5 py-0">
                                  Respondiendo a {comentario.nombre_usuario}
                                </Badge>
                              </div>
                              <Textarea
                                value={respuestaTexto}
                                onChange={(e) => setRespuestaTexto(e.target.value)}
                                placeholder="Escribe tu respuesta..."
                                rows={2}
                                className="resize-none text-sm"
                              />
                              <div className="flex gap-2 mt-2 justify-end">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8"
                                  onClick={() => setRespondiendoA(null)}
                                >
                                  Cancelar
                                </Button>
                                <Button
                                  size="sm"
                                  className="h-8"
                                  onClick={() => handleResponder(comentario.id)}
                                  disabled={loading || !respuestaTexto.trim()}
                                >
                                  <Send className="h-3.5 w-3.5 mr-1.5" />
                                  Enviar
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {expandedComments[comentario.id] &&
                    comentario.respuestas &&
                    comentario.respuestas.length > 0 &&
                    renderRespuestas(comentario.respuestas)}
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>

      {comentarios.length > 10 && (
        <CardFooter className="bg-slate-50 py-3 px-6 border-t flex justify-center">
          <Button variant="outline" size="sm" className="gap-1.5">
            <MessageSquare className="h-3.5 w-3.5" />
            Cargar más comentarios
          </Button>
        </CardFooter>
      )}
    </Card>
  )
}
