'use client';

import { createClient } from '@supabase/supabase-js';

// Esta función solo debe ser llamada en el lado del cliente
let supabaseInstance: ReturnType<typeof createClient> | null = null;

export const createSupabaseClient = () => {
  if (supabaseInstance) return supabaseInstance;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://aqmlxjsyczqtfansvnqr.supabase.co';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxbWx4anN5Y3pxdGZhbnN2bnFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI5MzM3NTYsImV4cCI6MjA1ODUwOTc1Nn0._dfB0vDYrR4jQ1cFHPXr_6iGTUXctzTeZbIcE4FJ0lk';
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Las variables de entorno de Supabase no están configuradas');
  }
  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  return supabaseInstance;
};
