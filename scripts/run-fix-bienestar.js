require('dotenv').config({ path: '../.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function runFixBienestar() {
  try {
    console.log('Connecting to Supabase...');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    console.log('Reading fix script...');
    const sql = fs.readFileSync('./fix-bienestar-policies.sql', 'utf8');
    
    console.log('Executing fix script...');
    
    // Split SQL into individual statements
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    for (const statement of statements) {
      if (statement.trim()) {
        console.log('Executing:', statement.substring(0, 80) + '...');
        
        try {
          // Use raw SQL execution
          const { data, error } = await supabase.rpc('exec_sql', { 
            sql_query: statement + ';' 
          });
          
          if (error) {
            console.log('Note:', error.message);
          } else {
            console.log('✓ Statement executed successfully');
          }
        } catch (err) {
          console.log('Note:', err.message);
        }
      }
    }
    
    console.log('\n✅ Fix script completed!');
    console.log('\nNow try creating a publication again.');
    
  } catch (error) {
    console.error('Fix script failed:', error);
    process.exit(1);
  }
}

runFixBienestar();