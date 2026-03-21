"use client"

import { useEffect, useMemo, useState } from "react"
import { createSupabaseClient } from "@/lib/supabase"

interface BirthdayUser {
  id: string
  colaborador: string
  fecha_nacimiento: string
  avatar_path?: string | null
  genero?: string | null
  cargo_nombre?: string | null
}

export default function BienvenidoContent() {
  const [birthdayUsers, setBirthdayUsers] = useState<BirthdayUser[]>([])
  const [loadingBirthdays, setLoadingBirthdays] = useState(true)

  const [bienestarPosts, setBienestarPosts] = useState<any[]>([])
  const [actividadesPosts, setActividadesPosts] = useState<any[]>([])
  const [sstPosts, setSstPosts] = useState<any[]>([])
  const [normatividadPosts, setNormatividadPosts] = useState<any[]>([])
  const [loadingSections, setLoadingSections] = useState(true)
  const [randomSeed, setRandomSeed] = useState(Math.random())

  const { featuredPost } = useMemo(() => {
    if (loadingSections) return { featuredPost: null }

    const allPosts = [...bienestarPosts, ...actividadesPosts, ...sstPosts, ...normatividadPosts].filter((post) => {
      if (!post.destacado) return false

      const postDate = new Date(post.fecha_publicacion)
      const today = new Date()
      const eightDaysAgo = new Date(today)
      eightDaysAgo.setDate(today.getDate() - 8)

      postDate.setHours(0, 0, 0, 0)
      eightDaysAgo.setHours(0, 0, 0, 0)
      today.setHours(23, 59, 59, 999)

      return postDate >= eightDaysAgo && postDate <= today
    })

    if (allPosts.length === 0) return { featuredPost: null }

    const index = Math.floor(randomSeed * allPosts.length)
    return { featuredPost: allPosts[index] }
  }, [bienestarPosts, actividadesPosts, sstPosts, normatividadPosts, loadingSections, randomSeed])

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMs = now.getTime() - date.getTime()
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))

    if (diffInDays === 0) return "Hoy"
    if (diffInDays === 1) return "Hace 1 dia"
    if (diffInDays < 7) return `Hace ${diffInDays} dias`
    if (diffInDays < 30) {
      const weeks = Math.floor(diffInDays / 7)
      return weeks === 1 ? "Hace 1 semana" : `Hace ${weeks} semanas`
    }

    const months = Math.floor(diffInDays / 30)
    return months === 1 ? "Hace 1 mes" : `Hace ${months} meses`
  }

  const getAvatarUrl = (avatarPath: string | null, genero: string | null): string => {
    const supabase = createSupabaseClient()

    if (avatarPath) {
      const { data } = supabase.storage.from("avatar").getPublicUrl(avatarPath)
      return data.publicUrl
    }

    if (genero) {
      const path = genero === "F" ? "defecto/avatar-f.webp" : "defecto/avatar-m.webp"
      const { data } = supabase.storage.from("avatar").getPublicUrl(path)
      return data.publicUrl
    }

    const { data } = supabase.storage.from("avatar").getPublicUrl("defecto/avatar-m.webp")
    return data.publicUrl
  }

  useEffect(() => {
    const loadBirthdayUsers = async () => {
      try {
        const supabase = createSupabaseClient()
        const now = new Date()
        const colombiaOffset = -5 * 60
        const utc = now.getTime() + now.getTimezoneOffset() * 60000
        const today = new Date(utc + colombiaOffset * 60000)

        const currentWeekStart = new Date(today)
        const dayOfWeek = today.getDay()
        const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
        currentWeekStart.setDate(today.getDate() + daysToMonday)
        currentWeekStart.setHours(0, 0, 0, 0)

        const currentWeekEnd = new Date(currentWeekStart)
        currentWeekEnd.setDate(currentWeekStart.getDate() + 6)
        currentWeekEnd.setHours(23, 59, 59, 999)

        const { data: users, error } = await supabase
          .from("usuario_nomina")
          .select(
            `
            id,
            colaborador,
            fecha_nacimiento,
            avatar_path,
            genero,
            cargo_id,
            cargos:cargo_id(nombre)
          `,
          )
          .eq("estado", "activo")
          .not("fecha_nacimiento", "is", null)

        if (error) return

        const birthdayUsersThisWeek = ((users || []) as any[]).filter((user) => {
          if (!user.fecha_nacimiento) return false

          const birthDateStr = user.fecha_nacimiento as string
          const [, month, day] = birthDateStr.split("-")
          const currentYear = today.getFullYear()
          const birthdayThisYear = new Date(currentYear, parseInt(month, 10) - 1, parseInt(day, 10))
          birthdayThisYear.setHours(12, 0, 0, 0)

          return birthdayThisYear >= currentWeekStart && birthdayThisYear <= currentWeekEnd
        })

        const birthdayUsersWithCargo = birthdayUsersThisWeek.map((user: any) => ({
          ...user,
          cargo_nombre: user.cargos?.nombre || null,
        }))

        setBirthdayUsers(birthdayUsersWithCargo as BirthdayUser[])
      } finally {
        setLoadingBirthdays(false)
      }
    }

    loadBirthdayUsers()
  }, [])

  useEffect(() => {
    const loadSectionPosts = async () => {
      try {
        const supabase = createSupabaseClient()

        const { data: bienestarData } = await supabase
          .from("publicaciones_bienestar")
          .select("id,titulo,contenido,imagen_principal,fecha_publicacion,tipo_seccion,destacado")
          .eq("estado", "publicado")
          .eq("tipo_seccion", "bienestar")
          .order("fecha_publicacion", { ascending: false })
          .limit(4)

        const { data: actividadesData } = await supabase
          .from("publicaciones_bienestar")
          .select("id,titulo,contenido,imagen_principal,fecha_publicacion,tipo_seccion,destacado")
          .eq("estado", "publicado")
          .eq("tipo_seccion", "actividades")
          .order("fecha_publicacion", { ascending: false })
          .limit(4)

        const { data: sstData } = await supabase
          .from("publicaciones_bienestar")
          .select("id,titulo,contenido,imagen_principal,fecha_publicacion,tipo_seccion,destacado")
          .eq("estado", "publicado")
          .eq("tipo_seccion", "sst")
          .order("fecha_publicacion", { ascending: false })
          .limit(4)

        const { data: normatividadData } = await supabase
          .from("publicaciones_bienestar")
          .select("id,titulo,contenido,imagen_principal,fecha_publicacion,tipo_seccion,destacado")
          .eq("estado", "publicado")
          .eq("tipo_seccion", "normatividad")
          .order("fecha_publicacion", { ascending: false })
          .limit(4)

        setBienestarPosts(bienestarData || [])
        setActividadesPosts(actividadesData || [])
        setSstPosts(sstData || [])
        setNormatividadPosts(normatividadData || [])
      } finally {
        setLoadingSections(false)
        setRandomSeed(Math.random())
      }
    }

    loadSectionPosts()
  }, [])

  const sectionCards = [
    {
      id: "bienestar",
      title: "Programas de Bienestar",
      badge: "Bienestar",
      badgeClass: "bg-emerald-500",
      bgFallback: "bg-emerald-100",
      iconFallback: "📝",
      link: "/publicaciones/bienestar",
      empty: "No hay publicaciones de bienestar disponibles",
      data: bienestarPosts,
      actionClass: "text-emerald-600 hover:text-emerald-700",
    },
    {
      id: "actividades",
      title: "Cronograma de Actividades",
      badge: "Actividades",
      badgeClass: "bg-amber-500",
      bgFallback: "bg-amber-100",
      iconFallback: "🎯",
      link: "/publicaciones/actividades",
      empty: "No hay actividades disponibles",
      data: actividadesPosts,
      actionClass: "text-amber-600 hover:text-amber-700",
    },
    {
      id: "sst",
      title: "Seguridad y Salud en el Trabajo",
      badge: "SST",
      badgeClass: "bg-red-500",
      bgFallback: "bg-red-100",
      iconFallback: "🛡️",
      link: "/publicaciones/sst",
      empty: "No hay recursos de SST disponibles",
      data: sstPosts,
      actionClass: "text-red-600 hover:text-red-700",
    },
    {
      id: "normatividad",
      title: "Blog de Normatividad",
      badge: "Normatividad",
      badgeClass: "bg-purple-500",
      bgFallback: "bg-purple-100",
      iconFallback: "📋",
      link: "/publicaciones/normatividad",
      empty: "No hay normativas disponibles",
      data: normatividadPosts,
      actionClass: "text-purple-600 hover:text-purple-700",
    },
  ]

  return (
    <div className="space-y-8 md:space-y-12">
      <section id="novedades" className="space-y-8">
        <div className="text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">Feed de Novedades</h2>
          <p className="text-lg text-gray-600">Mantente informado con las ultimas actualizaciones y recursos disponibles para ti.</p>
        </div>

        {loadingSections ? (
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl p-6 lg:p-10 text-white animate-pulse">
            <div className="h-4 bg-white/20 w-24 rounded mb-4"></div>
            <div className="h-8 bg-white/20 w-3/4 rounded mb-4"></div>
            <div className="h-20 bg-white/20 w-full rounded"></div>
          </div>
        ) : featuredPost ? (
          <div className="bg-gradient-to-r from-emerald-500 to-green-600 rounded-2xl p-6 lg:p-8 text-white">
            <span className="inline-block bg-white/20 px-3 py-1 rounded-md text-sm font-semibold uppercase tracking-wide mb-4">
              Destacado
            </span>
            <h3 className="text-2xl sm:text-3xl font-bold mb-3">{featuredPost.titulo}</h3>
            <p className="text-base sm:text-lg mb-5 opacity-95 leading-relaxed">
              {featuredPost.contenido.replace(/<[^>]*>/g, "").substring(0, 150)}...
            </p>
            <a href={`/publicacion/${featuredPost.id}`} className="inline-block bg-white text-emerald-600 px-5 py-2 rounded-lg font-semibold">
              Leer mas
            </a>
          </div>
        ) : (
          <div className="rounded-2xl p-6 lg:p-10 text-white" style={{ backgroundImage: 'url("/banner-destacado.webp")', backgroundSize: "cover" }}>
            <h3 className="text-2xl sm:text-3xl font-bold mb-3">Sin publicaciones destacadas</h3>
            <p className="text-lg opacity-95">Pronto tendremos nuevas publicaciones destacadas para ti.</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {sectionCards.map((section) => (
            <div key={section.id} className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden flex flex-col">
              <div className="p-6 border-b border-gray-200">
                <span className={`inline-block text-white px-3 py-1 rounded-md text-xs font-semibold uppercase tracking-wide mb-3 ${section.badgeClass}`}>
                  {section.badge}
                </span>
                <h3 className="text-xl font-semibold text-gray-900">{section.title}</h3>
              </div>
              <div className="flex-1 p-6 space-y-6">
                {loadingSections ? (
                  Array.from({ length: 2 }).map((_, index) => (
                    <div key={index} className="flex gap-4 pb-6 border-b border-gray-100 last:border-b-0 last:pb-0">
                      <div className="w-[30%] h-24 bg-gray-200 rounded-lg animate-pulse"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded mb-2 animate-pulse"></div>
                        <div className="h-3 bg-gray-200 rounded animate-pulse"></div>
                      </div>
                    </div>
                  ))
                ) : section.data.length > 0 ? (
                  section.data.map((post, index) => (
                    <article key={index} className="flex gap-6 pb-6 border-b border-gray-100 last:border-b-0 last:pb-0">
                      <div className="w-[30%] h-24 rounded-lg overflow-hidden">
                        {post.imagen_principal ? (
                          <img src={post.imagen_principal} alt={post.titulo} className="w-full h-full object-cover" />
                        ) : (
                          <div className={`w-full h-full flex items-center justify-center ${section.bgFallback}`}>
                            <span className="text-3xl">{section.iconFallback}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 mb-2 text-lg line-clamp-1">{post.titulo}</h4>
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{post.contenido.replace(/<[^>]*>/g, "").substring(0, 120)}...</p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">{formatTimeAgo(post.fecha_publicacion)}</span>
                          <a href={`/publicacion/${post.id}`} className={`text-xs font-medium ${section.actionClass}`}>
                            Ver
                          </a>
                        </div>
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>{section.empty}</p>
                  </div>
                )}
              </div>
              <div className="border-t border-gray-200">
                <a href={section.link} className="block p-4 text-emerald-600 font-semibold text-sm hover:text-emerald-700 transition-colors">
                  Ver todas
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section
        id="cumpleanos"
        className="rounded-2xl p-6 lg:p-10 text-white relative overflow-hidden"
        style={{ backgroundImage: 'url("/banner-cumpleaños.webp")', backgroundSize: "cover", backgroundPosition: "top" }}
      >
        <span className="inline-block bg-white/25 backdrop-blur-sm px-3 py-1 rounded-md text-sm font-semibold uppercase tracking-wide mb-4">
          Esta Semana
        </span>
        <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4">Cumpleaneros de la Semana</h3>
        <p className="text-lg sm:text-xl mb-8 opacity-95 leading-relaxed">Celebremos juntos a nuestros companeros de trabajo.</p>

        {loadingBirthdays ? (
          <div className="text-center py-8">
            <p className="text-white/80">Cargando cumpleaneros...</p>
          </div>
        ) : birthdayUsers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {birthdayUsers.map((user) => {
              const birthDateStr = user.fecha_nacimiento
              const [, month, day] = birthDateStr.split("-")
              const currentYear = new Date().getFullYear()
              const birthDate = new Date(currentYear, parseInt(month, 10) - 1, parseInt(day, 10))
              birthDate.setHours(12, 0, 0, 0)

              const formattedDate = birthDate.toLocaleDateString("es-CO", {
                weekday: "long",
                day: "numeric",
                month: "long",
                timeZone: "America/Bogota",
              })

              return (
                <div key={user.id} className="flex items-center gap-4 bg-white/15 backdrop-blur-sm p-4 rounded-xl">
                  <div className="flex-shrink-0 w-16 h-16 rounded-full overflow-hidden border-2 border-white/30">
                    <img src={getAvatarUrl(user.avatar_path || null, user.genero || null)} alt={`Avatar de ${user.colaborador}`} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-white text-lg mb-1">{user.colaborador}</h4>
                    <p className="text-white/80 text-sm mb-1">{user.cargo_nombre || "Sin cargo asignado"}</p>
                    <p className="text-white/90 text-sm font-medium">{formattedDate}</p>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-white/80">No hay cumpleaneros esta semana</p>
          </div>
        )}
      </section>
    </div>
  )
}
