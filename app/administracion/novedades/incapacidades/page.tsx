"use client"

import React, { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { createSupabaseClient } from "@/lib/supabase"
// AdminSidebar removido - ya está en el layout
// Card components removidos - usando contenedor transparente
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
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
  Plus,
  Upload,
  User,
} from "lucide-react"
import { ComentariosIncapacidades } from "@/components/incapacidades/comentarios-incapacidades"

// Interfaz para incapacidad
interface Incapacidad {
  id: string
  fecha_inicio: string
  fecha_fin: string
  fecha_subida: string
  documento_url?: string
  usuario_id: string
  estado?: string
  motivo_rechazo?: string
  admin_id?: string
  fecha_resolucion?: string
  usuario?: {
    colaborador?: string
    cedula?: string
    cargo?: string
    empresa_nombre?: string
  }
}

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
  const [incapacidades, setIncapacidades] = useState<Incapacidad[]>([])
  const [filteredIncapacidades, setFilteredIncapacidades] = useState<Incapacidad[]>([])
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  // — Estados para aprobación/rechazo
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [currentIncapacidadId, setCurrentIncapacidadId] = useState<string>("")
  const [rejectReason, setRejectReason] = useState("")
  const [actionLoading, setActionLoading] = useState(false)

  // — Filtros y búsqueda
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedEmpresa, setSelectedEmpresa] = useState<string>("all")
  const [selectedEstado, setSelectedEstado] = useState<string>("all")
  const [empresas, setEmpresas] = useState<string[]>([])
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null)
  const searchTimeout = useRef<NodeJS.Timeout | null>(null)
  const [searchLoading, setSearchLoading] = useState(false)

  // — Comentarios
  const [unseenCounts, setUnseenCounts] = useState<Record<string, number>>({})
  const [showCommentsModal, setShowCommentsModal] = useState(false)
  const [currentIncapacidadComent, setCurrentIncapacidadComent] = useState<{ id: string; usuario: any } | null>(null)

  // — Estados para el modal de nueva incapacidad
  const [showNewIncapacidadModal, setShowNewIncapacidadModal] = useState(false)
  const [newIncapacidadForm, setNewIncapacidadForm] = useState({
    usuario_id: "",
    fecha_inicio: "",
    fecha_fin: "",
    documento: null as File | null
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [userSearchTerm, setUserSearchTerm] = useState("")
  const [searchedUsers, setSearchedUsers] = useState<any[]>([])
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [userSearchLoading, setUserSearchLoading] = useState(false)
  const userSearchTimeout = useRef<NodeJS.Timeout | null>(null)

  // Formatea fecha
  const formatDate = (date: Date | string) => {
    const d = new Date(date)
    return d.toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" })
  }

  // Calcula la cantidad de días entre dos fechas
  const calculateDays = (fechaInicio: string, fechaFin: string) => {
    if (!fechaInicio || !fechaFin) return 0
    
    const inicio = new Date(fechaInicio)
    const fin = new Date(fechaFin)
    
    // Calcular la diferencia en milisegundos
    const diffTime = Math.abs(fin.getTime() - inicio.getTime())
    // Convertir a días (incluye el día de inicio)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
    
    return diffDays
  }



  // — Función para aprobar incapacidad
  const aprobarIncapacidad = async (incapacidadId: string) => {
    try {
      setActionLoading(true)
      setError("")
      
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        router.push("/login")
        return
      }

      const { error } = await supabase
        .from('incapacidades')
        .update({
          estado: 'aprobada',
          admin_id: session.user.id,
          fecha_resolucion: new Date().toISOString()
        })
        .eq('id', incapacidadId)

      if (error) throw error

      setSuccess("Incapacidad aprobada correctamente.")
      
      // Actualizar el estado local
      const updateIncapacidad = (inc: Incapacidad) => 
        inc.id === incapacidadId ? {
          ...inc,
          estado: 'aprobada',
          admin_id: session.user.id,
          fecha_resolucion: new Date().toISOString()
        } : inc

      setIncapacidades(prev => prev.map(updateIncapacidad))
      setFilteredIncapacidades(prev => prev.map(updateIncapacidad))
      
    } catch (err: any) {
      console.error("Error al aprobar incapacidad:", err)
      setError(err.message || "Error al procesar la solicitud")
    } finally {
      setActionLoading(false)
    }
  }

  // — Función para rechazar incapacidad
  const rechazarIncapacidad = async () => {
    if (!rejectReason.trim()) {
      setError("Debe ingresar un motivo de rechazo")
      return
    }

    try {
      setActionLoading(true)
      setError("")
      
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        router.push("/login")
        return
      }

      const { error } = await supabase
        .from('incapacidades')
        .update({
          estado: 'rechazada',
          admin_id: session.user.id,
          fecha_resolucion: new Date().toISOString(),
          motivo_rechazo: rejectReason.trim()
        })
        .eq('id', currentIncapacidadId)

      if (error) throw error

      setSuccess("Incapacidad rechazada correctamente.")
      
      // Actualizar el estado local
      const updateIncapacidad = (inc: Incapacidad) => 
        inc.id === currentIncapacidadId ? {
          ...inc,
          estado: 'rechazada',
          admin_id: session.user.id,
          fecha_resolucion: new Date().toISOString(),
          motivo_rechazo: rejectReason.trim()
        } : inc

      setIncapacidades(prev => prev.map(updateIncapacidad))
      setFilteredIncapacidades(prev => prev.map(updateIncapacidad))
      
      // Cerrar modal y limpiar
      setShowRejectModal(false)
      setCurrentIncapacidadId("")
      setRejectReason("")
      
    } catch (err: any) {
      console.error("Error al rechazar incapacidad:", err)
      setError(err.message || "Error al procesar la solicitud")
    } finally {
      setActionLoading(false)
    }
  }

  // — Abrir modal de rechazo
  const openRejectModal = (incapacidadId: string) => {
    setCurrentIncapacidadId(incapacidadId)
    setRejectReason("")
    setShowRejectModal(true)
  }

  // — Obtener incapacidades y empresas
  useEffect(() => {
    const fetchIncapacidades = async () => {
      setLoading(true)
      try {
        // Ejecutar consultas en paralelo para mejor rendimiento
        const [incapacidadesResult, usuariosResult] = await Promise.all([
          // 1) datos básicos de incapacidades - ahora incluyendo los nuevos campos
          supabase
            .from("incapacidades")
            .select(`id, fecha_inicio, fecha_fin, fecha_subida, documento_url, usuario_id, estado, motivo_rechazo, admin_id, fecha_resolucion`)
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
            // Asegurar que el estado tenga un valor por defecto
            estado: inc.estado || 'en_revision',
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
  const applyFilters = (search: string, empresa: string, estado: string, sort: typeof sortConfig) => {
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
    if (estado !== "all") {
      res = res.filter((i) => i.estado === estado)
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
    searchTimeout.current = setTimeout(() => applyFilters(v, selectedEmpresa, selectedEstado, sortConfig), 300)
  }

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    setSearchLoading(true)
    searchTimeout.current = setTimeout(() => applyFilters(searchTerm, selectedEmpresa, selectedEstado, sortConfig), 300)
  }, [selectedEmpresa, selectedEstado, sortConfig, incapacidades])

  const clearFilters = () => {
    setSearchTerm("")
    setSelectedEmpresa("all")
    setSelectedEstado("all")
    setSortConfig(null)
  }

  // — Función para buscar usuarios
  const searchUsers = async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setSearchedUsers([])
      return
    }

    try {
      setUserSearchLoading(true)
      
      const { data: usuarios, error } = await supabase
        .from("usuario_nomina")
        .select(`
          auth_user_id,
          colaborador,
          cedula,
          empresa_id,
          cargos:cargo_id (
            nombre
          ),
          empresas:empresa_id (
            nombre
          )
        `)
        .or(`colaborador.ilike.%${searchTerm}%,cedula.ilike.%${searchTerm}%`)
        .limit(10)

      if (error) throw error

      setSearchedUsers(usuarios || [])
    } catch (err: any) {
      console.error("Error al buscar usuarios:", err)
      setError("Error al buscar usuarios")
    } finally {
      setUserSearchLoading(false)
    }
  }

  // — Handler para búsqueda de usuarios
  const handleUserSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setUserSearchTerm(value)
    
    if (userSearchTimeout.current) clearTimeout(userSearchTimeout.current)
    userSearchTimeout.current = setTimeout(() => searchUsers(value), 300)
  }

  // — Seleccionar usuario
  const selectUser = (user: any) => {
    setSelectedUser(user)
    setNewIncapacidadForm(prev => ({ ...prev, usuario_id: user.auth_user_id }))
    setUserSearchTerm(user.colaborador)
    setSearchedUsers([])
    // Limpiar error de usuario si existe
    if (formErrors.usuario_id) {
      setFormErrors(prev => ({ ...prev, usuario_id: "" }))
    }
  }

  // — Validar formulario
  const validateForm = () => {
    const errors: Record<string, string> = {}

    if (!newIncapacidadForm.usuario_id) {
      errors.usuario_id = "Debe seleccionar un usuario"
    }

    if (!newIncapacidadForm.fecha_inicio) {
      errors.fecha_inicio = "La fecha de inicio es requerida"
    }

    if (!newIncapacidadForm.fecha_fin) {
      errors.fecha_fin = "La fecha de fin es requerida"
    }

    if (newIncapacidadForm.fecha_inicio && newIncapacidadForm.fecha_fin) {
      const fechaInicio = new Date(newIncapacidadForm.fecha_inicio)
      const fechaFin = new Date(newIncapacidadForm.fecha_fin)
      
      if (fechaFin < fechaInicio) {
        errors.fecha_fin = "La fecha de fin no puede ser anterior a la fecha de inicio"
      }
    }

    if (!newIncapacidadForm.documento) {
      errors.documento = "Debe adjuntar el documento de la incapacidad"
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // — Subir documento a Supabase Storage
  const uploadDocument = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
    const filePath = `incapacidades/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('documentos')
      .upload(filePath, file)

    if (uploadError) throw uploadError

    const { data: { publicUrl } } = supabase.storage
      .from('documentos')
      .getPublicUrl(filePath)

    return publicUrl
  }

  // — Guardar nueva incapacidad
  const saveNewIncapacidad = async () => {
    if (!validateForm()) return

    try {
      setActionLoading(true)
      setError("")

      // Subir documento
      const documentUrl = await uploadDocument(newIncapacidadForm.documento!)

      // Crear registro de incapacidad
      const { error: insertError } = await supabase
        .from('incapacidades')
        .insert({
          usuario_id: newIncapacidadForm.usuario_id,
          fecha_inicio: newIncapacidadForm.fecha_inicio,
          fecha_fin: newIncapacidadForm.fecha_fin,
          documento_url: documentUrl,
          fecha_subida: new Date().toISOString(),
          estado: 'en_revision'
        })

      if (insertError) throw insertError

      setSuccess("Incapacidad registrada correctamente")
      
      // Cerrar modal y limpiar formulario
      setShowNewIncapacidadModal(false)
      resetForm()
      
      // Recargar datos
      window.location.reload()

    } catch (err: any) {
      console.error("Error al guardar incapacidad:", err)
      setError(err.message || "Error al guardar la incapacidad")
    } finally {
      setActionLoading(false)
    }
  }

  // — Resetear formulario
  const resetForm = () => {
    setNewIncapacidadForm({
      usuario_id: "",
      fecha_inicio: "",
      fecha_fin: "",
      documento: null
    })
    setFormErrors({})
    setUserSearchTerm("")
    setSearchedUsers([])
    setSelectedUser(null)
  }

  // — Abrir modal de nueva incapacidad
  const openNewIncapacidadModal = () => {
    resetForm()
    setShowNewIncapacidadModal(true)
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
              <div className="w-full md:w-48">
                <Select value={selectedEstado} onValueChange={setSelectedEstado}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filtrar por estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los estados</SelectItem>
                    <SelectItem value="en_revision">En revisión</SelectItem>
                    <SelectItem value="aprobada">Aprobado</SelectItem>
                    <SelectItem value="rechazada">Rechazado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" className="w-full md:w-auto" onClick={clearFilters}>
                <X className="mr-2 h-4 w-4" />
                Limpiar filtros
              </Button>

              <Button 
                className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white" 
                onClick={openNewIncapacidadModal}
              >
                <Plus className="mr-2 h-4 w-4" />
                Nueva Incapacidad
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
                    <TableHead className="text-center">Cantidad de Días</TableHead>
                    <TableHead onClick={() => requestSort("fecha_subida")} className="cursor-pointer">
                      Fecha Subida
                      {sortConfig?.key === "fecha_subida" && (
                        sortConfig.direction === "asc" ? <ChevronUp className="inline h-4 w-4" /> : <ChevronDown className="inline h-4 w-4" />
                      )}
                    </TableHead>
                    <TableHead>Estado</TableHead>
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
                          <Skeleton className="h-4 w-[60px]" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-[100px]" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-6 w-[80px] rounded-full" />
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
                      <TableCell colSpan={10} className="text-center py-8">
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
                        <TableCell className="text-center font-medium">
                          {inc.fecha_inicio && inc.fecha_fin ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                              {calculateDays(inc.fecha_inicio, inc.fecha_fin)} días
                            </span>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell>{inc.fecha_subida ? formatDate(inc.fecha_subida) : "—"}</TableCell>
                        <TableCell>
                          <Badge
                            className={
                              inc.estado === 'aprobada'
                                ? 'bg-green-100 text-green-800'
                                : inc.estado === 'rechazada'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }
                          >
                            {inc.estado === 'en_revision' ? 'En revisión' : 
                             inc.estado === 'aprobada' ? 'Aprobado' : 
                             inc.estado === 'rechazada' ? 'Rechazado' : 
                             inc.estado?.charAt(0).toUpperCase() + inc.estado?.slice(1) || 'En revisión'}
                          </Badge>
                        </TableCell>
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
                          <div className="flex space-x-2">
                            {inc.estado === 'en_revision' ? (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openRejectModal(inc.id)}
                                  disabled={actionLoading}
                                >
                                  Rechazar
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => aprobarIncapacidad(inc.id)}
                                  disabled={actionLoading}
                                >
                                  Aprobar
                                </Button>
                              </>
                            ) : inc.estado === 'rechazada' ? (
                              <div className="text-sm text-red-600">
                                <div>Rechazado</div>
                                {inc.motivo_rechazo && (
                                  <div className="text-xs text-gray-500 max-w-xs truncate" title={inc.motivo_rechazo}>
                                    {inc.motivo_rechazo}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="text-sm text-green-600">
                                Aprobado
                              </div>
                            )}
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

      {/* Modal de rechazo */}
      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Rechazar Incapacidad</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="motivo">Motivo del rechazo *</Label>
              <Textarea
                id="motivo"
                placeholder="Ingrese el motivo por el cual se rechaza la incapacidad..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="mt-1"
                rows={4}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowRejectModal(false)
                  setRejectReason("")
                  setCurrentIncapacidadId("")
                }}
                disabled={actionLoading}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={rechazarIncapacidad}
                disabled={actionLoading || !rejectReason.trim()}
              >
                {actionLoading ? "Procesando..." : "Rechazar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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

      {/* Modal de nueva incapacidad */}
      <Dialog open={showNewIncapacidadModal} onOpenChange={setShowNewIncapacidadModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Registrar Nueva Incapacidad
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Búsqueda de usuario */}
            <div className="space-y-2">
              <Label htmlFor="user-search">Usuario *</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="user-search"
                  type="text"
                  placeholder="Buscar por nombre o cédula..."
                  className="pl-10"
                  value={userSearchTerm}
                  onChange={handleUserSearchChange}
                />
                {userSearchLoading && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  </div>
                )}
              </div>
              
              {/* Resultados de búsqueda */}
              {searchedUsers.length > 0 && (
                <div className="border rounded-lg max-h-40 overflow-y-auto">
                  {searchedUsers.map((user) => (
                    <div
                      key={user.auth_user_id}
                      className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                      onClick={() => selectUser(user)}
                    >
                      <div className="font-medium">{user.colaborador}</div>
                      <div className="text-sm text-gray-500">
                        {user.cedula} - {user.empresas?.nombre} - {user.cargos?.nombre}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Usuario seleccionado */}
              {selectedUser && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="font-medium text-blue-900">{selectedUser.colaborador}</div>
                  <div className="text-sm text-blue-700">
                    {selectedUser.cedula} - {selectedUser.empresas?.nombre}
                  </div>
                </div>
              )}
              
              {formErrors.usuario_id && (
                <p className="text-sm text-red-600">{formErrors.usuario_id}</p>
              )}
            </div>

            {/* Fechas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fecha-inicio">Fecha de Inicio *</Label>
                <Input
                  id="fecha-inicio"
                  type="date"
                  value={newIncapacidadForm.fecha_inicio}
                  onChange={(e) => {
                    setNewIncapacidadForm(prev => ({ ...prev, fecha_inicio: e.target.value }))
                    if (formErrors.fecha_inicio) {
                      setFormErrors(prev => ({ ...prev, fecha_inicio: "" }))
                    }
                  }}
                />
                {formErrors.fecha_inicio && (
                  <p className="text-sm text-red-600">{formErrors.fecha_inicio}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="fecha-fin">Fecha de Fin *</Label>
                <Input
                  id="fecha-fin"
                  type="date"
                  value={newIncapacidadForm.fecha_fin}
                  onChange={(e) => {
                    setNewIncapacidadForm(prev => ({ ...prev, fecha_fin: e.target.value }))
                    if (formErrors.fecha_fin) {
                      setFormErrors(prev => ({ ...prev, fecha_fin: "" }))
                    }
                  }}
                />
                {formErrors.fecha_fin && (
                  <p className="text-sm text-red-600">{formErrors.fecha_fin}</p>
                )}
              </div>
            </div>

            {/* Mostrar días calculados */}
            {newIncapacidadForm.fecha_inicio && newIncapacidadForm.fecha_fin && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="text-sm text-green-700">
                  <strong>Días de incapacidad:</strong> {calculateDays(newIncapacidadForm.fecha_inicio, newIncapacidadForm.fecha_fin)} días
                </div>
              </div>
            )}

            {/* Documento */}
            <div className="space-y-2">
              <Label htmlFor="documento">Documento de Incapacidad *</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="mt-4">
                  <label htmlFor="documento" className="cursor-pointer">
                    <span className="mt-2 block text-sm font-medium text-gray-900">
                      Seleccionar archivo
                    </span>
                    <span className="mt-1 block text-xs text-gray-500">
                      PDF, JPG, PNG hasta 10MB
                    </span>
                  </label>
                  <input
                    id="documento"
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        setNewIncapacidadForm(prev => ({ ...prev, documento: file }))
                        if (formErrors.documento) {
                          setFormErrors(prev => ({ ...prev, documento: "" }))
                        }
                      }
                    }}
                  />
                </div>
              </div>
              
              {newIncapacidadForm.documento && (
                <div className="p-3 bg-gray-50 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <Upload className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">{newIncapacidadForm.documento.name}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setNewIncapacidadForm(prev => ({ ...prev, documento: null }))
                        const input = document.getElementById('documento') as HTMLInputElement
                        if (input) input.value = ''
                      }}
                      className="ml-auto text-red-600 hover:text-red-800"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
              
              {formErrors.documento && (
                <p className="text-sm text-red-600">{formErrors.documento}</p>
              )}
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setShowNewIncapacidadModal(false)}
              disabled={actionLoading}
            >
              Cancelar
            </Button>
            <Button
              onClick={saveNewIncapacidad}
              disabled={actionLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {actionLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Guardando...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Guardar Incapacidad
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
