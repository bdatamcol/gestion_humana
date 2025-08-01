import { createSupabaseClient } from "@/lib/supabase"

/**
 * Obtiene la URL del avatar del usuario desde Supabase Storage
 * @param avatar_path - Ruta del avatar personalizado del usuario (puede ser null)
 * @param genero - Género del usuario para seleccionar avatar por defecto ("F" o "M")
 * @returns URL pública del avatar
 */
export const getAvatarUrl = (avatar_path: string | null, genero: string | null): string => {
  const supabase = createSupabaseClient()
  
  if (avatar_path) {
    const { data } = supabase.storage.from("avatar").getPublicUrl(avatar_path)
    return data.publicUrl
  }
  
  // Imagen por defecto basada en género desde Supabase Storage
  if (genero) {
    const path = genero === "F" ? "defecto/avatar-f.webp" : "defecto/avatar-m.webp"
    const { data } = supabase.storage.from("avatar").getPublicUrl(path)
    return data.publicUrl
  }
  
  // Imagen por defecto del sistema desde Supabase Storage
  const { data } = supabase.storage.from("avatar").getPublicUrl("defecto/avatar-m.webp")
  return data.publicUrl
}
