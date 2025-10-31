-- Migración: 027_add_tipo_contrato_to_usuario_nomina
-- Fecha: $(date)
-- Descripción: Agregar campo tipo_de_contrato para especificar el tipo de contrato del usuario

-- Agregar campo tipo_de_contrato
ALTER TABLE usuario_nomina
ADD COLUMN tipo_de_contrato VARCHAR(50);

-- Crear índice para mejorar el rendimiento en consultas por tipo de contrato
CREATE INDEX idx_usuario_nomina_tipo_contrato ON usuario_nomina(tipo_de_contrato);

-- Comentario descriptivo de la columna
COMMENT ON COLUMN usuario_nomina.tipo_de_contrato IS 'Tipo de contrato del usuario (ej: indefinido, fijo, prestación de servicios, etc.)';

-- Verificar que la columna se agregó correctamente
-- SELECT column_name, data_type, is_nullable, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'usuario_nomina' AND column_name = 'tipo_de_contrato';