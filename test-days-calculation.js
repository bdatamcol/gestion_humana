// Test script to verify vacation days calculation
// Testing the issue with October 13-29, 2025 (should be 15 days, not 14)

// Current correct logic from user form
function calcularDiasVacacionesCorrect(fechaInicio, fechaFin) {
  const inicio = new Date(fechaInicio)
  const fin = new Date(fechaFin)
  
  let diasVacaciones = 0
  const fechaActual = new Date(inicio)
  
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

// Current incorrect logic from admin pages
function calcularDiasVacacionesIncorrect(inicio, fin) {
  const start = new Date(inicio)
  const end = new Date(fin)
  const diffMs = end.getTime() - start.getTime()
  return Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1
}

// Test with the problematic date range: October 13-29, 2025
const fechaInicio = '2025-10-13'
const fechaFin = '2025-10-29'

console.log('=== TESTING VACATION DAYS CALCULATION ===')
console.log(`Date range: ${fechaInicio} to ${fechaFin}`)
console.log('')

// Test correct calculation (from user form)
const diasCorrectos = calcularDiasVacacionesCorrect(fechaInicio, fechaFin)
console.log(`✅ Correct calculation (excluding Sundays): ${diasCorrectos} days`)

// Test incorrect calculation (from admin pages)
const diasIncorrectos = calcularDiasVacacionesIncorrect(fechaInicio, fechaFin)
console.log(`❌ Incorrect calculation (simple diff): ${diasIncorrectos} days`)

console.log('')
console.log('=== DETAILED ANALYSIS ===')

// Show which days are being counted
const inicio = new Date(fechaInicio)
const fin = new Date(fechaFin)
const fechaActual = new Date(inicio)
const diasContados = []
const domingosExcluidos = []

while (fechaActual <= fin) {
  const dayOfWeek = fechaActual.getDay()
  const dayName = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][dayOfWeek]
  const dateStr = fechaActual.toISOString().split('T')[0]
  
  if (dayOfWeek !== 0) {
    diasContados.push(`${dateStr} (${dayName})`)
  } else {
    domingosExcluidos.push(`${dateStr} (${dayName})`)
  }
  
  fechaActual.setDate(fechaActual.getDate() + 1)
}

console.log(`Days counted (excluding Sundays): ${diasContados.length}`)
diasContados.forEach((day, index) => {
  console.log(`  ${index + 1}. ${day}`)
})

console.log(`\nSundays excluded: ${domingosExcluidos.length}`)
domingosExcluidos.forEach(day => {
  console.log(`  - ${day}`)
})

console.log('')
console.log('=== CONCLUSION ===')
if (diasCorrectos === 15) {
  console.log('✅ The correct calculation shows 15 days as expected')
} else {
  console.log(`❌ The correct calculation shows ${diasCorrectos} days, but 15 were expected`)
}

if (diasIncorrectos === 14) {
  console.log('❌ The incorrect calculation shows 14 days (this is the bug)')
} else {
  console.log(`❌ The incorrect calculation shows ${diasIncorrectos} days`)
}