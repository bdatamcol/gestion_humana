"use client"

import React, { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { createSupabaseClient } from "@/lib/supabase"
// AdminSidebar removido - ya está en el layout
// Card components removidos - usando contenedor transparente
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import {
  AlertCircle,
  CheckCircle2,
  Calendar,
  Search,
  X,
  ChevronUp,
  ChevronDown,
  Download,
  MessageSquare,
} from "lucide-react"
import { ComentariosIncapacidades } from "@/components/incapacidades/comentarios-incapacidades"

export default function AdminNovedadesIncapacidades() {
  const router = useRouter()
  const supabase = createSupabaseClient()

  // — Admin ID
  const [adminId, setAdminId] = useState<string | null>(null)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setAdminId(session.user.id)
    })
  }, [supabase.auth])

  // — Datos principales
  const [loading, setLoading] = useState(false)
  const [incapacidades, setIncapacidades] = useState<any[]>([])
  const [filteredIncapacidades, setFilteredIncapacidades] = useState<any[]>([])
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  // — Filtros y búsqueda
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedEmpresa, setSelectedEmpresa] = useState<string>("all")
  const [empresas, setEmpresas] = useState<string[]>([])
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null)
  const searchTimeout = useRef<NodeJS.Timeout | null>(null)
  const [searchLoading, setSearchLoading] = useState(false)

  // — Comentarios
  const [unseenCounts, setUnseenCounts] = useState<Record<string, number>>({})
  const [showCommentsModal, setShowCommentsModal] = useState(false)
  const [currentIncapacidadComent, setCurrentIncapacidadComent] = useState<{ id: string; usuario: any } | null>(null)

  // Formatea fecha
  const formatDate = (date: Date | string) => {
    const d = new Date(date)
    return d.toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" })
  }

  // — Obtener incapacidades y empresas
  useEffect(() => {
    const fetchIncapacidades = async () => {
      setLoading(true)
      try {
        // Ejecutar consultas en paralelo para mejor rendimiento
        const [incapacidadesResult, usuariosResult] = await Promise.all([
          // 1) datos básicos de incapacidades
          supabase
            .from("incapacidades")
            .select(`id, fecha_inicio, fecha_fin, fecha_subida, documento_url, usuario_id`)
            .order("fecha_subida", { ascending: false }),
          // 2) datos de usuarios con relación a cargos
          supabase
            .from("usuario_nomina")
            .select(`
              auth_user_id, 
              colaborador, 
              cedula, 
              empresa_id,
              cargos:cargo_id (
                nombre
              )
            `)
        ])

        const { data, error: err1 } = incapacidadesResult
        const { data: usuariosData, error: err2 } = usuariosResult

        if (err1) {
          console.error("Error en consulta de incapacidades:", {
            error: err1,
            message: err1?.message,
            details: err1?.details,
            hint: err1?.hint,
            code: err1?.code,
            stringified: JSON.stringify(err1)
          })
          const errorMsg = err1?.message || err1?.details || err1?.hint || (typeof err1 === 'string' ? err1 : 'Error desconocido en consulta de incapacidades')
          throw new Error(`Error al obtener incapacidades: ${errorMsg}`)
        }

        if (err2) {
          console.error("Error en consulta de usuarios:", {
            error: err2,
            message: err2?.message,
            details: err2?.details,
            hint: err2?.hint,
            code: err2?.code,
            stringified: JSON.stringify(err2)
          })
          const errorMsg = err2?.message || err2?.details || err2?.hint || (typeof err2 === 'string' ? err2 : 'Error desconocido en consulta de usuarios')
          throw new Error(`Error al obtener usuarios: ${errorMsg}`)
        }

        // 3) obtener nombres de empresas por separado
        const empresaIds = Array.from(new Set(
          usuariosData.map((u) => u.empresa_id).filter((id): id is number => !!id)
        ))
        
        if (empresaIds.length === 0) {
          console.warn("No se encontraron IDs de empresas válidos")
          setEmpresas([])
          setIncapacidades(data.map(inc => ({
            ...inc,
            usuario: {
              colaborador: "—",
              cedula: "—",
              cargo: "—",
              empresa_nombre: "—"
            }
          })))
          setFilteredIncapacidades(data.map(inc => ({
            ...inc,
            usuario: {
              colaborador: "—",
              cedula: "—",
              cargo: "—",
              empresa_nombre: "—"
            }
          })))
          return
        }
        
        const { data: empresasData, error: err3 } = await supabase
          .from("empresas")
          .select(`id, nombre`)
          .in("id", empresaIds)
        if (err3) {
          console.error("Error en consulta de empresas:", {
            error: err3,
            message: err3?.message,
            details: err3?.details,
            hint: err3?.hint,
            code: err3?.code,
            stringified: JSON.stringify(err3)
          })
          const errorMsg = err3?.message || err3?.details || err3?.hint || (typeof err3 === 'string' ? err3 : 'Error desconocido en consulta de empresas')
          throw new Error(`Error al obtener empresas: ${errorMsg}`)
        }

        // 4) Validar que los datos no sean null
        if (!data) {
          console.warn("No se obtuvieron datos de incapacidades")
          setIncapacidades([])
          setFilteredIncapacidades([])
          setEmpresas([])
          return
        }
        
        if (!usuariosData) {
          console.warn("No se obtuvieron datos de usuarios")
          setIncapacidades(data.map(inc => ({
            ...inc,
            usuario: {
              colaborador: "—",
              cedula: "—",
              cargo: "—",
              empresa_nombre: "—"
            }
          })))
          setFilteredIncapacidades(data.map(inc => ({
            ...inc,
            usuario: {
              colaborador: "—",
              cedula: "—",
              cargo: "—",
              empresa_nombre: "—"
            }
          })))
          setEmpresas([])
          return
        }
        
        if (!empresasData) {
          console.warn("No se obtuvieron datos de empresas")
          const completosWithoutEmpresas = data.map((inc) => {
            const usu = usuariosData.find((u) => u.auth_user_id === inc.usuario_id)
            return {
              ...inc,
              usuario: {
                colaborador: usu?.colaborador || "—",
                cedula: usu?.cedula || "—",
                cargo: usu?.cargos ? (usu.cargos as any).nombre || "—" : "—",
                empresa_nombre: "—",
              },
            }
          })
          setIncapacidades(completosWithoutEmpresas)
          setFilteredIncapacidades(completosWithoutEmpresas)
          setEmpresas([])
          return
        }

        // 5) unir usuario + nombre de empresa
        const completos = data.map((inc) => {
          // buscamos al usuario (puede ser undefined)
          const usu = usuariosData.find((u) => u.auth_user_id === inc.usuario_id)
          // extraemos el nombre de la empresa si existe
          const emp = empresasData.find((e) => e.id === usu?.empresa_id)
        
          return {
            ...inc,
            usuario: {
              colaborador: usu?.colaborador  || "—",
              cedula:       usu?.cedula      || "—",
              cargo: usu?.cargos ? (usu.cargos as any).nombre || "—" : "—",
              empresa_nombre: emp?.nombre    || "—",
            },
          }
        })
        

        setIncapacidades(completos)
        setFilteredIncapacidades(completos)

        // 6) lista de empresas para el filtro
        setEmpresas(empresasData.map((e) => e.nombre as string).filter(Boolean))
      } catch (err: any) {
        console.error("Error al cargar las incapacidades:", {
          error: err,
          message: err?.message,
          details: err?.details,
          hint: err?.hint,
          code: err?.code
        })
        
        let errorMessage = "Error al cargar las incapacidades: "
        if (err?.message) {
          errorMessage += err.message
        } else if (err?.details) {
          errorMessage += err.details
        } else if (typeof err === 'string') {
          errorMessage += err
        } else {
          errorMessage += "Error desconocido en la consulta"
        }
        
        setError(errorMessage)
      } finally {
        setLoading(false)
      }
    }
    fetchIncapacidades()
  }, [supabase])

  // — Conteo inicial de comentarios no vistos
  const fetchUnseenCount = async (incId: string) => {
    if (!adminId) return
    const { count, error: cntErr } = await supabase
      .from("comentarios_incapacidades")
      .select("*", { head: true, count: "exact" })
      .eq("incapacidad_id", incId)
      .eq("visto_admin", false)
      .neq("usuario_id", adminId)
    if (!cntErr) setUnseenCounts((p) => ({ ...p, [incId]: count || 0 }))
  }

  useEffect(() => {
    incapacidades.forEach((inc) => fetchUnseenCount(inc.id))
  }, [incapacidades, adminId])

  // — Realtime nuevos comentarios
  useEffect(() => {
    if (!adminId) return
    const channel = supabase
      .channel("comentarios_admin_incapacidades")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "comentarios_incapacidades" },
        (payload) => {
          const nuevo = payload.new as any
          if (nuevo.usuario_id !== adminId) {
            setUnseenCounts((p) => ({
              ...p,
              [nuevo.incapacidad_id]: (p[nuevo.incapacidad_id] || 0) + 1,
            }))
          }
        }
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [adminId, supabase])

  // — Abrir modal de comentarios
  const openComments = async (incId: string, usuario: any) => {
    // marcar vistos
    await supabase
      .from("comentarios_incapacidades")
      .update({ visto_admin: true })
      .eq("incapacidad_id", incId)
      .eq("visto_admin", false)
      .neq("usuario_id", adminId)
    setUnseenCounts((p) => ({ ...p, [incId]: 0 }))
    setCurrentIncapacidadComent({ id: incId, usuario })
    setShowCommentsModal(true)
  }

  // — Descarga PDF
  const descargarDocumento = async (url: string) => {
    try {
      const res = await fetch(url)
      const blob = await res.blob()
      const link = document.createElement("a")
      link.href = URL.createObjectURL(blob)
      link.download = "incapacidad.pdf"
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (err) {
      console.error(err)
      setError("Error al descargar el documento")
    }
  }

  // — Ordenar
  const requestSort = (key: string) => {
    let direction: "asc" | "desc" = "asc"
    if (sortConfig?.key === key && sortConfig.direction === "asc") direction = "desc"
    setSortConfig({ key, direction })
  }

  // — Filtrar y buscar
  const applyFilters = (search: string, empresa: string, sort: typeof sortConfig) => {
    let res = [...incapacidades]
    if (search) {
      const term = search.toLowerCase()
      res = res.filter(
        (i) =>
          i.usuario?.colaborador?.toLowerCase().includes(term) ||
          i.usuario?.cedula?.toLowerCase().includes(term) ||
          i.usuario?.cargo?.toLowerCase().includes(term) ||
          i.usuario?.empresa_nombre?.toLowerCase().includes(term)
      )
    }
    if (empresa !== "all") {
      res = res.filter((i) => i.usuario?.empresa_nombre === empresa)
    }
    if (sort) {
      res.sort((a, b) => {
        let aVal: any, bVal: any
        if (sort.key === "colaborador") {
          aVal = a.usuario?.colaborador || ""
          bVal = b.usuario?.colaborador || ""
        } else if (["fecha_subida", "fecha_inicio", "fecha_fin"].includes(sort.key)) {
          aVal = new Date(a[sort.key]).getTime()
          bVal = new Date(b[sort.key]).getTime()
        } else {
          aVal = a[sort.key]
          bVal = b[sort.key]
        }
        if (aVal < bVal) return sort.direction === "asc" ? -1 : 1
        if (aVal > bVal) return sort.direction === "asc" ? 1 : -1
        return 0
      })
    }
    setFilteredIncapacidades(res)
    setSearchLoading(false)
  }

  // — Handlers de búsqueda
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    setSearchTerm(v)
    setSearchLoading(true)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => applyFilters(v, selectedEmpresa, sortConfig), 300)
  }

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    setSearchLoading(true)
    searchTimeout.current = setTimeout(() => applyFilters(searchTerm, selectedEmpresa, sortConfig), 300)
  }, [selectedEmpresa, sortConfig, incapacidades])

  const clearFilters = () => {
    setSearchTerm("")
    setSelectedEmpresa("all")
    setSortConfig(null)
  }

  return (
    <div className="py-6 flex">
      <div className="w-full mx-auto flex-1">
        <div className="w-full bg-white rounded-lg shadow-sm p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">Gestión de Incapacidades</h1>
            <p className="text-muted-foreground">
              Visualiza y gestiona las incapacidades registradas.
            </p>
          </div>
          <div className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {success && (
              <Alert className="bg-green-100 text-green-800 border-green-200">
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            {/* Filtros */}  
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  type="search"
                  placeholder="Buscar por nombre, cédula, cargo o empresa..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={handleSearchChange}
                />
                {searchLoading && (
                  <div className="absolute right-2.5 top-2.5 animate-spin">
                    <X className="h-4 w-4 text-gray-500" />
                  </div>
                )}
              </div>
              <div className="w-full md:w-64">
                <Select value={selectedEmpresa} onValueChange={setSelectedEmpresa}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filtrar por empresa" />
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
              <Button variant="outline" className="w-full md:w-auto" onClick={clearFilters}>
                <X className="mr-2 h-4 w-4" />
                Limpiar filtros
              </Button>
            </div>

            {/* Tabla */}  
            <div className="rounded-md border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Cédula</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead onClick={() => requestSort("fecha_inicio")} className="cursor-pointer">
                      Fecha Inicio
                      {sortConfig?.key === "fecha_inicio" && (
                        sortConfig.direction === "asc" ? <ChevronUp className="inline h-4 w-4" /> : <ChevronDown className="inline h-4 w-4" />
                      )}
                    </TableHead>
                    <TableHead onClick={() => requestSort("fecha_fin")} className="cursor-pointer">
                      Fecha Fin
                      {sortConfig?.key === "fecha_fin" && (
                        sortConfig.direction === "asc" ? <ChevronUp className="inline h-4 w-4" /> : <ChevronDown className="inline h-4 w-4" />
                      )}
                    </TableHead>
                    <TableHead onClick={() => requestSort("fecha_subida")} className="cursor-pointer">
                      Fecha Subida
                      {sortConfig?.key === "fecha_subida" && (
                        sortConfig.direction === "asc" ? <ChevronUp className="inline h-4 w-4" /> : <ChevronDown className="inline h-4 w-4" />
                      )}
                    </TableHead>
                    <TableHead>Documento</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    // Skeleton loader para incapacidades
                    Array.from({ length: 5 }).map((_, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Skeleton className="h-4 w-[120px]" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-[100px]" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-[140px]" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-[100px]" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-[100px]" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-[100px]" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-8 w-[80px] rounded" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-8 w-[120px] rounded" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : filteredIncapacidades.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        No se encontraron incapacidades
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredIncapacidades.map((inc) => (
                      <TableRow key={inc.id}>
                        <TableCell>{inc.usuario?.colaborador || "—"}</TableCell>
                        <TableCell>{inc.usuario?.cedula || "—"}</TableCell>
                        <TableCell>{inc.usuario?.empresa_nombre || "—"}</TableCell>
                        <TableCell>{inc.fecha_inicio ? formatDate(inc.fecha_inicio) : "—"}</TableCell>
                        <TableCell>{inc.fecha_fin ? formatDate(inc.fecha_fin) : "—"}</TableCell>
                        <TableCell>{inc.fecha_subida ? formatDate(inc.fecha_subida) : "—"}</TableCell>
                        <TableCell>
                          {inc.documento_url ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => descargarDocumento(inc.documento_url)}
                            >
                              <Download className="h-4 w-4 mr-1" />PDF
                            </Button>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="relative inline-block">
                            {unseenCounts[inc.id] > 0 && (
                              <span className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full text-xs w-5 h-5 flex items-center justify-center">
                                {unseenCounts[inc.id]}
                              </span>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openComments(inc.id, inc.usuario)}
                            >
                              <MessageSquare className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de comentarios */}
      {currentIncapacidadComent && (
        <Dialog
          open={showCommentsModal}
          onOpenChange={(open) => {
            if (!open) setCurrentIncapacidadComent(null)
            setShowCommentsModal(open)
          }}
        >
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>
                Comentarios de {currentIncapacidadComent.usuario.colaborador}
              </DialogTitle>
            </DialogHeader>
            <ComentariosIncapacidades incapacidadId={currentIncapacidadComent.id} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
