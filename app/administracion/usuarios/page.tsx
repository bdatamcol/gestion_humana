"use client"

import type React from "react"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
// AdminSidebar removido - ya está en el layout
import { createSupabaseClient } from "@/lib/supabase"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronDown, ChevronUp, Search, X, Eye, ArrowUpDown, ChevronLeft, ChevronRight, Loader2, Plus, Edit, Download, Upload, Table as TableIcon } from "lucide-react"
import { ProfileCard } from "@/components/ui/profile-card"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { PermissionsManager } from "@/components/ui/permissions-manager"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"

export default function Usuarios() {
  const router = useRouter()
  const [users, setUsers] = useState<any[]>([])
  const [filteredUsers, setFilteredUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortConfig, setSortConfig] = useState<{
    key: string
    direction: "asc" | "desc"
  } | null>(null)
  const [empresas, setEmpresas] = useState<any[]>([])
  const [empresasFilter, setEmpresasFilter] = useState<string[]>([])
  const [cargos, setCargos] = useState<any[]>([])
  const [selectedEmpresa, setSelectedEmpresa] = useState<string>("")
  const [selectedCargo, setSelectedCargo] = useState<string>("all")
  const [selectedEstado, setSelectedEstado] = useState<string>("all")
  const [selectedRol, setSelectedRol] = useState<string>("all")
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false)
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false)
  const [editUserData, setEditUserData] = useState<any>(null)
  const [newUserData, setNewUserData] = useState({
    nombre: '',
    correo: '',
    telefono: '',
    rol: 'usuario',
    genero: '',
    cedula: '',
    fecha_ingreso: '',
    empresa_id: '',
    cargo_id: '',
    sede_id: '',
    fecha_nacimiento: '',
    edad: '',
    rh: '',
    tipo_de_contrato: '',
    eps_id: '',
    afp_id: '',
    cesantias_id: '',
    caja_de_compensacion_id: '',
    direccion_residencia: ''
  })
  const [sedes, setSedes] = useState<any[]>([]);
  const [eps, setEps] = useState<any[]>([]);
  const [afps, setAfps] = useState<any[]>([]);
  const [cesantias, setCesantias] = useState<any[]>([]);
  const [cajaDeCompensacionOptions, setCajaDeCompensacionOptions] = useState<any[]>([]);
  const [addUserError, setAddUserError] = useState('')
  const [addUserSuccess, setAddUserSuccess] = useState(false)

  const [addUserLoading, setAddUserLoading] = useState(false)
  const [editUserError, setEditUserError] = useState('')
  const [editUserSuccess, setEditUserSuccess] = useState(false)
  const [editUserLoading, setEditUserLoading] = useState(false)
  const [availableBosses, setAvailableBosses] = useState<any[]>([])
  const [selectedBossIds, setSelectedBossIds] = useState<string[]>([])
  
  // Estados para importación
  const [importProgress, setImportProgress] = useState(0)
  const [importStatus, setImportStatus] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const [importResults, setImportResults] = useState({ created: 0, updated: 0, errors: 0 })
  
  // Estados para permisos
  const [userPermissions, setUserPermissions] = useState<any[]>([])
  
  // Removed dynamic view states as they're now in a separate page

  // Paginación
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  const [paginatedUsers, setPaginatedUsers] = useState<any[]>([])
  const [totalPages, setTotalPages] = useState(1)

  // Referencia para el timeout de búsqueda
  const searchTimeout = useRef<NodeJS.Timeout | null>(null)

  // Función helper para obtener la URL del avatar
  const getAvatarUrl = (avatar_path: string | null, genero: string | null) => {
    const supabase = createSupabaseClient()
    
    if (avatar_path) {
      const { data } = supabase.storage.from("avatar").getPublicUrl(avatar_path)
      return data.publicUrl
    }
    
    // Imagen por defecto basada en género desde Supabase Storage
    if (genero) {
      const path = genero === "F" ? "defecto/avatar-f.webp" : "defecto/avatar-m.webp"
      const { data } = supabase.storage.from("avatar").getPublicUrl(path)
      return data.publicUrl
    }
    
    // Imagen por defecto del sistema desde Supabase Storage
    const { data } = supabase.storage.from("avatar").getPublicUrl("defecto/avatar-m.webp")
    return data.publicUrl
  }

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createSupabaseClient()
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession()

      if (error || !session) {
        router.push("/login")
        return
      }

      // Obtener datos del usuario actual para verificar rol
      const { data: currentUser, error: userError } = await supabase
        .from("usuario_nomina")
        .select("rol")
        .eq("auth_user_id", session.user.id)
        .single()

      if (userError) {
        console.error("Error al verificar rol:", userError)
        router.push("/perfil")
        return
      }

      if (currentUser.rol !== "administrador") {
        console.log("Usuario no tiene permisos de administrador")
        router.push("/perfil")
        return
      }

      try {
        // Ejecutar todas las consultas en paralelo para mejorar el rendimiento
        const today = new Date().toISOString().split('T')[0]
        
        const [
          { data: usuarios, error: usuariosError },
          { data: todasEmpresas },
          { data: sedesData },
          { data: epsData },
          { data: afpsData },
          { data: cajasData },
          { data: cesantiasData },
          { data: vacacionesActivas },
          { data: cargosData, error: cargosError }
        ] = await Promise.all([
          // Usuarios con relaciones optimizadas
          supabase
            .from("usuario_nomina")
            .select(`
              id, auth_user_id, colaborador, correo_electronico, telefono, rol, estado, genero, cedula,
              fecha_ingreso, empresa_id, cargo_id, sede_id, fecha_nacimiento, edad, rh, tipo_de_contrato,
              eps_id, afp_id, cesantias_id, caja_de_compensacion_id, direccion_residencia, avatar_path,
              empresas:empresa_id(id, nombre),
              sedes:sede_id(id, nombre),
              eps:eps_id(id, nombre),
              afp:afp_id(id, nombre),
              cesantias:cesantias_id(id, nombre),
              caja_de_compensacion:caja_de_compensacion_id(id, nombre),
              cargos:cargo_id(id, nombre)
            `)
            .eq("rol", "usuario"),
          // Empresas
          supabase
            .from("empresas")
            .select("id, nombre")
            .order("nombre"),
          // Sedes
          supabase
            .from("sedes")
            .select("id, nombre")
            .order("nombre"),
          // EPS
          supabase
            .from("eps")
            .select("id, nombre")
            .order("nombre"),
          // AFP
          supabase
            .from("afp")
            .select("id, nombre")
            .order("nombre"),
          // Cajas de compensación
          supabase
            .from("caja_de_compensacion")
            .select("id, nombre")
            .order("nombre"),
          // Cesantías
          supabase
            .from("cesantias")
            .select("id, nombre")
            .order("nombre"),
          // Vacaciones activas
          supabase
            .from("solicitudes_vacaciones")
            .select("usuario_id")
            .eq("estado", "aprobado")
            .lte("fecha_inicio", today)
            .gte("fecha_fin", today),
          // Cargos
          supabase
            .from("cargos")
            .select("id, nombre")
            .order("nombre")
        ])

        if (usuariosError) {
          console.error("Error al obtener usuarios:", usuariosError)
          setLoading(false)
          return
        }

        if (cargosError) {
          console.error("Error al cargar cargos:", cargosError)
        }

        // Establecer datos de formularios
        setSedes(sedesData || [])
        setEps(epsData || [])
        setAfps(afpsData || [])
        setCesantias(cesantiasData || [])
        setCajaDeCompensacionOptions(cajasData || [])
        setCargos(cargosData || [])
        setEmpresas(todasEmpresas || [])

        // Agregar información de vacaciones a cada usuario
        const usuariosConVacaciones = usuarios?.map(user => ({
          ...user,
          enVacaciones: user.auth_user_id ? vacacionesActivas?.some(vacacion => vacacion.usuario_id === user.auth_user_id) || false : false
        })) || []

        setUsers(usuariosConVacaciones)
        setFilteredUsers(usuariosConVacaciones)

        // Extraer empresas únicas para filtros
        const uniqueEmpresas = Array.from(new Set(usuariosConVacaciones?.map(user => {
          // Verificar si empresas existe y tiene la propiedad nombre
          if (user.empresas && typeof user.empresas === 'object' && 'nombre' in user.empresas) {
            return (user.empresas as any).nombre
          }
          return null
        }).filter(Boolean)))
        setEmpresasFilter(uniqueEmpresas)

        setLoading(false)
      } catch (error) {
        console.error("Error al cargar datos:", error)
        setLoading(false)
      }
    }

    checkAuth()
  }, [router])

  // Función para ordenar
  const requestSort = (key: string) => {
    let direction: "asc" | "desc" = "asc"

    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc"
    }

    setSortConfig({ key, direction })
  }

  // Aplicar filtros y ordenamiento con debounce para la búsqueda
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchTerm(value)

    // Mostrar el preloader
    setSearchLoading(true)

    // Limpiar el timeout anterior si existe
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current)
    }

    // Establecer un nuevo timeout para aplicar la búsqueda después de 300ms
    searchTimeout.current = setTimeout(() => {
      applyFilters(value, selectedEmpresa, selectedCargo, selectedEstado, selectedRol, sortConfig)
    }, 300)
  }

  // Función para aplicar todos los filtros
  const applyFilters = (
    search: string,
    empresa: string,
    cargo: string,
    estado: string,
    rol: string,
    sort: { key: string; direction: "asc" | "desc" } | null,
  ) => {
    let result = [...users]

    // Aplicar búsqueda
    if (search) {
      const lowerCaseSearchTerm = search.toLowerCase()
      result = result.filter(
        (user) =>
          user.colaborador?.toLowerCase().includes(lowerCaseSearchTerm) ||
          user.correo_electronico?.toLowerCase().includes(lowerCaseSearchTerm) ||
          user.cargos?.nombre?.toLowerCase().includes(lowerCaseSearchTerm) ||
          user.empresas?.nombre?.toLowerCase().includes(lowerCaseSearchTerm),
      )
    }

    // Aplicar filtro de empresa
    if (empresa && empresa !== "all") {
      result = result.filter((user) => user.empresas?.nombre === empresa)
    }

    // Aplicar filtro de cargo
    if (cargo && cargo !== "all") {
      result = result.filter((user) => user.cargos?.nombre === cargo)
    }

    // Aplicar filtro de estado
    if (estado && estado !== "all") {
      result = result.filter((user) => user.estado === estado)
    }

    // Aplicar filtro de rol
    if (rol && rol !== "all") {
      result = result.filter((user) => user.rol === rol)
    }

    // Aplicar ordenamiento
    if (sort !== null) {
      result.sort((a, b) => {
        // Manejar propiedades anidadas como 'empresas.nombre' y 'cargos.nombre'
        let aValue, bValue

        // Definir interfaces para relaciones
        interface EmpresaData {
          nombre?: string
        }
        
        interface CargoData {
          nombre?: string
        }

        if (sort.key === "empresas") {
          const aEmpresa = a.empresas as EmpresaData | undefined
          const bEmpresa = b.empresas as EmpresaData | undefined
          aValue = aEmpresa?.nombre || ""
          bValue = bEmpresa?.nombre || ""
        } else if (sort.key === "cargos") {
          const aCargo = a.cargos as CargoData | undefined
          const bCargo = b.cargos as CargoData | undefined
          aValue = aCargo?.nombre || ""
          bValue = bCargo?.nombre || ""
        } else {
          aValue = a[sort.key] || ""
          bValue = b[sort.key] || ""
        }

        if (aValue < bValue) {
          return sort.direction === "asc" ? -1 : 1
        }
        if (aValue > bValue) {
          return sort.direction === "asc" ? 1 : -1
        }
        return 0
      })
    }

    setFilteredUsers(result)
    setCurrentPage(1) // Resetear a la primera página cuando cambian los filtros
    setSearchLoading(false) // Ocultar el preloader
  }

  // Efecto para aplicar filtros cuando cambian los selectores o el ordenamiento
  useEffect(() => {
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current)
    }

    setSearchLoading(true)
    searchTimeout.current = setTimeout(() => {
      applyFilters(searchTerm, selectedEmpresa, selectedCargo, selectedEstado, selectedRol, sortConfig)
      setCurrentPage(1)
    }, 300)
  }, [selectedEmpresa, selectedCargo, selectedEstado, selectedRol, sortConfig, users])

  // Efecto para calcular la paginación
  useEffect(() => {
    const total = Math.ceil(filteredUsers.length / itemsPerPage)
    setTotalPages(total || 1)

    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    setPaginatedUsers(filteredUsers.slice(startIndex, endIndex))
  }, [filteredUsers, currentPage, itemsPerPage])

  const clearFilters = () => {
    setSearchTerm("")
    setSelectedEmpresa("")
    setSelectedCargo("all")
    setSelectedEstado("all")
    setSelectedRol("all")
    setSortConfig(null)
    setCurrentPage(1)

    // Aplicar filtros inmediatamente sin esperar
    applyFilters("", "", "all", "all", "all", null)
  }

  const handleViewDetails = async (user: any) => {
    try {
      const supabase = createSupabaseClient()
      // Obtener información completa de vacaciones para el usuario seleccionado
      const today = new Date().toISOString().split('T')[0]
      
      // Obtener todas las vacaciones aprobadas del usuario para determinar el estado
      const { data: todasVacacionesAprobadas } = await supabase
        .from("solicitudes_vacaciones")
        .select("fecha_inicio, fecha_fin")
        .eq("usuario_id", user.auth_user_id)
        .eq("estado", "aprobado")
        .order("fecha_inicio", { ascending: false })

      // Obtener el jefe asignado
      const { data: relacionesJefes } = await supabase
        .from("usuario_jefes")
        .select("jefe_id")
        .eq("usuario_id", user.auth_user_id)
      
      let jefeNombre = "No asignado"
      
      if (relacionesJefes && relacionesJefes.length > 0) {
        const jefeIds = relacionesJefes.map((r: any) => r.jefe_id)
        
        // Consultar nombres en usuario_nomina
        const { data: jefesData } = await supabase
          .from("usuario_nomina")
          .select("colaborador")
          .in("auth_user_id", jefeIds)
          
        if (jefesData && jefesData.length > 0) {
          jefeNombre = jefesData.map((j: any) => j.colaborador).join(", ")
        }
      }

      let estadoVacaciones = "sin_vacaciones"
      let rangoVacaciones = null
      
      if (todasVacacionesAprobadas && todasVacacionesAprobadas.length > 0) {
        const currentYear = new Date().getFullYear()
        
        // Buscar vacaciones del año actual
        const vacacionesEsteAno = todasVacacionesAprobadas.filter((v: any) => {
          const fechaInicio = new Date(v.fecha_inicio)
          return fechaInicio.getFullYear() === currentYear
        })
        
        if (vacacionesEsteAno.length > 0) {
          const proximasVacaciones: any = vacacionesEsteAno[0]
          const fechaInicio = new Date(proximasVacaciones.fecha_inicio)
          const fechaFin = new Date(proximasVacaciones.fecha_fin)
          const hoy = new Date()
          
          if (fechaFin < hoy) {
            // Ya tomó vacaciones este año
            estadoVacaciones = "ya_tomo"
            rangoVacaciones = {
              inicio: proximasVacaciones.fecha_inicio,
              fin: proximasVacaciones.fecha_fin
            }
          } else if (fechaInicio <= hoy && fechaFin >= hoy) {
            // Está actualmente de vacaciones
            estadoVacaciones = "en_vacaciones"
            rangoVacaciones = {
              inicio: proximasVacaciones.fecha_inicio,
              fin: proximasVacaciones.fecha_fin
            }
          } else if (fechaInicio > hoy) {
            // Tiene vacaciones pendientes
            estadoVacaciones = "pendientes"
            rangoVacaciones = {
              inicio: proximasVacaciones.fecha_inicio,
              fin: proximasVacaciones.fecha_fin
            }
          }
        }
      }

      // Agregar el estado de vacaciones al userData
      const userDataWithVacaciones = {
        ...user,
        estadoVacaciones,
        rangoVacaciones,
        jefeNombre // Agregamos el nombre del jefe
      }

      setSelectedUser(userDataWithVacaciones)
      setIsModalOpen(true)
    } catch (error) {
      console.error('Error al obtener información de vacaciones:', error)
      // En caso de error, mostrar el usuario sin información adicional de vacaciones
      setSelectedUser(user)
      setIsModalOpen(true)
    }
  }

  const handleAddUser = () => {
    setIsAddUserModalOpen(true)
    setAddUserError('')
    setAddUserSuccess(false)
  }

  const handleImportUsers = () => {
    // Crear input file temporal
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.xlsx,.xls'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        await processExcelFile(file)
      }
    }
    input.click()
  }

