import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { normRol } from '@/lib/roles';

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

function getAccessToken(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization') || '';
  if (authHeader.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice(7).trim();
  }
  return null;
}

export type SupabaseClient = ReturnType<typeof createSupabaseFromRequest>;

export async function requireAdmin(req: NextRequest) {
  const accessToken = getAccessToken(req);
  if (!accessToken) {
    return { error: NextResponse.json({ error: 'No autenticado' }, { status: 401 }) };
  }
  const supabase = createSupabaseFromRequest(req);
  const { data: userData, error: authError } = await supabase.auth.getUser(accessToken);
  if (authError || !userData.user) {
    return { error: NextResponse.json({ error: 'No autenticado' }, { status: 401 }) };
  }
  const authUserId = userData.user.id;

  const { data: nomina, error } = await supabase
    .from('usuario_nomina')
    .select('rol, estado, auth_user_id')
    .eq('auth_user_id', authUserId)
    .single();

  if (error || !nomina) {
    return { error: NextResponse.json({ error: 'Usuario no encontrado' }, { status: 403 }) };
  }
  if (normRol(nomina.rol) !== 'administrador') {
    return { error: NextResponse.json({ error: 'Sin permisos de administrador' }, { status: 403 }) };
  }
  if (nomina.estado !== 'activo') {
    return { error: NextResponse.json({ error: 'Usuario inactivo' }, { status: 403 }) };
  }

  return { supabase, authUserId, accessToken };
}

export async function requireAuth(req: NextRequest) {
  const accessToken = getAccessToken(req);
  if (!accessToken) {
    return { error: NextResponse.json({ error: 'No autenticado' }, { status: 401 }) };
  }
  const supabase = createSupabaseFromRequest(req);
  const { data: userData, error: authError } = await supabase.auth.getUser(accessToken);
  if (authError || !userData.user) {
    return { error: NextResponse.json({ error: 'No autenticado' }, { status: 401 }) };
  }
  return { supabase, authUserId: userData.user.id, accessToken };
}