-- Migración para crear la tabla de configuración del sistema
-- Ejecutar este script en la consola SQL de Supabase

BEGIN;

-- Crear la tabla configuracion_sistema
CREATE TABLE IF NOT EXISTS configuracion_sistema (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clave VARCHAR(100) UNIQUE NOT NULL,
  valor TEXT NOT NULL,
  descripcion TEXT,
  tipo VARCHAR(50) DEFAULT 'string', -- string, number, boolean, json
  fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  fecha_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  creado_por UUID REFERENCES usuario_nomina(auth_user_id) ON DELETE SET NULL,
  actualizado_por UUID REFERENCES usuario_nomina(auth_user_id) ON DELETE SET NULL
);

-- Crear índice único en la clave
CREATE UNIQUE INDEX IF NOT EXISTS idx_configuracion_sistema_clave ON configuracion_sistema(clave);

-- Crear índice en fecha_actualizacion para consultas ordenadas
CREATE INDEX IF NOT EXISTS idx_configuracion_sistema_fecha_actualizacion ON configuracion_sistema(fecha_actualizacion);

-- Función para actualizar fecha_actualizacion automáticamente
CREATE OR REPLACE FUNCTION update_configuracion_sistema_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.fecha_actualizacion = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar fecha_actualizacion
CREATE TRIGGER trigger_update_configuracion_sistema_updated_at
  BEFORE UPDATE ON configuracion_sistema
  FOR EACH ROW
  EXECUTE FUNCTION update_configuracion_sistema_updated_at();

-- Insertar configuración inicial para correo de notificaciones
INSERT INTO configuracion_sistema (clave, valor, descripcion, tipo) 
VALUES (
  'correo_notificaciones', 
  '', 
  'Correo electrónico para recibir notificaciones del sistema', 
  'string'
) ON CONFLICT (clave) DO NOTHING;

-- Políticas de seguridad (RLS)
ALTER TABLE configuracion_sistema ENABLE ROW LEVEL SECURITY;

-- Solo administradores pueden ver y modificar la configuración
CREATE POLICY "Solo administradores pueden ver configuracion_sistema" ON configuracion_sistema
  FOR SELECT USING (
    auth.uid() IN (
      SELECT auth_user_id FROM usuario_nomina WHERE rol = 'administrador' AND estado = 'activo'
    )
  );

CREATE POLICY "Solo administradores pueden insertar en configuracion_sistema" ON configuracion_sistema
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT auth_user_id FROM usuario_nomina WHERE rol = 'administrador' AND estado = 'activo'
    )
  );

CREATE POLICY "Solo administradores pueden actualizar configuracion_sistema" ON configuracion_sistema
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT auth_user_id FROM usuario_nomina WHERE rol = 'administrador' AND estado = 'activo'
    )
  );

CREATE POLICY "Solo administradores pueden eliminar de configuracion_sistema" ON configuracion_sistema
  FOR DELETE USING (
    auth.uid() IN (
      SELECT auth_user_id FROM usuario_nomina WHERE rol = 'administrador' AND estado = 'activo'
    )
  );

COMMIT;