const processExcelFile = async (file: File) => {
  try {
    // Import xlsx dynamically
    const XLSX = await import('xlsx')
    
    // Read file
    const arrayBuffer = await file.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: 'array' })
    
    // Check for sheets containing 'activos' or 'inactivos' in their names
    const sheetNames = workbook.SheetNames
    const activosSheet = sheetNames.find(name => 
      name.toLowerCase().includes('activos') || name.toLowerCase().includes('activo')
    )
    const inactivosSheet = sheetNames.find(name => 
      name.toLowerCase().includes('inactivos') || name.toLowerCase().includes('inactivo')
    )
    
    let todosLosUsuarios: any[] = []

    // Process active users sheet if exists
    if (activosSheet) {
      const usuariosActivos = XLSX.utils.sheet_to_json(workbook.Sheets[activosSheet])
      todosLosUsuarios = [...todosLosUsuarios, ...usuariosActivos]
    }

    // Process inactive users sheet if exists 
    if (inactivosSheet) {
      const usuariosInactivos = XLSX.utils.sheet_to_json(workbook.Sheets[inactivosSheet])
      todosLosUsuarios = [...todosLosUsuarios, ...usuariosInactivos]
    }

    // If no specific sheets found, use the first sheet
    if (!activosSheet && !inactivosSheet) {
      if (sheetNames.length > 0) {
        const firstSheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetNames[0]])
        todosLosUsuarios = [...todosLosUsuarios, ...firstSheet]
      } else {
        alert('El archivo no contiene hojas válidas')
        return
      }
    }
    
    if (todosLosUsuarios.length === 0) {
      alert('No se encontraron usuarios en el archivo')
      return
    }
    
    // Process users
    await importUsersFromData(todosLosUsuarios)
    
  } catch (error) {
    console.error('Error al procesar archivo Excel:', error)
    alert('Error al procesar el archivo Excel. Verifique el formato.')
  }
}

