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
  var __supabaseSessionCache: { user_id: string; expires_at: number; loaded_at: number } | null
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
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      // Persistir la sesion en localStorage para que sobreviva recargas.
      persistSession: true,
      // Activado: Supabase maneja el refresh automatico en background.
      // Con los parches puestos en getSession() y el AuthProvider, no
      // se produce el ciclo de 429 que ocurría antes.
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  // ---------------------------------------------------------------------
  // PATCH CRITICO: parchea auth.getSession para que NO dispare un
  // refresh en cada llamada. El problema original era que en el codigo
  // habia 73 llamadas a supabase.auth.getSession() en distintas paginas
  // y componentes. Cada llamada pasa por __loadSession() que, si la
  // sesion esta a < 90s de expirar (constante EXPIRY_MARGIN_MS de
  // auth-js), llama a _refreshAccessToken(). Resultado: 10+ POST a
  // /auth/v1/token en pocos segundos -> 429 Too Many Requests.
  //
  // autoRefreshToken: false solo desactiva el timer periodico, NO
  // desactiva el refresh en getSession(). Por eso este parche es
  // indispensable.
  //
  // Estrategia: si la sesion del storage tiene > 5 min de validez,
  // devolvemos esa sesion sin tocar a Supabase. Si esta por expirar,
  // disparamos un refresh deduplicado. Solo caemos al getSession
  // original si el storage esta vacio (caso patologico).
  // ---------------------------------------------------------------------
  const originalGetSession = client.auth.getSession.bind(client.auth)
  ;(client.auth as any).getSession = async function patchedGetSession() {
    const stored = getSessionFromStorage()
    if (stored?.user_id) {
      const remaining = stored.expires_at - Date.now()
      if (remaining > PROACTIVE_REFRESH_MARGIN_MS) {
        // Sesion fresca: devolver la del storage COMPLETA sin tocar
        // Supabase. Asi preservamos todos los campos (aud, role, etc)
        // que algunos consumidores esperan.
        const fullSession = readFullSessionFromStorage()
        if (fullSession) {
          return { data: { session: fullSession }, error: null } as any
        }
      }
      // Sesion por expirar: usar el refresh deduplicado.
      const fullSession = readFullSessionFromStorage()
      if (fullSession) {
        await refreshSessionOnce(client, fullSession)
      }
    }
    // Si llegamos aqui, o no hay storage o no se pudo refrescar.
    // Caemos al getSession original (que SI puede hacer su refresh
    // interno, pero solo una vez porque ya intentamos arriba).
    return originalGetSession()
  }

  globalThis.__supabaseClient = client
  return globalThis.__supabaseClient
};

// ---------------------------------------------------------------------------
// Deduplicacion de refreshes: si varios componentes llaman a refresh
// casi al mismo tiempo, todos reciben la misma promesa. Evita oleadas
// de POST /auth/v1/token que el API de Supabase rate-limita (429).
// ---------------------------------------------------------------------------
const REFRESH_LOCK_MS = 1500
let refreshInFlight: Promise<string | null> | null = null
let refreshInFlightExpiresAt = 0

const refreshSessionOnce = async (
  supabase: SupabaseClient,
  currentSession: any
): Promise<string | null> => {
  if (refreshInFlight && Date.now() < refreshInFlightExpiresAt) {
    return refreshInFlight
  }
  refreshInFlight = (async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession(currentSession)
      if (error || !data?.session?.user?.id) return null
      // Refrescar la cache en memoria con la nueva expiracion.
      globalThis.__supabaseSessionCache = {
        user_id: data.session.user.id,
        expires_at: (data.session.expires_at ?? 0) * 1000,
        loaded_at: Date.now(),
      }
      return data.session.user.id
    } finally {
      setTimeout(() => {
        if (Date.now() >= refreshInFlightExpiresAt) {
          refreshInFlight = null
        }
      }, REFRESH_LOCK_MS)
    }
  })()
  refreshInFlightExpiresAt = Date.now() + REFRESH_LOCK_MS
  return refreshInFlight
}

