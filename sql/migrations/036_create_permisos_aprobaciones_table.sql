-- Tabla de aprobaciones por jefes para solicitudes de permisos
CREATE TABLE IF NOT EXISTS permisos_aprobaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitud_id uuid NOT NULL REFERENCES solicitudes_permisos (id) ON DELETE CASCADE,
  jefe_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  estado VARCHAR(20) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','aprobado','rechazado')),
  fecha_resolucion TIMESTAMPTZ,
  motivo_rechazo TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_permisos_aprobaciones_unique ON permisos_aprobaciones (solicitud_id, jefe_id);
CREATE INDEX IF NOT EXISTS idx_permisos_aprobaciones_solicitud ON permisos_aprobaciones (solicitud_id);
CREATE INDEX IF NOT EXISTS idx_permisos_aprobaciones_jefe ON permisos_aprobaciones (jefe_id);

ALTER TABLE permisos_aprobaciones ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
-- Administradores: acceso total
CREATE POLICY permisos_aprobaciones_admin_all ON permisos_aprobaciones
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM usuario_nomina u
      WHERE u.auth_user_id = auth.uid() AND u.rol = 'administrador'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuario_nomina u
      WHERE u.auth_user_id = auth.uid() AND u.rol = 'administrador'
    )
  );

-- Jefe: puede ver y actualizar sus propias aprobaciones
CREATE POLICY permisos_aprobaciones_jefe_select ON permisos_aprobaciones
  FOR SELECT
  USING (jefe_id = auth.uid());

CREATE POLICY permisos_aprobaciones_jefe_update ON permisos_aprobaciones
  FOR UPDATE
  USING (jefe_id = auth.uid())
  WITH CHECK (jefe_id = auth.uid());

-- Usuario solicitante: puede ver el estado de aprobaciones de sus solicitudes
CREATE POLICY permisos_aprobaciones_usuario_select ON permisos_aprobaciones
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM solicitudes_permisos sp
      WHERE sp.id = permisos_aprobaciones.solicitud_id
        AND sp.usuario_id = auth.uid()
    )
  );

-- Función y trigger: al crear solicitud, crear aprobaciones de jefes
CREATE OR REPLACE FUNCTION crear_aprobaciones_jefes_permiso()
RETURNS TRIGGER AS $$
DECLARE
  jefe_record RECORD;
BEGIN
  FOR jefe_record IN
    SELECT jefe_id FROM usuario_jefes WHERE usuario_id = NEW.usuario_id
  LOOP
    INSERT INTO permisos_aprobaciones (solicitud_id, jefe_id, estado)
    VALUES (NEW.id, jefe_record.jefe_id, 'pendiente')
    ON CONFLICT (solicitud_id, jefe_id) DO NOTHING;

    -- Notificación al jefe
    INSERT INTO notificaciones (usuario_id, tipo, titulo, mensaje, solicitud_id)
    VALUES (
      jefe_record.jefe_id,
      'permisos',
      'Solicitud de permiso pendiente de aprobación',
      'Tienes una solicitud de permiso de un colaborador que requiere tu revisión.',
      NEW.id
    );
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_crear_aprobaciones_jefes ON solicitudes_permisos;
CREATE TRIGGER trigger_crear_aprobaciones_jefes
AFTER INSERT ON solicitudes_permisos
FOR EACH ROW
EXECUTE FUNCTION crear_aprobaciones_jefes_permiso();

-- Función y trigger: al actualizar una aprobación, resolver estado de la solicitud
CREATE OR REPLACE FUNCTION resolver_estado_solicitud_por_aprobaciones()
RETURNS TRIGGER AS $$
DECLARE
  total_pendiente INTEGER;
  total_rechazado INTEGER;
BEGIN
  SELECT 
    COUNT(*) FILTER (WHERE estado = 'pendiente'),
    COUNT(*) FILTER (WHERE estado = 'rechazado')
  INTO total_pendiente, total_rechazado
  FROM permisos_aprobaciones
  WHERE solicitud_id = NEW.solicitud_id;

  IF total_rechazado > 0 THEN
    -- Si algún jefe rechaza, la solicitud queda rechazada
    UPDATE solicitudes_permisos
    SET estado = 'rechazado',
        fecha_resolucion = NOW(),
        motivo_rechazo = COALESCE(NEW.motivo_rechazo, motivo_rechazo)
    WHERE id = NEW.solicitud_id;

    -- Notificar al usuario solicitante
    INSERT INTO notificaciones (usuario_id, tipo, titulo, mensaje, solicitud_id)
    SELECT sp.usuario_id, 'permisos',
           'Solicitud de permiso rechazada por jefe',
           'Tu solicitud fue rechazada por uno de tus jefes. Revisa los detalles.',
           sp.id
    FROM solicitudes_permisos sp
    WHERE sp.id = NEW.solicitud_id;
  ELSE
    -- Si no hay pendientes y nadie rechazó, todas las aprobaciones están aprobadas
    IF total_pendiente = 0 THEN
      -- Notificar a administradores para revisión final
      INSERT INTO notificaciones (usuario_id, tipo, titulo, mensaje, solicitud_id)
      SELECT u.auth_user_id, 'permisos',
             'Aprobaciones de jefes completas',
             'Todas las aprobaciones de jefes están listas. Procede a la aprobación final.',
             NEW.solicitud_id
      FROM usuario_nomina u
      WHERE u.rol = 'administrador' AND u.estado = 'activo';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_resolver_estado_solicitud_por_aprobaciones ON permisos_aprobaciones;
CREATE TRIGGER trigger_resolver_estado_solicitud_por_aprobaciones
AFTER UPDATE OF estado ON permisos_aprobaciones
FOR EACH ROW
EXECUTE FUNCTION resolver_estado_solicitud_por_aprobaciones();
