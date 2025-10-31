-- Crear tabla empresas
CREATE TABLE empresas (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE
);

-- Agregar columna empresa_id a la tabla usuario_nomina
ALTER TABLE usuario_nomina
DROP COLUMN empresa,
ADD COLUMN empresa_id INTEGER REFERENCES empresas(id);

-- Insertar empresas
INSERT INTO empresas (nombre) VALUES
('BDATAM'),
('BF'),
('CEB'),
('CBS.CO'),
('CIELO A'),
('CREDIAVALES'),
('DAYTONA'),
('FHA'),
('JAPOLANDIA'),
('YCK');
