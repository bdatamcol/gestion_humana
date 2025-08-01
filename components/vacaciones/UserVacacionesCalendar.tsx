"use client"

import React, { useEffect, useState } from "react"
import { DayPicker, SelectRangeEventHandler } from "react-day-picker"
import "react-day-picker/dist/style.css"
import { eachDayOfInterval, format } from "date-fns"
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
} from "lucide-react"
import "./calendar-styles.css"

interface Disponibilidad {
  id: string
  fecha_inicio: string
  fecha_fin: string
  disponible: boolean
}

interface Vacacion {
  id: string
  fecha_inicio: string
  fecha_fin: string
  usuario_id: string
}

interface UserVacacionesCalendarProps {
  onDateRangeSelect: (range: { from: Date | undefined; to: Date | undefined }) => void
  selectedRange: { from: Date | undefined; to: Date | undefined }
  userCompanyId?: string
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

export default function UserVacacionesCalendar({ onDateRangeSelect, selectedRange, userCompanyId }: UserVacacionesCalendarProps) {
  const [disponibilidad, setDisponibilidad] = useState<Disponibilidad[]>([])
  const [vacaciones, setVacaciones] = useState<Vacacion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const supabase = createSupabaseClient()

  const fetchData = async () => {
    try {
      setError(null)
      // Cargar disponibilidad (fechas deshabilitadas)
      const { data: dispData, error: dispErr } = await supabase
        .from("vacaciones_disponibilidad")
        .select("*")
      if (dispErr) throw dispErr

      // Cargar vacaciones aprobadas - nueva implementación más robusta
      let vacData: any[] = []
      
      // Validar que userCompanyId sea un valor válido (no null, undefined, o string vacío)
      const isValidCompanyId = userCompanyId && userCompanyId.trim() !== '' && userCompanyId !== 'null' && userCompanyId !== 'undefined'
      
      if (isValidCompanyId) {
        console.log('Filtrando vacaciones por empresa ID:', userCompanyId)
        
        // Convertir a número para la consulta
        const companyIdNumber = parseInt(userCompanyId, 10)
        
        if (isNaN(companyIdNumber)) {
          console.warn('ID de empresa no es un número válido:', userCompanyId)
          // Fallback: cargar todas las vacaciones
          const { data, error: vacErr } = await supabase
            .from("solicitudes_vacaciones")
            .select("id, fecha_inicio, fecha_fin, usuario_id")
            .eq("estado", "aprobado")
          if (vacErr) throw vacErr
          vacData = data
        } else {
          // Obtener usuarios de la misma empresa usando el ID numérico
          const { data: usuarios, error: usuariosErr } = await supabase
            .from("usuario_nomina")
            .select("auth_user_id")
            .eq("empresa_id", companyIdNumber)
          
          if (usuariosErr) {
            console.error('Error obteniendo usuarios de la empresa:', usuariosErr)
            // Fallback: cargar todas las vacaciones
            const { data, error: vacErr } = await supabase
              .from("solicitudes_vacaciones")
              .select("id, fecha_inicio, fecha_fin, usuario_id")
              .eq("estado", "aprobado")
            if (vacErr) throw vacErr
            vacData = data
          } else if (usuarios && usuarios.length > 0) {
            const userIds = usuarios.map(u => u.auth_user_id).filter(id => id) // Filtrar IDs válidos
            
            if (userIds.length > 0) {
              const { data, error: vacErr } = await supabase
                .from("solicitudes_vacaciones")
                .select("id, fecha_inicio, fecha_fin, usuario_id")
                .eq("estado", "aprobado")
                .in("usuario_id", userIds)
              
              if (vacErr) {
                console.error('Error obteniendo vacaciones:', vacErr)
                throw vacErr
              }
              vacData = data
            } else {
              console.log('No se encontraron usuarios válidos para la empresa')
              vacData = []
            }
          } else {
            console.log('No se encontraron usuarios para la empresa ID:', companyIdNumber)
            vacData = []
          }
        }
      } else {
        console.log('ID de empresa no válido, cargando todas las vacaciones')
        // Si no hay empresa válida, cargar todas las vacaciones
        const { data, error: vacErr } = await supabase
          .from("solicitudes_vacaciones")
          .select("id, fecha_inicio, fecha_fin, usuario_id")
          .eq("estado", "aprobado")
        if (vacErr) throw vacErr
        vacData = data
      }

      setDisponibilidad(
        (dispData as unknown as Disponibilidad[])?.map((item) => ({
          id: item.id,
          fecha_inicio: item.fecha_inicio,
          fecha_fin: item.fecha_fin,
          disponible: item.disponible,
        })) || []
      )
      setVacaciones((vacData || []).map(v => ({
        id: String(v.id),
        fecha_inicio: String(v.fecha_inicio),
        fecha_fin: String(v.fecha_fin), 
        usuario_id: String(v.usuario_id)
      })))
    } catch (err: any) {
      console.error('Error en fetchData:', err)
      const errorMessage = err?.message || err?.error_description || err?.details || JSON.stringify(err) || "Error al cargar datos"
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const onSelect: SelectRangeEventHandler = (range) => {
    const newRange = range ? { from: range.from, to: range.to ?? undefined } : { from: undefined, to: undefined }
    onDateRangeSelect(newRange)
  }

  // Construcción de modificadores
  const blockedDays = disponibilidad
    .filter((d) => !d.disponible && d.fecha_inicio && d.fecha_fin)
    .flatMap((d) => {
      try {
        const [startYear, startMonth, startDay] = d.fecha_inicio.split('-').map(Number)
        const [endYear, endMonth, endDay] = d.fecha_fin.split('-').map(Number)
        const start = new Date(startYear, startMonth - 1, startDay)
        const end = new Date(endYear, endMonth - 1, endDay)
        return eachDayOfInterval({ start, end })
      } catch (error) {
        console.error('Error procesando fecha de disponibilidad:', d, error)
        return []
      }
    })

  const bookedDays = vacaciones
    .filter((v) => v.fecha_inicio && v.fecha_fin)
    .flatMap((v) => {
      try {
        const [startYear, startMonth, startDay] = v.fecha_inicio.split('-').map(Number)
        const [endYear, endMonth, endDay] = v.fecha_fin.split('-').map(Number)
        const start = new Date(startYear, startMonth - 1, startDay)
        const end = new Date(endYear, endMonth - 1, endDay)
        return eachDayOfInterval({ start, end })
      } catch (error) {
        console.error('Error procesando fecha de vacación:', v, error)
        return []
      }
    })

  // Función para identificar domingos
  const isSunday = (date: Date) => date.getDay() === 0

  const modifiers = {
    booked: bookedDays,
    blocked: blockedDays,
    sunday: isSunday,
  }

  const modifiersClassNames = {
    booked: "rdp-day_booked",
    blocked: "rdp-day_blocked",
    sunday: "rdp-day_sunday",
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Cargando calendario...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Seleccionar fechas de vacaciones
          </CardTitle>
        </CardHeader>
        <CardContent>
          <MonthNavigation currentMonth={currentMonth} setCurrentMonth={setCurrentMonth} />
          
          <div className="flex justify-center">
            <DayPicker
              mode="range"
              selected={selectedRange}
              onSelect={onSelect}
              month={currentMonth}
              onMonthChange={setCurrentMonth}
              locale={es}
              disabled={[...blockedDays, ...bookedDays, { before: new Date() }, isSunday]}
              modifiers={modifiers}
              modifiersClassNames={modifiersClassNames}
              className="rdp-custom"
              numberOfMonths={1}
              classNames={{
                day: "h-9 w-9 text-sm font-medium",
                months: "flex justify-center",
                month: "space-y-4",
              }}

            />
          </div>
          
          {/* Leyenda */}
          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-200 border border-red-300 rounded"></div>
              <span>Días ocupados</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-200 border border-gray-300 rounded"></div>
              <span>Días no disponibles</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-orange-200 border border-orange-300 rounded"></div>
              <span>Domingos (excluidos del conteo)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-200 border border-blue-300 rounded"></div>
              <span>Rango seleccionado</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
