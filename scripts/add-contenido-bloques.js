const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: '.env.local' })

async function addContentoBloques() {
  try {
    console.log('Conectando a Supabase...')
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Variables de entorno de Supabase no encontradas')
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    console.log('Ejecutando migración...')
    
    // Agregar la columna contenido_bloques
    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE publicaciones_bienestar 
        ADD COLUMN IF NOT EXISTS contenido_bloques JSONB DEFAULT '[]'::jsonb;
      `
    })
    
    if (alterError) {
      console.log('La columna ya existe o hubo un error:', alterError.message)
    } else {
      console.log('✅ Columna contenido_bloques agregada exitosamente')
    }
    
    // Crear índice
    const { error: indexError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE INDEX IF NOT EXISTS idx_publicaciones_bienestar_contenido_bloques 
        ON publicaciones_bienestar USING GIN (contenido_bloques);
      `
    })
    
    if (indexError) {
      console.log('El índice ya existe o hubo un error:', indexError.message)
    } else {
      console.log('✅ Índice creado exitosamente')
    }
    
    console.log('🎉 Migración completada exitosamente')
    
  } catch (error) {
    console.error('❌ Error en la migración:', error.message)
    process.exit(1)
  }
}

addContentoBloques()