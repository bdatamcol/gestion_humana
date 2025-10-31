"use client"

import { useState, useEffect } from "react"
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
import { Search, X, MessageSquare } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ComentariosVacaciones } from "@/components/vacaciones/comentarios-vacaciones"

export default function AdminSolicitudesVacaciones() {
  const router = useRouter()
  const [solicitudes, setSolicitudes] = useState<any[]>([])
  const [filteredSolicitudes, setFilteredSolicitudes] = useState<any[]>([])
  const [empresas, setEmpresas] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // filtros
  const [searchTerm, setSearchTerm] = useState<string>("")
  const [selectedEstado, setSelectedEstado] = useState<string>("all")
  const [selectedEmpresa, setSelectedEmpresa] = useState<string>("all")
  const [showCommentsModal, setShowCommentsModal] = useState(false)
  const [selectedSolicitudId, setSelectedSolicitudId] = useState<string | null>(null)
  const [showMotivoModal, setShowMotivoModal] = useState(false)
  const [selectedMotivo, setSelectedMotivo] = useState<string>("")

  useEffect(() => {
    const fetchSolicitudes = async () => {
      setLoading(true)
      try {
        const supabase = createSupabaseClient()

        // 1. Obtener solicitudes de vacaciones
        const solicitudesPromise = supabase
          .from("solicitudes_vacaciones")
          .select(
            `
              id,
              usuario_id,
              admin_id,
              estado,
              fecha_inicio,
              fecha_fin,
              fecha_solicitud,
              fecha_resolucion,
              motivo_rechazo
            `
          )
          .order("fecha_solicitud", { ascending: false })

        const [{ data, error: fetchError }] = await Promise.all([solicitudesPromise])

        if (fetchError) throw fetchError
        if (!data) {
          setSolicitudes([])
          setFilteredSolicitudes([])
          return
        }

        // 2. Obtener datos de usuarios y admins en paralelo
        const userIds = Array.from(new Set(data.map((s) => s.usuario_id)))
        const adminIds = Array.from(
          new Set(data.filter((s) => s.admin_id).map((s) => s.admin_id!))
        )

        const usuariosPromise = supabase
          .from("usuario_nomina")
          .select(
            `
              auth_user_id,
              colaborador,
              cedula,
              cargo_id,
              empresa_id,
              empresas:empresa_id(nombre),
              cargos:cargo_id(nombre)
            `
          )
          .in("auth_user_id", userIds)

        const adminsPromise = supabase
          .from("usuario_nomina")
          .select("auth_user_id, colaborador")
          .in("auth_user_id", adminIds)

        const [
          { data: usuariosData, error: usuariosError },
          { data: adminsData, error: adminsError }
        ] = await Promise.all([usuariosPromise, adminsPromise])

        if (usuariosError) throw usuariosError
        if (adminsError) throw adminsError

        // 3. Combinar y extraer empresas
        const completas = data.map((s) => {
          const usuario = usuariosData?.find((u) => u.auth_user_id === s.usuario_id) || null
          const admin = adminsData?.find((a) => a.auth_user_id === s.admin_id) || null
          return { ...s, usuario, admin }
        })

        setSolicitudes(completas)
        setFilteredSolicitudes(completas)

        // Definir el tipo para empresas y extraer nombres únicos
        interface EmpresaData {
          nombre?: string;
        }
        
        const uniqueEmpresas = Array.from(
          new Set(
            usuariosData
              .filter(u => u.empresas && typeof u.empresas === 'object')
              .map((u) => {
                const empresas = u.empresas as EmpresaData;
                return empresas.nombre;
              })
              .filter((n): n is string => Boolean(n))
          )
        )
        setEmpresas(uniqueEmpresas)
      } catch (err: any) {
        console.error(err)
        setError(err.message || "Error al cargar las solicitudes")
      } finally {
        setLoading(false)
      }
    }

    fetchSolicitudes()
  }, [])

  // efecto para aplicar filtros
  useEffect(() => {
    let result = [...solicitudes]

    // búsqueda
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter((s) => {
        const u = s.usuario
        return (
          u?.colaborador.toLowerCase().includes(term) ||
          u?.cargos?.nombre?.toLowerCase().includes(term) ||
          u?.empresas?.nombre.toLowerCase().includes(term)
        )
      })
    }

    // estado
    if (selectedEstado !== "all") {
      result = result.filter((s) => s.estado === selectedEstado)
    }

    // empresa
    if (selectedEmpresa !== "all") {
      result = result.filter(
        (s) => s.usuario?.empresas?.nombre === selectedEmpresa
      )
    }

    setFilteredSolicitudes(result)
  }, [searchTerm, selectedEstado, selectedEmpresa, solicitudes])

  const clearFilters = () => {
    setSearchTerm("")
    setSelectedEstado("all")
    setSelectedEmpresa("all")
  }

  const formatDate = (fecha?: string | null) => {
    if (!fecha) return ""
    
    // If it's a string in YYYY-MM-DD format, parse it manually to avoid timezone issues
    if (fecha.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = fecha.split('-').map(Number)
      return new Date(year, month - 1, day).toLocaleDateString("es-CO", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    }
    
    return new Date(fecha).toLocaleDateString("es-CO", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const calcularDiasVacaciones = (inicio: string, fin: string) => {
    // Crear fechas en zona horaria local para evitar problemas de UTC
    const start = new Date(inicio + 'T00:00:00')
    const end = new Date(fin + 'T00:00:00')
    
    let diasVacaciones = 0
    const fechaActual = new Date(start.getFullYear(), start.getMonth(), start.getDate())
    
    // Iterar día por día desde la fecha de inicio hasta la fecha de fin
    while (fechaActual <= end) {
      // Solo contar si no es domingo (día 0)
      if (fechaActual.getDay() !== 0) {
        diasVacaciones++
      }
      // Avanzar al siguiente día
      fechaActual.setDate(fechaActual.getDate() + 1)
    }
    
    return diasVacaciones
  }

  const handleShowComments = (solicitudId: string) => {
    setSelectedSolicitudId(solicitudId)
    setShowCommentsModal(true)
  }

  const handleShowMotivo = (motivo: string) => {
    setSelectedMotivo(motivo)
    setShowMotivoModal(true)
  }

  return (
    <div className="min-h-screen">
      <div className="flex flex-col flex-1">
        <main className="flex-1 py-6">
          <div className="w-full mx-auto space-y-6">
            {/* Título */}
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold">Histórico - Solicitudes de Vacaciones</h1>
            <p className="text-muted-foreground">Gestiona las solicitudes de vacaciones.</p>
            </div>
            <Button variant="outline" onClick={() => router.push('/administracion/solicitudes/vacaciones')}>Volver a vacaciones</Button>
            </div>
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
                        placeholder="Buscar por nombre, cargo, empresa..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                      {searchTerm && (
                        <button
                          type="button"
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
                        <SelectItem value="all">Todos los estados</SelectItem>
                        <SelectItem value="pendiente">Pendiente</SelectItem>
                        <SelectItem value="aprobado">Aprobado</SelectItem>
                        <SelectItem value="rechazado">Rechazado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-full md:w-1/5">
                    <Label htmlFor="empresa" className="mb-2 block">
                      Empresa
                    </Label>
                    <Select
                      value={selectedEmpresa}
                      onValueChange={setSelectedEmpresa}
                    >
                      <SelectTrigger id="empresa">
                        <SelectValue placeholder="Todas las empresas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas las empresas</SelectItem>
                        {empresas.map((e) => (
                          <SelectItem key={e} value={e}>
                            {e}
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
                {loading ? (
                  <div className="space-y-4 p-6">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-[300px]" />
                      <Skeleton className="h-4 w-[250px]" />
                    </div>
                    <div className="space-y-3">
                      {[...Array(8)].map((_, i) => (
                        <div key={i} className="flex space-x-4">
                          <Skeleton className="h-4 w-[120px]" />
                          <Skeleton className="h-4 w-[100px]" />
                          <Skeleton className="h-4 w-[80px]" />
                          <Skeleton className="h-4 w-[80px]" />
                          <Skeleton className="h-4 w-[60px]" />
                          <Skeleton className="h-4 w-[100px]" />
                          <Skeleton className="h-6 w-[80px]" />
                          <Skeleton className="h-4 w-[100px]" />
                          <Skeleton className="h-8 w-[80px]" />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Colaborador</TableHead>
                        <TableHead>Cargo</TableHead>
                        <TableHead>Inicio</TableHead>
                        <TableHead>Fin</TableHead>
                        <TableHead>Días</TableHead>
                        <TableHead>Solicitud</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Empresa</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      { filteredSolicitudes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-4">
                          No hay solicitudes.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredSolicitudes.map((sol) => (
                        <TableRow key={sol.id}>
                          <TableCell>{sol.usuario?.colaborador}</TableCell>
                          <TableCell>{sol.usuario?.cargos?.nombre || 'N/A'}</TableCell>
                          <TableCell>{formatDate(sol.fecha_inicio)}</TableCell>
                          <TableCell>{formatDate(sol.fecha_fin)}</TableCell>
                          <TableCell>
                            {sol.fecha_inicio && sol.fecha_fin
                              ? `${calcularDiasVacaciones(
                                  sol.fecha_inicio,
                                  sol.fecha_fin
                                )} días`
                              : ""}
                          </TableCell>
                          <TableCell>
                            {formatDate(sol.fecha_solicitud)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                sol.estado === "aprobado"
                                  ? "secondary"
                                  : sol.estado === "rechazado"
                                  ? "destructive"
                                  : "default"
                              }
                              className={ // Add the className prop
                                sol.estado === "aprobado"
                                  ? "bg-green-100 text-green-800 hover:bg-green-200"
                                  : sol.estado === "rechazado"
                                 ? "bg-red-100 text-red-800 hover:bg-red-200"
                                  : "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                                  
                              }
                            >
                              {sol.estado.charAt(0).toUpperCase() +
                                sol.estado.slice(1)}
                            </Badge>
                            {sol.admin && (
                              <div className="text-xs text-gray-500 mt-1">
                                Por: {sol.admin.colaborador}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {sol.usuario?.empresas?.nombre}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleShowComments(sol.id)}
                              >
                                <MessageSquare className="h-4 w-4" />
                              </Button>
                              {sol.estado === "rechazado" && sol.motivo_rechazo && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleShowMotivo(sol.motivo_rechazo)}
                                >
                                  Ver motivo
                                </Button>
                              )}
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

      {/* Modal de Comentarios */}
      <Dialog open={showCommentsModal} onOpenChange={setShowCommentsModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Comentarios de la solicitud</DialogTitle>
          </DialogHeader>
          {selectedSolicitudId && (
            <ComentariosVacaciones solicitudId={selectedSolicitudId} />
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Motivo de Rechazo */}
      <Dialog open={showMotivoModal} onOpenChange={setShowMotivoModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Motivo de rechazo</DialogTitle>
          </DialogHeader>
          <div className="p-4">
            <p className="text-sm text-gray-700">{selectedMotivo}</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
