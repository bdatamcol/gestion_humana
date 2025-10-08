-- Agregar campos para el flujo de aprobación/rechazo de incapacidades
ALTER TABLE incapacidades 
ADD COLUMN IF NOT EXISTS estado VARCHAR(20) DEFAULT 'en_revision',
ADD COLUMN IF NOT EXISTS motivo_rechazo TEXT,
ADD COLUMN IF NOT EXISTS admin_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS fecha_resolucion TIMESTAMP WITH TIME ZONE;

-- Crear índice para mejorar las consultas por estado
CREATE INDEX IF NOT EXISTS idx_incapacidades_estado ON incapacidades(estado);

-- Crear índice para mejorar las consultas por admin_id
CREATE INDEX IF NOT EXISTS idx_incapacidades_admin_id ON incapacidades(admin_id);

-- Actualizar las incapacidades existentes para que tengan el estado 'en_revision'
UPDATE incapacidades 
SET estado = 'en_revision' 
WHERE estado IS NULL;

-- Agregar constraint para validar los estados permitidos
ALTER TABLE incapacidades 
ADD CONSTRAINT check_estado_incapacidades 
CHECK (estado IN ('en_revision', 'aprobada', 'rechazada'));

-- Comentarios para documentar los campos
COMMENT ON COLUMN incapacidades.estado IS 'Estado de la incapacidad: en_revision, aprobada, rechazada';
COMMENT ON COLUMN incapacidades.motivo_rechazo IS 'Motivo del rechazo cuando el estado es rechazada';
COMMENT ON COLUMN incapacidades.admin_id IS 'ID del administrador que procesó la incapacidad';
COMMENT ON COLUMN incapacidades.fecha_resolucion IS 'Fecha cuando se aprobó o rechazó la incapacidad';