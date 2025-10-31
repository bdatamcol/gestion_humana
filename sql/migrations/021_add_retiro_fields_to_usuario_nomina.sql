-- Migración: 021_add_retiro_fields_to_usuario_nomina
-- Fecha: $(date)
-- Descripción: Agregar campos motivo_retiro y fecha_retiro para usuarios inactivos

-- Agregar campo motivo_retiro
ALTER TABLE usuario_nomina
ADD COLUMN motivo_retiro TEXT;

-- Agregar campo fecha_retiro
ALTER TABLE usuario_nomina
ADD COLUMN fecha_retiro DATE;

-- Crear índice para mejorar el rendimiento en consultas por fecha de retiro
CREATE INDEX idx_usuario_nomina_fecha_retiro ON usuario_nomina(fecha_retiro);

-- Comentarios descriptivos de las columnas
COMMENT ON COLUMN usuario_nomina.motivo_retiro IS 'Motivo del retiro del usuario (solo para usuarios inactivos)';
COMMENT ON COLUMN usuario_nomina.fecha_retiro IS 'Fecha de retiro del usuario (solo para usuarios inactivos)';

-- Verificar que las columnas se agregaron correctamente
-- SELECT column_name, data_type, is_nullable, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'usuario_nomina' AND column_name IN ('motivo_retiro', 'fecha_retiro');
