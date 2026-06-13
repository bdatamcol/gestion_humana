-- 043_backfill_completo_permisos_aprobaciones.sql
-- Problema: el trigger crear_aprobaciones_jefes_permiso (migracion 036)
-- crea una fila en permisos_aprobaciones por cada jefe del solicitante
-- en usuario_jefes en el momento del INSERT de la solicitud. Si el
-- solicitante no tenia al jefe asignado en ese momento, o si la
-- asignacion/desasignacion ocurrio despues, la fila nunca se crea.
-- El panel del jefe muestra entonces "Sin asignacion" aunque el jefe
-- SI es aprobador del solicitante.
--
-- Solucion: backfill idempotente que para cada solicitud de permiso
-- garantiza que existe una fila en permisos_aprobaciones por cada jefe
-- actualmente asignado al solicitante en usuario_jefes. Si la fila no
-- existe, se crea heredando el estado de la solicitud padre
-- ('pendiente' para solicitudes activas, 'aprobado'/'rechazado' para
-- las ya resueltas, con fecha_resolucion coherente).
--
-- Mismo patron de session_replication_role = replica de la migracion
-- 041 para esquivar la validacion defensiva de la migracion 039
-- (validar_transicion_permisos_aprobaciones) cuando la solicitud
-- padre no esta 'pendiente'.
--
-- Idempotente: se puede re-ejecutar sin duplicar filas gracias a
-- LEFT JOIN + ON CONFLICT (solicitud_id, jefe_id) DO NOTHING.

DO $$
BEGIN
  SET LOCAL session_replication_role = replica;

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
