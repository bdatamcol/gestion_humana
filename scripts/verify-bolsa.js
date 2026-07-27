// Verifica que el usuario de prueba BOLSA esté correctamente creado.

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const { data: empresa, error: eErr } = await supabase
    .from('empresas')
    .select('id, nombre')
    .eq('nombre', 'BOLSA')
    .single();
  console.log('Empresa BOLSA:', empresa, eErr?.message ?? '');

  const { data: usuario, error: uErr } = await supabase
    .from('usuario_nomina')
    .select('id, colaborador, correo_electronico, cedula, rol, estado, empresa_id, auth_user_id, empresas:empresa_id(nombre)')
    .eq('correo_electronico', 'pruebabolsa@gmail.com')
    .maybeSingle();
  console.log('Usuario prueba:', usuario, uErr?.message ?? '');

  const { data: authList, error: aErr } = await supabase.auth.admin.listUsers();
  const authUser = authList?.users?.find((u) => u.email === 'pruebabolsa@gmail.com');
  console.log('Auth user:', authUser ? { id: authUser.id, email: authUser.email, confirmed: !!authUser.email_confirmed_at } : 'No encontrado', aErr?.message ?? '');
}

main();
