"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createSupabaseClient } from "@/lib/supabase"
import { FaUser, FaBuilding, FaUserCheck, FaUserTimes, FaUmbrellaBeach } from 'react-icons/fa';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, XCircle } from 'lucide-react';

export default function Administracion() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [solicitudesCertificacion, setSolicitudesCertificacion] = useState<any[]>([])
  const [solicitudesVacaciones, setSolicitudesVacaciones] = useState<any[]>([])
  const [solicitudesPermisos, setSolicitudesPermisos] = useState<any[]>([])
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    inactiveUsers: 0,
    vacationUsers: 0,
    totalCompanies: 0
  })
  const [notificacionesIncapacidades, setNotificacionesIncapacidades] = useState<any[]>([])

  // Función para cargar solicitudes de vacaciones (optimizada)
  const loadSolicitudesVacaciones = async () => {
    const supabase = createSupabaseClient()
    
    try {
      const { data: solicitudesVacacionesData } = await supabase
        .from('solicitudes_vacaciones')
        .select('id, usuario_id, estado, fecha_inicio, fecha_fin, fecha_solicitud')
        .eq('estado', 'pendiente')
        .order('fecha_solicitud', { ascending: false })
        .limit(5)

      if (!solicitudesVacacionesData || solicitudesVacacionesData.length === 0) {
        setSolicitudesVacaciones([])
        return
      }

      const vacacionesUserIds = solicitudesVacacionesData.map(s => s.usuario_id)
      const [{ data: vacacionesUsuariosData }, { data: cargosData }] = await Promise.all([
        supabase.from('usuario_nomina').select('auth_user_id, colaborador, cedula, cargo_id, empresa_id, empresas:empresa_id(nombre)').in('auth_user_id', vacacionesUserIds),
        supabase.from('cargos').select('id, nombre')
      ])

      const solicitudesVacacionesCompletas = solicitudesVacacionesData.map(s => {
        const usuario = vacacionesUsuariosData?.find(u => u.auth_user_id === s.usuario_id)
        const cargo = usuario?.cargo_id ? cargosData?.find(c => c.id === usuario.cargo_id) : null
        return {
          ...s,
          usuario: usuario ? {
            colaborador: String(usuario.colaborador || ''),
            cedula: String(usuario.cedula || ''),
            cargo: cargo ? String(cargo.nombre || 'N/A') : 'N/A',
            fecha_ingreso: null
          } : null
        }
      })
      setSolicitudesVacaciones(solicitudesVacacionesCompletas)
    } catch (error) {
      console.error('Error cargando solicitudes de vacaciones:', error)
      setSolicitudesVacaciones([])
    }
  }

  // Función para recargar estadísticas en tiempo real (optimizada)
  const loadStats = async () => {
    const supabase = createSupabaseClient()
    const today = new Date().toISOString().split('T')[0]
    
    try {
      // Ejecutar todas las consultas en paralelo para mejor rendimiento
      const [
        { data: users },
        { data: activeUsers },
        { data: inactiveUsers },
        { data: vacationRequests },
        { data: companies }
      ] = await Promise.all([
        supabase.from('usuario_nomina').select('auth_user_id').eq('rol', 'usuario'),
        supabase.from('usuario_nomina').select('auth_user_id').eq('rol', 'usuario').eq('estado', 'activo'),
        supabase.from('usuario_nomina').select('auth_user_id').eq('rol', 'usuario').eq('estado', 'inactivo'),
        supabase.from('solicitudes_vacaciones').select('usuario_id').eq('estado', 'aprobado').lte('fecha_inicio', today).gte('fecha_fin', today),
        supabase.from('empresas').select('id')
      ])
      
      // Obtener usuarios únicos en vacaciones
      const vacationUserIds = vacationRequests?.map(req => req.usuario_id) || []
      const uniqueVacationUserIds = [...new Set(vacationUserIds)]
      
      const { data: vacationUsers } = uniqueVacationUserIds.length > 0 ? await supabase
        .from('usuario_nomina')
        .select('auth_user_id')
        .eq('rol', 'usuario')
        .eq('estado', 'activo')
        .in('auth_user_id', uniqueVacationUserIds) : { data: [] }

      setStats({
        totalUsers: users?.length || 0,
        activeUsers: activeUsers?.length || 0,
        inactiveUsers: inactiveUsers?.length || 0,
        vacationUsers: vacationUsers?.length || 0,
        totalCompanies: companies?.length || 0
      })
    } catch (error) {
      console.error('Error cargando estadísticas:', error)
    }
  }

  useEffect(() => {
    let subscriptions: any[] = []
    
    const loadData = async () => {
      const supabase = createSupabaseClient()
      const today = new Date().toISOString().split('T')[0]

      try {
        // Ejecutar todas las consultas principales en paralelo para mejor rendimiento
        const [
          { data: users },
          { data: activeUsers },
          { data: inactiveUsers },
          { data: vacationRequests },
          { data: companies },
          { data: solicitudesCertificacionData },
          { data: solicitudesPermisosData },
          { data: incapacidadesData }
        ] = await Promise.all([
          supabase.from('usuario_nomina').select('auth_user_id').eq('rol', 'usuario'),
          supabase.from('usuario_nomina').select('auth_user_id').eq('rol', 'usuario').eq('estado', 'activo'),
          supabase.from('usuario_nomina').select('auth_user_id').eq('rol', 'usuario').eq('estado', 'inactivo'),
          supabase.from('solicitudes_vacaciones').select('usuario_id').eq('estado', 'aprobado').lte('fecha_inicio', today).gte('fecha_fin', today),
          supabase.from('empresas').select('id'),
          supabase.from('solicitudes_certificacion').select('*, usuario_nomina:usuario_id(colaborador, cedula)').eq('estado', 'pendiente').order('fecha_solicitud', { ascending: false }).limit(5),
          supabase.from('solicitudes_permisos').select('id, tipo_permiso, fecha_inicio, fecha_fin, hora_inicio, hora_fin, motivo, compensacion, estado, fecha_solicitud, fecha_resolucion, motivo_rechazo, pdf_url, usuario_id, admin_id').eq('estado', 'pendiente').order('fecha_solicitud', { ascending: false }).limit(5),
          supabase.from('incapacidades').select('id, fecha_inicio, fecha_fin, fecha_subida, usuario_id').order('fecha_subida', { ascending: false }).limit(5)
        ])

        // Cargar solicitudes de vacaciones en paralelo
        const vacacionesPromise = loadSolicitudesVacaciones()

        // Obtener usuarios únicos en vacaciones
        const vacationUserIds = vacationRequests?.map(req => req.usuario_id) || []
        const uniqueVacationUserIds = [...new Set(vacationUserIds)]
        
        const { data: vacationUsers } = uniqueVacationUserIds.length > 0 ? await supabase
          .from('usuario_nomina')
          .select('auth_user_id')
          .eq('rol', 'usuario')
          .eq('estado', 'activo')
          .in('auth_user_id', uniqueVacationUserIds) : { data: [] }

        // Procesar datos de permisos e incapacidades en paralelo
        const [solicitudesPermisosCompletas, incapacidadesCompletas] = await Promise.all([
          // Procesar solicitudes de permisos
          (async () => {
            if (!solicitudesPermisosData || solicitudesPermisosData.length === 0) return []
            
            const permisosUserIds = [...new Set(solicitudesPermisosData.map(s => s.usuario_id))]
            const [{ data: permisosUsuariosData }, { data: permisosCargosData }] = await Promise.all([
              supabase.from('usuario_nomina').select('auth_user_id, colaborador, cedula, cargo_id, empresa_id, empresas:empresa_id(nombre)').in('auth_user_id', permisosUserIds),
              supabase.from('cargos').select('id, nombre')
            ])

            return solicitudesPermisosData.map(s => {
              const usuario = permisosUsuariosData?.find(u => u.auth_user_id === s.usuario_id)
              const cargo = usuario?.cargo_id ? permisosCargosData?.find(c => c.id === usuario.cargo_id) : null
              return {
                ...s,
                usuario: usuario ? {
                  colaborador: String(usuario.colaborador || ''),
                  cedula: String(usuario.cedula || ''),
                  cargo: cargo ? String(cargo.nombre || 'N/A') : 'N/A',
                  fecha_ingreso: null,
                  empresa_id: Number(usuario.empresa_id || 0),
                  empresas: {
                    nombre: String((usuario.empresas as any)?.nombre || '')
                  }
                } : null
              }
            })
          })(),
          // Procesar incapacidades
          (async () => {
            if (!incapacidadesData || incapacidadesData.length === 0) return []
            
            const incapacidadesUserIds = [...new Set(incapacidadesData.map(i => i.usuario_id))]
            const [{ data: incapacidadesUsuariosData }, { data: incapacidadesCargosData }] = await Promise.all([
              supabase.from('usuario_nomina').select('auth_user_id, colaborador, cedula, cargo_id, empresa_id, empresas:empresa_id(nombre)').in('auth_user_id', incapacidadesUserIds),
              supabase.from('cargos').select('id, nombre')
            ])

            return incapacidadesData.map((i: any) => {
              const usuario = incapacidadesUsuariosData?.find(u => u.auth_user_id === i.usuario_id)
              const cargo = usuario?.cargo_id ? incapacidadesCargosData?.find(c => c.id === usuario.cargo_id) : null
              return {
                id: Number(i.id),
                fecha_inicio: String(i.fecha_inicio),
                fecha_fin: String(i.fecha_fin),
                fecha_subida: String(i.fecha_subida),
                usuario_id: String(i.usuario_id),
                usuario: usuario ? {
                  colaborador: String(usuario.colaborador || ''),
                  cedula: String(usuario.cedula || ''),
                  cargo: cargo ? String(cargo.nombre || 'N/A') : 'N/A',
                  fecha_ingreso: null,
                  empresa_id: Number(usuario.empresa_id || 0),
                  empresas: {
                    nombre: String((usuario.empresas as any)?.nombre || '')
                  }
                } : null
              }
            })
          })()
        ])

        // Esperar a que termine la carga de vacaciones
        await vacacionesPromise

        setStats({
          totalUsers: users?.length || 0,
          activeUsers: activeUsers?.length || 0,
          inactiveUsers: inactiveUsers?.length || 0,
          vacationUsers: vacationUsers?.length || 0,
          totalCompanies: companies?.length || 0
        })

        setNotificacionesIncapacidades(incapacidadesCompletas || [])
        setSolicitudesCertificacion(solicitudesCertificacionData || [])
        setSolicitudesPermisos(solicitudesPermisosCompletas || [])
        setLoading(false)
      } catch (error) {
        console.error('Error cargando datos del dashboard:', error)
        setLoading(false)
      }

      // Configurar subscripciones en tiempo real después de cargar datos iniciales
      console.log('Configurando suscripciones de tiempo real...')
      
      // Suscripción para cambios en usuarios (afecta estadísticas)
      const usuariosChannel = supabase
        .channel('admin_usuarios_realtime', {
          config: {
            broadcast: { self: true }
          }
        })
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'usuario_nomina'
          },
          async (payload) => {
            console.log('Cambio detectado en usuario_nomina:', payload)
            await loadStats()
          }
        )
        .subscribe((status) => {
          console.log('Estado suscripción usuarios:', status)
        })

      // Suscripción para cambios en empresas
      const empresasChannel = supabase
        .channel('admin_empresas_realtime', {
          config: {
            broadcast: { self: true }
          }
        })
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'empresas'
          },
          async (payload) => {
            console.log('Cambio detectado en empresas:', payload)
            await loadStats()
          }
        )
        .subscribe((status) => {
          console.log('Estado suscripción empresas:', status)
        })

      // Suscripción para cambios en solicitudes de vacaciones (todas)
      const vacacionesChannel = supabase
        .channel('admin_vacaciones_realtime', {
          config: {
            broadcast: { self: true }
          }
        })
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'solicitudes_vacaciones'
          },
          async (payload) => {
            console.log('Cambio detectado en solicitudes_vacaciones:', payload)
            // Recargar tanto las solicitudes pendientes como las estadísticas de usuarios en vacaciones
            await loadSolicitudesVacaciones()
            await loadStats()
          }
        )
        .subscribe((status) => {
          console.log('Estado suscripción vacaciones:', status)
        })

      // Suscripción para cambios en solicitudes de certificación
      const certificacionChannel = supabase
        .channel('admin_certificacion_realtime', {
          config: {
            broadcast: { self: true }
          }
        })
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'solicitudes_certificacion'
          },
          async (payload) => {
            console.log('Cambio detectado en solicitudes_certificacion:', payload)
            // Recargar solicitudes de certificación
            const { data: solicitudesCertificacionData } = await supabase
              .from('solicitudes_certificacion')
              .select(`
                *,
                usuario_nomina:usuario_id(colaborador, cedula)
              `)
              .eq('estado', 'pendiente')
              .order('fecha_solicitud', { ascending: false })
              .limit(5)
            setSolicitudesCertificacion(solicitudesCertificacionData || [])
          }
        )
        .subscribe((status) => {
          console.log('Estado suscripción certificación:', status)
        })

      // Suscripción para cambios en solicitudes de permisos
      const permisosChannel = supabase
        .channel('admin_permisos_realtime', {
          config: {
            broadcast: { self: true }
          }
        })
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'solicitudes_permisos'
          },
          async (payload) => {
            console.log('Cambio detectado en solicitudes_permisos:', payload)
            // Recargar solicitudes de permisos
            const { data: solicitudesPermisosData } = await supabase
              .from('solicitudes_permisos')
              .select(`
                id, tipo_permiso, fecha_inicio, fecha_fin, hora_inicio, hora_fin, 
                motivo, compensacion, estado, fecha_solicitud, fecha_resolucion, 
                motivo_rechazo, pdf_url, usuario_id, admin_id
              `)
              .eq('estado', 'pendiente')
              .order('fecha_solicitud', { ascending: false })
              .limit(5)

            if (solicitudesPermisosData && solicitudesPermisosData.length > 0) {
              const permisosUserIds = [...new Set(solicitudesPermisosData.map(s => s.usuario_id))]
              const { data: permisosUsuariosData } = await supabase
                .from('usuario_nomina')
                .select(`
                  auth_user_id,
                  colaborador,
                  cedula,
                  cargo_id,
                  empresa_id,
                  empresas:empresa_id(nombre)
                `)
                .in('auth_user_id', permisosUserIds)

              // Obtener información de cargos por separado
              const permisosCargoIds2 = permisosUsuariosData?.map(u => u.cargo_id).filter(Boolean) || []
              const { data: permisosCargosData2 } = permisosCargoIds2.length > 0 ? await supabase
                .from('cargos')
                .select('id, nombre')
                .in('id', permisosCargoIds2) : { data: [] }

              const solicitudesPermisosCompletas = solicitudesPermisosData.map(s => {
                const usuario = permisosUsuariosData?.find(u => u.auth_user_id === s.usuario_id)
                const cargo = usuario?.cargo_id ? permisosCargosData2?.find(c => c.id === usuario.cargo_id) : null
                return {
                  ...s,
                  usuario: usuario ? {
                    colaborador: String(usuario.colaborador || ''),
                    cedula: String(usuario.cedula || ''),
                    cargo: cargo ? String(cargo.nombre || 'N/A') : 'N/A',
                    fecha_ingreso: null,
                    empresa_id: Number(usuario.empresa_id || 0),
                    empresas: {
                      nombre: String((usuario.empresas as any)?.nombre || '')
                    }
                  } : null
                }
              })
              setSolicitudesPermisos(solicitudesPermisosCompletas)
            } else {
              setSolicitudesPermisos([])
            }
          }
        )
        .subscribe((status) => {
          console.log('Estado suscripción permisos:', status)
        })

      // Suscripción para cambios en incapacidades
      const incapacidadesChannel = supabase
        .channel('admin_incapacidades_realtime', {
          config: {
            broadcast: { self: true }
          }
        })
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'incapacidades'
          },
          async (payload) => {
            console.log('Cambio detectado en incapacidades:', payload)
            // Recargar incapacidades
            const { data: incapacidadesData } = await supabase
              .from('incapacidades')
              .select(`
                id,
                fecha_inicio,
                fecha_fin,
                fecha_subida,
                usuario_id
              `)
              .order('fecha_subida', { ascending: false })
              .limit(5)

            if (incapacidadesData && incapacidadesData.length > 0) {
              const incapacidadesUserIds = [...new Set(incapacidadesData.map(i => i.usuario_id))]
              const { data: incapacidadesUsuariosData } = await supabase
                .from('usuario_nomina')
                .select(`
                  auth_user_id,
                  colaborador,
                  cedula,
                  cargo_id,
                  empresa_id,
                  empresas:empresa_id(nombre)
                `)
                .in('auth_user_id', incapacidadesUserIds)

              // Obtener información de cargos por separado
              const incapacidadesCargoIds2 = incapacidadesUsuariosData?.map(u => u.cargo_id).filter(Boolean) || []
              const { data: incapacidadesCargosData2 } = incapacidadesCargoIds2.length > 0 ? await supabase
                .from('cargos')
                .select('id, nombre')
                .in('id', incapacidadesCargoIds2) : { data: [] }

              const incapacidadesCompletas = incapacidadesData.map(i => {
                const usuario = incapacidadesUsuariosData?.find(u => u.auth_user_id === i.usuario_id)
                const cargo = usuario?.cargo_id ? incapacidadesCargosData2?.find(c => c.id === usuario.cargo_id) : null
                return {
                  id: Number(i.id),
                  fecha_inicio: String(i.fecha_inicio),
                  fecha_fin: String(i.fecha_fin),
                  fecha_subida: String(i.fecha_subida),
                  usuario_id: String(i.usuario_id),
                  usuario: usuario ? {
                    colaborador: String(usuario.colaborador || ''),
                    cedula: String(usuario.cedula || ''),
                    cargo: cargo ? String(cargo.nombre || 'N/A') : 'N/A',
                    fecha_ingreso: null,
                    empresa_id: Number(usuario.empresa_id || 0),
                    empresas: {
                      nombre: String((usuario.empresas as any)?.nombre || '')
                    }
                  } : null
                }
              })
              setNotificacionesIncapacidades(incapacidadesCompletas)
            } else {
              setNotificacionesIncapacidades([])
            }
          }
        )
        .subscribe((status) => {
          console.log('Estado suscripción incapacidades:', status)
        })

      // Guardar referencias de los canales para cleanup
      subscriptions = [
        usuariosChannel,
        empresasChannel,
        vacacionesChannel,
        certificacionChannel,
        permisosChannel,
        incapacidadesChannel
      ]

      return () => {
        console.log('Limpiando suscripciones...')
        subscriptions.forEach(subscription => {
          if (subscription) {
            subscription.unsubscribe()
          }
        })
      }
    }

    loadData()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>

        {/* Skeleton para tarjetas informativas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="rounded-[10px]">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <Skeleton className="h-8 w-12 mb-1" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Skeleton para grid de solicitudes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-[10px] shadow-sm border border-gray-200 p-6 space-y-4">
              <div className="flex justify-between items-center">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-8 w-20" />
              </div>
              <div className="space-y-3">
                <div className="flex space-x-4">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                </div>
                {[...Array(3)].map((_, j) => (
                  <div key={j} className="flex space-x-4">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="py-6 space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Gestiona usuarios y configuración del sistema.</h2> 
      </div>

      {/* Tarjetas informativas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Usuarios Activos */}
        <Card className="rounded-[10px]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuarios Activos</CardTitle>
            <FaUserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{stats.activeUsers}</p>
                <p className="text-xs text-muted-foreground">Usuarios</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Usuarios Inactivos */}
        <Card className="rounded-[10px]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuarios Inactivos</CardTitle>
            <FaUserTimes className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{stats.inactiveUsers}</p>
                <p className="text-xs text-muted-foreground">Usuarios</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Empresas Registradas */}
        <Card className="rounded-[10px]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Empresas Registradas</CardTitle>
            <FaBuilding className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{stats.totalCompanies}</p>
                <p className="text-xs text-muted-foreground">Empresas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Usuarios de Vacaciones */}
        <Card className="rounded-[10px]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuarios de Vacaciones</CardTitle>
            <FaUmbrellaBeach className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{stats.vacationUsers}</p>
                <p className="text-xs text-muted-foreground">Usuarios</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grid de Solicitudes - 2x2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tabla de Solicitudes de Certificación */}
        <div className="bg-white rounded-[10px] shadow-sm border border-gray-200 p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Solicitudes de Certificación Laboral</h2>
            <Button
              variant="outline"
              size="sm"
              className="btn-custom"
              onClick={() => router.push('/administracion/solicitudes/certificacion-laboral')}
            >
              Ver todas
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Colaborador</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {solicitudesCertificacion.map((solicitud, index) => (
                <TableRow key={solicitud.id || `certificacion-${index}`}>
                  <TableCell>{new Date(solicitud.fecha_solicitud).toLocaleDateString()}</TableCell>
                  <TableCell>{solicitud.usuario_nomina?.colaborador}</TableCell>
                  <TableCell>
                    <Badge
                      variant={solicitud.estado === 'aprobado' ? 'secondary' :
                              solicitud.estado === 'rechazado' ? 'destructive' :
                              'default'}
                    >
                      {solicitud.estado.charAt(0).toUpperCase() + solicitud.estado.slice(1)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {solicitudesCertificacion.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-4">
                    No hay solicitudes pendientes
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Tabla de Solicitudes de Vacaciones */}
        <div className="bg-white rounded-[10px] shadow-sm border border-gray-200 p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Solicitudes de Vacaciones</h2>
            <Button
              variant="outline"
              size="sm"
              className="btn-custom"
              onClick={() => router.push('/administracion/solicitudes/vacaciones')}
            >
              Ver todas
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Colaborador</TableHead>
                <TableHead>Días</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {solicitudesVacaciones.map((solicitud, index) => (
                <TableRow key={solicitud.id || `vacacion-${index}`}>
                  <TableCell>{new Date(solicitud.fecha_solicitud).toLocaleDateString()}</TableCell>
                  <TableCell>{solicitud.usuario?.colaborador}</TableCell>
                  <TableCell>
                    {Math.ceil(
                      (new Date(solicitud.fecha_fin).getTime() - 
                      new Date(solicitud.fecha_inicio).getTime()) / 
                      (1000 * 3600 * 24)
                    ) + 1}
                  </TableCell>
                </TableRow>
              ))}
              {solicitudesVacaciones.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-4">
                    No hay solicitudes pendientes
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Tabla de Solicitudes de Permisos */}
        <div className="bg-white rounded-[10px] shadow-sm border border-gray-200 p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Solicitudes de Permisos</h2>
            <Button
              variant="outline"
              size="sm"
              className="btn-custom"
              onClick={() => router.push('/administracion/solicitudes/permisos')}
            >
              Ver todas
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Colaborador</TableHead>
                <TableHead>Tipo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {solicitudesPermisos.map((solicitud, index) => (
                <TableRow key={solicitud.id || `permiso-${index}`}>
                  <TableCell>{new Date(solicitud.fecha_solicitud).toLocaleDateString()}</TableCell>
                  <TableCell>{solicitud.usuario?.colaborador}</TableCell>
                  <TableCell>{solicitud.tipo_permiso}</TableCell>
                </TableRow>
              ))}
              {solicitudesPermisos.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-4">
                    No hay solicitudes pendientes
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Tabla de Notificaciones de Incapacidades */}
        <div className="bg-white rounded-[10px] shadow-sm border border-gray-200 p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Notificaciones de Incapacidades</h2>
            <Button
              variant="outline"
              size="sm"
              className="btn-custom"
              onClick={() => router.push('/administracion/solicitudes/incapacidades')}
            >
              Ver todas
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Colaborador</TableHead>
                <TableHead>Días</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {notificacionesIncapacidades.map((incapacidad, index) => (
                <TableRow key={incapacidad.id || `incapacidad-${index}`}>
                  <TableCell>{new Date(incapacidad.fecha_subida).toLocaleDateString()}</TableCell>
                  <TableCell>{incapacidad.usuario?.colaborador}</TableCell>
                  <TableCell>
                    {Math.ceil(
                      (new Date(incapacidad.fecha_fin).getTime() - 
                      new Date(incapacidad.fecha_inicio).getTime()) / 
                      (1000 * 3600 * 24)
                    ) + 1}
                  </TableCell>
                </TableRow>
              ))}
              {notificacionesIncapacidades.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-4">
                    No hay notificaciones pendientes
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
