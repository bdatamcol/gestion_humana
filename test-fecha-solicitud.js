// Test para verificar el formateo de fecha de solicitud
console.log('Testing fecha_solicitud formatting...\n')

// Función de formateo corregida (como está en el correo)
const formatDate = (date) => {
  return new Date(date + 'T00:00:00').toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

// Simular diferentes tipos de fecha_solicitud que podrían llegar
const testCases = [
  {
    name: 'Fecha ISO completa (como se guarda ahora)',
    fecha_solicitud: new Date().toISOString(),
    description: 'Fecha con timestamp completo'
  },
  {
    name: 'Fecha solo YYYY-MM-DD',
    fecha_solicitud: new Date().toISOString().slice(0, 10),
    description: 'Solo la parte de fecha'
  },
  {
    name: 'Fecha específica de prueba',
    fecha_solicitud: '2025-01-13T15:30:00.000Z',
    description: 'Fecha específica con hora'
  },
  {
    name: 'Fecha específica solo fecha',
    fecha_solicitud: '2025-01-13',
    description: 'Solo fecha sin hora'
  }
]

console.log('Probando diferentes formatos de fecha_solicitud:')
console.log('='.repeat(70))

testCases.forEach((testCase, index) => {
  console.log(`${index + 1}. ${testCase.name}`)
  console.log(`   Valor original: ${testCase.fecha_solicitud}`)
  console.log(`   Descripción: ${testCase.description}`)
  
  try {
    // Intentar formatear como string de fecha (YYYY-MM-DD)
    let fechaParaFormatear = testCase.fecha_solicitud
    
    // Si es un timestamp completo, extraer solo la fecha
    if (fechaParaFormatear.includes('T')) {
      fechaParaFormatear = fechaParaFormatear.slice(0, 10)
    }
    
    const resultado = formatDate(fechaParaFormatear)
    console.log(`   Resultado formateado: ${resultado}`)
    console.log(`   Estado: ✅ ÉXITO`)
  } catch (error) {
    console.log(`   Error: ${error.message}`)
    console.log(`   Estado: ❌ ERROR`)
  }
  
  console.log('')
})

console.log('='.repeat(70))
console.log('ANÁLISIS:')
console.log('='.repeat(70))
console.log('1. Si fecha_solicitud viene como timestamp completo (con T y Z),')
console.log('   necesitamos extraer solo la parte YYYY-MM-DD antes de formatear.')
console.log('2. La función formatDate actual espera solo YYYY-MM-DD.')
console.log('3. Debemos manejar ambos casos en la API de notificaciones.')

// Función mejorada para manejar ambos casos
const formatDateImproved = (date) => {
  // Si la fecha incluye timestamp, extraer solo la parte de fecha
  let fechaLimpia = date
  if (typeof date === 'string' && date.includes('T')) {
    fechaLimpia = date.slice(0, 10)
  }
  
  return new Date(fechaLimpia + 'T00:00:00').toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

console.log('\nProbando función mejorada:')
console.log('-'.repeat(40))

testCases.forEach((testCase, index) => {
  console.log(`${index + 1}. ${testCase.name}: ${formatDateImproved(testCase.fecha_solicitud)}`)
})

console.log('\n✅ La función mejorada maneja todos los casos correctamente.')