-- Sistema completo de notificaciones automáticas
-- Ejecutar este script en el SQL Editor de Supabase

-- 1. Función principal para crear notificaciones
CREATE OR REPLACE FUNCTION crear_notificacion_solicitud(
  p_usuario_id UUID,
  p_tipo_solicitud TEXT,
  p_solicitud_id UUID
)
RETURNS void AS $$
DECLARE
    admin_record RECORD;
    usuario_nombre TEXT;
    titulo_notificacion TEXT;
    mensaje_notificacion TEXT;
BEGIN
    -- Obtener el nombre del usuario que hizo la solicitud
    SELECT colaborador INTO usuario_nombre
    FROM usuario_nomina
    WHERE auth_user_id = p_usuario_id;
    
    -- Si no se encuentra el nombre, usar un valor por defecto
    IF usuario_nombre IS NULL THEN
        usuario_nombre := 'Usuario';
    END IF;
    
    -- Determinar el tipo de notificación
    CASE p_tipo_solicitud
        WHEN 'certificacion' THEN
            titulo_notificacion := 'Nueva solicitud de certificación laboral';
            mensaje_notificacion := 'Tienes una nueva solicitud de certificación laboral de ' || usuario_nombre;
        WHEN 'vacaciones' THEN
            titulo_notificacion := 'Nueva solicitud de vacaciones';
            mensaje_notificacion := 'Tienes una nueva solicitud de vacaciones de ' || usuario_nombre;
        WHEN 'permisos' THEN
            titulo_notificacion := 'Nueva solicitud de permiso';
            mensaje_notificacion := 'Tienes una nueva solicitud de permiso de ' || usuario_nombre;
        WHEN 'incapacidades' THEN
            titulo_notificacion := 'Nueva solicitud de incapacidad';
            mensaje_notificacion := 'Tienes una nueva solicitud de incapacidad de ' || usuario_nombre;
        ELSE
            titulo_notificacion := 'Nueva solicitud';
            mensaje_notificacion := 'Tienes una nueva solicitud de ' || usuario_nombre;
    END CASE;
    
    -- Crear notificaciones para todos los administradores y moderadores
    FOR admin_record IN 
        SELECT auth_user_id 
        FROM usuario_nomina 
        WHERE rol IN ('administrador', 'moderador')
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
            CASE p_tipo_solicitud
                WHEN 'certificacion' THEN 'certificacion_laboral'
                WHEN 'vacaciones' THEN 'vacaciones'
                WHEN 'permisos' THEN 'permisos'
                WHEN 'incapacidades' THEN 'incapacidades'
                ELSE 'general'
            END,
            titulo_notificacion,
            mensaje_notificacion,
            p_solicitud_id,
            false
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Trigger para solicitudes de certificación
CREATE OR REPLACE FUNCTION trigger_notificar_certificacion()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM crear_notificacion_solicitud(NEW.usuario_id, 'certificacion', NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notificar_certificacion ON solicitudes_certificacion;
CREATE TRIGGER trigger_notificar_certificacion
    AFTER INSERT ON solicitudes_certificacion
    FOR EACH ROW
    EXECUTE FUNCTION trigger_notificar_certificacion();

-- 3. Trigger para solicitudes de vacaciones
CREATE OR REPLACE FUNCTION trigger_notificar_vacaciones()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM crear_notificacion_solicitud(NEW.usuario_id, 'vacaciones', NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notificar_vacaciones ON solicitudes_vacaciones;
CREATE TRIGGER trigger_notificar_vacaciones
    AFTER INSERT ON solicitudes_vacaciones
    FOR EACH ROW
    EXECUTE FUNCTION trigger_notificar_vacaciones();

-- 4. Trigger para solicitudes de permisos
CREATE OR REPLACE FUNCTION trigger_notificar_permisos()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM crear_notificacion_solicitud(NEW.usuario_id, 'permisos', NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notificar_permisos ON solicitudes_permisos;
CREATE TRIGGER trigger_notificar_permisos
    AFTER INSERT ON solicitudes_permisos
    FOR EACH ROW
    EXECUTE FUNCTION trigger_notificar_permisos();

-- 5. Trigger para incapacidades
CREATE OR REPLACE FUNCTION trigger_notificar_incapacidades()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM crear_notificacion_solicitud(NEW.usuario_id, 'incapacidades', NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notificar_incapacidades ON incapacidades;
CREATE TRIGGER trigger_notificar_incapacidades
    AFTER INSERT ON incapacidades
    FOR EACH ROW
    EXECUTE FUNCTION trigger_notificar_incapacidades();

-- 6. Función de prueba manual
CREATE OR REPLACE FUNCTION probar_notificaciones_manual(
  p_usuario_id UUID
)
RETURNS TABLE(notificaciones_creadas INTEGER) AS $$
DECLARE
    solicitud_id UUID;
    count_before INTEGER;
    count_after INTEGER;
BEGIN
    -- Contar notificaciones antes
    SELECT COUNT(*) INTO count_before FROM notificaciones WHERE tipo = 'certificacion_laboral';
    
    -- Crear una solicitud de prueba
    INSERT INTO solicitudes_certificacion (usuario_id, dirigido_a, ciudad)
    VALUES (p_usuario_id, 'Prueba Manual', 'Bogotá')
    RETURNING id INTO solicitud_id;
    
    -- Llamar manualmente a la función de notificación
    PERFORM crear_notificacion_solicitud(p_usuario_id, 'certificacion', solicitud_id);
    
    -- Contar notificaciones después
    SELECT COUNT(*) INTO count_after FROM notificaciones WHERE tipo = 'certificacion_laboral';
    
    -- Limpiar
    DELETE FROM notificaciones WHERE solicitud_id = solicitud_id;
    DELETE FROM solicitudes_certificacion WHERE id = solicitud_id;
    
    -- Retornar el número de notificaciones creadas
    RETURN QUERY SELECT (count_after - count_before);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Comentarios
COMMENT ON FUNCTION crear_notificacion_solicitud(UUID, TEXT, UUID) IS 'Función principal que crea notificaciones automáticas para administradores cuando se registra una nueva solicitud';
COMMENT ON FUNCTION probar_notificaciones_manual(UUID) IS 'Función de prueba para verificar que el sistema de notificaciones funciona correctamente';

-- 8. Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE '✅ Sistema de notificaciones automáticas configurado exitosamente';
    RAISE NOTICE '📧 Los triggers crearán notificaciones automáticamente para:';
    RAISE NOTICE '   - Solicitudes de certificación laboral';
    RAISE NOTICE '   - Solicitudes de vacaciones';
    RAISE NOTICE '   - Solicitudes de permisos';
    RAISE NOTICE '   - Solicitudes de incapacidades';
    RAISE NOTICE '🧪 Para probar el sistema, ejecuta: SELECT * FROM probar_notificaciones_manual(''UUID_DE_USUARIO'');';
END $$;
