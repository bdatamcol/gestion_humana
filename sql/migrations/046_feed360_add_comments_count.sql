-- =============================================
-- FEED360 - Migration 046
-- Add comentarios_count column and triggers for realtime count
-- =============================================

-- 1. Añadir columna comentarios_count a publicaciones_feed360
ALTER TABLE IF EXISTS publicaciones_feed360
  ADD COLUMN IF NOT EXISTS comentarios_count INTEGER DEFAULT 0;

-- 2. Recrear foreign keys que podrían estar rotas
ALTER TABLE IF EXISTS publicaciones_feed360 DROP CONSTRAINT IF EXISTS publicaciones_feed360_tematica_id_fkey;
ALTER TABLE IF EXISTS publicaciones_feed360
  ADD CONSTRAINT publicaciones_feed360_tematica_id_fkey
  FOREIGN KEY (tematica_id) REFERENCES tematicas_feed360(id) ON DELETE CASCADE;

-- 3. Función para incrementar contador de comentarios
CREATE OR REPLACE FUNCTION increment_comentarios_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE publicaciones_feed360
  SET comentarios_count = COALESCE(comentarios_count, 0) + 1
  WHERE id = NEW.publicacion_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Función para decrementar contador de comentarios
CREATE OR REPLACE FUNCTION decrement_comentarios_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE publicaciones_feed360
  SET comentarios_count = GREATEST(COALESCE(comentarios_count, 0) - 1, 0)
  WHERE id = OLD.publicacion_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- 5. Trigger para INSERT en comentarios (incrementa)
DROP TRIGGER IF EXISTS trigger_increment_comentarios ON comentarios_feed360;
CREATE TRIGGER trigger_increment_comentarios
  AFTER INSERT ON comentarios_feed360
  FOR EACH ROW EXECUTE FUNCTION increment_comentarios_count();

-- 6. Trigger para DELETE en comentarios (decrementa)
DROP TRIGGER IF EXISTS trigger_decrement_comentarios ON comentarios_feed360;
CREATE TRIGGER trigger_decrement_comentarios
  AFTER DELETE ON comentarios_feed360
  FOR EACH ROW EXECUTE FUNCTION decrement_comentarios_count();

-- 7. Actualizar contador con count actual de comentarios
UPDATE publicaciones_feed360 p
SET comentarios_count = (
  SELECT COUNT(*) FROM comentarios_feed360 c WHERE c.publicacion_id = p.id
);

-- 8. Índices para optimizar
CREATE INDEX IF NOT EXISTS idx_comentarios_created_desc ON comentarios_feed360(publicacion_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comentarios_usuario ON comentarios_feed360(usuario_id);