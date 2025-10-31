-- Migración para actualizar la tabla comentarios_permisos
-- Reemplazar el campo 'leido' por 'visto_admin' y 'visto_usuario'

-- Primero, agregar las nuevas columnas
ALTER TABLE comentarios_permisos ADD COLUMN visto_admin BOOLEAN DEFAULT FALSE;
ALTER TABLE comentarios_permisos ADD COLUMN visto_usuario BOOLEAN DEFAULT FALSE;

-- Copiar los valores existentes de 'leido' a ambas columnas nuevas
UPDATE comentarios_permisos SET visto_admin = leido, visto_usuario = leido;

-- Eliminar la columna antigua
ALTER TABLE comentarios_permisos DROP COLUMN leido;

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_comentarios_permisos_visto_admin ON comentarios_permisos(visto_admin);
CREATE INDEX IF NOT EXISTS idx_comentarios_permisos_visto_usuario ON comentarios_permisos(visto_usuario);
