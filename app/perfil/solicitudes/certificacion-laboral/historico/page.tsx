"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createSupabaseClient } from "@/lib/supabase"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertCircle,
  ArrowLeft,
  Download,
  MessageSquare,
  Search,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { ComentariosCertificacion } from "@/components/certificacion-laboral/certificacion-laboral"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export default function HistoricoCertificacionLaboral() {
  const router = useRouter()
  const supabase = createSupabaseClient()

  // — ID del usuario actual
  const [userId, setUserId] = useState<string | null>(null)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setUserId(session.user.id)
    })
  }, [])

  // — Estados
  const [loading, setLoading] = useState(false)
  const [solicitudes, setSolicitudes] = useState<any[]>([])
  const [filteredSolicitudes, setFilteredSolicitudes] = useState<any[]>([])
  const [error, setError] = useState("")

  // — Filtros
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedEstado, setSelectedEstado] = useState("all")
  const [selectedYear, setSelectedYear] = useState("all")

  // — Modal de comentarios
  const [showCommentsModal, setShowCommentsModal] = useState(false)
  const [currentSolicId, setCurrentSolicId] = useState<string | null>(null)
  const [unseenCounts, setUnseenCounts] = useState<Record<string, number>>({})

  // Cargar solicitudes
  const loadSolicitudes = async () => {
    if (!userId) return
    
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("solicitudes_certificacion")
        .select(`
          *,
          usuario_nomina:usuario_id(
            colaborador,
            cedula,
            fecha_ingreso,
            cargos:cargo_id(
              nombre
            )
          )
        `)
        .eq("usuario_id", userId)
        .order("fecha_solicitud", { ascending: false })

      if (error) throw error
      setSolicitudes(data || [])
      setFilteredSolicitudes(data || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Cargar contadores de comentarios no vistos
  const loadUnseenCounts = async () => {
    if (!userId) return
    
    try {
      const { data, error } = await supabase
        .from("comentarios_certificacion")
        .select("solicitud_id")
        .eq("visto_user", false)
        .neq("usuario_id", userId)

      if (error) {
        console.error("Error loading unseen counts:", error.message || error)
        return
      }

      const counts: Record<string, number> = {}
      data?.forEach((comment: any) => {
        counts[comment.solicitud_id] = (counts[comment.solicitud_id] || 0) + 1
      })
      setUnseenCounts(counts)
    } catch (err: any) {
      console.error("Error loading unseen counts:", err?.message || err)
    }
  }

  useEffect(() => {
    loadSolicitudes()
    loadUnseenCounts()
  }, [userId])

  // Aplicar filtros
  useEffect(() => {
    let filtered = solicitudes

    // Filtro por término de búsqueda
    if (searchTerm) {
      filtered = filtered.filter(
        (sol) =>
          sol.dirigido_a?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          sol.ciudad?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          sol.usuario_nomina?.colaborador?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filtro por estado
    if (selectedEstado !== "all") {
      filtered = filtered.filter((sol) => sol.estado === selectedEstado)
    }

    // Filtro por año
    if (selectedYear !== "all") {
      filtered = filtered.filter((sol) => {
        const year = new Date(sol.fecha_solicitud).getFullYear().toString()
        return year === selectedYear
      })
    }

    setFilteredSolicitudes(filtered)
  }, [solicitudes, searchTerm, selectedEstado, selectedYear])

  // Obtener años únicos para el filtro
  const getUniqueYears = () => {
    const years = solicitudes.map((sol) => new Date(sol.fecha_solicitud).getFullYear())
    return [...new Set(years)].sort((a, b) => b - a)
  }

  // Descargar certificado
  const descargar = async (url: string) => {
    try {
      const r = await fetch(url)
      const b = await r.blob()
      const u = URL.createObjectURL(b)
      const a = document.createElement("a")
      a.href = u
      a.download = "certificado-laboral.pdf"
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(u)
    } catch {
      setError("Error al descargar el certificado.")
    }
  }

  // Abrir modal de comentarios
  const openCommentsModal = async (solicitudId: string) => {
    setCurrentSolicId(solicitudId)
    setShowCommentsModal(true)

    // Marcar comentarios como vistos
    try {
      const { error } = await supabase
        .from("comentarios_certificacion")
        .update({ visto_user: true })
        .eq("solicitud_id", solicitudId)
        .neq("usuario_id", userId)

      if (error) {
        console.error("Error marking comments as seen:", error.message || error)
        return
      }

      // Actualizar contador
      setUnseenCounts((prev) => ({ ...prev, [solicitudId]: 0 }))
    } catch (err: any) {
      console.error("Error marking comments as seen:", err?.message || err)
    }
  }

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case "pendiente":
        return <Badge variant="secondary">Pendiente</Badge>
      case "aprobado":
        return <Badge className="bg-green-500">Aprobado</Badge>
      case "rechazado":
        return <Badge variant="destructive">Rechazado</Badge>
      default:
        return <Badge variant="outline">{estado}</Badge>
    }
  }

  return (
    <>
      {/* Modal de comentarios */}
      <Dialog
        open={showCommentsModal}
        onOpenChange={(open) => {
          if (!open) setShowCommentsModal(false)
        }}
      >
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Comentarios de la solicitud</DialogTitle>
          </DialogHeader>
          {currentSolicId && (
            <ComentariosCertificacion solicitudId={currentSolicId} />
          )}
        </DialogContent>
      </Dialog>

      {/* Página principal */}
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl font-bold w-full">
            Histórico de Certificaciones Laborales
          </h1>
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="flex items-center gap-2 bg-black text-white hover:bg-gray-800 w-full sm:w-auto"
          >
            <ArrowLeft className="h-4 w-4" /> Volver a Solicitudes
          </Button>
        </div>

        {/* Filtros */}
        <Card className="bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Filtros de búsqueda
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="search">Buscar</Label>
                <Input
                  id="search"
                  placeholder="Dirigido a, ciudad, nombre..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="estado">Estado</Label>
                <Select value={selectedEstado} onValueChange={setSelectedEstado}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los estados" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los estados</SelectItem>
                    <SelectItem value="pendiente">Pendiente</SelectItem>
                    <SelectItem value="aprobado">Aprobado</SelectItem>
                    <SelectItem value="rechazado">Rechazado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="year">Año</Label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los años" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los años</SelectItem>
                    {getUniqueYears().map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm("")
                    setSelectedEstado("all")
                    setSelectedYear("all")
                  }}
                  className="w-full"
                >
                  Limpiar filtros
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Alertas */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Tabla de solicitudes */}
        <Card className="bg-white/80 backdrop-blur-sm">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-4">
                {/* Table Header Skeleton */}
                <div className="space-y-3">
                  <div className="grid grid-cols-6 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="h-4 bg-gray-200 rounded animate-pulse"></div>
                    ))}
                  </div>
                  
                  {/* Table Rows Skeleton */}
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="grid grid-cols-6 gap-4 py-3 border-b">
                      {Array.from({ length: 6 }).map((_, j) => (
                        <div key={j} className="h-4 bg-gray-200 rounded animate-pulse"></div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Dirigido a</TableHead>
                    <TableHead>Ciudad</TableHead>
                    <TableHead>Incluye Salario</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSolicitudes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        {solicitudes.length === 0
                          ? "No hay solicitudes en el histórico."
                          : "No se encontraron solicitudes con los filtros aplicados."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSolicitudes.map((solicitud) => (
                      <TableRow key={solicitud.id}>
                        <TableCell>
                          {new Date(solicitud.fecha_solicitud).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{solicitud.dirigido_a}</TableCell>
                        <TableCell>{solicitud.ciudad}</TableCell>
                        <TableCell>
                          {solicitud.incluir_salario ? "Sí" : "No"}
                        </TableCell>
                        <TableCell>{getEstadoBadge(solicitud.estado)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {solicitud.certificado_url && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => window.open(solicitud.certificado_url, '_blank')}
                                  title="Ver PDF"
                                >
                                  📄
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => descargar(solicitud.certificado_url)}
                                  title="Descargar PDF"
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openCommentsModal(solicitud.id)}
                              className="relative"
                            >
                              <MessageSquare className="h-4 w-4" />
                              {unseenCounts[solicitud.id] > 0 && (
                                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                                  {unseenCounts[solicitud.id]}
                                </span>
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>


      </div>
    </>
  )
}
