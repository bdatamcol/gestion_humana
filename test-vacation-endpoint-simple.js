const fetch = require('node-fetch')

async function testVacationEndpoint() {
  try {
    console.log('Testing vacation notification endpoint...')
    
    const response = await fetch('http://localhost:3000/api/notificaciones/solicitud-vacaciones', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        solicitudId: '836266a7-40d7-4470-8d34-efa97edc6426',
        usuarioId: '0638878f-c63a-4f58-bbab-ebd119705f3d'
      })
    })
    
    console.log('Response status:', response.status)
    console.log('Response headers:', response.headers.raw())
    
    const responseText = await response.text()
    console.log('Response body:', responseText)
    
    if (response.ok) {
      console.log('✅ Success!')
    } else {
      console.log('❌ Error response')
    }
    
  } catch (error) {
    console.error('Request error:', error)
  }
}

testVacationEndpoint()