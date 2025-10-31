'use client';

import { createClient } from '@supabase/supabase-js';

// Esta función solo debe ser llamada en el lado del cliente
let supabaseInstance: ReturnType<typeof createClient> | null = null;

export const createSupabaseClient = () => {
  if (supabaseInstance) return supabaseInstance;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ' ';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Las variables de entorno de Supabase no están configuradas');
  }
  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  return supabaseInstance;
};
