-- Script para configurar el sistema de notificaciones
-- Ejecutar este script en la consola SQL de Supabase

-- 1. Crear la tabla de notificaciones
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

-- 2. Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_notificaciones_usuario ON notificaciones(usuario_id);
CREATE INDEX IF NOT EXISTS idx_notificaciones_leida ON notificaciones(leida);
CREATE INDEX IF NOT EXISTS idx_notificaciones_tipo ON notificaciones(tipo);
CREATE INDEX IF NOT EXISTS idx_notificaciones_created_at ON notificaciones(created_at);

-- 3. Habilitar RLS (Row Level Security)
ALTER TABLE notificaciones ENABLE ROW LEVEL SECURITY;

-- 4. Crear políticas RLS
DROP POLICY IF EXISTS "Los usuarios pueden ver sus propias notificaciones" ON notificaciones;
CREATE POLICY "Los usuarios pueden ver sus propias notificaciones"
  ON notificaciones
  FOR SELECT
  USING (auth.uid() IN (
    SELECT auth_user_id FROM usuario_nomina WHERE auth_user_id = notificaciones.usuario_id
  ));

DROP POLICY IF EXISTS "Los usuarios pueden actualizar sus propias notificaciones" ON notificaciones;
CREATE POLICY "Los usuarios pueden actualizar sus propias notificaciones"
  ON notificaciones
  FOR UPDATE
  USING (auth.uid() IN (
    SELECT auth_user_id FROM usuario_nomina WHERE auth_user_id = notificaciones.usuario_id
  ));

DROP POLICY IF EXISTS "Solo administradores pueden crear notificaciones" ON notificaciones;
CREATE POLICY "Solo administradores pueden crear notificaciones"
  ON notificaciones
  FOR INSERT
  WITH CHECK (auth.uid() IN (
    SELECT auth_user_id FROM usuario_nomina WHERE rol IN ('administrador', 'moderador')
  ));

DROP POLICY IF EXISTS "Solo administradores pueden eliminar notificaciones" ON notificaciones;
CREATE POLICY "Solo administradores pueden eliminar notificaciones"
  ON notificaciones
  FOR DELETE
  USING (auth.uid() IN (
    SELECT auth_user_id FROM usuario_nomina WHERE rol IN ('administrador', 'moderador')
  ));

-- 5. Crear función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 6. Crear trigger para actualizar updated_at
DROP TRIGGER IF EXISTS update_notificaciones_updated_at ON notificaciones;
CREATE TRIGGER update_notificaciones_updated_at
    BEFORE UPDATE ON notificaciones
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 7. Habilitar Realtime para la tabla notificaciones
ALTER PUBLICATION supabase_realtime ADD TABLE notificaciones;

-- 8. Insertar algunas notificaciones de ejemplo (opcional)
-- Nota: Reemplaza los UUIDs con IDs reales de tu base de datos
/*
INSERT INTO notificaciones (usuario_id, tipo, titulo, mensaje, solicitud_id) VALUES
('uuid-del-administrador', 'certificacion_laboral', 'Nueva solicitud de certificación laboral', 'Tienes una nueva solicitud de certificación laboral de Juan Pérez', 'uuid-de-la-solicitud'),
('uuid-del-administrador', 'vacaciones', 'Nueva solicitud de vacaciones', 'Tienes una nueva solicitud de vacaciones de María García', 'uuid-de-la-solicitud');
*/

-- Verificar que todo se creó correctamente
SELECT 
  'Tabla notificaciones creada' as status,
  COUNT(*) as total_notificaciones
FROM notificaciones;

SELECT 
  'Políticas RLS configuradas' as status,
  COUNT(*) as total_policies
FROM pg_policies 
WHERE tablename = 'notificaciones';

SELECT 
  'Índices creados' as status,
  COUNT(*) as total_indexes
FROM pg_indexes 
WHERE tablename = 'notificaciones';

-- Mostrar estructura de la tabla
\d notificaciones;
