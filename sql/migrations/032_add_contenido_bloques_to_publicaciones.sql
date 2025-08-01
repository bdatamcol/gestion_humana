-- Migración: 032_add_contenido_bloques_to_publicaciones
-- Fecha: 2024-12-20
-- Descripción: Agregar campo contenido_bloques para almacenar contenido multimedia estructurado

-- Agregar el campo contenido_bloques como JSONB para almacenar los bloques de contenido
ALTER TABLE publicaciones_bienestar 
ADD COLUMN IF NOT EXISTS contenido_bloques JSONB DEFAULT '[]'::jsonb;

-- Crear índice GIN para mejorar el rendimiento de consultas JSONB
CREATE INDEX IF NOT EXISTS idx_publicaciones_bienestar_contenido_bloques 
ON publicaciones_bienestar USING GIN (contenido_bloques);

-- Comentario para documentación
COMMENT ON COLUMN publicaciones_bienestar.contenido_bloques IS 'Array JSON con bloques de contenido multimedia (texto, enlaces, videos, embeds)';

-- Verificar que la columna se agregó correctamente
-- SELECT column_name, data_type, is_nullable, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'publicaciones_bienestar' AND column_name = 'contenido_bloques';