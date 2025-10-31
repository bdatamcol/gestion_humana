"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { createSupabaseClient } from "@/lib/supabase"
// AdminSidebar removido - ya está en el layout
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  CardDescription,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  BookOpenCheckIcon,
  BarChart3Icon,
  ClockIcon,
  ArrowLeftIcon,
  CalendarIcon,
  UsersIcon,
  UserRoundX,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"

interface Lectura {
  usuario_id: string
  usuario_nomina: {
    colaborador: string | null
    avatar_path: string | null
    genero: string | null
  } | null
  leido_at: string
}
interface Destinatario {
  usuario_id: string
  colaborador: string | undefined
  avatar_path: string | null
  genero: string | null
}

export default function DetallesComunicadoPage() {
  const router = useRouter()
  const { id: comunicadoId } = useParams() as { id: string }
  const supabase = createSupabaseClient()

  // Función para obtener URL del avatar
  const getAvatarUrl = (avatar_path: string | null, genero: string | null): string => {
    if (avatar_path) {
      const { data } = supabase.storage.from("avatar").getPublicUrl(avatar_path)
      return data.publicUrl
    } else if (genero) {
      const path = genero === "F" ? "defecto/avatar-f.webp" : "defecto/avatar-m.webp"
      const { data } = supabase.storage.from("avatar").getPublicUrl(path)
      return data.publicUrl
    }
    return "/img/default-avatar.svg"
  }

  const [comunicadoInfo, setComunicadoInfo] = useState<{
    titulo: string
    total_destinatarios: number
  } | null>(null)
  const [usuariosLeidos, setUsuariosLeidos] = useState<Lectura[]>([])
  const [destinatarios, setDestinatarios] = useState<Destinatario[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  const fetchData = async () => {
    setLoading(true)
    if (!comunicadoId) return

    try {

      // Ejecutar consultas iniciales en paralelo
      const [comResult, cargosResult, lecturasResult] = await Promise.all([
        // 1) Título del comunicado
        supabase
          .from("comunicados")
          .select("titulo")
          .eq("id", comunicadoId)
          .single(),
        // 2) Cargos destinatarios del comunicado
        supabase
          .from("comunicados_cargos")
          .select("cargo_id")
          .eq("comunicado_id", comunicadoId),
        // 3) Lecturas del comunicado
        supabase
          .from("comunicados_leidos")
          .select(`
            usuario_id,
            leido_at,
            usuario_nomina:usuario_id (colaborador, avatar_path, genero)
          `)
          .eq("comunicado_id", comunicadoId)
          .order("leido_at", { ascending: false })
      ])

      if (comResult.error) throw comResult.error
      if (cargosResult.error) throw cargosResult.error
      if (lecturasResult.error) throw lecturasResult.error

      const titulo = comResult.data?.titulo as string
      const cargoIds = (cargosResult.data || []).map((r) => r.cargo_id)
      
      // Procesar lecturas
      const leData = lecturasResult.data || []
      const lecturas: Lectura[] = leData.map(item => ({
          usuario_id: item.usuario_id as string,
          usuario_nomina: item.usuario_nomina && typeof item.usuario_nomina === 'object' ? {
            colaborador: (item.usuario_nomina as { colaborador: string | null; avatar_path: string | null; genero: string | null }).colaborador || "Usuario desconocido",
            avatar_path: (item.usuario_nomina as { colaborador: string | null; avatar_path: string | null; genero: string | null }).avatar_path,
            genero: (item.usuario_nomina as { colaborador: string | null; avatar_path: string | null; genero: string | null }).genero
          } : null,
          leido_at: item.leido_at as string
        }))
      setUsuariosLeidos(lecturas)

      // Ejecutar consultas dependientes en paralelo si hay cargos
      if (cargoIds.length > 0) {
        const [countResult, destinatariosResult] = await Promise.all([
          // Contar total destinatarios
          supabase
            .from("usuario_nomina")
            .select("*", { head: true, count: "exact" })
            .in("cargo_id", cargoIds),
          // Obtener destinatarios
          supabase
            .from("usuario_nomina")
            .select("auth_user_id, colaborador, avatar_path, genero")
            .in("cargo_id", cargoIds)
        ])

        const totalDest = countResult.count || 0
        
        setComunicadoInfo({
          titulo: titulo,
          total_destinatarios: totalDest,
        })

        if (!destinatariosResult.error) {
          const destinatariosData = Array.isArray(destinatariosResult.data) ? destinatariosResult.data.map((u) => ({
            usuario_id: u.auth_user_id as string,
            colaborador: u.colaborador as string | undefined,
            avatar_path: u.avatar_path as string | null,
            genero: u.genero as string | null,
          })) : []
          
          setDestinatarios(destinatariosData)
        }
      } else {
        setComunicadoInfo({
          titulo: titulo,
          total_destinatarios: 0,
        })
        setDestinatarios([])
      }
    } catch (err: any) {
      console.error("Error en fetchData:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [comunicadoId])

  const formatDate = (s: string) => {
    const date = new Date(s)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return `Hoy a las ${date.toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
      })}`
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return `Ayer a las ${date.toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
      })}`
    }
    return date.toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const porcentajeLecturas =
    comunicadoInfo && comunicadoInfo.total_destinatarios > 0
      ? Math.round(
          (usuariosLeidos.length / comunicadoInfo.total_destinatarios) * 100
        )
      : 0

  const filteredLeidos = usuariosLeidos.filter((u) =>
    u.usuario_nomina?.colaborador
      ?.toLowerCase()
      ?.includes(searchTerm.toLowerCase()) ?? false
  )
  const faltantes = destinatarios.filter(
    (d) => !usuariosLeidos.some((l) => l.usuario_id === d.usuario_id)
  )
  const filteredFaltantes = faltantes.filter((d) =>
    d.colaborador?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false
  )

  return (
    <div className="py-6 flex min-h-screen">
      <div className="flex-1">
        <div className="w-full mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {loading
                  ? "Cargando detalles..."
                  : comunicadoInfo?.titulo || "Detalles"}
              </h1>
              <p className="text-muted-foreground mt-1">
                Estadísticas y seguimiento
              </p>
            </div>
            <div className="flex items-center gap-2 self-end md:self-auto">
              <Badge variant="outline" className="px-3 py-1 bg-white">
                <BookOpenCheckIcon className="h-3.5 w-3.5 mr-1" />{" "}
                {usuariosLeidos.length} lecturas
              </Badge>
              <Badge variant="outline" className="px-3 py-1 bg-white">
                <UsersIcon className="h-3.5 w-3.5 mr-1" />{" "}
                {comunicadoInfo?.total_destinatarios || 0} destinatarios
              </Badge>
            </div>
          </div>

          {/* Cards resumen */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Lecturas
                    </p>
                    <h3 className="text-2xl font-bold">
                      {usuariosLeidos.length}
                    </h3>
                  </div>
                  <BookOpenCheckIcon className="h-6 w-6 text-primary" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Porcentaje
                    </p>
                    <h3 className="text-2xl font-bold">
                      {porcentajeLecturas}%
                    </h3>
                  </div>
                  <BarChart3Icon className="h-6 w-6 text-primary" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Última lectura
                    </p>
                    <h3 className="text-lg font-bold">
                      {usuariosLeidos.length > 0
                        ? formatDate(usuariosLeidos[0].leido_at).split(" a las")[0]
                        : "Sin lecturas"}
                    </h3>
                  </div>
                  <ClockIcon className="h-6 w-6 text-primary" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Pestañas */}
          <Tabs defaultValue="lecturas" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="lecturas">
                <BookOpenCheckIcon className="h-4 w-4 mr-1" /> Lecturas
              </TabsTrigger>
              <TabsTrigger value="faltantes">
                <UserRoundX className="h-4 w-4 mr-1" /> Faltantes
              </TabsTrigger>
            </TabsList>

            {/* Registro de Lecturas */}
            <TabsContent value="lecturas">
              <Card>
                <CardHeader className="bg-slate-50 pb-4 flex justify-between items-start gap-4">
                  <div>
                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                      <BookOpenCheckIcon className="h-5 w-5 text-primary" />
                      Registro de Lecturas
                    </CardTitle>
                    <CardDescription>
                      Colaboradores que han leído
                    </CardDescription>
                  </div>
                  <Input
                    placeholder="Buscar..."
                    className="w-64"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </CardHeader>
                <CardContent className="p-0">
                  {loading ? (
                    // Skeleton loader para lecturas
                    Array.from({ length: 5 }).map((_, index) => (
                      <div key={index} className="flex justify-between items-center p-4">
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-9 w-9 rounded-full" />
                          <Skeleton className="h-4 w-[180px]" />
                        </div>
                        <div className="flex items-center gap-1">
                          <Skeleton className="h-4 w-4" />
                          <Skeleton className="h-4 w-[120px]" />
                        </div>
                      </div>
                    ))
                  ) : filteredLeidos.length === 0 ? (
                    <div className="text-center py-8">
                      <BookOpenCheckIcon className="h-12 w-12 opacity-20 mx-auto mb-3" />
                      <p className="text-muted-foreground">
                        {searchTerm
                          ? "No se encontraron resultados."
                          : "Aún no hay lecturas."}
                      </p>
                    </div>
                  ) : (
                    filteredLeidos.map((u, i) => (
                      <div
                        key={i}
                        className="flex justify-between items-center p-4 hover:bg-slate-50"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage 
                              src={getAvatarUrl(u.usuario_nomina?.avatar_path || null, u.usuario_nomina?.genero || null)} 
                              alt={u.usuario_nomina?.colaborador || "Usuario"}
                              className="object-cover"
                            />
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {u.usuario_nomina?.colaborador
                                ? u.usuario_nomina.colaborador
                                  .split(" ")
                                  .map((w) => w[0])
                                  .join("")
                                  .toUpperCase()
                                  .slice(0, 2)
                                : "--"}
                            </AvatarFallback>
                          </Avatar>
                          <span>{u.usuario_nomina?.colaborador || "Usuario desconocido"}</span>
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center">
                          <CalendarIcon className="h-4 w-4 mr-1" />
                          {formatDate(u.leido_at)}
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
                <CardFooter className="bg-slate-50 py-3 px-4 border-t flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Mostrando {filteredLeidos.length} de {usuariosLeidos.length}
                  </span>
                </CardFooter>
              </Card>
            </TabsContent>

            {/* Usuarios sin leer */}
            <TabsContent value="faltantes">
              <Card>
                <CardHeader className="bg-slate-50 pb-4 flex justify-between items-start gap-4">
                  <div>
                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                      <UserRoundX className="h-5 w-5 text-destructive" />
                      Usuarios sin leer
                    </CardTitle>
                    <CardDescription>
                      Destinatarios que no han leído
                    </CardDescription>
                  </div>
                  <Input
                    placeholder="Buscar..."
                    className="w-64"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </CardHeader>
                <CardContent className="p-0">
                  {loading ? (
                    // Skeleton loader para faltantes
                    Array.from({ length: 5 }).map((_, index) => (
                      <div key={index} className="flex items-center gap-3 p-4">
                        <Skeleton className="h-9 w-9 rounded-full" />
                        <Skeleton className="h-4 w-[180px]" />
                      </div>
                    ))
                  ) : filteredFaltantes.length === 0 ? (
                    <div className="text-center py-8">
                      <UserRoundX className="h-12 w-12 opacity-20 mx-auto mb-3" />
                      <p className="text-muted-foreground">
                        {searchTerm
                          ? "No se encontraron resultados."
                          : "Todos han leído."}
                      </p>
                    </div>
                  ) : (
                    filteredFaltantes.map((d, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 p-4 hover:bg-slate-50"
                      >
                        <Avatar className="h-9 w-9">
                          <AvatarImage 
                            src={getAvatarUrl(d.avatar_path, d.genero)} 
                            alt={d.colaborador || "Usuario"}
                            className="object-cover"
                          />
                          <AvatarFallback className="bg-destructive/10 text-destructive">
                            {d.colaborador
                              ? d.colaborador
                                .split(" ")
                                .map((w) => w[0])
                                .join("")
                                .toUpperCase()
                                .slice(0, 2)
                              : "--"}
                          </AvatarFallback>
                        </Avatar>
                        <span>{d.colaborador || "Usuario desconocido"}</span>
                      </div>
                    ))
                  )}
                </CardContent>
                <CardFooter className="bg-slate-50 py-3 px-4 border-t">
                  <span className="text-sm text-muted-foreground">
                    {filteredFaltantes.length} pendientes de{" "}
                    {comunicadoInfo?.total_destinatarios || 0}
                  </span>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
