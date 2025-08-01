-- Agregar campo tipo_seccion a la tabla publicaciones_bienestar
-- para permitir categorizar las publicaciones por sección

-- Agregar el campo tipo_seccion
ALTER TABLE publicaciones_bienestar ADD COLUMN IF NOT EXISTS tipo_seccion VARCHAR(20) DEFAULT 'bienestar';

-- Actualizar todas las publicaciones existentes para que tengan tipo_seccion = 'bienestar'
UPDATE publicaciones_bienestar SET tipo_seccion = 'bienestar' WHERE tipo_seccion IS NULL;

-- Crear índice para mejorar el rendimiento de las consultas
CREATE INDEX IF NOT EXISTS idx_publicaciones_bienestar_tipo_seccion ON publicaciones_bienestar(tipo_seccion);

-- Comentario para documentación
COMMENT ON COLUMN publicaciones_bienestar.tipo_seccion IS 'Tipo de sección: bienestar, actividades, sst, normatividad';
