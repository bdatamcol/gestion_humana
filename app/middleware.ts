import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Función segura para crear el cliente de Supabase
const createSupabaseClientSafe = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Las variables de entorno de Supabase no están configuradas');
  }
  
  return createClient(supabaseUrl, supabaseAnonKey);
};

export async function middleware(request: NextRequest) {
  try {
    const supabase = createSupabaseClientSafe();

    // Verificar si el usuario está autenticado
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error || !session) {
      // Si no está autenticado, redirigir al login
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Obtener el rol y estado del usuario
    const { data: userData, error: userError } = await supabase
      .from('usuario_nomina')
      .select('rol, estado')
      .eq('auth_user_id', session.user.id)
      .single();

    if (userError) {
      throw userError;
    }

    // Verificar si el usuario está activo
    if (userData.estado !== 'activo') {
      // Si el usuario no está activo, cerrar sesión y redirigir al login
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Verificar acceso según el rol y permisos
    const path = request.nextUrl.pathname;

    if (path.startsWith('/administracion')) {
      // Los administradores tienen acceso completo
      if (userData.rol === 'administrador') {
        return NextResponse.next();
      }
      
      // Solo los administradores tienen acceso a las rutas de administración
      if (userData.rol !== 'administrador') {
        return NextResponse.redirect(new URL('/perfil', request.url));
      }
    }

    return NextResponse.next();
  } catch (error) {
    // En caso de error, redirigir al login
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

export const config = {
  matcher: [
    '/perfil/:path*',
    '/administracion/:path*'
  ]
};
