-- Crear tabla para cargos
CREATE TABLE IF NOT EXISTS cargos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre VARCHAR(100) NOT NULL UNIQUE,
  descripcion TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insertar algunos cargos por defecto
INSERT INTO cargos (nombre, descripcion) VALUES
('Gerente General', 'Responsable de la dirección general de la empresa'),
('Jefe de Recursos Humanos', 'Encargado de la gestión del talento humano'),
('Contador', 'Responsable de la contabilidad y finanzas'),
('Asistente Administrativo', 'Apoyo en tareas administrativas'),
('Vendedor', 'Encargado de las ventas y atención al cliente'),
('Desarrollador', 'Programador de software'),
('Analista', 'Análisis de datos y procesos'),
('Coordinador', 'Coordinación de equipos y proyectos')
ON CONFLICT (nombre) DO NOTHING;

-- Crear índice para mejorar el rendimiento de búsquedas
CREATE INDEX IF NOT EXISTS idx_cargos_nombre ON cargos(nombre);

-- Comentarios para documentar la tabla
COMMENT ON TABLE cargos IS 'Tabla que almacena los diferentes cargos disponibles en la empresa';
COMMENT ON COLUMN cargos.id IS 'Identificador único del cargo';
COMMENT ON COLUMN cargos.nombre IS 'Nombre del cargo';
COMMENT ON COLUMN cargos.descripcion IS 'Descripción detallada del cargo';
COMMENT ON COLUMN cargos.created_at IS 'Fecha y hora de creación del registro';
COMMENT ON COLUMN cargos.updated_at IS 'Fecha y hora de última actualización del registro';
