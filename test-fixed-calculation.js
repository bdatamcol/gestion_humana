// Test script to verify the fixed vacation days calculation
console.log('Testing fixed vacation days calculation...\n')

// Fixed calculation function (same as implemented in the components)
function calcularDiasVacacionesFixed(fechaInicio, fechaFin) {
  // Crear fechas en zona horaria local para evitar problemas de UTC
  const inicio = new Date(fechaInicio + 'T00:00:00')
  const fin = new Date(fechaFin + 'T00:00:00')
  
  let diasVacaciones = 0
  const fechaActual = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate())
  
  // Iterar día por día desde la fecha de inicio hasta la fecha de fin
  while (fechaActual <= fin) {
    // Solo contar si no es domingo (día 0)
    if (fechaActual.getDay() !== 0) {
      diasVacaciones++
    }
    // Avanzar al siguiente día
    fechaActual.setDate(fechaActual.getDate() + 1)
  }
  
  return diasVacaciones
}

// Test the problematic date range
const startDate = '2025-10-13'
const endDate = '2025-10-29'

console.log(`Testing date range: ${startDate} to ${endDate}`)
console.log(`Start date: ${new Date(startDate + 'T00:00:00').toDateString()}`)
console.log(`End date: ${new Date(endDate + 'T00:00:00').toDateString()}`)

const result = calcularDiasVacacionesFixed(startDate, endDate)
console.log(`\nFixed calculation result: ${result} days`)

// Detailed breakdown
console.log('\nDetailed breakdown:')
const start = new Date(startDate + 'T00:00:00')
const end = new Date(endDate + 'T00:00:00')
const current = new Date(start.getFullYear(), start.getMonth(), start.getDate())

let dayCount = 0
let sundayCount = 0

while (current <= end) {
  const dayName = current.toLocaleDateString('es-ES', { weekday: 'long' })
  const isSunday = current.getDay() === 0
  
  if (isSunday) {
    sundayCount++
    console.log(`${current.toDateString()} (${dayName}) - DOMINGO - Excluido`)
  } else {
    dayCount++
    console.log(`${current.toDateString()} (${dayName}) - Contado (${dayCount})`)
  }
  
  current.setDate(current.getDate() + 1)
}

console.log(`\nResumen:`)
console.log(`- Total de días en el rango: ${Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1}`)
console.log(`- Domingos excluidos: ${sundayCount}`)
console.log(`- Días laborables contados: ${dayCount}`)
console.log(`- Resultado esperado: 15 días`)
console.log(`- Resultado obtenido: ${result} días`)
console.log(`- ¿Corrección exitosa?: ${result === 15 ? 'SÍ ✓' : 'NO ✗'}`)