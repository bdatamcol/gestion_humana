'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { FaBuilding, FaUsers, FaBriefcase, FaMapMarkerAlt, FaUser, FaSearch, FaHeartbeat, FaShieldAlt, FaHandHoldingUsd, FaChartLine } from 'react-icons/fa'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, ComposedChart, Line } from 'recharts'

interface Empresa {
  id: string
  nombre: string
}

interface Sede {
  id: string
  nombre: string
}

interface Cargo {
  id: string
  nombre: string
}

interface EmpresaStats {
  id: string
  nombre: string
  usuarios_activos: number
  usuarios_totales: number
  porcentaje: number
}

interface GeneroStats {
  genero: string
  cantidad: number
  porcentaje: number
}

interface SedeStats {
  id: string
  nombre: string
  cantidad: number
}

interface CargoStats {
  id: string
  nombre: string
  cantidad: number
  porcentaje: number
}

interface EpsStats {
  id: string
  nombre: string
  cantidad: number
  porcentaje: number
}

interface AfpStats {
  id: string
  nombre: string
  cantidad: number
  porcentaje: number
}

interface CesantiasStats {
  id: string
  nombre: string
  cantidad: number
  porcentaje: number
}

interface CajaCompensacionStats {
  id: string
  nombre: string
  cantidad: number
  porcentaje: number
}

interface RetiroStats {
  motivo: string
  cantidad: number
  fecha: string
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF7C7C']

// Función debounce para optimizar las llamadas a la API
function debounce<T extends (...args: any[]) => any>(func: T, delay: number): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func(...args), delay)
  }
}