/**
 * Limpia caches en memoria del helper. Llamar tras signIn o signOut
 * para que el siguiente login no herede un lock obsoleto.
 */
export const clearSupabaseCaches = () => {
  refreshInFlight = null
  refreshInFlightExpiresAt = 0
  globalThis.__supabaseSessionCache = null
}

// ---------------------------------------------------------------------------
// Cache en memoria de la sesion. Evita que cada componente tenga que
// parsear localStorage en cada render. La cache vive hasta logout o
// hasta que un refresh la actualice.
// ---------------------------------------------------------------------------
const SESSION_CACHE_TTL_MS = 30_000  // 30s; suficiente para no re-leer
                                     // storage en cada navegacion

const readSessionFromMemory = (): { user_id: string; expires_at: number } | null => {
  const c = globalThis.__supabaseSessionCache
  if (!c) return null
  if (Date.now() - c.loaded_at > SESSION_CACHE_TTL_MS) return null
  return { user_id: c.user_id, expires_at: c.expires_at }
}

const writeSessionToMemory = (user_id: string, expires_at: number) => {
  globalThis.__supabaseSessionCache = {
    user_id,
    expires_at,
    loaded_at: Date.now(),
  }
}

// Margen para considerar la sesion "por expirar" y forzar un refresh
// proactivo. Si el access token expira en menos de este margen, lo
// refrescamos antes de cualquier query.
const PROACTIVE_REFRESH_MARGIN_MS = 5 * 60 * 1000  // 5 min
// Margen duro: si la sesion expira en menos de esto, devolvemos null
// directamente (caso patologico: sesion claramente expirada).
const HARD_EXPIRY_MARGIN_MS = 30_000  // 30s

/**
 * Lee la sesion persistida de localStorage / sessionStorage con cache
 * en memoria. SIN tocar al cliente de Supabase.
 *
 * Por que existe: en @supabase/auth-js v2, auth.getSession() llama
 * internamente a __loadSession() que dispara un refresh automatico
 * cuando la sesion esta a < 90s de expirar (constante EXPIRY_MARGIN_MS).
 * Esa flag (autoRefreshToken: false) NO deshabilita ese refresh; solo
 * deshabilita el tick automatico. El resultado es un bucle de 429s en
 * /auth/v1/token cuando hay multiples llamadas a getSession() en la app.
 *
 * Esta funcion evita ese problema leyendo del storage directamente y
 * cacheando en memoria. Devuelve ademas el expires_at para que el
 * caller pueda decidir si necesita un refresh proactivo.
 */
export const getSessionFromStorage = (): { user_id: string; expires_at: number } | null => {
  if (typeof window === 'undefined') return null

  // Cache hit: devolvemos la sesion cacheada sin tocar localStorage.
  const cached = readSessionFromMemory()
  if (cached) return cached

  // Cache miss: leer de localStorage.
  const candidates: string[] = []
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && ((k.startsWith('sb-') && k.endsWith('-auth-token')) || k === 'supabase.auth.token')) {
        candidates.push(k)
      }
    }
  } catch {
    return null
  }

  for (const key of candidates) {
    try {
      const raw = localStorage.getItem(key)
      if (!raw) continue
      const session = JSON.parse(raw)
      if (!session?.user?.id) continue
      const expiresAt = typeof session.expires_at === 'number' ? session.expires_at * 1000 : 0
      if (expiresAt === 0) {
        // Sesion sin expiracion declarada: solo cacheamos el user_id.
        writeSessionToMemory(session.user.id, Number.MAX_SAFE_INTEGER)
        return { user_id: session.user.id, expires_at: Number.MAX_SAFE_INTEGER }
      }
      writeSessionToMemory(session.user.id, expiresAt)
      return { user_id: session.user.id, expires_at: expiresAt }
    } catch {
      continue
    }
  }
  return null
}

