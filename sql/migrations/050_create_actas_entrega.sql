CREATE SEQUENCE IF NOT EXISTS actas_entrega_numero_seq START 1;

CREATE TABLE IF NOT EXISTS actas_entrega (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_acta TEXT NOT NULL UNIQUE DEFAULT (
    'AE-' || to_char(CURRENT_DATE, 'YYYY') || '-' || lpad(nextval('actas_entrega_numero_seq')::text, 6, '0')
  ),
  entregante_id UUID NOT NULL REFERENCES usuario_nomina(auth_user_id),
  receptor_id UUID NOT NULL REFERENCES usuario_nomina(auth_user_id),
  empresa_id INTEGER REFERENCES empresas(id),
  entregante_nombre TEXT NOT NULL,
  entregante_documento TEXT,
  entregante_cargo TEXT,
  receptor_nombre TEXT NOT NULL,
  receptor_documento TEXT,
  receptor_cargo TEXT,
  empresa_nombre TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'borrador' CHECK (
    estado IN ('borrador', 'pendiente_recepcion', 'completada', 'aceptada_con_novedades', 'rechazada', 'anulada')
  ),
  acta_origen_id UUID REFERENCES actas_entrega(id),
  motivo_rechazo TEXT,
  fecha_envio TIMESTAMPTZ,
  fecha_respuesta TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (entregante_id <> receptor_id)
);

CREATE TABLE IF NOT EXISTS actas_entrega_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  acta_id UUID NOT NULL REFERENCES actas_entrega(id) ON DELETE CASCADE,
  descripcion TEXT NOT NULL,
  cantidad INTEGER NOT NULL DEFAULT 1 CHECK (cantidad > 0),
  serial_identificador TEXT,
  observaciones_entrega TEXT,
  recibido BOOLEAN,
  estado_recepcion TEXT CHECK (estado_recepcion IN ('bueno', 'regular', 'malo', 'no_recibido')),
  notas_recepcion TEXT,
  orden INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS actas_entrega_evidencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  acta_id UUID NOT NULL REFERENCES actas_entrega(id) ON DELETE RESTRICT,
  item_id UUID NOT NULL REFERENCES actas_entrega_items(id) ON DELETE RESTRICT,
  storage_path TEXT NOT NULL UNIQUE,
  nombre_original TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  tamano BIGINT NOT NULL CHECK (tamano > 0),
  uploaded_by UUID NOT NULL REFERENCES usuario_nomina(auth_user_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS actas_entrega_firmas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  acta_id UUID NOT NULL REFERENCES actas_entrega(id) ON DELETE RESTRICT,
  usuario_id UUID NOT NULL REFERENCES usuario_nomina(auth_user_id),
  rol_firmante TEXT NOT NULL CHECK (rol_firmante IN ('entregante', 'receptor')),
  storage_path TEXT NOT NULL UNIQUE,
  consentimiento TEXT NOT NULL,
  contenido_hash TEXT NOT NULL,
  ip TEXT,
  user_agent TEXT,
  firmada_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (acta_id, rol_firmante)
);

