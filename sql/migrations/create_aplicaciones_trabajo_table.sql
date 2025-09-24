-- Migración para crear la tabla de aplicaciones de trabajo
-- Ejecutar este script en la consola SQL de Supabase

BEGIN;

-- Crear la tabla aplicaciones_trabajo
CREATE TABLE IF NOT EXISTS aplicaciones_trabajo (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombres VARCHAR(100) NOT NULL,
  apellidos VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  telefono VARCHAR(20) NOT NULL,
  documento_identidad VARCHAR(20) NOT NULL,
  tipo_documento VARCHAR(10) NOT NULL DEFAULT 'CC', -- CC, TI, CE, PAS
  fecha_nacimiento DATE NOT NULL,
  direccion TEXT NOT NULL,
  ciudad VARCHAR(100) NOT NULL,
  cargo_interes VARCHAR(100) NOT NULL,
  experiencia_laboral TEXT,
  nivel_educacion VARCHAR(50) NOT NULL, -- Bachiller, Técnico, Tecnólogo, Profesional, Especialización, Maestría, Doctorado
  hoja_vida_url TEXT, -- URL del archivo de hoja de vida en storage
  estado VARCHAR(20) DEFAULT 'nueva', -- nueva, revisada, contactada, descartada
  observaciones TEXT,
  fecha_aplicacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  fecha_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  revisada_por UUID REFERENCES usuario_nomina(auth_user_id) ON DELETE SET NULL,
  fecha_revision TIMESTAMP WITH TIME ZONE
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_aplicaciones_trabajo_email ON aplicaciones_trabajo(email);
CREATE INDEX IF NOT EXISTS idx_aplicaciones_trabajo_documento ON aplicaciones_trabajo(documento_identidad);
CREATE INDEX IF NOT EXISTS idx_aplicaciones_trabajo_estado ON aplicaciones_trabajo(estado);
CREATE INDEX IF NOT EXISTS idx_aplicaciones_trabajo_fecha_aplicacion ON aplicaciones_trabajo(fecha_aplicacion);
CREATE INDEX IF NOT EXISTS idx_aplicaciones_trabajo_cargo_interes ON aplicaciones_trabajo(cargo_interes);

-- Función para actualizar fecha_actualizacion automáticamente
CREATE OR REPLACE FUNCTION update_aplicaciones_trabajo_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.fecha_actualizacion = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar fecha_actualizacion
CREATE TRIGGER trigger_update_aplicaciones_trabajo_updated_at
  BEFORE UPDATE ON aplicaciones_trabajo
  FOR EACH ROW
  EXECUTE FUNCTION update_aplicaciones_trabajo_updated_at();

-- Habilitar RLS (Row Level Security)
ALTER TABLE aplicaciones_trabajo ENABLE ROW LEVEL SECURITY;

-- Política para que los administradores puedan ver todas las aplicaciones
CREATE POLICY "Los administradores pueden ver todas las aplicaciones de trabajo"
  ON aplicaciones_trabajo
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT auth_user_id FROM usuario_nomina WHERE rol = 'administrador'
    )
  );

-- Política para que los administradores puedan actualizar las aplicaciones
CREATE POLICY "Los administradores pueden actualizar aplicaciones de trabajo"
  ON aplicaciones_trabajo
  FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT auth_user_id FROM usuario_nomina WHERE rol = 'administrador'
    )
  );

-- Política para permitir inserción pública (para el formulario web)
CREATE POLICY "Permitir inserción pública de aplicaciones"
  ON aplicaciones_trabajo
  FOR INSERT
  WITH CHECK (true);

-- Crear bucket para hojas de vida (esto se debe ejecutar en el dashboard de Supabase)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('hojas-vida', 'hojas-vida', false);

-- Políticas de storage para el bucket 'hojas-vida'
-- Permitir subida pública de archivos
-- CREATE POLICY "Permitir subida pública de hojas de vida" ON storage.objects
--   FOR INSERT WITH CHECK (
--     bucket_id = 'hojas-vida' AND
--     (storage.extension(name) = 'pdf' OR 
--      storage.extension(name) = 'doc' OR 
--      storage.extension(name) = 'docx')
--   );

-- Los administradores pueden ver todas las hojas de vida
-- CREATE POLICY "Los administradores pueden ver todas las hojas de vida" ON storage.objects
--   FOR SELECT USING (
--     bucket_id = 'hojas-vida' AND
--     auth.uid() IN (
--       SELECT auth_user_id FROM usuario_nomina WHERE rol = 'administrador'
--     )
--   );

COMMIT;