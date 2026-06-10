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
  // eslint-disable-next-line no-var
  var __supabaseRawSession: any | null | undefined
}

const DEBUG_SERVER_URL = 'http://127.0.0.1:7778/event'
const DEBUG_SESSION_ID = 'auth-refresh-loop'
const DEBUG_RUN_ID = 'post-fix'

// #region debug-point A:supabase-debug-helper
const reportDebugEvent = (hypothesisId: string, location: string, msg: string, data: Record<string, unknown> = {}) => {
  if (typeof window === 'undefined') return
  fetch(DEBUG_SERVER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: DEBUG_SESSION_ID,
      runId: DEBUG_RUN_ID,
      hypothesisId,
      location,
      msg: `[DEBUG] ${msg}`,
      data,
      ts: Date.now(),
    }),
  }).catch(() => {})
}
// #endregion

const readRawSessionFromStorage = (): any | null => {
  if (typeof window === 'undefined') return null
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key) continue
      if ((key.startsWith('sb-') && key.endsWith('-auth-token')) || key === 'supabase.auth.token') {
        const raw = localStorage.getItem(key)
        if (!raw) continue
          const parsed = normalizeSession(JSON.parse(raw))
          if (parsed?.access_token && parsed?.user?.id) {
            persistRawSessionToStorage(parsed, key)
            return parsed
        }
      }
    }
  } catch {}
  return null
}

const decodeJwtPayload = (token: string): Record<string, unknown> | null => {
  try {
    const [, payload] = token.split('.')
    if (!payload) return null
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
    const decoded = typeof window !== 'undefined'
      ? window.atob(padded)
      : Buffer.from(padded, 'base64').toString('utf-8')
    return JSON.parse(decoded) as Record<string, unknown>
  } catch {
    return null
  }
}

const getSessionStorageKeys = (): string[] => {
  if (typeof window === 'undefined') return []
  const keys: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key) continue
    if ((key.startsWith('sb-') && key.endsWith('-auth-token')) || key === 'supabase.auth.token') {
      keys.push(key)
    }
  }
  return keys
}

const normalizeSession = (session: any | null | undefined): any | null => {
  if (!session?.access_token || !session?.user?.id) {
    return session ?? null
  }

  const jwtPayload = decodeJwtPayload(session.access_token)
  const jwtExp = typeof jwtPayload?.exp === 'number' ? jwtPayload.exp : null
  const currentExpiresAt = typeof session.expires_at === 'number' ? session.expires_at : null
  const nowSeconds = Math.floor(Date.now() / 1000)

  if (!jwtExp) {
    return session
  }

  const normalizedExpiresAt = jwtExp
  const normalizedExpiresIn = Math.max(jwtExp - nowSeconds, 0)
  const shouldRewrite =
    currentExpiresAt === null ||
    Math.abs(currentExpiresAt - normalizedExpiresAt) > 60 ||
    currentExpiresAt < nowSeconds

  if (!shouldRewrite) {
    return session
  }

  // Fuerza coherencia entre el JWT real y los metadatos de expiracion
  // usados por auth-js al rehidratar la sesion desde storage.
  return {
    ...session,
    expires_at: normalizedExpiresAt,
    expires_in: normalizedExpiresIn,
  }
}

const persistRawSessionToStorage = (session: any | null, preferredKey?: string | null) => {
  if (typeof window === 'undefined' || !session?.access_token || !session?.user?.id) return
  try {
    const keys = preferredKey ? [preferredKey] : getSessionStorageKeys()
    for (const key of keys) {
      localStorage.setItem(key, JSON.stringify(session))
    }
  } catch {}
}

