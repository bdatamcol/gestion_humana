-- Crear función para notificar automáticamente a administradores sobre nuevas solicitudes
CREATE OR REPLACE FUNCTION notificar_nueva_solicitud()
RETURNS TRIGGER AS $$
DECLARE
    admin_record RECORD;
    usuario_nombre TEXT;
    titulo_notificacion TEXT;
    mensaje_notificacion TEXT;
BEGIN
    -- Obtener el nombre del usuario que hizo la solicitud
    SELECT colaborador INTO usuario_nombre
    FROM usuario_nomina
    WHERE auth_user_id = NEW.usuario_id;
    
    -- Si no se encuentra el nombre, usar un valor por defecto
    IF usuario_nombre IS NULL THEN
        usuario_nombre := 'Usuario';
    END IF;
    
    -- Determinar el tipo de notificación según la tabla
    IF TG_TABLE_NAME = 'solicitudes_certificacion' THEN
        titulo_notificacion := 'Nueva solicitud de certificación laboral';
        mensaje_notificacion := 'Tienes una nueva solicitud de certificación laboral de ' || usuario_nombre;
    ELSIF TG_TABLE_NAME = 'solicitudes_vacaciones' THEN
        titulo_notificacion := 'Nueva solicitud de vacaciones';
        mensaje_notificacion := 'Tienes una nueva solicitud de vacaciones de ' || usuario_nombre;
    ELSIF TG_TABLE_NAME = 'solicitudes_permisos' THEN
        titulo_notificacion := 'Nueva solicitud de permiso';
        mensaje_notificacion := 'Tienes una nueva solicitud de permiso de ' || usuario_nombre;
    ELSIF TG_TABLE_NAME = 'incapacidades' THEN
        titulo_notificacion := 'Nueva solicitud de incapacidad';
        mensaje_notificacion := 'Tienes una nueva solicitud de incapacidad de ' || usuario_nombre;
    ELSE
        titulo_notificacion := 'Nueva solicitud';
        mensaje_notificacion := 'Tienes una nueva solicitud de ' || usuario_nombre;
    END IF;
    
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
            CASE 
                WHEN TG_TABLE_NAME = 'solicitudes_certificacion' THEN 'certificacion_laboral'
                WHEN TG_TABLE_NAME = 'solicitudes_vacaciones' THEN 'vacaciones'
                WHEN TG_TABLE_NAME = 'solicitudes_permisos' THEN 'permisos'
                WHEN TG_TABLE_NAME = 'incapacidades' THEN 'incapacidades'
                ELSE 'general'
            END,
            titulo_notificacion,
            mensaje_notificacion,
            NEW.id,
            false
        );
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear triggers para cada tabla de solicitudes

-- Trigger para solicitudes de certificación laboral
DROP TRIGGER IF EXISTS trigger_notificar_certificacion ON solicitudes_certificacion;
CREATE TRIGGER trigger_notificar_certificacion
    AFTER INSERT ON solicitudes_certificacion
    FOR EACH ROW
    EXECUTE FUNCTION notificar_nueva_solicitud();

-- Trigger para solicitudes de vacaciones
DROP TRIGGER IF EXISTS trigger_notificar_vacaciones ON solicitudes_vacaciones;
CREATE TRIGGER trigger_notificar_vacaciones
    AFTER INSERT ON solicitudes_vacaciones
    FOR EACH ROW
    EXECUTE FUNCTION notificar_nueva_solicitud();

-- Trigger para solicitudes de permisos
DROP TRIGGER IF EXISTS trigger_notificar_permisos ON solicitudes_permisos;
CREATE TRIGGER trigger_notificar_permisos
    AFTER INSERT ON solicitudes_permisos
    FOR EACH ROW
    EXECUTE FUNCTION notificar_nueva_solicitud();

-- Trigger para incapacidades
DROP TRIGGER IF EXISTS trigger_notificar_incapacidades ON incapacidades;
CREATE TRIGGER trigger_notificar_incapacidades
    AFTER INSERT ON incapacidades
    FOR EACH ROW
    EXECUTE FUNCTION notificar_nueva_solicitud();

-- Comentarios
COMMENT ON FUNCTION notificar_nueva_solicitud() IS 'Función que crea automáticamente notificaciones para administradores cuando se registra una nueva solicitud';
COMMENT ON TRIGGER trigger_notificar_certificacion ON solicitudes_certificacion IS 'Trigger que notifica automáticamente sobre nuevas solicitudes de certificación laboral';
COMMENT ON TRIGGER trigger_notificar_vacaciones ON solicitudes_vacaciones IS 'Trigger que notifica automáticamente sobre nuevas solicitudes de vacaciones';
COMMENT ON TRIGGER trigger_notificar_permisos ON solicitudes_permisos IS 'Trigger que notifica automáticamente sobre nuevas solicitudes de permisos';
COMMENT ON TRIGGER trigger_notificar_incapacidades ON incapacidades IS 'Trigger que notifica automáticamente sobre nuevas solicitudes de incapacidades';
