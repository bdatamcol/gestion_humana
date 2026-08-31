-- Módulo: Certificado de ingresos y retenciones
-- Crea la tabla de solicitudes, sus índices y las políticas RLS.
-- El flujo completo (creación, carga del PDF y notificaciones) se ejecuta
-- desde las rutas API con el cliente de servicio, por lo que las políticas
-- aquí definidas cubren únicamente la lectura directa desde el cliente.

CREATE TABLE IF NOT EXISTS solicitudes_certificado_ingresos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuario_nomina(auth_user_id) ON DELETE CASCADE,
  admin_id UUID REFERENCES usuario_nomina(auth_user_id),
  estado VARCHAR(30) NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente', 'certificado_creado')),
  anio_gravable INTEGER NOT NULL CHECK (anio_gravable BETWEEN 2000 AND 2100),
  observaciones TEXT,
  fecha_solicitud TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  fecha_certificado TIMESTAMP WITH TIME ZONE,
  pdf_url TEXT,
  pdf_public_id TEXT,
  pdf_nombre_original TEXT,
  pdf_tamano BIGINT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT solicitudes_certificado_ingresos_pdf_requerido CHECK (
    estado <> 'certificado_creado' OR (pdf_url IS NOT NULL AND pdf_public_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_solicitudes_certificado_ingresos_usuario
  ON solicitudes_certificado_ingresos(usuario_id);

CREATE INDEX IF NOT EXISTS idx_solicitudes_certificado_ingresos_estado
  ON solicitudes_certificado_ingresos(estado);

CREATE INDEX IF NOT EXISTS idx_solicitudes_certificado_ingresos_fecha
  ON solicitudes_certificado_ingresos(fecha_solicitud DESC);

-- Evita que un colaborador tenga dos solicitudes pendientes del mismo año gravable
CREATE UNIQUE INDEX IF NOT EXISTS idx_solicitudes_certificado_ingresos_pendiente_unica
  ON solicitudes_certificado_ingresos(usuario_id, anio_gravable)
  WHERE estado = 'pendiente';

ALTER TABLE solicitudes_certificado_ingresos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Los usuarios pueden ver sus solicitudes de certificado de ingresos"
  ON solicitudes_certificado_ingresos;
CREATE POLICY "Los usuarios pueden ver sus solicitudes de certificado de ingresos"
  ON solicitudes_certificado_ingresos
  FOR SELECT
  USING (auth.uid() = usuario_id);

DROP POLICY IF EXISTS "Los administradores pueden ver todas las solicitudes de certificado de ingresos"
  ON solicitudes_certificado_ingresos;
CREATE POLICY "Los administradores pueden ver todas las solicitudes de certificado de ingresos"
  ON solicitudes_certificado_ingresos
  FOR SELECT
  USING (auth.uid() IN (
    SELECT auth_user_id FROM usuario_nomina WHERE lower(rol) IN ('administrador', 'moderador')
  ));

-- Reutiliza la función de actualización de updated_at creada en el sistema de notificaciones
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_solicitudes_certificado_ingresos_updated_at
  ON solicitudes_certificado_ingresos;
CREATE TRIGGER update_solicitudes_certificado_ingresos_updated_at
    BEFORE UPDATE ON solicitudes_certificado_ingresos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE solicitudes_certificado_ingresos
  IS 'Solicitudes de certificado de ingresos y retenciones. El administrador adjunta el PDF y el estado pasa a certificado_creado.';
