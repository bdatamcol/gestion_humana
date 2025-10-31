-- Agregar columna rol a la tabla usuario_nomina
ALTER TABLE usuario_nomina
ADD COLUMN rol VARCHAR(20) CHECK (rol IN ('usuario', 'administrador')) NOT NULL DEFAULT 'usuario';
