import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient, createServerSupabaseClient } from '@/lib/supabase-server';
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

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const tematica_id = searchParams.get('tematica_id');
    const search = searchParams.get('search');
    const sort = searchParams.get('sort');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    let supabase;
    try {
      supabase = createAdminSupabaseClient();
    } catch {
      supabase = createServerSupabaseClient();
    }

    let query = supabase
      .from('publicaciones_feed360')
      .select('*')
      .range(offset, offset + limit - 1);

    if (sort === 'likes_desc') {
      query = query
        .order('likes_count', { ascending: false })
        .order('created_at', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    if (tematica_id) {
      query = query.eq('tematica_id', tematica_id);
    }

    if (search) {
      query = query.ilike('texto', `%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const publicaciones = data || [];
    if (publicaciones.length === 0) {
      return NextResponse.json([]);
    }

    const tematicaIds = Array.from(new Set(publicaciones.map((p: any) => p.tematica_id).filter(Boolean)));
    const usuarioIds = Array.from(new Set(publicaciones.map((p: any) => p.usuario_id).filter(Boolean)));
    const publicacionIds = publicaciones.map((p: any) => p.id);

    const [tematicasRes, usuariosResWithAvatar, likesRes] = await Promise.all([
      tematicaIds.length
        ? supabase.from('tematicas_feed360').select('id,titulo').in('id', tematicaIds)
        : Promise.resolve({ data: [], error: null } as any),
      usuarioIds.length
        ? supabase.from('usuario_nomina').select('id,colaborador,avatar_path,genero').in('id', usuarioIds)
        : Promise.resolve({ data: [], error: null } as any),
      publicacionIds.length
        ? supabase.from('likes_feed360').select('publicacion_id,usuario_id').in('publicacion_id', publicacionIds)
        : Promise.resolve({ data: [], error: null } as any),
    ]);

    let usuariosRes = usuariosResWithAvatar;
    if (usuariosResWithAvatar.error && usuarioIds.length) {
      const fallbackUsers = await supabase.from('usuario_nomina').select('id,colaborador').in('id', usuarioIds);

      usuariosRes = {
        data: (fallbackUsers.data || []).map((u: any) => ({ ...u, imagen_perfil: null })),
        error: fallbackUsers.error,
      } as any;
    }

    if (tematicasRes.error) {
      return NextResponse.json({ error: tematicasRes.error.message }, { status: 500 });
    }
    if (usuariosRes.error) {
      return NextResponse.json({ error: usuariosRes.error.message }, { status: 500 });
    }
    if (likesRes.error) {
      return NextResponse.json({ error: likesRes.error.message }, { status: 500 });
    }

    const tematicasMap = new Map((tematicasRes.data || []).map((t: any) => [t.id, t]));
    const storageBase = process.env.NEXT_PUBLIC_SUPABASE_URL
      ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatar/`
      : '';

    const usuariosMap = new Map(
      (usuariosRes.data || []).map((u: any) => {
        const defaultAvatar = u?.genero === 'F' ? 'defecto/avatar-f.webp' : 'defecto/avatar-m.webp';
        const avatarPath = u?.avatar_path || defaultAvatar;
        const imagen_perfil = storageBase ? `${storageBase}${avatarPath}` : null;

        return [
          u.id,
          {
            id: u.id,
            colaborador: u.colaborador,
            imagen_perfil,
          },
        ];
      })
    );
    const likesByPub = new Map<string, Array<{ usuario_id: number }>>();

    for (const like of likesRes.data || []) {
      const arr = likesByPub.get(like.publicacion_id) || [];
      arr.push({ usuario_id: like.usuario_id });
      likesByPub.set(like.publicacion_id, arr);
    }

    const enriched = publicaciones.map((p: any) => ({
      ...p,
      tematica: tematicasMap.get(p.tematica_id) || null,
      usuario: usuariosMap.get(p.usuario_id) || null,
      likes: likesByPub.get(p.id) || [],
    }));

    return NextResponse.json(enriched);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Error interno al listar publicaciones' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { tematica_id, imagen_url, texto } = body;

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

  const { data: existing } = await supabase
    .from('publicaciones_feed360')
    .select('id')
    .eq('tematica_id', tematica_id)
    .eq('usuario_id', usuario_id)
    .single();

  if (existing) {
    return NextResponse.json(
      { error: 'Ya has publicado en esta temática' },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('publicaciones_feed360')
    .insert({
      tematica_id,
      usuario_id,
      imagen_url,
      texto,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
