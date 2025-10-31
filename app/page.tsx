"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { useState, useEffect, useMemo, useCallback } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, UserCircle2, Lock, Eye, EyeOff } from "lucide-react"
import { createSupabaseClient } from "@/lib/supabase"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import RecaptchaProvider from "@/components/recaptcha-provider"
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3'

interface BirthdayUser {
  id: string
  colaborador: string
  fecha_nacimiento: string
  avatar_path?: string | null
  genero?: string | null
  cargo_nombre?: string | null
}

export default function Home() {
  return (
    <RecaptchaProvider>
      <HomeContent />
    </RecaptchaProvider>
  )
}

function HomeContent() {
  const router = useRouter()
  const { executeRecaptcha } = useGoogleReCaptcha()
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    remember: false,
  })
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showValidationForm, setShowValidationForm] = useState(false)
  const [cedula, setCedula] = useState("")
  const [validationStep, setValidationStep] = useState(1)
  const [validationPassword, setValidationPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [userData, setUserData] = useState<{ correo_electronico: string; cedula: string } | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [birthdayUsers, setBirthdayUsers] = useState<BirthdayUser[]>([])
  const [loadingBirthdays, setLoadingBirthdays] = useState(true)

  // Estados para las secciones de contenido
  const [bienestarPosts, setBienestarPosts] = useState<any[]>([])
  const [actividadesPosts, setActividadesPosts] = useState<any[]>([])
  const [sstPosts, setSstPosts] = useState<any[]>([])
  const [normatividadPosts, setNormatividadPosts] = useState<any[]>([])
  const [loadingSections, setLoadingSections] = useState(true)
  const [randomSeed, setRandomSeed] = useState(Math.random())

  // Memoizar la selección de publicación destacada y posts disponibles
  const { featuredPost, availableFeaturedPosts } = useMemo(() => {
    if (loadingSections) return { featuredPost: null, availableFeaturedPosts: [] };

    // Combine all posts from different sections
    const allPosts = [...bienestarPosts, ...actividadesPosts, ...sstPosts, ...normatividadPosts]
      .filter(post => {
        // Filter posts from last 8 days and check if featured
        if (!post.destacado) return false;

        const postDate = new Date(post.fecha_publicacion);
        const today = new Date();
        const eightDaysAgo = new Date(today);
        eightDaysAgo.setDate(today.getDate() - 8);

        // Normalize dates to compare only dates without time
        postDate.setHours(0, 0, 0, 0);
        eightDaysAgo.setHours(0, 0, 0, 0);
        today.setHours(23, 59, 59, 999);

        return postDate >= eightDaysAgo && postDate <= today;
      });

    // Get random post using the seed for consistent randomization during the same session
    if (allPosts.length === 0) return { featuredPost: null, availableFeaturedPosts: [] };

    const index = Math.floor((randomSeed * allPosts.length));
    return { featuredPost: allPosts[index], availableFeaturedPosts: allPosts };
  }, [bienestarPosts, actividadesPosts, sstPosts, normatividadPosts, loadingSections, randomSeed]);

  // Función para verificar si el input es una cédula o un correo electrónico
  const isCedula = (input: string): boolean => {
    return /^\d+$/.test(input)
  }

  // Función para formatear fechas
  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMs = now.getTime() - date.getTime()
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))

    if (diffInDays === 0) {
      return "Hoy"
    } else if (diffInDays === 1) {
      return "Hace 1 día"
    } else if (diffInDays < 7) {
      return `Hace ${diffInDays} días`
    } else if (diffInDays < 30) {
      const weeks = Math.floor(diffInDays / 7)
      return weeks === 1 ? "Hace 1 semana" : `Hace ${weeks} semanas`
    } else {
      const months = Math.floor(diffInDays / 30)
      return months === 1 ? "Hace 1 mes" : `Hace ${months} meses`
    }
  }

  // Función para obtener la URL del avatar
  const getAvatarUrl = (avatar_path: string | null, genero: string | null): string => {
    const supabase = createSupabaseClient()

    if (avatar_path) {
      const { data } = supabase.storage.from("avatar").getPublicUrl(avatar_path)
      return data.publicUrl
    } else if (genero) {
      const path = genero === "F" ? "defecto/avatar-f.webp" : "defecto/avatar-m.webp"
      const { data } = supabase.storage.from("avatar").getPublicUrl(path)
      return data.publicUrl
    }

    // Fallback a avatar por defecto masculino
    const { data } = supabase.storage.from("avatar").getPublicUrl("defecto/avatar-m.webp")
    return data.publicUrl
  }

  // Cargar cumpleañeros de la semana
  useEffect(() => {
    const loadBirthdayUsers = async () => {
      try {
        const supabase = createSupabaseClient()
        
        // Obtener fecha actual en zona horaria de Colombia (UTC-5)
        const now = new Date()
        const colombiaOffset = -5 * 60 // UTC-5 en minutos
        const utc = now.getTime() + (now.getTimezoneOffset() * 60000)
        const today = new Date(utc + (colombiaOffset * 60000))
        
        // Calcular inicio de semana (lunes) y fin de semana (domingo)
        const currentWeekStart = new Date(today)
        const dayOfWeek = today.getDay() // 0 = domingo, 1 = lunes, etc.
        const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek // Si es domingo, retroceder 6 días
        currentWeekStart.setDate(today.getDate() + daysToMonday)
        currentWeekStart.setHours(0, 0, 0, 0) // Inicio del día
        
        const currentWeekEnd = new Date(currentWeekStart)
        currentWeekEnd.setDate(currentWeekStart.getDate() + 6) // Domingo
        currentWeekEnd.setHours(23, 59, 59, 999) // Final del día

        // Debug: log para verificar el cálculo de la semana
        console.log('Cálculo de semana:', {
          hoy: today.toISOString().split('T')[0],
          díaDeLaSemana: dayOfWeek,
          inicioSemana: currentWeekStart.toISOString().split('T')[0],
          finSemana: currentWeekEnd.toISOString().split('T')[0]
        })

        // Obtener todos los usuarios activos con fecha de nacimiento
        const { data: users, error } = await supabase
          .from("usuario_nomina")
          .select(`
            id,
            colaborador,
            fecha_nacimiento,
            avatar_path,
            genero,
            cargo_id,
            cargos:cargo_id(nombre)
          `)
          .eq("estado", "activo")
          .not("fecha_nacimiento", "is", null)

        if (error) {
          console.error("Error loading birthday users:", error)
          return
        }

        // Filtrar usuarios que cumplen años esta semana
        const birthdayUsersThisWeek = (users || []).filter((user) => {
          if (!user.fecha_nacimiento) return false

          // Crear la fecha correctamente para evitar problemas de zona horaria
          const birthDateStr = user.fecha_nacimiento as string
          const [year, month, day] = birthDateStr.split('-')
          const currentYear = today.getFullYear()

          // Crear fecha de cumpleaños para este año en zona horaria de Colombia
          const birthdayThisYear = new Date(currentYear, parseInt(month) - 1, parseInt(day))
          birthdayThisYear.setHours(12, 0, 0, 0) // Mediodía para evitar problemas de zona horaria

          // Debug: log para verificar las fechas
          console.log('Usuario:', user.colaborador, {
            fechaNacimiento: birthDateStr,
            cumpleañosEsteAño: birthdayThisYear.toISOString().split('T')[0],
            inicioSemana: currentWeekStart.toISOString().split('T')[0],
            finSemana: currentWeekEnd.toISOString().split('T')[0],
            estáEnRango: birthdayThisYear >= currentWeekStart && birthdayThisYear <= currentWeekEnd
          })

          // Verificar si el cumpleaños está en la semana actual
          return birthdayThisYear >= currentWeekStart && birthdayThisYear <= currentWeekEnd
        })

        // Mapear los datos para incluir el nombre del cargo
        const birthdayUsersWithCargo = birthdayUsersThisWeek.map((user: any) => ({
          ...user,
          cargo_nombre: user.cargos?.nombre || null
        }))

        setBirthdayUsers(birthdayUsersWithCargo as BirthdayUser[])
      } catch (error) {
        console.error("Error loading birthday users:", error)
      } finally {
        setLoadingBirthdays(false)
      }
    }

    loadBirthdayUsers()
  }, [])

  // Cargar publicaciones para las secciones
  useEffect(() => {
    const loadSectionPosts = async () => {
      try {
        const supabase = createSupabaseClient()

        // Cargar publicaciones de bienestar
        const { data: bienestarData, error: bienestarError } = await supabase
          .from("publicaciones_bienestar")
          .select(`
          id,
          titulo,
          contenido,
          imagen_principal,
          fecha_publicacion,
          tipo_seccion,
          destacado
        `)
          .eq("estado", "publicado")
          .eq("tipo_seccion", "bienestar")
          .order("fecha_publicacion", { ascending: false })
          .limit(4)

        if (!bienestarError) {
          setBienestarPosts(bienestarData || [])
        }

        // Cargar publicaciones de actividades
        const { data: actividadesData, error: actividadesError } = await supabase
          .from("publicaciones_bienestar")
          .select(`
          id,
          titulo,
          contenido,
          imagen_principal,
          fecha_publicacion,
          tipo_seccion,
          destacado
        `)
          .eq("estado", "publicado")
          .eq("tipo_seccion", "actividades")
          .order("fecha_publicacion", { ascending: false })
          .limit(4)

        if (!actividadesError) {
          setActividadesPosts(actividadesData || [])
        }

        // Cargar publicaciones de SST
        const { data: sstData, error: sstError } = await supabase
          .from("publicaciones_bienestar")
          .select(`
          id,
          titulo,
          contenido,
          imagen_principal,
          fecha_publicacion,
          tipo_seccion,
          destacado
        `)
          .eq("estado", "publicado")
          .eq("tipo_seccion", "sst")
          .order("fecha_publicacion", { ascending: false })
          .limit(4)

        if (!sstError) {
          setSstPosts(sstData || [])
        }

        // Cargar publicaciones de normatividad
        const { data: normatividadData, error: normatividadError } = await supabase
          .from("publicaciones_bienestar")
          .select(`
          id,
          titulo,
          contenido,
          imagen_principal,
          fecha_publicacion,
          tipo_seccion,
          destacado
        `)
          .eq("estado", "publicado")
          .eq("tipo_seccion", "normatividad")
          .order("fecha_publicacion", { ascending: false })
          .limit(4)

        if (!normatividadError) {
          setNormatividadPosts(normatividadData || [])
        }

      } catch (error) {
        console.error("Error loading section posts:", error)
      } finally {
        setLoadingSections(false)
        // Regenerar seed para nueva selección aleatoria
        setRandomSeed(Math.random())
      }
    }

    loadSectionPosts()
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      // Ejecutar reCAPTCHA solo en producción
      if (process.env.NODE_ENV === 'production' && executeRecaptcha) {
        const token = await executeRecaptcha('login')
        
        // Validar el token en el servidor
        const recaptchaResponse = await fetch('/api/verify-recaptcha', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        })

        if (!recaptchaResponse.ok) {
          throw new Error('Error de verificación reCAPTCHA')
        }

        const recaptchaResult = await recaptchaResponse.json()
        if (!recaptchaResult.success) {
          throw new Error('Verificación reCAPTCHA fallida')
        }
      }

      const supabase = createSupabaseClient()
      let emailToUse = formData.email

      // Si el input es una cédula, buscar el correo correspondiente
      if (isCedula(formData.email)) {
        const { data: userData, error: userError } = await supabase
          .from("usuario_nomina")
          .select("correo_electronico")
          .eq("cedula", formData.email)
          .single()

        if (userError) {
          throw new Error("No se encontró ningún usuario con esta cédula")
        }

        if (typeof userData.correo_electronico === "string") {
          emailToUse = userData.correo_electronico
        } else {
          throw new Error("El correo electrónico recuperado no es válido")
        }
      }

      // Iniciar sesión
      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailToUse,
        password: formData.password,
      })

      if (error) throw error

      if (data.user) {
        // Obtener el rol y estado del usuario
        const { data: userData, error: userError } = await supabase
          .from("usuario_nomina")
          .select("rol, estado")
          .eq("auth_user_id", data.user.id)
          .single()

        if (userError) throw userError

        // Verificar si el usuario está activo
        if (userData.estado !== "activo") {
          await supabase.auth.signOut()
          throw new Error("Tu cuenta no está activa actualmente. Contacta al administrador para más información.")
        }

        // Redirigir según el rol
        if (userData.rol === "administrador") {
          router.push("/administracion")
        } else {
          router.push("/perfil")
        }
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleValidarCedula = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const supabase = createSupabaseClient()

      // Verificar si el usuario existe en la tabla usuario_nomina
      const { data, error: queryError } = await supabase
        .from("usuario_nomina")
        .select("*")
        .eq("cedula", cedula)
        .single()

      if (queryError) {
        // Si no se encuentra el usuario, mostrar modal
        setShowModal(true)
        return
      }

      // Verificar si el usuario ya tiene una cuenta en auth
      const { data: authData, error: authError } = await supabase
        .from("usuario_nomina")
        .select("auth_user_id")
        .eq("cedula", cedula)
        .single()

      if (authData && authData.auth_user_id) {
        setError("Ya existe una cuenta asociada a esta cédula. Por favor inicie sesión.")
        return
      }

      // Si el usuario existe en nomina pero no tiene cuenta, pasar al siguiente paso
      if (data && typeof data.correo_electronico === "string" && typeof data.cedula === "string") {
        setUserData({
          correo_electronico: data.correo_electronico,
          cedula: data.cedula,
        })
      } else {
        throw new Error("Datos de usuario incompletos")
      }
      setValidationStep(2)
    } catch (err) {
      setError("Error al validar la cédula. Por favor intente nuevamente.")
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCrearCuenta = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    if (validationPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden")
      setIsLoading(false)
      return
    }

    try {
      const supabase = createSupabaseClient()

      if (!userData?.correo_electronico) {
        setError("Datos del usuario no encontrados")
        setIsLoading(false)
        return
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.correo_electronico,
        password: validationPassword,
      })

      if (authError) throw authError

      if (authData.user) {
        // Actualizar el registro en usuario_nomina con el auth_user_id
        const { error: updateError } = await supabase
          .from("usuario_nomina")
          .update({ auth_user_id: authData.user.id })
          .eq("cedula", cedula)

        if (updateError) throw updateError

        // Resetear formularios y volver al login
        setShowValidationForm(false)
        setValidationStep(1)
        setCedula("")
        setValidationPassword("")
        setConfirmPassword("")
        setUserData(null)
        setError("")
        alert("Cuenta creada exitosamente. Ahora puedes iniciar sesión.")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear la cuenta")
    } finally {
      setIsLoading(false)
    }
  }

  const closeModal = () => {
    setShowModal(false)
  }

  const toggleToValidation = () => {
    setShowValidationForm(true)
    setError("")
  }

  const backToLogin = () => {
    setShowValidationForm(false)
    setValidationStep(1)
    setCedula("")
    setValidationPassword("")
    setConfirmPassword("")
    setUserData(null)
    setError("")
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }))
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Hero Section */}
      <section
        id="inicio"
        className="relative bg-cover bg-center py-12 lg:py-20"
        style={{ backgroundImage: "url('/banner-hero.webp')" }}
      >
        {/* Gradiente overlay mejorado */}
        <div className="absolute inset-0 bg-gradient-to-r from-white via-white/40 via-white/10 to-transparent"></div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Welcome Section */}
            <div className="text-center lg:text-left lg:pr-8">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-neutral-800 mb-6 leading-tight">
                Bienvenido al Portal de Gestión Humana
              </h1>
              <p className="text-lg sm:text-lg text-gray-600 mb-8 leading-relaxed">
                Tu centro de información y recursos para el desarrollo profesional y personal. Mantente al día con las
                últimas novedades, políticas y beneficios de la empresa.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto lg:mx-0">
                {[
                  { icon: "📋", text: "Gestión de documentos y políticas" },
                  { icon: "🎯", text: "Programas de bienestar y desarrollo" },
                  { icon: "📅", text: "Cronograma de actividades y eventos" },
                  { icon: "🛡️", text: "Seguridad y salud en el trabajo" },
                ].map((feature, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-4 rounded-lg backdrop-blur-md bg-white/60 border border-gray-200/30 shadow-sm hover:shadow-md transition-all duration-200"
                  >
                    <span className="text-2xl">{feature.icon}</span>
                    <span className="text-sm sm:text-base font-medium text-gray-700">{feature.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Login Section */}
            <div className="flex justify-center lg:justify-end">
              <Card className="w-full max-w-md backdrop-blur-md bg-white/85 border border-gray-200/30 shadow-xl">
                <CardHeader className="space-y-1">
                  <CardTitle className="text-2xl text-center">
                    {showValidationForm
                      ? validationStep === 1
                        ? "Validar Cédula"
                        : "Crear Contraseña"
                      : "Iniciar Sesión"}
                  </CardTitle>
                  <CardDescription className="text-center">
                    {showValidationForm
                      ? validationStep === 1
                        ? "Ingresa tu número de cédula para validar tus datos"
                        : "Crea una contraseña para tu cuenta"
                      : ""}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {error && (
                    <Alert variant="destructive" className="mb-6">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  {!showValidationForm ? (
                    <form onSubmit={handleLogin} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="email">Cédula o Correo electrónico</Label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                            <UserCircle2 className="h-5 w-5 text-slate-400" />
                          </div>
                          <Input
                            id="email"
                            type="text"
                            className="pl-10 bg-white"
                            value={formData.email}
                            onChange={handleInputChange}
                            name="email"
                            placeholder="12345678 o tu@mail.com"
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="password">Contraseña</Label>
                          <a href="/reset-password" className="text-sm font-medium hover:underline">
                            ¿Olvidaste tu contraseña?
                          </a>
                        </div>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                            <Lock className="h-5 w-5 text-slate-400" />
                          </div>
                          <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            className="pl-10 pr-10 bg-white"
                            value={formData.password}
                            onChange={handleInputChange}
                            name="password"
                            placeholder="••••••••"
                            required
                          />
                          <button
                            type="button"
                            className="absolute inset-y-0 right-0 flex items-center pr-3"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? (
                              <EyeOff className="h-5 w-5 text-slate-400" />
                            ) : (
                              <Eye className="h-5 w-5 text-slate-400" />
                            )}
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="remember"
                          name="remember"
                          checked={formData.remember}
                          onChange={handleInputChange}
                          className="rounded border-gray-300"
                        />
                        <Label htmlFor="remember" className="text-sm">
                          Recordarme
                        </Label>
                      </div>
                      <Button type="submit" className="w-full text-black bg-[#F2C36B] hover:bg-[#F2CF8D]" disabled={isLoading}>
                        {isLoading ? "Iniciando sesión..." : "Ingresar al Portal"}
                      </Button>
                      <div className="mt-4 text-center">
                        <button
                          type="button"
                          onClick={toggleToValidation}
                          className="text-sm font-medium hover:underline"
                        >
                          Primera vez que voy a ingresar
                        </button>
                      </div>
                    </form>
                  ) : validationStep === 1 ? (
                    <form onSubmit={handleValidarCedula} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="cedula">Número de Cédula</Label>
                        <Input
                          id="cedula"
                          type="text"
                          placeholder="Ingresa tu número de cédula"
                          className="bg-white"
                          value={cedula}
                          onChange={(e) => setCedula(e.target.value)}
                          required
                        />
                      </div>
                      <Button type="submit" className="w-full text-black bg-[#F2C36B] hover:bg-[#F2CF8D]" disabled={isLoading}>
                        {isLoading ? "Validando..." : "Validar Cédula"}
                      </Button>
                      <div className="mt-4 text-center">
                        <button
                          type="button"
                          onClick={backToLogin}
                          className="text-sm font-medium hover:underline"
                        >
                          Volver al inicio de sesión
                        </button>
                      </div>
                    </form>
                  ) : (
                    <form onSubmit={handleCrearCuenta} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="validationPassword">Contraseña</Label>
                        <Input
                          id="validationPassword"
                          type="password"
                          className="bg-white"
                          value={validationPassword}
                          onChange={(e) => setValidationPassword(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
                        <Input
                          id="confirmPassword"
                          type="password"
                          className="bg-white"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                        />
                      </div>
                      <Button type="submit" className="w-full bg-[#6B487A] hover:bg-[#5a3d68]" disabled={isLoading}>
                        {isLoading ? "Creando cuenta..." : "Crear Cuenta"}
                      </Button>
                      <div className="mt-4 text-center">
                        <button
                          type="button"
                          onClick={backToLogin}
                          className="text-sm font-medium text-emerald-600 hover:underline"
                        >
                          Volver al inicio de sesión
                        </button>
                      </div>
                    </form>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Feed Section */}
      <section id="novedades" className="py-12 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-12 lg:mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Feed de Novedades</h2>
            <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto">
              Mantente informado con las últimas actualizaciones, eventos y recursos disponibles para ti.
            </p>
          </div>

          {/* Featured Random Post */}
          {loadingSections ? (
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl p-6 lg:p-12 mb-8 lg:mb-12 text-white relative overflow-hidden animate-pulse">
              <div className="h-4 bg-white/20 w-24 rounded mb-4"></div>
              <div className="h-8 bg-white/20 w-3/4 rounded mb-4"></div>
              <div className="h-20 bg-white/20 w-full rounded mb-6"></div>
              <div className="h-4 bg-white/20 w-48 rounded"></div>
            </div>
          ) : featuredPost ? (
            (() => {
              // Get section color based on tipo_seccion
              const sectionColors = {
                bienestar: "from-emerald-500 to-green-600",
                actividades: "from-amber-500 to-orange-600",
                sst: "from-red-500 to-rose-600",
                normatividad: "from-purple-500 to-indigo-600"
              };

              const gradientColor = sectionColors[featuredPost.tipo_seccion as keyof typeof sectionColors] || "from-blue-500 to-purple-600";

              return (
                <div className={`bg-gradient-to-r ${gradientColor} rounded-2xl p-6 lg:p-8 mb-8 lg:mb-12 text-white relative overflow-hidden`}>
                  <div className="relative z-10 flex gap-6 max-w-6xl mx-auto">
                    {/* Left column - Image */}
                    <div className="w-2/5">
                      {featuredPost.imagen_principal ? (
                        <img
                          src={featuredPost.imagen_principal}
                          alt={featuredPost.titulo}
                          className="w-full h-[300px] object-cover rounded-lg shadow-lg"
                        />
                      ) : (
                        <div className="w-full h-[300px] bg-white/20 rounded-lg flex items-center justify-center shadow-lg">
                          <span className="text-6xl">📝</span>
                        </div>
                      )}
                    </div>

                    {/* Right column - Content */}
                    <div className="w-3/5 flex flex-col justify-center">
                      <span className="inline-block bg-white/20 backdrop-blur-sm px-3 py-1 rounded-md text-sm font-semibold uppercase tracking-wide mb-4 w-fit">
                        Destacado • {featuredPost.tipo_seccion}
                      </span>

                      <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4 leading-tight">
                        {featuredPost.titulo}
                      </h3>

                      <p className="text-lg mb-6 opacity-95 leading-relaxed">
                        {featuredPost.contenido.replace(/<[^>]*>/g, '').substring(0, 150)}...
                      </p>

                      <div className="flex items-center gap-4 mb-6 text-sm opacity-90">
                        <span>📅 {new Date(featuredPost.fecha_publicacion).toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}</span>
                      </div>

                      <a
                        href={`/publicacion/${featuredPost.id}`}
                        className="inline-block bg-white text-emerald-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-all duration-200 hover:-translate-y-1 shadow-lg hover:shadow-xl w-fit"
                      >
                        Leer más →
                      </a>
                    </div>
                  </div>
                </div>
              );
            })()
          ) : (
            <div 
              className="rounded-2xl p-6 lg:p-12 mb-8 lg:mb-12 text-white relative overflow-hidden"
              style={{
                backgroundImage: 'url("/banner-destacado.webp")',
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            >
              <div className="relative z-10 text-center">
                <span className="inline-block bg-white/20 backdrop-blur-sm px-3 py-1 rounded-md text-sm font-semibold uppercase tracking-wide mb-4">
                  Sin publicaciones destacadas
                </span>
                <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4 leading-tight">
                  ¡Mantente atento!
                </h3>
                <p className="text-lg sm:text-xl mb-6 opacity-95 leading-relaxed">
                  Pronto tendremos nuevas publicaciones destacadas para ti.
                </p>
              </div>
            </div>
          )}

          {/* Cards Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 mb-8">
            {/* Bienestar Card */}
            <div
              id="bienestar"
              className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden hover:-translate-y-2 transition-all duration-300 hover:shadow-xl flex flex-col"
            >
              <div className="p-6 border-b border-gray-200">
                <span className="inline-block bg-emerald-500 text-white px-3 py-1 rounded-md text-xs font-semibold uppercase tracking-wide mb-3">
                  Bienestar
                </span>
                <h3 className="text-xl font-semibold text-gray-900">Programas de Bienestar</h3>
              </div>
              <div className="flex-1 p-6 space-y-6">
                {loadingSections ? (
                  // Skeleton loading
                  Array.from({ length: 2 }).map((_, index) => (
                    <div key={index} className="flex gap-4 pb-6 border-b border-gray-100 last:border-b-0 last:pb-0">
                      <div className="flex-shrink-0 w-[30%] h-24 bg-gray-200 rounded-lg animate-pulse"></div>
                      <div className="flex-1 min-w-0">
                        <div className="h-4 bg-gray-200 rounded mb-2 animate-pulse"></div>
                        <div className="h-3 bg-gray-200 rounded mb-2 animate-pulse"></div>
                        <div className="flex gap-2">
                          <div className="h-3 w-12 bg-gray-200 rounded animate-pulse"></div>
                          <div className="h-3 w-16 bg-gray-200 rounded animate-pulse"></div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : bienestarPosts.length > 0 ? (
                  bienestarPosts.map((post, index) => (
                    <article key={index} className="flex gap-6 pb-6 border-b border-gray-100 last:border-b-0 last:pb-0">
                      <div className="flex-shrink-0 w-[30%] h-24 rounded-lg overflow-hidden">
                        {post.imagen_principal ? (
                          <img
                            src={post.imagen_principal}
                            alt={post.titulo}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-emerald-100 flex items-center justify-center">
                            <span className="text-emerald-600 text-3xl">📝</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 mb-2 text-lg line-clamp-1">{post.titulo}</h4>
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                          {post.contenido.replace(/<[^>]*>/g, '').substring(0, 120)}...
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">{formatTimeAgo(post.fecha_publicacion)}</span>
                          <button
                            onClick={() => window.location.href = `/publicacion/${post.id}`}
                            className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                          >
                            Ver →
                          </button>
                        </div>
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>No hay publicaciones de bienestar disponibles</p>
                  </div>
                )}
              </div>
              <div className="border-t border-gray-200">
                <a
                  href="/publicaciones/bienestar"
                  className="block p-4 text-emerald-600 font-semibold text-sm hover:text-emerald-700 transition-colors"
                >
                  Ver todas →
                </a>
              </div>
            </div>

            {/* Actividades Card */}
            <div
              id="actividades"
              className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden hover:-translate-y-2 transition-all duration-300 hover:shadow-xl flex flex-col"
            >
              <div className="p-6 border-b border-gray-200">
                <span className="inline-block bg-amber-500 text-white px-3 py-1 rounded-md text-xs font-semibold uppercase tracking-wide mb-3">
                  Actividades
                </span>
                <h3 className="text-xl font-semibold text-gray-900">Cronograma de Actividades</h3>
              </div>
              <div className="flex-1 p-6 space-y-6">
                {loadingSections ? (
                  // Skeleton loading
                  Array.from({ length: 2 }).map((_, index) => (
                    <div key={index} className="flex gap-4 pb-6 border-b border-gray-100 last:border-b-0 last:pb-0">
                      <div className="flex-shrink-0 w-[30%] h-24 bg-gray-200 rounded-lg animate-pulse"></div>
                      <div className="flex-1 min-w-0">
                        <div className="h-4 bg-gray-200 rounded mb-2 animate-pulse"></div>
                        <div className="h-3 bg-gray-200 rounded mb-2 animate-pulse"></div>
                        <div className="flex gap-2">
                          <div className="h-3 w-12 bg-gray-200 rounded animate-pulse"></div>
                          <div className="h-3 w-16 bg-gray-200 rounded animate-pulse"></div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : actividadesPosts.length > 0 ? (
                  actividadesPosts.map((post, index) => (
                    <article key={index} className="flex gap-6 pb-6 border-b border-gray-100 last:border-b-0 last:pb-0">
                      <div className="flex-shrink-0 w-[30%] h-24 rounded-lg overflow-hidden">
                        {post.imagen_principal ? (
                          <img
                            src={post.imagen_principal}
                            alt={post.titulo}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-amber-100 flex items-center justify-center">
                            <span className="text-amber-600 text-3xl">🎯</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 mb-2 text-lg line-clamp-1">{post.titulo}</h4>
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                          {post.contenido.replace(/<[^>]*>/g, '').substring(0, 120)}...
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">{formatTimeAgo(post.fecha_publicacion)}</span>
                          <button
                            onClick={() => window.location.href = `/publicacion/${post.id}`}
                            className="text-xs text-amber-600 hover:text-amber-700 font-medium"
                          >
                            Ver →
                          </button>
                        </div>
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>No hay actividades disponibles</p>
                  </div>
                )}
              </div>
              <div className="border-t border-gray-200">
                <a
                  href="/publicaciones/actividades"
                  className="block p-4 text-emerald-600 font-semibold text-sm hover:text-emerald-700 transition-colors"
                >
                  Ver todas →
                </a>
              </div>
            </div>
          </div>

          {/* Cards Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 mb-8">
            {/* SST Card */}
            <div
              id="sst"
              className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden hover:-translate-y-2 transition-all duration-300 hover:shadow-xl flex flex-col"
            >
              <div className="p-6 border-b border-gray-200">
                <span className="inline-block bg-red-500 text-white px-3 py-1 rounded-md text-xs font-semibold uppercase tracking-wide mb-3">
                  SST
                </span>
                <h3 className="text-xl font-semibold text-gray-900">Seguridad y Salud en el Trabajo</h3>
              </div>
              <div className="flex-1 p-6 space-y-6">
                {loadingSections ? (
                  // Skeleton loading
                  Array.from({ length: 2 }).map((_, index) => (
                    <div key={index} className="flex gap-4 pb-6 border-b border-gray-100 last:border-b-0 last:pb-0">
                      <div className="flex-shrink-0 w-[30%] h-24 bg-gray-200 rounded-lg animate-pulse"></div>
                      <div className="flex-1 min-w-0">
                        <div className="h-4 bg-gray-200 rounded mb-2 animate-pulse"></div>
                        <div className="h-3 bg-gray-200 rounded mb-2 animate-pulse"></div>
                        <div className="flex gap-2">
                          <div className="h-3 w-12 bg-gray-200 rounded animate-pulse"></div>
                          <div className="h-3 w-16 bg-gray-200 rounded animate-pulse"></div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : sstPosts.length > 0 ? (
                  sstPosts.map((post, index) => (
                    <article key={index} className="flex gap-6 pb-6 border-b border-gray-100 last:border-b-0 last:pb-0">
                      <div className="flex-shrink-0 w-[30%] h-24 rounded-lg overflow-hidden">
                        {post.imagen_principal ? (
                          <img
                            src={post.imagen_principal}
                            alt={post.titulo}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-red-100 flex items-center justify-center">
                            <span className="text-red-600 text-3xl">🛡️</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 mb-2 text-lg line-clamp-1">{post.titulo}</h4>
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                          {post.contenido.replace(/<[^>]*>/g, '').substring(0, 120)}...
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">{formatTimeAgo(post.fecha_publicacion)}</span>
                          <button
                            onClick={() => window.location.href = `/publicacion/${post.id}`}
                            className="text-xs text-red-600 hover:text-red-700 font-medium"
                          >
                            Ver →
                          </button>
                        </div>
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>No hay recursos de SST disponibles</p>
                  </div>
                )}
              </div>
              <div className="border-t border-gray-200">
                <a
                  href="/publicaciones/sst"
                  className="block p-4 text-emerald-600 font-semibold text-sm hover:text-emerald-700 transition-colors"
                >
                  Ver todas →
                </a>
              </div>
            </div>

            {/* Normatividad Card */}
            <div
              id="normatividad"
              className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden hover:-translate-y-2 transition-all duration-300 hover:shadow-xl flex flex-col"
            >
              <div className="p-6 border-b border-gray-200">
                <span className="inline-block bg-purple-500 text-white px-3 py-1 rounded-md text-xs font-semibold uppercase tracking-wide mb-3">
                  Normatividad
                </span>
                <h3 className="text-xl font-semibold text-gray-900">Blog de Normatividad</h3>
              </div>
              <div className="flex-1 p-6 space-y-6">
                {loadingSections ? (
                  // Skeleton loading
                  Array.from({ length: 2 }).map((_, index) => (
                    <div key={index} className="flex gap-4 pb-6 border-b border-gray-100 last:border-b-0 last:pb-0">
                      <div className="flex-shrink-0 w-[30%] h-24 bg-gray-200 rounded-lg animate-pulse"></div>
                      <div className="flex-1 min-w-0">
                        <div className="h-4 bg-gray-200 rounded mb-2 animate-pulse"></div>
                        <div className="h-3 bg-gray-200 rounded mb-2 animate-pulse"></div>
                        <div className="flex gap-2">
                          <div className="h-3 w-12 bg-gray-200 rounded animate-pulse"></div>
                          <div className="h-3 w-16 bg-gray-200 rounded animate-pulse"></div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : normatividadPosts.length > 0 ? (
                  normatividadPosts.map((post, index) => (
                    <article key={index} className="flex gap-6 pb-6 border-b border-gray-100 last:border-b-0 last:pb-0">
                      <div className="flex-shrink-0 w-[30%] h-24 rounded-lg overflow-hidden">
                        {post.imagen_principal ? (
                          <img
                            src={post.imagen_principal}
                            alt={post.titulo}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-purple-100 flex items-center justify-center">
                            <span className="text-purple-600 text-3xl">📋</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 mb-2 text-lg line-clamp-1">{post.titulo}</h4>
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                          {post.contenido.replace(/<[^>]*>/g, '').substring(0, 120)}...
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">{formatTimeAgo(post.fecha_publicacion)}</span>
                          <button
                            onClick={() => window.location.href = `/publicacion/${post.id}`}
                            className="text-xs text-purple-600 hover:text-purple-700 font-medium"
                          >
                            Ver →
                          </button>
                        </div>
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>No hay normativas disponibles</p>
                  </div>
                )}
              </div>
              <div className="border-t border-gray-200">
                <a
                  href="/publicaciones/normatividad"
                  className="block p-4 text-emerald-600 font-semibold text-sm hover:text-emerald-700 transition-colors"
                >
                  Ver todas →
                </a>
              </div>
            </div>
          </div>

          {/* Featured Birthday Section */}
          <div
            id="cumpleaños"
            className="rounded-2xl p-6 lg:p-12 text-white relative overflow-hidden"
            style={{
              backgroundImage: 'url("/banner-cumpleaños.webp")',
              backgroundSize: 'cover',
              backgroundPosition: 'top'
            }}
          >
            <div className="relative z-10">
              <span className="inline-block bg-white/25 backdrop-blur-sm px-3 py-1 rounded-md text-sm font-semibold uppercase tracking-wide mb-4">
                Esta Semana
              </span>
              <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4 leading-tight">
                Cumpleañeros de la Semana
              </h3>
              <p className="text-lg sm:text-xl mb-8 opacity-95 leading-relaxed">
                Celebremos juntos a nuestros compañeros que están de cumpleaños esta semana. ¡Envíales tus
                felicitaciones!
              </p>
              <div className="w-full">
                {loadingBirthdays ? (
                  <div className="text-center py-8">
                    <p className="text-white/80">Cargando cumpleañeros...</p>
                  </div>
                ) : birthdayUsers.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {birthdayUsers.map((user, index) => {
                      // Crear la fecha correctamente para evitar problemas de zona horaria
                      const birthDateStr = user.fecha_nacimiento
                      const [year, month, day] = birthDateStr.split('-')
                      const currentYear = new Date().getFullYear()
                      const birthDate = new Date(currentYear, parseInt(month) - 1, parseInt(day))
                      birthDate.setHours(12, 0, 0, 0) // Mediodía para evitar problemas de zona horaria

                      const formattedDate = birthDate.toLocaleDateString("es-CO", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        timeZone: "America/Bogota"
                      })

                      const colors = [
                        "from-pink-400 to-purple-500",
                        "from-blue-400 to-cyan-500",
                        "from-green-400 to-emerald-500",
                        "from-orange-400 to-red-500",
                        "from-purple-400 to-pink-500",
                        "from-cyan-400 to-blue-500",
                        "from-[#F2C36B] to-green-500",
                        "from-red-400 to-orange-500",
                      ]

                      const initials = user.colaborador
                        .split(" ")
                        .map((name) => name.charAt(0))
                        .slice(0, 2)
                        .join("")

                      return (
                        <div
                          key={user.id}
                          className="flex items-center gap-4 bg-white/15 backdrop-blur-sm p-4 rounded-xl hover:translate-x-2 transition-transform duration-200"
                        >
                          <div className="flex-shrink-0 w-16 h-16 rounded-full overflow-hidden border-2 border-white/30">
                            <img
                              src={getAvatarUrl(user.avatar_path || null, user.genero || null)}
                              alt={`Avatar de ${user.colaborador}`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                // Fallback a avatar con iniciales si la imagen falla
                                const target = e.target as HTMLImageElement
                                target.style.display = "none"
                                const parent = target.parentElement
                                if (parent) {
                                  parent.innerHTML = `<div class="w-full h-full bg-gradient-to-br ${colors[index % colors.length]} flex items-center justify-center rounded-full"><span class="text-white font-bold text-lg">${initials}</span></div>`
                                }
                              }}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-white text-lg mb-1">
                              {user.colaborador.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')}
                            </h4>
                            <p className="text-white/80 text-sm mb-1">
                              {(user.cargo_nombre || 'Sin cargo asignado').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')}
                            </p>
                            <p className="text-white/90 text-sm font-medium">
                              🎂 {formattedDate.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-white/80">No hay cumpleañeros esta semana</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Logo Carousel Section */}
      <section className="py-12 lg:py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 lg:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">Nuestras Empresas</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Trabajamos con las mejores organizaciones para brindar soluciones de gestión humana de calidad
            </p>
          </div>

          {/* Carrusel de logos */}
          <div className="relative overflow-hidden">
            <div className="flex animate-scroll space-x-8 lg:space-x-12">
              {/* Primera serie de logos */}
              <div className="flex space-x-8 lg:space-x-12 flex-shrink-0">
                {[
                  'empresa-bdatam.webp',
                  'empresa-bestdream.webp',
                  'empresa-cbb.webp',
                  'empresa-daytona.webp',
                  'empresa-hka.webp',
                  'empresa-japolandia.webp',
                  'empresa-lucena.webp',
                  'empresa-orpa.webp',
                  'empresa-towncenter.webp'
                ].map((image, index) => (
                  <div key={index} className="flex items-center justify-center w-32 h-20 lg:w-40 lg:h-24">
                    <img
                      src={`/empresas/${image}`}
                      alt={`Empresa ${index + 1}`}
                      className="max-w-full bg-white max-h-full object-contain rounded-lg hover:opacity-100 transition-opacity duration-300 border border-gray-200"
                    />
                  </div>
                ))}
              </div>

              {/* Segunda serie de logos (duplicada para efecto infinito) */}
              <div className="flex space-x-8 lg:space-x-12 flex-shrink-0">
                {[
                  'empresa-bdatam.webp',
                  'empresa-bestdream.webp',
                  'empresa-cbb.webp',
                  'empresa-daytona.webp',
                  'empresa-hka.webp',
                  'empresa-japolandia.webp',
                  'empresa-lucena.webp',
                  'empresa-orpa.webp',
                  'empresa-towncenter.webp'
                ].map((image, index) => (
                  <div key={`duplicate-${index}`} className="flex items-center justify-center w-32 h-20 lg:w-40 lg:h-24">
                    <img
                      src={`/empresas/${image}`}
                      alt={`Empresa ${index + 1}`}
                      className="max-w-full bg-white max-h-full object-contain rounded-lg hover:opacity-100 transition-opacity duration-300 border border-gray-200"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Gradientes laterales para efecto fade */}
            <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-gray-50 to-transparent pointer-events-none"></div>
            <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-gray-50 to-transparent pointer-events-none"></div>
          </div>
        </div>
      </section>

      {/* Modal para usuario no encontrado */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-semibold mb-4 text-gray-900">Usuario no encontrado</h3>
            <p className="text-gray-600 mb-6 leading-relaxed">
              No se encontró un usuario con la cédula ingresada. Por favor verifica el número o contacta al
              administrador del sistema.
            </p>
            <div className="flex justify-end">
              <Button onClick={closeModal} className="bg-[#6B487A] hover:bg-[#5a3d68]">
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <Footer />
    </div>
  )
}
