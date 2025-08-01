-- Script para corregir las políticas RLS de bienestar si hay problemas
-- Ejecutar este script si hay errores al crear publicaciones

-- Eliminar políticas existentes si hay conflictos
DROP POLICY IF EXISTS "Solo los administradores pueden crear publicaciones de bienestar" ON publicaciones_bienestar;
DROP POLICY IF EXISTS "Solo los administradores pueden actualizar publicaciones de bienestar" ON publicaciones_bienestar;
DROP POLICY IF EXISTS "Solo los administradores pueden eliminar publicaciones de bienestar" ON publicaciones_bienestar;
DROP POLICY IF EXISTS "Todos los usuarios pueden ver las publicaciones de bienestar publicadas" ON publicaciones_bienestar;

-- Recrear las políticas con la sintaxis correcta
CREATE POLICY "Todos los usuarios pueden ver las publicaciones de bienestar publicadas"
  ON publicaciones_bienestar
  FOR SELECT
  USING (estado = 'publicado' OR auth.uid() = autor_id OR auth.uid() IN (
    SELECT auth_user_id FROM usuario_nomina WHERE rol = 'administrador'
  ));

CREATE POLICY "Solo los administradores pueden crear publicaciones de bienestar"
  ON publicaciones_bienestar
  FOR INSERT
  WITH CHECK (auth.uid() IN (
    SELECT auth_user_id FROM usuario_nomina WHERE rol = 'administrador'
  ));

CREATE POLICY "Solo los administradores pueden actualizar publicaciones de bienestar"
  ON publicaciones_bienestar
  FOR UPDATE
  USING (auth.uid() IN (
    SELECT auth_user_id FROM usuario_nomina WHERE rol = 'administrador'
  ));

CREATE POLICY "Solo los administradores pueden eliminar publicaciones de bienestar"
  ON publicaciones_bienestar
  FOR DELETE
  USING (auth.uid() IN (
    SELECT auth_user_id FROM usuario_nomina WHERE rol = 'administrador'
  ));

-- Verificar que la tabla tenga la columna tipo_seccion
ALTER TABLE publicaciones_bienestar ADD COLUMN IF NOT EXISTS tipo_seccion VARCHAR(20) DEFAULT 'bienestar';

-- Crear índice si no existe
CREATE INDEX IF NOT EXISTS idx_publicaciones_bienestar_tipo_seccion ON publicaciones_bienestar(tipo_seccion);

-- Mensaje de confirmación
SELECT 'Políticas RLS de bienestar corregidas exitosamente' as resultado;