-- Agregar categorías para las diferentes secciones
-- Estas categorías permitirán separar las publicaciones por sección
-- manteniendo la misma funcionalidad base

-- Insertar categorías para la sección de Actividades
INSERT INTO categorias_bienestar (nombre, descripcion, color) VALUES
('Actividades - Deportivas', 'Actividades deportivas y competencias', '#22C55E'),
('Actividades - Culturales', 'Eventos culturales y artísticos', '#A855F7'),
('Actividades - Sociales', 'Eventos sociales y de integración', '#F97316'),
('Actividades - Capacitación', 'Talleres y actividades de formación', '#06B6D4'),
('Actividades - Celebraciones', 'Celebraciones especiales y fechas importantes', '#EC4899');

-- Insertar categorías para la sección de SST (Seguridad y Salud en el Trabajo)
INSERT INTO categorias_bienestar (nombre, descripcion, color) VALUES
('SST - Prevención', 'Medidas preventivas de seguridad y salud', '#EF4444'),
('SST - Capacitación', 'Entrenamientos en seguridad y salud laboral', '#F59E0B'),
('SST - Procedimientos', 'Procedimientos de seguridad y protocolos', '#8B5CF6'),
('SST - Equipos', 'Información sobre equipos de protección personal', '#10B981'),
('SST - Emergencias', 'Protocolos de emergencia y evacuación', '#DC2626');

-- Insertar categorías para la sección de Normatividad
INSERT INTO categorias_bienestar (nombre, descripcion, color) VALUES
('Normatividad - Laboral', 'Normativas y regulaciones laborales', '#1E40AF'),
('Normatividad - SST', 'Normativas de seguridad y salud en el trabajo', '#7C2D12'),
('Normatividad - Administrativa', 'Procedimientos y políticas administrativas', '#059669'),
('Normatividad - Legal', 'Marco legal y jurídico empresarial', '#7C3AED'),
('Normatividad - Actualización', 'Actualizaciones normativas y cambios legales', '#DC2626');

-- Agregar un campo tipo_seccion para facilitar el filtrado
ALTER TABLE categorias_bienestar ADD COLUMN IF NOT EXISTS tipo_seccion VARCHAR(20) DEFAULT 'bienestar';

-- Actualizar las categorías existentes
UPDATE categorias_bienestar SET tipo_seccion = 'bienestar' 
WHERE nombre IN ('Salud Mental', 'Ejercicio y Fitness', 'Nutrición', 'Equilibrio Vida-Trabajo', 'Actividades Recreativas', 'Prevención');

-- Actualizar las nuevas categorías de Actividades
UPDATE categorias_bienestar SET tipo_seccion = 'actividades' 
WHERE nombre LIKE 'Actividades -%';

-- Actualizar las nuevas categorías de SST
UPDATE categorias_bienestar SET tipo_seccion = 'sst' 
WHERE nombre LIKE 'SST -%';

-- Actualizar las nuevas categorías de Normatividad
UPDATE categorias_bienestar SET tipo_seccion = 'normatividad' 
WHERE nombre LIKE 'Normatividad -%';

-- Crear índice para el nuevo campo
CREATE INDEX idx_categorias_bienestar_tipo_seccion ON categorias_bienestar(tipo_seccion);

-- Comentario para documentación
COMMENT ON COLUMN categorias_bienestar.tipo_seccion IS 'Tipo de sección: bienestar, actividades, sst, normatividad';