const importUsersFromData = async (usuariosData: any[]) => {
  try {
    setIsImporting(true)
    setImportProgress(0)
    setImportStatus('Preparando importación...')
    setImportResults({ created: 0, updated: 0, errors: 0 })
    
    const supabase = createSupabaseClient()
    
    // Get reference data to map names to IDs
    setImportStatus('Cargando datos de referencia...')
    const [empresasRef, cargosRef, sedesRef, epsRef, afpRef, cesantiasRef, cajasRef] = await Promise.all([
      supabase.from('empresas').select('id, nombre'),
      supabase.from('cargos').select('id, nombre'),
      supabase.from('sedes').select('id, nombre'),
      supabase.from('eps').select('id, nombre'),
      supabase.from('afp').select('id, nombre'),
      supabase.from('cesantias').select('id, nombre'),
      supabase.from('caja_de_compensacion').select('id, nombre')
    ])
    
    // Create maps for quick conversion
    const empresasMap = new Map(empresasRef.data?.map((e: { nombre: unknown; id: unknown }) => [String(e.nombre).toLowerCase(), String(e.id)]) || [])
    const cargosMap = new Map(cargosRef.data?.map((c: { nombre: unknown; id: unknown }) => [String(c.nombre).toLowerCase(), String(c.id)]) || [])
    const sedesMap = new Map(sedesRef.data?.map((s: { nombre: unknown; id: unknown }) => [String(s.nombre).toLowerCase(), String(s.id)]) || [])
    const epsMap = new Map(epsRef.data?.map((e: { nombre: unknown; id: unknown }) => [String(e.nombre).toLowerCase(), String(e.id)]) || [])
    const afpMap = new Map(afpRef.data?.map((a: { id: unknown; nombre: unknown }) => [String(a.nombre).toLowerCase(), String(a.id)]) || [])
    const cesantiasMap = new Map(cesantiasRef.data?.map(c => [(c as {nombre: string}).nombre.toLowerCase(), (c as {id: string}).id]) || [])
    const cajasMap = new Map(cajasRef.data?.map(c => [(c as {nombre: string}).nombre.toLowerCase(), (c as {id: string}).id]) || [])
    
    let usuariosCreados = 0
    let usuariosActualizados = 0
    let errores = 0
    const totalUsuarios = usuariosData.length
    
    setImportStatus(`Procesando ${totalUsuarios} usuarios...`)
    
    for (let i = 0; i < usuariosData.length; i++) {
      const userData = usuariosData[i]
      
      try {
        // Update progress
        const progress = Math.round(((i + 1) / totalUsuarios) * 100)
        setImportProgress(progress)
        setImportStatus(`Procesando usuario ${i + 1} de ${totalUsuarios}...`)
        
        // Helper function to check if a value is empty or null
        const isEmpty = (value: any) => {
          return value === null || value === undefined || value === '' || 
                 (typeof value === 'string' && value.trim() === '')
        }
        
        // Helper function to get safe value or null
        const getSafeValue = (value: any, defaultValue: any = null) => {
          return isEmpty(value) ? defaultValue : value
        }
        
        // Helper function to convert Excel date to ISO format
        const convertExcelDate = (excelDate: any) => {
          if (isEmpty(excelDate)) return null
          
          try {
            let date: Date
            
            // If it's already a Date object
            if (excelDate instanceof Date) {
              date = excelDate
            }
            // If it's a number (Excel serial date)
            else if (typeof excelDate === 'number') {
              // Excel dates are days since 1900-01-01 (with leap year bug)
              const excelEpoch = new Date(1900, 0, 1)
              date = new Date(excelEpoch.getTime() + (excelDate - 2) * 24 * 60 * 60 * 1000)
            }
            // If it's a string, try to parse it
            else if (typeof excelDate === 'string') {
              const dateStr = excelDate.toString().trim()
              
              // Try different date formats
              if (dateStr.includes('/')) {
                // Format: DD/MM/YYYY or MM/DD/YYYY
                const parts = dateStr.split('/')
                if (parts.length === 3) {
                  // Assume DD/MM/YYYY format (common in Latin America)
                  const day = parseInt(parts[0])
                  const month = parseInt(parts[1]) - 1 // Month is 0-indexed
                  const year = parseInt(parts[2])
                  date = new Date(year, month, day)
                } else {
                  date = new Date(dateStr)
                }
              } else if (dateStr.includes('-')) {
                // Format: YYYY-MM-DD or DD-MM-YYYY
                date = new Date(dateStr)
              } else {
                date = new Date(dateStr)
              }
            }
            else {
              return null
            }
            
            // Validate the date
            if (isNaN(date.getTime())) {
              console.warn('Invalid date:', excelDate)
              return null
            }
            
            // Convert to ISO format (YYYY-MM-DD)
            return date.toISOString().split('T')[0]
          } catch (error) {
            console.warn('Error converting date:', excelDate, error)
            return null
          }
        }
        
        // Map Excel fields to database structure, omitting empty fields
        const usuarioData: any = {}
        
        // Only add fields that have values
        if (!isEmpty(userData['ID'])) usuarioData.id = userData['ID']
        if (!isEmpty(userData['Nombre'])) usuarioData.colaborador = userData['Nombre'].toString().trim()
        if (!isEmpty(userData['Correo'])) usuarioData.correo_electronico = userData['Correo'].toString().trim()
        if (!isEmpty(userData['Teléfono'])) usuarioData.telefono = userData['Teléfono'].toString().trim()
        if (!isEmpty(userData['Cédula'])) usuarioData.cedula = userData['Cédula'].toString().trim()
        
        // Handle gender mapping
        if (!isEmpty(userData['Género'])) {
          const genero = userData['Género'].toString().trim()
          if (genero === 'Masculino') usuarioData.genero = 'M'
          else if (genero === 'Femenino') usuarioData.genero = 'F'
          else usuarioData.genero = genero
        }
        
        // Handle dates with proper conversion
        const fechaIngreso = convertExcelDate(userData['Fecha Ingreso'])
        if (fechaIngreso) usuarioData.fecha_ingreso = fechaIngreso
        
        const fechaNacimiento = convertExcelDate(userData['Fecha Nacimiento'])
        if (fechaNacimiento) usuarioData.fecha_nacimiento = fechaNacimiento
        
        const fechaRetiro = convertExcelDate(userData['Fecha Retiro'])
        if (fechaRetiro) usuarioData.fecha_retiro = fechaRetiro
        
        // Handle numeric fields
        if (!isEmpty(userData['Edad'])) {
          const edad = parseInt(userData['Edad'])
          if (!isNaN(edad)) usuarioData.edad = edad
        }
        
        // Handle text fields
        if (!isEmpty(userData['RH'])) usuarioData.rh = userData['RH'].toString().trim()
        if (!isEmpty(userData['Dirección'])) usuarioData.direccion_residencia = userData['Dirección'].toString().trim()
        if (!isEmpty(userData['Tipo de Contrato'])) usuarioData.tipo_de_contrato = userData['Tipo de Contrato'].toString().trim()
        if (!isEmpty(userData['Motivo Retiro'])) usuarioData.motivo_retiro = userData['Motivo Retiro'].toString().trim()
        
        // Set default values for required fields
        usuarioData.estado = getSafeValue(userData['Estado'], 'activo')
        usuarioData.rol = getSafeValue(userData['Rol'], 'usuario')
        
        // Handle foreign key mappings - only if the field has a value
        if (!isEmpty(userData['Empresa'])) {
          const empresaId = empresasMap.get(userData['Empresa'].toString().toLowerCase())
          if (empresaId) usuarioData.empresa_id = empresaId
        }
        
        if (!isEmpty(userData['Cargo'])) {
          const cargoId = cargosMap.get(userData['Cargo'].toString().toLowerCase())
          if (cargoId) usuarioData.cargo_id = cargoId
        }
        
        if (!isEmpty(userData['Sede'])) {
          const sedeId = sedesMap.get(userData['Sede'].toString().toLowerCase())
          if (sedeId) usuarioData.sede_id = sedeId
        }
        
        if (!isEmpty(userData['EPS'])) {
          const epsId = epsMap.get(userData['EPS'].toString().toLowerCase())
          if (epsId) usuarioData.eps_id = epsId
        }
        
        if (!isEmpty(userData['AFP'])) {
          const afpId = afpMap.get(userData['AFP'].toString().toLowerCase())
          if (afpId) usuarioData.afp_id = afpId
        }
        
        if (!isEmpty(userData['Cesantías'])) {
          const cesantiasId = cesantiasMap.get(userData['Cesantías'].toString().toLowerCase())
          if (cesantiasId) usuarioData.cesantias_id = cesantiasId
        }
        
        if (!isEmpty(userData['Caja Compensación'])) {
          const cajaId = cajasMap.get(userData['Caja Compensación'].toString().toLowerCase())
          if (cajaId) usuarioData.caja_de_compensacion_id = cajaId
        }
        
        let existingUser = null
        
        // Check if user exists by ID or Cedula
        if (usuarioData.id) {
          const { data } = await supabase
            .from('usuario_nomina')
            .select('id')
            .eq('id', usuarioData.id)
            .single()
          existingUser = data
        } else if (usuarioData.cedula) {
          const { data } = await supabase
            .from('usuario_nomina')
            .select('id')
            .eq('cedula', usuarioData.cedula)
            .single()
          existingUser = data
        }
        
        if (existingUser) {
          // Update existing user - only update fields that have values
          const updateData: any = {}
          
          // Only include fields that have values in the update
          if (usuarioData.colaborador !== undefined) updateData.colaborador = usuarioData.colaborador
          if (usuarioData.correo_electronico !== undefined) updateData.correo_electronico = usuarioData.correo_electronico
          if (usuarioData.telefono !== undefined) updateData.telefono = usuarioData.telefono
          if (usuarioData.cedula !== undefined) updateData.cedula = usuarioData.cedula
          if (usuarioData.genero !== undefined) updateData.genero = usuarioData.genero
          if (usuarioData.fecha_ingreso !== undefined) updateData.fecha_ingreso = usuarioData.fecha_ingreso
          if (usuarioData.fecha_nacimiento !== undefined) updateData.fecha_nacimiento = usuarioData.fecha_nacimiento
          if (usuarioData.edad !== undefined) updateData.edad = usuarioData.edad
          if (usuarioData.rh !== undefined) updateData.rh = usuarioData.rh
          if (usuarioData.direccion_residencia !== undefined) updateData.direccion_residencia = usuarioData.direccion_residencia
          if (usuarioData.tipo_de_contrato !== undefined) updateData.tipo_de_contrato = usuarioData.tipo_de_contrato
          if (usuarioData.empresa_id !== undefined) updateData.empresa_id = usuarioData.empresa_id
          if (usuarioData.cargo_id !== undefined) updateData.cargo_id = usuarioData.cargo_id
          if (usuarioData.sede_id !== undefined) updateData.sede_id = usuarioData.sede_id
          if (usuarioData.eps_id !== undefined) updateData.eps_id = usuarioData.eps_id
          if (usuarioData.afp_id !== undefined) updateData.afp_id = usuarioData.afp_id
          if (usuarioData.cesantias_id !== undefined) updateData.cesantias_id = usuarioData.cesantias_id
          if (usuarioData.caja_de_compensacion_id !== undefined) updateData.caja_de_compensacion_id = usuarioData.caja_de_compensacion_id
          if (usuarioData.motivo_retiro !== undefined) updateData.motivo_retiro = usuarioData.motivo_retiro
          if (usuarioData.fecha_retiro !== undefined) updateData.fecha_retiro = usuarioData.fecha_retiro
          
          // Always update estado and rol as they have default values
          updateData.estado = usuarioData.estado
          updateData.rol = usuarioData.rol
          
          const { error } = await supabase
            .from('usuario_nomina')
            .update(updateData)
            .eq('id', (existingUser as { id: string | number }).id)
          
          if (error) {
            console.error('Error actualizando usuario:', error)
            errores++
          } else {
            usuariosActualizados++
          }
        } else {
          // Create new user
          const insertData = usuarioData.id ? usuarioData : (() => {
            const { id, ...userDataWithoutId } = usuarioData
            return userDataWithoutId
          })()
          
          const { error } = await supabase
            .from('usuario_nomina')
            .insert([insertData])
          
          if (error) {
            console.error('Error creando usuario:', error)
            errores++
          } else {
            usuariosCreados++
          }
        }
        
        // Update results in real time
        setImportResults({ created: usuariosCreados, updated: usuariosActualizados, errors: errores })
        
        // Small delay to show progress
        await new Promise(resolve => setTimeout(resolve, 10))
        
      } catch (error) {
        console.error('Error procesando usuario:', error)
        errores++
        setImportResults({ created: usuariosCreados, updated: usuariosActualizados, errors: errores })
      }
    }
    
    setImportProgress(100)
    setImportStatus('Importación completada')
    
    // Show summary
    setTimeout(() => {
      const mensaje = `Importación completada:\n- Usuarios creados: ${usuariosCreados}\n- Usuarios actualizados: ${usuariosActualizados}\n- Errores: ${errores}`
      alert(mensaje)
      
      // Reset import state
      setIsImporting(false)
      setImportProgress(0)
      setImportStatus('')
      setImportResults({ created: 0, updated: 0, errors: 0 })
      
      // Reload users list
      fetchUsers()
    }, 1000)
    
  } catch (error) {
    console.error('Error en importación:', error)
    alert('Error durante la importación. Verifique el formato del archivo.')
    setIsImporting(false)
    setImportProgress(0)
    setImportStatus('')
    setImportResults({ created: 0, updated: 0, errors: 0 })
  }
}

