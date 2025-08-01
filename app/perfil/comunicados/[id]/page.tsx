'use client'

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { createSupabaseClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import ComunicadoAvatar from "@/components/ui/comunicado-avatar"
import { CalendarIcon, Building2Icon, Users2Icon, ArrowLeftIcon, FileTextIcon, BriefcaseIcon, PaperclipIcon, DownloadIcon, CheckIcon } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

interface ComunicadoDetalle {
    id: string
    titulo: string
    contenido: string
    imagen_url: string | null
    fecha_publicacion: string | null
    area_responsable: string
    categoria_id: string | null
    archivos_adjuntos: any[] | null
    comunicados_empresas?: any[]
    comunicados_usuarios?: any[]
    comunicados_cargos?: any[]
    empresas_destinatarias: { nombre: string }[]
    usuarios_destinatarios: { colaborador: string }[]
    cargos_destinatarios: { nombre: string }[]
}

export default function DetalleComunicadoPage() {
    const params = useParams()
    const router = useRouter()
    const comunicadoId = params.id as string
    const [comunicado, setComunicado] = useState<ComunicadoDetalle | null>(null)
    const [loading, setLoading] = useState(true)
    const [leido, setLeido] = useState(false)
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)

    // Formatear la fecha de publicación
    const formatDate = (dateString: string | null) => {
        if (!dateString) return "Fecha no disponible"
        const options: Intl.DateTimeFormatOptions = {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        }
        return new Date(dateString).toLocaleDateString("es-ES", options)
    }

    // Obtener las iniciales del área responsable para el avatar
    const getInitials = (name: string) => {
        return name
            .split(" ")
            .map((word) => word[0])
            .join("")
            .toUpperCase()
            .substring(0, 2)
    }

    useEffect(() => {
        const fetchComunicado = async () => {
            setLoading(true)
            const supabase = createSupabaseClient()
            const { data, error } = await supabase
                .from("comunicados")
                .select(`
          id,
          titulo,
          contenido,
          imagen_url,
          fecha_publicacion,
          area_responsable,
          categoria_id,
          archivos_adjuntos,
          comunicados_empresas(empresa_id, empresas:empresa_id(nombre)),
          comunicados_usuarios(usuario_id, usuario_nomina:usuario_id(colaborador)),
          comunicados_cargos(cargo_id, cargos:cargo_id(nombre))
        `)
                .eq("id", comunicadoId)
                .single()
            if (error || !data) {
                setComunicado(null)
            } else {
                const empresas_destinatarias = Array.isArray(data.comunicados_empresas) 
                    ? data.comunicados_empresas
                        .map(item => item.empresas)
                        .filter((empresa): empresa is { nombre: string } => Boolean(empresa && empresa.nombre))
                    : []
                const usuarios_destinatarios = Array.isArray(data.comunicados_usuarios)
                    ? data.comunicados_usuarios
                        .map(item => item.usuario_nomina)
                        .filter((usuario): usuario is { colaborador: string } => Boolean(usuario && usuario.colaborador))
                    : []
                const cargos_destinatarios = Array.isArray(data.comunicados_cargos)
                    ? data.comunicados_cargos
                        .map(item => item.cargos)
                        .filter((cargo): cargo is { nombre: string } => Boolean(cargo && cargo.nombre))
                    : []
                const comunicadoData: ComunicadoDetalle = {
                    id: data.id as string,
                    titulo: data.titulo as string,
                    contenido: data.contenido as string,
                    imagen_url: data.imagen_url as string | null,
                    fecha_publicacion: data.fecha_publicacion as string | null,
                    area_responsable: data.area_responsable as string,
                    categoria_id: data.categoria_id as string | null,
                    archivos_adjuntos: data.archivos_adjuntos as any[] | null,
                    empresas_destinatarias,
                    usuarios_destinatarios,
                    cargos_destinatarios
                }
                
                setComunicado(comunicadoData)
            }
            setLoading(false)
        }
        if (comunicadoId) fetchComunicado()
    }, [comunicadoId])

    // Comprobar si ya existe registro de lectura
    useEffect(() => {
        if (!comunicado) return
        const checkLeido = async () => {
            const supabase = createSupabaseClient()
            const {
                data: { user },
            } = await supabase.auth.getUser()
            if (!user) return

            const { data: readEntry, error } = await supabase
                .from("comunicados_leidos")
                .select("usuario_id")
                .eq("comunicado_id", comunicadoId)
                .eq("usuario_id", user.id)
                .single()

            if (!error && readEntry) {
                setLeido(true)
            }
        }
        checkLeido()
    }, [comunicado, comunicadoId])

    // Handler de confirmación de lectura
    const handleConfirmRead = async () => {
        try {
            const supabase = createSupabaseClient()
            const {
                data: { user },
                error: sessionError,
            } = await supabase.auth.getUser()
            if (sessionError || !user) throw new Error("No session")

            const { error } = await supabase.from("comunicados_leidos").upsert({
                comunicado_id: comunicadoId,
                usuario_id: user.id,
            })

            if (error) throw error

            setLeido(true)
            setConfirmDialogOpen(false)
        } catch (err) {
            console.error("Error al marcar como leído:", err)
        }
    }

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-100">
                <div className="flex flex-col items-center gap-2">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                    <p className="text-muted-foreground">Cargando comunicado...</p>
                </div>
            </div>
        )
    }

    if (!comunicado) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-100">
                <Card className="max-w-md w-full">
                    <div className="text-center p-6">
                        <FileTextIcon className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                        <h2 className="text-2xl font-bold">Comunicado no encontrado</h2>
                    </div>
                    <CardFooter className="flex justify-center pb-6">
                        <Button onClick={() => router.back()} className="gap-2">
                            <ArrowLeftIcon className="h-4 w-4" />
                            Volver
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <Button 
                    variant="outline" 
                    className="gap-3 text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-all duration-200 border border-slate-200 bg-white shadow-sm px-4 sm:px-6 py-2 sm:py-3 w-full sm:w-auto" 
                    onClick={() => router.back()}
                >
                    <ArrowLeftIcon className="h-4 w-4" />
                    <span className="whitespace-nowrap">Volver a comunicados</span>
                </Button>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
                    {leido ? (
                        <Badge variant="secondary" className="px-3 sm:px-4 py-2 text-sm font-medium bg-green-50 text-green-700 border border-green-200 w-full sm:w-auto flex items-center justify-center">
                            <CheckIcon className="h-4 w-4 mr-2 flex-shrink-0" /> 
                            <span className="whitespace-nowrap">Leído</span>
                        </Badge>
                    ) : (
                        <Button
                            variant="outline"
                            className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 text-sm font-medium border-green-200 text-green-700 hover:bg-green-50 w-full sm:w-auto"
                            onClick={() => setConfirmDialogOpen(true)}
                        >
                            <CheckIcon className="h-4 w-4 flex-shrink-0" /> 
                            <span className="whitespace-nowrap">Marcar como leído</span>
                        </Button>
                    )}
                    {comunicado.fecha_publicacion && (
                        <Badge variant="outline" className="px-3 sm:px-4 py-2 text-sm font-medium bg-slate-50 text-slate-700 border border-slate-200 w-full sm:w-auto flex items-center justify-center">
                            <CalendarIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                            <span className="whitespace-nowrap">{formatDate(comunicado.fecha_publicacion)}</span>
                        </Badge>
                    )}
                </div>
            </div>

            {/* Modal de confirmación */}
            <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
                <DialogContent>
                    <DialogHeader className="gap-2">
                        <DialogTitle>⚠️¡Atención!</DialogTitle>
                        <DialogDescription>
                            Confirmo lectura y aprobación del comunicado.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex gap-2">
                        <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
                            Cancelar
                        </Button>
                        <Button onClick={handleConfirmRead}>Confirmar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Columna principal: Título y descripción */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Título y contenido */}
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
                        <h1 className="text-3xl font-bold text-slate-900 mb-3 leading-tight">{comunicado.titulo}</h1>
                        <div className="space-y-6">
                            <div>
                                <div
                                    className="prose prose-slate max-w-none text-black-600 leading-relaxed bg-slate-50/50 p-2 rounded-lg border border-slate-100"
                                    dangerouslySetInnerHTML={{ __html: comunicado.contenido }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Cargos destinatarios */}
                    {comunicado.cargos_destinatarios && comunicado.cargos_destinatarios.length > 0 && (
                        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center">
                                    <BriefcaseIcon className="h-5 w-5 text-blue-600" />
                                </div>
                                <h3 className="text-base font-medium text-slate-900">Cargos destinatarios</h3>
                            </div>
                            <div className="flex flex-wrap gap-1">
                                {comunicado.cargos_destinatarios.map((cargo, idx) => (
                                    <span key={idx} className="inline-flex items-center px-2 py-1 rounded-md text-sm font-medium bg-blue-50 text-blue-700 border border-blue-100">
                                        {cargo.nombre.charAt(0).toUpperCase() + cargo.nombre.slice(1).toLowerCase()}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Archivos adjuntos */}
                    {comunicado.archivos_adjuntos && comunicado.archivos_adjuntos.length > 0 && (
                        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center">
                                    <PaperclipIcon className="h-5 w-5 text-emerald-600" />
                                </div>
                                <h3 className="text-base font-medium text-slate-900">Archivos adjuntos</h3>
                            </div>
                            <div className="space-y-4">
                                {comunicado.archivos_adjuntos.map((archivo, idx) => (
                                    <div key={idx} className="group flex items-center justify-between p-2 bg-slate-50/50 rounded-lg border border-slate-100 hover:bg-slate-50 hover:shadow-sm transition-all duration-200">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center">
                                                <FileTextIcon className="h-6 w-6 text-red-500" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-slate-900">{archivo.nombre || `Archivo ${idx + 1}`}</p>
                                                {archivo.tamaño && (
                                                    <p className="text-sm text-slate-500 mt-1">
                                                        {(archivo.tamaño / 1024 / 1024).toFixed(2)} MB
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        {archivo.url && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => window.open(archivo.url, '_blank')}
                                                className="gap-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 rounded-lg px-4 py-2"
                                            >
                                                <FileTextIcon className="h-4 w-4" />
                                                Ver PDF
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Columna lateral: Imagen e información */}
                <div className="lg:col-span-1 space-y-8">
                    {/* Imagen */}
                    <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-slate-100">
                        <div className="w-full h-[280px] overflow-hidden">
                            <ComunicadoAvatar
                                titulo={comunicado.titulo}
                                imagenUrl={comunicado.imagen_url}
                                className="w-full h-full"
                            />
                        </div>
                    </div>

                    {/* Información del comunicado */}
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
                        <div className="space-y-6">
                            {/* Fecha y área responsable */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white flex items-center justify-center text-sm font-medium shadow-sm">
                                        {getInitials(comunicado.area_responsable)}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-900">{comunicado.area_responsable}</p>
                                        <p className="text-sm text-slate-500">Área responsable</p>
                                    </div>
                                </div>

                                {comunicado.fecha_publicacion && (
                                    <div className="flex items-center gap-3 p-4 bg-slate-50/50 rounded-lg border border-slate-100">
                                        <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center">
                                            <CalendarIcon className="h-4 w-4 text-slate-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-slate-900">Fecha de publicación</p>
                                            <p className="text-sm text-slate-600">{formatDate(comunicado.fecha_publicacion)}</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="h-px bg-slate-100"></div>

                            {/* Empresas destinatarias */}
                            {comunicado.empresas_destinatarias && comunicado.empresas_destinatarias.length > 0 && (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-orange-50 rounded-full flex items-center justify-center">
                                            <Building2Icon className="h-4 w-4 text-orange-600" />
                                        </div>
                                        <h3 className="text-base font-medium text-slate-900">Empresas</h3>
                                    </div>
                                    <div className="space-y-2">
                                        {comunicado.empresas_destinatarias.map((empresa, idx) => (
                                            <div key={idx} className="px-3 py-2 bg-orange-50/50 rounded-lg border border-orange-100">
                                                <span className="text-sm font-medium text-orange-700">{empresa.nombre}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Usuarios destinatarios */}
                            {comunicado.usuarios_destinatarios && comunicado.usuarios_destinatarios.length > 0 && (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-green-50 rounded-full flex items-center justify-center">
                                            <Users2Icon className="h-4 w-4 text-green-600" />
                                        </div>
                                        <h3 className="text-base font-medium text-slate-900">Usuarios</h3>
                                    </div>
                                    <div className="space-y-2 max-h-32 overflow-y-auto">
                                        {comunicado.usuarios_destinatarios.map((usuario, idx) => (
                                            <div key={idx} className="flex items-center gap-3 px-3 py-2 bg-green-50/50 rounded-lg border border-green-100">
                                                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                                <span className="text-sm font-medium text-green-700">{usuario.colaborador}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
