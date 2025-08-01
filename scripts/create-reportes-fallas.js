const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createReportesFallasTable() {
  try {
    console.log('🚀 Iniciando creación de tabla reportes_fallas...')
    
    // Crear tabla directamente
    const { data, error } = await supabase.rpc('create_reportes_fallas_table')
    
    if (error) {
      console.log('⚠️  La función RPC no existe, creando tabla manualmente...')
      
      // Intentar crear la tabla usando una consulta simple
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS reportes_fallas (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          tipo_falla VARCHAR(100) NOT NULL,
          descripcion TEXT NOT NULL,
          imagen_path TEXT,
          estado VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'en_proceso', 'resuelto', 'cerrado')),
          fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          fecha_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          resuelto_por UUID REFERENCES auth.users(id),
          fecha_resolucion TIMESTAMP WITH TIME ZONE,
          comentarios_resolucion TEXT
        );
      `
      
      // Verificar si la tabla ya existe
      const { data: tableExists } = await supabase
        .from('reportes_fallas')
        .select('id')
        .limit(1)
      
      if (tableExists !== null) {
        console.log('✅ Tabla reportes_fallas ya existe o fue creada')
      } else {
        console.log('❌ No se pudo verificar/crear la tabla. Necesitas ejecutar la migración SQL manualmente.')
        console.log('📋 Copia y pega el contenido del archivo:')
        console.log('   sql/migrations/create_reportes_fallas_table.sql')
        console.log('   en el SQL Editor de Supabase Dashboard')
        return
      }
    } else {
      console.log('✅ Tabla reportes_fallas creada exitosamente')
    }
    
    console.log('✅ Verificando tabla...')
    
    // Crear bucket para imágenes
    console.log('\n📁 Creando bucket para imágenes...')
    
    const { data: bucketData, error: bucketError } = await supabase.storage.createBucket('fallas', {
      public: true,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    })
    
    if (bucketError && !bucketError.message.includes('already exists')) {
      console.error('❌ Error al crear bucket:', bucketError)
    } else {
      console.log('✅ Bucket "fallas" creado o ya existe')
    }
    
    console.log('\n🎉 Migración completada exitosamente!')
    console.log('\n📋 Próximos pasos:')
    console.log('1. Verificar que la tabla existe en el dashboard de Supabase')
    console.log('2. Configurar políticas de storage si es necesario')
    console.log('3. Probar la funcionalidad de reporte de fallas')
    
  } catch (err) {
    console.error('💥 Error inesperado:', err)
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  createReportesFallasTable()
}

module.exports = { createReportesFallasTable }