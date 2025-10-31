-- Crear extensión pg_cron si no existe (requiere permisos de superusuario)
-- Esta extensión permite ejecutar tareas programadas en PostgreSQL
-- Si no tienes permisos de superusuario, puedes usar la alternativa con triggers

-- OPCIÓN 1: Usando pg_cron (requiere permisos de superusuario)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Programar limpieza automática cada minuto
-- SELECT cron.schedule('cleanup-inactive-users', '* * * * *', 'SELECT cleanup_inactive_users();');

-- OPCIÓN 2: Alternativa sin pg_cron - Trigger automático en cada INSERT/UPDATE
-- Este trigger ejecutará la limpieza cada vez que se actualice un usuario

CREATE OR REPLACE FUNCTION trigger_cleanup_inactive_users()
RETURNS TRIGGER AS $$
BEGIN
  -- Ejecutar limpieza solo ocasionalmente para no sobrecargar
  -- Usar random() para ejecutar aproximadamente 1 de cada 10 veces
  IF random() < 0.1 THEN
    PERFORM cleanup_inactive_users();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger que se ejecuta después de INSERT o UPDATE
DROP TRIGGER IF EXISTS auto_cleanup_trigger ON online_users;
CREATE TRIGGER auto_cleanup_trigger
  AFTER INSERT OR UPDATE ON online_users
  FOR EACH ROW
  EXECUTE FUNCTION trigger_cleanup_inactive_users();

-- OPCIÓN 3: Función mejorada de limpieza con logging
CREATE OR REPLACE FUNCTION cleanup_inactive_users_with_log()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Eliminar usuarios inactivos (más de 2 minutos sin heartbeat)
  DELETE FROM online_users 
  WHERE last_seen_at < NOW() - INTERVAL '2 minutes';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Log solo si se eliminaron usuarios
  IF deleted_count > 0 THEN
    RAISE NOTICE 'Limpieza automática: % usuarios inactivos eliminados', deleted_count;
  END IF;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Actualizar el trigger para usar la nueva función con logging
CREATE OR REPLACE FUNCTION trigger_cleanup_inactive_users()
RETURNS TRIGGER AS $$
BEGIN
  -- Ejecutar limpieza solo ocasionalmente para no sobrecargar
  -- Usar random() para ejecutar aproximadamente 1 de cada 10 veces
  IF random() < 0.1 THEN
    PERFORM cleanup_inactive_users_with_log();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Comentarios sobre las opciones:
-- OPCIÓN 1 (pg_cron): Más eficiente, ejecuta cada minuto independientemente de la actividad
-- OPCIÓN 2 (trigger): No requiere permisos especiales, se ejecuta con la actividad de usuarios
-- OPCIÓN 3 (función con log): Proporciona información sobre las limpiezas realizadas

-- Para habilitar pg_cron en Supabase o sistemas con permisos limitados,
-- puedes usar la OPCIÓN 2 que ya está implementada arriba.
