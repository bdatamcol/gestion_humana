require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testQueries() {
  console.log('Testing database queries...')
  
  try {
    // Test bienestar posts
    console.log('\n=== Testing Bienestar Posts ===')
    const { data: bienestarData, error: bienestarError } = await supabase
      .from('publicaciones_bienestar')
      .select(`
        id,
        titulo,
        contenido,
        fecha_publicacion,
        vistas,
        tipo_seccion
      `)
      .eq('estado', 'publicado')
      .eq('tipo_seccion', 'bienestar')
      .order('fecha_publicacion', { ascending: false })
      .limit(4)
    
    if (bienestarError) {
      console.error('Bienestar Error:', bienestarError)
    } else {
      console.log('Bienestar Posts Found:', bienestarData?.length || 0)
      bienestarData?.forEach((post, index) => {
        console.log(`  ${index + 1}. ${post.titulo} (${post.tipo_seccion})`)
      })
    }
    
    // Test actividades posts
    console.log('\n=== Testing Actividades Posts ===')
    const { data: actividadesData, error: actividadesError } = await supabase
      .from('publicaciones_bienestar')
      .select(`
        id,
        titulo,
        contenido,
        fecha_publicacion,
        vistas,
        tipo_seccion
      `)
      .eq('estado', 'publicado')
      .eq('tipo_seccion', 'actividades')
      .order('fecha_publicacion', { ascending: false })
      .limit(4)
    
    if (actividadesError) {
      console.error('Actividades Error:', actividadesError)
    } else {
      console.log('Actividades Posts Found:', actividadesData?.length || 0)
      actividadesData?.forEach((post, index) => {
        console.log(`  ${index + 1}. ${post.titulo} (${post.tipo_seccion})`)
      })
    }
    
    // Test SST posts
    console.log('\n=== Testing SST Posts ===')
    const { data: sstData, error: sstError } = await supabase
      .from('publicaciones_bienestar')
      .select(`
        id,
        titulo,
        contenido,
        fecha_publicacion,
        vistas,
        tipo_seccion
      `)
      .eq('estado', 'publicado')
      .eq('tipo_seccion', 'sst')
      .order('fecha_publicacion', { ascending: false })
      .limit(4)
    
    if (sstError) {
      console.error('SST Error:', sstError)
    } else {
      console.log('SST Posts Found:', sstData?.length || 0)
      sstData?.forEach((post, index) => {
        console.log(`  ${index + 1}. ${post.titulo} (${post.tipo_seccion})`)
      })
    }
    
    // Test normatividad posts
    console.log('\n=== Testing Normatividad Posts ===')
    const { data: normatividadData, error: normatividadError } = await supabase
      .from('publicaciones_bienestar')
      .select(`
        id,
        titulo,
        contenido,
        fecha_publicacion,
        vistas,
        tipo_seccion
      `)
      .eq('estado', 'publicado')
      .eq('tipo_seccion', 'normatividad')
      .order('fecha_publicacion', { ascending: false })
      .limit(4)
    
    if (normatividadError) {
      console.error('Normatividad Error:', normatividadError)
    } else {
      console.log('Normatividad Posts Found:', normatividadData?.length || 0)
      normatividadData?.forEach((post, index) => {
        console.log(`  ${index + 1}. ${post.titulo} (${post.tipo_seccion})`)
      })
    }
    
    // Test all posts to see what's in the database
    console.log('\n=== All Posts in Database ===')
    const { data: allPosts, error: allError } = await supabase
      .from('publicaciones_bienestar')
      .select('id, titulo, tipo_seccion, estado')
      .order('fecha_publicacion', { ascending: false })
    
    if (allError) {
      console.error('All Posts Error:', allError)
    } else {
      console.log('Total Posts Found:', allPosts?.length || 0)
      allPosts?.forEach((post, index) => {
        console.log(`  ${index + 1}. ${post.titulo} (${post.tipo_seccion}) - ${post.estado}`)
      })
    }
    
  } catch (error) {
    console.error('Test failed:', error)
  }
}

testQueries()
