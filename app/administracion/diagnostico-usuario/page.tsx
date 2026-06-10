"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Search, User, Users, Shield, FileText, AlertCircle } from "lucide-react"
import { createSupabaseClient, getAuthUserId, normRol } from "@/lib/supabase"

interface DiagnosticoUsuario {
  usuario: {
    id: string
    auth_user_id: string
    colaborador: string
    cedula: string | null
    correo_electronico: string | null
    rol: string
    estado: string
    cargo: string | null
    empresa: string | null
    sede: string | null
  } | null
  esJefeDe: Array<{ usuario_id: string; nombre: string; cedula: string | null }>
  subordinadosDe: Array<{ jefe_id: string; nombre: string; cedula: string | null }>
  solicitudes: Array<{ id: string; tipo: string; estado: string; fecha_inicio: string; fecha_fin: string }>
  aprobacionesComoJefe: Array<{ solicitud_id: string; estado: string; solicitante: string }>
  conteos: {
    solicitudes: number
    solicitudes_pendientes: number
    aprobaciones_como_jefe: number
    aprobaciones_pendientes_como_jefe: number
  }
}

export default function DiagnosticoUsuarioPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<DiagnosticoUsuario | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [currentUserIsAdmin, setCurrentUserIsAdmin] = useState<boolean | null>(null)

  useEffect(() => {
    const checkAdmin = async () => {
      const supabase = createSupabaseClient()
      const userId = await getAuthUserId(supabase)
      if (!userId) {
        setCurrentUserIsAdmin(false)
        return
      }
      const { data: u } = await supabase
        .from("usuario_nomina")
        .select("rol")
        .eq("auth_user_id", userId)
        .single()
      setCurrentUserIsAdmin(normRol((u as any)?.rol) === "administrador")
    }
    checkAdmin()
  }, [])

  const buscar = async () => {
    const term = searchTerm.trim()
    if (!term) {
      setError("Ingresa un termino de busqueda (cedula, correo o auth_user_id).")
      return
    }
    setLoading(true)
    setError(null)
    setData(null)

    try {
      const supabase = createSupabaseClient()
      const userId = await getAuthUserId(supabase)
      if (!userId) {
        setError("Sesion no valida.")
        return
      }

      // Buscar por cedula, correo o auth_user_id
      const { data: usuario, error: usuarioError } = await supabase
        .from("usuario_nomina")
        .select(`
          id,
          auth_user_id,
          colaborador,
          cedula,
          correo_electronico,
          rol,
          estado,
          cargos:cargo_id(nombre),
          empresas:empresa_id(nombre),
          sedes:sede_id(nombre)
        `)
        .or(`cedula.ilike.%${term}%,correo_electronico.ilike.%${term}%,auth_user_id.eq.${term},colaborador.ilike.%${term}%`)
        .limit(5)

      if (usuarioError) {
        setError(`Error al buscar: ${usuarioError.message}`)
        return
      }
      if (!usuario || usuario.length === 0) {
        setError("No se encontro ningun usuario con ese criterio.")
        return
      }
      if (usuario.length > 1) {
        setError(`Multiples resultados (${usuario.length}). Refina la busqueda.`)
        return
      }

      const u = usuario[0] as any
      const targetAuthUserId: string = u.auth_user_id

      // Cargar todas las relaciones y conteos en paralelo
      const [
        { data: esJefeDeRows },
        { data: subordinadosDeRows },
        { data: solicitudesRows },
        { data: aprobacionesRows },
      ] = await Promise.all([
        supabase
          .from("usuario_jefes")
          .select("usuario_id")
          .eq("jefe_id", targetAuthUserId),
        supabase
          .from("usuario_jefes")
          .select("jefe_id")
          .eq("usuario_id", targetAuthUserId),
        supabase
          .from("solicitudes_permisos")
          .select("id, tipo_permiso, estado, fecha_inicio, fecha_fin")
          .eq("usuario_id", targetAuthUserId)
          .order("fecha_solicitud", { ascending: false })
          .limit(50),
        supabase
          .from("permisos_aprobaciones")
          .select("solicitud_id, estado, solicitudes_permisos:solicitud_id(usuario_id)")
          .eq("jefe_id", targetAuthUserId)
          .limit(100),
      ])

      const esJefeDeIds = (esJefeDeRows || []).map((r: any) => r.usuario_id)
      const subordinadosDeIds = (subordinadosDeRows || []).map((r: any) => r.jefe_id)

      const [usuariosDeJefe, usuariosJefes] = await Promise.all([
        esJefeDeIds.length > 0
          ? supabase
              .from("usuario_nomina")
              .select("auth_user_id, colaborador, cedula")
              .in("auth_user_id", esJefeDeIds)
          : Promise.resolve({ data: [] as any[] } as any),
        subordinadosDeIds.length > 0
          ? supabase
              .from("usuario_nomina")
              .select("auth_user_id, colaborador, cedula")
              .in("auth_user_id", subordinadosDeIds)
          : Promise.resolve({ data: [] as any[] } as any),
      ])

      const mapUser = (rows: any[] | null) =>
        (rows || []).map((r: any) => ({
          usuario_id: r.auth_user_id,
          nombre: r.colaborador,
          cedula: r.cedula,
        }))

      const solicitudesArr = (solicitudesRows || []) as any[]
      const aprobacionesArr = (aprobacionesRows || []) as any[]

      setData({
        usuario: {
          id: u.id,
          auth_user_id: u.auth_user_id,
          colaborador: u.colaborador,
          cedula: u.cedula,
          correo_electronico: u.correo_electronico,
          rol: u.rol,
          estado: u.estado,
          cargo: u.cargos?.nombre ?? null,
          empresa: u.empresas?.nombre ?? null,
          sede: u.sedes?.nombre ?? null,
        },
        esJefeDe: mapUser(usuariosDeJefe.data),
        subordinadosDe: mapUser(usuariosJefes.data).map((j: any) => ({
          jefe_id: j.usuario_id,
          nombre: j.nombre,
          cedula: j.cedula,
        })),
        solicitudes: solicitudesArr.map((s) => ({
          id: s.id,
          tipo: s.tipo_permiso,
          estado: s.estado,
          fecha_inicio: s.fecha_inicio,
          fecha_fin: s.fecha_fin,
        })),
        aprobacionesComoJefe: aprobacionesArr.map((a: any) => ({
          solicitud_id: a.solicitud_id,
          estado: a.estado,
          solicitante: a.solicitudes_permisos?.usuario_id ?? null,
        })),
        conteos: {
          solicitudes: solicitudesArr.length,
          solicitudes_pendientes: solicitudesArr.filter((s) => s.estado === "pendiente").length,
          aprobaciones_como_jefe: aprobacionesArr.length,
          aprobaciones_pendientes_como_jefe: aprobacionesArr.filter((a) => a.estado === "pendiente").length,
        },
      })
    } catch (err: any) {
      setError(err?.message || "Error desconocido.")
    } finally {
      setLoading(false)
    }
  }

  if (currentUserIsAdmin === false) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Diagnostico de usuario</h1>
          <p className="text-muted-foreground">
            Herramienta de soporte para administradores.
          </p>
        </div>
        <div className="bg-white/80 backdrop-blur-sm border rounded-md p-6 text-sm text-muted-foreground">
          Esta vista esta disponible solo para usuarios con rol de administrador.
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Diagnostico de usuario</h1>
        <p className="text-muted-foreground">
          Busca por cedula, correo electronico o auth_user_id para ver la estructura de aprobaciones y permisos.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Buscar usuario</CardTitle>
          <CardDescription>
            Ingresa la cedula (e.g. 1065587316), el correo electronico o el auth_user_id (UUID).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") buscar()
                }}
                placeholder="1065587316 o correo@empresa.com"
                className="pl-9"
                disabled={loading}
              />
            </div>
            <Button onClick={buscar} disabled={loading}>
              {loading ? "Buscando..." : "Buscar"}
            </Button>
          </div>
          {error && (
            <div className="mt-3 text-sm text-red-600 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {loading && (
        <div className="space-y-3">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      )}

      {data && data.usuario && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4" />
                Datos basicos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-muted-foreground">Nombre</div>
                  <div className="font-medium">{data.usuario.colaborador}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Cedula</div>
                  <div className="font-medium">{data.usuario.cedula || "-"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Correo</div>
                  <div className="font-medium">{data.usuario.correo_electronico || "-"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">auth_user_id</div>
                  <div className="font-mono text-xs break-all">{data.usuario.auth_user_id}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Rol (en BD)</div>
                  <div>
                    <Badge
                      variant="outline"
                      className={
                        normRol(data.usuario.rol) === "administrador"
                          ? "bg-purple-100 text-purple-800 border-purple-200"
                          : normRol(data.usuario.rol) === "jefe"
                          ? "bg-blue-100 text-blue-800 border-blue-200"
                          : "bg-gray-100 text-gray-800 border-gray-200"
                      }
                    >
                      {data.usuario.rol || "(vacio)"}
                    </Badge>
                    {data.usuario.rol && normRol(data.usuario.rol) !== data.usuario.rol && (
                      <Badge variant="destructive" className="ml-2 text-xs">
                        casing no normalizado
                      </Badge>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Estado</div>
                  <div>
                    <Badge
                      variant="outline"
                      className={
                        data.usuario.estado === "activo"
                          ? "bg-green-100 text-green-800 border-green-200"
                          : "bg-red-100 text-red-800 border-red-200"
                      }
                    >
                      {data.usuario.estado}
                    </Badge>
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Cargo</div>
                  <div className="font-medium">{data.usuario.cargo || "-"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Empresa / Sede</div>
                  <div className="font-medium">
                    {[data.usuario.empresa, data.usuario.sede].filter(Boolean).join(" / ") || "-"}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Card>
              <CardContent className="pt-6">
                <div className="text-xs text-muted-foreground">Solicitudes totales</div>
                <div className="text-2xl font-bold">{data.conteos.solicitudes}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-xs text-muted-foreground">Solicitudes pendientes</div>
                <div className="text-2xl font-bold">{data.conteos.solicitudes_pendientes}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-xs text-muted-foreground">Aprobaciones como jefe</div>
                <div className="text-2xl font-bold">{data.conteos.aprobaciones_como_jefe}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-xs text-muted-foreground">Aprob. jefe pendientes</div>
                <div className="text-2xl font-bold">{data.conteos.aprobaciones_pendientes_como_jefe}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Es jefe de ({data.esJefeDe.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.esJefeDe.length === 0 ? (
                <p className="text-sm text-muted-foreground">No tiene subordinados asignados.</p>
              ) : (
                <ul className="text-sm space-y-1">
                  {data.esJefeDe.map((s) => (
                    <li key={s.usuario_id} className="flex items-center gap-2">
                      <Users className="h-3 w-3 text-muted-foreground" />
                      <span className="font-medium">{s.nombre}</span>
                      <span className="text-muted-foreground">({s.cedula || "s/cedula"})</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Subordinado de ({data.subordinadosDe.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.subordinadosDe.length === 0 ? (
                <p className="text-sm text-muted-foreground">No tiene jefes asignados.</p>
              ) : (
                <ul className="text-sm space-y-1">
                  {data.subordinadosDe.map((j) => (
                    <li key={j.jefe_id} className="flex items-center gap-2">
                      <User className="h-3 w-3 text-muted-foreground" />
                      <span className="font-medium">{j.nombre}</span>
                      <span className="text-muted-foreground">({j.cedula || "s/cedula"})</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Solicitudes de permiso ({data.solicitudes.length} mas recientes)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.solicitudes.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin solicitudes.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-muted-foreground border-b">
                        <th className="py-1 pr-3">ID</th>
                        <th className="py-1 pr-3">Tipo</th>
                        <th className="py-1 pr-3">Estado</th>
                        <th className="py-1 pr-3">Inicio</th>
                        <th className="py-1 pr-3">Fin</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.solicitudes.map((s) => (
                        <tr key={s.id} className="border-b last:border-0">
                          <td className="py-1 pr-3 font-mono text-xs">{s.id.slice(0, 8)}</td>
                          <td className="py-1 pr-3">{s.tipo}</td>
                          <td className="py-1 pr-3">
                            <Badge
                              variant="outline"
                              className={
                                s.estado === "aprobado"
                                  ? "bg-green-100 text-green-800 border-green-200"
                                  : s.estado === "rechazado"
                                  ? "bg-red-100 text-red-800 border-red-200"
                                  : "bg-yellow-100 text-yellow-800 border-yellow-200"
                              }
                            >
                              {s.estado}
                            </Badge>
                          </td>
                          <td className="py-1 pr-3">{s.fecha_inicio}</td>
                          <td className="py-1 pr-3">{s.fecha_fin}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Aprobaciones como jefe ({data.aprobacionesComoJefe.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.aprobacionesComoJefe.length === 0 ? (
                <p className="text-sm text-muted-foreground">No figura como aprobador en ninguna solicitud.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-muted-foreground border-b">
                        <th className="py-1 pr-3">Solicitud</th>
                        <th className="py-1 pr-3">Estado</th>
                        <th className="py-1 pr-3">Solicitante auth_user_id</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.aprobacionesComoJefe.map((a) => (
                        <tr key={a.solicitud_id} className="border-b last:border-0">
                          <td className="py-1 pr-3 font-mono text-xs">{a.solicitud_id.slice(0, 8)}</td>
                          <td className="py-1 pr-3">
                            <Badge
                              variant="outline"
                              className={
                                a.estado === "aprobado"
                                  ? "bg-green-100 text-green-800 border-green-200"
                                  : a.estado === "rechazado"
                                  ? "bg-red-100 text-red-800 border-red-200"
                                  : "bg-yellow-100 text-yellow-800 border-yellow-200"
                              }
                            >
                              {a.estado}
                            </Badge>
                          </td>
                          <td className="py-1 pr-3 font-mono text-xs">{a.solicitante || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
