import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const seccion = searchParams.get('seccion');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '12');
  const offset = (page - 1) * limit;

  if (!seccion) {
    return NextResponse.json({ error: 'Sección requerida' }, { status: 400 });
  }

  try {
    const supabase = createServerSupabaseClient();

    // Query para obtener las publicaciones con información del autor
    const { data: publicaciones, error: publicacionesError } = await supabase
      .from('publicaciones_bienestar')
      .select(`
        id,
        titulo,
        contenido,
        imagen_principal,
        galeria_imagenes,
        fecha_publicacion,
        estado,
        tipo_seccion,
        autor_id,
        usuario_nomina!inner(
          colaborador,
          cargos(nombre)
        )
      `)
      .eq('tipo_seccion', seccion)
      .eq('estado', 'publicado')
      .order('fecha_publicacion', { ascending: false })
      .range(offset, offset + limit - 1);

    if (publicacionesError) {
      throw publicacionesError;
    }

    // Query para obtener el total de publicaciones
    const { count, error: countError } = await supabase
      .from('publicaciones_bienestar')
      .select('*', { count: 'exact', head: true })
      .eq('tipo_seccion', seccion)
      .eq('estado', 'publicado');

    if (countError) {
      throw countError;
    }

    // Formatear las publicaciones
    const formattedPublicaciones = (publicaciones || []).map(pub => ({
      id: pub.id,
      titulo: pub.titulo,
      contenido: pub.contenido,
      imagen_principal: pub.imagen_principal,
      galeria_imagenes: pub.galeria_imagenes || [],
      fecha_publicacion: pub.fecha_publicacion,
      estado: pub.estado,
      seccion: pub.tipo_seccion,
      autor_id: pub.autor_id,
      autor: pub.usuario_nomina && Array.isArray(pub.usuario_nomina) && pub.usuario_nomina[0] ? {
        nombre: pub.usuario_nomina[0].colaborador?.split(' ')[0] || '',
        apellido: pub.usuario_nomina[0].colaborador?.split(' ').slice(1).join(' ') || '',
        email: ''
      } : null
    }));

    return NextResponse.json({
      publicaciones: formattedPublicaciones,
      total: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit)
    });

  } catch (error) {
    console.error('Error fetching publicaciones:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
