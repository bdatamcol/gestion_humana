"use client"

import { useState, useEffect } from "react"
import { createSupabaseClient } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, Download, Eye, Calendar, User, Mail, Phone, FileText, MapPin, GraduationCap, Briefcase, Filter, RefreshCw } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface AplicacionTrabajo {
  id: string
  nombres: string
  apellidos: string
  email: string
  telefono: string
  documento_identidad: string
  tipo_documento: string
  fecha_nacimiento?: string
  direccion?: string
  ciudad?: string
  cargo_interes: string
  experiencia_laboral?: string
  nivel_educacion?: string
  hoja_vida_url?: string
  fecha_aplicacion: string
  fecha_actualizacion: string
}

const estadoColors = {
  nueva: "bg-blue-100 text-blue-800",
  en_revision: "bg-yellow-100 text-yellow-800",
  entrevista: "bg-purple-100 text-purple-800",
  rechazada: "bg-red-100 text-red-800",
  contratada: "bg-green-100 text-green-800"
}

const estadoLabels = {
  nueva: "Nueva",
  en_revision: "En Revisión",
  entrevista: "Entrevista",
  rechazada: "Rechazada",
  contratada: "Contratada"
}

export default function AplicacionesTrabajoPage() {
  const [aplicaciones, setAplicaciones] = useState<AplicacionTrabajo[]>([])
  const [filteredAplicaciones, setFilteredAplicaciones] = useState<AplicacionTrabajo[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [cargoFilter, setCargoFilter] = useState<string>("todos")
  const [selectedAplicacion, setSelectedAplicacion] = useState<AplicacionTrabajo | null>(null)
  const [cargos, setCargos] = useState<string[]>([])
  const [stats, setStats] = useState({
    total: 0
  })

  const supabase = createSupabaseClient()

  useEffect(() => {
    fetchAplicaciones()
  }, [])

  useEffect(() => {
    filterAplicaciones()
  }, [aplicaciones, searchTerm, cargoFilter])

  const fetchAplicaciones = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('aplicaciones_trabajo')
        .select('*')
        .order('fecha_aplicacion', { ascending: false })

      if (error) {
        console.error('Error fetching aplicaciones:', error)
        return
      }

      setAplicaciones(data || [])
      
      // Extraer cargos únicos
      const uniqueCargos = [...new Set((data || []).map(app => app.cargo_interes))]
      setCargos(uniqueCargos)

      // Calcular estadísticas
      const newStats = {
        total: data?.length || 0
      }
      setStats(newStats)

    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterAplicaciones = () => {
    let filtered = aplicaciones

    // Filtro por término de búsqueda
    if (searchTerm) {
      filtered = filtered.filter(app =>
        app.nombres.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.apellidos.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.cargo_interes.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.documento_identidad.includes(searchTerm)
      )
    }

    // Filtro por cargo
    if (cargoFilter !== "todos") {
      filtered = filtered.filter(app => app.cargo_interes === cargoFilter)
    }

    setFilteredAplicaciones(filtered)
  }

  const downloadCV = (url: string, nombre: string) => {
    const link = document.createElement('a')
    link.href = url
    link.download = `CV_${nombre.replace(/\s+/g, '_')}.pdf`
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-lg">Cargando aplicaciones...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Aplicaciones de Trabajo</h1>
          <p className="text-gray-600 mt-1">Gestiona las aplicaciones recibidas para las vacantes</p>
        </div>
        <Button onClick={fetchAplicaciones} variant="outline" className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          Actualizar
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar por nombre, email, documento o cargo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={cargoFilter} onValueChange={setCargoFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filtrar por cargo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los cargos</SelectItem>
                {cargos.map(cargo => (
                  <SelectItem key={cargo} value={cargo}>{cargo}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Resultados ({filteredAplicaciones.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredAplicaciones.length === 0 ? (
            <div className="text-center py-8">
              <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No se encontraron aplicaciones con los filtros seleccionados</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Candidato</TableHead>
                    <TableHead>Teléfono</TableHead>
                    <TableHead>Ciudad</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAplicaciones.map((aplicacion) => (
                    <TableRow key={aplicacion.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{aplicacion.nombres} {aplicacion.apellidos}</p>
                          <p className="text-sm text-gray-500">{aplicacion.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{aplicacion.telefono}</p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{aplicacion.ciudad || 'No especificada'}</p>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{format(new Date(aplicacion.fecha_aplicacion), 'dd/MM/yyyy', { locale: es })}</p>
                          <p className="text-gray-500">{format(new Date(aplicacion.fecha_aplicacion), 'HH:mm', { locale: es })}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedAplicacion(aplicacion)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>Detalles de la Aplicación</DialogTitle>
                                <DialogDescription>
                                  Información completa del candidato
                                </DialogDescription>
                              </DialogHeader>
                              {selectedAplicacion && (
                                <Tabs defaultValue="personal" className="w-full">
                                  <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="personal">Información Personal</TabsTrigger>
                                    <TabsTrigger value="profesional">Información Profesional</TabsTrigger>
                                  </TabsList>
                                  
                                  <TabsContent value="personal" className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div className="space-y-2">
                                        <label className="text-sm font-medium flex items-center gap-2">
                                          <User className="h-4 w-4" />
                                          Nombres
                                        </label>
                                        <p className="text-sm bg-gray-50 p-2 rounded">{selectedAplicacion.nombres}</p>
                                      </div>
                                      <div className="space-y-2">
                                        <label className="text-sm font-medium flex items-center gap-2">
                                          <User className="h-4 w-4" />
                                          Apellidos
                                        </label>
                                        <p className="text-sm bg-gray-50 p-2 rounded">{selectedAplicacion.apellidos}</p>
                                      </div>
                                      <div className="space-y-2">
                                        <label className="text-sm font-medium flex items-center gap-2">
                                          <Mail className="h-4 w-4" />
                                          Email
                                        </label>
                                        <p className="text-sm bg-gray-50 p-2 rounded">{selectedAplicacion.email}</p>
                                      </div>
                                      <div className="space-y-2">
                                        <label className="text-sm font-medium flex items-center gap-2">
                                          <Phone className="h-4 w-4" />
                                          Teléfono
                                        </label>
                                        <p className="text-sm bg-gray-50 p-2 rounded">{selectedAplicacion.telefono}</p>
                                      </div>
                                      <div className="space-y-2">
                                        <label className="text-sm font-medium flex items-center gap-2">
                                          <FileText className="h-4 w-4" />
                                          Documento
                                        </label>
                                        <p className="text-sm bg-gray-50 p-2 rounded">
                                          {selectedAplicacion.tipo_documento} {selectedAplicacion.documento_identidad}
                                        </p>
                                      </div>
                                      {selectedAplicacion.fecha_nacimiento && (
                                        <div className="space-y-2">
                                          <label className="text-sm font-medium flex items-center gap-2">
                                            <Calendar className="h-4 w-4" />
                                            Fecha de Nacimiento
                                          </label>
                                          <p className="text-sm bg-gray-50 p-2 rounded">
                                            {format(new Date(selectedAplicacion.fecha_nacimiento), 'dd/MM/yyyy', { locale: es })}
                                          </p>
                                        </div>
                                      )}
                                      {selectedAplicacion.direccion && (
                                        <div className="space-y-2">
                                          <label className="text-sm font-medium flex items-center gap-2">
                                            <MapPin className="h-4 w-4" />
                                            Dirección
                                          </label>
                                          <p className="text-sm bg-gray-50 p-2 rounded">{selectedAplicacion.direccion}</p>
                                        </div>
                                      )}
                                      {selectedAplicacion.ciudad && (
                                        <div className="space-y-2">
                                          <label className="text-sm font-medium flex items-center gap-2">
                                            <MapPin className="h-4 w-4" />
                                            Ciudad
                                          </label>
                                          <p className="text-sm bg-gray-50 p-2 rounded">{selectedAplicacion.ciudad}</p>
                                        </div>
                                      )}
                                    </div>
                                  </TabsContent>
                                  
                                  <TabsContent value="profesional" className="space-y-4">
                                    <div className="space-y-4">
                                      <div className="space-y-2">
                                        <label className="text-sm font-medium flex items-center gap-2">
                                          <Briefcase className="h-4 w-4" />
                                          Cargo de Interés
                                        </label>
                                        <p className="text-sm bg-gray-50 p-2 rounded">{selectedAplicacion.cargo_interes}</p>
                                      </div>
                                      {selectedAplicacion.nivel_educacion && (
                                        <div className="space-y-2">
                                          <label className="text-sm font-medium flex items-center gap-2">
                                            <GraduationCap className="h-4 w-4" />
                                            Nivel Educativo
                                          </label>
                                          <p className="text-sm bg-gray-50 p-2 rounded">{selectedAplicacion.nivel_educacion}</p>
                                        </div>
                                      )}
                                      {selectedAplicacion.experiencia_laboral && (
                                        <div className="space-y-2">
                                          <label className="text-sm font-medium flex items-center gap-2">
                                            <Briefcase className="h-4 w-4" />
                                            Experiencia Laboral
                                          </label>
                                          <div className="text-sm bg-gray-50 p-4 rounded whitespace-pre-wrap">
                                            {selectedAplicacion.experiencia_laboral}
                                          </div>
                                        </div>
                                      )}
                                      {selectedAplicacion.hoja_vida_url && (
                                        <div className="space-y-2">
                                          <label className="text-sm font-medium flex items-center gap-2">
                                            <FileText className="h-4 w-4" />
                                            Hoja de Vida
                                          </label>
                                          <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                                            <div className="flex items-center gap-3">
                                              <FileText className="h-8 w-8 text-blue-600" />
                                              <div>
                                                <p className="font-medium">Hoja de Vida</p>
                                                <p className="text-sm text-gray-500">Documento PDF/Word</p>
                                              </div>
                                            </div>
                                            <Button
                                              onClick={() => downloadCV(
                                                selectedAplicacion.hoja_vida_url!,
                                                `${selectedAplicacion.nombres}_${selectedAplicacion.apellidos}`
                                              )}
                                              className="flex items-center gap-2"
                                            >
                                              <Download className="h-4 w-4" />
                                              Descargar
                                            </Button>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </TabsContent>
                                </Tabs>
                              )}
                            </DialogContent>
                          </Dialog>
                          
                          {aplicacion.hoja_vida_url && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => downloadCV(
                                aplicacion.hoja_vida_url!,
                                `${aplicacion.nombres}_${aplicacion.apellidos}`
                              )}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}