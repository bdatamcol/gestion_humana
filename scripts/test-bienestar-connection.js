require('dotenv').config({ path: '../.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function testBienestarConnection() {
  try {
    console.log('Testing Supabase connection...');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    console.log('Testing table access...');
    
    // Test if we can access the table
    const { data: tableTest, error: tableError } = await supabase
      .from('publicaciones_bienestar')
      .select('id')
      .limit(1);
    
    if (tableError) {
      console.error('❌ Table access error:', tableError);
      return;
    }
    
    console.log('✅ Table access successful');
    
    // Test if we can insert (this will help identify the exact error)
    console.log('Testing insert permissions...');
    
    const { data: insertTest, error: insertError } = await supabase
      .from('publicaciones_bienestar')
      .insert({
        titulo: 'Test Publication',
        contenido: 'Test content',
        autor_id: '00000000-0000-0000-0000-000000000000', // Dummy UUID
        estado: 'borrador',
        tipo_seccion: 'bienestar'
      })
      .select('id');
    
    if (insertError) {
      console.error('❌ Insert error details:');
      console.error('Code:', insertError.code);
      console.error('Message:', insertError.message);
      console.error('Details:', insertError.details);
      console.error('Hint:', insertError.hint);
    } else {
      console.log('✅ Insert test successful');
      
      // Clean up test record
      if (insertTest && insertTest[0]) {
        await supabase
          .from('publicaciones_bienestar')
          .delete()
          .eq('id', insertTest[0].id);
        console.log('✅ Test record cleaned up');
      }
    }
    
  } catch (error) {
    console.error('❌ Connection test failed:', error);
  }
}

testBienestarConnection();