export const setSupabaseRawSession = (session: any | null) => {
  const normalizedSession = normalizeSession(session)
  globalThis.__supabaseRawSession = normalizedSession
  if (normalizedSession?.access_token) {
    persistRawSessionToStorage(normalizedSession)
    globalThis.__supabaseClient?.realtime
      ?.setAuth(normalizedSession.access_token)
      .catch(() => {})
  } else {
    globalThis.__supabaseClient?.realtime?.setAuth(null).catch(() => {})
  }
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
  if (globalThis.__supabaseClient) {
    // #region debug-point D:reuse-client
    reportDebugEvent('D', 'lib/supabase.ts:createSupabaseClient', 'Reusing existing Supabase client')
    // #endregion
    return globalThis.__supabaseClient
  }
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://aqmlxjsyczqtfansvnqr.supabase.co';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxbWx4anN5Y3pxdGZhbnN2bnFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI5MzM3NTYsImV4cCI6MjA1ODUwOTc1Nn0._dfB0vDYrR4jQ1cFHPXr_6iGTUXctzTeZbIcE4FJ0lk';
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Las variables de entorno de Supabase no están configuradas');
  }
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: false,
      detectSessionInUrl: true,
    },
  });

  // #region debug-point D:create-client
  reportDebugEvent('D', 'lib/supabase.ts:createSupabaseClient', 'Created new Supabase client')
  // #endregion

  const originalGetSession = client.auth.getSession.bind(client.auth)
  client.auth.getSession = async () => {
    const rawSession = normalizeSession(globalThis.__supabaseRawSession ?? readRawSessionFromStorage())
    if (rawSession?.access_token && rawSession?.user?.id) {
      setSupabaseRawSession(rawSession)
      // #region debug-point C:get-session-raw-storage
      reportDebugEvent('C', 'lib/supabase.ts:auth.getSession', 'Returning raw session from storage/cache', {
        userId: rawSession.user.id,
        expiresAt: rawSession.expires_at ?? null,
      })
      // #endregion
      return { data: { session: rawSession }, error: null } as any
    }
    const stack = new Error().stack?.split('\n').slice(1, 5).map((line) => line.trim()) ?? []
    // #region debug-point A:get-session-start
    reportDebugEvent('A', 'lib/supabase.ts:auth.getSession', 'Calling auth.getSession', { stack })
    // #endregion
    const result = await originalGetSession()
    // #region debug-point A:get-session-end
    reportDebugEvent('A', 'lib/supabase.ts:auth.getSession', 'auth.getSession resolved', {
      hasSession: !!result.data.session,
      userId: result.data.session?.user?.id ?? null,
      expiresAt: result.data.session?.expires_at ?? null,
      error: result.error?.message ?? null,
    })
    // #endregion
    if (result.data.session?.access_token) {
      setSupabaseRawSession(result.data.session)
    }
    return result
  }

  const originalGetUser = client.auth.getUser.bind(client.auth)
  client.auth.getUser = async (jwt?: string) => {
    if (!jwt) {
      const rawSession = normalizeSession(globalThis.__supabaseRawSession ?? readRawSessionFromStorage())
      if (rawSession?.user?.id) {
        setSupabaseRawSession(rawSession)
        // #region debug-point C:get-user-raw-storage
        reportDebugEvent('C', 'lib/supabase.ts:auth.getUser', 'Returning user from raw session cache', {
          userId: rawSession.user.id,
        })
        // #endregion
        return { data: { user: rawSession.user }, error: null } as any
      }
    }
    return await originalGetUser(jwt as any)
  }

  const originalRefreshSession = client.auth.refreshSession.bind(client.auth)
  client.auth.refreshSession = async (...args) => {
    const stack = new Error().stack?.split('\n').slice(1, 5).map((line) => line.trim()) ?? []
    // #region debug-point C:refresh-session-start
    reportDebugEvent('C', 'lib/supabase.ts:auth.refreshSession', 'Calling auth.refreshSession', {
      hasArgSession: !!args[0],
      stack,
    })
    // #endregion
    const result = await originalRefreshSession(...args)
    // #region debug-point C:refresh-session-end
    reportDebugEvent('C', 'lib/supabase.ts:auth.refreshSession', 'auth.refreshSession resolved', {
      hasSession: !!result.data.session,
      userId: result.data.session?.user?.id ?? null,
      expiresAt: result.data.session?.expires_at ?? null,
      error: result.error?.message ?? null,
    })
    // #endregion
    return result
  }

  globalThis.__supabaseClient = client
  return globalThis.__supabaseClient
};

/**
 * Limpia caches en memoria del helper. Llamar tras signIn o signOut
 * para que el siguiente login no herede un lock obsoleto.
 */
export const clearSupabaseCaches = () => {
  globalThis.__supabaseRawSession = null
  globalThis.__supabaseClient?.realtime?.setAuth(null).catch(() => {})
}

/**
 * Devuelve el user.id de la sesion actual de Supabase.
 * Simplificado para usar supabase.auth.getSession() y delegar todo
 * el manejo de expiracion y refreshes a supabase-js, que es mas robusto.
 */
export const getAuthUserId = async (
  supabase?: SupabaseClient,
  _maxWaitMs = 4000
): Promise<string | null> => {
  const client = supabase ?? createSupabaseClient()
  const { data: { session } } = await client.auth.getSession()
  return session?.user?.id ?? null
}

export const getValidSession = async (
  supabase?: SupabaseClient,
  _maxWaitMs = 4000
) => {
  const client = supabase ?? createSupabaseClient()
  const { data: { session } } = await client.auth.getSession()
  return session ?? null
}

/**
 * DEPRECATED: Retenido solo para compatibilidad hacia atras para no
 * romper las importaciones de componentes que lo usan.
 * El manejo de errores ahora lo debe hacer cada pagina o componente
 * individualmente si la sesion expira.
 */
export const withAuthRetry = async <T>(
  queryFn: () => PromiseLike<{ data: T | null; error: any }> | { data: T | null; error: any }
): Promise<{ data: T | null; error: any; retried?: boolean }> => {
  return await queryFn()
}
