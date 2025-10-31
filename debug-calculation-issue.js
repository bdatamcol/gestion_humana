// Debug the exact calculation issue
// October 13, 2025 is a MONDAY, not Sunday
// The range Oct 13-29 should count 15 days, but system shows 14

function calcularDiasVacacionesActual(fechaInicio, fechaFin) {
  const inicio = typeof fechaInicio === 'string' ? new Date(fechaInicio) : fechaInicio
  const fin = typeof fechaFin === 'string' ? new Date(fechaFin) : fechaFin
  
  let diasVacaciones = 0
  const fechaActual = new Date(inicio)
  
  console.log('=== STEP BY STEP CALCULATION ===')
  console.log(`Start: ${inicio.toISOString().split('T')[0]} (${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][inicio.getDay()]})`)
  console.log(`End: ${fin.toISOString().split('T')[0]} (${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][fin.getDay()]})`)
  console.log('')
  
  // Iterar día por día desde la fecha de inicio hasta la fecha de fin
  while (fechaActual <= fin) {
    const dayOfWeek = fechaActual.getDay()
    const dayName = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][dayOfWeek]
    const dateStr = fechaActual.toISOString().split('T')[0]
    
    console.log(`Checking: ${dateStr} (${dayName})`)
    
    // Solo contar si no es domingo (día 0)
    if (fechaActual.getDay() !== 0) {
      diasVacaciones++
      console.log(`  -> COUNTED (${diasVacaciones})`)
    } else {
      console.log(`  -> SKIPPED (Sunday)`)
    }
    
    // Avanzar al siguiente día
    fechaActual.setDate(fechaActual.getDate() + 1)
  }
  
  console.log('')
  console.log(`Final count: ${diasVacaciones} days`)
  return diasVacaciones
}

// Test with the exact dates
console.log('=== TESTING OCTOBER 13-29, 2025 ===')
const result = calcularDiasVacacionesActual('2025-10-13', '2025-10-29')

console.log('')
console.log('=== EXPECTED vs ACTUAL ===')
console.log('Expected: 15 days (according to user)')
console.log(`Actual: ${result} days`)

if (result === 15) {
  console.log('✅ Calculation is CORRECT')
} else {
  console.log('❌ There is a BUG in the calculation')
  console.log('')
  console.log('=== POSSIBLE ISSUES ===')
  console.log('1. Date parsing issue')
  console.log('2. Timezone issue')
  console.log('3. Loop condition issue')
  console.log('4. Day counting logic issue')
}

// Let's also test the date objects directly
console.log('')
console.log('=== DATE OBJECT VERIFICATION ===')
const startDate = new Date('2025-10-13')
const endDate = new Date('2025-10-29')

console.log(`Start date object: ${startDate}`)
console.log(`End date object: ${endDate}`)
console.log(`Start day of week: ${startDate.getDay()} (${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][startDate.getDay()]})`)
console.log(`End day of week: ${endDate.getDay()} (${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][endDate.getDay()]})`)

// Check if there's a timezone issue
console.log('')
console.log('=== TIMEZONE CHECK ===')
console.log(`Start UTC: ${startDate.toISOString()}`)
console.log(`End UTC: ${endDate.toISOString()}`)
console.log(`Start local: ${startDate.toLocaleDateString()}`)
console.log(`End local: ${endDate.toLocaleDateString()}`)