export default function EstadisticasPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [empresasStats, setEmpresasStats] = useState<EmpresaStats[]>([])
  const [generoStats, setGeneroStats] = useState<GeneroStats[]>([])
  const [sedesStats, setSedesStats] = useState<SedeStats[]>([])
  const [cargosStats, setCargosStats] = useState<CargoStats[]>([])  
  const [searchCargo, setSearchCargo] = useState('')
  
  // Nuevos estados para HR
  const [epsStats, setEpsStats] = useState<EpsStats[]>([])
  const [afpStats, setAfpStats] = useState<AfpStats[]>([])
  const [cesantiasStats, setCesantiasStats] = useState<CesantiasStats[]>([])
  const [cajaCompensacionStats, setCajaCompensacionStats] = useState<CajaCompensacionStats[]>([])
  
  // Estado para retiros
  const [retirosStats, setRetirosStats] = useState<RetiroStats[]>([])
  
  const [totalUsuarios, setTotalUsuarios] = useState(0)
  const [totalEmpresas, setTotalEmpresas] = useState(0)
  
  // Estados para filtro por empresa
  const [empresasDisponibles, setEmpresasDisponibles] = useState<Empresa[]>([])
  const [empresaSeleccionada, setEmpresaSeleccionada] = useState<string>('todas')
  const [isLoading, setIsLoading] = useState(true)
  
  // Estado para filtro de estado de usuario
  const [estadoUsuarioSeleccionado, setEstadoUsuarioSeleccionado] = useState<string>('activo')

  // Filtrar cargos basandose en el termino de busqueda
  const filteredCargosStats = cargosStats.filter(cargo =>
    cargo.nombre.toLowerCase().includes(searchCargo.toLowerCase())
  )

  const loadEstadisticas = async (empresaFiltro: string = 'todas', estadoFiltro: string = 'todos') => {
    const supabase = createSupabaseClient()
    setIsLoading(true)
    
    try {
      // Construir filtros si es necesario
      const empresaFilter = empresaFiltro !== 'todas' ? empresaFiltro : null
      const estadoFilter = estadoFiltro !== 'todos' ? estadoFiltro : null
      
      // Crear todas las consultas en paralelo
      const queries = []
      
      // 1. Obtener empresas disponibles
      queries.push(
        supabase
          .from('empresas')
          .select('id, nombre')
      )
      
      // 2. Estadísticas de empresas (solo si no hay filtro específico)
      if (!empresaFilter) {
        // Obtener todos los usuarios sin filtrar por estado para el total
        queries.push(
          supabase
            .from('usuario_nomina')
            .select('empresa_id, rol, estado')
        )
      } else {
        queries.push(Promise.resolve({ data: null }))
      }
      
      // 3. Estadísticas de género - optimizada con una sola consulta
      let generoQuery = supabase
        .from('usuario_nomina')
        .select('genero')
        .in('rol', ['usuario', 'jefe', 'Jefe', 'JEFE'])
        .in('genero', ['Femenino', 'Masculino'])
      
      if (empresaFilter) {
        generoQuery = generoQuery.eq('empresa_id', empresaFilter)
      }
      if (estadoFilter) {
        generoQuery = generoQuery.eq('estado', estadoFilter)
      } else {
        generoQuery = generoQuery.eq('estado', 'activo')
      }
      queries.push(generoQuery)
      
      // 4. Estadísticas de sedes
      let sedesQuery = supabase
        .from('usuario_nomina')
        .select('sede_id')
        .in('rol', ['usuario', 'jefe', 'Jefe', 'JEFE'])
      
      if (empresaFilter) {
        sedesQuery = sedesQuery.eq('empresa_id', empresaFilter)
      }
      if (estadoFilter) {
        sedesQuery = sedesQuery.eq('estado', estadoFilter)
      } else {
        sedesQuery = sedesQuery.eq('estado', 'activo')
      }
      queries.push(sedesQuery)
      
      // 5. Obtener lista de sedes
      queries.push(
        supabase
          .from('sedes')
          .select('id, nombre')
      )
      
      // 6. Estadísticas de cargos
      let cargosQuery = supabase
        .from('usuario_nomina')
        .select('cargo_id')
        .in('rol', ['usuario', 'jefe', 'Jefe', 'JEFE'])
      
      if (empresaFilter) {
        cargosQuery = cargosQuery.eq('empresa_id', empresaFilter)
      }
      if (estadoFilter) {
        cargosQuery = cargosQuery.eq('estado', estadoFilter)
      } else {
        cargosQuery = cargosQuery.eq('estado', 'activo')
      }
      queries.push(cargosQuery)
      
      // 7. Obtener lista de cargos
      queries.push(
        supabase
          .from('cargos')
          .select('id, nombre')
      )
      
      // 8. Estadísticas de EPS
      let epsQuery = supabase
        .from('usuario_nomina')
        .select('eps_id')
        .in('rol', ['usuario', 'jefe', 'Jefe', 'JEFE'])
      
      if (empresaFilter) {
        epsQuery = epsQuery.eq('empresa_id', empresaFilter)
      }
      if (estadoFilter) {
        epsQuery = epsQuery.eq('estado', estadoFilter)
      } else {
        epsQuery = epsQuery.eq('estado', 'activo')
      }
      queries.push(epsQuery)
      
      // 9. Obtener lista de EPS
      queries.push(
        supabase
          .from('eps')
          .select('id, nombre')
      )
      
      // 10. Estadísticas de AFP
      let afpQuery = supabase
        .from('usuario_nomina')
        .select('afp_id')
        .in('rol', ['usuario', 'jefe', 'Jefe', 'JEFE'])
      
      if (empresaFilter) {
        afpQuery = afpQuery.eq('empresa_id', empresaFilter)
      }
      if (estadoFilter) {
        afpQuery = afpQuery.eq('estado', estadoFilter)
      } else {
        afpQuery = afpQuery.eq('estado', 'activo')
      }
      queries.push(afpQuery)
      
      // 11. Obtener lista de AFP
      queries.push(
        supabase
          .from('afp')
          .select('id, nombre')
      )
      
      // 12. Estadísticas de Cesantías
      let cesantiasQuery = supabase
        .from('usuario_nomina')
        .select('cesantias_id')
        .in('rol', ['usuario', 'jefe', 'Jefe', 'JEFE'])
      
      if (empresaFilter) {
        cesantiasQuery = cesantiasQuery.eq('empresa_id', empresaFilter)
      }
      if (estadoFilter) {
        cesantiasQuery = cesantiasQuery.eq('estado', estadoFilter)
      } else {
        cesantiasQuery = cesantiasQuery.eq('estado', 'activo')
      }
      queries.push(cesantiasQuery)
      
      // 13. Obtener lista de Cesantías
      queries.push(
        supabase
          .from('cesantias')
          .select('id, nombre')
      )
      
      // 14. Estadísticas de Caja de Compensación
      let cajaQuery = supabase
        .from('usuario_nomina')
        .select('caja_de_compensacion_id')
        .in('rol', ['usuario', 'jefe', 'Jefe', 'JEFE'])
      
      if (empresaFilter) {
        cajaQuery = cajaQuery.eq('empresa_id', empresaFilter)
      }
      if (estadoFilter) {
        cajaQuery = cajaQuery.eq('estado', estadoFilter)
      } else {
        cajaQuery = cajaQuery.eq('estado', 'activo')
      }
      queries.push(cajaQuery)
      
      // 15. Obtener lista de Caja de Compensación
      queries.push(
        supabase
          .from('caja_de_compensacion')
          .select('id, nombre')
      )
      
      // 16. Estadísticas de retiros
      let retirosQuery = supabase
        .from('usuario_nomina')
        .select('motivo_retiro, fecha_retiro')
        .eq('estado', 'inactivo')
        .not('motivo_retiro', 'is', null)
        .not('fecha_retiro', 'is', null)
      
      if (empresaFilter) {
        retirosQuery = retirosQuery.eq('empresa_id', empresaFilter)
      }
      queries.push(retirosQuery)
      
      // Ejecutar todas las consultas en paralelo
      const [
        empresasResult,
        empresasDataResult,
        generoResult,
        sedesDataResult,
        sedesListResult,
        cargosDataResult,
        cargosListResult,
        epsDataResult,
        epsListResult,
        afpDataResult,
        afpListResult,
        cesantiasDataResult,
        cesantiasListResult,
        cajaDataResult,
        cajaListResult,
        retirosResult
      ] = await Promise.all(queries)
      
      // Procesar resultados
      
      // 1. Empresas disponibles
      if (empresasResult.data) {
        setEmpresasDisponibles(empresasResult.data as Empresa[])
      }
      
      // 2. Estadísticas de empresas
      if (empresasDataResult.data && empresasResult.data) {
        const empresasConStats: EmpresaStats[] = []
        let totalUsuariosGlobal = 0
        
        for (const empresa of empresasResult.data) {
          const empresaTyped = empresa as Empresa
          const usuariosEmpresa = empresasDataResult.data.filter((u: any) => 
            u.empresa_id === empresaTyped.id && ['usuario', 'jefe', 'Jefe', 'JEFE'].includes(u.rol)
          )
          
          // Filtrar usuarios según el estado seleccionado
          let usuariosFiltrados
          if (estadoFilter) {
            usuariosFiltrados = usuariosEmpresa.filter((u: any) => u.estado === estadoFilter)
          } else {
            // Mostrar todos los usuarios cuando no hay filtro de estado
            usuariosFiltrados = usuariosEmpresa
          }
          
          const usuariosActivos = usuariosEmpresa.filter((u: any) => u.estado === 'activo')
          
          // Usar la longitud total de usuarios de la empresa para el conteo global
          const totalEmpresa = usuariosEmpresa.length
          const activosEmpresa = usuariosActivos.length
          totalUsuariosGlobal += totalEmpresa
          
          empresasConStats.push({
            id: empresaTyped.id,
            nombre: empresaTyped.nombre,
            usuarios_activos: activosEmpresa,
            usuarios_totales: totalEmpresa,
            porcentaje: 0
          })
        }

        // Manejar usuarios sin empresa o con empresa no válida
        const usuariosSinEmpresa = empresasDataResult.data.filter((u: any) => 
          (!u.empresa_id || !empresasResult.data.some((e: any) => e.id === u.empresa_id)) && 
          ['usuario', 'jefe', 'Jefe', 'JEFE'].includes(u.rol)
        )

        if (usuariosSinEmpresa.length > 0) {
          const usuariosActivos = usuariosSinEmpresa.filter((u: any) => u.estado === 'activo')
          const totalSinEmpresa = usuariosSinEmpresa.length
          const activosSinEmpresa = usuariosActivos.length
          
          totalUsuariosGlobal += totalSinEmpresa
          
          empresasConStats.push({
            id: 'sin-empresa',
            nombre: 'Sin Empresa Asignada',
            usuarios_activos: activosSinEmpresa,
            usuarios_totales: totalSinEmpresa,
            porcentaje: 0
          })
        }
        
        const empresasConPorcentajes = empresasConStats
          .map(empresa => ({
            ...empresa,
            porcentaje: totalUsuariosGlobal > 0 ? Math.round((empresa.usuarios_totales / totalUsuariosGlobal) * 100) : 0
          }))
          .sort((a, b) => b.usuarios_totales - a.usuarios_totales)
        
        setEmpresasStats(empresasConPorcentajes)
        setTotalUsuarios(totalUsuariosGlobal)
        setTotalEmpresas(empresasResult.data.length)
      }
      
      // 3. Estadísticas de género - optimizada
      if (generoResult.data) {
        const generoCount = generoResult.data.reduce((acc: any, user: any) => {
          const genero = user.genero
          acc[genero] = (acc[genero] || 0) + 1
          return acc
        }, {})
        
        const totalGenero = generoResult.data.length
        const mujeres = generoCount['Femenino'] || 0
        const hombres = generoCount['Masculino'] || 0
        
        const generoData: GeneroStats[] = [
          {
            genero: 'Mujeres',
            cantidad: mujeres,
            porcentaje: totalGenero > 0 ? Math.round((mujeres / totalGenero) * 100) : 0
          },
          {
            genero: 'Hombres',
            cantidad: hombres,
            porcentaje: totalGenero > 0 ? Math.round((hombres / totalGenero) * 100) : 0
          }
        ]
        
        setGeneroStats(generoData)
      }
      
      // 4. Estadísticas de sedes
      if (sedesDataResult.data && sedesListResult.data) {
        const sedesCount = sedesDataResult.data.reduce((acc: any, user: any) => {
          const sedeId = user.sede_id
          acc[sedeId] = (acc[sedeId] || 0) + 1
          return acc
        }, {})
        
        const sedesConStats: SedeStats[] = sedesListResult.data.map((sede: any) => ({
          id: sede.id,
          nombre: sede.nombre,
          cantidad: sedesCount[sede.id] || 0
        }))
        
        setSedesStats(sedesConStats)
      }
      
      // 5. Estadísticas de cargos
      if (cargosDataResult.data && cargosListResult.data) {
        const cargosCount = cargosDataResult.data.reduce((acc: any, user: any) => {
          const cargoId = user.cargo_id
          acc[cargoId] = (acc[cargoId] || 0) + 1
          return acc
        }, {})
        
        const totalUsuariosCargos = cargosDataResult.data.length
        
        const cargosConStats: CargoStats[] = cargosListResult.data
          .map((cargo: any) => ({
            id: cargo.id,
            nombre: cargo.nombre,
            cantidad: cargosCount[cargo.id] || 0,
            porcentaje: totalUsuariosCargos > 0 ? Math.round(((cargosCount[cargo.id] || 0) / totalUsuariosCargos) * 100) : 0
          }))
          .filter((cargo: any) => cargo.cantidad > 0)
          .sort((a: any, b: any) => b.cantidad - a.cantidad)
        
        setCargosStats(cargosConStats)
      }
      
      // 6. Estadísticas de EPS
      if (epsDataResult.data && epsListResult.data) {
        const epsCount = epsDataResult.data.reduce((acc: any, user: any) => {
          const epsId = user.eps_id
          acc[epsId] = (acc[epsId] || 0) + 1
          return acc
        }, {})
        
        const totalUsuariosEps = epsDataResult.data.length
        
        const epsConStats: EpsStats[] = epsListResult.data
          .map((eps: any) => ({
            id: eps.id,
            nombre: eps.nombre,
            cantidad: epsCount[eps.id] || 0,
            porcentaje: totalUsuariosEps > 0 ? Math.round(((epsCount[eps.id] || 0) / totalUsuariosEps) * 100) : 0
          }))
          .filter((eps: any) => eps.cantidad > 0)
          .sort((a: any, b: any) => b.cantidad - a.cantidad)
        
        setEpsStats(epsConStats)
      }
      
      // 7. Estadísticas de AFP
      if (afpDataResult.data && afpListResult.data) {
        const afpCount = afpDataResult.data.reduce((acc: any, user: any) => {
          const afpId = user.afp_id
          acc[afpId] = (acc[afpId] || 0) + 1
          return acc
        }, {})
        
        const totalUsuariosAfp = afpDataResult.data.length
        
        const afpConStats: AfpStats[] = afpListResult.data
          .map((afp: any) => ({
            id: afp.id,
            nombre: afp.nombre,
            cantidad: afpCount[afp.id] || 0,
            porcentaje: totalUsuariosAfp > 0 ? Math.round(((afpCount[afp.id] || 0) / totalUsuariosAfp) * 100) : 0
          }))
          .filter((afp: any) => afp.cantidad > 0)
          .sort((a: any, b: any) => b.cantidad - a.cantidad)
        
        setAfpStats(afpConStats)
      }
      
      // 8. Estadísticas de Cesantías
      if (cesantiasDataResult.data && cesantiasListResult.data) {
        const cesantiasCount = cesantiasDataResult.data.reduce((acc: any, user: any) => {
          const cesantiasId = user.cesantias_id
          acc[cesantiasId] = (acc[cesantiasId] || 0) + 1
          return acc
        }, {})
        
        const totalUsuariosCesantias = cesantiasDataResult.data.length
        
        const cesantiasConStats: CesantiasStats[] = cesantiasListResult.data
          .map((cesantias: any) => ({
            id: cesantias.id,
            nombre: cesantias.nombre,
            cantidad: cesantiasCount[cesantias.id] || 0,
            porcentaje: totalUsuariosCesantias > 0 ? Math.round(((cesantiasCount[cesantias.id] || 0) / totalUsuariosCesantias) * 100) : 0
          }))
          .filter((cesantias: any) => cesantias.cantidad > 0)
          .sort((a: any, b: any) => b.cantidad - a.cantidad)
        
        setCesantiasStats(cesantiasConStats)
      }
      
      // 9. Estadísticas de Caja de Compensación
      if (cajaDataResult.data && cajaListResult.data) {
        const cajaCount = cajaDataResult.data.reduce((acc: any, user: any) => {
          const cajaId = user.caja_de_compensacion_id
          acc[cajaId] = (acc[cajaId] || 0) + 1
          return acc
        }, {})
        
        const totalUsuariosCaja = cajaDataResult.data.length
        
        const cajaConStats: CajaCompensacionStats[] = cajaListResult.data
          .map((caja: any) => ({
            id: caja.id,
            nombre: caja.nombre,
            cantidad: cajaCount[caja.id] || 0,
            porcentaje: totalUsuariosCaja > 0 ? Math.round(((cajaCount[caja.id] || 0) / totalUsuariosCaja) * 100) : 0
          }))
          .filter((caja: any) => caja.cantidad > 0)
          .sort((a: any, b: any) => b.cantidad - a.cantidad)
        
        setCajaCompensacionStats(cajaConStats)
      }
      
      // 10. Estadísticas de retiros
      if (retirosResult.data && retirosResult.data.length > 0) {
        const retirosGrouped = retirosResult.data.reduce((acc: any, retiro: any) => {
          // Normalizar el motivo para agrupar variaciones del mismo motivo
          const motivo = retiro.motivo_retiro ? 
            retiro.motivo_retiro.trim().toUpperCase() : 'SIN ESPECIFICAR';
            
          if (!acc[motivo]) {
            acc[motivo] = {
              cantidad: 0,
              fechas: []
            }
          }
          acc[motivo].cantidad += 1
          acc[motivo].fechas.push(retiro.fecha_retiro)
          return acc
        }, {})
        
        // Convertir a array, sumar cantidades para motivos duplicados (después de normalizar)
        const retirosArray = Object.entries(retirosGrouped)
          .map(([motivo, data]: [string, any]) => ({
            motivo,
            cantidad: data.cantidad,
            fecha: data.fechas[data.fechas.length - 1]
          }))
          .sort((a: any, b: any) => b.cantidad - a.cantidad)
        
        setRetirosStats(retirosArray)
      }
      
    } catch (error) {
      console.error('Error al cargar estadisticas:', error)
    } finally {
      setLoading(false)
      setIsLoading(false)
    }
  }
  
  // Debounced version of loadEstadisticas
  const debouncedLoadEstadisticas = useCallback(
    debounce((empresaFiltro: string, estadoFiltro: string) => {
      loadEstadisticas(empresaFiltro, estadoFiltro)
    }, 300),
    []
  )
  
  useEffect(() => {
    loadEstadisticas()
  }, [])
  
  useEffect(() => {
    if (empresasDisponibles.length > 0) {
      setLoading(true)
      debouncedLoadEstadisticas(empresaSeleccionada, estadoUsuarioSeleccionado)
    }
  }, [empresaSeleccionada, estadoUsuarioSeleccionado, debouncedLoadEstadisticas])
  
  const handleEmpresaChange = (value: string) => {
    setEmpresaSeleccionada(value)
  }
  
  const handleEstadoUsuarioChange = (value: string) => {
    setEstadoUsuarioSeleccionado(value)
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Estadisticas</h1>
          <p className="text-gray-600">Cargando datos...</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-64 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Estadisticas</h1>
        <p className="text-gray-600">Analisis de datos del sistema</p>
        
        {/* Filtros */}
        <div className="mt-4 flex items-center gap-6 flex-wrap">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">Filtrar por empresa:</label>
            <Select value={empresaSeleccionada} onValueChange={handleEmpresaChange}>
              <SelectTrigger className="w-64 bg-white border-gray-300 shadow-sm">
                <SelectValue placeholder="Seleccionar empresa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas las empresas</SelectItem>
                {empresasDisponibles.map((empresa) => (
                  <SelectItem key={empresa.id} value={empresa.id}>
                    {empresa.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">Estado de usuario:</label>
            <Select value={estadoUsuarioSeleccionado} onValueChange={handleEstadoUsuarioChange}>
              <SelectTrigger className="w-48 bg-white border-gray-300 shadow-sm">
                <SelectValue placeholder="Seleccionar estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="activo">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    Activos
                  </div>
                </SelectItem>
                <SelectItem value="inactivo">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    Inactivos
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
         

       </div>
       
       {/* Tarjetas de resumen */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Total Empresas */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Empresas</CardTitle>
            <FaBuilding className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-4 w-4" />
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{totalEmpresas}</p>
                  <p className="text-xs text-muted-foreground">Empresas</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Total Usuarios */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Usuarios</CardTitle>
            <FaUsers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-4 w-4" />
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{totalUsuarios}</p>
                  <p className="text-xs text-muted-foreground">Usuarios</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Usuarios Activos/Inactivos */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {estadoUsuarioSeleccionado === 'inactivo' ? 'Usuarios Inactivos' : 'Usuarios Activos'}
            </CardTitle>
            <FaUser className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-4 w-28" />
                </div>
                <Skeleton className="h-4 w-4" />
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">
                    {estadoUsuarioSeleccionado === 'inactivo' 
                      ? empresasStats.reduce((sum, emp) => sum + (emp.usuarios_totales - emp.usuarios_activos), 0)
                      : empresasStats.reduce((sum, emp) => sum + emp.usuarios_activos, 0)
                    }
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {estadoUsuarioSeleccionado === 'inactivo' ? 'Usuarios' : 'Usuarios'}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sedes Activas */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sedes Activas</CardTitle>
            <FaMapMarkerAlt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-4 w-4" />
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{sedesStats.filter(sede => sede.cantidad > 0).length}</p>
                  <p className="text-xs text-muted-foreground">Sedes con usuarios</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Fila 1: Distribucion por Empresas y Distribucion por Genero */}
      <div className={`grid gap-6 mb-6 ${empresaSeleccionada === 'todas' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
        {/* 1. Grafico de empresas - Tabla y Pie chart - Solo mostrar cuando no hay filtro */}
        {empresaSeleccionada === 'todas' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FaBuilding className="h-5 w-5" />
              Distribucion por Empresas
            </CardTitle>
            <CardDescription>
              {estadoUsuarioSeleccionado === 'inactivo' 
                ? 'Cantidad de usuarios inactivos y porcentaje por empresa'
                : 'Cantidad de usuarios activos y porcentaje por empresa'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex gap-6 h-80">
                <div className="w-1/2">
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-3 border-b">
                      <Skeleton className="h-4 w-32" />
                    </div>
                    <div className="max-h-64 overflow-y-auto p-4 space-y-3">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Skeleton className="w-3 h-3 rounded-full" />
                            <Skeleton className="h-4 w-24" />
                          </div>
                          <Skeleton className="h-4 w-8" />
                          <Skeleton className="h-4 w-8" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="w-1/2 flex items-center justify-center">
                  <Skeleton className="h-48 w-48 rounded-full" />
                </div>
              </div>
            ) : (
              <div className="flex gap-6 h-80">
                {/* Tabla a la izquierda */}
                <div className="w-1/2">
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-3 border-b">
                      <h3 className="font-semibold text-sm text-gray-700">Empresas y Usuarios</h3>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      <table className="w-full text-sm">
                        <tbody>
                          {empresasStats.map((empresa, index) => (
                            <tr key={empresa.id} className="border-b hover:bg-gray-50">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="w-3 h-3 rounded-full" 
                                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                  ></div>
                                  <span className="font-medium">{empresa.nombre}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <span className="font-semibold">
                                    {estadoUsuarioSeleccionado === 'inactivo' 
                                      ? (empresa.usuarios_totales - empresa.usuarios_activos)
                                      : estadoUsuarioSeleccionado === 'todos'
                                      ? empresa.usuarios_totales
                                      : empresa.usuarios_activos
                                    }
                                  </span>
                                  <FaUser className="text-gray-500" style={{ fontSize: '10px' }} />
                                </div>
                              </td>
                              <td className="px-4 py-3 text-center font-medium">{empresa.porcentaje}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
                
                {/* Grafica a la derecha */}
                <div className="w-1/2">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={empresasStats.map(empresa => ({
                          ...empresa,
                          valor_filtrado: estadoUsuarioSeleccionado === 'inactivo' 
                            ? (empresa.usuarios_totales - empresa.usuarios_activos)
                            : estadoUsuarioSeleccionado === 'todos'
                            ? empresa.usuarios_totales
                            : empresa.usuarios_activos
                        }))}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={false}
                        outerRadius={120}
                        fill="#8884d8"
                        dataKey="valor_filtrado"
                        nameKey="nombre"
                      >
                        {empresasStats.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any, name: any, props: any) => [
                        `${value} usuarios ${estadoUsuarioSeleccionado === 'inactivo' ? 'inactivos' : estadoUsuarioSeleccionado === 'todos' ? 'totales' : 'activos'} (${props.payload.porcentaje}%)`,
                        props.payload.nombre
                      ]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        )}
        
        {/* 2. Grafico de genero - Barras horizontales */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FaUsers className="h-5 w-5" />
              Distribucion por Genero
            </CardTitle>
            <CardDescription>
              Cantidad de usuarios activos por genero con porcentajes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="w-full space-y-4">
                    <div className="flex justify-around">
                      <div className="text-center space-y-2">
                        <Skeleton className="h-32 w-24 mx-auto" />
                        <Skeleton className="h-4 w-16 mx-auto" />
                      </div>
                      <div className="text-center space-y-2">
                        <Skeleton className="h-40 w-24 mx-auto" />
                        <Skeleton className="h-4 w-20 mx-auto" />
                      </div>
                    </div>
                    <div className="flex justify-center space-x-8">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  </div>
                </div>
              ) : generoStats.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-500">No hay datos de genero disponibles</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                   <BarChart 
                     data={generoStats} 
                     margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                   >
                     <CartesianGrid strokeDasharray="3 3" />
                     <XAxis 
                       dataKey="genero" 
                       tick={{ fontSize: 12 }}
                       angle={-45}
                       textAnchor="end"
                       height={30}
                     />
                     <YAxis 
                       domain={[0, 'dataMax + 10']}
                       tickFormatter={(value) => value.toString()}
                     />
                     <Tooltip formatter={(value: any, name: any, props: any) => [
                       `${value} personas (${props.payload.porcentaje}%)`
                     ]} />
                     <Bar 
                       dataKey="cantidad" 
                       radius={[4, 4, 0, 0]}
                     >
                       {generoStats.map((entry, index) => (
                         <Cell 
                           key={`cell-${index}`} 
                           fill={entry.genero === 'Mujeres' ? '#ec4899' : '#8b5cf6'} 
                         />
                       ))}
                     </Bar>
                   </BarChart>
                 </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Fila 2: Distribucion por Cargos y Analisis de Retiros */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Grafico de cargos - Tabla y Pie chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FaBriefcase className="h-5 w-5" />
              Distribucion por Cargos
            </CardTitle>
            <CardDescription>
              Cantidad de usuarios activos y porcentaje por cargo
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex gap-6 h-80">
                <div className="w-1/2">
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-3 border-b">
                      <Skeleton className="h-4 w-32" />
                    </div>
                    <div className="max-h-64 overflow-y-auto p-4 space-y-3">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Skeleton className="w-3 h-3 rounded-full" />
                            <Skeleton className="h-4 w-24" />
                          </div>
                          <Skeleton className="h-4 w-8" />
                          <Skeleton className="h-4 w-8" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="w-1/2 flex items-center justify-center">
                  <Skeleton className="h-48 w-48 rounded-full" />
                </div>
              </div>
            ) : (
            <div className="flex gap-6 h-80">
              {/* Tabla a la izquierda */}
              <div className="w-1/2">
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 border-b">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-sm text-gray-700">Cargos y Usuarios</h3>
                      <div className="relative">
                        <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs" />
                        <Input
                          type="text"
                          placeholder="Buscar cargo..."
                          value={searchCargo}
                          onChange={(e) => setSearchCargo(e.target.value)}
                          className="pl-8 h-8 w-40 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    <table className="w-full text-sm">
                      <tbody>
                        {filteredCargosStats.map((cargo, index) => (
                          <tr key={cargo.id} className="border-b hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-3 h-3 rounded-full" 
                                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                ></div>
                                <span className="font-medium">{cargo.nombre}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <span className="font-semibold">{cargo.cantidad}</span>
                                <FaUser className="text-gray-500" style={{ fontSize: '10px' }} />
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center font-medium">{cargo.porcentaje}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              
              {/* Grafica a la derecha */}
              <div className="w-1/2">
                {filteredCargosStats.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-500 text-sm">
                      {searchCargo ? 'No se encontraron cargos que coincidan con la busqueda' : 'No hay datos de cargos disponibles'}
                    </p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={filteredCargosStats.slice(0, 10)}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={false}
                        outerRadius={120}
                        fill="#8884d8"
                        dataKey="cantidad"
                        nameKey="nombre"
                      >
                        {filteredCargosStats.slice(0, 10).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any, name: any, props: any) => [
                        `${value} usuarios (${props.payload.porcentaje}%)`
                      ]} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
            )}
          </CardContent>
        </Card>
        
        {/* Analisis de Retiros */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FaChartLine className="h-5 w-5" />
              Analisis de Retiros
            </CardTitle>
            <CardDescription>
              Motivos de retiro y cantidad de casos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="w-full space-y-4">
                    <div className="flex justify-around">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="text-center space-y-2">
                          <Skeleton className="h-24 w-16 mx-auto" />
                          <Skeleton className="h-3 w-12 mx-auto" />
                        </div>
                      ))}
                    </div>
                    <Skeleton className="h-8 w-full" />
                  </div>
                </div>
              ) : retirosStats.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-500">No hay datos de retiros disponibles</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={retirosStats.slice(0, 8)}
                    margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="motivo" 
                      tick={{ fontSize: 10 }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      interval={0}
                    />
                    <YAxis 
                      domain={[0, 'dataMax + 2']}
                      tickFormatter={(value) => value.toString()}
                    />
                    <Tooltip 
                      formatter={(value: any) => [
                        `${value} casos`
                      ]}
                    />
                    <Bar 
                      dataKey="cantidad" 
                      fill="#8884d8"
                      radius={[4, 4, 0, 0]}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Fila 3: Colaboradores por Sedes - Ancho completo */}
      <div className="mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FaMapMarkerAlt className="h-5 w-5" />
              Colaboradores por Sedes
            </CardTitle>
            <CardDescription>
              Distribucion de usuarios por ubicacion geografica
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="w-full space-y-4">
                    <div className="flex justify-around">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="text-center space-y-2">
                          <Skeleton className="h-32 w-12 mx-auto" />
                          <Skeleton className="h-3 w-16 mx-auto" />
                        </div>
                      ))}
                    </div>
                    <Skeleton className="h-8 w-full" />
                  </div>
                </div>
              ) : sedesStats.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-500">No hay datos de sedes disponibles</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={sedesStats} 
                    margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="nombre" 
                      tick={{ fontSize: 12 }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      interval={0}
                    />
                    <YAxis 
                      domain={[0, 'dataMax + 10']}
                      tickFormatter={(value) => value.toString()}
                    />
                    <Tooltip formatter={(value: any) => [
                      `${value} usuarios`
                    ]} />
                    <Bar 
                      dataKey="cantidad" 
                      radius={[4, 4, 0, 0]}
                    >
                      {sedesStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Fila 4: Seccion de Recursos Humanos - 4 graficos en fila */}
      <div className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* EPS */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <FaHeartbeat className="h-4 w-4 text-red-500" />
                EPS
              </CardTitle>
              <CardDescription className="text-xs">
                Entidades Promotoras de Salud
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                {isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Skeleton className="h-32 w-32 rounded-full" />
                  </div>
                ) : epsStats.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-500 text-sm">Sin datos</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={epsStats.slice(0, 5)}
                        cx="50%"
                        cy="50%"
                        innerRadius={20}
                        outerRadius={60}
                        paddingAngle={2}
                        dataKey="cantidad"
                      >
                        {epsStats.slice(0, 5).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any, name: any, props: any) => [
                        `${value} usuarios (${props.payload.porcentaje}%)`
                      ]} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="mt-2">
                <div className="text-center">
                  <span className="text-2xl font-bold text-red-600">
                    {epsStats.reduce((sum, eps) => sum + eps.cantidad, 0)}
                  </span>
                  <p className="text-xs text-gray-500">Total afiliados</p>
                </div>
                {/* Leyenda */}
                {epsStats.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {epsStats.slice(0, 5).map((item, index) => (
                      <div key={item.id} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          ></div>
                          <span className="truncate" title={item.nombre}>
                            {item.nombre.length > 12 ? `${item.nombre.substring(0, 12)}...` : item.nombre}
                          </span>
                        </div>
                        <span className="font-medium">{item.cantidad}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          {/* AFP */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <FaShieldAlt className="h-4 w-4 text-blue-500" />
                AFP
              </CardTitle>
              <CardDescription className="text-xs">
                Administradoras de Fondos de Pensiones
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                {isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Skeleton className="h-32 w-32 rounded-full" />
                  </div>
                ) : afpStats.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-500 text-sm">Sin datos</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={afpStats.slice(0, 5)}
                        cx="50%"
                        cy="50%"
                        innerRadius={20}
                        outerRadius={60}
                        paddingAngle={2}
                        dataKey="cantidad"
                      >
                        {afpStats.slice(0, 5).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any, name: any, props: any) => [
                        `${value} usuarios (${props.payload.porcentaje}%)`
                      ]} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="mt-2">
                <div className="text-center">
                  <span className="text-2xl font-bold text-green-600">
                    {afpStats.reduce((sum, afp) => sum + afp.cantidad, 0)}
                  </span>
                  <p className="text-xs text-gray-500">Total afiliados</p>
                </div>
                {/* Leyenda */}
                {afpStats.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {afpStats.slice(0, 5).map((item, index) => (
                      <div key={item.id} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          ></div>
                          <span className="truncate" title={item.nombre}>
                            {item.nombre.length > 12 ? `${item.nombre.substring(0, 12)}...` : item.nombre}
                          </span>
                        </div>
                        <span className="font-medium">{item.cantidad}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          {/* Cesantias */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <FaShieldAlt className="h-4 w-4 text-purple-500" />
                Cesantias
              </CardTitle>
              <CardDescription className="text-xs">
                Fondos de Cesantias
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                {isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Skeleton className="h-32 w-32 rounded-full" />
                  </div>
                ) : cesantiasStats.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-500 text-sm">Sin datos</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={cesantiasStats.slice(0, 5)}
                        cx="50%"
                        cy="50%"
                        innerRadius={20}
                        outerRadius={60}
                        paddingAngle={2}
                        dataKey="cantidad"
                      >
                        {cesantiasStats.slice(0, 5).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any, name: any, props: any) => [
                        `${value} usuarios (${props.payload.porcentaje}%)`
                      ]} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="mt-2">
                <div className="text-center">
                  <span className="text-2xl font-bold text-purple-600">
                    {cesantiasStats.reduce((sum, cesantias) => sum + cesantias.cantidad, 0)}
                  </span>
                  <p className="text-xs text-gray-500">Total afiliados</p>
                </div>
                {/* Leyenda */}
                {cesantiasStats.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {cesantiasStats.slice(0, 5).map((item, index) => (
                      <div key={item.id} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          ></div>
                          <span className="truncate" title={item.nombre}>
                            {item.nombre.length > 12 ? `${item.nombre.substring(0, 12)}...` : item.nombre}
                          </span>
                        </div>
                        <span className="font-medium">{item.cantidad}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          {/* Caja de Compensacion */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <FaHandHoldingUsd className="h-4 w-4 text-orange-500" />
                Caja Compensacion
              </CardTitle>
              <CardDescription className="text-xs">
                Cajas de Compensacion Familiar
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                {isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Skeleton className="h-32 w-32 rounded-full" />
                  </div>
                ) : cajaCompensacionStats.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-500 text-sm">Sin datos</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={cajaCompensacionStats.slice(0, 5)}
                        cx="50%"
                        cy="50%"
                        innerRadius={20}
                        outerRadius={60}
                        paddingAngle={2}
                        dataKey="cantidad"
                      >
                        {cajaCompensacionStats.slice(0, 5).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any, name: any, props: any) => [
                        `${value} usuarios (${props.payload.porcentaje}%)`
                      ]} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="mt-2">
                <div className="text-center">
                  <span className="text-2xl font-bold text-orange-600">
                    {cajaCompensacionStats.reduce((sum, caja) => sum + caja.cantidad, 0)}
                  </span>
                  <p className="text-xs text-gray-500">Total afiliados</p>
                </div>
                {/* Leyenda */}
                {cajaCompensacionStats.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {cajaCompensacionStats.slice(0, 5).map((item, index) => (
                      <div key={item.id} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          ></div>
                          <span className="truncate" title={item.nombre}>
                            {item.nombre.length > 12 ? `${item.nombre.substring(0, 12)}...` : item.nombre}
                          </span>
                        </div>
                        <span className="font-medium">{item.cantidad}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Gráficos generales */}
      <div className="mt-8">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Gráficos generales</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico de Otros Cargos */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FaBriefcase className="h-5 w-5 text-blue-500" />
                Comercial
              </CardTitle>
              <CardDescription>
                Cargos no incluidos en categorías específicas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                {isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Skeleton className="h-full w-full" />
                  </div>
                ) : (() => {
                  // Definir todos los cargos que están en categorías específicas
                  const cargosEspecificos = [
                    // Centro de Servicios y Repuestos
                    'JEFE DE CENTRO DE SERVICIO', 'TÉCNICO DE MOTOS', 'LAVADOR DE MOTOS',
                    'ANALISTA DE GARANTÍAS', 'AUXILIAR SERVICIO AL CLIENTE', 'EJECUTIVO CENTRO DE SERVICIO Y RECAUDO',
                    // Crédito y Cartera
                    'GESTOR DE CONTACT CENTER', 'GESTOR DE RECAUDO EXTERNO', 'DEPENDIENTE JUDICIAL',
                    'FRONT', 'BACKUP CRM', 'ANALISTA DE CRÉDITO',
                    // Logística
                    'COORDINADOR LOGÍSTICO', 'CONDUCTOR', 'COMPRADOR JUNIOR',
                    'AUXILIAR DE BODEGA', 'BODEGUERO/MENSAJERO', 'LÍDER DE BODEGA', 'ANALISTA LOGÍSTICO ELECTRO',
                    // Administrativos
                    'SUPERNUMERARIO', 'TESORERÍA', 'AUXILIAR TESORERÍA', 'CONTADOR',
                    'AUXILIAR CONTABLE', 'AUXILIAR DE ARCHIVO', 'AUXILIAR DE RECEPCIÓN',
                    'AUXILIAR SERVICIOS GENERALES', 'SERVICIOS GENERALES', 'CAMARERA/RECEPCIONISTA',
                    'AUXILIAR ADMINISTRATIVO', 'COORDINADOR GESTIÓN DOCUMENTAL', 'AUXILIAR CONTRATACIÓN',
                    'ANALISTA DE NÓMINA', 'DIRECTOR TALENTO HUMANO', 'PSICÓLOGA DE SELECCIÓN Y BIENESTAR',
                    'COORDINADOR SEGURIDAD Y SALUD EN EL TRABAJO', 'AUXILIAR DE SOPORTE',
                    'CONTROL INTERNO', 'AUXILIAR CONTROL INTERNO', 'DIRECTOR CONTROL INTERNO', 'LÍDER TICS',
                    // Agencia BDATAM
                    'GERENTE AGENCIA BDATAM', 'DISEÑADOR WEB', 'DISEÑADOR GRÁFICO',
                    'COMMUNITY MANAGER', 'PRODUCTOR MULTIMEDIA', 'DESARROLLADOR DE APLICACIONES',
                    // SENA
                    'APRENDIZ SENA ETAPA PRODUCTIVA', 'APRENDIZ SENA ETAPA LECTIVA'
                  ]
                  
                  const otrosCargos = cargosStats.filter(cargo => 
                    !cargosEspecificos.includes(cargo.nombre.toUpperCase())
                  ).slice(0, 10)
                  
                  return otrosCargos.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-gray-500">Sin datos disponibles</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={otrosCargos}
                        margin={{
                          top: 20,
                          right: 30,
                          left: 20,
                          bottom: 60,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="nombre" 
                          angle={-45}
                          textAnchor="end"
                          height={80}
                          fontSize={12}
                          interval={0}
                        />
                        <YAxis fontSize={12} />
                        <Tooltip 
                          formatter={(value: any, name: any, props: any) => [
                            `${value} usuarios (${props.payload.porcentaje}%)`,
                            'Cantidad'
                          ]}
                          labelFormatter={(label) => `Cargo: ${label}`}
                        />
                        <Bar 
                          dataKey="cantidad" 
                          fill="#3B82F6"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  )
                })()}
              </div>
              {(() => {
                const cargosEspecificos = [
                  'JEFE DE CENTRO DE SERVICIO', 'TÉCNICO DE MOTOS', 'LAVADOR DE MOTOS',
                  'ANALISTA DE GARANTÍAS', 'AUXILIAR SERVICIO AL CLIENTE', 'EJECUTIVO CENTRO DE SERVICIO Y RECAUDO',
                  'GESTOR DE CONTACT CENTER', 'GESTOR DE RECAUDO EXTERNO', 'DEPENDIENTE JUDICIAL',
                  'FRONT', 'BACKUP CRM', 'ANALISTA DE CRÉDITO',
                  'COORDINADOR LOGÍSTICO', 'CONDUCTOR', 'COMPRADOR JUNIOR',
                  'AUXILIAR DE BODEGA', 'BODEGUERO/MENSAJERO', 'LÍDER DE BODEGA', 'ANALISTA LOGÍSTICO ELECTRO',
                  'SUPERNUMERARIO', 'TESORERÍA', 'AUXILIAR TESORERÍA', 'CONTADOR',
                  'AUXILIAR CONTABLE', 'AUXILIAR DE ARCHIVO', 'AUXILIAR DE RECEPCIÓN',
                  'AUXILIAR SERVICIOS GENERALES', 'SERVICIOS GENERALES', 'CAMARERA/RECEPCIONISTA',
                  'AUXILIAR ADMINISTRATIVO', 'COORDINADOR GESTIÓN DOCUMENTAL', 'AUXILIAR CONTRATACIÓN',
                  'ANALISTA DE NÓMINA', 'DIRECTOR TALENTO HUMANO', 'PSICÓLOGA DE SELECCIÓN Y BIENESTAR',
                  'COORDINADOR SEGURIDAD Y SALUD EN EL TRABAJO', 'AUXILIAR DE SOPORTE',
                  'CONTROL INTERNO', 'AUXILIAR CONTROL INTERNO', 'DIRECTOR CONTROL INTERNO', 'LÍDER TICS',
                  'GERENTE AGENCIA BDATAM', 'DISEÑADOR WEB', 'DISEÑADOR GRÁFICO',
                  'COMMUNITY MANAGER', 'PRODUCTOR MULTIMEDIA', 'DESARROLLADOR DE APLICACIONES',
                  'APRENDIZ SENA ETAPA PRODUCTIVA', 'APRENDIZ SENA ETAPA LECTIVA'
                ]
                
                const otrosCargos = cargosStats.filter(cargo => 
                  !cargosEspecificos.includes(cargo.nombre.toUpperCase())
                ).slice(0, 10)
                
                return otrosCargos.length > 0 && (
                  <div className="mt-4 text-center">
                    <span className="text-2xl font-bold text-blue-600">
                      {otrosCargos.reduce((sum, cargo) => sum + cargo.cantidad, 0)}
                    </span>
                    <p className="text-sm text-gray-500">Total usuarios</p>
                  </div>
                )
              })()}
            </CardContent>
          </Card>
          
          {/* Gráfico de Centro de Servicios y Repuestos */}
           <Card className="lg:col-span-1">
             <CardHeader>
               <CardTitle className="flex items-center gap-2">
                 <FaBriefcase className="h-5 w-5 text-green-500" />
                 Centro de Servicios y Repuestos
               </CardTitle>
               <CardDescription>
                 Distribución de usuarios en el área de servicios
               </CardDescription>
             </CardHeader>
             <CardContent>
               <div className="h-80">
                 {isLoading ? (
                   <div className="flex items-center justify-center h-full">
                     <Skeleton className="h-full w-full" />
                   </div>
                 ) : (() => {
                   const cargosServicio = cargosStats.filter(cargo => 
                     ['JEFE DE CENTRO DE SERVICIO', 'TÉCNICO DE MOTOS', 'LAVADOR DE MOTOS', 
                      'ANALISTA DE GARANTÍAS', 'AUXILIAR SERVICIO AL CLIENTE', 
                      'EJECUTIVO CENTRO DE SERVICIO Y RECAUDO'].includes(cargo.nombre.toUpperCase())
                   )
                   
                   return cargosServicio.length === 0 ? (
                     <div className="flex items-center justify-center h-full">
                       <p className="text-gray-500">Sin datos disponibles</p>
                     </div>
                   ) : (
                     <ResponsiveContainer width="100%" height="100%">
                       <BarChart
                         data={cargosServicio}
                         margin={{
                           top: 20,
                           right: 30,
                           left: 20,
                           bottom: 60,
                         }}
                       >
                         <CartesianGrid strokeDasharray="3 3" />
                         <XAxis 
                           dataKey="nombre" 
                           angle={-45}
                           textAnchor="end"
                           height={80}
                           fontSize={12}
                           interval={0}
                         />
                         <YAxis fontSize={12} />
                         <Tooltip 
                           formatter={(value: any, name: any, props: any) => [
                             `${value} usuarios (${props.payload.porcentaje}%)`,
                             'Cantidad'
                           ]}
                           labelFormatter={(label) => `Cargo: ${label}`}
                         />
                         <Bar 
                           dataKey="cantidad" 
                           fill="#10B981"
                           radius={[4, 4, 0, 0]}
                         />
                       </BarChart>
                     </ResponsiveContainer>
                   )
                 })()}
               </div>
               {(() => {
                 const cargosServicio = cargosStats.filter(cargo => 
                   ['JEFE DE CENTRO DE SERVICIO', 'TÉCNICO DE MOTOS', 'LAVADOR DE MOTOS', 
                    'ANALISTA DE GARANTÍAS', 'AUXILIAR SERVICIO AL CLIENTE', 
                    'EJECUTIVO CENTRO DE SERVICIO Y RECAUDO'].includes(cargo.nombre.toUpperCase())
                 )
                 
                 return cargosServicio.length > 0 && (
                   <div className="mt-4 text-center">
                     <span className="text-2xl font-bold text-green-600">
                       {cargosServicio.reduce((sum, cargo) => sum + cargo.cantidad, 0)}
                     </span>
                     <p className="text-sm text-gray-500">Total usuarios</p>
                   </div>
                 )
               })()}
             </CardContent>
           </Card>
        </div>
         
         {/* Segunda fila de gráficos */}
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
           {/* Gráfico de Crédito y Cartera */}
           <Card>
             <CardHeader>
               <CardTitle className="flex items-center gap-2">
                 <FaChartLine className="h-5 w-5 text-purple-500" />
                 Crédito y Cartera
               </CardTitle>
               <CardDescription>
                 Distribución de usuarios en crédito y cartera
               </CardDescription>
             </CardHeader>
             <CardContent>
               <div className="h-80">
                 {isLoading ? (
                   <div className="flex items-center justify-center h-full">
                     <Skeleton className="h-full w-full" />
                   </div>
                 ) : (() => {
                   const cargosCredito = cargosStats.filter(cargo => 
                     ['GESTOR DE CONTACT CENTER', 'GESTOR DE RECAUDO EXTERNO', 'DEPENDIENTE JUDICIAL', 
                      'FRONT', 'BACKUP CRM', 'ANALISTA DE CRÉDITO'].includes(cargo.nombre.toUpperCase())
                   )
                   
                   return cargosCredito.length === 0 ? (
                     <div className="flex items-center justify-center h-full">
                       <p className="text-gray-500">Sin datos disponibles</p>
                     </div>
                   ) : (
                     <ResponsiveContainer width="100%" height="100%">
                       <BarChart
                         data={cargosCredito}
                         margin={{
                           top: 20,
                           right: 30,
                           left: 20,
                           bottom: 60,
                         }}
                       >
                         <CartesianGrid strokeDasharray="3 3" />
                         <XAxis 
                           dataKey="nombre" 
                           angle={-45}
                           textAnchor="end"
                           height={80}
                           fontSize={12}
                           interval={0}
                         />
                         <YAxis fontSize={12} />
                         <Tooltip 
                           formatter={(value: any, name: any, props: any) => [
                             `${value} usuarios (${props.payload.porcentaje}%)`,
                             'Cantidad'
                           ]}
                           labelFormatter={(label) => `Cargo: ${label}`}
                         />
                         <Bar 
                           dataKey="cantidad" 
                           fill="#8B5CF6"
                           radius={[4, 4, 0, 0]}
                         />
                       </BarChart>
                     </ResponsiveContainer>
                   )
                 })()}
               </div>
               {(() => {
                 const cargosCredito = cargosStats.filter(cargo => 
                   ['GESTOR DE CONTACT CENTER', 'GESTOR DE RECAUDO EXTERNO', 'DEPENDIENTE JUDICIAL', 
                    'FRONT', 'BACKUP CRM', 'ANALISTA DE CRÉDITO'].includes(cargo.nombre.toUpperCase())
                 )
                 
                 return cargosCredito.length > 0 && (
                   <div className="mt-4 text-center">
                     <span className="text-2xl font-bold text-purple-600">
                       {cargosCredito.reduce((sum, cargo) => sum + cargo.cantidad, 0)}
                     </span>
                     <p className="text-sm text-gray-500">Total usuarios</p>
                   </div>
                 )
               })()}
             </CardContent>
           </Card>
           
           {/* Gráfico de Personal Logística */}
           <Card>
             <CardHeader>
               <CardTitle className="flex items-center gap-2">
                 <FaMapMarkerAlt className="h-5 w-5 text-orange-500" />
                 Personal Logística
               </CardTitle>
               <CardDescription>
                 Distribución de usuarios en logística
               </CardDescription>
             </CardHeader>
             <CardContent>
               <div className="h-80">
                 {isLoading ? (
                   <div className="flex items-center justify-center h-full">
                     <Skeleton className="h-full w-full" />
                   </div>
                 ) : (() => {
                   const cargosLogistica = cargosStats.filter(cargo => 
                     ['COORDINADOR LOGÍSTICO', 'CONDUCTOR', 'COMPRADOR JUNIOR', 
                      'AUXILIAR DE BODEGA', 'BODEGUERO/MENSAJERO', 'LÍDER DE BODEGA', 
                      'ANALISTA LOGÍSTICO ELECTRO'].includes(cargo.nombre.toUpperCase())
                   )
                   
                   return cargosLogistica.length === 0 ? (
                     <div className="flex items-center justify-center h-full">
                       <p className="text-gray-500">Sin datos disponibles</p>
                     </div>
                   ) : (
                     <ResponsiveContainer width="100%" height="100%">
                       <BarChart
                         data={cargosLogistica}
                         margin={{
                           top: 20,
                           right: 30,
                           left: 20,
                           bottom: 60,
                         }}
                       >
                         <CartesianGrid strokeDasharray="3 3" />
                         <XAxis 
                           dataKey="nombre" 
                           angle={-45}
                           textAnchor="end"
                           height={80}
                           fontSize={12}
                           interval={0}
                         />
                         <YAxis fontSize={12} />
                         <Tooltip 
                           formatter={(value: any, name: any, props: any) => [
                             `${value} usuarios (${props.payload.porcentaje}%)`,
                             'Cantidad'
                           ]}
                           labelFormatter={(label) => `Cargo: ${label}`}
                         />
                         <Bar 
                           dataKey="cantidad" 
                           fill="#F97316"
                           radius={[4, 4, 0, 0]}
                         />
                       </BarChart>
                     </ResponsiveContainer>
                   )
                 })()}
               </div>
               {(() => {
                 const cargosLogistica = cargosStats.filter(cargo => 
                   ['COORDINADOR LOGÍSTICO', 'CONDUCTOR', 'COMPRADOR JUNIOR', 
                    'AUXILIAR DE BODEGA', 'BODEGUERO/MENSAJERO', 'LÍDER DE BODEGA', 
                    'ANALISTA LOGÍSTICO ELECTRO'].includes(cargo.nombre.toUpperCase())
                 )
                 
                 return cargosLogistica.length > 0 && (
                   <div className="mt-4 text-center">
                     <span className="text-2xl font-bold text-orange-600">
                       {cargosLogistica.reduce((sum, cargo) => sum + cargo.cantidad, 0)}
                     </span>
                     <p className="text-sm text-gray-500">Total usuarios</p>
                   </div>
                 )
               })()}
             </CardContent>
           </Card>
           
           {/* Gráfico de Administrativos */}
           <Card>
             <CardHeader>
               <CardTitle className="flex items-center gap-2">
                 <FaUser className="h-5 w-5 text-red-500" />
                 Administrativos
               </CardTitle>
               <CardDescription>
                 Distribución de usuarios administrativos
               </CardDescription>
             </CardHeader>
             <CardContent>
               <div className="h-80">
                 {isLoading ? (
                   <div className="flex items-center justify-center h-full">
                     <Skeleton className="h-full w-full" />
                   </div>
                 ) : (() => {
                   const cargosAdmin = cargosStats.filter(cargo => 
                     ['SUPERNUMERARIO', 'TESORERÍA', 'AUXILIAR TESORERÍA', 'CONTADOR', 
                      'AUXILIAR CONTABLE', 'AUXILIAR DE ARCHIVO', 'AUXILIAR DE RECEPCIÓN', 
                      'AUXILIAR SERVICIOS GENERALES', 'SERVICIOS GENERALES', 'CAMARERA/RECEPCIONISTA', 
                      'AUXILIAR ADMINISTRATIVO', 'COORDINADOR GESTIÓN DOCUMENTAL', 'AUXILIAR CONTRATACIÓN', 
                      'ANALISTA DE NÓMINA', 'DIRECTOR TALENTO HUMANO', 'PSICÓLOGA DE SELECCIÓN Y BIENESTAR', 
                      'COORDINADOR SEGURIDAD Y SALUD EN EL TRABAJO', 'AUXILIAR DE SOPORTE', 
                      'CONTROL INTERNO', 'AUXILIAR CONTROL INTERNO', 'DIRECTOR CONTROL INTERNO', 
                      'LÍDER TICS'].includes(cargo.nombre.toUpperCase())
                   )
                   
                   return cargosAdmin.length === 0 ? (
                     <div className="flex items-center justify-center h-full">
                       <p className="text-gray-500">Sin datos disponibles</p>
                     </div>
                   ) : (
                     <ResponsiveContainer width="100%" height="100%">
                       <BarChart
                         data={cargosAdmin.slice(0, 10)}
                         margin={{
                           top: 20,
                           right: 30,
                           left: 20,
                           bottom: 60,
                         }}
                       >
                         <CartesianGrid strokeDasharray="3 3" />
                         <XAxis 
                           dataKey="nombre" 
                           angle={-45}
                           textAnchor="end"
                           height={80}
                           fontSize={12}
                           interval={0}
                         />
                         <YAxis fontSize={12} />
                         <Tooltip 
                           formatter={(value: any, name: any, props: any) => [
                             `${value} usuarios (${props.payload.porcentaje}%)`,
                             'Cantidad'
                           ]}
                           labelFormatter={(label) => `Cargo: ${label}`}
                         />
                         <Bar 
                           dataKey="cantidad" 
                           fill="#EF4444"
                           radius={[4, 4, 0, 0]}
                         />
                       </BarChart>
                     </ResponsiveContainer>
                   )
                 })()}
               </div>
               {(() => {
                 const cargosAdmin = cargosStats.filter(cargo => 
                   ['SUPERNUMERARIO', 'TESORERÍA', 'AUXILIAR TESORERÍA', 'CONTADOR', 
                    'AUXILIAR CONTABLE', 'AUXILIAR DE ARCHIVO', 'AUXILIAR DE RECEPCIÓN', 
                    'AUXILIAR SERVICIOS GENERALES', 'SERVICIOS GENERALES', 'CAMARERA/RECEPCIONISTA', 
                    'AUXILIAR ADMINISTRATIVO', 'COORDINADOR GESTIÓN DOCUMENTAL', 'AUXILIAR CONTRATACIÓN', 
                    'ANALISTA DE NÓMINA', 'DIRECTOR TALENTO HUMANO', 'PSICÓLOGA DE SELECCIÓN Y BIENESTAR', 
                    'COORDINADOR SEGURIDAD Y SALUD EN EL TRABAJO', 'AUXILIAR DE SOPORTE', 
                    'CONTROL INTERNO', 'AUXILIAR CONTROL INTERNO', 'DIRECTOR CONTROL INTERNO', 
                    'LÍDER TICS'].includes(cargo.nombre.toUpperCase())
                 )
                 
                 return cargosAdmin.length > 0 && (
                   <div className="mt-4 text-center">
                     <span className="text-2xl font-bold text-red-600">
                       {cargosAdmin.reduce((sum, cargo) => sum + cargo.cantidad, 0)}
                     </span>
                     <p className="text-sm text-gray-500">Total usuarios</p>
                   </div>
                 )
               })()}
             </CardContent>
           </Card>
           {/* Gráfico de Agencia BDATAM */}
           <Card>
             <CardHeader>
               <CardTitle className="flex items-center gap-2">
                 <FaBuilding className="h-5 w-5 text-indigo-500" />
                 Agencia BDATAM
               </CardTitle>
               <CardDescription>
                 Distribución de usuarios en agencia BDATAM
               </CardDescription>
             </CardHeader>
             <CardContent>
               <div className="h-80">
                 {isLoading ? (
                   <div className="flex items-center justify-center h-full">
                     <Skeleton className="h-full w-full" />
                   </div>
                 ) : (() => {
                   const cargosBdatam = cargosStats.filter(cargo => 
                     ['GERENTE AGENCIA BDATAM', 'DISEÑADOR WEB', 'DISEÑADOR GRÁFICO', 
                      'COMMUNITY MANAGER', 'PRODUCTOR MULTIMEDIA', 'DESARROLLADOR DE APLICACIONES'].includes(cargo.nombre.toUpperCase())
                   )
                   
                   return cargosBdatam.length === 0 ? (
                     <div className="flex items-center justify-center h-full">
                       <p className="text-gray-500">Sin datos disponibles</p>
                     </div>
                   ) : (
                     <ResponsiveContainer width="100%" height="100%">
                       <BarChart
                         data={cargosBdatam}
                         margin={{
                           top: 20,
                           right: 30,
                           left: 20,
                           bottom: 60,
                         }}
                       >
                         <CartesianGrid strokeDasharray="3 3" />
                         <XAxis 
                           dataKey="nombre" 
                           angle={-45}
                           textAnchor="end"
                           height={80}
                           fontSize={12}
                           interval={0}
                         />
                         <YAxis fontSize={12} />
                         <Tooltip 
                           formatter={(value: any, name: any, props: any) => [
                             `${value} usuarios (${props.payload.porcentaje}%)`,
                             'Cantidad'
                           ]}
                           labelFormatter={(label) => `Cargo: ${label}`}
                         />
                         <Bar 
                           dataKey="cantidad" 
                           fill="#6366F1"
                           radius={[4, 4, 0, 0]}
                         />
                       </BarChart>
                     </ResponsiveContainer>
                   )
                 })()}
               </div>
               {(() => {
                 const cargosBdatam = cargosStats.filter(cargo => 
                   ['GERENTE AGENCIA BDATAM', 'DISEÑADOR WEB', 'DISEÑADOR GRÁFICO', 
                    'COMMUNITY MANAGER', 'PRODUCTOR MULTIMEDIA', 'DESARROLLADOR DE APLICACIONES'].includes(cargo.nombre.toUpperCase())
                 )
                 
                 return cargosBdatam.length > 0 && (
                   <div className="mt-4 text-center">
                     <span className="text-2xl font-bold text-indigo-600">
                       {cargosBdatam.reduce((sum, cargo) => sum + cargo.cantidad, 0)}
                     </span>
                     <p className="text-sm text-gray-500">Total usuarios</p>
                   </div>
                 )
               })()}
             </CardContent>
           </Card>
           
         </div>
         
         {/* Tercera fila de gráficos */}
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
           
           {/* Gráfico de SENA */}
           <Card>
             <CardHeader>
               <CardTitle className="flex items-center gap-2">
                 <FaUsers className="h-5 w-5 text-teal-500" />
                 SENA
               </CardTitle>
               <CardDescription>
                 Distribución de aprendices SENA
               </CardDescription>
             </CardHeader>
             <CardContent>
               <div className="h-80">
                 {isLoading ? (
                   <div className="flex items-center justify-center h-full">
                     <Skeleton className="h-full w-full" />
                   </div>
                 ) : (() => {
                   const cargosSena = cargosStats.filter(cargo => 
                     ['APRENDIZ SENA ETAPA PRODUCTIVA', 'APRENDIZ SENA ETAPA LECTIVA'].includes(cargo.nombre.toUpperCase())
                   )
                   
                   return cargosSena.length === 0 ? (
                     <div className="flex items-center justify-center h-full">
                       <p className="text-gray-500">Sin datos disponibles</p>
                     </div>
                   ) : (
                     <ResponsiveContainer width="100%" height="100%">
                       <BarChart
                         data={cargosSena}
                         margin={{
                           top: 20,
                           right: 30,
                           left: 20,
                           bottom: 60,
                         }}
                       >
                         <CartesianGrid strokeDasharray="3 3" />
                         <XAxis 
                           dataKey="nombre" 
                           angle={-45}
                           textAnchor="end"
                           height={80}
                           fontSize={12}
                           interval={0}
                         />
                         <YAxis fontSize={12} />
                         <Tooltip 
                           formatter={(value: any, name: any, props: any) => [
                             `${value} usuarios (${props.payload.porcentaje}%)`,
                             'Cantidad'
                           ]}
                           labelFormatter={(label) => `Cargo: ${label}`}
                         />
                         <Bar 
                           dataKey="cantidad" 
                           fill="#14B8A6"
                           radius={[4, 4, 0, 0]}
                         />
                       </BarChart>
                     </ResponsiveContainer>
                   )
                 })()}
               </div>
               {(() => {
                 const cargosSena = cargosStats.filter(cargo => 
                   ['APRENDIZ SENA ETAPA PRODUCTIVA', 'APRENDIZ SENA ETAPA LECTIVA'].includes(cargo.nombre.toUpperCase())
                 )
                 
                 return cargosSena.length > 0 && (
                   <div className="mt-4 text-center">
                     <span className="text-2xl font-bold text-teal-600">
                       {cargosSena.reduce((sum, cargo) => sum + cargo.cantidad, 0)}
                     </span>
                     <p className="text-sm text-gray-500">Total usuarios</p>
                   </div>
                 )
               })()}
             </CardContent>
           </Card>
         </div>
       </div>
     </div>
   )
 }