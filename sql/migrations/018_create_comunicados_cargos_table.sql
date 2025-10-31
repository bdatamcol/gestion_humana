-- Crear tabla para relacionar comunicados con cargos
-- Descripción: Tabla de relación muchos a muchos entre comunicados y cargos

CREATE TABLE IF NOT EXISTS comunicados_cargos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  comunicado_id UUID NOT NULL REFERENCES comunicados(id) ON DELETE CASCADE,
  cargo_id UUID NOT NULL REFERENCES cargos(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(comunicado_id, cargo_id)
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_comunicados_cargos_comunicado_id ON comunicados_cargos(comunicado_id);
CREATE INDEX IF NOT EXISTS idx_comunicados_cargos_cargo_id ON comunicados_cargos(cargo_id);

-- Habilitar RLS (Row Level Security)
ALTER TABLE comunicados_cargos ENABLE ROW LEVEL SECURITY;

-- Política para que todos los usuarios puedan ver las relaciones
CREATE POLICY "Todos los usuarios pueden ver comunicados_cargos"
  ON comunicados_cargos
  FOR SELECT
  TO PUBLIC;

-- Política para que solo los administradores puedan gestionar las relaciones
CREATE POLICY "Solo los administradores pueden gestionar comunicados_cargos"
  ON comunicados_cargos
  FOR ALL
  USING (auth.uid() IN (
    SELECT auth_user_id FROM usuario_nomina WHERE rol = 'administrador'
  ));

-- Comentarios para documentación
COMMENT ON TABLE comunicados_cargos IS 'Tabla de relación muchos a muchos entre comunicados y cargos';
COMMENT ON COLUMN comunicados_cargos.id IS 'Identificador único de la relación';
COMMENT ON COLUMN comunicados_cargos.comunicado_id IS 'ID del comunicado (foreign key)';
COMMENT ON COLUMN comunicados_cargos.cargo_id IS 'ID del cargo (foreign key)';
COMMENT ON COLUMN comunicados_cargos.created_at IS 'Fecha y hora de creación del registro';
COMMENT ON COLUMN comunicados_cargos.updated_at IS 'Fecha y hora de última actualización del registro';
