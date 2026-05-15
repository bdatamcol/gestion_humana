export const isDateOnlyString = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value)

export const parseLocalDate = (value: string | Date) => {
  if (value instanceof Date) {
    return new Date(value)
  }

  if (isDateOnlyString(value)) {
    const [year, month, day] = value.split("-").map(Number)
    return new Date(year, month - 1, day)
  }

  return new Date(value)
}

export const formatLocalDate = (
  value: string | Date | null | undefined,
  locale: string = "es-CO",
  options?: Intl.DateTimeFormatOptions
) => {
  if (!value) return "Fecha no disponible"
  const parsed = parseLocalDate(value)
  if (isNaN(parsed.getTime())) return "Fecha inválida"
  return parsed.toLocaleDateString(locale, options)
}

export const diffDaysInclusive = (start: string | Date, end: string | Date) => {
  const startDate = parseLocalDate(start)
  const endDate = parseLocalDate(end)
  const normalizedStart = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate())
  const normalizedEnd = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate())
  const diffTime = normalizedEnd.getTime() - normalizedStart.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
}

const BOGOTA_OFFSET_HOURS = -5

export const bogotaDateTimeLocalToIso = (value: string) => {
  const [datePart, timePart] = value.split('T')
  if (!datePart || !timePart) {
    throw new Error('Formato de fecha y hora invalido')
  }

  const [year, month, day] = datePart.split('-').map(Number)
  const [hours, minutes] = timePart.split(':').map(Number)

  if (
    [year, month, day, hours, minutes].some((v) => Number.isNaN(v))
  ) {
    throw new Error('Formato de fecha y hora invalido')
  }

  const utcMillis = Date.UTC(year, month - 1, day, hours - BOGOTA_OFFSET_HOURS, minutes, 0)
  return new Date(utcMillis).toISOString()
}

export const isoToBogotaDateTimeLocal = (isoValue: string) => {
  const date = new Date(isoValue)
  if (Number.isNaN(date.getTime())) return ''

  const bogotaMillis = date.getTime() + BOGOTA_OFFSET_HOURS * 60 * 60 * 1000
  const bogotaDate = new Date(bogotaMillis)

  const year = bogotaDate.getUTCFullYear()
  const month = String(bogotaDate.getUTCMonth() + 1).padStart(2, '0')
  const day = String(bogotaDate.getUTCDate()).padStart(2, '0')
  const hours = String(bogotaDate.getUTCHours()).padStart(2, '0')
  const minutes = String(bogotaDate.getUTCMinutes()).padStart(2, '0')

  return `${year}-${month}-${day}T${hours}:${minutes}`
}
