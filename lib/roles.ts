/**
 * Normaliza el campo `rol` de usuario_nomina a lowercase.
 * Defensa contra datos legacy donde el rol pudo haber sido guardado
 * con casing mixto (e.g. 'Jefe', 'JEFE') antes de que la migracion
 * 042 estandarizara la columna.
 *
 * Este archivo NO tiene `'use client'` para que pueda ser importado
 * tanto desde codigo de cliente como desde API routes (servidor).
 */
export const normRol = (rol: string | null | undefined): string =>
  (rol ?? '').toLowerCase().trim();