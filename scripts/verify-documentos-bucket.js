const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function verifyDocumentosBucket() {
  try {
    console.log('🔍 Verificando configuración del bucket "documentos"...')
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Variables de entorno de Supabase no encontradas')
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Verificar si el bucket existe
    console.log('📁 Verificando existencia del bucket...')
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()
    
    if (bucketsError) {
      console.error('❌ Error al listar buckets:', bucketsError)
      throw bucketsError
    }
    
    const documentosBucket = buckets.find(bucket => bucket.id === 'documentos')
    
    if (!documentosBucket) {
      console.error('❌ El bucket "documentos" no existe')
      return false
    }
    
    console.log('✅ Bucket "documentos" encontrado')
    console.log('📋 Configuración del bucket:')
    console.log(`   - ID: ${documentosBucket.id}`)
    console.log(`   - Nombre: ${documentosBucket.name}`)
    console.log(`   - Público: ${documentosBucket.public}`)
    console.log(`   - Creado: ${documentosBucket.created_at}`)
    
    // Intentar listar archivos del bucket (para verificar permisos)
    console.log('\n🔐 Verificando permisos del bucket...')
    const { data: files, error: filesError } = await supabase.storage
      .from('documentos')
      .list('', { limit: 1 })
    
    if (filesError) {
      console.error('❌ Error al acceder al bucket:', filesError)
      console.log('⚠️  Es posible que necesites ejecutar el SQL de políticas manualmente')
      console.log('📋 Archivo: supabase/storage/documentos.sql')
      return false
    }
    
    console.log('✅ Permisos del bucket verificados correctamente')
    
    // Crear un archivo de prueba para verificar la funcionalidad
    console.log('\n🧪 Realizando prueba de subida...')
    const testContent = '%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n>>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \ntrailer\n<<\n/Size 4\n/Root 1 0 R\n>>\nstartxref\n174\n%%EOF'
    const testFile = new Blob([testContent], { type: 'application/pdf' })
    const testFileName = `test-${Date.now()}.pdf`
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documentos')
      .upload(`test/${testFileName}`, testFile)
    
    if (uploadError) {
      console.error('❌ Error en prueba de subida:', uploadError)
      return false
    }
    
    console.log('✅ Prueba de subida exitosa')
    console.log(`📄 Archivo creado: ${uploadData.path}`)
    
    // Limpiar archivo de prueba
    const { error: deleteError } = await supabase.storage
      .from('documentos')
      .remove([uploadData.path])
    
    if (deleteError) {
      console.log('⚠️  No se pudo eliminar el archivo de prueba:', deleteError)
    } else {
      console.log('🧹 Archivo de prueba eliminado')
    }
    
    console.log('\n🎉 Bucket "documentos" configurado y funcionando correctamente!')
    return true
    
  } catch (err) {
    console.error('💥 Error inesperado:', err)
    return false
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  verifyDocumentosBucket()
}

module.exports = { verifyDocumentosBucket }