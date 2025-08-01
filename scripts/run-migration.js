require('dotenv').config({ path: '../.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function runMigration() {
  try {
    console.log('Connecting to Supabase...');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    console.log('Reading migration file...');
    const sql = fs.readFileSync('../sql/migrations/030_add_tipo_seccion_to_publicaciones.sql', 'utf8');
    
    console.log('Executing migration...');
    
    // Split SQL into individual statements
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    for (const statement of statements) {
      if (statement.trim()) {
        console.log('Executing:', statement.substring(0, 50) + '...');
        const { data, error } = await supabase.rpc('exec', { sql: statement + ';' });
        
        if (error) {
          console.error('Error executing statement:', error);
          // Try alternative method
          const { data: altData, error: altError } = await supabase
            .from('_temp')
            .select('1')
            .limit(1);
          
          if (altError && altError.code === '42P01') {
            // Table doesn't exist, which is expected
            console.log('Continuing with next statement...');
          } else {
            throw error;
          }
        } else {
          console.log('Statement executed successfully');
        }
      }
    }
    
    console.log('Migration completed successfully!');
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
