require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function createTestVacation() {
  try {
    console.log('Creating test vacation request...')
    
    // Get a user with auth_user_id
    const { data: usuario, error: usuarioError } = await supabase
      .from('usuario_nomina')
      .select('auth_user_id, colaborador')
      .not('auth_user_id', 'is', null)
      .limit(1)
      .single()
    
    if (usuarioError) {
      console.error('Error fetching user:', usuarioError)
      return
    }
    
    console.log('User found:', usuario)
    
    // Create a test vacation request
    const { data: vacacion, error: vacacionError } = await supabase
      .from('solicitudes_vacaciones')
      .insert({
        usuario_id: usuario.auth_user_id,
        fecha_inicio: '2024-01-15',
        fecha_fin: '2024-01-25',
        estado: 'pendiente'
      })
      .select()
      .single()
    
    if (vacacionError) {
      console.error('Error creating vacation request:', vacacionError)
      return
    }
    
    console.log('Test vacation request created:', vacacion)
    
  } catch (error) {
    console.error('Script error:', error)
  }
}

createTestVacation()