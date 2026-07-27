// Crea el usuario de prueba para la empresa BOLSA.
// - Crea el usuario en Supabase Auth (pruebabolsá@gmail.com / 1q2w3e4r)
// - Inserta el registro en usuario_nomina vinculado a la empresa BOLSA
// Idempotente: si ya existe, no duplica.

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

const EMAIL = 'pruebabolsa@gmail.com';
const PASSWORD = '1q2w3e4r';
const CEDULA = '1000000001';
const COLABORADOR = 'Usuario Prueba BOLSA';

async function main() {
  // 1) Buscar empresa BOLSA
  const { data: empresa, error: eErr } = await supabase
    .from('empresas')
    .select('id, nombre')
    .eq('nombre', 'BOLSA')
    .single();
  if (eErr || !empresa) {
    console.error('No se encontró la empresa BOLSA:', eErr?.message);
    process.exit(1);
  }
  console.log(`Empresa BOLSA encontrada: id=${empresa.id}`);

  // 2) Verificar si ya existe el usuario en usuario_nomina por correo
  const { data: existingNom, error: nErr } = await supabase
    .from('usuario_nomina')
    .select('id, auth_user_id, correo_electronico')
    .eq('correo_electronico', EMAIL)
    .maybeSingle();
  if (nErr) {
    console.error('Error consultando usuario_nomina:', nErr.message);
    process.exit(1);
  }

  if (existingNom) {
    console.log(`✔ Usuario ya existe en usuario_nomina (id=${existingNom.id}, auth_user_id=${existingNom.auth_user_id}).`);

    // Si existe pero no tiene auth_user_id, intentar enlazarlo
    if (!existingNom.auth_user_id) {
      const { data: list, error: listErr } = await supabase.auth.admin.listUsers();
      if (listErr) {
        console.error('Error listando usuarios auth:', listErr.message);
        process.exit(1);
      }
      const found = list.users.find((u) => u.email?.toLowerCase() === EMAIL.toLowerCase());
      if (found) {
        const { error: linkErr } = await supabase
          .from('usuario_nomina')
          .update({ auth_user_id: found.id, empresa_id: empresa.id })
          .eq('id', existingNom.id);
        if (linkErr) {
          console.error('Error vinculando auth_user_id:', linkErr.message);
          process.exit(1);
        }
        console.log(`✔ auth_user_id vinculado: ${found.id}`);
      } else {
        console.log('No se encontró usuario en auth, se creará a continuación.');
      }
    } else {
      // Asegurar que empresa_id sea BOLSA
      const { error: upEmpErr } = await supabase
        .from('usuario_nomina')
        .update({ empresa_id: empresa.id })
        .eq('id', existingNom.id)
        .neq('empresa_id', empresa.id);
      if (upEmpErr) console.warn('No se pudo actualizar empresa_id:', upEmpErr.message);
    }
    return;
  }

  // 3) Crear usuario en Auth
  const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
  });
  if (authErr) {
    console.error('Error creando usuario en Auth:', authErr.message);
    process.exit(1);
  }
  const authUser = authData.user;
  console.log(`✔ Usuario creado en Auth: ${authUser.id}`);

  // 4) Insertar en usuario_nomina
  const { data: inserted, error: insErr } = await supabase
    .from('usuario_nomina')
    .insert([
      {
        colaborador: COLABORADOR,
        correo_electronico: EMAIL,
        cedula: CEDULA,
        rol: 'usuario',
        estado: 'activo',
        empresa_id: empresa.id,
        auth_user_id: authUser.id,
      },
    ])
    .select('id, correo_electronico, auth_user_id, empresa_id')
    .single();
  if (insErr) {
    console.error('Error insertando usuario_nomina:', insErr.message);
    process.exit(1);
  }
  console.log(`✔ Usuario insertado en usuario_nomina: id=${inserted.id}, empresa_id=${inserted.empresa_id}, auth_user_id=${inserted.auth_user_id}`);
}

main();
