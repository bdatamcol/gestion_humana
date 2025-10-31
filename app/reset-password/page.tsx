"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createSupabaseClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Mail, AlertCircle, CheckCircle2 } from "lucide-react"

export default function ResetPassword() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setIsLoading(true)

    try {
      const supabase = createSupabaseClient()
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `https://gestionhumana360.co/update-password`
      })

      if (error) throw error

      setSuccess("Se ha enviado un enlace para restablecer tu contraseña a tu correo electrónico.")
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
            <CardTitle className="text-2xl text-center">Restablecer Contraseña</CardTitle>
            <CardDescription className="text-center">
              Te enviaremos un enlace para crear una nueva contraseña
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {success && (
              <Alert className="mb-6">
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  className="bg-white"
                  placeholder="Ingresa tu correo electrónico"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full bg-[#6B487A]" disabled={isLoading}>
                {isLoading ? "Enviando..." : "Enviar enlace"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
