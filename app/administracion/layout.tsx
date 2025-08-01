"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AdminSidebar } from "@/components/ui/admin-sidebar"
import { NotificationsDropdown } from "@/components/ui/notifications-dropdown"
import { OnlineUsersIndicator } from "@/components/ui/online-users-indicator"
import { createSupabaseClient } from "@/lib/supabase"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Link from "next/link"

export default function AdministracionLayout({
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

      // Verificar que el usuario tenga permisos de administración
      if (userData.rol !== 'administrador' && userData.rol !== 'moderador') {
        router.push("/")
        return
      }

      // Verificar si el usuario está activo
      if (userData.estado !== 'activo') {
        router.push("/")
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
        <div className="w-64 bg-white shadow-sm border-r border-gray-200">
          <div className="p-4">
            <div className="h-8 bg-gray-200 rounded animate-pulse mb-4"></div>
            <div className="space-y-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-10 bg-gray-200 rounded animate-pulse"></div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex-1 p-6">
          <div className="h-8 bg-gray-200 rounded animate-pulse mb-4"></div>
          <div className="h-64 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar persistente */}
      <div className="w-64 bg-white shadow-sm border-r border-gray-200 flex-shrink-0">
        <AdminSidebar userName={userData?.colaborador || 'Administrador'} />
      </div>
      
      {/* Contenido principal */}
      <div 
        className="flex-1 overflow-auto relative flex flex-col"
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
        
        {/* Header con notificaciones */}
        <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-sm border-b border-gray-200 px-6 py-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <h1 className="text-lg font-semibold text-gray-900">
                Panel de Administración
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="rounded-full border border-gray-300 bg-gray-100 hover:bg-gray-200 transition-colors">
                <OnlineUsersIndicator />
              </div>
              <div className="rounded-full border border-gray-300 bg-gray-100 hover:bg-gray-200 transition-colors">
                <NotificationsDropdown />
              </div>
              <Link href="/administracion/perfil" className="flex items-center font-medium text-base gap-2 text-sm text-gray-800 hover:text-gray-950 transition-colors cursor-pointer">
                <div className="rounded-full border border-gray-300 bg-gray-100 hover:bg-gray-200 transition-colors p-1">
                  <Avatar className="h-8 w-8">
                  <AvatarImage 
                    src={userData?.avatar_path ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatar/${userData.avatar_path}` : '/img/default-avatar.svg'} 
                    alt={userData?.colaborador || 'Administrador'}
                    className="object-cover"
                  />
                    <AvatarFallback className="bg-blue-500 text-white text-xs">
                      {(userData?.colaborador || 'Administrador').split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </Link>
            </div>
          </div>
        </div>
        
        <main className="relative px-20 py-6 space-y-6 z-10 flex-1">
          {children}
        </main>
      </div>
    </div>
  )
}
