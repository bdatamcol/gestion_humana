-- Separa la carga del certificado de su aprobación y habilita un gestor limitado.

ALTER TABLE usuario_nomina DROP CONSTRAINT IF EXISTS usuario_nomina_rol_check;
ALTER TABLE usuario_nomina
  ADD CONSTRAINT usuario_nomina_rol_check
  CHECK (rol IN ('usuario', 'jefe', 'administrador', 'gestor_actas', 'gestor_certificados'));

ALTER TABLE solicitudes_certificado_ingresos
  DROP CONSTRAINT IF EXISTS solicitudes_certificado_ingresos_estado_check,
  DROP CONSTRAINT IF EXISTS solicitudes_certificado_ingresos_pdf_requerido;

-- La restricción anterior solo permitía pendiente/certificado_creado, por lo
-- que debe retirarse antes de trasladar los certificados ya generados.
UPDATE solicitudes_certificado_ingresos
SET estado = 'aprobado'
WHERE estado = 'certificado_creado';

ALTER TABLE solicitudes_certificado_ingresos
  ADD COLUMN IF NOT EXISTS cargado_por UUID REFERENCES usuario_nomina(auth_user_id),
  ADD COLUMN IF NOT EXISTS fecha_carga TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS revisado_por UUID REFERENCES usuario_nomina(auth_user_id),
  ADD COLUMN IF NOT EXISTS fecha_revision TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS motivo_rechazo TEXT,
  ADD CONSTRAINT solicitudes_certificado_ingresos_estado_check
    CHECK (estado IN ('pendiente', 'certificado_cargado', 'aprobado', 'rechazado')),
  ADD CONSTRAINT solicitudes_certificado_ingresos_pdf_requerido
    CHECK (estado NOT IN ('certificado_cargado', 'aprobado') OR (pdf_url IS NOT NULL AND pdf_public_id IS NOT NULL));

COMMENT ON TABLE solicitudes_certificado_ingresos IS
  'Solicitudes de certificado: el gestor adjunta el PDF y administración lo aprueba o rechaza.';
