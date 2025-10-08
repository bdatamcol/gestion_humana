// Test para verificar el formateo correcto de fechas en el correo
console.log('Testing email date formatting...\n')

// Función original (problemática)
const formatDateOriginal = (date) => {
  return new Date(date).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

// Función corregida
const formatDateFixed = (date) => {
  return new Date(date + 'T00:00:00').toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

// Casos de prueba
const testDates = [
  '2025-11-03',
  '2025-11-19',
  '2025-10-13',
  '2025-10-29',
  '2025-12-01',
  '2025-01-15'
]

console.log('Comparación de formateo de fechas:')
console.log('='.repeat(80))
console.log('Fecha Original | Formato Original (Problemático) | Formato Corregido')
console.log('-'.repeat(80))

testDates.forEach(date => {
  const originalFormat = formatDateOriginal(date)
  const fixedFormat = formatDateFixed(date)
  const isCorrect = originalFormat === fixedFormat ? '✅' : '❌'
  
  console.log(`${date.padEnd(12)} | ${originalFormat.padEnd(30)} | ${fixedFormat.padEnd(20)} ${isCorrect}`)
})

console.log('\n' + '='.repeat(80))
console.log('Análisis detallado del problema:')
console.log('='.repeat(80))

// Análisis específico para las fechas del usuario
const userStartDate = '2025-11-03'
const userEndDate = '2025-11-19'

console.log(`\nFechas del usuario: ${userStartDate} a ${userEndDate}`)
console.log('\nAnálisis de la fecha de inicio:')
console.log(`- Fecha string: ${userStartDate}`)
console.log(`- new Date('${userStartDate}'):`, new Date(userStartDate))
console.log(`- new Date('${userStartDate}T00:00:00'):`, new Date(userStartDate + 'T00:00:00'))
console.log(`- Formato original: ${formatDateOriginal(userStartDate)}`)
console.log(`- Formato corregido: ${formatDateFixed(userStartDate)}`)

console.log('\nAnálisis de la fecha de fin:')
console.log(`- Fecha string: ${userEndDate}`)
console.log(`- new Date('${userEndDate}'):`, new Date(userEndDate))
console.log(`- new Date('${userEndDate}T00:00:00'):`, new Date(userEndDate + 'T00:00:00'))
console.log(`- Formato original: ${formatDateOriginal(userEndDate)}`)
console.log(`- Formato corregido: ${formatDateFixed(userEndDate)}`)

console.log('\n' + '='.repeat(80))
console.log('CONCLUSIÓN:')
console.log('='.repeat(80))
console.log('El problema era que new Date("YYYY-MM-DD") interpreta la fecha como UTC medianoche,')
console.log('que en Colombia (GMT-5) se convierte al día anterior a las 19:00.')
console.log('La solución es agregar "T00:00:00" para forzar la interpretación en hora local.')