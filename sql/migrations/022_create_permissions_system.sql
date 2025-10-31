-- Fecha: $(date)
-- Descripción: Crear sistema de permisos granulares para usuarios

-- 1. Actualizar el enum de roles (solo usuario y administrador)
ALTER TABLE usuario_nomina 
DROP CONSTRAINT IF EXISTS usuario_nomina_rol_check;

ALTER TABLE usuario_nomina 
ADD CONSTRAINT usuario_nomina_rol_check 
CHECK (rol IN ('usuario', 'administrador'));

-- 2. Crear tabla de módulos del sistema
CREATE TABLE IF NOT EXISTS modulos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT,
    ruta VARCHAR(200) NOT NULL,
    icono VARCHAR(50),
    orden INTEGER DEFAULT 0,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Crear tabla de permisos de usuario por módulo
CREATE TABLE IF NOT EXISTS usuario_permisos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL,
    modulo_id UUID NOT NULL REFERENCES modulos(id) ON DELETE CASCADE,
    puede_ver BOOLEAN DEFAULT false,
    puede_crear BOOLEAN DEFAULT false,
    puede_editar BOOLEAN DEFAULT false,
    puede_eliminar BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(usuario_id, modulo_id)
);

-- 4. Agregar foreign key para usuario_id (referencia a usuario_nomina)
ALTER TABLE usuario_permisos 
ADD CONSTRAINT fk_usuario_permisos_usuario 
FOREIGN KEY (usuario_id) REFERENCES usuario_nomina(auth_user_id) ON DELETE CASCADE;

-- 5. Crear índices para mejorar performance
CREATE INDEX idx_usuario_permisos_usuario_id ON usuario_permisos(usuario_id);
CREATE INDEX idx_usuario_permisos_modulo_id ON usuario_permisos(modulo_id);
CREATE INDEX idx_modulos_activo ON modulos(activo);
CREATE INDEX idx_modulos_orden ON modulos(orden);

-- 6. Insertar módulos del sistema
INSERT INTO modulos (nombre, descripcion, ruta, icono, orden) VALUES
('escritorio', 'Panel principal de administración', '/administracion', 'Home', 1),
('usuarios', 'Gestión de usuarios del sistema', '/administracion/usuarios', 'User', 2),
('cargos', 'Gestión de cargos de la empresa', '/administracion/usuarios/cargos', 'FileText', 3),
('solicitudes', 'Gestión de solicitudes', '/administracion/solicitudes', 'FileText', 4),
('comunicados', 'Gestión de comunicados', '/administracion/comunicados', 'Newspaper', 5),
('novedades', 'Gestión de novedades', '/administracion/novedades', 'FaFileAlt', 6),
('perfil', 'Gestión del perfil personal', '/administracion/perfil', 'Info', 7);

-- 7. Crear función para asignar permisos completos a administradores
CREATE OR REPLACE FUNCTION asignar_permisos_administrador()
RETURNS TRIGGER AS $$
BEGIN
    -- Si el usuario es administrador, asignar todos los permisos
    IF NEW.rol = 'administrador' THEN
        INSERT INTO usuario_permisos (usuario_id, modulo_id, puede_ver, puede_crear, puede_editar, puede_eliminar)
        SELECT NEW.auth_user_id, m.id, true, true, true, true
        FROM modulos m
        WHERE m.activo = true
        ON CONFLICT (usuario_id, modulo_id) 
        DO UPDATE SET 
            puede_ver = true,
            puede_crear = true,
            puede_editar = true,
            puede_eliminar = true,
            updated_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Crear trigger para asignar permisos automáticamente a administradores
CREATE TRIGGER trigger_asignar_permisos_administrador
    AFTER INSERT OR UPDATE OF rol ON usuario_nomina
    FOR EACH ROW
    EXECUTE FUNCTION asignar_permisos_administrador();

-- 9. Asignar permisos a todos los administradores existentes
INSERT INTO usuario_permisos (usuario_id, modulo_id, puede_ver, puede_crear, puede_editar, puede_eliminar)
SELECT u.auth_user_id, m.id, true, true, true, true
FROM usuario_nomina u
CROSS JOIN modulos m
WHERE u.rol = 'administrador' AND m.activo = true
ON CONFLICT (usuario_id, modulo_id) DO NOTHING;

-- 10. Crear función para limpiar permisos cuando un usuario deja de ser administrador
CREATE OR REPLACE FUNCTION limpiar_permisos_no_admin()
RETURNS TRIGGER AS $$
BEGIN
    -- Si el usuario ya no es administrador, eliminar sus permisos
    IF OLD.rol = 'administrador' AND NEW.rol = 'usuario' THEN
        DELETE FROM usuario_permisos WHERE usuario_id = NEW.auth_user_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 11. Crear trigger para limpiar permisos
CREATE TRIGGER trigger_limpiar_permisos_no_admin
    AFTER UPDATE OF rol ON usuario_nomina
    FOR EACH ROW
    EXECUTE FUNCTION limpiar_permisos_no_admin();

-- 12. Comentarios descriptivos
COMMENT ON TABLE modulos IS 'Módulos del sistema disponibles para asignar permisos';
COMMENT ON TABLE usuario_permisos IS 'Permisos específicos de usuarios por módulo';
COMMENT ON COLUMN usuario_permisos.puede_ver IS 'Permiso para ver/acceder al módulo';
COMMENT ON COLUMN usuario_permisos.puede_crear IS 'Permiso para crear elementos en el módulo';
COMMENT ON COLUMN usuario_permisos.puede_editar IS 'Permiso para editar elementos en el módulo';
COMMENT ON COLUMN usuario_permisos.puede_eliminar IS 'Permiso para eliminar elementos en el módulo';

COMMIT;
