"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/ui/sidebar"
import { NotificationsDropdown } from "@/components/ui/notifications-dropdown"
import { createSupabaseClient, normRol } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"

export default function PerfilLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [userData, setUserData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  // useAuth se encarga de cargar y refrescar el userId de forma
  // centralizada (ver components/auth/auth-provider.tsx). Antes cada
  // layout llamaba a getAuthUserId independientemente, lo que causaba
  // multiples POST /auth/v1/token por navegacion -> 429.
  const { userId, loading: authLoading } = useAuth()

  useEffect(() => {
    // Esperar a que AuthProvider termine de validar la sesion.
    if (authLoading) {
      // AuthProvider todavia esta validando. Mantenemos loading=true.
      return
    }
    if (userId === null) {
      router.replace("/")
      return
    }

    let cancelled = false
    const checkAuth = async () => {
      const supabase = createSupabaseClient()

      try {
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
          .eq("auth_user_id", userId)
          .single()

        const currentUser = userData as any

        if (cancelled) return

        if (userError || !currentUser) {
          console.error("Error al obtener datos del usuario:", userError)
          setLoading(false)
          return
        }

        // Permitir acceso a usuarios inactivos para que puedan ver su perfil
        // Los administradores pueden acceder a su perfil cuando sea necesario
        // (por ejemplo, desde notificaciones o para ver sus propias solicitudes)
        // Solo redirigir si están accediendo directamente a /perfil sin una ruta específica
        if (normRol(currentUser.rol) === 'administrador' &&
            typeof window !== 'undefined' &&
            window.location.pathname === '/perfil') {
          router.push("/administracion/bienvenido")
          return
        }

        // Empresa restringida (ej. BOLSA): solo /perfil (Mis datos) y
        // /perfil/capacitaciones. Cualquier otra ruta bajo /perfil se
        // redirige a /perfil/capacitaciones.
        const empresaNombre = (currentUser as any)?.empresas?.nombre
        if (
          typeof window !== 'undefined' &&
          (empresaNombre ?? '').toString().trim().toUpperCase() === 'BOLSA'
        ) {
          const path = window.location.pathname
          const isPerfilRoot = path === '/perfil'
          const isCapacitaciones = path === '/perfil/capacitaciones' || path.startsWith('/perfil/capacitaciones/')
          const isActasEntrega = path === '/perfil/actas-entrega' || path.startsWith('/perfil/actas-entrega/')
          if (!isPerfilRoot && !isCapacitaciones && !isActasEntrega) {
            router.replace('/perfil/capacitaciones')
            return
          }
        }

        setUserData(currentUser)
      } catch (err) {
        console.error("Error inesperado en checkAuth:", err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void checkAuth()
    return () => {
      cancelled = true
    }
  }, [userId, authLoading, router])

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

        {normRol(userData?.rol) === 'jefe' && (
          <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-sm border-b border-gray-200 px-4 md:px-6 py-2">
            <div className="flex justify-between items-center">
              <h1 className="text-lg font-semibold text-gray-900">Panel de Jefe</h1>
              <div className="rounded-full border border-gray-300 bg-gray-100 hover:bg-gray-200 transition-colors">
                <NotificationsDropdown context="jefe" />
              </div>
            </div>
          </div>
        )}
        
        <main className="relative px-4 md:px-20 py-6 md:py-10 space-y-6 z-10">
          {children}
        </main>
      </div>
    </div>
  )
}
