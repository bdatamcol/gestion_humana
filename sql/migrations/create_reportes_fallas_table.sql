-- =====================================================
-- CREACIÓN DE TABLA PARA REPORTES DE FALLAS
-- Fecha: 2025-01-08
-- Descripción: Tabla para almacenar reportes de fallas de usuarios
-- =====================================================

-- Crear tabla reportes_fallas
CREATE TABLE IF NOT EXISTS reportes_fallas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo_falla VARCHAR(100) NOT NULL,
  descripcion TEXT NOT NULL,
  imagen_path TEXT,
  estado VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'en_proceso', 'resuelto', 'cerrado')),
  fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  fecha_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resuelto_por UUID REFERENCES auth.users(id),
  fecha_resolucion TIMESTAMP WITH TIME ZONE,
  comentarios_resolucion TEXT
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_reportes_fallas_usuario_id ON reportes_fallas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_reportes_fallas_estado ON reportes_fallas(estado);
CREATE INDEX IF NOT EXISTS idx_reportes_fallas_fecha_creacion ON reportes_fallas(fecha_creacion);
CREATE INDEX IF NOT EXISTS idx_reportes_fallas_tipo_falla ON reportes_fallas(tipo_falla);

-- Habilitar RLS (Row Level Security)
ALTER TABLE reportes_fallas ENABLE ROW LEVEL SECURITY;

-- Política para que los usuarios puedan ver sus propios reportes
CREATE POLICY "Los usuarios pueden ver sus propios reportes de fallas"
  ON reportes_fallas
  FOR SELECT
  USING (auth.uid() = usuario_id);

-- Política para que los usuarios puedan crear sus propios reportes
CREATE POLICY "Los usuarios pueden crear reportes de fallas"
  ON reportes_fallas
  FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

-- Política para que los usuarios puedan actualizar sus propios reportes (solo si están pendientes)
CREATE POLICY "Los usuarios pueden actualizar sus reportes pendientes"
  ON reportes_fallas
  FOR UPDATE
  USING (auth.uid() = usuario_id AND estado = 'pendiente');

-- Política para que los administradores puedan ver todos los reportes
CREATE POLICY "Los administradores pueden ver todos los reportes de fallas"
  ON reportes_fallas
  FOR SELECT
  USING (auth.uid() IN (
    SELECT auth_user_id FROM usuario_nomina WHERE rol = 'administrador'
  ));

-- Política para que los administradores puedan actualizar cualquier reporte
CREATE POLICY "Los administradores pueden actualizar cualquier reporte de fallas"
  ON reportes_fallas
  FOR UPDATE
  USING (auth.uid() IN (
    SELECT auth_user_id FROM usuario_nomina WHERE rol = 'administrador'
  ));

-- Función para actualizar fecha_actualizacion automáticamente
CREATE OR REPLACE FUNCTION update_reportes_fallas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.fecha_actualizacion = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar fecha_actualizacion
CREATE TRIGGER trigger_update_reportes_fallas_updated_at
  BEFORE UPDATE ON reportes_fallas
  FOR EACH ROW
  EXECUTE FUNCTION update_reportes_fallas_updated_at();

-- Crear bucket para almacenar imágenes de fallas (esto se debe ejecutar en el dashboard de Supabase)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('fallas', 'fallas', true);

-- Política de storage para el bucket 'fallas'
-- Los usuarios autenticados pueden subir archivos
-- CREATE POLICY "Los usuarios pueden subir imágenes de fallas" ON storage.objects
--   FOR INSERT WITH CHECK (
--     bucket_id = 'fallas' AND
--     auth.role() = 'authenticated' AND
--     (storage.foldername(name))[1] = auth.uid()::text
--   );

-- Los usuarios pueden ver sus propias imágenes
-- CREATE POLICY "Los usuarios pueden ver sus imágenes de fallas" ON storage.objects
--   FOR SELECT USING (
--     bucket_id = 'fallas' AND
--     (storage.foldername(name))[1] = auth.uid()::text
--   );

-- Los administradores pueden ver todas las imágenes
-- CREATE POLICY "Los administradores pueden ver todas las imágenes de fallas" ON storage.objects
--   FOR SELECT USING (
--     bucket_id = 'fallas' AND
--     auth.uid() IN (
--       SELECT auth_user_id FROM usuario_nomina WHERE rol = 'administrador'
--     )
--   );

COMMIT;