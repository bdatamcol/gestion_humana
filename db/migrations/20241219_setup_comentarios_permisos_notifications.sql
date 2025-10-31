-- =====================================================
-- CONFIGURACIÓN DE NOTIFICACIONES PARA COMENTARIOS DE PERMISOS
-- Fecha: 2024-12-19
-- Descripción: Configurar RLS y triggers de notificaciones para comentarios_permisos
-- =====================================================

-- =====================================================
-- CONFIGURACIÓN DE RLS PARA COMENTARIOS_PERMISOS
-- =====================================================

-- Habilitar RLS en la tabla comentarios_permisos
ALTER TABLE comentarios_permisos ENABLE ROW LEVEL SECURITY;

-- Política para ver comentarios (todos los usuarios autenticados pueden ver comentarios de solicitudes)
CREATE POLICY "Usuarios pueden ver comentarios de permisos"
  ON comentarios_permisos
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Política para crear comentarios (usuarios autenticados pueden crear comentarios)
CREATE POLICY "Usuarios pueden crear comentarios de permisos"
  ON comentarios_permisos
  FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

-- Política para actualizar comentarios (solo el autor puede actualizar sus comentarios)
CREATE POLICY "Usuarios pueden actualizar sus comentarios de permisos"
  ON comentarios_permisos
  FOR UPDATE
  USING (auth.uid() = usuario_id)
  WITH CHECK (auth.uid() = usuario_id);

-- Política para eliminar comentarios (solo el autor o administradores pueden eliminar)
CREATE POLICY "Usuarios pueden eliminar sus comentarios de permisos"
  ON comentarios_permisos
  FOR DELETE
  USING (
    auth.uid() = usuario_id OR
    auth.uid() IN (
      SELECT auth_user_id FROM usuario_nomina WHERE rol IN ('administrador', 'moderador')
    )
  );

-- =====================================================
-- FUNCIÓN PARA CREAR NOTIFICACIONES DE COMENTARIOS
-- =====================================================

CREATE OR REPLACE FUNCTION crear_notificacion_comentario_permisos()
RETURNS TRIGGER AS $$
DECLARE
    solicitud_record RECORD;
    usuario_comentario_nombre TEXT;
    usuario_solicitud_id UUID;
    admin_record RECORD;
    titulo_notificacion TEXT;
    mensaje_notificacion TEXT;
BEGIN
    -- Obtener información de la solicitud de permisos
    SELECT sp.usuario_id, un.colaborador as nombre_solicitante
    INTO solicitud_record
    FROM solicitudes_permisos sp
    JOIN usuario_nomina un ON sp.usuario_id = un.auth_user_id
    WHERE sp.id = NEW.solicitud_id;
    
    -- Obtener el nombre del usuario que comentó
    SELECT colaborador INTO usuario_comentario_nombre
    FROM usuario_nomina
    WHERE auth_user_id = NEW.usuario_id;
    
    -- Si no se encuentra el nombre, usar un valor por defecto
    IF usuario_comentario_nombre IS NULL THEN
        usuario_comentario_nombre := 'Usuario';
    END IF;
    
    -- Determinar el tipo de notificación y destinatarios
    IF NEW.respuesta_a IS NOT NULL THEN
        -- Es una respuesta a un comentario existente
        titulo_notificacion := 'Nueva respuesta en permisos';
        mensaje_notificacion := usuario_comentario_nombre || ' respondió a un comentario en tu solicitud de permisos';
        
        -- Notificar al dueño de la solicitud (si no es quien comentó)
        IF solicitud_record.usuario_id != NEW.usuario_id THEN
            INSERT INTO notificaciones (
                usuario_id,
                tipo,
                titulo,
                mensaje,
                solicitud_id,
                leida
            ) VALUES (
                solicitud_record.usuario_id,
                'comentario_permisos',
                titulo_notificacion,
                mensaje_notificacion,
                NEW.solicitud_id,
                FALSE
            );
        END IF;
        
        -- Notificar al autor del comentario original (si es diferente)
        DECLARE
            autor_comentario_original UUID;
        BEGIN
            SELECT usuario_id INTO autor_comentario_original
            FROM comentarios_permisos
            WHERE id = NEW.respuesta_a;
            
            IF autor_comentario_original IS NOT NULL 
               AND autor_comentario_original != NEW.usuario_id 
               AND autor_comentario_original != solicitud_record.usuario_id THEN
                INSERT INTO notificaciones (
                    usuario_id,
                    tipo,
                    titulo,
                    mensaje,
                    solicitud_id,
                    leida
                ) VALUES (
                    autor_comentario_original,
                    'comentario_permisos',
                    'Respuesta a tu comentario',
                    usuario_comentario_nombre || ' respondió a tu comentario en una solicitud de permisos',
                    NEW.solicitud_id,
                    FALSE
                );
            END IF;
        END;
    ELSE
        -- Es un comentario nuevo (no una respuesta)
        titulo_notificacion := 'Nuevo comentario en permisos';
        mensaje_notificacion := usuario_comentario_nombre || ' comentó en una solicitud de permisos';
        
        -- Notificar al dueño de la solicitud (si no es quien comentó)
        IF solicitud_record.usuario_id != NEW.usuario_id THEN
            INSERT INTO notificaciones (
                usuario_id,
                tipo,
                titulo,
                mensaje,
                solicitud_id,
                leida
            ) VALUES (
                solicitud_record.usuario_id,
                'comentario_permisos',
                titulo_notificacion,
                mensaje_notificacion,
                NEW.solicitud_id,
                FALSE
            );
        END IF;
        
        -- Notificar a administradores y moderadores (si no son quienes comentaron)
        FOR admin_record IN 
            SELECT auth_user_id 
            FROM usuario_nomina 
            WHERE rol IN ('administrador', 'moderador')
              AND auth_user_id != NEW.usuario_id
        LOOP
            INSERT INTO notificaciones (
                usuario_id,
                tipo,
                titulo,
                mensaje,
                solicitud_id,
                leida
            ) VALUES (
                admin_record.auth_user_id,
                'comentario_permisos',
                titulo_notificacion,
                mensaje_notificacion,
                NEW.solicitud_id,
                FALSE
            );
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGER PARA COMENTARIOS DE PERMISOS
-- =====================================================

DROP TRIGGER IF EXISTS trigger_notificar_comentario_permisos ON comentarios_permisos;
CREATE TRIGGER trigger_notificar_comentario_permisos
    AFTER INSERT ON comentarios_permisos
    FOR EACH ROW
    EXECUTE FUNCTION crear_notificacion_comentario_permisos();

-- =====================================================
-- VERIFICACIÓN
-- =====================================================

-- Verificar que las políticas se crearon correctamente
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies 
WHERE tablename = 'comentarios_permisos'
ORDER BY cmd, policyname;

-- Verificar que el trigger se creó correctamente
SELECT 
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'comentarios_permisos';