/**
 * Devuelve el user.id de la sesion actual de Supabase, refrescando el
 * access token si esta por expirar o si la sesion no esta en storage.
 *
 * Tolerante a:
 *  - 429 Too Many Requests (espera 2s y reintenta).
 *  - Auto-refresh en curso (dedupe via refreshSessionOnce).
 *  - Latencia de red (espera activa hasta `maxWaitMs`).
 *
 * Devuelve `null` SOLO cuando la sesion es irrecuperable (refresh
 * token invalido, sesion cerrada en otro dispositivo, etc).
 *
 * Comportamiento clave (Capa 1 del fix de sesiones):
 * 1) Si la sesion en storage tiene > 5 min de validez, devolvemos
 *    el user_id sin tocar al cliente de Supabase. Esto elimina las
 *    oleadas de getSession() que disparaban refreshes internos.
 * 2) Si la sesion esta en el margen de 5 min, usamos refreshSessionOnce
 *    (con dedupe de 1.5s) en vez de getSession() (sin dedupe). Esto
 *    es la causa raiz de los 429.
 * 3) Si la sesion esta a < 30s de expirar, devolvemos null y dejamos
 *    que un refresh explicito la recupere.
 */
export const getAuthUserId = async (
  supabase?: SupabaseClient,
  maxWaitMs = 4000
): Promise<string | null> => {
  const client = supabase ?? createSupabaseClient()
  const start = Date.now()
  let lastError: any = null

  while (Date.now() - start < maxWaitMs) {
    // Paso 1: leer del storage (con cache en memoria). Si la sesion
    // tiene > 5 min de validez, devolvemos el user_id sin tocar al
    // cliente. Esto es la optimizacion clave que evita los 429.
    const stored = getSessionFromStorage()
    if (stored?.user_id) {
      const remaining = stored.expires_at - Date.now()
      if (remaining > PROACTIVE_REFRESH_MARGIN_MS) {
        return stored.user_id
      }
      // Sesion por expirar (< 5 min). Refrescar proactivamente con
      // dedupe. NO usar getSession() aqui porque dispara el refresh
      // interno de auth-js sin deduplicacion, que es la causa de los
      // 429 cuando varios componentes llaman en paralelo.
      if (remaining > HARD_EXPIRY_MARGIN_MS) {
        // Necesitamos la sesion completa para el refresh. Leemos del
        // storage directamente sin pasar por el cliente.
        const fullSession = readFullSessionFromStorage()
        if (fullSession) {
          const userId = await refreshSessionOnce(client, fullSession)
          if (userId) return userId
          lastError = 'refresh_failed'
        }
      }
      // remaining <= 30s: sesion casi muerta, dejamos que el flujo
      // caiga al cliente para forzar un refresh completo.
    }

    // Paso 2: caer al cliente. getSession() puede disparar un refresh
    // interno si la sesion esta dentro de su margen de 90s. Hacemos
    // esto solo si el storage no tenia una sesion usable.
    const { data: { session } } = await client.auth.getSession()
    if (session?.user?.id) {
      const expiresAt = session.expires_at ? session.expires_at * 1000 : 0
      if (expiresAt === 0 || expiresAt > Date.now() + 30000) {
        writeSessionToMemory(session.user.id, expiresAt || Number.MAX_SAFE_INTEGER)
        return session.user.id
      }
      const userId = await refreshSessionOnce(client, session)
      if (userId) return userId
      lastError = 'refresh_failed'
    }

    // Paso 3: rehidratar via getUser.
    const { data: { user }, error: userError } = await client.auth.getUser()
    if (!userError && user?.id) {
      writeSessionToMemory(user.id, Number.MAX_SAFE_INTEGER)
      return user.id
    }
    lastError = userError ?? lastError

    if (userError) {
      const status = (userError as any).status ?? 0
      const msg = String(userError.message ?? '')
      if (
        status === 401 ||
        msg.includes('Auth session missing') ||
        msg.includes('Invalid Refresh Token') ||
        msg.includes('Refresh Token Not Found')
      ) {
        return null
      }
      if (status === 429 || msg.includes('Too Many')) {
        await new Promise(r => setTimeout(r, 2000))
        continue
      }
    }

    await new Promise(r => setTimeout(r, 250))
  }

  console.warn('getAuthUserId: timeout despues de', maxWaitMs, 'ms', lastError)
  return null
}

