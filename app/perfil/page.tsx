"use client"

import { useEffect, useState } from "react"
import { ProfileCard } from "@/components/ui/profile-card"
import { Skeleton } from "@/components/ui/skeleton"
import { createSupabaseClient } from "@/lib/supabase"

export default function Perfil() {
  const [userData, setUserData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadUserData = async () => {
      const supabase = createSupabaseClient();
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession()

      if (error || !session) {
        return
      }

      // Obtener datos del usuario desde la tabla usuario_nomina con relaciones
      const { data: userData, error: userError } = await supabase
        .from("usuario_nomina")
        .select(`
          *,
          empresas:empresa_id(nombre),
          sedes:sede_id(nombre),
          eps:eps_id(nombre),
          afp:afp_id(nombre),
          cesantias:cesantias_id(nombre),
          caja_de_compensacion:caja_de_compensacion_id(nombre),
          cargos:cargo_id(id, nombre)
        `)
        .eq("auth_user_id", session.user.id)
        .single()

      if (userError) {
        console.error("Error al obtener datos del usuario:", userError)
        return
      }

      // Verificar si el usuario está actualmente de vacaciones
      const today = new Date().toISOString().split('T')[0]
      const { data: vacacionesActivas } = await supabase
        .from("solicitudes_vacaciones")
        .select("*")
        .eq("usuario_id", session.user.id)
        .eq("estado", "aprobado")
        .lte("fecha_inicio", today)
        .gte("fecha_fin", today)

      // Obtener todas las vacaciones aprobadas del usuario para determinar el estado
      const { data: todasVacacionesAprobadas } = await supabase
        .from("solicitudes_vacaciones")
        .select("fecha_inicio, fecha_fin")
        .eq("usuario_id", session.user.id)
        .eq("estado", "aprobado")
        .order("fecha_inicio", { ascending: false })

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
        ...userData,
        enVacaciones: vacacionesActivas && vacacionesActivas.length > 0,
        estadoVacaciones,
        rangoVacaciones
      }

      setUserData(userDataWithVacaciones)
      setLoading(false)
    }

    loadUserData()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6 py-6">
        <div className="bg-white/80 backdrop-blur-sm rounded-lg p-6 shadow-sm">
          <div className="h-8 bg-gray-200/60 rounded animate-pulse mb-2"></div>
          <div className="h-4 bg-gray-200/40 rounded animate-pulse w-3/4"></div>
        </div>
        
        <div className="bg-white/80 backdrop-blur-sm rounded-lg border shadow-sm">
          <div className="p-6 space-y-6">
            <div className="flex items-center space-x-4">
              <div className="h-12 w-12 bg-gray-200/60 rounded-full animate-pulse"></div>
              <div className="space-y-2 flex-1">
                <div className="h-4 bg-gray-200/60 rounded animate-pulse w-1/2"></div>
                <div className="h-4 bg-gray-200/40 rounded animate-pulse w-1/3"></div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 bg-gray-200/60 rounded animate-pulse w-1/3"></div>
                  <div className="h-4 bg-gray-200/40 rounded animate-pulse w-2/3"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mis Datos</h1>
        <p className="text-muted-foreground">Visualiza tu información personal, laboral y de afiliaciones.</p>
      </div>

      <div className="bg-white/80 backdrop-blur-sm divide-y divide-border rounded-md border shadow-sm">
        <ProfileCard userData={userData} />
      </div>
    </div>
  )
}
