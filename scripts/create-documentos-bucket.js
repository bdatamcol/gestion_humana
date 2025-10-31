const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function createDocumentosBucket() {
  try {
    console.log('🚀 Iniciando creación del bucket "documentos"...')
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Variables de entorno de Supabase no encontradas')
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    console.log('📁 Creando bucket para documentos...')
    
    // Crear bucket para documentos
    const { data: bucketData, error: bucketError } = await supabase.storage.createBucket('documentos', {
      public: true,
      allowedMimeTypes: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp'
      ],
      fileSizeLimit: 10485760 // 10MB
    })
    
    if (bucketError && !bucketError.message.includes('already exists')) {
      console.error('❌ Error al crear bucket:', bucketError)
      throw bucketError
    } else {
      console.log('✅ Bucket "documentos" creado o ya existe')
    }
    
    console.log('\n⚠️  IMPORTANTE: Debes ejecutar manualmente el siguiente SQL en Supabase Dashboard:')
    console.log('\n📋 Ve a https://supabase.com/dashboard > Tu proyecto > SQL Editor')
    console.log('📋 Copia y pega el contenido del archivo: supabase/storage/documentos.sql\n')
    
    console.log('🎉 Bucket creado exitosamente!')
    console.log('\n📋 Próximos pasos:')
    console.log('1. Ejecutar el SQL de políticas en Supabase Dashboard')
    console.log('2. Verificar que el bucket funciona correctamente')
    console.log('3. Probar la funcionalidad de subida de documentos')
    
  } catch (err) {
    console.error('💥 Error inesperado:', err)
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  createDocumentosBucket()
}

module.exports = { createDocumentosBucket }