-- Agregar columna ciudad a la tabla solicitudes_permisos
ALTER TABLE solicitudes_permisos 
ADD COLUMN ciudad VARCHAR(100);

-- Comentario sobre la nueva columna
COMMENT ON COLUMN solicitudes_permisos.ciudad IS 'Ciudad donde se realizará el permiso o actividad';
