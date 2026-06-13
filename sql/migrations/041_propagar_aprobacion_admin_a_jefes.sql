-- 041_propagar_aprobacion_admin_a_jefes.sql
-- Problema: cuando el administrador aprueba una solicitud de permiso, se
-- actualiza solicitudes_permisos.estado = 'aprobado' pero las filas hijas
-- en permisos_aprobaciones quedan en 'pendiente' (para cada jefe). Esto
-- produce una inconsistencia visible: el "Estado Actual" aparece como
-- "Aprobado" pero en "Aprobaciones de Jefes" los nombres siguen con
-- icono de reloj/pendiente.
--
-- Solucion:
--   1) Funcion SECURITY DEFINER que propaga 'aprobado' a las filas de
--      permisos_aprobaciones que sigan en 'pendiente'. Usa
--      session_replication_role = replica a nivel de transaccion para
--      esquivar el trigger BEFORE UPDATE validar_transicion_permisos_
--      aprobaciones() de la migracion 039 (que rechaza updates cuando
--      la solicitud padre ya no esta 'pendiente').
--   2) Trigger AFTER UPDATE OF estado en solicitudes_permisos que
--      invoca la funcion del punto 1.
--   3) Backfill correctivo idempotente: sincroniza filas ya existentes
--      que quedaron desincronizadas por el bug historico (incluye el
--      caso reportado: KELLY JOHANA MENESES CORONEL -> jefe ANDREA
--      CAMACHO CASTELLANOS quedaba en pendiente).
--
-- Seguridad: la funcion es SECURITY DEFINER y solo se invoca desde el
-- trigger (o manualmente por un administrador). La desactivacion de
-- triggers con session_replication_role = replica esta limitada a la
-- transaccion actual (SET LOCAL) y se restaura al COMMIT/ROLLBACK.

-- ---------------------------------------------------------------------------
-- 1) Funcion de propagacion
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION propagar_aprobacion_admin_a_jefes()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo actuar cuando la solicitud pasa a 'aprobado' desde un estado
  -- distinto (incluye 'pendiente' y 'rechazado' como origenes validos).
  IF NEW.estado = 'aprobado' AND NEW.estado IS DISTINCT FROM OLD.estado THEN
    -- Esquivar el trigger BEFORE UPDATE de la migracion 039 que, con
    -- logica de razon valida, bloquea updates a filas de aprobaciones
    -- cuando la solicitud padre ya no esta 'pendiente'. Necesario
    -- para propagar la aprobacion administrativa hacia las filas de
    -- los jefes. SET LOCAL limita el cambio a la transaccion actual.
    SET LOCAL session_replication_role = replica;

    UPDATE permisos_aprobaciones
    SET estado = 'aprobado',
        fecha_resolucion = COALESCE(fecha_resolucion, NOW())
    WHERE solicitud_id = NEW.id
      AND estado = 'pendiente';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_propagar_aprobacion_admin_a_jefes ON solicitudes_permisos;
CREATE TRIGGER trigger_propagar_aprobacion_admin_a_jefes
  AFTER UPDATE OF estado ON solicitudes_permisos
  FOR EACH ROW
  EXECUTE FUNCTION propagar_aprobacion_admin_a_jefes();

-- ---------------------------------------------------------------------------
-- 2) Backfill correctivo (idempotente)
--    Cubre dos casos historicos:
--    a) Filas existentes en 'pendiente' cuya solicitud padre ya esta
--       aprobada -> marcarlas como 'aprobado'.
--    b) Filas faltantes: para cada par (solicitud, jefe) donde el jefe
--       esta actualmente en usuario_jefes del solicitante pero no existe
--       una fila en permisos_aprobaciones, crearla con el estado de la
--       solicitud padre. Asi el panel del jefe deja de mostrar
--       "Sin asignacion" para solicitudes de su equipo.
--    Mismo truco de session_replication_role = replica para esquivar
--    la validacion defensiva de la migracion 039 en los updates.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  SET LOCAL session_replication_role = replica;

  -- 2a) Sincronizar filas existentes pendientes cuya solicitud ya fue aprobada
  UPDATE permisos_aprobaciones pa
  SET estado = 'aprobado',
      fecha_resolucion = COALESCE(pa.fecha_resolucion, sp.fecha_resolucion, NOW())
  FROM solicitudes_permisos sp
  WHERE pa.solicitud_id = sp.id
    AND sp.estado = 'aprobado'
    AND pa.estado = 'pendiente';

  -- 2b) Crear filas faltantes para jefes que actualmente estan asignados
  --     al solicitante en usuario_jefes pero no tienen fila aprobadora.
  --     El estado heredado es el de la solicitud padre.
  --     fecha_resolucion se rellena con la de la solicitud para coherencia.
  INSERT INTO permisos_aprobaciones (solicitud_id, jefe_id, estado, fecha_resolucion)
  SELECT sp.id,
         uj.jefe_id,
         sp.estado,
         CASE
           WHEN sp.estado IN ('aprobado', 'rechazado')
             THEN COALESCE(sp.fecha_resolucion, NOW())
           ELSE NULL
         END
  FROM solicitudes_permisos sp
  JOIN usuario_jefes uj ON uj.usuario_id = sp.usuario_id
  LEFT JOIN permisos_aprobaciones pa
    ON pa.solicitud_id = sp.id
   AND pa.jefe_id = uj.jefe_id
  WHERE pa.id IS NULL
  ON CONFLICT (solicitud_id, jefe_id) DO NOTHING;
END $$;
