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
UPDATE empresas SET logo = 'https://aqmlxjsyczqtfansvnqr.supabase.co/storage/v1/object/sign/empresas/logos/logo-de-bdatam.webp?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1cmwiOiJlbXByZXNhcy9sb2dvcy9sb2dvLWRlLWJkYXRhbS53ZWJwIiwiaWF0IjoxNzQzNDU2NzY2LCJleHAiOjMzMjc5NDU2NzY2fQ.L-UGLGCkuTWagg-NnfZxrqF9QieZG5utwHDWJhPZ65I' WHERE nombre = 'BDATAM';
UPDATE empresas SET logo = 'https://storage.googleapis.com/gestion_humana_logos/bf_logo.png' WHERE nombre = 'BF';
UPDATE empresas SET logo = 'https://storage.googleapis.com/gestion_humana_logos/ceb_logo.png' WHERE nombre = 'CEB';
UPDATE empresas SET logo = 'https://storage.googleapis.com/gestion_humana_logos/cbs_logo.png' WHERE nombre = 'CBS.CO';
UPDATE empresas SET logo = 'https://storage.googleapis.com/gestion_humana_logos/cielo_logo.png' WHERE nombre = 'CIELO A';
UPDATE empresas SET logo = 'https://storage.googleapis.com/gestion_humana_logos/crediavales_logo.png' WHERE nombre = 'CREDIAVALES';
UPDATE empresas SET logo = 'https://storage.googleapis.com/gestion_humana_logos/daytona_logo.png' WHERE nombre = 'DAYTONA';
UPDATE empresas SET logo = 'https://storage.googleapis.com/gestion_humana_logos/fha_logo.png' WHERE nombre = 'FHA';
UPDATE empresas SET logo = 'https://storage.googleapis.com/gestion_humana_logos/japolandia_logo.png' WHERE nombre = 'JAPOLANDIA';
UPDATE empresas SET logo = 'https://storage.googleapis.com/gestion_humana_logos/yck_logo.png' WHERE nombre = 'YCK';
