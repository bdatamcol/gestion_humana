-- Crear tabla para categorías de bienestar
CREATE TABLE IF NOT EXISTS categorias_bienestar (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre VARCHAR(100) NOT NULL UNIQUE,
  descripcion TEXT,
  color VARCHAR(7) DEFAULT '#3B82F6',
  activa BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla para publicaciones de bienestar
CREATE TABLE IF NOT EXISTS publicaciones_bienestar (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  titulo VARCHAR(200) NOT NULL,
  contenido TEXT NOT NULL,
  imagen_principal TEXT,
  galeria_imagenes JSONB DEFAULT '[]'::jsonb,
  fecha_publicacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  categoria_id UUID REFERENCES categorias_bienestar(id),
  autor_id UUID NOT NULL REFERENCES usuario_nomina(auth_user_id),
  estado VARCHAR(20) NOT NULL DEFAULT 'publicado' CHECK (estado IN ('borrador', 'publicado', 'archivado')),
  vistas INTEGER DEFAULT 0,
  destacado BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insertar categorías iniciales para bienestar
INSERT INTO categorias_bienestar (nombre, descripcion, color) VALUES
('Salud Mental', 'Artículos sobre bienestar psicológico y salud mental', '#8B5CF6'),
('Ejercicio y Fitness', 'Consejos de ejercicio y actividad física', '#10B981'),
('Nutrición', 'Información sobre alimentación saludable', '#F59E0B'),
('Equilibrio Vida-Trabajo', 'Tips para mantener un balance saludable', '#3B82F6'),
('Actividades Recreativas', 'Eventos y actividades para el bienestar del equipo', '#EC4899'),
('Prevención', 'Artículos sobre prevención de enfermedades y cuidado personal', '#EF4444');

-- Crear índices para búsquedas eficientes
CREATE INDEX idx_publicaciones_bienestar_categoria ON publicaciones_bienestar(categoria_id);
CREATE INDEX idx_publicaciones_bienestar_autor ON publicaciones_bienestar(autor_id);
CREATE INDEX idx_publicaciones_bienestar_fecha ON publicaciones_bienestar(fecha_publicacion);
CREATE INDEX idx_publicaciones_bienestar_estado ON publicaciones_bienestar(estado);
CREATE INDEX idx_publicaciones_bienestar_destacado ON publicaciones_bienestar(destacado);

-- Habilitar RLS en las tablas
ALTER TABLE publicaciones_bienestar ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias_bienestar ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para publicaciones de bienestar
-- Todos los usuarios pueden ver las publicaciones publicadas
CREATE POLICY "Todos los usuarios pueden ver las publicaciones de bienestar publicadas"
  ON publicaciones_bienestar
  FOR SELECT
  USING (estado = 'publicado' OR auth.uid() = autor_id OR auth.uid() IN (
    SELECT auth_user_id FROM usuario_nomina WHERE rol = 'administrador'
  ));

-- Solo los administradores pueden crear publicaciones
CREATE POLICY "Solo los administradores pueden crear publicaciones de bienestar"
  ON publicaciones_bienestar
  FOR INSERT
  WITH CHECK (auth.uid() IN (
    SELECT auth_user_id FROM usuario_nomina WHERE rol = 'administrador'
  ));

-- Solo los administradores pueden actualizar publicaciones
CREATE POLICY "Solo los administradores pueden actualizar publicaciones de bienestar"
  ON publicaciones_bienestar
  FOR UPDATE
  USING (auth.uid() IN (
    SELECT auth_user_id FROM usuario_nomina WHERE rol = 'administrador'
  ));

-- Solo los administradores pueden eliminar publicaciones
CREATE POLICY "Solo los administradores pueden eliminar publicaciones de bienestar"
  ON publicaciones_bienestar
  FOR DELETE
  USING (auth.uid() IN (
    SELECT auth_user_id FROM usuario_nomina WHERE rol = 'administrador'
  ));

-- Políticas para categorías de bienestar
CREATE POLICY "Todos los usuarios pueden ver las categorías de bienestar"
  ON categorias_bienestar
  FOR SELECT
  TO PUBLIC;

CREATE POLICY "Solo los administradores pueden gestionar categorías de bienestar"
  ON categorias_bienestar
  FOR ALL
  USING (auth.uid() IN (
    SELECT auth_user_id FROM usuario_nomina WHERE rol = 'administrador'
  ));

-- Función para actualizar el campo updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para actualizar updated_at
CREATE TRIGGER update_publicaciones_bienestar_updated_at
    BEFORE UPDATE ON publicaciones_bienestar
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categorias_bienestar_updated_at
    BEFORE UPDATE ON categorias_bienestar
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comentarios para documentación
COMMENT ON TABLE publicaciones_bienestar IS 'Tabla para almacenar publicaciones del blog de bienestar';
COMMENT ON TABLE categorias_bienestar IS 'Tabla para categorías de publicaciones de bienestar';

COMMENT ON COLUMN publicaciones_bienestar.titulo IS 'Título de la publicación';
COMMENT ON COLUMN publicaciones_bienestar.contenido IS 'Contenido principal de la publicación';
COMMENT ON COLUMN publicaciones_bienestar.imagen_principal IS 'URL de la imagen principal de la publicación';
COMMENT ON COLUMN publicaciones_bienestar.galeria_imagenes IS 'Array JSON con URLs de imágenes adicionales';
COMMENT ON COLUMN publicaciones_bienestar.vistas IS 'Contador de visualizaciones de la publicación';
COMMENT ON COLUMN publicaciones_bienestar.destacado IS 'Indica si la publicación está destacada';
