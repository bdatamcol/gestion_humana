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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: publicacion_id } = await params;
  const supabase = createSupabaseFromRequest(req);

  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get('limit') || '10', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);
  const include_total = searchParams.get('include_total') === 'true';

  let query = supabase
    .from('comentarios_feed360')
    .select(`
      id, contenido, created_at,
      usuario:usuario_nomina(id, colaborador, avatar_path, genero)
    `, { count: include_total ? 'exact' : undefined })
    .eq('publicacion_id', publicacion_id)
    .order('created_at', { ascending: false });

  if (limit > 0) {
    query = query.range(offset, offset + limit - 1);
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const storageBase = process.env.NEXT_PUBLIC_SUPABASE_URL
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatar/`
    : '';

  const mapped = (data || []).map((c: any) => {
    const defaultAvatar = c?.usuario?.genero === 'F' ? 'defecto/avatar-f.webp' : 'defecto/avatar-m.webp';
    const avatarPath = c?.usuario?.avatar_path || defaultAvatar;
    const imagen_perfil = storageBase ? `${storageBase}${avatarPath}` : null;

    return {
      ...c,
      usuario: c.usuario
        ? {
            id: c.usuario.id,
            colaborador: c.usuario.colaborador,
            imagen_perfil,
          }
        : null,
    };
  });

  if (include_total) {
    return NextResponse.json({ comments: mapped, total: count || 0 });
  }

  return NextResponse.json(mapped);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: publicacion_id } = await params;
  const body = await req.json();
  const { contenido } = body;

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

  const insertData = {
    publicacion_id,
    usuario_id,
    contenido,
  };

  const { data, error } = await supabase
    .from('comentarios_feed360')
    .insert(insertData)
    .select('id, contenido, created_at, usuario_id')
    .single();

  if (error) {
    console.error('Error inserting comment:', error);
    return NextResponse.json({ error: error.message, details: error.code }, { status: 500 });
  }

  const { data: usuarioData, error: usuarioError } = await supabase
    .from('usuario_nomina')
    .select('id, colaborador, avatar_path, genero')
    .eq('id', usuario_id)
    .single();

  if (usuarioError) {
    console.error('Error fetching usuario:', usuarioError);
    return NextResponse.json({ error: usuarioError.message }, { status: 500 });
  }

  const storageBase = process.env.NEXT_PUBLIC_SUPABASE_URL
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatar/`
    : '';

  const defaultAvatar = usuarioData?.genero === 'F' ? 'defecto/avatar-f.webp' : 'defecto/avatar-m.webp';
  const avatarPath = usuarioData?.avatar_path || defaultAvatar;
  const imagen_perfil = storageBase ? `${storageBase}${avatarPath}` : null;

  const mapped = {
    ...data,
    usuario: {
      id: usuarioData.id,
      colaborador: usuarioData.colaborador,
      imagen_perfil,
    },
  };

  return NextResponse.json(mapped, { status: 201 });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createSupabaseFromRequest(req);

  const { error } = await supabase
    .from('comentarios_feed360')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
