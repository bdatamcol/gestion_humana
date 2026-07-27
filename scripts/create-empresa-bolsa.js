// Crea la empresa BOLSA (idempotente) en la tabla `empresas`.
// No toca las demás empresas ni funcionalidades.

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('Faltan variables de Supabase en .env');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  // Verificar si ya existe
  const { data: existing, error: findErr } = await supabase
    .from('empresas')
    .select('id, nombre')
    .eq('nombre', 'BOLSA')
    .maybeSingle();

  if (findErr) {
    console.error('Error consultando empresas:', findErr.message);
    process.exit(1);
  }

  if (existing) {
    console.log(`✔ Empresa BOLSA ya existe (id=${existing.id}). No se duplica.`);
    return;
  }

  const { data: inserted, error: insErr } = await supabase
    .from('empresas')
    .insert([{ nombre: 'BOLSA' }])
    .select('id, nombre')
    .single();

  if (insErr) {
    console.error('Error creando empresa BOLSA:', insErr.message);
    process.exit(1);
  }

  console.log(`✔ Empresa BOLSA creada correctamente (id=${inserted.id}).`);
}

main();
