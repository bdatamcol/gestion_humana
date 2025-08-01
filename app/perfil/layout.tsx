"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/ui/sidebar"
import { OnlineUsersIndicator } from "@/components/ui/online-users-indicator"
import { createSupabaseClient } from "@/lib/supabase"

export default function PerfilLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [userData, setUserData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createSupabaseClient()
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession()

      if (error || !session) {
        router.push("/")
        return
      }

      // Obtener datos del usuario desde la tabla usuario_nomina
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
        router.push("/")
        return
      }

      // Permitir acceso a usuarios inactivos para que puedan ver su perfil
      // Los administradores pueden acceder a su perfil cuando sea necesario
      // (por ejemplo, desde notificaciones o para ver sus propias solicitudes)
      // Solo redirigir si están accediendo directamente a /perfil sin una ruta específica
      if ((userData.rol === 'administrador' || userData.rol === 'moderador') && 
          window.location.pathname === '/perfil') {
        router.push("/administracion")
        return
      }

      setUserData(userData)
      setLoading(false)
    }

    checkAuth()
  }, [])

  if (loading) {
    return (
      <div className="flex h-screen bg-transparent">
        {/* Sidebar loading - oculto en móvil */}
        <div className="hidden md:block w-64 bg-white/80 backdrop-blur-sm shadow-sm border-r border-gray-200/50">
          <div className="p-4">
            <div className="h-8 bg-gray-200/60 rounded animate-pulse mb-4"></div>
            <div className="space-y-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-10 bg-gray-200/60 rounded animate-pulse"></div>
              ))}
            </div>
          </div>
        </div>
        <div 
          className="flex-1 relative"
          style={{
            backgroundImage: 'url("/fondosecciones.webp")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backgroundAttachment: 'fixed'
          }}
        >
          <div 
            className="absolute inset-0"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(2px)',
              WebkitBackdropFilter: 'blur(2px)'
            }}
          ></div>
          {/* Header móvil loading - solo visible en móvil */}
          <div className="md:hidden relative z-20 p-4">
            <div className="h-12 bg-white/60 rounded animate-pulse"></div>
          </div>
          <div className="relative z-10 p-4 md:p-6">
            <div className="h-8 bg-white/60 rounded animate-pulse mb-4"></div>
            <div className="h-64 bg-white/60 rounded animate-pulse"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-transparent">
      {/* Sidebar - oculto en móvil */}
      <div className="hidden md:block w-64 bg-white shadow-sm border-r border-gray-200 flex-shrink-0">
        <Sidebar userName={userData?.colaborador || 'Usuario'} />
        {(userData?.rol === 'administrador' || userData?.rol === 'moderador') && (
          <OnlineUsersIndicator />
        )}
      </div>
      
      {/* Contenido principal */}
      <div 
        className="flex-1 overflow-auto relative"
        style={{
          backgroundImage: 'url("/fondosecciones.webp")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed'
        }}
      >
        {/* Overlay con blur */}
        <div 
          className="absolute inset-0"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(2px)',
            WebkitBackdropFilter: 'blur(2px)'
          }}
        ></div>
        
        {/* Header móvil - solo visible en móvil */}
        <div className="md:hidden relative z-20">
          <Sidebar userName={userData?.colaborador || 'Usuario'} />
        </div>
        
        <main className="relative px-4 md:px-20 py-6 md:py-10 space-y-6 z-10">
          {children}
        </main>
      </div>
    </div>
  )
}
