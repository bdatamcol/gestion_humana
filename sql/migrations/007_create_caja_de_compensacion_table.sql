-- Crear tabla caja_de_compensacion
CREATE TABLE caja_de_compensacion (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE
);

-- Agregar columna caja_de_compensacion_id a la tabla usuario_nomina
ALTER TABLE usuario_nomina
DROP COLUMN caja_de_compensacion,
ADD COLUMN caja_de_compensacion_id INTEGER REFERENCES caja_de_compensacion(id);

-- Insertar caja de compensación
INSERT INTO caja_de_compensacion (nombre) VALUES
('CAJAMAG'),
('COMFACESAR'),
('COMFANORTE'),
('COMFENALCO'),
('COMFIAR'),
('NA');
