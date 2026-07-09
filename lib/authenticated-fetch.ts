"use client";

import { createSupabaseClient } from "@/lib/supabase";

/**
 * Wrapper sobre `fetch` que añade automáticamente el header
 * `Authorization: Bearer <access_token>` usando la sesión activa de Supabase.
 *
 * Uso:
 *   const res = await authFetch("/api/capacitaciones/cursos", { cache: "no-store" });
 *   const res = await authFetch("/api/capacitaciones/cursos", {
 *     method: "POST",
 *     headers: { "Content-Type": "application/json" },
 *     body: JSON.stringify(payload),
 *   });
 */
export async function authFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const supabase = createSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();

  const headers = new Headers(init.headers || {});
  if (session?.access_token) {
    headers.set("Authorization", `Bearer ${session.access_token}`);
  }
  if (init.body && !headers.has("Content-Type") && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(input, {
    ...init,
    headers,
    cache: init.cache ?? "no-store",
  });
}