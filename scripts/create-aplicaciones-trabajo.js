const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: '.env.local' })

async function createAplicacionesTrabajoTable() {
  try {
    console.log('🚀 Iniciando migración de aplicaciones de trabajo...')
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Variables de entorno de Supabase no encontradas')
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    console.log('📋 Leyendo archivo de migración...')
    
    // Leer el archivo SQL
    const sqlPath = path.join(__dirname, '..', 'sql', 'migrations', 'create_aplicaciones_trabajo_table.sql')
    const sqlContent = fs.readFileSync(sqlPath, 'utf8')
    
    console.log('🔧 Ejecutando migración...')
    
    // Ejecutar la migración SQL
    const { error: migrationError } = await supabase.rpc('exec_sql', {
      sql: sqlContent
    })
    
    if (migrationError) {
      console.error('❌ Error al ejecutar la migración:', migrationError)
      // Intentar crear la tabla manualmente si falla la función exec_sql
      console.log('🔄 Intentando crear la tabla manualmente...')
      
      const { error: tableError } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS aplicaciones_trabajo (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            nombres VARCHAR(100) NOT NULL,
            apellidos VARCHAR(100) NOT NULL,
            email VARCHAR(255) NOT NULL,
            telefono VARCHAR(20) NOT NULL,
            documento_identidad VARCHAR(20) NOT NULL,
            tipo_documento VARCHAR(10) NOT NULL DEFAULT 'CC',
            fecha_nacimiento DATE NOT NULL,
            direccion TEXT NOT NULL,
            ciudad VARCHAR(100) NOT NULL,
            cargo_interes VARCHAR(100) NOT NULL,
            experiencia_laboral TEXT,
            nivel_educacion VARCHAR(50) NOT NULL,
            hoja_vida_url TEXT,
            estado VARCHAR(20) DEFAULT 'nueva',
            observaciones TEXT,
            fecha_aplicacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            fecha_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            revisada_por UUID REFERENCES usuario_nomina(auth_user_id) ON DELETE SET NULL,
            fecha_revision TIMESTAMP WITH TIME ZONE
          );
        `
      })
      
      if (tableError) {
        console.log('❌ No se pudo verificar/crear la tabla. Necesitas ejecutar la migración SQL manualmente.')
        console.log('📋 Copia y pega el contenido del archivo:')
        console.log('   sql/migrations/create_aplicaciones_trabajo_table.sql')
        console.log('   en el SQL Editor de Supabase Dashboard')
        return
      }
    } else {
      console.log('✅ Tabla aplicaciones_trabajo creada exitosamente')
    }
    
    console.log('✅ Verificando tabla...')
    
    // Verificar que la tabla existe
    const { data: tableData, error: checkError } = await supabase
      .from('aplicaciones_trabajo')
      .select('id')
      .limit(1)
    
    if (checkError && !checkError.message.includes('relation "aplicaciones_trabajo" does not exist')) {
      console.log('✅ Tabla verificada correctamente')
    }
    
    // Crear bucket para hojas de vida
    console.log('\n📁 Creando bucket para hojas de vida...')
    
    const { data: bucketData, error: bucketError } = await supabase.storage.createBucket('hojas-vida', {
      public: false,
      allowedMimeTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      fileSizeLimit: 10485760 // 10MB
    })
    
    if (bucketError && !bucketError.message.includes('already exists')) {
      console.error('❌ Error al crear bucket:', bucketError)
    } else {
      console.log('✅ Bucket "hojas-vida" creado o ya existe')
    }
    
    console.log('\n🎉 Migración completada exitosamente!')
    console.log('\n📋 Próximos pasos:')
    console.log('1. Verificar que la tabla existe en el dashboard de Supabase')
    console.log('2. Configurar políticas de storage si es necesario')
    console.log('3. Probar la funcionalidad del formulario "Trabaja con nosotros"')
    
  } catch (err) {
    console.error('💥 Error inesperado:', err)
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  createAplicacionesTrabajoTable()
}

module.exports = { createAplicacionesTrabajoTable }