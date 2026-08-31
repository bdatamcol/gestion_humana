"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { authFetch } from "@/lib/authenticated-fetch"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, CheckCircle2, Download, Eye, Loader2, Upload } from "lucide-react"
import { formatLocalDate } from "@/lib/date-utils"
import {
  etiquetaEstadoCertificadoIngresos,
  formatearTamanoArchivo,
  getCertificadoIngresosDownloadUrl,
  nombreArchivoCertificado,
  usuarioDeSolicitud,
  type SolicitudCertificadoIngresos,
} from "@/lib/certificado-ingresos"

type FiltroEstado = "todos" | "pendiente" | "certificado_creado"

export default function AdminCertificadoIngresos() {
  const [solicitudes, setSolicitudes] = useState<SolicitudCertificadoIngresos[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>("pendiente")

  // — Modal de carga del certificado
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [solicitudSeleccionada, setSolicitudSeleccionada] =
    useState<SolicitudCertificadoIngresos | null>(null)
  const [archivo, setArchivo] = useState<File | null>(null)
  const [errorArchivo, setErrorArchivo] = useState("")
  const [subiendo, setSubiendo] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const cargarSolicitudes = useCallback(async () => {
    setLoading(true)
    try {
      const url =
        filtroEstado === "todos"
          ? "/api/certificado-ingresos"
          : `/api/certificado-ingresos?estado=${filtroEstado}`
      const response = await authFetch(url)
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error || "Error al cargar las solicitudes")
      }
      setSolicitudes(data.solicitudes as SolicitudCertificadoIngresos[])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar las solicitudes")
    } finally {
      setLoading(false)
    }
  }, [filtroEstado])

  useEffect(() => {
    cargarSolicitudes()
  }, [cargarSolicitudes])

  const formatDate = (valor: string | null | undefined) =>
    valor
      ? formatLocalDate(valor, "es-CO", { year: "numeric", month: "long", day: "numeric" })
      : "—"

  const abrirModalCarga = (solicitud: SolicitudCertificadoIngresos) => {
    setSolicitudSeleccionada(solicitud)
    setArchivo(null)
    setErrorArchivo("")
    setError("")
    setSuccess("")
    setShowUploadModal(true)
  }

  const seleccionarArchivo = (event: React.ChangeEvent<HTMLInputElement>) => {
    const seleccionado = event.target.files?.[0] ?? null
    if (!seleccionado) {
      setArchivo(null)
      return
    }
    const esPdf =
      seleccionado.name.toLowerCase().endsWith(".pdf") &&
      (!seleccionado.type || seleccionado.type === "application/pdf")
    if (!esPdf) {
      setArchivo(null)
      setErrorArchivo("Solo se aceptan archivos PDF (.pdf)")
      if (fileInputRef.current) fileInputRef.current.value = ""
      return
    }
    setErrorArchivo("")
    setArchivo(seleccionado)
  }

  const subirCertificado = async () => {
    if (!solicitudSeleccionada || !archivo) {
      setErrorArchivo("Debes seleccionar el certificado en PDF")
      return
    }
    setSubiendo(true)
    setErrorArchivo("")
    try {
      const formData = new FormData()
      formData.append("archivo", archivo)

      const response = await authFetch(
        `/api/certificado-ingresos/${solicitudSeleccionada.id}/certificado`,
        { method: "POST", body: formData },
      )
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error || "Error al subir el certificado")
      }

      const tamanoFinal = formatearTamanoArchivo(data?.optimizacion?.tamano_final)
      setSuccess(
        `Certificado cargado correctamente (${tamanoFinal}). El colaborador fue notificado.`,
      )
      setShowUploadModal(false)
      setSolicitudSeleccionada(null)
      setArchivo(null)
      if (fileInputRef.current) fileInputRef.current.value = ""
      await cargarSolicitudes()
    } catch (err) {
      setErrorArchivo(err instanceof Error ? err.message : "Error al subir el certificado")
    } finally {
      setSubiendo(false)
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

  return (
    <div className="min-h-screen py-6">
      <div className="flex flex-col flex-1">
        <main>
          <div className="w-full mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold">Certificado de ingresos y retenciones</h1>
                <p className="text-muted-foreground">
                  Adjunta el certificado en PDF para cerrar cada solicitud.
                </p>
              </div>
              <div className="w-full sm:w-56">
                <Select
                  value={filtroEstado}
                  onValueChange={(valor) => setFiltroEstado(valor as FiltroEstado)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Filtrar por estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendiente">Pendientes</SelectItem>
                    <SelectItem value="certificado_creado">Certificado creado</SelectItem>
                    <SelectItem value="todos">Todas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

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

            <Card>
              <CardContent className="p-0">
                {loading ? (
                  <div className="space-y-4 p-6">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-[250px]" />
                      <Skeleton className="h-4 w-[200px]" />
                    </div>
                    <div className="space-y-3">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex space-x-4">
                          <Skeleton className="h-4 w-[160px]" />
                          <Skeleton className="h-4 w-[100px]" />
                          <Skeleton className="h-4 w-[100px]" />
                          <Skeleton className="h-4 w-[140px]" />
                          <Skeleton className="h-4 w-[120px]" />
                          <Skeleton className="h-8 w-[120px]" />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Colaborador</TableHead>
                        <TableHead>Cédula</TableHead>
                        <TableHead>Año gravable</TableHead>
                        <TableHead>Fecha de solicitud</TableHead>
                        <TableHead>Observaciones</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {solicitudes.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center">
                            No hay solicitudes para mostrar.
                          </TableCell>
                        </TableRow>
                      ) : (
                        solicitudes.map((solicitud) => (
                          <TableRow key={solicitud.id}>
                            <TableCell>
                              {usuarioDeSolicitud(solicitud.usuario_nomina)?.colaborador || "N/A"}
                            </TableCell>
                            <TableCell>
                              {usuarioDeSolicitud(solicitud.usuario_nomina)?.cedula || "N/A"}
                            </TableCell>
                            <TableCell className="font-medium">
                              {solicitud.anio_gravable}
                            </TableCell>
                            <TableCell>{formatDate(solicitud.fecha_solicitud)}</TableCell>
                            <TableCell className="max-w-xs truncate">
                              {solicitud.observaciones || "—"}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  solicitud.estado === "certificado_creado"
                                    ? "secondary"
                                    : "default"
                                }
                              >
                                {etiquetaEstadoCertificadoIngresos(solicitud.estado)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {solicitud.estado === "certificado_creado" && solicitud.pdf_url && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => verCertificado(solicitud)}
                                    >
                                      <Eye className="h-4 w-4 mr-1" /> Ver
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => descargarCertificado(solicitud)}
                                    >
                                      <Download className="h-4 w-4 mr-1" /> Descargar
                                    </Button>
                                  </>
                                )}
                                <Button size="sm" onClick={() => abrirModalCarga(solicitud)}>
                                  <Upload className="h-4 w-4 mr-1" />
                                  {solicitud.estado === "certificado_creado"
                                    ? "Reemplazar"
                                    : "Adjuntar PDF"}
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
        </main>
      </div>

      {/* — Modal de carga del certificado */}
      <Dialog
        open={showUploadModal}
        onOpenChange={(abierto) => {
          if (!abierto && !subiendo) {
            setShowUploadModal(false)
            setSolicitudSeleccionada(null)
            setArchivo(null)
            setErrorArchivo("")
            if (fileInputRef.current) fileInputRef.current.value = ""
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjuntar certificado</DialogTitle>
            <DialogDescription>
              {solicitudSeleccionada
                ? `${usuarioDeSolicitud(solicitudSeleccionada.usuario_nomina)?.colaborador || "Colaborador"} — año gravable ${solicitudSeleccionada.anio_gravable}`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label htmlFor="archivoCertificado">Archivo PDF</Label>
              <Input
                id="archivoCertificado"
                ref={fileInputRef}
                type="file"
                accept="application/pdf,.pdf"
                onChange={seleccionarArchivo}
                disabled={subiendo}
              />
              <p className="text-xs text-muted-foreground">
                Solo archivos .pdf de máximo 20 MB. El documento se optimiza antes de subirse.
              </p>
            </div>

            {archivo && (
              <div className="text-sm text-muted-foreground">
                Seleccionado: <span className="font-medium">{archivo.name}</span> (
                {formatearTamanoArchivo(archivo.size)})
              </div>
            )}

            {errorArchivo && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errorArchivo}</AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowUploadModal(false)}
                disabled={subiendo}
              >
                Cancelar
              </Button>
              <Button onClick={subirCertificado} disabled={subiendo || !archivo}>
                {subiendo ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Subiendo...
                  </>
                ) : (
                  "Subir certificado"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
