-- Crear tabla para solicitudes de vacaciones
CREATE TABLE solicitudes_vacaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuario_nomina(auth_user_id),
  admin_id UUID REFERENCES usuario_nomina(auth_user_id),
  estado VARCHAR(20) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobado', 'rechazado')),
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  fecha_solicitud TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  fecha_resolucion TIMESTAMP WITH TIME ZONE,
  motivo_rechazo TEXT
);

-- Crear índice para búsquedas por usuario
CREATE INDEX idx_vacaciones_usuario ON solicitudes_vacaciones(usuario_id);

-- Crear índice para búsquedas por estado
CREATE INDEX idx_vacaciones_estado ON solicitudes_vacaciones(estado);
