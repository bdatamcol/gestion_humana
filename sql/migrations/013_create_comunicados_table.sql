-- Crear tabla para categorías de comunicados
CREATE TABLE IF NOT EXISTS categorias_comunicados (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre VARCHAR(100) NOT NULL UNIQUE,
  descripcion TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla para comunicados internos
CREATE TABLE IF NOT EXISTS comunicados (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  titulo VARCHAR(200) NOT NULL,
  contenido TEXT NOT NULL,
  imagen_url TEXT,
  fecha_publicacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  categoria_id UUID REFERENCES categorias_comunicados(id),
  autor_id UUID NOT NULL REFERENCES usuario_nomina(auth_user_id),
  area_responsable VARCHAR(50) CHECK (area_responsable IN ('Recursos Humanos', 'Dirección General')),
  archivos_adjuntos JSONB,
  estado VARCHAR(20) NOT NULL DEFAULT 'publicado' CHECK (estado IN ('borrador', 'publicado', 'archivado')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insertar categorías iniciales
INSERT INTO categorias_comunicados (nombre, descripcion) VALUES
('Anuncios', 'Anuncios generales de la empresa'),
('Eventos', 'Eventos corporativos y actividades'),
('Recursos Humanos', 'Comunicados del departamento de RRHH'),
('Capacitaciones', 'Información sobre capacitaciones y cursos'),
('Políticas', 'Políticas y procedimientos de la empresa');

-- Crear índices para búsquedas eficientes
CREATE INDEX idx_comunicados_fecha ON comunicados(fecha_publicacion);
CREATE INDEX idx_comunicados_categoria ON comunicados(categoria_id);
CREATE INDEX idx_comunicados_autor ON comunicados(autor_id);

-- Crear política RLS para que todos los usuarios puedan ver los comunicados publicados
CREATE POLICY "Todos los usuarios pueden ver los comunicados publicados"
  ON comunicados
  FOR SELECT
  USING (estado = 'publicado' OR auth.uid() = autor_id OR auth.uid() IN (
    SELECT auth_user_id FROM usuario_nomina WHERE rol = 'administrador'
  ));

-- Crear política RLS para que solo los administradores puedan crear comunicados
CREATE POLICY "Solo los administradores pueden crear comunicados"
  ON comunicados
  FOR INSERT
  WITH CHECK (auth.uid() IN (
    SELECT auth_user_id FROM usuario_nomina WHERE rol = 'administrador'
  ));

-- Crear política RLS para que solo los administradores puedan actualizar comunicados
CREATE POLICY "Solo los administradores pueden actualizar comunicados"
  ON comunicados
  FOR UPDATE
  USING (auth.uid() IN (
    SELECT auth_user_id FROM usuario_nomina WHERE rol = 'administrador'
  ));

-- Crear política RLS para que solo los administradores puedan eliminar comunicados
CREATE POLICY "Solo los administradores pueden eliminar comunicados"
  ON comunicados
  FOR DELETE
  USING (auth.uid() IN (
    SELECT auth_user_id FROM usuario_nomina WHERE rol = 'administrador'
  ));

-- Habilitar RLS en las tablas
ALTER TABLE comunicados ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias_comunicados ENABLE ROW LEVEL SECURITY;

-- Políticas para categorías de comunicados
CREATE POLICY "Todos los usuarios pueden ver las categorías"
  ON categorias_comunicados
  FOR SELECT
  TO PUBLIC;

CREATE POLICY "Solo los administradores pueden gestionar categorías"
  ON categorias_comunicados
  FOR ALL
  USING (auth.uid() IN (
    SELECT auth_user_id FROM usuario_nomina WHERE rol = 'administrador'
  ));
