"use client"

/**
 * AuthProvider
 *
 * Centraliza el estado de autenticacion para toda la aplicacion.
 * Antes de este componente, cada layout/pagina llamaba a
 * `getAuthUserId()` independientemente, lo que provocaba:
 *   - Multiples llamadas paralelas a Supabase al navegar.
 *   - Cada llamada podia disparar un refresh interno (sin dedupe).
 *   - Cascading 429 Too Many Requests en /auth/v1/token.
 *
 * Este provider:
 *   1) Carga el user_id UNA vez al montar.
 *   2) Lo expone via useAuth() para que cualquier componente lo
 *      consuma sin volver a llamar a Supabase.
 *   3) Programa un refresh proactivo 5 min antes de expirar.
 *   4) Reacciona a eventos de Supabase (sign out en otra pestana).
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import {
  createSupabaseClient,
  getAuthUserId,
  getSessionFromStorage,
  clearSupabaseCaches,
} from "@/lib/supabase"

interface AuthContextValue {
  /** user.id de Supabase Auth, o null si no hay sesion. */
  userId: string | null
  /** True mientras la sesion inicial se esta validando. */
  loading: boolean
  /** Ultimo error conocido (no fatal; la UI puede seguir). */
  error: string | null
  /** Fuerza una revalidacion (refresh proactivo + reload desde storage). */
  refresh: () => Promise<void>
  /** Cierra la sesion y limpia caches. */
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

// Margen para refrescar proactivamente (debe coincidir con el de
// lib/supabase.ts:PROACTIVE_REFRESH_MARGIN_MS).
const PROACTIVE_REFRESH_MARGIN_MS = 5 * 60 * 1000

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Ref para evitar programar multiples refresh timers.
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const scheduleProactiveRefresh = useCallback((expiresAt: number) => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current)
      refreshTimerRef.current = null
    }
    if (!Number.isFinite(expiresAt) || expiresAt === Number.MAX_SAFE_INTEGER) {
      // Sin expiracion conocida: refrescar cada 30 min por seguridad.
      refreshTimerRef.current = setTimeout(() => {
        void doRefresh()
      }, 30 * 60 * 1000)
      return
    }
    const msUntilRefresh = Math.max(
      expiresAt - Date.now() - PROACTIVE_REFRESH_MARGIN_MS,
      5_000  // minimo 5s para evitar hot loop
    )
    refreshTimerRef.current = setTimeout(() => {
      void doRefresh()
    }, msUntilRefresh)
  }, [])

  const doRefresh = useCallback(async () => {
    try {
      const supabase = createSupabaseClient()
      const id = await getAuthUserId(supabase, 4000)
      setUserId(id)
      if (!id) {
        setError("Sesion expirada")
      } else {
        setError(null)
      }
      // Reprogramar el proximo refresh.
      const stored = getSessionFromStorage()
      if (stored?.expires_at) {
        scheduleProactiveRefresh(stored.expires_at)
      }
    } catch (e: any) {
      setError(e?.message ?? "Error desconocido")
    }
  }, [scheduleProactiveRefresh])

  // Carga inicial: una sola llamada a getAuthUserId.
  useEffect(() => {
    let cancelled = false
    const init = async () => {
      try {
        const supabase = createSupabaseClient()

        // CRITICO: hay que llamar a getSession() en el cliente de
        // Supabase para que cargue la sesion en memoria (_currentSession).
        // Si no, las queries envian el Authorization vacio -> 401 ->
        // fetch handler dispara un refresh automatico en cascada.
        // Usamos el parche (que NO dispara refresh) para evitar
        // anadir carga al rate limit.
        await supabase.auth.getSession()

        const id = await getAuthUserId(supabase, 4000)
        if (cancelled) return
        setUserId(id)
        if (!id) setError("No hay sesion activa")
      } catch (e: any) {
        if (cancelled) return
        setError(e?.message ?? "Error al inicializar auth")
      } finally {
        if (!cancelled) setLoading(false)
      }

      // Programar el primer refresh proactivo.
      const stored = getSessionFromStorage()
      if (stored?.expires_at) {
        scheduleProactiveRefresh(stored.expires_at)
      }
    }
    void init()
    return () => {
      cancelled = true
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current)
        refreshTimerRef.current = null
      }
    }
  }, [scheduleProactiveRefresh])

  // Escuchar eventos de Supabase (sign out en otra pestana, etc).
  // IMPORTANTE: este handler debe ser conservador. Supabase dispara
  // INITIAL_SESSION al suscribirse (puede llegar con session=null si
  // el storage todavia no esta listo) y, en algunos navegadores, emite
  // eventos espurios que harian que reseteemos userId a null aunque
  // la sesion sea valida. Solo reaccionamos a eventos cuyo significado
  // es inequivoco.
  useEffect(() => {
    if (typeof window === "undefined") return
    const supabase = createSupabaseClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_OUT") {
          // Unico caso en que reseteamos userId. TOKEN_REFRESHED con
          // session null no es un sign out, es un evento espurio.
          setUserId(null)
          setError("Sesion cerrada")
          clearSupabaseCaches()
        } else if (event === "TOKEN_REFRESHED" && session?.user?.id) {
          setUserId(session.user.id)
          setError(null)
          if (session.expires_at) {
            scheduleProactiveRefresh(session.expires_at * 1000)
          }
        } else if (event === "SIGNED_IN" && session?.user?.id) {
          setUserId(session.user.id)
          setError(null)
          if (session.expires_at) {
            scheduleProactiveRefresh(session.expires_at * 1000)
          }
        } else if (event === "USER_UPDATED" && session?.user?.id) {
          setUserId(session.user.id)
        }
        // INITIAL_SESSION, PASSWORD_RECOVERY, MFA_*, etc: ignoramos
        // para no pisar el estado que ya establecio el useEffect de init.
      }
    )
    return () => {
      subscription.unsubscribe()
    }
  }, [scheduleProactiveRefresh])

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      await doRefresh()
    } finally {
      setLoading(false)
    }
  }, [doRefresh])

  const signOut = useCallback(async () => {
    const supabase = createSupabaseClient()
    await supabase.auth.signOut()
    clearSupabaseCaches()
    setUserId(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ userId, loading, error, refresh, signOut }),
    [userId, loading, error, refresh, signOut]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error("useAuthContext debe usarse dentro de <AuthProvider>")
  }
  return ctx
}
