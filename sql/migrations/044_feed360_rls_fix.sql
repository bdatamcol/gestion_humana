-- Hotfix Feed360 RLS + tipos de usuario_id
-- Ejecutar en Supabase SQL Editor

-- 1) Asegurar tipos correctos (usuario_nomina.id es INTEGER)
ALTER TABLE IF EXISTS publicaciones_feed360
  ALTER COLUMN usuario_id TYPE INTEGER USING usuario_id::integer;

ALTER TABLE IF EXISTS likes_feed360
  ALTER COLUMN usuario_id TYPE INTEGER USING usuario_id::integer;

ALTER TABLE IF EXISTS comentarios_feed360
  ALTER COLUMN usuario_id TYPE INTEGER USING usuario_id::integer;

-- 2) Recrear FKs por si quedaron con tipo viejo
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

-- 3) RLS: eliminar políticas viejas con auth.uid() = usuario_id (uuid vs integer)
DROP POLICY IF EXISTS "Authenticated users can create publications" ON publicaciones_feed360;
DROP POLICY IF EXISTS "Users can delete own publications" ON publicaciones_feed360;
DROP POLICY IF EXISTS "Authenticated users can like" ON likes_feed360;
DROP POLICY IF EXISTS "Users can unlike" ON likes_feed360;
DROP POLICY IF EXISTS "Authenticated users can comment" ON comentarios_feed360;
DROP POLICY IF EXISTS "Users can delete own comments" ON comentarios_feed360;

-- 4) Políticas correctas mapeando auth.uid() -> usuario_nomina.auth_user_id
CREATE POLICY "Authenticated users can create publications"
  ON publicaciones_feed360 FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM usuario_nomina u
      WHERE u.id = publicaciones_feed360.usuario_id
        AND u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own publications"
  ON publicaciones_feed360 FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM usuario_nomina u
      WHERE u.id = publicaciones_feed360.usuario_id
        AND u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can like"
  ON likes_feed360 FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM usuario_nomina u
      WHERE u.id = likes_feed360.usuario_id
        AND u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can unlike"
  ON likes_feed360 FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM usuario_nomina u
      WHERE u.id = likes_feed360.usuario_id
        AND u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can comment"
  ON comentarios_feed360 FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM usuario_nomina u
      WHERE u.id = comentarios_feed360.usuario_id
        AND u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own comments"
  ON comentarios_feed360 FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM usuario_nomina u
      WHERE u.id = comentarios_feed360.usuario_id
        AND u.auth_user_id = auth.uid()
    )
  );
