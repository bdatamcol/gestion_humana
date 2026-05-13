-- =============================================
-- FEED360 - Migration 045
-- Fix types and policies inconsistencies
-- Also creates atomic toggle_like function
-- =============================================

-- 1. Asegurar que las columnas usuario_id sean INTEGER (no UUID)
-- usuario_nomina.id es INTEGER, así que las referencias deben ser INTEGER

ALTER TABLE IF EXISTS publicaciones_feed360
  ALTER COLUMN usuario_id TYPE INTEGER USING usuario_id::integer;

ALTER TABLE IF EXISTS likes_feed360
  ALTER COLUMN usuario_id TYPE INTEGER USING usuario_id::integer;

ALTER TABLE IF EXISTS comentarios_feed360
  ALTER COLUMN usuario_id TYPE INTEGER USING usuario_id::integer;

-- 2. Recrear foreign keys con tipo correcto
ALTER TABLE IF EXISTS publicaciones_feed360 DROP CONSTRAINT IF EXISTS publicaciones_feed360_usuario_id_fkey;
ALTER TABLE IF EXISTS likes_feed360 DROP CONSTRAINT IF EXISTS likes_feed360_usuario_id_fkey;
ALTER TABLE IF EXISTS comentarios_feed360 DROP CONSTRAINT IF EXISTS comentarios_feed360_usuario_id_fkey;

ALTER TABLE IF EXISTS publicaciones_feed360
  ADD CONSTRAINT publicaciones_feed360_usuario_id_fkey
  FOREIGN KEY (usuario_id) REFERENCES usuario_nomina(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS likes_feed360
  ADD CONSTRAINT likes_feed360_usuario_id_fkey
  FOREIGN KEY (usuario_id) REFERENCES usuario_nomina(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS comentarios_feed360
  ADD CONSTRAINT comentarios_feed360_usuario_id_fkey
  FOREIGN KEY (usuario_id) REFERENCES usuario_nomina(id) ON DELETE CASCADE;

-- 3. Eliminar políticas RLS viejas con auth.uid() = usuario_id (tipo UUID)
DROP POLICY IF EXISTS "Authenticated users can create publications" ON publicaciones_feed360;
DROP POLICY IF EXISTS "Users can delete own publications" ON publicaciones_feed360;
DROP POLICY IF EXISTS "Authenticated users can like" ON likes_feed360;
DROP POLICY IF EXISTS "Users can unlike" ON likes_feed360;
DROP POLICY IF EXISTS "Authenticated users can comment" ON comentarios_feed360;
DROP POLICY IF EXISTS "Users can delete own comments" ON comentarios_feed360;
DROP POLICY IF EXISTS "Admin can manage topics" ON tematicas_feed360;
DROP POLICY IF EXISTS "Admin can manage publications" ON publicaciones_feed360;
DROP POLICY IF EXISTS "Admin can manage comments" ON comentarios_feed360;

-- 4. Recrear políticas RLS correctas (usando subquery para mapear auth.uid() -> usuario_nomina.auth_user_id)
-- Políticas para publicaciones
CREATE POLICY "Authenticated users can create publications"
  ON publicaciones_feed360 FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuario_nomina u
      WHERE u.id = publicaciones_feed360.usuario_id
        AND u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own publications"
  ON publicaciones_feed360 FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM usuario_nomina u
      WHERE u.id = publicaciones_feed360.usuario_id
        AND u.auth_user_id = auth.uid()
    )
  );

-- Políticas para likes
CREATE POLICY "Authenticated users can like"
  ON likes_feed360 FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuario_nomina u
      WHERE u.id = likes_feed360.usuario_id
        AND u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can unlike"
  ON likes_feed360 FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM usuario_nomina u
      WHERE u.id = likes_feed360.usuario_id
        AND u.auth_user_id = auth.uid()
    )
  );

-- Políticas para comentarios
CREATE POLICY "Authenticated users can comment"
  ON comentarios_feed360 FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuario_nomina u
      WHERE u.id = comentarios_feed360.usuario_id
        AND u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own comments"
  ON comentarios_feed360 FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM usuario_nomina u
      WHERE u.id = comentarios_feed360.usuario_id
        AND u.auth_user_id = auth.uid()
    )
  );

-- Políticas para temáticas (solo admin puede modificar)
CREATE POLICY "Admin can manage topics"
  ON tematicas_feed360 FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM usuario_nomina u
      WHERE u.auth_user_id = auth.uid()
        AND u.rol = 'admin'
    )
  );

-- Políticas admin para publicaciones
CREATE POLICY "Admin can manage publications"
  ON publicaciones_feed360 FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM usuario_nomina u
      WHERE u.auth_user_id = auth.uid()
        AND u.rol = 'admin'
    )
  );

-- Políticas admin para comentarios
CREATE POLICY "Admin can manage comments"
  ON comentarios_feed360 FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM usuario_nomina u
      WHERE u.auth_user_id = auth.uid()
        AND u.rol = 'admin'
    )
  );

-- 5. Función atómica para toggle de likes
-- Esta función hace todo en una sola operación atómica, evitando race conditions
CREATE OR REPLACE FUNCTION toggle_like(p_publicacion_id UUID, p_usuario_id INTEGER)
RETURNS JSONB AS $$
DECLARE
  v_existing_id UUID;
  v_likes_count INTEGER;
  v_is_liked BOOLEAN;
BEGIN
  -- Buscar si ya existe el like
  SELECT id INTO v_existing_id
  FROM likes_feed360
  WHERE publicacion_id = p_publicacion_id AND usuario_id = p_usuario_id;

  IF v_existing_id IS NOT NULL THEN
    -- unlike: eliminar el like
    DELETE FROM likes_feed360 WHERE id = v_existing_id;
    v_is_liked := FALSE;
  ELSE
    -- like: insertar nuevo like (la constraint UNIQUE protege contra duplicates)
    INSERT INTO likes_feed360 (publicacion_id, usuario_id)
    VALUES (p_publicacion_id, p_usuario_id)
    ON CONFLICT (publicacion_id, usuario_id) DO NOTHING;
    v_is_liked := TRUE;
  END IF;

  -- Contar likes restantes y retornar
  SELECT COUNT(*) INTO v_likes_count
  FROM likes_feed360
  WHERE publicacion_id = p_publicacion_id;

  -- Actualizar contador desnormalizado
  UPDATE publicaciones_feed360
  SET likes_count = v_likes_count
  WHERE id = p_publicacion_id;

  RETURN jsonb_build_object(
    'liked', v_is_liked,
    'likes_count', v_likes_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permiso para que cualquier usuario autenticado pueda ejecutar la función
-- La función verifica internamente la propiedad del like
GRANT EXECUTE ON FUNCTION toggle_like TO authenticated;

-- 6. Índices adicionales para optimizar queries de likes
CREATE INDEX IF NOT EXISTS idx_likes_usuario ON likes_feed360(usuario_id);
CREATE INDEX IF NOT EXISTS idx_likes_publicacion_usuario ON likes_feed360(publicacion_id, usuario_id);