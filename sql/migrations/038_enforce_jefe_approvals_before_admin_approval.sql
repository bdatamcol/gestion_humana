-- Impedir aprobación administrativa de permisos sin Vo.Bo de jefes
CREATE OR REPLACE FUNCTION validar_aprobacion_admin_permisos()
RETURNS TRIGGER AS $$
DECLARE
  total_aprobaciones INTEGER;
  total_pendientes INTEGER;
  total_rechazadas INTEGER;
BEGIN
  IF NEW.estado = 'aprobado' AND NEW.estado IS DISTINCT FROM OLD.estado THEN
    SELECT
      COUNT(*),
      COUNT(*) FILTER (WHERE estado = 'pendiente'),
      COUNT(*) FILTER (WHERE estado = 'rechazado')
    INTO total_aprobaciones, total_pendientes, total_rechazadas
    FROM permisos_aprobaciones
    WHERE solicitud_id = NEW.id;

    IF total_aprobaciones = 0 THEN
      RAISE EXCEPTION 'No se puede aprobar: la solicitud no tiene jefes asignados para aprobación.';
    END IF;

    IF total_rechazadas > 0 THEN
      RAISE EXCEPTION 'No se puede aprobar: existe al menos una aprobación de jefe rechazada.';
    END IF;

    IF total_pendientes > 0 THEN
      RAISE EXCEPTION 'No se puede aprobar: aún hay aprobaciones de jefes pendientes.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_validar_aprobacion_admin_permisos ON solicitudes_permisos;
CREATE TRIGGER trigger_validar_aprobacion_admin_permisos
BEFORE UPDATE OF estado ON solicitudes_permisos
FOR EACH ROW
EXECUTE FUNCTION validar_aprobacion_admin_permisos();
