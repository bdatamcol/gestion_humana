import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase-server';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from('publicaciones_feed360')
    .select(`
      *,
      tematica:tematicas_feed360(id, titulo),
      usuario:usuario_nomina(id, colaborador, cargo, imagen_perfil),
      comentarios:comentarios_feed360(
        id, contenido, created_at,
        usuario:usuario_nomina(id, colaborador, imagen_perfil)
      ),
      likes:likes_feed360(id, usuario_id)
    `)
    .eq('id', id)
    .single();

  if (error) {
    return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createAdminSupabaseClient();

  const { error } = await supabase
    .from('publicaciones_feed360')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}