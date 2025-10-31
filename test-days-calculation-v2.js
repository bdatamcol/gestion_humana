// Test script to verify vacation days calculation - Version 2
// Investigating if the issue is with Sunday start dates

function calcularDiasVacacionesActual(fechaInicio, fechaFin) {
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

// Test different scenarios
console.log('=== TESTING DIFFERENT DATE SCENARIOS ===')

// Scenario 1: Original problem - Oct 13-29, 2025
console.log('\n1. Original problem: Oct 13-29, 2025')
console.log('   Oct 13 is a Sunday')
let dias = calcularDiasVacacionesActual('2025-10-13', '2025-10-29')
console.log(`   Result: ${dias} days`)

// Scenario 2: If we start from Monday Oct 14
console.log('\n2. Starting from Monday Oct 14-29, 2025')
dias = calcularDiasVacacionesActual('2025-10-14', '2025-10-29')
console.log(`   Result: ${dias} days`)

// Scenario 3: Let's count manually what the user might expect
console.log('\n3. Manual count of business days from Oct 13-29:')
console.log('   If user selects Oct 13 (Sunday) to Oct 29 (Tuesday)')
console.log('   Expected business days might be:')
console.log('   - Week 1: Mon 14, Tue 15, Wed 16, Thu 17, Fri 18, Sat 19 = 6 days')
console.log('   - Week 2: Mon 21, Tue 22, Wed 23, Thu 24, Fri 25, Sat 26 = 6 days')
console.log('   - Week 3: Mon 28, Tue 29 = 2 days')
console.log('   - Total: 6 + 6 + 2 = 14 days')
console.log('   - But if user expects 15, maybe they want to include Saturday?')

// Scenario 4: Test with a range that should clearly be 15 days
console.log('\n4. Test with a clear 15-day range (Oct 14-30, 2025):')
dias = calcularDiasVacacionesActual('2025-10-14', '2025-10-30')
console.log(`   Result: ${dias} days`)

// Scenario 5: Check what days are in Oct 14-30
console.log('\n5. Detailed breakdown of Oct 14-30, 2025:')
const inicio = new Date('2025-10-14')
const fin = new Date('2025-10-30')
const fechaActual = new Date(inicio)
let count = 0

while (fechaActual <= fin) {
  const dayOfWeek = fechaActual.getDay()
  const dayName = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][dayOfWeek]
  const dateStr = fechaActual.toISOString().split('T')[0]
  
  if (dayOfWeek !== 0) {
    count++
    console.log(`   ${count}. ${dateStr} (${dayName})`)
  } else {
    console.log(`   - ${dateStr} (${dayName}) - EXCLUDED`)
  }
  
  fechaActual.setDate(fechaActual.getDate() + 1)
}

console.log(`\n   Total business days: ${count}`)

// Scenario 6: Maybe the issue is that Saturdays should be excluded too?
console.log('\n6. What if we exclude both Saturdays and Sundays?')
function calcularSoloLunesAViernes(fechaInicio, fechaFin) {
  const inicio = new Date(fechaInicio)
  const fin = new Date(fechaFin)
  
  let diasVacaciones = 0
  const fechaActual = new Date(inicio)
  
  while (fechaActual <= fin) {
    const dayOfWeek = fechaActual.getDay()
    // Solo contar lunes a viernes (1-5)
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      diasVacaciones++
    }
    fechaActual.setDate(fechaActual.getDate() + 1)
  }
  
  return diasVacaciones
}

const diasSoloSemana = calcularSoloLunesAViernes('2025-10-13', '2025-10-29')
console.log(`   Oct 13-29 (Mon-Fri only): ${diasSoloSemana} days`)

const diasSoloSemana2 = calcularSoloLunesAViernes('2025-10-14', '2025-30')
console.log(`   Oct 14-30 (Mon-Fri only): ${diasSoloSemana2} days`)