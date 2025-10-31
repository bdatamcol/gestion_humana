-- Crear tabla eps
CREATE TABLE eps (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE
);

-- Agregar columna eps_id a la tabla usuario_nomina
ALTER TABLE usuario_nomina
DROP COLUMN eps,
ADD COLUMN eps_id INTEGER REFERENCES eps(id);

-- Insertar eps
INSERT INTO eps (nombre) VALUES
('COMFAORIENTE'),
('COMPENSAR EPS'),
('COOSALUD EPS'),
('ECOPSOS EPS'),
('FAMISANAR'),
('FUNDACION SALUD MIA'),
('NUEVA EPS'),
('SALUD TOTAL'),
('SANITAS EPS'),
('SURA EPS');
