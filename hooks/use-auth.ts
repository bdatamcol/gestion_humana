"use client"

/**
 * useAuth
 *
 * Hook principal para acceder al estado de autenticacion centralizado.
 * Reemplaza las llamadas directas a `getAuthUserId` en componentes,
 * layouts y paginas. Garantiza una sola llamada a Supabase por sesion
 * y un refresh proactivo unico.
 *
 * Uso:
 *   const { userId, loading, error, refresh, signOut } = useAuth()
 *
 * Estados posibles:
 *   - loading=true,  userId=null: AuthProvider esta validando la sesion.
 *   - loading=false, userId=id:   sesion valida.
 *   - loading=false, userId=null: NO hay sesion (no autenticado).
 *
 * Si necesitas datos completos del usuario (rol, estado, etc),
 * usa `useCurrentUser()` en su lugar.
 */

import { useAuthContext } from "@/components/auth/auth-provider"

export interface UseAuthReturn {
  userId: string | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  signOut: () => Promise<void>
}

export function useAuth(): UseAuthReturn {
  return useAuthContext()
}
