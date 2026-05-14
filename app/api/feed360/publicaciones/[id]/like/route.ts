import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: publicacion_id } = await params;
  const supabase = createSupabaseFromRequest(req);

  const { data: userData } = await supabase.auth.getUser();
  const authUserId = userData.user?.id;

  if (!authUserId) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const { data: usuarioNomina, error: userError } = await supabase
    .from('usuario_nomina')
    .select('id')
    .eq('auth_user_id', authUserId)
    .single();

  if (userError || !usuarioNomina?.id) {
    return NextResponse.json({ error: 'Usuario no asociado en nómina' }, { status: 400 });
  }

  const usuario_id = usuarioNomina.id;

  const { data, error } = await supabase.rpc('toggle_like', {
    p_publicacion_id: publicacion_id,
    p_usuario_id: usuario_id,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
