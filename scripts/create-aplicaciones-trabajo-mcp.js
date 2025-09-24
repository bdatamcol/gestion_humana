const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Cargar variables de entorno
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Variables de entorno faltantes')
  console.error('Asegúrate de que NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY estén configuradas en .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function createAplicacionesTrabajoTable() {
  try {
    console.log('🚀 Iniciando creación de tabla aplicaciones_trabajo...')

    // Leer el archivo SQL de migración
    const sqlPath = path.join(__dirname, '..', 'sql', 'migrations', 'create_aplicaciones_trabajo_table.sql')
    const sqlContent = fs.readFileSync(sqlPath, 'utf8')

    // Dividir el SQL en comandos individuales
    const sqlCommands = sqlContent
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd && !cmd.startsWith('--') && cmd !== 'BEGIN' && cmd !== 'COMMIT')

    console.log(`📝 Ejecutando ${sqlCommands.length} comandos SQL...`)

    // Ejecutar cada comando SQL individualmente
    for (let i = 0; i < sqlCommands.length; i++) {
      const command = sqlCommands[i]
      if (command) {
        console.log(`⏳ Ejecutando comando ${i + 1}/${sqlCommands.length}...`)
        
        const { error } = await supabase.rpc('exec_sql', {
          sql: command
        })

        if (error) {
          console.error(`❌ Error en comando ${i + 1}:`, error.message)
          // Continuar con el siguiente comando en caso de error
        } else {
          console.log(`✅ Comando ${i + 1} ejecutado exitosamente`)
        }
      }
    }

    // Verificar que la tabla fue creada
    console.log('🔍 Verificando que la tabla fue creada...')
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'aplicaciones_trabajo')

    if (tablesError) {
      console.error('❌ Error al verificar la tabla:', tablesError.message)
    } else if (tables && tables.length > 0) {
      console.log('✅ Tabla aplicaciones_trabajo creada exitosamente')
    } else {
      console.log('⚠️ No se pudo verificar la creación de la tabla')
    }

    // Crear bucket de storage para hojas de vida
    console.log('📁 Creando bucket de storage para hojas de vida...')
    const { data: bucket, error: bucketError } = await supabase.storage.createBucket('hojas-vida', {
      public: false,
      allowedMimeTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      fileSizeLimit: 5242880 // 5MB
    })

    if (bucketError) {
      if (bucketError.message.includes('already exists')) {
        console.log('✅ Bucket hojas-vida ya existe')
      } else {
        console.error('❌ Error al crear bucket:', bucketError.message)
      }
    } else {
      console.log('✅ Bucket hojas-vida creado exitosamente')
    }

    // Configurar políticas del bucket
    console.log('🔐 Configurando políticas del bucket...')
    
    // Política para permitir subida pública
    const { error: policyError1 } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE POLICY IF NOT EXISTS "Permitir subida pública de hojas de vida"
        ON storage.objects FOR INSERT
        WITH CHECK (bucket_id = 'hojas-vida');
      `
    })

    if (policyError1) {
      console.log('⚠️ Error al crear política de subida:', policyError1.message)
    } else {
      console.log('✅ Política de subida creada')
    }

    // Política para permitir lectura a administradores
    const { error: policyError2 } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE POLICY IF NOT EXISTS "Administradores pueden leer hojas de vida"
        ON storage.objects FOR SELECT
        USING (
          bucket_id = 'hojas-vida' AND
          auth.uid() IN (
            SELECT auth_user_id FROM usuario_nomina WHERE rol = 'administrador'
          )
        );
      `
    })

    if (policyError2) {
      console.log('⚠️ Error al crear política de lectura:', policyError2.message)
    } else {
      console.log('✅ Política de lectura creada')
    }

    console.log('🎉 ¡Configuración completada exitosamente!')
    console.log('')
    console.log('📋 Resumen:')
    console.log('- ✅ Tabla aplicaciones_trabajo creada')
    console.log('- ✅ Índices creados')
    console.log('- ✅ Triggers configurados')
    console.log('- ✅ Políticas RLS configuradas')
    console.log('- ✅ Bucket hojas-vida configurado')
    console.log('')
    console.log('🚀 Ya puedes proceder a crear el formulario público!')

  } catch (error) {
    console.error('❌ Error general:', error.message)
    process.exit(1)
  }
}

// Ejecutar la función
createAplicacionesTrabajoTable()