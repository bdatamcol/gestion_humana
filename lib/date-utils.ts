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
