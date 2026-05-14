import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const estado = searchParams.get('estado');

  const supabase = createAdminSupabaseClient();

  let query = supabase
    .from('tematicas_feed360')
    .select('*')
    .order('created_at', { ascending: false });

  if (estado) {
    query = query.eq('estado', estado);
  } else {
    query = query.neq('estado', 'eliminada');
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { titulo, descripcion, fecha_inicio, fecha_fin, estado, imagen_url } = body;

  if (!imagen_url) {
    return NextResponse.json({ error: 'La imagen es requerida' }, { status: 400 });
  }

  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from('tematicas_feed360')
    .insert({
      titulo,
      descripcion,
      fecha_inicio,
      fecha_fin,
      estado: estado || 'abierta',
      imagen_url,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}