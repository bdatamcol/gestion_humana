-- Configuración de notificaciones para comentarios de incapacidades

-- Políticas RLS para comentarios_incapacidades

-- Política para ver comentarios (usuarios pueden ver comentarios de sus propias incapacidades y administradores pueden ver todos)
CREATE POLICY "Ver comentarios de incapacidades" ON comentarios_incapacidades
  FOR SELECT USING (
    -- El usuario puede ver comentarios de sus propias incapacidades
    incapacidad_id IN (
      SELECT id FROM incapacidades WHERE usuario_id = auth.uid()
    )
    OR
    -- Los administradores pueden ver todos los comentarios
    auth.uid() IN (
      SELECT auth_user_id FROM usuario_nomina WHERE rol = 'administrador'
    )
  );

-- Política para insertar comentarios (usuarios autenticados pueden comentar en incapacidades que pueden ver)
CREATE POLICY "Insertar comentarios de incapacidades" ON comentarios_incapacidades
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND
    (
      -- El usuario puede comentar en sus propias incapacidades
      incapacidad_id IN (
        SELECT id FROM incapacidades WHERE usuario_id = auth.uid()
      )
      OR
      -- Los administradores pueden comentar en cualquier incapacidad
      auth.uid() IN (
        SELECT auth_user_id FROM usuario_nomina WHERE rol = 'administrador'
      )
    )
  );

-- Política para actualizar comentarios (solo el autor puede actualizar sus comentarios)
CREATE POLICY "Actualizar comentarios de incapacidades" ON comentarios_incapacidades
  FOR UPDATE USING (
    usuario_id = auth.uid()
    OR
    auth.uid() IN (
      SELECT auth_user_id FROM usuario_nomina WHERE rol = 'administrador'
    )
  );

-- Política para eliminar comentarios (solo el autor puede eliminar sus comentarios)
CREATE POLICY "Eliminar comentarios de incapacidades" ON comentarios_incapacidades
  FOR DELETE USING (
    usuario_id = auth.uid()
    OR
    auth.uid() IN (
      SELECT auth_user_id FROM usuario_nomina WHERE rol = 'administrador'
    )
  );

-- Habilitar RLS
ALTER TABLE comentarios_incapacidades ENABLE ROW LEVEL SECURITY;

-- Función para crear notificaciones de comentarios de incapacidades
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
      
      INSERT INTO notificaciones (usuario_id, tipo, titulo, mensaje, leida, fecha_creacion)
      VALUES (
        autor_comentario_original,
        'comentario_incapacidades',
        'Nueva respuesta a tu comentario',
        mensaje_notificacion,
        FALSE,
        NOW()
      );
    END IF;

    -- Notificar al propietario de la incapacidad (si no es el autor del comentario original ni quien responde)
    IF propietario_incapacidad != NEW.usuario_id AND propietario_incapacidad != autor_comentario_original THEN
      mensaje_notificacion := nombre_usuario_comentario || ' respondió a un comentario en tu incapacidad';
      
      INSERT INTO notificaciones (usuario_id, tipo, titulo, mensaje, leida, fecha_creacion)
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
    
    -- Notificar al propietario de la incapacidad (si no es quien comenta)
    IF propietario_incapacidad != NEW.usuario_id THEN
      mensaje_notificacion := nombre_usuario_comentario || ' comentó en tu incapacidad';
      
      INSERT INTO notificaciones (usuario_id, tipo, titulo, mensaje, leida, fecha_creacion)
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

  -- Notificar a todos los administradores y moderadores (excepto quien hizo el comentario)
  FOR admin_record IN
    SELECT auth_user_id
    FROM usuario_nomina
    WHERE rol IN ('administrador', 'moderador')
    AND auth_user_id != NEW.usuario_id
  LOOP
    IF NEW.respuesta_a IS NOT NULL THEN
      mensaje_notificacion := nombre_usuario_comentario || ' respondió a un comentario en una incapacidad';
    ELSE
      mensaje_notificacion := nombre_usuario_comentario || ' comentó en una incapacidad';
    END IF;
    
    INSERT INTO notificaciones (usuario_id, tipo, titulo, mensaje, leida, fecha_creacion)
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

-- Crear el trigger
DROP TRIGGER IF EXISTS trigger_notificar_comentario_incapacidades ON comentarios_incapacidades;
CREATE TRIGGER trigger_notificar_comentario_incapacidades
  AFTER INSERT ON comentarios_incapacidades
  FOR EACH ROW
  EXECUTE FUNCTION crear_notificacion_comentario_incapacidades();

-- Verificar que el trigger se creó correctamente
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_timing,
  action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_notificar_comentario_incapacidades';