/**
 * Lee la sesion COMPLETA del storage (necesaria para refreshSession).
 * NO cachea: cada llamada es una lectura a localStorage. Usar con
 * moderacion.
 */
const readFullSessionFromStorage = (): any | null => {
  if (typeof window === 'undefined') return null
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && ((k.startsWith('sb-') && k.endsWith('-auth-token')) || k === 'supabase.auth.token')) {
        const raw = localStorage.getItem(k)
        if (!raw) continue
        const session = JSON.parse(raw)
        if (session?.user?.id && session?.access_token) return session
      }
    }
  } catch {}
  return null
}

/**
 * Variante que devuelve la sesion completa (o null). Util cuando se
 * necesita ademas del user.id otros campos como access_token.
 */
export const getValidSession = async (
  supabase?: SupabaseClient,
  maxWaitMs = 4000
) => {
  const client = supabase ?? createSupabaseClient()
  const userId = await getAuthUserId(client, maxWaitMs)
  if (!userId) return null
  const { data: { session } } = await client.auth.getSession()
  if (session?.user?.id === userId) return session
  const { data: { session: refreshed } } = await client.auth.refreshSession()
  return refreshed ?? null
}

// ---------------------------------------------------------------------------
// Capa 3: Wrapper de queries con auto-refresh en 400/401
// ---------------------------------------------------------------------------
// PostgREST devuelve 400 (no 401) cuando el JWT expira dentro de su
// ventana de gracia. Esto rompe queries que deberian funcionar tras
// un refresh. Este wrapper detecta ese caso, fuerza un refresh y
// reintenta la query una sola vez.

const QUERY_RETRY_CACHE_MS = 5000
let lastRetryAt = 0

/**
 * Determina si un error de query es probablemente por JWT expirado.
 * 400 + RLS-related + sin datos es el patron tipico.
 */
const isAuthLikelyExpiredError = (error: any, data: any): boolean => {
  if (!error) return false
  const status = (error as any).status ?? (error as any).statusCode ?? 0
  const code = (error as any).code ?? ''
  const msg = String(error.message ?? '').toLowerCase()
  if (status === 401) return true
  if (status === 400 && (data === null || (Array.isArray(data) && data.length === 0))) {
    // 400 + sin datos suele ser RLS fallando por auth.uid() nulo.
    return true
  }
  if (msg.includes('jwt') || msg.includes('token') || msg.includes('auth')) return true
  if (code === 'PGRST301' || code === '401') return true
  return false
}

/**
 * Ejecuta una query de Supabase y, si falla por un error que parece
 * ser de JWT expirado, fuerza un refresh y reintenta una sola vez.
 *
 * Usar asi:
 *   const { data, error } = await withAuthRetry(() =>
 *     supabase.from('permisos_aprobaciones').select('*').eq('solicitud_id', id)
 *   )
 *
 * Nota: la funcion pasada debe devolver un thenable (PostgrestQueryBuilder
 * lo es), no necesariamente una Promise tipada.
 */
export const withAuthRetry = async <T>(
  queryFn: () => PromiseLike<{ data: T | null; error: any }> | { data: T | null; error: any }
): Promise<{ data: T | null; error: any; retried?: boolean }> => {
  const result = await queryFn()
  if (!isAuthLikelyExpiredError(result.error, result.data)) {
    return result
  }

  // Anti-bucle: si reintentamos hace menos de 5s, no reintentamos
  // de nuevo (evita cascading 429s).
  if (Date.now() - lastRetryAt < QUERY_RETRY_CACHE_MS) {
    return result
  }

  // Forzar refresh con dedupe.
  const supabase = createSupabaseClient()
  const fullSession = readFullSessionFromStorage()
  if (fullSession) {
    const userId = await refreshSessionOnce(supabase, fullSession)
    if (userId) {
      lastRetryAt = Date.now()
      const retried = await queryFn()
      return { ...retried, retried: true }
    }
  }

  return result
}
