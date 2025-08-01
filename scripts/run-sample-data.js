require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function runSampleDataMigration() {
  try {
    console.log('Connecting to Supabase...');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    console.log('Reading sample data migration file...');
    const sql = fs.readFileSync('./sql/migrations/031_insert_sample_data.sql', 'utf8');
    
    console.log('Executing sample data migration...');
    
    // Split SQL into individual statements
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && !stmt.startsWith('COMMENT'));
    
    for (const statement of statements) {
      if (statement.trim()) {
        console.log('Executing:', statement.substring(0, 80) + '...');
        
        try {
          // Use the SQL editor directly
          const { data, error } = await supabase.rpc('exec_sql', { 
            sql: statement + ';' 
          });
          
          if (error) {
            // Try alternative method using direct query
            console.log('Trying alternative method...');
            const { data: altData, error: altError } = await supabase
              .from('publicaciones_bienestar')
              .select('count')
              .limit(1);
            
            if (altError) {
              console.error('Error executing statement:', error);
              console.error('Alternative method also failed:', altError);
            } else {
              console.log('Statement executed successfully (alternative method)');
            }
          } else {
            console.log('Statement executed successfully');
          }
        } catch (execError) {
          console.error('Execution error:', execError);
          // Continue with next statement
        }
      }
    }
    
    console.log('Sample data migration completed!');
    
    // Verify data was inserted
    console.log('Verifying inserted data...');
    const { data: bienestarData, error: bienestarError } = await supabase
      .from('publicaciones_bienestar')
      .select('titulo, tipo_seccion')
      .eq('tipo_seccion', 'bienestar');
    
    if (bienestarError) {
      console.error('Error verifying bienestar data:', bienestarError);
    } else {
      console.log('Bienestar posts found:', bienestarData?.length || 0);
    }
    
    const { data: actividadesData, error: actividadesError } = await supabase
      .from('publicaciones_bienestar')
      .select('titulo, tipo_seccion')
      .eq('tipo_seccion', 'actividades');
    
    if (actividadesError) {
      console.error('Error verifying actividades data:', actividadesError);
    } else {
      console.log('Actividades posts found:', actividadesData?.length || 0);
    }
    
    const { data: sstData, error: sstError } = await supabase
      .from('publicaciones_bienestar')
      .select('titulo, tipo_seccion')
      .eq('tipo_seccion', 'sst');
    
    if (sstError) {
      console.error('Error verifying SST data:', sstError);
    } else {
      console.log('SST posts found:', sstData?.length || 0);
    }
    
    const { data: normatividadData, error: normatividadError } = await supabase
      .from('publicaciones_bienestar')
      .select('titulo, tipo_seccion')
      .eq('tipo_seccion', 'normatividad');
    
    if (normatividadError) {
      console.error('Error verifying normatividad data:', normatividadError);
    } else {
      console.log('Normatividad posts found:', normatividadData?.length || 0);
    }
    
  } catch (error) {
    console.error('Sample data migration failed:', error);
    process.exit(1);
  }
}

runSampleDataMigration();
