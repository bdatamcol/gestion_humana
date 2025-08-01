"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
// AdminSidebar removido - ya está en el layout
import { ProfileCard } from "@/components/ui/profile-card"
import { Skeleton } from "@/components/ui/skeleton"
import { createSupabaseClient } from "@/lib/supabase"

export default function Perfil() {
  const router = useRouter()
  const [userData, setUserData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createSupabaseClient();
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession()

      if (error || !session) {
        router.push("/login")
        return
      }

      try {
        // Optimización: obtener datos del usuario con todas las relaciones en una sola consulta
        // Esta consulta ya está optimizada con joins, no necesita Promise.all adicional
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

        setUserData(userData)
      } catch (error) {
        console.error("Error inesperado:", error)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [router])

  return (
    <div className="min-h-screen bg-transparent">
      {/* Main content */}
      <div className="flex flex-col flex-1">
        <main className="flex-1">
          <div className="w-full mx-auto">
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Mis Datos</h1>
                <p className="text-muted-foreground">Visualiza tu información personal, laboral y de afiliaciones.</p>
              </div>

              <div className="divide-y divide-border rounded-[10px] border bg-white">
                {loading ? (
                  <div className="p-6 space-y-6">
                    <div className="flex items-center space-x-4">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-[250px]" />
                        <Skeleton className="h-4 w-[200px]" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                  </div>
                ) : (
                  <ProfileCard userData={userData} />
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
