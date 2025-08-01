-- Script para corregir el trigger de notificaciones de comentarios de incapacidades
-- Problema: El trigger usa 'fecha_creacion' pero la tabla notificaciones usa 'created_at'

-- 1. Eliminar el trigger existente
DROP TRIGGER IF EXISTS trigger_notificar_comentario_incapacidades ON comentarios_incapacidades;

-- 2. Eliminar la función existente
DROP FUNCTION IF EXISTS crear_notificacion_comentario_incapacidades();

-- 3. Crear la función corregida
CREATE OR REPLACE FUNCTION crear_notificacion_comentario_incapacidades()
RETURNS TRIGGER AS $$
DECLARE
  propietario_incapacidad UUID;
  autor_comentario_original UUID;
  nombre_usuario_comentario TEXT;
  mensaje_notificacion TEXT;
  admin_record RECORD;
BEGIN
  -- Obtener el propietario de la incapacidad
  SELECT usuario_id INTO propietario_incapacidad
  FROM incapacidades
  WHERE id = NEW.incapacidad_id;

  -- Obtener el nombre del usuario que hizo el comentario
  SELECT COALESCE(colaborador, correo_electronico) INTO nombre_usuario_comentario
  FROM usuario_nomina
  WHERE auth_user_id = NEW.usuario_id;

  -- Si es una respuesta a otro comentario
  IF NEW.respuesta_a IS NOT NULL THEN
    -- Obtener el autor del comentario original
    SELECT usuario_id INTO autor_comentario_original
    FROM comentarios_incapacidades
    WHERE id = NEW.respuesta_a;

    -- Notificar al autor del comentario original (si no es el mismo que responde)
    IF autor_comentario_original != NEW.usuario_id THEN
      mensaje_notificacion := nombre_usuario_comentario || ' respondió a tu comentario en una incapacidad';
      
      INSERT INTO notificaciones (usuario_id, tipo, titulo, mensaje, leida, created_at)
      VALUES (
        autor_comentario_original,
        'comentario_incapacidades',
        'Nueva respuesta a tu comentario',
        mensaje_notificacion,
        FALSE,
        NOW()
      );
    END IF;

    -- Notificar al propietario de la incapacidad (si no es el autor del comentario ni el que responde)
    IF propietario_incapacidad != NEW.usuario_id AND propietario_incapacidad != autor_comentario_original THEN
      mensaje_notificacion := nombre_usuario_comentario || ' respondió a un comentario en tu incapacidad';
      
      INSERT INTO notificaciones (usuario_id, tipo, titulo, mensaje, leida, created_at)
      VALUES (
        propietario_incapacidad,
        'comentario_incapacidades',
        'Nueva respuesta en tu incapacidad',
        mensaje_notificacion,
        FALSE,
        NOW()
      );
    END IF;
  ELSE
    -- Es un comentario nuevo (no una respuesta)
    -- Notificar al propietario de la incapacidad (si no es el mismo que comenta)
    IF propietario_incapacidad != NEW.usuario_id THEN
      mensaje_notificacion := nombre_usuario_comentario || ' comentó en tu incapacidad';
      
      INSERT INTO notificaciones (usuario_id, tipo, titulo, mensaje, leida, created_at)
      VALUES (
        propietario_incapacidad,
        'comentario_incapacidades',
        'Nuevo comentario en tu incapacidad',
        mensaje_notificacion,
        FALSE,
        NOW()
      );
    END IF;
  END IF;

  -- Notificar a administradores y moderadores (excepto al autor del comentario)
  FOR admin_record IN
    SELECT auth_user_id
    FROM usuario_nomina
    WHERE rol IN ('administrador', 'moderador')
      AND auth_user_id != NEW.usuario_id
      AND auth_user_id IS NOT NULL
  LOOP
    mensaje_notificacion := nombre_usuario_comentario || ' hizo un comentario en una incapacidad';
    
    INSERT INTO notificaciones (usuario_id, tipo, titulo, mensaje, leida, created_at)
    VALUES (
      admin_record.auth_user_id,
      'comentario_incapacidades',
      'Nuevo comentario en incapacidad',
      mensaje_notificacion,
      FALSE,
      NOW()
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Crear el trigger
CREATE TRIGGER trigger_notificar_comentario_incapacidades
  AFTER INSERT ON comentarios_incapacidades
  FOR EACH ROW
  EXECUTE FUNCTION crear_notificacion_comentario_incapacidades();

-- 5. Verificar que el trigger se creó correctamente
SELECT 
  trigger_name, 
  event_manipulation, 
  action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_notificar_comentario_incapacidades';

-- Mensaje de confirmación
SELECT 'Trigger de notificaciones de comentarios de incapacidades corregido exitosamente' as resultado;
