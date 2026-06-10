'use client';

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Singleton unico de GoTrueClient en el navegador. Se guarda en
// globalThis para sobrevivir el HMR de Next.js (de lo contrario, cada
// hot-reload re-evalua el modulo y crea un nuevo cliente, generando
// el warning "Multiple GoTrueClient instances detected" y races en el
// refresh de tokens).
declare global {
  // eslint-disable-next-line no-var
  var __supabaseClient: SupabaseClient | undefined
}

/**
 * Normaliza el campo `rol` de usuario_nomina a lowercase.
 * Defensa contra datos legacy donde el rol pudo haber sido guardado
 * con casing mixto (e.g. 'Jefe', 'JEFE') antes de que la migracion
 * 042 estandarizara la columna.
 */
export const normRol = (rol: string | null | undefined): string =>
  (rol ?? '').toLowerCase().trim();

export const createSupabaseClient = (): SupabaseClient => {
  if (globalThis.__supabaseClient) return globalThis.__supabaseClient
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://aqmlxjsyczqtfansvnqr.supabase.co';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxbWx4anN5Y3pxdGZhbnN2bnFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI5MzM3NTYsImV4cCI6MjA1ODUwOTc1Nn0._dfB0vDYrR4jQ1cFHPXr_6iGTUXctzTeZbIcE4FJ0lk';
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Las variables de entorno de Supabase no están configuradas');
  }
  globalThis.__supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      // Persistir la sesion en localStorage y refrescar el access token
      // automaticamente cuando este cerca de expirar (comportamiento por
      // defecto, pero se hace explicito para que no se rompa en upgrades).
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return globalThis.__supabaseClient;
};

/**
 * Devuelve el user.id de la sesion actual de Supabase, refrescando el
 * access token si esta expirado. Centraliza la logica que antes vivia
 * copiada en cada page.tsx y que causaba errores espurios
 * "No se pudo validar tu sesion" cuando la pestana llevaba horas
 * abierta y el JWT (1h por defecto) habia expirado.
 *
 * Devuelve `null` si tras los reintentos no se pudo obtener una sesion
 * valida (refresh token vencido, sesion cerrada en otro dispositivo,
 * cookies bloqueadas, etc.).
 */
export const getAuthUserId = async (
  supabase?: SupabaseClient,
  retries = 3
): Promise<string | null> => {
  const client = supabase ?? createSupabaseClient();

  for (let attempt = 0; attempt <= retries; attempt++) {
    // 1) Leer la sesion persistida en localStorage
    const { data: { session } } = await client.auth.getSession();

    // 2) Si el access token ya expiro (o expira en los proximos 5s),
    //    forzar refresh contra /auth/v1/token antes de validar.
    //    Esto resuelve el caso "pestana abierta horas en background ->
    //    JWT expirado -> getUser() devuelve 401".
    const expiresAt = session?.expires_at ? session.expires_at * 1000 : 0;
    const isExpired = expiresAt > 0 && expiresAt <= Date.now() + 5000;
    if (session && isExpired) {
      const { data: refreshData, error: refreshError } =
        await client.auth.refreshSession(session);
      if (!refreshError && refreshData?.session?.user?.id) {
        return refreshData.session.user.id;
      }
    }

    if (session?.user?.id && !isExpired) {
      return session.user.id;
    }

    // 3) Validar contra el endpoint /auth/v1/user. Si falla con 401
    //    el token definitivamente esta expirado y/o el refresh fallo.
    const { data: { user }, error: userError } = await client.auth.getUser();
    if (!userError && user?.id) {
      return user.id;
    }

    // 4) Penultimo intento: forzar refresh explicito de la sesion
    //    persistida. Cubre el caso en que getSession() devolvio null
    //    transitoriamente pero el refresh token sigue siendo valido.
    if (attempt === retries - 1 && session) {
      const { data: refreshData, error: refreshError } =
        await client.auth.refreshSession(session);
      if (!refreshError && refreshData?.session?.user?.id) {
        return refreshData.session.user.id;
      }
    }

    if (attempt < retries) {
      // Backoff exponencial: 250, 500, 1000 ms
      await new Promise((resolve) => setTimeout(resolve, 250 * Math.pow(2, attempt)));
    }
  }

  return null;
};

/**
 * Variante que devuelve la sesion completa (o null). Util cuando se
 * necesita ademas del user.id otros campos como access_token.
 */
export const getValidSession = async (
  supabase?: SupabaseClient,
  retries = 3
) => {
  const client = supabase ?? createSupabaseClient();
  const userId = await getAuthUserId(client, retries);
  if (!userId) return null;
  const { data: { session } } = await client.auth.getSession();
  if (session?.user?.id === userId) return session;
  const { data: { session: refreshed } } = await client.auth.refreshSession();
  return refreshed ?? null;
};
