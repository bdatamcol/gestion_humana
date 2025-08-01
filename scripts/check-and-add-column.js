const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function checkAndAddColumn() {
  try {
    console.log('Conectando a Supabase...')
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Variables de entorno de Supabase no encontradas')
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Verificar si la columna existe consultando la estructura de la tabla
    console.log('Verificando estructura de la tabla...')
    
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'publicaciones_bienestar')
      .eq('column_name', 'contenido_bloques')
    
    if (columnsError) {
      console.log('Error al verificar columnas:', columnsError.message)
      // Intentar verificar de otra manera
      const { data: testData, error: testError } = await supabase
        .from('publicaciones_bienestar')
        .select('contenido_bloques')
        .limit(1)
      
      if (testError && testError.message.includes('contenido_bloques')) {
        console.log('❌ La columna contenido_bloques NO existe')
        console.log('⚠️  Necesitas agregar la columna manualmente en Supabase Dashboard:')
        console.log('   1. Ve a https://supabase.com/dashboard')
        console.log('   2. Selecciona tu proyecto')
        console.log('   3. Ve a Table Editor > publicaciones_bienestar')
        console.log('   4. Agrega una nueva columna:')
        console.log('      - Nombre: contenido_bloques')
        console.log('      - Tipo: jsonb')
        console.log('      - Valor por defecto: []')
        console.log('      - Nullable: true')
      } else {
        console.log('✅ La columna contenido_bloques ya existe')
      }
    } else if (columns && columns.length > 0) {
      console.log('✅ La columna contenido_bloques ya existe')
    } else {
      console.log('❌ La columna contenido_bloques NO existe')
      console.log('⚠️  Necesitas agregar la columna manualmente en Supabase Dashboard')
    }
    
    // Probar insertar un registro de prueba para verificar que todo funciona
    console.log('\nProbando funcionalidad...')
    const testBloques = [
      {
        id: '1',
        type: 'text',
        content: 'Contenido de prueba',
        title: 'Título de prueba'
      }
    ]
    
    const { data: testInsert, error: insertError } = await supabase
      .from('publicaciones_bienestar')
      .insert({
        titulo: 'Prueba de contenido multimedia',
        contenido: '<p>Contenido de prueba</p>',
        contenido_bloques: testBloques,
        autor_id: '00000000-0000-0000-0000-000000000000', // ID temporal
        estado: 'borrador',
        tipo_seccion: 'sst'
      })
      .select()
    
    if (insertError) {
      if (insertError.message.includes('contenido_bloques')) {
        console.log('❌ Error: La columna contenido_bloques no existe en la base de datos')
        console.log('   Necesitas agregarla manualmente en Supabase Dashboard')
      } else {
        console.log('⚠️  Error en la prueba (puede ser normal):', insertError.message)
        console.log('✅ La columna contenido_bloques parece existir')
      }
    } else {
      console.log('✅ Prueba exitosa: La columna contenido_bloques funciona correctamente')
      
      // Limpiar el registro de prueba
      if (testInsert && testInsert[0]) {
        await supabase
          .from('publicaciones_bienestar')
          .delete()
          .eq('id', testInsert[0].id)
        console.log('🧹 Registro de prueba eliminado')
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

checkAndAddColumn()