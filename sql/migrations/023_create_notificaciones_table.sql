-- Crear tabla para notificaciones del sistema
CREATE TABLE IF NOT EXISTS notificaciones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID NOT NULL REFERENCES usuario_nomina(auth_user_id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL, -- 'certificacion_laboral', 'vacaciones', 'permisos', 'incapacidades'
  titulo VARCHAR(255) NOT NULL,
  mensaje TEXT NOT NULL,
  solicitud_id UUID, -- ID de la solicitud relacionada
  leida BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX idx_notificaciones_usuario ON notificaciones(usuario_id);
CREATE INDEX idx_notificaciones_leida ON notificaciones(leida);
CREATE INDEX idx_notificaciones_tipo ON notificaciones(tipo);
CREATE INDEX idx_notificaciones_created_at ON notificaciones(created_at);

-- Crear política RLS para que los usuarios solo vean sus notificaciones
ALTER TABLE notificaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Los usuarios pueden ver sus propias notificaciones"
  ON notificaciones
  FOR SELECT
  USING (auth.uid() IN (
    SELECT auth_user_id FROM usuario_nomina WHERE auth_user_id = notificaciones.usuario_id
  ));

CREATE POLICY "Los usuarios pueden actualizar sus propias notificaciones"
  ON notificaciones
  FOR UPDATE
  USING (auth.uid() IN (
    SELECT auth_user_id FROM usuario_nomina WHERE auth_user_id = notificaciones.usuario_id
  ));

-- Permitir crear notificaciones a administradores y al sistema (service role)
CREATE POLICY "Permitir crear notificaciones"
  ON notificaciones
  FOR INSERT
  WITH CHECK (
    -- Permitir al service role (para funciones del sistema)
    auth.role() = 'service_role' OR
    -- Permitir a administradores y moderadores
    auth.uid() IN (
      SELECT auth_user_id FROM usuario_nomina WHERE rol IN ('administrador', 'moderador')
    )
  );

-- Solo administradores pueden eliminar notificaciones
CREATE POLICY "Solo administradores pueden eliminar notificaciones"
  ON notificaciones
  FOR DELETE
  USING (auth.uid() IN (
    SELECT auth_user_id FROM usuario_nomina WHERE rol IN ('administrador', 'moderador')
  ));
