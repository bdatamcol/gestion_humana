"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { createClient } from "@supabase/supabase-js"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { UserCircle2, Lock, AlertCircle, Eye, EyeOff } from "lucide-react"
import { createSupabaseClient } from "@/lib/supabase"

export default function Login() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    correo: "",
    password: "",
  })
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    const checkSession = async () => {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || "",
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
      )

      const {
        data: { session },
        error,
      } = await supabase.auth.getSession()

      if (session && !error) {
        // Si hay sesión activa, obtener el rol y estado, y redirigir
        const { data: userData, error: userError } = await supabase
          .from("usuario_nomina")
          .select("rol, estado")
          .eq("auth_user_id", session.user.id)
          .single()

        if (!userError && userData) {
          // Verificar si el usuario está activo
          if (userData.estado !== "activo") {
            // Cerrar la sesión si el usuario no está activo
            await supabase.auth.signOut()
            return
          }

          if (userData.rol === "administrador") {
            router.push("/administracion")
          } else {
            router.push("/perfil")
          }
        }
      }
    }

    checkSession()
  }, [router])

  // Función para verificar si el input es una cédula o un correo electrónico
  const isCedula = (input: string): boolean => {
    // Verificar si el input contiene solo números (cédula)
    return /^\d+$/.test(input)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const supabase = createSupabaseClient()
      let emailToUse = formData.correo

      // Si el input es una cédula, buscar el correo correspondiente en la tabla usuario_nomina
      if (isCedula(formData.correo)) {
        const { data: userData, error: userError } = await supabase
          .from("usuario_nomina")
          .select("correo_electronico")
          .eq("cedula", formData.correo)
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

      // Iniciar sesión con el correo (original o encontrado) y la contraseña
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
          // Cerrar la sesión si el usuario no está activo
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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[url('/fondosecciones.webp')] bg-cover bg-center bg-no-repeat p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-block p-4 bg-primary/10mb-4">
            <img src="/logo360.webp" alt="Logo" className="max-w-[250px] w-full" />
          </div>
          
        </div>

        <Card className="border-none shadow-lg glassmorphism-card">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Iniciar Sesión</CardTitle>
            <CardDescription className="text-center">Ingresa tu correo o cédula y contraseña para acceder al sistema</CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Cédula o Correo electrónico</Label>
                <div className="relative bg-white">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <UserCircle2 className="h-5 w-5 text-slate-400" />
                  </div>
                  <Input
                    id="email"
                    type="text"
                    className="pl-10"
                    value={formData.correo}
                    onChange={(e) => setFormData({ ...formData, correo: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Contraseña</Label>
                  <a href="/reset-password" className="text-sm font-medium text-primary hover:underline">
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
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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
              <Button type="submit" className="w-full bg-[#6B487A]" disabled={isLoading}>
                {isLoading ? "Iniciando sesión..." : "Iniciar Sesión"}
              </Button>
              <div className="mt-4 text-center">
                <a href="/validacion" className="text-sm font-medium text-primary hover:underline">
                  Primera vez que voy a ingresar
                </a>
              </div>
            </form>
          </CardContent>
          <CardFooter className="flex justify-center">
            <p className="text-sm text-slate-500 text-center">
              © {new Date().getFullYear()} Gestión Humana 360. Todos los derechos reservados.
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
