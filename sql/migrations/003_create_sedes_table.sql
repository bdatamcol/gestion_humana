-- Crear tabla sedes
CREATE TABLE sedes (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE
);

-- Agregar columna sede_id a la tabla usuario_nomina
ALTER TABLE usuario_nomina
DROP COLUMN sede,
ADD COLUMN sede_id INTEGER REFERENCES sedes(id);

-- Insertar sedes
INSERT INTO sedes (nombre) VALUES
('AGUACHICA'),
('ARAUCA'),
('BARRANCA'),
('BGA'),
('CHINACOTA'),
('CIENAGA'),
('CUCUTA'),
('OCAÑA'),
('PAMPLONA'),
('SAN GIL'),
('TIBU'),
('TOLEDO');
