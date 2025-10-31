require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('Supabase URL:', supabaseUrl)
console.log('Service Role Key exists:', !!supabaseKey)

const supabase = createClient(supabaseUrl, supabaseKey)

async function fetchVacationData() {
  try {
    console.log('Fetching vacation requests...')
    
    // Fetch some vacation requests
    const { data: vacaciones, error: vacacionesError } = await supabase
      .from('solicitudes_vacaciones')
      .select('*')
      .limit(5)
    
    if (vacacionesError) {
      console.error('Error fetching vacation requests:', vacacionesError)
      return
    }
    
    console.log('Vacation requests found:', vacaciones?.length || 0)
    if (vacaciones && vacaciones.length > 0) {
      console.log('Sample vacation request:', vacaciones[0])
      
      // Fetch user data for the first vacation request
      const { data: usuario, error: usuarioError } = await supabase
        .from('usuario_nomina')
        .select('*')
        .eq('id', vacaciones[0].usuario_id)
        .single()
      
      if (usuarioError) {
        console.error('Error fetching user:', usuarioError)
      } else {
        console.log('User data:', usuario)
      }
    }
    
    // Also fetch some users
    const { data: usuarios, error: usuariosError } = await supabase
      .from('usuario_nomina')
      .select('id, colaborador, correo_electronico, cedula')
      .limit(3)
    
    if (usuariosError) {
      console.error('Error fetching users:', usuariosError)
    } else {
      console.log('Available users:', usuarios)
    }
    
  } catch (error) {
    console.error('Script error:', error)
  }
}

fetchVacationData()