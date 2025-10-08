"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Settings, Mail, Save, Loader2 } from "lucide-react"
import { toast } from "sonner"

export default function AjustesPage() {
  const [correoNotificaciones, setCorreoNotificaciones] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Cargar el correo actual al montar el componente
  useEffect(() => {
    const cargarCorreoActual = async () => {
      setIsLoading(true)
      try {
        const response = await fetch('/api/configuracion/correo-notificaciones')
        if (response.ok) {
          const data = await response.json()
          setCorreoNotificaciones(data.correo || "")
        } else {
          console.error('Error al cargar el correo de notificaciones')
        }
      } catch (error) {
        console.error('Error al cargar el correo de notificaciones:', error)
      } finally {
        setIsLoading(false)
      }
    }

    cargarCorreoActual()
  }, [])

  const handleGuardarCorreo = async () => {
    if (!correoNotificaciones.trim()) {
      toast.error("Por favor ingresa un correo electrónico")
      return
    }

    // Validación básica de formato de correo
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(correoNotificaciones)) {
      toast.error("Por favor ingresa un correo electrónico válido")
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch('/api/configuracion/correo-notificaciones', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ correo: correoNotificaciones }),
      })

      if (response.ok) {
        const data = await response.json()
        toast.success("Correo de notificaciones guardado correctamente")
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || "Error al guardar el correo")
      }
    } catch (error) {
      console.error('Error al guardar el correo:', error)
      toast.error("Error al guardar el correo de notificaciones")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Settings className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ajustes</h1>
          <p className="text-gray-600">Configuración y ajustes del sistema</p>
        </div>
      </div>

      {/* Content */}
      <div className="grid gap-6">
        {/* Correo de Notificaciones */}
        <Card className="bg-white/80 backdrop-blur-sm border border-gray-200 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-gray-600" />
              <div>
                <CardTitle className="text-lg">Correo de Notificaciones</CardTitle>
                <CardDescription>
                  Configura el correo electrónico donde se recibirán las notificaciones del sistema
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="correo-notificaciones">
                Correo Electrónico
              </Label>
              <div className="flex gap-3">
                <Input
                  id="correo-notificaciones"
                  type="email"
                  placeholder="ejemplo@empresa.com"
                  value={correoNotificaciones}
                  onChange={(e) => setCorreoNotificaciones(e.target.value)}
                  disabled={isLoading || isSaving}
                  className="flex-1"
                />
                <Button 
                  onClick={handleGuardarCorreo}
                  disabled={isLoading || isSaving}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Guardar
                    </>
                  )}
                </Button>
              </div>
            </div>
            <p className="text-sm text-gray-500">
              Este correo recibirá notificaciones importantes del sistema como nuevas solicitudes, 
              alertas y actualizaciones relevantes.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}