const handleExportUsers = async () => {
  try {
    // Import xlsx dynamically
    const XLSX = await import('xlsx')
    
    // Separate active and inactive users
    const usuariosActivos = users.filter(user => user.estado === 'activo')
    const usuariosInactivos = users.filter(user => user.estado === 'inactivo')
    
    // Calculate age from birth date
    const calculateAge = (birthDate: string) => {
      if (!birthDate) return ''
      const today = new Date()
      const birth = new Date(birthDate)
      let age = today.getFullYear() - birth.getFullYear()
      const monthDiff = today.getMonth() - birth.getMonth()
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--
      }
      return age.toString()
    }
    
    // Format user data
    const formatUserData = (user: any) => ({
      'ID': user.id,
      'Nombre': user.colaborador,
      'Correo': user.correo_electronico,
      'Teléfono': user.telefono,
      'Cédula': user.cedula,
      'Género': user.genero === 'M' ? 'Masculino' : user.genero === 'F' ? 'Femenino' : user.genero,
      'Fecha Ingreso': user.fecha_ingreso,
      'Fecha Nacimiento': user.fecha_nacimiento,
      'Edad': calculateAge(user.fecha_nacimiento),
      'RH': user.rh,
      'Tipo de Contrato': user.tipo_de_contrato || '',
      'Empresa': user.empresas?.nombre || '',
      'Cargo': user.cargos?.nombre || '',
      'Sede': user.sedes?.nombre || '',
      'EPS': user.eps?.nombre || '',
      'AFP': user.afp?.nombre || '',
      'Cesantías': user.cesantias?.nombre || '',
      'Caja Compensación': user.caja_de_compensacion?.nombre || '',
      'Dirección': user.direccion_residencia,
      'Motivo Retiro': user.motivo_retiro || '',
      'Fecha Retiro': user.fecha_retiro || '',
      'Estado': user.estado,
      'Rol': user.rol
    })
    
    // Format data
    const datosActivos = usuariosActivos.map(formatUserData)
    const datosInactivos = usuariosInactivos.map(formatUserData)
    
    // Create workbook
    const workbook = XLSX.utils.book_new()
    
    // Create sheets
    const worksheetActivos = XLSX.utils.json_to_sheet(datosActivos)
    const worksheetInactivos = XLSX.utils.json_to_sheet(datosInactivos)
    
    // Add sheets to workbook
    XLSX.utils.book_append_sheet(workbook, worksheetActivos, 'Usuarios Activos')
    XLSX.utils.book_append_sheet(workbook, worksheetInactivos, 'Usuarios Inactivos')
    
    // Generate filename with date
    const fecha = new Date().toISOString().split('T')[0]
    const nombreArchivo = `usuarios_${fecha}.xlsx`
    
    // Download file
    XLSX.writeFile(workbook, nombreArchivo)
    
  } catch (error) {
    console.error('Error al exportar usuarios:', error)
    alert('Error al exportar usuarios. Por favor, intente nuevamente.')
  }
}

const handleEditUser = (user: any) => {
  console.log('Usuario seleccionado:', user);
  console.log('Género del usuario:', user.genero);
  setEditUserData({
    id: user.id,
    auth_user_id: user.auth_user_id,
    nombre: user.colaborador || '',
    correo: user.correo_electronico || '',
    telefono: user.telefono || '',
    rol: user.rol || 'usuario',
    estado: user.estado || 'activo',
    genero: user.genero ? user.genero.toLowerCase() : '',
    cedula: user.cedula || '',
    fecha_ingreso: user.fecha_ingreso || '',
    empresa_id: user.empresa_id ? user.empresa_id.toString() : '',
    cargo_id: user.cargo_id ? user.cargo_id.toString() : (user.cargos?.id ? user.cargos.id.toString() : ''),
    sede_id: user.sede_id ? user.sede_id.toString() : '',
    fecha_nacimiento: user.fecha_nacimiento || '',
    edad: user.edad ? user.edad.toString() : '',
    rh: user.rh || '',
    tipo_de_contrato: user.tipo_de_contrato || '',
    eps_id: user.eps_id ? user.eps_id.toString() : '',
    afp_id: user.afp_id ? user.afp_id.toString() : '',
    cesantias_id: user.cesantias_id ? user.cesantias_id.toString() : '',
    caja_de_compensacion_id: user.caja_de_compensacion_id ? user.caja_de_compensacion_id.toString() : '',
    direccion_residencia: user.direccion_residencia || ''
  })
  setIsEditUserModalOpen(true)
  setEditUserError('')
  setEditUserSuccess(false);
  // Cargar jefes disponibles y asignaciones actuales
  (async () => {
    const supabase = createSupabaseClient()
    const [{ data: bosses }, { data: asignaciones }] = await Promise.all([
      supabase.from('usuario_nomina').select('auth_user_id, colaborador').eq('rol', 'jefe').eq('estado', 'activo'),
      supabase.from('usuario_jefes').select('jefe_id').eq('usuario_id', user.auth_user_id)
    ])
    setAvailableBosses(bosses || [])
    setSelectedBossIds((asignaciones || []).map((a: any) => a.jefe_id))
  })()
}

const fetchUsers = async () => {
  try {
    const supabase = createSupabaseClient()
    const today = new Date().toISOString().split('T')[0]
    
    const [
      { data: usuarios, error: usuariosError },
      { data: vacacionesActivas, error: vacacionesError },
      { data: todasLasVacaciones, error: todasVacacionesError }
    ] = await Promise.all([
      supabase
        .from("usuario_nomina")
        .select(`
          id, auth_user_id, colaborador, correo_electronico, telefono, rol, estado, genero, cedula,
          fecha_ingreso, empresa_id, cargo_id, sede_id, fecha_nacimiento, edad, rh, tipo_de_contrato,
          eps_id, afp_id, cesantias_id, caja_de_compensacion_id, direccion_residencia, avatar_path,
          motivo_retiro, fecha_retiro,
          empresas:empresa_id(id, nombre),
          sedes:sede_id(id, nombre),
          eps:eps_id(id, nombre),
          afp:afp_id(id, nombre),
          cesantias:cesantias_id(id, nombre),
          caja_de_compensacion:caja_de_compensacion_id(id, nombre),
          cargos:cargo_id(id, nombre)
        `)
        .eq("rol", "usuario"),
      supabase
        .from("solicitudes_vacaciones")
        .select("usuario_id")
        .eq("estado", "aprobado")
        .lte("fecha_inicio", today)
        .gte("fecha_fin", today),
      supabase
        .from("solicitudes_vacaciones")
        .select("usuario_id, fecha_inicio, fecha_fin")
        .eq("estado", "aprobado")
        .order("fecha_inicio", { ascending: true })
    ])

    if (usuariosError) {
      console.error("Error al obtener usuarios:", usuariosError)
      return
    }
    
    if (vacacionesError) {
      console.error("Error en vacaciones activas:", vacacionesError)
    }
    
    if (todasVacacionesError) {
      console.error("Error en todas las vacaciones:", todasVacacionesError)
    }

    const usuariosConVacaciones = usuarios?.map(user => {
      let estadoVacaciones = "sin_vacaciones"
      let rangoVacaciones = null
      const enVacaciones = user.auth_user_id ? vacacionesActivas?.some(vacacion => vacacion.usuario_id === user.auth_user_id) || false : false
      
      if (user.auth_user_id && todasLasVacaciones) {
        const anoActual = new Date().getFullYear()
        const vacacionesEsteAno = todasLasVacaciones
          .filter((vacacion: any) => vacacion.usuario_id === user.auth_user_id)
          .filter((vacacion: any) => {
            const fechaInicio = new Date(vacacion.fecha_inicio)
            return fechaInicio.getFullYear() === anoActual
          })
        
        if (vacacionesEsteAno.length > 0) {
          const hoy = new Date()
          
          const vacacionActual = vacacionesEsteAno.find((v: any) => {
            const fechaInicio = new Date(v.fecha_inicio)
            const fechaFin = new Date(v.fecha_fin)
            return fechaInicio <= hoy && fechaFin >= hoy
          })
          
          if (vacacionActual) {
            estadoVacaciones = "en_vacaciones"
            rangoVacaciones = {
              inicio: vacacionActual.fecha_inicio,
              fin: vacacionActual.fecha_fin
            }
          } else {
            const vacacionFutura = vacacionesEsteAno.find((v: any) => {
              const fechaInicio = new Date(v.fecha_inicio)
              return fechaInicio > hoy
            })
            
            if (vacacionFutura) {
              estadoVacaciones = "pendientes"
              rangoVacaciones = {
                inicio: vacacionFutura.fecha_inicio,
                fin: vacacionFutura.fecha_fin
              }
            } else {
              const vacacionPasada = vacacionesEsteAno[vacacionesEsteAno.length - 1]
              estadoVacaciones = "ya_tomo"
              rangoVacaciones = {
                inicio: vacacionPasada.fecha_inicio,
                fin: vacacionPasada.fecha_fin
              }
            }
          }
        }
      }
      
      return {
        ...user,
        enVacaciones,
        estadoVacaciones,
        rangoVacaciones
      }
    }) || []

    setUsers(usuariosConVacaciones)
    setFilteredUsers(usuariosConVacaciones)
  } catch (error) {
    console.error('Error al cargar usuarios:', error)
  }
}

const handleAddUserSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  setAddUserError('')
  setAddUserSuccess(false)
  setAddUserLoading(true)

  try {
    const supabase = createSupabaseClient()

    const { error: dbError } = await supabase
      .from('usuario_nomina')
      .insert([
        {
          colaborador: newUserData.nombre,
          correo_electronico: newUserData.correo,
          telefono: newUserData.telefono,
          rol: newUserData.rol,
          genero: newUserData.genero || null,
          cedula: newUserData.cedula || null,
          fecha_ingreso: newUserData.fecha_ingreso || null,
          empresa_id: newUserData.empresa_id ? parseInt(newUserData.empresa_id) : null,
          cargo_id: newUserData.cargo_id || null,
          sede_id: newUserData.sede_id ? parseInt(newUserData.sede_id) : null,
          fecha_nacimiento: newUserData.fecha_nacimiento || null,
          edad: newUserData.edad ? parseInt(newUserData.edad) : null,
          rh: newUserData.rh || null,
          tipo_de_contrato: newUserData.tipo_de_contrato || null,
          eps_id: newUserData.eps_id ? parseInt(newUserData.eps_id) : null,
          afp_id: newUserData.afp_id ? parseInt(newUserData.afp_id) : null,
          cesantias_id: newUserData.cesantias_id ? parseInt(newUserData.cesantias_id) : null,
          caja_de_compensacion_id: newUserData.caja_de_compensacion_id ? parseInt(newUserData.caja_de_compensacion_id) : null,
          direccion_residencia: newUserData.direccion_residencia || null,
          estado: 'activo'
        }
      ])

    if (dbError) throw dbError
    
    setAddUserSuccess(true)
    setNewUserData({
      nombre: '',
      correo: '',
      telefono: '',
      rol: 'usuario',
      genero: '',
      cedula: '',
      fecha_ingreso: '',
      empresa_id: '',
      cargo_id: '',
      sede_id: '',
      fecha_nacimiento: '',
      edad: '',
      rh: '',
      tipo_de_contrato: '',
      eps_id: '',
      afp_id: '',
      cesantias_id: '',
      caja_de_compensacion_id: '',
      direccion_residencia: ''
    })
    
    await fetchUsers()
    
  } catch (err: any) {
    setAddUserError(err.message)
  } finally {
    setAddUserLoading(false)
  }
}

  const handleEditUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setEditUserError('')
    setEditUserSuccess(false)
    setEditUserLoading(true)

    try {
      const supabase = createSupabaseClient()

      const updateData = {
        colaborador: editUserData.nombre,
        correo_electronico: editUserData.correo,
        telefono: editUserData.telefono,
        rol: editUserData.rol,
        estado: editUserData.estado,
        genero: editUserData.genero || null,
        cedula: editUserData.cedula || null,
        fecha_ingreso: editUserData.fecha_ingreso || null,
        empresa_id: editUserData.empresa_id ? parseInt(editUserData.empresa_id) : null,
        cargo_id: editUserData.cargo_id || null,
        sede_id: editUserData.sede_id ? parseInt(editUserData.sede_id) : null,
        fecha_nacimiento: editUserData.fecha_nacimiento || null,
        edad: editUserData.edad ? parseInt(editUserData.edad) : null,
        rh: editUserData.rh || null,
        tipo_de_contrato: editUserData.tipo_de_contrato || null,
        eps_id: editUserData.eps_id ? parseInt(editUserData.eps_id) : null,
        afp_id: editUserData.afp_id ? parseInt(editUserData.afp_id) : null,
        cesantias_id: editUserData.cesantias_id ? parseInt(editUserData.cesantias_id) : null,
        caja_de_compensacion_id: editUserData.caja_de_compensacion_id ? parseInt(editUserData.caja_de_compensacion_id) : null,
        direccion_residencia: editUserData.direccion_residencia || null,
        motivo_retiro: editUserData.estado === 'inactivo' ? (editUserData.motivo_retiro || null) : null,
        fecha_retiro: editUserData.estado === 'inactivo' ? (editUserData.fecha_retiro || null) : null
      }

    const { error: dbError } = await supabase
      .from('usuario_nomina')
      .update(updateData)
      .eq('id', editUserData.id)

    if (dbError) throw dbError
    
    // Persistir asignaciones de jefes
    if (editUserData?.auth_user_id) {
      // Obtener asignaciones actuales
      const { data: actuales } = await supabase
        .from('usuario_jefes')
        .select('jefe_id')
        .eq('usuario_id', editUserData.auth_user_id)
      const actualesIds = new Set((actuales || []).map((a: any) => a.jefe_id))
      const nuevasIds = new Set(selectedBossIds)

      // Calcular inserciones y eliminaciones
      const aInsertar = Array.from(nuevasIds).filter(id => !actualesIds.has(id))
      const aEliminar = Array.from(actualesIds).filter(id => !nuevasIds.has(id))

      if (aInsertar.length > 0) {
        const filas = aInsertar.map(jefe_id => ({ usuario_id: editUserData.auth_user_id, jefe_id }))
        await supabase.from('usuario_jefes').insert(filas)
      }
      if (aEliminar.length > 0) {
        for (const jefe_id of aEliminar) {
          await supabase.from('usuario_jefes').delete().eq('usuario_id', editUserData.auth_user_id).eq('jefe_id', jefe_id)
        }
      }
    }
    
    setEditUserSuccess(true)
    setEditUserData(null)
    setUserPermissions([])
      
      // Recargar la lista de usuarios
      await fetchUsers()
      
      // Cerrar el modal después de un breve delay
      setTimeout(() => {
        setIsEditUserModalOpen(false)
        setEditUserSuccess(false)
      }, 1500)
      
    } catch (err: any) {
      setEditUserError(err.message)
    } finally {
      setEditUserLoading(false)
    }
  }

  const getSortIcon = (key: string) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <ArrowUpDown className="ml-1 h-4 w-4" />
    }
    return sortConfig.direction === "asc" ? (
      <ChevronUp className="ml-1 h-4 w-4" />
    ) : (
      <ChevronDown className="ml-1 h-4 w-4" />
    )
  }

  // Funciones de paginación
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
    }
  }

  // Generar array de páginas para mostrar en la paginación
  const getPageNumbers = () => {
    const pageNumbers = []
    const maxPagesToShow = 5

    if (totalPages <= maxPagesToShow) {
      // Si hay menos páginas que el máximo a mostrar, mostrar todas
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i)
      }
    } else {
      // Mostrar un subconjunto de páginas centrado en la página actual
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

  // Dynamic view functions removed - now in separate page

  if (loading) {
    return (
      <div className="min-h-screen">
        <div className="flex flex-col flex-1">
          <main className="flex-1">
            <div className="py-6">
              <div className="w-full mx-auto">
                <div className="space-y-6">
                  {/* Header skeleton */}
                  <div className="flex justify-between items-center">
                    <div>
                      <Skeleton className="h-8 w-64 mb-2" />
                      <Skeleton className="h-4 w-48" />
                    </div>
                    <Skeleton className="h-10 w-32" />
                  </div>

                  {/* Filters skeleton */}
                  <Card>
                    <CardContent className="p-6 space-y-4">
                      <div className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="flex-1">
                          <Skeleton className="h-4 w-16 mb-1" />
                          <Skeleton className="h-10 w-full" />
                        </div>
                        <div className="w-full md:w-48">
                          <Skeleton className="h-4 w-16 mb-1" />
                          <Skeleton className="h-10 w-full" />
                        </div>
                        <div className="w-full md:w-48">
                          <Skeleton className="h-4 w-16 mb-1" />
                          <Skeleton className="h-10 w-full" />
                        </div>
                        <div className="w-full md:w-48">
                          <Skeleton className="h-4 w-16 mb-1" />
                          <Skeleton className="h-10 w-full" />
                        </div>
                        <div className="w-full md:w-48">
                          <Skeleton className="h-4 w-16 mb-1" />
                          <Skeleton className="h-10 w-full" />
                        </div>
                        <Skeleton className="h-10 w-32" />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Table skeleton */}
                  <div className="rounded-md border bg-white">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead><Skeleton className="h-4 w-16" /></TableHead>
                            <TableHead><Skeleton className="h-4 w-20" /></TableHead>
                            <TableHead><Skeleton className="h-4 w-16" /></TableHead>
                            <TableHead><Skeleton className="h-4 w-20" /></TableHead>
                            <TableHead><Skeleton className="h-4 w-16" /></TableHead>
                            <TableHead><Skeleton className="h-4 w-16" /></TableHead>
                            <TableHead><Skeleton className="h-4 w-20" /></TableHead>
                            <TableHead><Skeleton className="h-4 w-20" /></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {Array.from({ length: 10 }).map((_, index) => (
                            <TableRow key={index}>
                              <TableCell><Skeleton className="h-10 w-10 rounded-full" /></TableCell>
                              <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                              <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                              <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                              <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                              <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                              <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                              <TableCell><Skeleton className="h-8 w-16" /></TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    {/* Pagination skeleton */}
                    <div className="flex items-center justify-between px-6 py-4 border-t">
                      <Skeleton className="h-4 w-32" />
                      <div className="flex items-center space-x-2">
                        <Skeleton className="h-8 w-8" />
                        <Skeleton className="h-8 w-8" />
                        <Skeleton className="h-8 w-8" />
                        <Skeleton className="h-8 w-8" />
                        <Skeleton className="h-8 w-8" />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-8 w-16" />
                      </div>
                    </div>
                  </div>
                  {/* Asignación de jefes */}
                  <div className="mt-6">
                    <h4 className="text-md font-medium mb-2">Jefes asignados</h4>
                    <div className="space-y-2">
                      {availableBosses.length > 0 ? (
                        availableBosses.map((boss) => (
                          <label key={`boss-${boss.auth_user_id}`} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={selectedBossIds.includes(boss.auth_user_id)}
                              onChange={(e) => {
                                const checked = e.target.checked
                                setSelectedBossIds(prev => {
                                  if (checked) return Array.from(new Set([...prev, boss.auth_user_id]))
                                  return prev.filter(id => id !== boss.auth_user_id)
                                })
                              }}
                            />
                            <span>{boss.colaborador}</span>
                          </label>
                        ))
                      ) : (
                        <div className="text-sm text-gray-500">No hay usuarios con rol Jefe activos</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Main content */}
      <div className="flex flex-col flex-1">
        <main className="flex-1">
          <div className="py-6">
            <div className="w-full mx-auto">
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight">Listado de Usuarios</h1>
                    <p className="text-muted-foreground">Gestiona los usuarios del sistema.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button onClick={handleImportUsers} variant="outline" className="flex items-center gap-2">
                      <Upload className="h-4 w-4" />
                      Importar
                    </Button>
                    <Button onClick={handleExportUsers} variant="outline" className="flex items-center gap-2">
                      <Download className="h-4 w-4" />
                      Exportar
                    </Button>
                    <Button 
                      onClick={() => router.push('/administracion/usuarios/excel')} 
                      variant="outline" 
                      className="flex items-center gap-2"
                    >
                      <TableIcon className="h-4 w-4" />
                      Vista Dinámica
                    </Button>
                    <Button onClick={handleAddUser} className="flex items-center gap-2 btn-custom">
                      <Plus className="h-4 w-4" />
                      Añadir Usuario
                    </Button>
                  </div>
                </div>

                {/* Filtros */}
                <Card>
                  <CardContent className="p-6 space-y-4">
                    <div className="flex flex-col md:flex-row gap-4 items-end">
                      <div className="flex-1">
                        <label className="text-sm font-medium mb-1 block">Buscar</label>
                        <div className="relative">
                          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Buscar por nombre, correo, cargo..."
                            value={searchTerm}
                            onChange={handleSearchChange}
                            className="pl-8"
                          />
                        </div>
                      </div>

                      <div className="w-full md:w-48">
                        <label className="text-sm font-medium mb-1 block">Empresa</label>
                        <Select value={selectedEmpresa} onValueChange={setSelectedEmpresa}>
                          <SelectTrigger>
                            <SelectValue placeholder="Todas las empresas" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todas las empresas</SelectItem>
                            {empresasFilter.map((empresa) => (
                              <SelectItem key={empresa} value={empresa}>
                                {empresa}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="w-full md:w-48">
                        <label className="text-sm font-medium mb-1 block">Cargo</label>
                        <Select value={selectedCargo} onValueChange={setSelectedCargo}>
                          <SelectTrigger>
                            <SelectValue placeholder="Todos los cargos" />
                          </SelectTrigger>
                          <SelectContent className="max-h-60 overflow-y-auto">
                            <SelectItem value="all">Todos los cargos</SelectItem>
                            {cargos.map((cargo) => (
                              <SelectItem key={cargo.id} value={cargo.nombre}>
                                {cargo.nombre}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="w-full md:w-48">
                        <label className="text-sm font-medium mb-1 block">Estado</label>
                        <Select value={selectedEstado} onValueChange={setSelectedEstado}>
                          <SelectTrigger>
                            <SelectValue placeholder="Todos los estados" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos los estados</SelectItem>
                            <SelectItem value="activo">Activo</SelectItem>
                            <SelectItem value="inactivo">Inactivo</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="w-full md:w-48">
                        <label className="text-sm font-medium mb-1 block">Rol</label>
                        <Select value={selectedRol} onValueChange={setSelectedRol}>
                          <SelectTrigger>
                            <SelectValue placeholder="Todos los roles" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos los roles</SelectItem>
                            <SelectItem value="usuario">Usuario</SelectItem>

                          </SelectContent>
                        </Select>
                      </div>

                      <Button variant="outline" onClick={clearFilters} className="flex items-center gap-1">
                        <X className="h-4 w-4" />
                        Limpiar filtros
                      </Button>
                    </div>

                    {/* Indicadores de filtros activos */}
                    {(searchTerm || selectedEmpresa || selectedCargo || selectedEstado !== "all" || selectedRol !== "all" || sortConfig) && (
                      <div className="flex flex-wrap gap-2 mt-4">
                        <div className="text-sm text-muted-foreground">Filtros activos:</div>
                        {searchTerm && (
                          <Badge variant="outline" className="flex items-center gap-1">
                            Búsqueda: {searchTerm}
                          </Badge>
                        )}
                        {selectedEmpresa && selectedEmpresa !== "all" && (
                          <Badge variant="outline" className="flex items-center gap-1">
                            Empresa: {selectedEmpresa}
                          </Badge>
                        )}
                        {selectedCargo && selectedCargo !== "all" && (
                          <Badge variant="outline" className="flex items-center gap-1">
                            Cargo: {selectedCargo}
                          </Badge>
                        )}
                        {selectedEstado && selectedEstado !== "all" && (
                          <Badge variant="outline" className="flex items-center gap-1">
                            Estado: {selectedEstado === "activo" ? "Activo" : "Inactivo"}
                          </Badge>
                        )}
                        {selectedRol && selectedRol !== "all" && (
                          <Badge variant="outline" className="flex items-center gap-1">
                            Rol: Usuario
                          </Badge>
                        )}
                        {sortConfig && (
                          <Badge variant="outline" className="flex items-center gap-1">
                            Ordenado por: {sortConfig.key} (
                            {sortConfig.direction === "asc" ? "ascendente" : "descendente"})
                          </Badge>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Progreso de importación */}
                {isImporting && (
                  <Card>
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-medium">Importando usuarios</h3>
                          <span className="text-sm text-muted-foreground">{importProgress}%</span>
                        </div>
                        <Progress value={importProgress} className="w-full" />
                        <div className="text-sm text-muted-foreground">{importStatus}</div>
                        {(importResults.created > 0 || importResults.updated > 0 || importResults.errors > 0) && (
                          <div className="flex gap-4 text-sm">
                            <span className="text-green-600">Creados: {importResults.created}</span>
                            <span className="text-blue-600">Actualizados: {importResults.updated}</span>
                            <span className="text-red-600">Errores: {importResults.errors}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="rounded-md border bg-white">
                  {loading || searchLoading ? (
                    <div className="p-6 space-y-6">
                      <div className="flex justify-center items-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <span className="ml-2 text-lg text-muted-foreground">
                          {loading ? "Cargando usuarios..." : "Buscando..."}
                        </span>
                      </div>
                    </div>
                  ) : (
                    // Vista Normal
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Avatar</TableHead>
                            <TableHead
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => requestSort("colaborador")}
                            >
                              <div className="flex items-center">
                                Nombre
                                {getSortIcon("colaborador")}
                              </div>
                            </TableHead>
                            <TableHead
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => requestSort("cargos")}
                            >
                              <div className="flex items-center">
                                Cargo
                                {getSortIcon("cargos")}
                              </div>
                            </TableHead>
                            <TableHead
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => requestSort("empresas")}
                            >
                              <div className="flex items-center">
                                Empresa
                                {getSortIcon("empresas")}
                              </div>
                            </TableHead>
                            <TableHead
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => requestSort("correo_electronico")}
                            >
                              <div className="flex items-center">
                                Correo
                                {getSortIcon("correo_electronico")}
                              </div>
                            </TableHead>
                            <TableHead
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => requestSort("estado")}
                            >
                              <div className="flex items-center">
                                Estado
                                {getSortIcon("estado")}
                              </div>
                            </TableHead>
                            <TableHead>Acciones</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedUsers.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                No se encontraron usuarios con los filtros aplicados
                              </TableCell>
                            </TableRow>
                          ) : (
                            paginatedUsers.map((user) => (
                              <TableRow key={user.id}>
                                <TableCell>
                  <Avatar className="h-10 w-10">
                    <AvatarImage 
                      src={getAvatarUrl(user.avatar_path, user.genero)} 
                      alt={user.colaborador || 'Usuario'}
                      className="object-cover"
                    />
                    <AvatarFallback className="bg-primary/10 text-primary font-medium">
                      {user.colaborador?.charAt(0) || "?"}
                    </AvatarFallback>
                  </Avatar>
                </TableCell>
                                <TableCell className="font-medium">{user.colaborador}</TableCell>
                                <TableCell>{user.cargos?.nombre || "N/A"}</TableCell>
                                <TableCell>
                                  {user.empresas?.nombre ? (
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                      {user.empresas.nombre}
                    </Badge>
                  ) : (
                    "N/A"
                  )}
                                </TableCell>
                                <TableCell>{user.correo_electronico}</TableCell>
                                <TableCell>
                                  <Badge 
                                    variant={user.estado === 'activo' ? 'default' : 'destructive'}
                                    className={user.estado === 'activo' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-red-100 text-red-800 border-red-200'}
                                  >
                                    {user.estado === 'activo' ? 'Activo' : 'Inactivo'}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="p-2"
                                      onClick={() => handleViewDetails(user)}
                                      title="Ver detalles"
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="p-2"
                                      onClick={() => handleEditUser(user)}
                                      title="Editar usuario"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {/* Paginación */}
                  {!loading && !searchLoading && filteredUsers.length > 0 && (
                    <CardFooter className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t">
                      <div className="flex items-center mb-4 sm:mb-0">
                        <span className="text-sm text-muted-foreground mr-2">Mostrar</span>
                        <Select
                          value={itemsPerPage.toString()}
                          onValueChange={(value) => {
                            setItemsPerPage(Number.parseInt(value))
                            setCurrentPage(1) // Resetear a la primera página
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
                          {Math.min(currentPage * itemsPerPage, filteredUsers.length)} de {filteredUsers.length}{" "}
                          usuarios
                        </div>

                        <Button variant="outline" size="icon" onClick={goToPreviousPage} disabled={currentPage === 1}>
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
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Modal de detalles de usuario */}
      {isModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4 overflow-y-auto" onClick={() => setIsModalOpen(false)}>
          <div
            className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-xl font-semibold">Detalles del Usuario</h2>
              <Button variant="ghost" size="icon" onClick={() => setIsModalOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="p-4">
              <ProfileCard userData={selectedUser} />
            </div>
          </div>
        </div>
      )}

      {/* Modal de añadir usuario */}
      <Dialog open={isAddUserModalOpen} onOpenChange={setIsAddUserModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Añadir Nuevo Usuario</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[calc(90vh-120px)] px-4 py-2">
            {addUserError && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                <span className="block sm:inline">{addUserError}</span>
              </div>
            )}
            {addUserSuccess && (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">
                <span className="block sm:inline">Usuario registrado exitosamente</span>
              </div>
            )}
            <form className="space-y-6 px-2" onSubmit={handleAddUserSubmit}>
              {/* Campos obligatorios */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nombre">Nombre completo *</Label>
                  <Input
                    id="nombre"
                    type="text"
                    required
                    value={newUserData.nombre}
                    onChange={(e) => setNewUserData({ ...newUserData, nombre: e.target.value })}
                    className="mt-1 border-2 focus:border-blue-500 transition-colors px-3 py-2"
                  />
                </div>

                <div>
                  <Label htmlFor="email">Correo electrónico *</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={newUserData.correo}
                    onChange={(e) => setNewUserData({ ...newUserData, correo: e.target.value })}
                    className="mt-1 border-2 focus:border-blue-500 transition-colors px-3 py-2"
                  />
                </div>

                <div>
                  <Label htmlFor="telefono">Teléfono *</Label>
                  <Input
                    id="telefono"
                    type="tel"
                    required
                    value={newUserData.telefono}
                    onChange={(e) => setNewUserData({ ...newUserData, telefono: e.target.value })}
                    className="mt-1 border-2 focus:border-blue-500 transition-colors px-3 py-2"
                  />
                </div>

                <div>
                  <Label htmlFor="rol">Rol *</Label>
                  <Select value={newUserData.rol} onValueChange={(value) => setNewUserData({ ...newUserData, rol: value })}>
                    <SelectTrigger className="mt-1 border-2 focus:border-blue-500 transition-colors">
                      <SelectValue placeholder="Seleccionar rol" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="usuario">Usuario</SelectItem>
                      <SelectItem value="jefe">Jefe</SelectItem>
                      <SelectItem value="administrador">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>


              </div>

              {/* Información adicional */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-medium mb-4">Información adicional</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="genero">Género</Label>
                    <Select value={newUserData.genero} onValueChange={(value) => setNewUserData({ ...newUserData, genero: value })}>
                      <SelectTrigger className="mt-1 border-2 focus:border-blue-500 transition-colors">
                        <SelectValue placeholder="Seleccionar género" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="masculino">Masculino</SelectItem>
                        <SelectItem value="femenino">Femenino</SelectItem>
                        <SelectItem value="otro">Otro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="cedula">Cédula</Label>
                    <Input
                      id="cedula"
                      type="text"
                      value={newUserData.cedula}
                      onChange={(e) => setNewUserData({ ...newUserData, cedula: e.target.value })}
                      className="mt-1 border-2 focus:border-blue-500 transition-colors px-3 py-2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="fecha_ingreso">Fecha de Ingreso</Label>
                    <Input
                      id="fecha_ingreso"
                      type="date"
                      value={newUserData.fecha_ingreso}
                      onChange={(e) => setNewUserData({ ...newUserData, fecha_ingreso: e.target.value })}
                      className="mt-1 border-2 focus:border-blue-500 transition-colors px-3 py-2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="empresa_id">Empresa</Label>
                    <Select value={newUserData.empresa_id} onValueChange={(value) => setNewUserData({ ...newUserData, empresa_id: value })}>
                      <SelectTrigger className="mt-1 border-2 focus:border-blue-500 transition-colors">
                        <SelectValue placeholder="Seleccionar empresa" />
                      </SelectTrigger>
                      <SelectContent>
                        {empresas
                          .filter(empresa => empresa && empresa.id && empresa.nombre)
                          .filter((empresa, index, self) => self.findIndex(e => e.id === empresa.id) === index)
                          .map((empresa) => (
                            <SelectItem key={`empresa-${empresa.id}`} value={empresa.id.toString()}>
                              {empresa.nombre}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="cargo">Cargo</Label>
                    <Select
                      value={newUserData.cargo_id}
                      onValueChange={(value) => setNewUserData({ ...newUserData, cargo_id: value })}
                    >
                      <SelectTrigger className="mt-1 border-2 focus:border-blue-500 transition-colors">
                        <SelectValue placeholder="Seleccionar cargo" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[200px] overflow-y-auto">
                        {cargos
                          .filter(cargo => cargo && cargo.id && cargo.nombre)
                          .map((cargo) => (
                            <SelectItem key={`cargo-${cargo.id}`} value={cargo.id.toString()}>
                              {cargo.nombre}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="sede">Sede</Label>
                    <Select value={newUserData.sede_id} onValueChange={(value) => setNewUserData({ ...newUserData, sede_id: value })}>
                      <SelectTrigger className="mt-1 border-2 focus:border-blue-500 transition-colors">
                        <SelectValue placeholder="Seleccionar sede" />
                      </SelectTrigger>
                      <SelectContent>
                        {sedes
                          .filter(sede => sede && sede.id && sede.nombre)
                          .filter((sede, index, self) => self.findIndex(s => s.id === sede.id) === index)
                          .map((sede) => (
                            <SelectItem key={`sede-${sede.id}`} value={sede.id.toString()}>
                              {sede.nombre}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="fecha_nacimiento">Fecha de Nacimiento</Label>
                    <Input
                      id="fecha_nacimiento"
                      type="date"
                      value={newUserData.fecha_nacimiento}
                      onChange={(e) => setNewUserData({ ...newUserData, fecha_nacimiento: e.target.value })}
                      className="mt-1 border-2 focus:border-blue-500 transition-colors px-3 py-2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="edad">Edad</Label>
                    <Input
                      id="edad"
                      type="number"
                      value={newUserData.edad}
                      onChange={(e) => setNewUserData({ ...newUserData, edad: e.target.value })}
                      className="mt-1 border-2 focus:border-blue-500 transition-colors px-3 py-2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="rh">RH</Label>
                    <Select value={newUserData.rh} onValueChange={(value) => setNewUserData({ ...newUserData, rh: value })}>
                      <SelectTrigger className="mt-1 border-2 focus:border-blue-500 transition-colors">
                        <SelectValue placeholder="Seleccionar RH" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="O+">O+</SelectItem>
                        <SelectItem value="O-">O-</SelectItem>
                        <SelectItem value="A+">A+</SelectItem>
                        <SelectItem value="A-">A-</SelectItem>
                        <SelectItem value="B+">B+</SelectItem>
                        <SelectItem value="B-">B-</SelectItem>
                        <SelectItem value="AB+">AB+</SelectItem>
                        <SelectItem value="AB-">AB-</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="tipo_de_contrato">Tipo de Contrato</Label>
                    <Select value={newUserData.tipo_de_contrato} onValueChange={(value) => setNewUserData({ ...newUserData, tipo_de_contrato: value })}>
                      <SelectTrigger className="mt-1 border-2 focus:border-blue-500 transition-colors">
                        <SelectValue placeholder="Seleccionar tipo de contrato" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Indefinido">Indefinido</SelectItem>
                        <SelectItem value="Fijo">Fijo</SelectItem>
                        <SelectItem value="Obra o Labor">Obra o Labor</SelectItem>
                        <SelectItem value="Prestación de Servicios">Prestación de Servicios</SelectItem>
                        <SelectItem value="Aprendizaje">Aprendizaje</SelectItem>
                        <SelectItem value="Temporal">Temporal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="eps">EPS</Label>
                    <Select value={newUserData.eps_id} onValueChange={(value) => setNewUserData({ ...newUserData, eps_id: value })}>
                      <SelectTrigger className="mt-1 border-2 focus:border-blue-500 transition-colors">
                        <SelectValue placeholder="Seleccionar EPS" />
                      </SelectTrigger>
                      <SelectContent>
                        {eps
                          .filter(epsItem => epsItem && epsItem.id && epsItem.nombre)
                          .filter((epsItem, index, self) => self.findIndex(e => e.id === epsItem.id) === index)
                          .map((epsItem) => (
                            <SelectItem key={`eps-${epsItem.id}`} value={epsItem.id.toString()}>
                              {epsItem.nombre}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="afp">AFP</Label>
                    <Select value={newUserData.afp_id} onValueChange={(value) => setNewUserData({ ...newUserData, afp_id: value })}>
                      <SelectTrigger className="mt-1 border-2 focus:border-blue-500 transition-colors">
                        <SelectValue placeholder="Seleccionar AFP" />
                      </SelectTrigger>
                      <SelectContent>
                        {afps
                          .filter(afp => afp && afp.id && afp.nombre)
                          .filter((afp, index, self) => self.findIndex(a => a.id === afp.id) === index)
                          .map((afp) => (
                            <SelectItem key={`afp-${afp.id}`} value={afp.id.toString()}>
                              {afp.nombre}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="cesantias">Cesantías</Label>
                    <Select value={newUserData.cesantias_id} onValueChange={(value) => setNewUserData({ ...newUserData, cesantias_id: value })}>
                      <SelectTrigger className="mt-1 border-2 focus:border-blue-500 transition-colors">
                        <SelectValue placeholder="Seleccionar cesantías" />
                      </SelectTrigger>
                      <SelectContent>
                        {cesantias
                          .filter(cesantia => cesantia && cesantia.id && cesantia.nombre)
                          .filter((cesantia, index, self) => self.findIndex(c => c.id === cesantia.id) === index)
                          .map((cesantia) => (
                            <SelectItem key={`cesantia-${cesantia.id}`} value={cesantia.id.toString()}>
                              {cesantia.nombre}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="caja_compensacion">Caja de Compensación</Label>
                    <Select value={newUserData.caja_de_compensacion_id} onValueChange={(value) => setNewUserData({ ...newUserData, caja_de_compensacion_id: value })}>
                      <SelectTrigger className="mt-1 border-2 focus:border-blue-500 transition-colors">
                        <SelectValue placeholder="Seleccionar caja" />
                      </SelectTrigger>
                      <SelectContent>
                        {cajaDeCompensacionOptions
                          .filter(caja => caja && caja.id && caja.nombre)
                          .filter((caja, index, self) => self.findIndex(c => c.id === caja.id) === index)
                          .map((caja) => (
                            <SelectItem key={`caja-${caja.id}`} value={caja.id.toString()}>
                              {caja.nombre}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="mt-4">
                  <Label htmlFor="direccion_residencia">Dirección de Residencia</Label>
                  <Textarea
                    id="direccion_residencia"
                    value={newUserData.direccion_residencia}
                    onChange={(e) => setNewUserData({ ...newUserData, direccion_residencia: e.target.value })}
                    className="mt-1 border-2 focus:border-blue-500 transition-colors px-3 py-2"
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setIsAddUserModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="btn-custom" disabled={addUserLoading}>
                  {addUserLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creando...
                    </>
                  ) : (
                    'Crear Usuario'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Editar Usuario */}
      <Dialog open={isEditUserModalOpen} onOpenChange={setIsEditUserModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Usuario</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {editUserError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                {editUserError}
              </div>
            )}
            {editUserSuccess && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
                Usuario actualizado exitosamente
              </div>
            )}
            {editUserData && (
              <form className="space-y-6 px-2" onSubmit={handleEditUserSubmit}>
                {/* Campos obligatorios */}
                <div>
                    <Label htmlFor="edit-nombre">Nombre completo *</Label>
                    <Input
                      id="edit-nombre"
                      type="text"
                      required
                      value={editUserData.nombre}
                      onChange={(e) => setEditUserData({ ...editUserData, nombre: e.target.value })}
                      className="mt-1 border-2 focus:border-blue-500 transition-colors px-3 py-2"
                    />
                  </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  <div>
                    <Label htmlFor="edit-email">Correo electrónico *</Label>
                    <Input
                      id="edit-email"
                      type="email"
                      required
                      value={editUserData.correo}
                      onChange={(e) => setEditUserData({ ...editUserData, correo: e.target.value })}
                      className="mt-1 border-2 focus:border-blue-500 transition-colors px-3 py-2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="edit-telefono">Teléfono *</Label>
                    <Input
                      id="edit-telefono"
                      type="tel"
                      required
                      value={editUserData.telefono}
                      onChange={(e) => setEditUserData({ ...editUserData, telefono: e.target.value })}
                      className="mt-1 border-2 focus:border-blue-500 transition-colors px-3 py-2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="edit-rol">Rol *</Label>
                    <Select value={editUserData.rol} onValueChange={(value) => setEditUserData({ ...editUserData, rol: value })}>
                      <SelectTrigger className="mt-1 border-2 focus:border-blue-500 transition-colors">
                        <SelectValue placeholder="Seleccionar rol" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="usuario">Usuario</SelectItem>
                        <SelectItem value="jefe">Jefe</SelectItem>
                        <SelectItem value="administrador">Administrador</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="edit-estado">Estado *</Label>
                    <Select value={editUserData.estado} onValueChange={(value) => setEditUserData({ ...editUserData, estado: value })}>
                      <SelectTrigger className="mt-1 border-2 focus:border-blue-500 transition-colors">
                        <SelectValue placeholder="Seleccionar estado" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="activo">Activo</SelectItem>
                        <SelectItem value="inactivo">Inactivo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Campos específicos para usuarios inactivos */}
                  {editUserData.estado === 'inactivo' && (
                    <>
                      <div>
                        <Label htmlFor="edit-motivo_retiro">Motivo de Retiro</Label>
                        <Textarea
                          id="edit-motivo_retiro"
                          value={editUserData.motivo_retiro || ''}
                          onChange={(e) => setEditUserData({ ...editUserData, motivo_retiro: e.target.value })}
                          className="mt-1 border-2 focus:border-blue-500 transition-colors px-3 py-2"
                          rows={3}
                          placeholder="Especifique el motivo del retiro..."
                        />
                      </div>

                      <div>
                        <Label htmlFor="edit-fecha_retiro">Fecha de Retiro</Label>
                        <Input
                          id="edit-fecha_retiro"
                          type="date"
                          value={editUserData.fecha_retiro || ''}
                          onChange={(e) => setEditUserData({ ...editUserData, fecha_retiro: e.target.value })}
                          className="mt-1 border-2 focus:border-blue-500 transition-colors px-3 py-2"
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* Información adicional */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-medium mb-4">Información adicional</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="edit-genero">Género</Label>
                      <Input
                        id="edit-genero"
                        value={editUserData.genero ? editUserData.genero.charAt(0).toUpperCase() + editUserData.genero.slice(1) : ''}
                        readOnly
                        className="mt-1 border-2 bg-gray-50 cursor-not-allowed"
                      />
                    </div>

                    <div>
                      <Label htmlFor="edit-cedula">Cédula</Label>
                      <Input
                        id="edit-cedula"
                        type="text"
                        value={editUserData.cedula}
                        onChange={(e) => setEditUserData({ ...editUserData, cedula: e.target.value })}
                        className="mt-1 border-2 focus:border-blue-500 transition-colors px-3 py-2"
                      />
                    </div>

                    <div>
                      <Label htmlFor="edit-fecha_ingreso">Fecha de Ingreso</Label>
                      <Input
                        id="edit-fecha_ingreso"
                        type="date"
                        value={editUserData.fecha_ingreso}
                        onChange={(e) => setEditUserData({ ...editUserData, fecha_ingreso: e.target.value })}
                        className="mt-1 border-2 focus:border-blue-500 transition-colors px-3 py-2"
                      />
                    </div>

                    <div>
                      <Label htmlFor="edit-empresa_id">Empresa</Label>
                      <Select value={editUserData.empresa_id} onValueChange={(value) => setEditUserData({ ...editUserData, empresa_id: value })}>
                        <SelectTrigger className="mt-1 border-2 focus:border-blue-500 transition-colors">
                          <SelectValue placeholder="Seleccionar empresa" />
                        </SelectTrigger>
                        <SelectContent>
                          {empresas
                            .filter(empresa => empresa && empresa.id && empresa.nombre)
                            .filter((empresa, index, self) => self.findIndex(e => e.id === empresa.id) === index)
                            .map((empresa) => (
                              <SelectItem key={`edit-empresa-${empresa.id}`} value={empresa.id.toString()}>
                                {empresa.nombre}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="edit-cargo">Cargo</Label>
                      <Select
                        value={editUserData.cargo_id}
                        onValueChange={(value) => setEditUserData({ ...editUserData, cargo_id: value })}
                      >
                        <SelectTrigger className="mt-1 border-2 focus:border-blue-500 transition-colors">
                          <SelectValue placeholder="Seleccionar cargo" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[200px] overflow-y-auto">
                          {cargos
                            .filter(cargo => cargo && cargo.id && cargo.nombre)
                            .map((cargo) => (
                              <SelectItem key={`edit-cargo-${cargo.id}`} value={cargo.id.toString()}>
                                {cargo.nombre}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="edit-sede">Sede</Label>
                      <Select value={editUserData.sede_id} onValueChange={(value) => setEditUserData({ ...editUserData, sede_id: value })}>
                        <SelectTrigger className="mt-1 border-2 focus:border-blue-500 transition-colors">
                          <SelectValue placeholder="Seleccionar sede" />
                        </SelectTrigger>
                        <SelectContent>
                          {sedes
                            .filter(sede => sede && sede.id && sede.nombre)
                            .filter((sede, index, self) => self.findIndex(s => s.id === sede.id) === index)
                            .map((sede) => (
                              <SelectItem key={`edit-sede-${sede.id}`} value={sede.id.toString()}>
                                {sede.nombre}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="edit-fecha_nacimiento">Fecha de Nacimiento</Label>
                      <Input
                        id="edit-fecha_nacimiento"
                        type="date"
                        value={editUserData.fecha_nacimiento}
                        onChange={(e) => setEditUserData({ ...editUserData, fecha_nacimiento: e.target.value })}
                        className="mt-1 border-2 focus:border-blue-500 transition-colors px-3 py-2"
                      />
                    </div>

                    <div>
                      <Label htmlFor="edit-edad">Edad</Label>
                      <Input
                        id="edit-edad"
                        type="number"
                        value={editUserData.edad}
                        onChange={(e) => setEditUserData({ ...editUserData, edad: e.target.value })}
                        className="mt-1 border-2 focus:border-blue-500 transition-colors px-3 py-2"
                      />
                    </div>

                    <div>
                      <Label htmlFor="edit-rh">RH</Label>
                      <Select value={editUserData.rh} onValueChange={(value) => setEditUserData({ ...editUserData, rh: value })}>
                        <SelectTrigger className="mt-1 border-2 focus:border-blue-500 transition-colors">
                          <SelectValue placeholder="Seleccionar RH" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="O+">O+</SelectItem>
                          <SelectItem value="O-">O-</SelectItem>
                          <SelectItem value="A+">A+</SelectItem>
                          <SelectItem value="A-">A-</SelectItem>
                          <SelectItem value="B+">B+</SelectItem>
                          <SelectItem value="B-">B-</SelectItem>
                          <SelectItem value="AB+">AB+</SelectItem>
                          <SelectItem value="AB-">AB-</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="edit-tipo_de_contrato">Tipo de Contrato</Label>
                      <Select value={editUserData.tipo_de_contrato} onValueChange={(value) => setEditUserData({ ...editUserData, tipo_de_contrato: value })}>
                        <SelectTrigger className="mt-1 border-2 focus:border-blue-500 transition-colors">
                          <SelectValue placeholder="Seleccionar tipo de contrato" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Indefinido">Indefinido</SelectItem>
                          <SelectItem value="Fijo">Fijo</SelectItem>
                          <SelectItem value="Obra o Labor">Obra o Labor</SelectItem>
                          <SelectItem value="Prestación de Servicios">Prestación de Servicios</SelectItem>
                          <SelectItem value="Aprendizaje">Aprendizaje</SelectItem>
                          <SelectItem value="Temporal">Temporal</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="edit-eps">EPS</Label>
                      <Select value={editUserData.eps_id} onValueChange={(value) => setEditUserData({ ...editUserData, eps_id: value })}>
                        <SelectTrigger className="mt-1 border-2 focus:border-blue-500 transition-colors">
                          <SelectValue placeholder="Seleccionar EPS" />
                        </SelectTrigger>
                        <SelectContent>
                          {eps
                            .filter(epsItem => epsItem && epsItem.id && epsItem.nombre)
                            .filter((epsItem, index, self) => self.findIndex(e => e.id === epsItem.id) === index)
                            .map((epsItem) => (
                              <SelectItem key={`edit-eps-${epsItem.id}`} value={epsItem.id.toString()}>
                                {epsItem.nombre}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="edit-afp">AFP</Label>
                      <Select value={editUserData.afp_id} onValueChange={(value) => setEditUserData({ ...editUserData, afp_id: value })}>
                        <SelectTrigger className="mt-1 border-2 focus:border-blue-500 transition-colors">
                          <SelectValue placeholder="Seleccionar AFP" />
                        </SelectTrigger>
                        <SelectContent>
                          {afps
                            .filter(afp => afp && afp.id && afp.nombre)
                            .filter((afp, index, self) => self.findIndex(a => a.id === afp.id) === index)
                            .map((afp) => (
                              <SelectItem key={`edit-afp-${afp.id}`} value={afp.id.toString()}>
                                {afp.nombre}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="edit-cesantias">Cesantías</Label>
                      <Select value={editUserData.cesantias_id} onValueChange={(value) => setEditUserData({ ...editUserData, cesantias_id: value })}>
                        <SelectTrigger className="mt-1 border-2 focus:border-blue-500 transition-colors">
                          <SelectValue placeholder="Seleccionar cesantías" />
                        </SelectTrigger>
                        <SelectContent>
                          {cesantias
                            .filter(cesantia => cesantia && cesantia.id && cesantia.nombre)
                            .filter((cesantia, index, self) => self.findIndex(c => c.id === cesantia.id) === index)
                            .map((cesantia) => (
                              <SelectItem key={`edit-cesantia-${cesantia.id}`} value={cesantia.id.toString()}>
                                {cesantia.nombre}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="edit-caja_compensacion">Caja de Compensación</Label>
                      <Select value={editUserData.caja_de_compensacion_id} onValueChange={(value) => setEditUserData({ ...editUserData, caja_de_compensacion_id: value })}>
                        <SelectTrigger className="mt-1 border-2 focus:border-blue-500 transition-colors">
                          <SelectValue placeholder="Seleccionar caja" />
                        </SelectTrigger>
                        <SelectContent>
                          {cajaDeCompensacionOptions
                            .filter(caja => caja && caja.id && caja.nombre)
                            .filter((caja, index, self) => self.findIndex(c => c.id === caja.id) === index)
                            .map((caja) => (
                              <SelectItem key={`edit-caja-${caja.id}`} value={caja.id.toString()}>
                                {caja.nombre}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Asignación de Jefes */}
                  <div className="border-t pt-6 mt-6">
                    <h3 className="text-lg font-medium mb-4">Jefes Asignados</h3>
                    <div className="space-y-4">
                      <Label>Seleccionar jefes (aprobadores de permisos)</Label>
                      <div className="border rounded-md p-4 max-h-[200px] overflow-y-auto space-y-2">
                        {availableBosses.length > 0 ? (
                          availableBosses.map((boss) => (
                            <div key={boss.auth_user_id} className="flex items-center space-x-2">
                              <Checkbox 
                                id={`boss-${boss.auth_user_id}`} 
                                checked={selectedBossIds.includes(boss.auth_user_id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedBossIds([...selectedBossIds, boss.auth_user_id])
                                  } else {
                                    setSelectedBossIds(selectedBossIds.filter(id => id !== boss.auth_user_id))
                                  }
                                }}
                              />
                              <Label 
                                htmlFor={`boss-${boss.auth_user_id}`}
                                className="text-sm font-normal cursor-pointer"
                              >
                                {boss.colaborador}
                              </Label>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground">No hay usuarios con rol 'Jefe' disponibles.</p>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Los usuarios seleccionados deberán aprobar las solicitudes de permisos de este usuario.
                      </p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <Label htmlFor="edit-direccion_residencia">Dirección de Residencia</Label>
                    <Textarea
                      id="edit-direccion_residencia"
                      value={editUserData.direccion_residencia}
                      onChange={(e) => setEditUserData({ ...editUserData, direccion_residencia: e.target.value })}
                      className="mt-1 border-2 focus:border-blue-500 transition-colors px-3 py-2"
                      rows={3}
                    />
                  </div>
                </div>



                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={() => setIsEditUserModalOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={editUserLoading}>
                    {editUserLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Actualizando...
                      </>
                    ) : (
                      'Actualizar Usuario'
                    )}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
