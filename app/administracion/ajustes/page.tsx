"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Settings, Mail, Save, Loader2, X, Plus } from "lucide-react"
import { toast } from "sonner"

export default function AjustesPage() {
  const [correoNotificaciones, setCorreoNotificaciones] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [emailErrors, setEmailErrors] = useState<string[]>([])

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

  // Función para validar formato de correo
  const validarEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email.trim())
  }

  // Función para validar múltiples correos
  const validarMultiplesCorreos = (correos: string): { validos: string[], errores: string[] } => {
    const emails = correos.split(',').map(email => email.trim()).filter(email => email.length > 0)
    const validos: string[] = []
    const errores: string[] = []

    emails.forEach((email, index) => {
      if (validarEmail(email)) {
        validos.push(email)
      } else {
        errores.push(`Correo ${index + 1}: "${email}" no es válido`)
      }
    })

    return { validos, errores }
  }

  // Manejar cambios en el input
  const handleCorreoChange = (value: string) => {
    setCorreoNotificaciones(value)
    
    // Validar en tiempo real si hay múltiples correos
    if (value.includes(',')) {
      const { errores } = validarMultiplesCorreos(value)
      setEmailErrors(errores)
    } else {
      setEmailErrors([])
    }
  }

  const handleGuardarCorreo = async () => {
    if (!correoNotificaciones.trim()) {
      toast.error("Por favor ingresa al menos un correo electrónico")
      return
    }

    // Validar múltiples correos
    const { validos, errores } = validarMultiplesCorreos(correoNotificaciones)
    
    if (errores.length > 0) {
      setEmailErrors(errores)
      toast.error(`Se encontraron ${errores.length} correo(s) con formato inválido`)
      return
    }

    if (validos.length === 0) {
      toast.error("No se encontraron correos válidos")
      return
    }

    setEmailErrors([])
    setIsSaving(true)
    
    try {
      const response = await fetch('/api/configuracion/correo-notificaciones', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ correo: validos.join(', ') }),
      })

      if (response.ok) {
        const data = await response.json()
        setCorreoNotificaciones(validos.join(', '))
        toast.success(`Configuración guardada correctamente. ${validos.length} correo(s) configurado(s).`)
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || "Error al guardar la configuración")
      }
    } catch (error) {
      console.error('Error al guardar el correo:', error)
      toast.error("Error al guardar la configuración de correos")
    } finally {
      setIsSaving(false)
    }
  }

  // Obtener lista de correos para mostrar
  const getEmailList = () => {
    if (!correoNotificaciones.trim()) return []
    return correoNotificaciones.split(',').map(email => email.trim()).filter(email => email.length > 0)
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
                <CardTitle className="text-lg">Correos de Notificaciones</CardTitle>
                <CardDescription>
                  Configura los correos electrónicos donde se recibirán las notificaciones del sistema
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="correo-notificaciones">
                Correos Electrónicos (separados por comas)
              </Label>
              <div className="flex gap-3">
                <div className="flex-1">
                  <Input
                    id="correo-notificaciones"
                    type="text"
                    placeholder="ejemplo1@empresa.com, ejemplo2@empresa.com"
                    value={correoNotificaciones}
                    onChange={(e) => handleCorreoChange(e.target.value)}
                    disabled={isLoading || isSaving}
                    className={`${emailErrors.length > 0 ? 'border-red-300 focus:border-red-500' : ''}`}
                  />
                  {/* Mostrar errores de validación */}
                  {emailErrors.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {emailErrors.map((error, index) => (
                        <p key={index} className="text-sm text-red-600 flex items-center gap-1">
                          <X className="h-3 w-3" />
                          {error}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
                <Button 
                  onClick={handleGuardarCorreo}
                  disabled={isLoading || isSaving || emailErrors.length > 0}
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

            {/* Vista previa de correos configurados */}
            {getEmailList().length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  Correos configurados ({getEmailList().length}):
                </Label>
                <div className="flex flex-wrap gap-2">
                  {getEmailList().map((email, index) => (
                    <div
                      key={index}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${
                        validarEmail(email)
                          ? 'bg-green-100 text-green-800 border border-green-200'
                          : 'bg-red-100 text-red-800 border border-red-200'
                      }`}
                    >
                      <Mail className="h-3 w-3" />
                      {email}
                      {!validarEmail(email) && <X className="h-3 w-3" />}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-sm text-gray-500">
                Estos correos recibirán notificaciones importantes del sistema como nuevas solicitudes, 
                alertas y actualizaciones relevantes.
              </p>
              <p className="text-sm text-blue-600 font-medium">
                💡 Puedes agregar múltiples correos separándolos con comas. Cada correo será validado automáticamente.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}