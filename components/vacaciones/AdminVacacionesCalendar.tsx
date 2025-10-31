// components/vacaciones/AdminVacacionesCalendar.tsx
"use client"

import React, { useEffect, useState } from "react"
import { DayPicker, SelectRangeEventHandler } from "react-day-picker"
import "react-day-picker/dist/style.css"
import { eachDayOfInterval, isSameDay, format, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns"
import { es } from "date-fns/locale"
import { createSupabaseClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Loader2,
  Calendar,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Users,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface Disponibilidad {
  id: string
  fecha_inicio: string
  fecha_fin: string
  disponible: boolean
}

interface VacacionAprobada {
  id: string
  fecha_inicio: string
  fecha_fin: string
  usuario_nomina: {
    colaborador: string
    avatar_path: string
    empresas: {
      nombre: string
    }
    cargos: {
      nombre: string
    }
  }
}



// Navegación de meses personalizada
function MonthNavigation({
  currentMonth,
  setCurrentMonth,
}: {
  currentMonth: Date
  setCurrentMonth: (d: Date) => void
}) {
  const prev = () => {
    const d = new Date(currentMonth)
    d.setMonth(d.getMonth() - 1)
    setCurrentMonth(d)
  }
  const next = () => {
    const d = new Date(currentMonth)
    d.setMonth(d.getMonth() + 1)
    setCurrentMonth(d)
  }
  const today = () => setCurrentMonth(new Date())

  return (
    <div className="flex items-center justify-between rounded-lg bg-primary/5 p-2 mb-4">
      <Button variant="ghost" size="icon" onClick={prev} className="text-primary hover:bg-primary/10">
        <ChevronLeft className="h-5 w-5" />
      </Button>
      <Button variant="ghost" size="sm" onClick={today} className="font-medium hover:bg-primary/10">
        <Calendar className="h-4 w-4 mr-2" />
        {format(currentMonth, "MMMM yyyy", { locale: es })}
      </Button>
      <Button variant="ghost" size="icon" onClick={next} className="text-primary hover:bg-primary/10">
        <ChevronRight className="h-5 w-5" />
      </Button>
    </div>
  )
}

// Navegación para vacaciones aprobadas
function VacacionesNavigation({
  mesActual,
  setMesActual,
}: {
  mesActual: Date
  setMesActual: (d: Date) => void
}) {
  const prevMonth = () => {
    setMesActual(subMonths(mesActual, 1))
  }
  const nextMonth = () => {
    setMesActual(addMonths(mesActual, 1))
  }
  const currentMonth = () => setMesActual(new Date())

  return (
    <div className="flex items-center justify-between">
      <Button variant="ghost" size="icon" onClick={prevMonth} className="text-blue-600 hover:bg-blue-50">
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="sm" onClick={currentMonth} className="font-medium text-blue-700 hover:bg-blue-50">
        {format(mesActual, "MMMM yyyy", { locale: es })}
      </Button>
      <Button variant="ghost" size="icon" onClick={nextMonth} className="text-blue-600 hover:bg-blue-50">
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}

// Tarjeta de estadísticas
function StatisticCard({
  title,
  value,
  icon,
  colorClass,
}: {
  title: string
  value: number
  icon: React.ReactNode
  colorClass: string
}) {
  return (
    <div className={`flex items-center p-3 rounded-lg ${colorClass}`}>
      <div className="mr-3">{icon}</div>
      <div>
        <p className="text-sm font-medium opacity-90">{title}</p>
        <p className="text-xl font-bold">{value}</p>
      </div>
    </div>
  )
}

export default function AdminVacacionesCalendar() {
  const supabase = createSupabaseClient()

  const [disponibilidad, setDisponibilidad] = useState<Disponibilidad[]>([])
  const [selectedRange, setSelectedRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined })
  type DateRange = { from: Date | undefined; to: Date | undefined }
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  
  // Estados para la sección de vacaciones aprobadas
  const [vacacionesAprobadas, setVacacionesAprobadas] = useState<VacacionAprobada[]>([])
  const [mesVacaciones, setMesVacaciones] = useState(new Date())
  const [loadingVacaciones, setLoadingVacaciones] = useState(false)

  // Carga datos
  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      // Cargar disponibilidad global (sin filtro de empresa)
      const { data: dispData, error: dispErr } = await supabase
        .from("vacaciones_disponibilidad")
        .select("*")
        .order("fecha_inicio", { ascending: true })
      if (dispErr) throw dispErr



      setDisponibilidad(
        (dispData as unknown as Disponibilidad[])?.map((item) => ({
          id: item.id,
          fecha_inicio: item.fecha_inicio,
          fecha_fin: item.fecha_fin,
          disponible: item.disponible,
        })) || []
      )
    } catch (err: any) {
      console.error(err)
      setError(err.message || "Error al cargar datos")
    } finally {
      setLoading(false)
    }
  }

  // Función para cargar vacaciones aprobadas del mes
  const fetchVacacionesAprobadas = async (mes: Date) => {
    setLoadingVacaciones(true)
    try {
      const inicioMes = startOfMonth(mes)
      const finMes = endOfMonth(mes)
      
      const { data: vacacionesData, error: vacacionesErr } = await supabase
        .from("solicitudes_vacaciones")
        .select(`
          id,
          fecha_inicio,
          fecha_fin,
          usuario_id
        `)
        .eq("estado", "aprobado")
        .gte("fecha_inicio", inicioMes.toISOString().split('T')[0])
        .lte("fecha_inicio", finMes.toISOString().split('T')[0])
        .order("fecha_inicio", { ascending: true })
      
      if (vacacionesErr) {
        console.error('Error al cargar vacaciones aprobadas:', vacacionesErr)
        throw vacacionesErr
      }
      
      if (!vacacionesData || vacacionesData.length === 0) {
        setVacacionesAprobadas([])
        return
      }
      
      // Obtener los IDs únicos de usuarios
      const userIds = [...new Set(vacacionesData.map(v => v.usuario_id))]
      
      // Obtener datos de usuarios
      const { data: usuariosData, error: usuariosErr } = await supabase
        .from("usuario_nomina")
        .select(`
          auth_user_id,
          colaborador,
          avatar_path,
          empresas:empresa_id(nombre),
          cargos:cargo_id(nombre)
        `)
        .in('auth_user_id', userIds)
      
      if (usuariosErr) {
        console.error('Error al cargar datos de usuarios:', usuariosErr)
        throw usuariosErr
      }
      
      // Combinar datos
      const vacacionesConUsuarios = vacacionesData.map(vacacion => {
        const usuario = usuariosData?.find(u => u.auth_user_id === vacacion.usuario_id)
        return {
          ...vacacion,
          usuario_nomina: usuario || {
            colaborador: 'Usuario no encontrado',
            avatar_path: '',
            empresas: { nombre: '' },
            cargos: { nombre: '' }
          }
        }
      })
      
      setVacacionesAprobadas(vacacionesConUsuarios as VacacionAprobada[] || [])
    } catch (err: any) {
      console.error('Error en fetchVacacionesAprobadas:', err)
    } finally {
      setLoadingVacaciones(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])
  
  useEffect(() => {
    fetchVacacionesAprobadas(mesVacaciones)
  }, [mesVacaciones])

  const onSelect: SelectRangeEventHandler = (range) => {
    setSelectedRange(range ? { from: range.from, to: range.to ?? undefined } : { from: undefined, to: undefined })
    setSuccessMessage(null)
  }

  const handleDisable = async () => {
    if (!selectedRange.from || !selectedRange.to) return
    setActionLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase.from("vacaciones_disponibilidad").insert([
        {
          empresa_id: 1, // Default empresa_id since we're now using a global calendar
          fecha_inicio: selectedRange.from.toISOString().slice(0, 10),
          fecha_fin: selectedRange.to.toISOString().slice(0, 10),
          disponible: false,
        },
      ])
      
      if (error) {
        console.error("Supabase error:", error)
        throw error
      }
      
      await fetchData()
      setSelectedRange({ from: undefined, to: undefined })
      setSuccessMessage("Días deshabilitados correctamente")
    } catch (err: any) {
      console.error("Error in handleDisable:", err)
      setError(err.message || "Error al deshabilitar días")
    } finally {
      setActionLoading(false)
    }
  }

  const handleEnable = async () => {
    if (!selectedRange.from || !selectedRange.to) return
    setActionLoading(true)
    setError(null)
    try {
      // Encontrar los registros de disponibilidad que se superponen con el rango seleccionado
      const startDate = selectedRange.from.toISOString().slice(0, 10)
      const endDate = selectedRange.to.toISOString().slice(0, 10)
      
      const { data: overlappingRecords, error: fetchError } = await supabase
        .from("vacaciones_disponibilidad")
        .select("*")
        .eq("disponible", false)
        .lte("fecha_inicio", endDate)
        .gte("fecha_fin", startDate)
      
      if (fetchError) {
        console.error("Error fetching overlapping records:", fetchError)
        throw fetchError
      }
      
      if (overlappingRecords && overlappingRecords.length > 0) {
        // Eliminar todos los registros que se superponen
        const idsToDelete = overlappingRecords.map(record => record.id as string)
        const { error: deleteError } = await supabase
          .from("vacaciones_disponibilidad")
          .delete()
          .in("id", idsToDelete)
        
        if (deleteError) {
          console.error("Error deleting records:", deleteError)
          throw deleteError
        }
        
        // Crear nuevos registros para las partes que quedan deshabilitadas
        const newRecords = []
        
        for (const record of overlappingRecords) {
          const recordStart = new Date(record.fecha_inicio as string)
          const recordEnd = new Date(record.fecha_fin as string)
          const selectedStart = new Date(startDate)
          const selectedEnd = new Date(endDate)
          
          // Si hay una parte antes del rango seleccionado
          if (recordStart < selectedStart) {
            const beforeEnd = new Date(selectedStart)
            beforeEnd.setDate(beforeEnd.getDate() - 1)
            newRecords.push({
              empresa_id: record.empresa_id as string,
              fecha_inicio: record.fecha_inicio as string,
              fecha_fin: beforeEnd.toISOString().slice(0, 10),
              disponible: false
            })
          }
          
          // Si hay una parte después del rango seleccionado
          if (recordEnd > selectedEnd) {
            const afterStart = new Date(selectedEnd)
            afterStart.setDate(afterStart.getDate() + 1)
            newRecords.push({
              empresa_id: record.empresa_id as string,
              fecha_inicio: afterStart.toISOString().slice(0, 10),
              fecha_fin: record.fecha_fin as string,
              disponible: false
            })
          }
        }
        
        // Insertar los nuevos registros si existen
        if (newRecords.length > 0) {
          const { error: insertError } = await supabase
            .from("vacaciones_disponibilidad")
            .insert(newRecords)
          
          if (insertError) {
            console.error("Error inserting new records:", insertError)
            throw insertError
          }
        }
      }
      
      await fetchData()
      setSelectedRange({ from: undefined, to: undefined })
      setSuccessMessage("Días habilitados correctamente")
    } catch (err: any) {
      console.error("Error in handleEnable:", err)
      setError(err.message || "Error al habilitar días")
    } finally {
      setActionLoading(false)
    }
  }



  // Construcción de modificadores
  const blockedDays = disponibilidad
    .filter((d) => !d.disponible)
    .flatMap((d) => {
      // Crear fechas locales para evitar problemas de zona horaria
      const [startYear, startMonth, startDay] = d.fecha_inicio.split('-').map(Number)
      const [endYear, endMonth, endDay] = d.fecha_fin.split('-').map(Number)
      return eachDayOfInterval({
        start: new Date(startYear, startMonth - 1, startDay),
        end: new Date(endYear, endMonth - 1, endDay),
      })
    })



  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground">Cargando calendario…</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {successMessage && (
        <Alert variant="default" className="mb-4 bg-green-50 text-green-700 border-green-200">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Calendario */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="shadow-lg border-0 w-full">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center">
                  <Calendar className="h-5 w-5 mr-2 text-primary" />
                  Gestión de días
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <MonthNavigation currentMonth={currentMonth} setCurrentMonth={setCurrentMonth} />
                <div className="p-3 border rounded-lg bg-white shadow-sm">
                  <DayPicker
                    mode="range"
                    month={currentMonth}
                    onMonthChange={setCurrentMonth}
                    selected={selectedRange}
                    onSelect={onSelect}
                    modifiers={{
                      blocked: blockedDays,
                    }}
                    modifiersClassNames={{
                      blocked: "bg-gray-200 text-gray-500",
                      selected: "bg-blue-500 text-white",
                      range_start: "rounded-l-full",
                      range_end: "rounded-r-full",
                      range_middle: "bg-blue-300 text-white",
                    }}
                    numberOfMonths={2}
                    captionLayout="dropdown"
                    locale={es}
                    classNames={{
                      day: "h-10 w-10 text-base font-medium",
                      caption: "hidden",
                      nav: "hidden",
                      months: "flex gap-4",
                      month: "flex-1",
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          
          {/* Rango seleccionado - Movido debajo del calendario */}
          {selectedRange.from && selectedRange.to && (() => {
            // Verificar si el rango seleccionado contiene días bloqueados
            const selectedDays = eachDayOfInterval({
              start: selectedRange.from,
              end: selectedRange.to,
            })
            
            const hasBlockedDays = selectedDays.some(day => 
              blockedDays.some(blockedDay => 
                day.getTime() === blockedDay.getTime()
              )
            )
            
            return (
              <Card className="shadow-md border-0 bg-blue-50 w-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg text-blue-800 text-center">Rango seleccionado</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="mb-4 font-medium text-blue-700 text-sm text-center">
                    {format(selectedRange.from, "d 'de' MMMM", { locale: es })} al{" "}
                    {format(selectedRange.to, "d 'de' MMMM", { locale: es })}
                  </p>
                  <div className="flex gap-3 justify-center">
                    {hasBlockedDays ? (
                      <Button
                        onClick={handleEnable}
                        disabled={actionLoading}
                        className="bg-green-600 hover:bg-green-700 text-sm"
                        size="sm"
                      >
                        {actionLoading ? (
                          <Loader2 className="animate-spin mr-2 h-4 w-4" />
                        ) : (
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                        )}
                        Habilitar días
                      </Button>
                    ) : (
                      <Button
                        onClick={handleDisable}
                        disabled={actionLoading}
                        className="bg-red-600 hover:bg-red-700 text-sm"
                        size="sm"
                      >
                        {actionLoading ? (
                          <Loader2 className="animate-spin mr-2 h-4 w-4" />
                        ) : (
                          <XCircle className="mr-2 h-4 w-4" />
                        )}
                        Deshabilitar días
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })()}
        </div>

        {/* Panel derecho */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="shadow-md border-0">
            <CardContent className="pt-6">
              <div className="flex justify-between gap-6">
                {/* Leyenda */}
                <div className="flex-1">
                  <h4 className="text-lg font-medium mb-2">Leyenda</h4>
                  <div className="grid grid-cols-1 gap-2">
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 bg-gray-200 rounded-full" />
                      <span className="text-sm">Días deshabilitados</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 bg-blue-500 rounded-full" />
                      <span className="text-sm">Días seleccionados</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 bg-white border border-gray-300 rounded-full" />
                      <span className="text-sm">Días disponibles</span>
                    </div>
                  </div>
                </div>
                
                {/* Estadísticas */}
                <div className="flex-1">
                  <h4 className="text-lg font-medium mb-2">Estadísticas</h4>
                  <StatisticCard
                    title="Días deshabilitados"
                    value={blockedDays.length}
                    icon={<XCircle className="h-5 w-5 text-gray-600" />}
                    colorClass="bg-gray-50"
                  />
                </div>
              </div>
            </CardContent>
          </Card>



          <div className="text-sm text-muted-foreground bg-white p-3 rounded-lg border shadow-sm">
            Última actualización: {new Date().toLocaleString("es-ES")}
          </div>
          
          {/* Sección de Vacaciones Aprobadas */}
          <Card className="shadow-md border-0">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center text-lg">
                  <Users className="h-5 w-5 mr-2 text-blue-600" />
                  De vacaciones actualmente
                </CardTitle>
                <VacacionesNavigation 
                  mesActual={mesVacaciones} 
                  setMesActual={setMesVacaciones} 
                />
              </div>
            </CardHeader>
            <CardContent>
              {loadingVacaciones ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600 mr-2" />
                  <span className="text-sm text-muted-foreground">Cargando vacaciones...</span>
                </div>
              ) : vacacionesAprobadas.length > 0 ? (
                <div className="space-y-3">
                  {vacacionesAprobadas.map((vacacion) => {
                    // Extraer primer nombre y primer apellido
                    const nombreCompleto = vacacion.usuario_nomina?.colaborador || "Sin nombre"
                    const partesNombre = nombreCompleto.split(" ")
                    const primerNombre = partesNombre[0] || ""
                    const primerApellido = partesNombre[1] || ""
                    const nombreMostrar = `${primerNombre} ${primerApellido}`.trim()
                    
                    return (
                      <div key={vacacion.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-100">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage 
                                src={vacacion.usuario_nomina?.avatar_path ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatar/${vacacion.usuario_nomina.avatar_path}` : undefined} 
                                alt={nombreMostrar}
                                className="object-cover"
                              />
                              <AvatarFallback className="bg-blue-600 text-white text-sm font-medium">
                                {primerNombre.charAt(0)}{primerApellido.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-blue-900">{nombreMostrar}</p>
                              <div className="flex items-center gap-2 text-xs text-blue-700">
                                <span className="bg-blue-200 px-2 py-1 rounded">
                                  {vacacion.usuario_nomina?.empresas?.nombre || "Sin empresa"}
                                </span>
                                <span className="bg-blue-200 px-2 py-1 rounded">
                                  {vacacion.usuario_nomina?.cargos?.nombre || "Sin cargo"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-blue-800">
                            {format(new Date(vacacion.fecha_inicio), "d MMM", { locale: es })} - {format(new Date(vacacion.fecha_fin), "d MMM", { locale: es })}
                          </p>
                          <p className="text-xs text-blue-600">
                            {(() => {
                              // Crear fechas en zona horaria local para evitar problemas de UTC
                              const start = new Date(vacacion.fecha_inicio + 'T00:00:00')
                              const end = new Date(vacacion.fecha_fin + 'T00:00:00')
                              
                              let diasVacaciones = 0
                              const fechaActual = new Date(start.getFullYear(), start.getMonth(), start.getDate())
                              
                              // Iterar día por día desde la fecha de inicio hasta la fecha de fin
                              while (fechaActual <= end) {
                                // Solo contar si no es domingo (día 0)
                                if (fechaActual.getDay() !== 0) {
                                  diasVacaciones++
                                }
                                // Avanzar al siguiente día
                                fechaActual.setDate(fechaActual.getDate() + 1)
                              }
                              
                              return diasVacaciones
                            })()} días
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    No hay vacaciones aprobadas en {format(mesVacaciones, "MMMM yyyy", { locale: es })}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
