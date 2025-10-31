-- Añadir columnas logo, razon_social y nit a la tabla empresas
ALTER TABLE empresas
ADD COLUMN logo VARCHAR(255),
ADD COLUMN razon_social VARCHAR(100) NOT NULL DEFAULT '',
ADD COLUMN nit VARCHAR(20) NOT NULL DEFAULT '';

-- Actualizar los datos existentes con valores por defecto para las empresas
UPDATE empresas SET razon_social = nombre, nit = '901303215-6' WHERE nombre = 'BDATAM';
UPDATE empresas SET razon_social = nombre, nit = '901303215-6' WHERE nombre = 'BF';
UPDATE empresas SET razon_social = nombre, nit = '901303215-6' WHERE nombre = 'CEB';
UPDATE empresas SET razon_social = nombre, nit = '901303215-6' WHERE nombre = 'CBS.CO';
UPDATE empresas SET razon_social = nombre, nit = '901303215-6' WHERE nombre = 'CIELO A';
UPDATE empresas SET razon_social = nombre, nit = '901303215-6' WHERE nombre = 'CREDIAVALES';
UPDATE empresas SET razon_social = nombre, nit = '901303215-6' WHERE nombre = 'DAYTONA';
UPDATE empresas SET razon_social = nombre, nit = '901303215-6' WHERE nombre = 'FHA';
UPDATE empresas SET razon_social = nombre, nit = '901303215-6' WHERE nombre = 'JAPOLANDIA';
UPDATE empresas SET razon_social = nombre, nit = '901303215-6' WHERE nombre = 'YCK';

-- Actualizar los logos para cada empresa (URLs de ejemplo)
