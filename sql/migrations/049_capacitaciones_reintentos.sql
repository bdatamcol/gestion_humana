-- =====================================================
-- Reintentos de examen en capacitaciones
-- =====================================================

-- 1. Configuración en el curso
ALTER TABLE capacitaciones_cursos
  ADD COLUMN IF NOT EXISTS permite_reintentos BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS max_intentos INT NOT NULL DEFAULT 1 CHECK (max_intentos >= 1);

COMMENT ON COLUMN capacitaciones_cursos.permite_reintentos IS 'Si es TRUE, el usuario puede intentar el examen varias veces hasta max_intentos';
COMMENT ON COLUMN capacitaciones_cursos.max_intentos IS 'Número total de intentos permitidos (incluye el primero). 1 = sin reintentos';

-- 2. Numerar los intentos
ALTER TABLE capacitaciones_intentos
  ADD COLUMN IF NOT EXISTS numero_intento INT NOT NULL DEFAULT 1;

ALTER TABLE capacitaciones_intentos ALTER COLUMN numero_intento DROP DEFAULT;

-- 3. Reemplazar UNIQUE viejo (usuario, examen) por UNIQUE compuesto (usuario, examen, numero_intento)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'capacitaciones_intentos_usuario_id_examen_id_key'
  ) THEN
    ALTER TABLE capacitaciones_intentos DROP CONSTRAINT capacitaciones_intentos_usuario_id_examen_id_key;
  END IF;
END $$;

ALTER TABLE capacitaciones_intentos
  ADD CONSTRAINT capacitaciones_intentos_usuario_examen_numero_key
  UNIQUE (usuario_id, examen_id, numero_intento);

-- 4. Índice para consultas por (usuario, examen, último intento)
CREATE INDEX IF NOT EXISTS idx_capacitaciones_intentos_usuario_examen_numero
  ON capacitaciones_intentos (usuario_id, examen_id, numero_intento DESC);