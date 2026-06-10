"use client"

/**
 * AuthProvider
 *
 * Centraliza el estado de autenticacion para toda la aplicacion.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import {
  createSupabaseClient,
  clearSupabaseCaches,
  setSupabaseRawSession,
} from "@/lib/supabase"

const DEBUG_SERVER_URL = "http://127.0.0.1:7778/event"
const DEBUG_SESSION_ID = "auth-refresh-loop"
const DEBUG_RUN_ID = "post-fix"

// #region debug-point B:auth-provider-helper
const reportDebugEvent = (hypothesisId: string, location: string, msg: string, data: Record<string, unknown> = {}) => {
  fetch(DEBUG_SERVER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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

interface AuthContextValue {
  /** user.id de Supabase Auth, o null si no hay sesion. */
  userId: string | null
  /** access token vigente, o null si no hay sesion. */
  accessToken: string | null
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const doRefresh = useCallback(async () => {
    try {
      const supabase = createSupabaseClient()
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) throw sessionError
      setSupabaseRawSession(session ?? null)
      setUserId(session?.user?.id ?? null)
      setAccessToken(session?.access_token ?? null)
      if (!session) {
        setError("Sesion expirada")
      } else {
        setError(null)
      }
    } catch (e: any) {
      setError(e?.message ?? "Error desconocido")
    }
  }, [])

  // Carga inicial: una sola llamada a getSession.
  useEffect(() => {
    let cancelled = false
    const init = async () => {
      try {
        const supabase = createSupabaseClient()
        // #region debug-point B:auth-init-start
        reportDebugEvent("B", "components/auth/auth-provider.tsx:init", "AuthProvider init start")
        // #endregion
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        if (cancelled) return
        if (sessionError) throw sessionError
        setSupabaseRawSession(session ?? null)
        // #region debug-point B:auth-init-session
        reportDebugEvent("B", "components/auth/auth-provider.tsx:init", "AuthProvider init resolved session", {
          hasSession: !!session,
          userId: session?.user?.id ?? null,
          expiresAt: session?.expires_at ?? null,
        })
        // #endregion
        setUserId(session?.user?.id ?? null)
        setAccessToken(session?.access_token ?? null)
        if (!session) setError("No hay sesion activa")
      } catch (e: any) {
        if (cancelled) return
        // #region debug-point B:auth-init-error
        reportDebugEvent("B", "components/auth/auth-provider.tsx:init", "AuthProvider init error", {
          error: e?.message ?? "unknown",
        })
        // #endregion
        setError(e?.message ?? "Error al inicializar auth")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void init()
    return () => {
      cancelled = true
    }
  }, [])

  // Escuchar eventos de Supabase (sign out en otra pestana, etc).
  useEffect(() => {
    if (typeof window === "undefined") return
    const supabase = createSupabaseClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // #region debug-point B:auth-state-change
        reportDebugEvent("B", "components/auth/auth-provider.tsx:onAuthStateChange", "Auth state change", {
          event,
          hasSession: !!session,
          userId: session?.user?.id ?? null,
          expiresAt: session?.expires_at ?? null,
        })
        // #endregion
        if (event === "SIGNED_OUT") {
          setSupabaseRawSession(null)
          setUserId(null)
          setAccessToken(null)
          setError("Sesion cerrada")
          clearSupabaseCaches()
        } else if (event === "TOKEN_REFRESHED" && session?.user?.id) {
          setSupabaseRawSession(session)
          setUserId(session.user.id)
          setAccessToken(session.access_token ?? null)
          setError(null)
        } else if (event === "SIGNED_IN" && session?.user?.id) {
          setSupabaseRawSession(session)
          setUserId(session.user.id)
          setAccessToken(session.access_token ?? null)
          setError(null)
        } else if (event === "USER_UPDATED" && session?.user?.id) {
          setSupabaseRawSession(session)
          setUserId(session.user.id)
          setAccessToken(session.access_token ?? null)
        }
      }
    )
    return () => {
      subscription.unsubscribe()
    }
  }, [])

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
    setAccessToken(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ userId, accessToken, loading, error, refresh, signOut }),
    [userId, accessToken, loading, error, refresh, signOut]
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
