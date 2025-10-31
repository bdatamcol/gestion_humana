-- Crear tabla afp
CREATE TABLE afp (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE
);

-- Agregar columna afp_id a la tabla usuario_nomina
ALTER TABLE usuario_nomina
DROP COLUMN afp,
ADD COLUMN afp_id INTEGER REFERENCES afp(id);

-- Insertar afp
INSERT INTO afp (nombre) VALUES
('COLFONDOS'),
('COLPENSIONES'),
('NA'),
('PENSIONADA'),
('PORVENIR'),
('PROTECCION');
