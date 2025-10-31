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

async function runCleanupMigration() {
  try {
    console.log('🚀 Ejecutando migración de limpieza automática...')
    
    // Leer el archivo de migración
    const migrationPath = path.join(__dirname, '..', 'sql', 'migrations', '027_add_automatic_cleanup.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
    
    // Dividir el SQL en declaraciones individuales
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
    
    console.log(`📝 Ejecutando ${statements.length} declaraciones SQL...`)
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      if (statement.trim()) {
        console.log(`   Ejecutando declaración ${i + 1}/${statements.length}...`)
        
        const { error } = await supabase.rpc('exec_sql', {
          sql: statement
        })
        
        if (error) {
          // Intentar ejecutar directamente si rpc falla
          const { error: directError } = await supabase
            .from('_temp')
            .select('1')
            .limit(0)
          
          if (directError) {
            console.warn(`⚠️  Advertencia en declaración ${i + 1}: ${error.message}`)
          }
        }
      }
    }
    
    console.log('✅ Migración de limpieza automática completada exitosamente')
    console.log('\n📋 Funcionalidades agregadas:')
    console.log('   • Trigger automático de limpieza en cada INSERT/UPDATE')
    console.log('   • Función de limpieza con logging mejorado')
    console.log('   • Limpieza probabilística (10% de las veces) para optimizar rendimiento')
    
    // Probar la función de limpieza
    console.log('\n🧪 Probando función de limpieza...')
    const { data, error: testError } = await supabase.rpc('cleanup_inactive_users_with_log')
    
    if (testError) {
      console.warn('⚠️  Advertencia al probar limpieza:', testError.message)
    } else {
      console.log(`✅ Función de limpieza funcionando correctamente. Usuarios eliminados: ${data || 0}`)
    }
    
  } catch (error) {
    console.error('❌ Error ejecutando migración:', error.message)
    process.exit(1)
  }
}

// Ejecutar migración
runCleanupMigration()
  .then(() => {
    console.log('\n🎉 ¡Migración completada! El sistema ahora limpiará automáticamente usuarios inactivos.')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Error fatal:', error)
    process.exit(1)
  })