CREATE TABLE IF NOT EXISTS actas_entrega_eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  acta_id UUID NOT NULL REFERENCES actas_entrega(id) ON DELETE RESTRICT,
  actor_id UUID REFERENCES usuario_nomina(auth_user_id),
  tipo TEXT NOT NULL,
  detalle JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS actas_entrega_correos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  acta_id UUID NOT NULL REFERENCES actas_entrega(id) ON DELETE RESTRICT,
  tipo TEXT NOT NULL,
  destinatario TEXT NOT NULL,
  estado TEXT NOT NULL CHECK (estado IN ('enviado', 'fallido')),
  message_id TEXT,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_actas_entrega_entregante ON actas_entrega(entregante_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_actas_entrega_receptor ON actas_entrega(receptor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_actas_entrega_estado ON actas_entrega(estado, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_actas_entrega_empresa ON actas_entrega(empresa_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_actas_entrega_items_acta ON actas_entrega_items(acta_id, orden);
CREATE INDEX IF NOT EXISTS idx_actas_entrega_evidencias_item ON actas_entrega_evidencias(item_id);
CREATE INDEX IF NOT EXISTS idx_actas_entrega_eventos_acta ON actas_entrega_eventos(acta_id, created_at);

CREATE OR REPLACE FUNCTION actas_entrega_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_actas_entrega_updated_at ON actas_entrega;
CREATE TRIGGER set_actas_entrega_updated_at BEFORE UPDATE ON actas_entrega
FOR EACH ROW EXECUTE FUNCTION actas_entrega_set_updated_at();

DROP TRIGGER IF EXISTS set_actas_entrega_items_updated_at ON actas_entrega_items;
CREATE TRIGGER set_actas_entrega_items_updated_at BEFORE UPDATE ON actas_entrega_items
FOR EACH ROW EXECUTE FUNCTION actas_entrega_set_updated_at();

ALTER TABLE actas_entrega ENABLE ROW LEVEL SECURITY;
ALTER TABLE actas_entrega_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE actas_entrega_evidencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE actas_entrega_firmas ENABLE ROW LEVEL SECURITY;
ALTER TABLE actas_entrega_eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE actas_entrega_correos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participantes y admin ven actas" ON actas_entrega FOR SELECT USING (
  auth.uid() IN (entregante_id, receptor_id) OR EXISTS (
    SELECT 1 FROM usuario_nomina u WHERE u.auth_user_id = auth.uid() AND u.rol = 'administrador'
  )
);
CREATE POLICY "Usuarios activos crean actas" ON actas_entrega FOR INSERT WITH CHECK (
  entregante_id = auth.uid() AND EXISTS (
    SELECT 1 FROM usuario_nomina u WHERE u.auth_user_id = auth.uid() AND u.estado = 'activo'
  )
);
CREATE POLICY "Entregante actualiza borrador" ON actas_entrega FOR UPDATE USING (
  entregante_id = auth.uid() AND estado = 'borrador'
);

CREATE POLICY "Participantes y admin ven items" ON actas_entrega_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM actas_entrega a WHERE a.id = acta_id)
);
CREATE POLICY "Entregante crea items en borrador" ON actas_entrega_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM actas_entrega a WHERE a.id = acta_id AND a.entregante_id = auth.uid() AND a.estado = 'borrador')
);
CREATE POLICY "Entregante edita items en borrador" ON actas_entrega_items FOR UPDATE USING (
  EXISTS (SELECT 1 FROM actas_entrega a WHERE a.id = acta_id AND a.entregante_id = auth.uid() AND a.estado = 'borrador')
);
CREATE POLICY "Entregante elimina items en borrador" ON actas_entrega_items FOR DELETE USING (
  EXISTS (SELECT 1 FROM actas_entrega a WHERE a.id = acta_id AND a.entregante_id = auth.uid() AND a.estado = 'borrador')
);

CREATE POLICY "Participantes y admin ven evidencias" ON actas_entrega_evidencias FOR SELECT USING (
  EXISTS (SELECT 1 FROM actas_entrega a WHERE a.id = acta_id)
);
CREATE POLICY "Receptor agrega evidencias" ON actas_entrega_evidencias FOR INSERT WITH CHECK (
  uploaded_by = auth.uid() AND EXISTS (
    SELECT 1 FROM actas_entrega a WHERE a.id = acta_id AND a.receptor_id = auth.uid() AND a.estado = 'pendiente_recepcion'
  )
);

CREATE POLICY "Participantes y admin ven firmas" ON actas_entrega_firmas FOR SELECT USING (
  EXISTS (SELECT 1 FROM actas_entrega a WHERE a.id = acta_id)
);
CREATE POLICY "Firmante crea su firma" ON actas_entrega_firmas FOR INSERT WITH CHECK (
  usuario_id = auth.uid() AND EXISTS (
    SELECT 1 FROM actas_entrega a
    WHERE a.id = acta_id AND (
      (rol_firmante = 'entregante' AND a.entregante_id = auth.uid() AND a.estado = 'borrador') OR
      (rol_firmante = 'receptor' AND a.receptor_id = auth.uid() AND a.estado = 'pendiente_recepcion')
    )
  )
);

CREATE POLICY "Participantes y admin ven eventos" ON actas_entrega_eventos FOR SELECT USING (
  EXISTS (SELECT 1 FROM actas_entrega a WHERE a.id = acta_id)
);

ALTER TABLE notificaciones ADD COLUMN IF NOT EXISTS enlace TEXT;
