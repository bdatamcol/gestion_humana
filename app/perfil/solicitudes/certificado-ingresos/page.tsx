"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { authFetch } from "@/lib/authenticated-fetch"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { Badge } from "@/components/ui/badge"
import { AlertCircle, CheckCircle2, Download, Eye, Loader2, Plus } from "lucide-react"
import { formatLocalDate } from "@/lib/date-utils"
import {
  aniosGravablesDisponibles,
  etiquetaEstadoCertificadoIngresos,
  getCertificadoIngresosDownloadUrl,
  nombreArchivoCertificado,
  type SolicitudCertificadoIngresos,
} from "@/lib/certificado-ingresos"

export default function CertificadoIngresosRetenciones() {
  const [solicitudes, setSolicitudes] = useState<SolicitudCertificadoIngresos[]>([])
  const [initialLoading, setInitialLoading] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [showNewModal, setShowNewModal] = useState(false)

  const aniosDisponibles = useMemo(() => aniosGravablesDisponibles(), [])
  const [formData, setFormData] = useState({
    anioGravable: String(aniosDisponibles[0] ?? new Date().getFullYear()),
    observaciones: "",
  })

  const cargarSolicitudes = useCallback(async () => {
    try {
      const response = await authFetch("/api/certificado-ingresos")
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error || "Error al cargar las solicitudes")
      }
      setSolicitudes(data.solicitudes as SolicitudCertificadoIngresos[])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar las solicitudes")
    } finally {
      setInitialLoading(false)
    }
  }, [])

  useEffect(() => {
    cargarSolicitudes()
  }, [cargarSolicitudes])

  const formatDate = (valor: string | null | undefined) =>
    valor
      ? formatLocalDate(valor, "es-CO", { year: "numeric", month: "long", day: "numeric" })
      : "—"

  const enviarSolicitud = async () => {
    setEnviando(true)
    setError("")
    setSuccess("")
    try {
      const response = await authFetch("/api/certificado-ingresos", {
        method: "POST",
        body: JSON.stringify({
          anio_gravable: Number(formData.anioGravable),
          observaciones: formData.observaciones,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error || "Error al enviar la solicitud")
      }
      setSuccess("Solicitud enviada correctamente. Te notificaremos cuando el certificado esté listo.")
      setFormData({
        anioGravable: String(aniosDisponibles[0] ?? new Date().getFullYear()),
        observaciones: "",
      })
      setShowNewModal(false)
      await cargarSolicitudes()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al enviar la solicitud")
    } finally {
      setEnviando(false)
    }
  }

  const verCertificado = (solicitud: SolicitudCertificadoIngresos) => {
    if (solicitud.pdf_url) {
      window.open(solicitud.pdf_url, "_blank", "noopener,noreferrer")
    }
  }

  const descargarCertificado = (solicitud: SolicitudCertificadoIngresos) => {
    if (!solicitud.pdf_url) return
    const url = getCertificadoIngresosDownloadUrl(
      solicitud.pdf_url,
      nombreArchivoCertificado(solicitud.anio_gravable),
    )
    window.open(url, "_blank", "noopener,noreferrer")
  }

  if (initialLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="h-8 bg-gray-200 rounded-md w-96 animate-pulse" />
          <div className="h-10 bg-gray-200 rounded-md w-36 animate-pulse" />
        </div>
        <Card className="bg-white/80 backdrop-blur-sm">
          <CardContent className="p-0">
            <div className="space-y-3 p-4">
              <div className="grid grid-cols-5 gap-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-4 bg-gray-200 rounded animate-pulse" />
                ))}
              </div>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="grid grid-cols-5 gap-4 py-3 border-b">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <div key={j} className="h-4 bg-gray-200 rounded animate-pulse" />
                  ))}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h1 className="text-2xl font-bold w-full">
          Certificado de ingresos y retenciones
        </h1>
        <div className="w-full sm:w-auto">
          <Button
            onClick={() => {
              setError("")
              setSuccess("")
              setShowNewModal(true)
            }}
            className="flex items-center gap-2 w-full sm:w-auto"
          >
            <Plus className="h-4 w-4" /> Nueva solicitud
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert className="bg-green-50 text-green-800 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Tabla de solicitudes */}
      <Card className="bg-white/80 backdrop-blur-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Año gravable</TableHead>
                <TableHead>Fecha de solicitud</TableHead>
                <TableHead>Observaciones</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Certificado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {solicitudes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    No hay solicitudes registradas.
                  </TableCell>
                </TableRow>
              ) : (
                solicitudes.map((solicitud) => (
                  <TableRow key={solicitud.id}>
                    <TableCell className="font-medium">{solicitud.anio_gravable}</TableCell>
                    <TableCell>{formatDate(solicitud.fecha_solicitud)}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {solicitud.observaciones || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={solicitud.estado === "certificado_creado" ? "secondary" : "default"}
                      >
                        {etiquetaEstadoCertificadoIngresos(solicitud.estado)}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(solicitud.fecha_certificado)}</TableCell>
                    <TableCell>
                      {solicitud.estado === "certificado_creado" && solicitud.pdf_url ? (
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => verCertificado(solicitud)}
                          >
                            <Eye className="h-4 w-4 mr-1" /> Ver
                          </Button>
                          <Button size="sm" onClick={() => descargarCertificado(solicitud)}>
                            <Download className="h-4 w-4 mr-1" /> Descargar
                          </Button>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          En proceso
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal de nueva solicitud */}
      <Dialog
        open={showNewModal}
        onOpenChange={(abierto) => {
          if (!abierto) setShowNewModal(false)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva solicitud</DialogTitle>
            <DialogDescription>
              Selecciona el año gravable del certificado de ingresos y retenciones que necesitas.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="anioGravable">Año gravable</Label>
              <Select
                value={formData.anioGravable}
                onValueChange={(valor) => setFormData({ ...formData, anioGravable: valor })}
              >
                <SelectTrigger id="anioGravable">
                  <SelectValue placeholder="Selecciona el año" />
                </SelectTrigger>
                <SelectContent>
                  {aniosDisponibles.map((anio) => (
                    <SelectItem key={anio} value={String(anio)}>
                      {anio}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="observaciones">Observaciones (opcional)</Label>
              <Textarea
                id="observaciones"
                value={formData.observaciones}
                maxLength={1000}
                placeholder="Indica cualquier detalle adicional para el área de Gestión Humana."
                onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
              />
            </div>
            <Button onClick={enviarSolicitud} disabled={enviando} className="w-full">
              {enviando ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enviando...
                </>
              ) : (
                "Enviar solicitud"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
