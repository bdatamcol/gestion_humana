import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createAdminSupabaseClient } from '@/lib/supabase-server';

function createSupabaseFromRequest(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const authHeader = req.headers.get('authorization') || '';

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase env vars are missing');
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: authHeader ? { Authorization: authHeader } : {},
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const usuarioNominaId = Number(body?.usuarioNominaId);
    const authUserId = String(body?.authUserId || '').trim();
    const correo = String(body?.correo || '').trim().toLowerCase();
    const nuevaPassword = typeof body?.nuevaPassword === 'string' ? body.nuevaPassword : '';

    if (!usuarioNominaId || !authUserId) {
      return NextResponse.json({ error: 'Datos incompletos para actualizar credenciales' }, { status: 400 });
    }

    if (!correo) {
      return NextResponse.json({ error: 'El correo es obligatorio' }, { status: 400 });
    }

    if (nuevaPassword && nuevaPassword.length < 8) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 8 caracteres' }, { status: 400 });
    }

    const authHeader = req.headers.get('authorization') || '';
    const accessToken = authHeader.toLowerCase().startsWith('bearer ')
      ? authHeader.slice(7).trim()
      : '';

    if (!accessToken) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const requestSupabase = createSupabaseFromRequest(req);
    const { data: authData, error: authError } = await requestSupabase.auth.getUser(accessToken);

    if (authError || !authData.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const adminSupabase = createAdminSupabaseClient();

    const { data: actorNomina, error: actorError } = await adminSupabase
      .from('usuario_nomina')
      .select('rol')
      .eq('auth_user_id', authData.user.id)
      .single();

    if (actorError || actorNomina?.rol !== 'administrador') {
      return NextResponse.json({ error: 'No autorizado para actualizar credenciales' }, { status: 403 });
    }

    const updatePayload: { email?: string; password?: string } = {};
    if (correo) updatePayload.email = correo;
    if (nuevaPassword) updatePayload.password = nuevaPassword;

    const { error: updateAuthError } = await adminSupabase.auth.admin.updateUserById(authUserId, updatePayload);

    if (updateAuthError) {
      return NextResponse.json({ error: updateAuthError.message }, { status: 400 });
    }

    const { error: updateNominaError } = await adminSupabase
      .from('usuario_nomina')
      .update({ correo_electronico: correo })
      .eq('id', usuarioNominaId)
      .eq('auth_user_id', authUserId);

    if (updateNominaError) {
      return NextResponse.json({ error: updateNominaError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error interno del servidor' }, { status: 500 });
  }
}
