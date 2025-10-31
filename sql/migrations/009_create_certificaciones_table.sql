-- Crear tabla para solicitudes de certificación laboral
CREATE TABLE solicitudes_certificacion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuario_nomina(auth_user_id),
  admin_id UUID REFERENCES usuario_nomina(auth_user_id),
  estado VARCHAR(20) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobado', 'rechazado')),
  dirigido_a VARCHAR(255) NOT NULL,
  ciudad VARCHAR(100) NOT NULL,
  fecha_solicitud TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  fecha_resolucion TIMESTAMP WITH TIME ZONE,
  motivo_rechazo TEXT,
  pdf_url TEXT
);

-- Crear índice para búsquedas por usuario
CREATE INDEX idx_solicitudes_usuario ON solicitudes_certificacion(usuario_id);

-- Crear índice para búsquedas por estado
CREATE INDEX idx_solicitudes_estado ON solicitudes_certificacion(estado);
