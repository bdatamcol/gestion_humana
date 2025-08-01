-- Crear tabla cesantias
CREATE TABLE cesantias (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE
);

-- Agregar columna cesantias_id a la tabla usuario_nomina
ALTER TABLE usuario_nomina
DROP COLUMN cesantias,
ADD COLUMN cesantias_id INTEGER REFERENCES cesantias(id);

-- Insertar cesantias
INSERT INTO cesantias (nombre) VALUES
('COLFONDOS'),
('COLPENSIONES'),
('FNA'),
('NA'),
('PORVENIR'),
('PROTECCION');
