"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { createSupabaseClient } from "@/lib/supabase"
// AdminSidebar removido - ya está en el layout
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Search, X, ArrowLeft, FileDown, MessageSquare, AlertTriangle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ComentariosCertificacion } from "@/components/certificacion-laboral/certificacion-laboral"

export default function AdminSolicitudesCertificacion() {
  const router = useRouter()
  const [solicitudes, setSolicitudes] = useState<any[]>([])
  const [filteredSolicitudes, setFilteredSolicitudes] = useState<any[]>([])
  const [cargos, setCargos] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = useMemo(() => createSupabaseClient(), [])

  // filtros
  const [searchTerm, setSearchTerm] = useState<string>("")
  const [selectedEstado, setSelectedEstado] = useState<string>("resueltas")
  const [selectedCargo, setSelectedCargo] = useState<string>("all")
  const searchTimeout = useRef<NodeJS.Timeout | null>(null)

  // Función para cargar solicitudes históricas
  const fetchSolicitudes = useCallback(async () => {
    setLoading(true)
    try {
      // Obtener solicitudes de certificación con datos relacionados (solo resueltas)
      const { data: solicitudesData, error: solicitudesError } = await supabase
        .from("solicitudes_certificacion")
        .select(`
          *,
          usuario_nomina:usuario_id(
            colaborador,
            cedula,
            fecha_ingreso,
            empresa_id,
            empresas:empresa_id(nombre, razon_social, nit),
            cargos:cargo_id(nombre)
          ),
          admin_nomina:admin_id(
            colaborador
          )
        `)
        .in("estado", ["aprobado", "rechazado"])
        .order("fecha_solicitud", { ascending: false })

      if (solicitudesError) throw solicitudesError
      if (!solicitudesData) {
        setSolicitudes([])
        setFilteredSolicitudes([])
        return
      }

      setSolicitudes(solicitudesData)
      setFilteredSolicitudes(solicitudesData)

      // Extraer cargos únicos para el filtro
      const uniqueCargos = Array.from(
        new Set(
          (solicitudesData || [])
            .map((s: any) => s.usuario_nomina?.cargos?.nombre)
            .filter((c): c is string => Boolean(c))
        )
      )
      setCargos(uniqueCargos)
    } catch (err: any) {
      console.error("Error al cargar solicitudes históricas:", err)
      setError(err?.message || "Error al cargar las solicitudes")
    } finally {
      setLoading(false)
    }
  }, [supabase])

  // Carga inicial
  useEffect(() => {
    fetchSolicitudes()
  }, [fetchSolicitudes])

  // Realtime: suscripción a cambios en solicitudes
  useEffect(() => {
    const realtimeChannel = supabase
      .channel("historico_certificacion_channel", {
        config: { broadcast: { ack: false } },
      })
      // Suscripción a cambios de estado en solicitudes
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "solicitudes_certificacion",
        },
        (payload) => {
          const solicitudActualizada = payload.new as any
          const solicitudAnterior = payload.old as any
          
          // Si cambió de pendiente a aprobado/rechazado, recargar lista
          if (
            solicitudAnterior.estado === "pendiente" && 
            (solicitudActualizada.estado === "aprobado" || solicitudActualizada.estado === "rechazado")
          ) {
            fetchSolicitudes()
          }
          // Si se actualizó una solicitud ya resuelta (ej: cambio de motivo de rechazo)
          else if (
            (solicitudAnterior.estado === "aprobado" || solicitudAnterior.estado === "rechazado") &&
            (solicitudActualizada.estado === "aprobado" || solicitudActualizada.estado === "rechazado")
          ) {
            // Actualizar la solicitud específica en el estado local
            setSolicitudes((prev) => 
              prev.map((s) => 
                s.id === solicitudActualizada.id 
                  ? { ...s, ...solicitudActualizada }
                  : s
              )
            )
            setFilteredSolicitudes((prev) => 
              prev.map((s) => 
                s.id === solicitudActualizada.id 
                  ? { ...s, ...solicitudActualizada }
                  : s
              )
            )
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(realtimeChannel)
    }
  }, [supabase, fetchSolicitudes])

  // aplicar filtros con debounce
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => {
      let result = [...solicitudes]

      // búsqueda
      if (searchTerm) {
        const term = searchTerm.toLowerCase()
        result = result.filter((s) => {
          const u = s.usuario_nomina
          return (
            u?.colaborador.toLowerCase().includes(term) ||
            u?.cedula.toLowerCase().includes(term) ||
            u?.cargos?.nombre.toLowerCase().includes(term) ||
            u?.empresas?.nombre.toLowerCase().includes(term)
          )
        })
      }

      // estado
      if (selectedEstado === "resueltas") {
        result = result.filter((s) => s.estado === "aprobado" || s.estado === "rechazado")
      } else if (selectedEstado !== "all") {
        result = result.filter((s) => s.estado === selectedEstado)
      }

      // cargo
      if (selectedCargo !== "all") {
        result = result.filter((s) => s.usuario_nomina?.cargos?.nombre === selectedCargo)
      }

      setFilteredSolicitudes(result)
    }, 300)

    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current)
    }
  }, [searchTerm, selectedEstado, selectedCargo, solicitudes])

  const clearFilters = () => {
    setSearchTerm("")
    setSelectedEstado("resueltas")
    setSelectedCargo("all")
  }

  const formatDate = (f?: string | null) =>
    f
      ? new Date(f).toLocaleDateString("es-CO", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : ""

  const rechazarSolicitud = async (id: string, motivo: string) => {
    try {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return router.push("/login")

      const { error } = await supabase
        .from("solicitudes_certificacion")
        .update({
          estado: "rechazado",
          motivo_rechazo: motivo,
          admin_id: session.user.id,
          fecha_resolucion: new Date(),
        })
        .eq("id", id)

      if (error) throw error

      setSolicitudes((prev) =>
        prev.map((s) =>
          s.id === id
            ? { ...s, estado: "rechazado", motivo_rechazo: motivo }
            : s
        )
      )
      setFilteredSolicitudes((prev) =>
        prev.map((s) =>
          s.id === id
            ? { ...s, estado: "rechazado", motivo_rechazo: motivo }
            : s
        )
      )
    } catch (err: any) {
      console.error("Error al rechazar solicitud:", err)
      setError(err?.message || "No se pudo rechazar la solicitud")
    } finally {
      setLoading(false)
    }
  }

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case "aprobado":
        return <Badge className="bg-green-100 text-green-800">Aprobado</Badge>
      case "rechazado":
        return <Badge className="bg-red-100 text-red-800">Rechazado</Badge>
      case "pendiente":
        return <Badge className="bg-yellow-100 text-yellow-800">Pendiente</Badge>
      default:
        return <Badge variant="secondary">{estado}</Badge>
    }
  }

  const handleVerPDF = (pdfUrl: string) => {
    if (pdfUrl) {
      window.open(pdfUrl, '_blank')
    }
  }

  const handleVolver = () => {
    router.push('/administracion/solicitudes/certificacion-laboral')
  }

  return (
    <div className="min-h-screen">
      <div className="flex flex-col flex-1">
        <main className="flex-1 py-6">
          <div className="w-full mx-auto space-y-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold">Histórico de Certificaciones</h1>
              <Button
                onClick={handleVolver}
                variant="outline"
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver a Solicitudes
              </Button>
            </div>
            {error && (
              <div className="text-red-600 bg-red-100 p-2 rounded">{error}</div>
            )}

            {/* filtros */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row gap-4 items-end">
                  <div className="w-full md:w-1/3">
                    <Label htmlFor="search" className="mb-2 block">
                      Buscar
                    </Label>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                      <Input
                        id="search"
                        className="pl-8"
                        placeholder="Buscar por nombre, cédula..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                      {searchTerm && (
                        <button
                          onClick={() => setSearchTerm("")}
                          className="absolute right-2.5 top-2.5"
                        >
                          <X className="h-4 w-4 text-gray-500" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="w-full md:w-1/5">
                    <Label htmlFor="estado" className="mb-2 block">
                      Estado
                    </Label>
                    <Select
                      value={selectedEstado}
                      onValueChange={setSelectedEstado}
                    >
                      <SelectTrigger id="estado">
                        <SelectValue placeholder="Todos los estados" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="resueltas">Resueltas</SelectItem>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="aprobado">Aprobado</SelectItem>
                        <SelectItem value="rechazado">Rechazado</SelectItem>
                        <SelectItem value="pendiente">Pendiente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-full md:w-1/5">
                    <Label htmlFor="cargo" className="mb-2 block">
                      Cargo
                    </Label>
                    <Select
                      value={selectedCargo}
                      onValueChange={setSelectedCargo}
                    >
                      <SelectTrigger id="cargo">
                        <SelectValue placeholder="Todos los cargos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        {cargos.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button variant="outline" onClick={clearFilters}>
                    Limpiar filtros
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* tabla */}
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Colaborador</TableHead>
                      <TableHead>Cédula</TableHead>
                      <TableHead>Cargo</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Dirigido a</TableHead>
                      <TableHead>Ciudad</TableHead>
                      <TableHead>Fecha solicitud</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: 5 }).map((_, index) => (
                        <TableRow key={index}>
                          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                          <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Skeleton className="h-8 w-8" />
                              <Skeleton className="h-8 w-8" />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : filteredSolicitudes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-4">
                          No hay solicitudes.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredSolicitudes.map((sol) => (
                        <TableRow key={sol.id}>
                          <TableCell>{sol.usuario_nomina?.colaborador}</TableCell>
                          <TableCell>{sol.usuario_nomina?.cedula}</TableCell>
                          <TableCell>{sol.usuario_nomina?.cargos?.nombre}</TableCell>
                          <TableCell>{getEstadoBadge(sol.estado)}</TableCell>
                          <TableCell>{sol.dirigido_a}</TableCell>
                          <TableCell>{sol.ciudad}</TableCell>
                          <TableCell>
                            {formatDate(sol.fecha_solicitud)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {/* Botón ver comentarios */}
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex items-center gap-1"
                                  >
                                    <MessageSquare className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                                  <DialogHeader>
                                    <DialogTitle>Comentarios - {sol.usuario_nomina?.colaborador}</DialogTitle>
                                  </DialogHeader>
                                  <ComentariosCertificacion 
                                     solicitudId={sol.id}
                                   />
                                </DialogContent>
                              </Dialog>
                              
                              {/* Botón ver PDF si está aprobado */}
                              {sol.estado === "aprobado" && sol.pdf_url && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleVerPDF(sol.pdf_url)}
                                  className="flex items-center gap-1 bg-green-50 text-green-600 border-green-200 hover:bg-green-100 hover:text-green-700"
                                  title="Descargar certificado"
                                >
                                  <FileDown className="h-4 w-4" />
                                </Button>
                              )}
                              
                              {/* Botón ver motivo de rechazo si está rechazado */}
                              {sol.estado === "rechazado" && sol.motivo_rechazo && (
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="flex items-center gap-1 text-red-600 hover:text-red-700"
                                    >
                                      <AlertTriangle className="h-4 w-4" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>Motivo de Rechazo</DialogTitle>
                                    </DialogHeader>
                                    <div className="mt-4">
                                      <p className="text-sm text-gray-600 mb-2">
                                        <strong>Colaborador:</strong> {sol.usuario_nomina?.colaborador}
                                      </p>
                                      <p className="text-sm text-gray-600 mb-4">
                                        <strong>Fecha de rechazo:</strong> {formatDate(sol.fecha_resolucion)}
                                      </p>
                                      <div className="bg-red-50 border border-red-200 rounded-md p-3">
                                        <p className="text-sm text-red-800">{sol.motivo_rechazo}</p>
                                      </div>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}
