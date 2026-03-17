"use client"

import { useEffect, useMemo, useState } from "react"
import { Search, Users, X } from "lucide-react"
import { createSupabaseClient } from "@/lib/supabase"
import { getAvatarUrl } from "@/lib/avatar-utils"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ProfileCard } from "@/components/ui/profile-card"

export default function EquipoPage() {
  const [teamMembers, setTeamMembers] = useState<any[]>([])
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [isBoss, setIsBoss] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadTeam = async () => {
      const supabase = createSupabaseClient()

      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession()

        if (sessionError || !session) {
          setError("No fue posible validar la sesión.")
          setLoading(false)
          return
        }

        const { data: currentUser, error: currentUserError } = await supabase
          .from("usuario_nomina")
          .select("rol")
          .eq("auth_user_id", session.user.id)
          .single()

        if (currentUserError) {
          setError("No fue posible validar los permisos.")
          setLoading(false)
          return
        }

        if ((currentUser as any)?.rol !== "jefe") {
          setIsBoss(false)
          setLoading(false)
          return
        }

        setIsBoss(true)

        const { data: relationships, error: relationshipsError } = await supabase
          .from("usuario_jefes")
          .select("usuario_id")
          .eq("jefe_id", session.user.id)

        if (relationshipsError) {
          setError("No fue posible cargar el equipo a cargo.")
          setLoading(false)
          return
        }

        const userIds = (relationships || []).map((relation: any) => relation.usuario_id)

        if (userIds.length === 0) {
          setTeamMembers([])
          setLoading(false)
          return
        }

        const { data: allBossRelations } = await supabase
          .from("usuario_jefes")
          .select("usuario_id, jefe_id")
          .in("usuario_id", userIds)

        const uniqueBossIds = Array.from(new Set((allBossRelations || []).map((relation: any) => relation.jefe_id)))

        let bossNameById: Record<string, string> = {}
        if (uniqueBossIds.length > 0) {
          const { data: bossesData } = await supabase
            .from("usuario_nomina")
            .select("auth_user_id, colaborador")
            .in("auth_user_id", uniqueBossIds)

          bossNameById = (bossesData || []).reduce((acc: Record<string, string>, boss: any) => {
            acc[boss.auth_user_id] = boss.colaborador
            return acc
          }, {})
        }

        const { data: members, error: membersError } = await supabase
          .from("usuario_nomina")
          .select(`
            id,
            auth_user_id,
            colaborador,
            correo_electronico,
            telefono,
            rol,
            estado,
            genero,
            cedula,
            fecha_ingreso,
            empresa_id,
            cargo_id,
            sede_id,
            fecha_nacimiento,
            edad,
            rh,
            tipo_de_contrato,
            eps_id,
            afp_id,
            cesantias_id,
            caja_de_compensacion_id,
            direccion_residencia,
            avatar_path,
            fecha_retiro,
            motivo_retiro,
            empresas:empresa_id(nombre),
            sedes:sede_id(nombre),
            eps:eps_id(nombre),
            afp:afp_id(nombre),
            cesantias:cesantias_id(nombre),
            caja_de_compensacion:caja_de_compensacion_id(nombre),
            cargos:cargo_id(nombre)
          `)
          .in("auth_user_id", userIds)
          .order("colaborador", { ascending: true })

        if (membersError) {
          setError("No fue posible cargar los datos del equipo.")
          setLoading(false)
          return
        }

        const bossNamesByUserId = (allBossRelations || []).reduce((acc: Record<string, string[]>, relation: any) => {
          if (!acc[relation.usuario_id]) acc[relation.usuario_id] = []
          const bossName = bossNameById[relation.jefe_id]
          if (bossName) acc[relation.usuario_id].push(bossName)
          return acc
        }, {})

        const membersWithBoss = (members || []).map((member: any) => ({
          ...member,
          jefeNombre: bossNamesByUserId[member.auth_user_id]?.join(", ") || "No asignado",
        }))

        setTeamMembers(membersWithBoss)
      } catch (err) {
        console.error("Error cargando el equipo:", err)
        setError("Ocurrió un error al cargar el equipo.")
      } finally {
        setLoading(false)
      }
    }

    loadTeam()
  }, [])

  const filteredMembers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()

    if (!term) return teamMembers

    return teamMembers.filter((member) => {
      return (
        member.colaborador?.toLowerCase().includes(term) ||
        member.cargos?.nombre?.toLowerCase().includes(term) ||
        member.correo_electronico?.toLowerCase().includes(term) ||
        member.cedula?.toString().toLowerCase().includes(term)
      )
    })
  }, [searchTerm, teamMembers])

  const handleOpenModal = (employee: any) => {
    setSelectedEmployee(employee)
    setIsModalOpen(true)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Equipo a cargo</h1>
        <p className="text-muted-foreground">Consulta los perfiles de las personas que te reportan directamente.</p>
      </div>

      {!loading && !isBoss ? (
        <div className="bg-white/80 backdrop-blur-sm border rounded-md p-6 text-sm text-muted-foreground">
          Esta vista está disponible solo para usuarios con rol de jefe.
        </div>
      ) : (
        <>
          <div className="bg-white/80 backdrop-blur-sm border rounded-md p-4">
            <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Buscar por nombre, cargo, correo o cédula..."
                  className="pl-9"
                />
              </div>
              <Badge variant="outline" className="bg-white text-sm w-fit">
                {filteredMembers.length} colaborador{filteredMembers.length === 1 ? "" : "es"}
              </Badge>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {[...Array(6)].map((_, index) => (
                <div key={index} className="bg-white/80 backdrop-blur-sm border rounded-md p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                  <Skeleton className="h-3 w-3/4" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="bg-white/80 backdrop-blur-sm border rounded-md p-6 text-sm text-red-600">{error}</div>
          ) : filteredMembers.length === 0 ? (
            <div className="bg-white/80 backdrop-blur-sm border rounded-md p-10 text-center">
              <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <h2 className="text-lg font-semibold mb-1">No hay resultados para tu búsqueda</h2>
              <p className="text-sm text-muted-foreground">Intenta con otro nombre, cargo, correo o cédula.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredMembers.map((member) => (
                <button
                  key={member.auth_user_id}
                  type="button"
                  onClick={() => handleOpenModal(member)}
                  className="text-left bg-white/80 backdrop-blur-sm border rounded-md p-4 hover:shadow-md hover:border-primary/40 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={getAvatarUrl(member.avatar_path || null, member.genero || null)} alt={member.colaborador} />
                      <AvatarFallback>{member.colaborador?.charAt(0) || "?"}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{member.colaborador}</p>
                      <p className="text-sm text-muted-foreground truncate">{member.cargos?.nombre || "Sin cargo asignado"}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground truncate">{member.correo_electronico || "Sin correo"}</p>
                    <Badge
                      variant="outline"
                      className={member.estado === "activo" ? "bg-green-100 text-green-800 border-green-200" : "bg-red-100 text-red-800 border-red-200"}
                    >
                      {member.estado === "activo" ? "Activo" : "Inactivo"}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {isModalOpen && selectedEmployee && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4 overflow-y-auto" onClick={() => setIsModalOpen(false)}>
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(event) => event.stopPropagation()}>
            <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-xl font-semibold">Perfil del colaborador</h2>
              <Button variant="ghost" size="icon" onClick={() => setIsModalOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="p-4">
              <ProfileCard userData={selectedEmployee} readOnly />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
