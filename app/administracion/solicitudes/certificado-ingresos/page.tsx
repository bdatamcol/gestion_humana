"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { authFetch } from "@/lib/authenticated-fetch"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
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
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Info,
  Loader2,
  Search,
  Upload,
  X,
} from "lucide-react"
import { formatLocalDate } from "@/lib/date-utils"
import {
  CERTIFICADO_INGRESOS_NOTA_ANIO_VENCIDO,
  etiquetaEstadoCertificadoIngresos,
  formatearTamanoArchivo,
  getCertificadoIngresosDownloadUrl,
  nombreArchivoCertificado,
  usuarioDeSolicitud,
  type SolicitudCertificadoIngresos,
} from "@/lib/certificado-ingresos"

type FiltroEstado = "all" | "pendiente" | "certificado_creado"

export default function AdminCertificadoIngresos() {
  const [solicitudes, setSolicitudes] = useState<SolicitudCertificadoIngresos[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  // — Filtros
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedEstado, setSelectedEstado] = useState<FiltroEstado>("pendiente")

  // — Paginación
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)

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
      const response = await authFetch("/api/certificado-ingresos")
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
  }, [])

  useEffect(() => {
    cargarSolicitudes()
  }, [cargarSolicitudes])

  // — Búsqueda en tiempo real + filtro por estado
  const filteredSolicitudes = useMemo(() => {
    const termino = searchTerm.trim().toLowerCase()
    return solicitudes.filter((solicitud) => {
      if (selectedEstado !== "all" && solicitud.estado !== selectedEstado) {
        return false
      }
      if (!termino) return true

      const usuario = usuarioDeSolicitud(solicitud.usuario_nomina)
      return Boolean(
        usuario?.colaborador?.toLowerCase().includes(termino) ||
          usuario?.cedula?.toLowerCase().includes(termino) ||
          String(solicitud.anio_gravable).includes(termino) ||
          solicitud.observaciones?.toLowerCase().includes(termino),
      )
    })
  }, [solicitudes, searchTerm, selectedEstado])

  const totalPages = Math.max(1, Math.ceil(filteredSolicitudes.length / itemsPerPage))

  const paginatedSolicitudes = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredSolicitudes.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredSolicitudes, currentPage, itemsPerPage])

  // Si los filtros reducen el listado, regresa a una página existente
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  const goToPreviousPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1)
  }

  const goToNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1)
  }

  const getPageNumbers = () => {
    const pageNumbers: number[] = []
    const maxPagesToShow = 5

    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i)
      }
    } else {
      let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2))
      let endPage = startPage + maxPagesToShow - 1

      if (endPage > totalPages) {
        endPage = totalPages
        startPage = Math.max(1, endPage - maxPagesToShow + 1)
      }

      for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i)
      }
    }

    return pageNumbers
  }

  const clearFilters = () => {
    setSearchTerm("")
    setSelectedEstado("all")
    setCurrentPage(1)
  }

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
            <div>
              <h1 className="text-2xl font-bold">Certificado de ingresos y retenciones</h1>
              <p className="text-muted-foreground">
                Adjunta el certificado en PDF para cerrar cada solicitud.
              </p>
            </div>

            <Alert className="bg-blue-50 text-blue-900 border-blue-200">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription>{CERTIFICADO_INGRESOS_NOTA_ANIO_VENCIDO}</AlertDescription>
            </Alert>

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

            {/* Filtros */}
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-4 items-end">
                  {/* Buscar */}
                  <div className="w-full md:w-1/2">
                    <Label htmlFor="search" className="mb-2 block">Buscar</Label>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                      <Input
                        id="search"
                        placeholder="Buscar por nombre, cédula, año gravable..."
                        className="pl-8"
                        value={searchTerm}
                        onChange={(e) => {
                          setSearchTerm(e.target.value)
                          setCurrentPage(1)
                        }}
                      />
                      {searchTerm && (
                        <button
                          type="button"
                          onClick={() => {
                            setSearchTerm("")
                            setCurrentPage(1)
                          }}
                          className="absolute right-2.5 top-2.5"
                        >
                          <X className="h-4 w-4 text-gray-500" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Estado */}
                  <div className="w-full md:w-1/4">
                    <Label htmlFor="estado" className="mb-2 block">Estado</Label>
                    <Select
                      value={selectedEstado}
                      onValueChange={(valor) => {
                        setSelectedEstado(valor as FiltroEstado)
                        setCurrentPage(1)
                      }}
                    >
                      <SelectTrigger id="estado">
                        <SelectValue placeholder="Todos los estados" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los estados</SelectItem>
                        <SelectItem value="pendiente">Pendiente</SelectItem>
                        <SelectItem value="certificado_creado">Certificado creado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button variant="outline" onClick={clearFilters} className="h-10">
                    Limpiar filtros
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Tabla de solicitudes */}
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
                  <>
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
                        {paginatedSolicitudes.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-8">
                              {solicitudes.length === 0
                                ? "No hay solicitudes registradas."
                                : "No se encontraron solicitudes con los filtros aplicados."}
                            </TableCell>
                          </TableRow>
                        ) : (
                          paginatedSolicitudes.map((solicitud) => (
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
                                  {solicitud.estado === "certificado_creado" &&
                                    solicitud.pdf_url && (
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

                    {/* Paginación */}
                    {filteredSolicitudes.length > 0 && (
                      <CardFooter className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t">
                        <div className="flex items-center mb-4 sm:mb-0">
                          <span className="text-sm text-muted-foreground mr-2">Mostrar</span>
                          <Select
                            value={itemsPerPage.toString()}
                            onValueChange={(value) => {
                              setItemsPerPage(Number.parseInt(value))
                              setCurrentPage(1)
                            }}
                          >
                            <SelectTrigger className="w-[80px]">
                              <SelectValue placeholder="25" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="10">10</SelectItem>
                              <SelectItem value="25">25</SelectItem>
                              <SelectItem value="50">50</SelectItem>
                              <SelectItem value="100">100</SelectItem>
                            </SelectContent>
                          </Select>
                          <span className="text-sm text-muted-foreground ml-2">por página</span>
                        </div>

                        <div className="flex items-center space-x-2">
                          <div className="text-sm text-muted-foreground mr-4">
                            Mostrando {(currentPage - 1) * itemsPerPage + 1} a{" "}
                            {Math.min(currentPage * itemsPerPage, filteredSolicitudes.length)} de{" "}
                            {filteredSolicitudes.length} solicitudes
                          </div>

                          <Button
                            variant="outline"
                            size="icon"
                            onClick={goToPreviousPage}
                            disabled={currentPage === 1}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>

                          <div className="flex items-center">
                            {getPageNumbers().map((page) => (
                              <Button
                                key={page}
                                variant={currentPage === page ? "default" : "outline"}
                                size="sm"
                                className="mx-1 h-8 w-8 p-0"
                                onClick={() => goToPage(page)}
                              >
                                {page}
                              </Button>
                            ))}
                          </div>

                          <Button
                            variant="outline"
                            size="icon"
                            onClick={goToNextPage}
                            disabled={currentPage === totalPages}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardFooter>
                    )}
                  </>
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
