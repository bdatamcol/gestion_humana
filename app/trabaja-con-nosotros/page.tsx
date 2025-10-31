"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Upload, CheckCircle, AlertCircle, Briefcase, Users, Target, Award } from "lucide-react"
import { createSupabaseClient } from "@/lib/supabase"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import RecaptchaProvider from "@/components/recaptcha-provider"
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3'

interface FormData {
  nombres: string
  apellidos: string
  email: string
  telefono: string
  documento_identidad: string
  tipo_documento: string
  fecha_nacimiento: string
  direccion: string
  ciudad: string
  experiencia_laboral: string
  nivel_educacion: string
  hoja_vida: File | null
}

export default function TrabajaConNosotros() {
  return (
    <RecaptchaProvider>
      <TrabajaConNosotrosContent />
    </RecaptchaProvider>
  )
}

function TrabajaConNosotrosContent() {
  const { executeRecaptcha } = useGoogleReCaptcha()
  const [formData, setFormData] = useState<FormData>({
    nombres: "",
    apellidos: "",
    email: "",
    telefono: "",
    documento_identidad: "",
    tipo_documento: "CC",
    fecha_nacimiento: "",
    direccion: "",
    ciudad: "",
    experiencia_laboral: "",
    nivel_educacion: "",
    hoja_vida: null,
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState("")
  const [dragActive, setDragActive] = useState(false)
  const [showConfirmationModal, setShowConfirmationModal] = useState(false)

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleFileChange = (file: File | null) => {
    setFormData(prev => ({ ...prev, hoja_vida: file }))
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      if (file.type === "application/pdf" || file.type.startsWith("application/vnd.openxmlformats-officedocument.wordprocessingml")) {
        handleFileChange(file)
      } else {
        setErrorMessage("Solo se permiten archivos PDF o Word (.docx)")
        setSubmitStatus('error')
      }
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      if (file.type === "application/pdf" || file.type.startsWith("application/vnd.openxmlformats-officedocument.wordprocessingml")) {
        handleFileChange(file)
      } else {
        setErrorMessage("Solo se permiten archivos PDF o Word (.docx)")
        setSubmitStatus('error')
      }
    }
  }

  const validateForm = (): boolean => {
    const requiredFields = [
      'nombres', 'apellidos', 'email', 'telefono', 'documento_identidad',
      'fecha_nacimiento', 'direccion', 'ciudad', 'nivel_educacion'
    ]

    for (const field of requiredFields) {
      if (!formData[field as keyof FormData]) {
        setErrorMessage(`El campo ${field.replace('_', ' ')} es requerido`)
        setSubmitStatus('error')
        return false
      }
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      setErrorMessage("Por favor ingresa un email válido")
      setSubmitStatus('error')
      return false
    }

    // Validar teléfono
    const phoneRegex = /^[0-9]{10}$/
    if (!phoneRegex.test(formData.telefono.replace(/\s/g, ''))) {
      setErrorMessage("El teléfono debe tener 10 dígitos")
      setSubmitStatus('error')
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setIsSubmitting(true)
    setSubmitStatus('idle')
    setErrorMessage("")

    try {
      // Ejecutar reCAPTCHA solo en producción
      if (process.env.NODE_ENV === 'production' && executeRecaptcha) {
        const token = await executeRecaptcha('job_application')
        
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

      // Crear FormData para enviar el archivo directamente al API
      const formDataToSend = new FormData()
      
      // Agregar todos los campos del formulario
      formDataToSend.append('nombres', formData.nombres)
      formDataToSend.append('apellidos', formData.apellidos)
      formDataToSend.append('email', formData.email)
      formDataToSend.append('telefono', formData.telefono)
      formDataToSend.append('documento_identidad', formData.documento_identidad)
      formDataToSend.append('tipo_documento', formData.tipo_documento)
      formDataToSend.append('fecha_nacimiento', formData.fecha_nacimiento)
      formDataToSend.append('direccion', formData.direccion)
      formDataToSend.append('ciudad', formData.ciudad)
      formDataToSend.append('experiencia_laboral', formData.experiencia_laboral)
      formDataToSend.append('nivel_educacion', formData.nivel_educacion)
      
      // Agregar el archivo si existe
      if (formData.hoja_vida) {
        formDataToSend.append('hoja_vida', formData.hoja_vida)
      }

      // Enviar al API que manejará tanto la base de datos como el email con adjunto
      const response = await fetch('/api/aplicaciones-trabajo', {
        method: 'POST',
        body: formDataToSend, // Enviar como FormData, no JSON
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al enviar la aplicación')
      }

      setSubmitStatus('success')
      setShowConfirmationModal(true)
      
      // Limpiar formulario
      setFormData({
        nombres: "",
        apellidos: "",
        email: "",
        telefono: "",
        documento_identidad: "",
        tipo_documento: "CC",
        fecha_nacimiento: "",
        direccion: "",
        ciudad: "",
        experiencia_laboral: "",
        nivel_educacion: "",
        hoja_vida: null,
      })

    } catch (error: any) {
      setErrorMessage(error.message)
      setSubmitStatus('error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <Header />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Trabaja con Nosotros
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Forma parte de nuestro equipo y contribuye al crecimiento de una organización comprometida con la excelencia y el desarrollo profesional.
          </p>
          
          {/* Features */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <Users className="w-8 h-8 text-blue-600 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Ambiente Colaborativo</h3>
              <p className="text-gray-600 text-sm">Trabajamos en equipo para alcanzar objetivos comunes</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <Target className="w-8 h-8 text-green-600 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Crecimiento Profesional</h3>
              <p className="text-gray-600 text-sm">Oportunidades de desarrollo y capacitación continua</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <Award className="w-8 h-8 text-purple-600 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Reconocimiento</h3>
              <p className="text-gray-600 text-sm">Valoramos y reconocemos el talento y la dedicación</p>
            </div>
          </div>
        </div>

        {/* Formulario */}
        <Card className="bg-white shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Aplicación de Empleo</CardTitle>
            <CardDescription className="text-center">
              Completa todos los campos para enviar tu aplicación
            </CardDescription>
          </CardHeader>
          <CardContent>
            {submitStatus === 'success' && (
              <Alert className="mb-6 border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  ¡Tu aplicación ha sido enviada exitosamente! Nos pondremos en contacto contigo pronto.
                </AlertDescription>
              </Alert>
            )}

            {submitStatus === 'error' && (
              <Alert className="mb-6 border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  {errorMessage}
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Información Personal */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                  Información Personal
                </h3>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="nombres">Nombres *</Label>
                    <Input
                      id="nombres"
                      value={formData.nombres}
                      onChange={(e) => handleInputChange('nombres', e.target.value)}
                      placeholder="Ingresa tus nombres"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="apellidos">Apellidos *</Label>
                    <Input
                      id="apellidos"
                      value={formData.apellidos}
                      onChange={(e) => handleInputChange('apellidos', e.target.value)}
                      placeholder="Ingresa tus apellidos"
                      required
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="tu@email.com"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="telefono">Teléfono *</Label>
                    <Input
                      id="telefono"
                      value={formData.telefono}
                      onChange={(e) => handleInputChange('telefono', e.target.value)}
                      placeholder="3001234567"
                      required
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="tipo_documento">Tipo de Documento *</Label>
                    <Select value={formData.tipo_documento} onValueChange={(value) => handleInputChange('tipo_documento', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CC">Cédula de Ciudadanía</SelectItem>
                        <SelectItem value="CE">Cédula de Extranjería</SelectItem>
                        <SelectItem value="PA">Pasaporte</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="documento_identidad">Número de Documento *</Label>
                    <Input
                      id="documento_identidad"
                      value={formData.documento_identidad}
                      onChange={(e) => handleInputChange('documento_identidad', e.target.value)}
                      placeholder="12345678"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="fecha_nacimiento">Fecha de Nacimiento *</Label>
                    <Input
                      id="fecha_nacimiento"
                      type="date"
                      value={formData.fecha_nacimiento}
                      onChange={(e) => handleInputChange('fecha_nacimiento', e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="direccion">Dirección *</Label>
                    <Input
                      id="direccion"
                      value={formData.direccion}
                      onChange={(e) => handleInputChange('direccion', e.target.value)}
                      placeholder="Calle 123 #45-67"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="ciudad">Ciudad *</Label>
                    <Input
                      id="ciudad"
                      value={formData.ciudad}
                      onChange={(e) => handleInputChange('ciudad', e.target.value)}
                      placeholder="Bogotá"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Información Profesional */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                  Información Profesional
                </h3>

                <div>
                  <Label htmlFor="nivel_educacion">Nivel de Educación *</Label>
                  <Select value={formData.nivel_educacion} onValueChange={(value) => handleInputChange('nivel_educacion', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona tu nivel educativo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bachiller">Bachiller</SelectItem>
                      <SelectItem value="tecnico">Técnico</SelectItem>
                      <SelectItem value="tecnologo">Tecnólogo</SelectItem>
                      <SelectItem value="universitario">Universitario</SelectItem>
                      <SelectItem value="especializacion">Especialización</SelectItem>
                      <SelectItem value="maestria">Maestría</SelectItem>
                      <SelectItem value="doctorado">Doctorado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="experiencia_laboral">Experiencia Laboral</Label>
                  <Textarea
                    id="experiencia_laboral"
                    value={formData.experiencia_laboral}
                    onChange={(e) => handleInputChange('experiencia_laboral', e.target.value)}
                    placeholder="Describe tu experiencia laboral relevante..."
                    rows={4}
                  />
                </div>
              </div>

              {/* Hoja de Vida */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                  Hoja de Vida
                </h3>

                <div
                  className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                    dragActive 
                      ? 'border-blue-400 bg-blue-50' 
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 mb-2">
                    {formData.hoja_vida 
                      ? `Archivo seleccionado: ${formData.hoja_vida.name}`
                      : 'Arrastra tu hoja de vida aquí o haz clic para seleccionar'
                    }
                  </p>
                  <p className="text-sm text-gray-500 mb-4">
                    Formatos permitidos: PDF, Word (.docx) - Máximo 5MB
                  </p>
                  <input
                    type="file"
                    accept=".pdf,.docx"
                    onChange={handleFileInput}
                    className="hidden"
                    id="file-upload"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('file-upload')?.click()}
                  >
                    Seleccionar archivo
                  </Button>
                </div>
              </div>

              {/* Botón de envío */}
              <div className="pt-6">
                <Button
                  type="submit"
                  className="w-full text-black bg-[#F2C36B] hover:bg-[#F2CF8D]"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Enviando aplicación...' : 'Enviar Aplicación'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <Footer />

      {/* Confirmation Modal */}
      <Dialog open={showConfirmationModal} onOpenChange={setShowConfirmationModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-5 h-5" />
              ¡Aplicación Enviada Exitosamente!
            </DialogTitle>
            <DialogDescription className="text-center pt-4">
              Tu aplicación de empleo ha sido enviada correctamente. 
              <br />
              <br />
              Nuestro equipo de recursos humanos revisará tu información y se pondrá en contacto contigo pronto.
              <br />
              <br />
              ¡Gracias por tu interés en formar parte de nuestro equipo!
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center pt-4">
            <Button 
              onClick={() => setShowConfirmationModal(false)}
              className="bg-green-600 hover:bg-green-700"
            >
              Entendido
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}