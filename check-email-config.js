require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkEmailConfig() {
  try {
    console.log('Checking email configuration...')
    
    // Check if configuracion table exists and what data it has
    const { data: configData, error: configError } = await supabase
      .from('configuracion')
      .select('*')
    
    if (configError) {
      console.error('Error fetching configuration:', configError)
      console.log('The configuracion table might not exist. Let\'s check what tables are available.')
      
      // Try to get table information
      const { data: tables, error: tablesError } = await supabase
        .rpc('get_table_names')
        .catch(() => null)
      
      if (tables) {
        console.log('Available tables:', tables)
      }
      
      return
    }
    
    console.log('Configuration data found:', configData)
    
    // Check specifically for email-related config
    const emailConfig = configData.filter(item => 
      item.clave && item.clave.includes('email')
    )
    
    console.log('Email-related configuration:', emailConfig)
    
  } catch (error) {
    console.error('Script error:', error)
  }
}

checkEmailConfig()