-- Agregar columna estado a la tabla usuario_nomina
-- Fecha: $(date)
-- Descripción: Agregar campo estado para definir si el usuario está activo o inactivo

ALTER TABLE usuario_nomina
ADD COLUMN estado VARCHAR(10) CHECK (estado IN ('activo', 'inactivo')) NOT NULL DEFAULT 'activo';

-- Crear índice para mejorar el rendimiento en consultas por estado
CREATE INDEX idx_usuario_nomina_estado ON usuario_nomina(estado);

-- Comentario descriptivo de la columna
COMMENT ON COLUMN usuario_nomina.estado IS 'Estado del usuario: activo o inactivo';

-- Verificar que la columna se agregó correctamente
-- SELECT column_name, data_type, is_nullable, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'usuario_nomina' AND column_name = 'estado';
