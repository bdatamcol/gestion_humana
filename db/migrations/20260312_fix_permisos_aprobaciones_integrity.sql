-- 039_fix_permisos_aprobaciones_integrity.sql
-- Objetivo: robustecer el flujo de aprobaciones de permisos por jefes
-- 1) Backfill de aprobaciones faltantes
-- 2) Sincronizacion automatica al asignar/quitar jefes
-- 3) Endurecer politica de actualizacion para jefes
-- 4) Permitir a jefes ver solicitudes de sus subordinados

-- 1) Politica SELECT para jefes sobre solicitudes de sus subordinados
DROP POLICY IF EXISTS "Jefes pueden ver solicitudes de sus subordinados" ON solicitudes_permisos;
CREATE POLICY "Jefes pueden ver solicitudes de sus subordinados"
  ON solicitudes_permisos
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM usuario_jefes uj
      WHERE uj.usuario_id = solicitudes_permisos.usuario_id
        AND uj.jefe_id = auth.uid()
    )
  );

-- 2) Endurecer politica de update para jefes en permisos_aprobaciones
DROP POLICY IF EXISTS permisos_aprobaciones_jefe_update ON permisos_aprobaciones;
CREATE POLICY permisos_aprobaciones_jefe_update ON permisos_aprobaciones
  FOR UPDATE
  USING (
    jefe_id = auth.uid()
    AND estado = 'pendiente'
    AND EXISTS (
      SELECT 1
      FROM solicitudes_permisos sp
      WHERE sp.id = permisos_aprobaciones.solicitud_id
        AND sp.estado = 'pendiente'
    )
  )
  WITH CHECK (
    jefe_id = auth.uid()
    AND estado IN ('aprobado', 'rechazado')
    AND EXISTS (
      SELECT 1
      FROM solicitudes_permisos sp
      WHERE sp.id = permisos_aprobaciones.solicitud_id
        AND sp.estado = 'pendiente'
    )
  );

-- 3) Trigger de validacion defensiva para evitar cambios invalidos
CREATE OR REPLACE FUNCTION validar_transicion_permisos_aprobaciones()
RETURNS TRIGGER AS $$
DECLARE
  request_role TEXT;
  is_admin BOOLEAN;
  estado_solicitud TEXT;
BEGIN
  request_role := current_setting('request.jwt.claim.role', true);

  IF request_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM usuario_nomina u
    WHERE u.auth_user_id = auth.uid()
      AND u.rol = 'administrador'
  ) INTO is_admin;

  IF is_admin THEN
    RETURN NEW;
  END IF;

  IF OLD.estado <> 'pendiente' THEN
    RAISE EXCEPTION 'No se puede modificar una aprobacion ya resuelta.';
  END IF;

  IF NEW.estado NOT IN ('aprobado', 'rechazado') THEN
    RAISE EXCEPTION 'Estado de aprobacion invalido. Solo se permite aprobado o rechazado.';
  END IF;

  SELECT sp.estado
  INTO estado_solicitud
  FROM solicitudes_permisos sp
  WHERE sp.id = NEW.solicitud_id;

  IF estado_solicitud IS DISTINCT FROM 'pendiente' THEN
    RAISE EXCEPTION 'La solicitud ya no esta pendiente. No se puede cambiar la aprobacion.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_validar_transicion_permisos_aprobaciones ON permisos_aprobaciones;
CREATE TRIGGER trigger_validar_transicion_permisos_aprobaciones
BEFORE UPDATE ON permisos_aprobaciones
FOR EACH ROW
EXECUTE FUNCTION validar_transicion_permisos_aprobaciones();

-- 4) Backfill: crear aprobaciones faltantes para solicitudes pendientes
INSERT INTO permisos_aprobaciones (solicitud_id, jefe_id, estado)
SELECT sp.id, uj.jefe_id, 'pendiente'
FROM solicitudes_permisos sp
JOIN usuario_jefes uj ON uj.usuario_id = sp.usuario_id
LEFT JOIN permisos_aprobaciones pa
  ON pa.solicitud_id = sp.id
 AND pa.jefe_id = uj.jefe_id
WHERE sp.estado = 'pendiente'
  AND pa.id IS NULL
ON CONFLICT (solicitud_id, jefe_id) DO NOTHING;

-- 5) Trigger: cuando se asigna un jefe, crear aprobaciones para solicitudes pendientes
CREATE OR REPLACE FUNCTION sincronizar_aprobaciones_al_asignar_jefe()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO permisos_aprobaciones (solicitud_id, jefe_id, estado)
  SELECT sp.id, NEW.jefe_id, 'pendiente'
  FROM solicitudes_permisos sp
  WHERE sp.usuario_id = NEW.usuario_id
    AND sp.estado = 'pendiente'
  ON CONFLICT (solicitud_id, jefe_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_sincronizar_aprobaciones_al_asignar_jefe ON usuario_jefes;
CREATE TRIGGER trigger_sincronizar_aprobaciones_al_asignar_jefe
AFTER INSERT ON usuario_jefes
FOR EACH ROW
EXECUTE FUNCTION sincronizar_aprobaciones_al_asignar_jefe();

-- 6) Trigger: cuando se quita un jefe, limpiar aprobaciones pendientes de ese jefe
CREATE OR REPLACE FUNCTION sincronizar_aprobaciones_al_quitar_jefe()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM permisos_aprobaciones pa
  USING solicitudes_permisos sp
  WHERE pa.solicitud_id = sp.id
    AND pa.jefe_id = OLD.jefe_id
    AND sp.usuario_id = OLD.usuario_id
    AND sp.estado = 'pendiente'
    AND pa.estado = 'pendiente';

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_sincronizar_aprobaciones_al_quitar_jefe ON usuario_jefes;
CREATE TRIGGER trigger_sincronizar_aprobaciones_al_quitar_jefe
AFTER DELETE ON usuario_jefes
FOR EACH ROW
EXECUTE FUNCTION sincronizar_aprobaciones_al_quitar_jefe();
