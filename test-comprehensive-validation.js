// Comprehensive test to validate the vacation days calculation fix
console.log('Testing comprehensive vacation days calculation validation...\n')

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

// Test cases with different scenarios
const testCases = [
  {
    name: 'Caso original reportado',
    start: '2025-10-13',
    end: '2025-10-29',
    expected: 15,
    description: 'Lunes a miércoles, excluyendo 2 domingos'
  },
  {
    name: 'Una semana completa',
    start: '2025-10-13',
    end: '2025-10-19',
    expected: 6,
    description: 'Lunes a domingo, excluyendo 1 domingo'
  },
  {
    name: 'Solo días laborables',
    start: '2025-10-13',
    end: '2025-10-17',
    expected: 5,
    description: 'Lunes a viernes, sin domingos'
  },
  {
    name: 'Incluye fin de semana',
    start: '2025-10-17',
    end: '2025-10-20',
    expected: 3,
    description: 'Viernes a lunes, excluyendo 1 domingo'
  },
  {
    name: 'Empieza en domingo',
    start: '2025-10-19',
    end: '2025-10-25',
    expected: 6,
    description: 'Domingo a sábado, excluyendo 1 domingo'
  },
  {
    name: 'Un solo día (lunes)',
    start: '2025-10-13',
    end: '2025-10-13',
    expected: 1,
    description: 'Un solo día laborable'
  },
  {
    name: 'Un solo día (domingo)',
    start: '2025-10-19',
    end: '2025-10-19',
    expected: 0,
    description: 'Un solo día domingo'
  },
  {
    name: 'Mes completo noviembre',
    start: '2025-11-01',
    end: '2025-11-30',
    expected: 26,
    description: 'Noviembre 2025 completo, excluyendo domingos'
  }
]

console.log('Ejecutando casos de prueba...\n')

let passedTests = 0
let totalTests = testCases.length

testCases.forEach((testCase, index) => {
  console.log(`${index + 1}. ${testCase.name}`)
  console.log(`   Rango: ${testCase.start} a ${testCase.end}`)
  console.log(`   Descripción: ${testCase.description}`)
  
  const result = calcularDiasVacacionesFixed(testCase.start, testCase.end)
  const passed = result === testCase.expected
  
  console.log(`   Esperado: ${testCase.expected} días`)
  console.log(`   Obtenido: ${result} días`)
  console.log(`   Estado: ${passed ? '✅ PASÓ' : '❌ FALLÓ'}`)
  
  if (passed) {
    passedTests++
  }
  
  console.log('')
})

console.log('='.repeat(50))
console.log(`RESUMEN DE PRUEBAS:`)
console.log(`Total de pruebas: ${totalTests}`)
console.log(`Pruebas exitosas: ${passedTests}`)
console.log(`Pruebas fallidas: ${totalTests - passedTests}`)
console.log(`Porcentaje de éxito: ${((passedTests / totalTests) * 100).toFixed(1)}%`)

if (passedTests === totalTests) {
  console.log('\n🎉 ¡TODAS LAS PRUEBAS PASARON! La corrección funciona correctamente.')
} else {
  console.log('\n⚠️  Algunas pruebas fallaron. Revisar la implementación.')
}

// Additional validation: Check October 2025 calendar
console.log('\n' + '='.repeat(50))
console.log('VALIDACIÓN ADICIONAL: Calendario Octubre 2025')
console.log('='.repeat(50))

const october2025 = []
for (let day = 1; day <= 31; day++) {
  const date = new Date(2025, 9, day) // October is month 9 (0-indexed)
  october2025.push({
    day: day,
    date: date.toDateString(),
    dayOfWeek: date.getDay(),
    dayName: date.toLocaleDateString('es-ES', { weekday: 'long' })
  })
}

console.log('\nCalendario de Octubre 2025:')
console.log('Día | Fecha                    | Día de la semana | ¿Domingo?')
console.log('-'.repeat(65))

october2025.forEach(day => {
  const isSunday = day.dayOfWeek === 0
  console.log(`${day.day.toString().padStart(2)} | ${day.date.padEnd(24)} | ${day.dayName.padEnd(15)} | ${isSunday ? 'SÍ' : 'NO'}`)
})

console.log('\nDomingos en Octubre 2025:')
const sundays = october2025.filter(day => day.dayOfWeek === 0)
sundays.forEach(sunday => {
  console.log(`- ${sunday.date} (día ${sunday.day})`)
})

console.log(`\nTotal de domingos en octubre: ${sundays.length}`)
console.log(`Total de días laborables en octubre: ${31 - sundays.length}`)