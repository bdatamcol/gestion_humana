import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware deshabilitado temporalmente.
 *
 * El middleware original usaba @supabase/supabase-js directamente
 * en el contexto del servidor, lo cual no funciona correctamente:
 *   - El cliente de servidor no tiene acceso a localStorage.
 *   - Cada request creaba un cliente nuevo.
 *   - getSession() siempre devolvia null (sesion solo en localStorage).
 *   - El signOut() invalidaba el refresh token.
 *
 * Esto causaba que la sesion se "borrara" aparentemente al navegar.
 * La autenticacion se valida correctamente del lado del cliente en
 * cada layout/pagina protegida (AdministracionLayout, PerfilLayout)
 * usando AuthProvider, que SI tiene acceso a localStorage.
 *
 * Si en el futuro se requiere proteccion server-side, usar
 * @supabase/ssr con cookies adapter.
 */
export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/perfil/:path*',
    '/administracion/:path*',
  ],
};
