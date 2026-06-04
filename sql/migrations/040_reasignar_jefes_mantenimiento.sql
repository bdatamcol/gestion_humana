-- =============================================================================
-- SCRIPT: Reasignación Masiva de Jefes y Limpieza de Relaciones Huérfanas
-- =============================================================================
-- Este script proporciona utilidades para:
-- 1. Identificar relaciones de usuario_jefes donde el jefe está inactivo
-- 2. Limpiar relaciones inválidas (jefe inactivo)
-- 3. Reasignar subordinados de un jefe a otro
-- =============================================================================

-- =============================================================================
-- SECCIÓN 1: VERIFICACIÓN DE ESTRUCTURA EXISTENTE
-- =============================================================================

-- Verificar que existe la tabla usuario_jefes
SELECT 'Verificando tabla usuario_jefes...' AS estado;
SELECT COUNT(*) AS total_relaciones FROM usuario_jefes;

-- Verificar que existe el campo estado en usuario_nomina
SELECT 'Verificando campo estado en usuario_nomina...' AS estado;
SELECT COUNT(*) AS usuarios_activos FROM usuario_nomina WHERE estado = 'activo';
SELECT COUNT(*) AS usuarios_inactivos FROM usuario_nomina WHERE estado = 'inactivo';

-- =============================================================================
-- SECCIÓN 2: IDENTIFICAR RELACIONES HUÉRFANAS (JEFE INACTIVO)
-- =============================================================================

-- Muestra todas las relaciones donde el jefe está inactivo
-- Estas relaciones deberían limpiarse o reasignarse
SELECT 
    uj.usuario_id,
    un_usuario.colaborador AS nombre_usuario,
    uj.jefe_id,
    un_jefe.colaborador AS nombre_jefe,
    un_jefe.estado AS estado_jefe
FROM usuario_jefes uj
INNER JOIN usuario_nomina un_usuario ON un_usuario.auth_user_id = uj.usuario_id
INNER JOIN usuario_nomina un_jefe ON un_jefe.auth_user_id = uj.jefe_id
WHERE un_jefe.estado = 'inactivo'
ORDER BY un_jefe.colaborador, un_usuario.colaborador;

-- Contador de relaciones huérfanas
SELECT 
    COUNT(*) AS total_relaciones_huérfanas,
    COUNT(DISTINCT uj.jefe_id) AS chiefs_inactivos_con_subordinados
FROM usuario_jefes uj
INNER JOIN usuario_nomina un_jefe ON un_jefe.auth_user_id = uj.jefe_id
WHERE un_jefe.estado = 'inactivo';

-- =============================================================================
-- SECCIÓN 3: LIMPIEZA DE RELACIONES HUÉRFANAS (JEFE INACTIVO)
-- =============================================================================

-- OPCIÓN A: Eliminar directamente las relaciones con chiefs inactivos
-- ADVERTENCIA: Esta acción es irreversible. Los subordinados quedarán sin jefe.

-- Primero: ver qué se va a eliminar (sin ejecutar la eliminación)
SELECT 
    uj.usuario_id,
    un_usuario.colaborador AS nombre_usuario,
    uj.jefe_id,
    un_jefe.colaborador AS nombre_jefe_inactivo
FROM usuario_jefes uj
INNER JOIN usuario_nomina un_usuario ON un_usuario.auth_user_id = uj.usuario_id
INNER JOIN usuario_nomina un_jefe ON un_jefe.auth_user_id = uj.jefe_id
WHERE un_jefe.estado = 'inactivo';

-- Para ejecutar la eliminación, descomenta la siguiente línea:
-- DELETE FROM usuario_jefes
-- WHERE jefe_id IN (
--     SELECT auth_user_id FROM usuario_nomina WHERE estado = 'inactivo'
-- );

-- =============================================================================
-- SECCIÓN 4: PREVIEW DE SUBORDINADOS DE UN JEFE (PARA REASIGNACIÓN)
-- =============================================================================

-- Reemplaza ':jefe_id' con el UUID del jefe origen
-- Este query muestra cuántos subordinados activos tiene un jefe

-- SELECT 
--     uj.usuario_id,
--     un.colaborador AS nombre_subordinado,
--     un.estado
-- FROM usuario_jefes uj
-- INNER JOIN usuario_nomina un ON un.auth_user_id = uj.usuario_id
-- WHERE uj.jefe_id = ':jefe_id' AND un.estado = 'activo';

-- =============================================================================
-- SECCIÓN 5: REASIGNACIÓN MASIVA (EJEMPLO MANUAL)
-- =============================================================================

-- Ejemplo de cómo reasignar subordinados de un jefe X a un jefe Y
-- Reemplaza los valores según sea necesario

-- Paso 1: Verificar que ambos chiefs existen y están activos
-- SELECT auth_user_id, colaborador, estado 
-- FROM usuario_nomina 
-- WHERE auth_user_id IN ('uuid_jefe_origen', 'uuid_jefe_destino');

-- Paso 2: Insertar nuevas relaciones con el jefe destino
-- INSERT INTO usuario_jefes (usuario_id, jefe_id, created_at)
-- SELECT usuario_id, 'uuid_jefe_destino', NOW()
-- FROM usuario_jefes
-- WHERE jefe_id = 'uuid_jefe_origen'
-- AND usuario_id IN (
--     SELECT auth_user_id FROM usuario_nomina WHERE estado = 'activo'
-- )
-- ON CONFLICT (usuario_id, jefe_id) DO NOTHING;

-- Paso 3: Eliminar relaciones con el jefe origen
-- DELETE FROM usuario_jefes
-- WHERE jefe_id = 'uuid_jefe_origen'
-- AND usuario_id IN (
--     SELECT auth_user_id FROM usuario_nomina WHERE estado = 'activo'
-- );

-- =============================================================================
-- SECCIÓN 6: FUNCIONES ÚTILES DE MANTENIMIENTO
-- =============================================================================

-- Función para obtener subordinados activos de un jefe
-- Uso: SELECT * FROM get_subordinados_activos('uuid_del_jefe');

-- CREATE OR REPLACE FUNCTION get_subordinados_activos(p_jefe_id UUID)
-- RETURNS TABLE (usuario_id UUID, colaborador TEXT, estado TEXT) AS $$
-- BEGIN
--     RETURN QUERY
--     SELECT un.auth_user_id, un.colaborador, un.estado
--     FROM usuario_jefes uj
--     INNER JOIN usuario_nomina un ON un.auth_user_id = uj.usuario_id
--     WHERE uj.jefe_id = p_jefe_id AND un.estado = 'activo';
-- END;
-- $$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- SECCIÓN 7: REPORTES
-- =============================================================================

-- Resumen de chiefs y su cantidad de subordinados activos
SELECT 
    un.auth_user_id,
    un.colaborador AS nombre_jefe,
    un.estado AS estado_jefe,
    COUNT(uj.usuario_id) AS total_subordinados,
    COUNT(CASE WHEN un_sub.estado = 'activo' THEN 1 END) AS subordinados_activos,
    COUNT(CASE WHEN un_sub.estado = 'inactivo' THEN 1 END) AS subordinados_inactivos
FROM usuario_nomina un
LEFT JOIN usuario_jefes uj ON uj.jefe_id = un.auth_user_id
LEFT JOIN usuario_nomina un_sub ON un_sub.auth_user_id = uj.usuario_id
WHERE un.rol IN ('jefe', 'administrador')
GROUP BY un.auth_user_id, un.colaborador, un.estado
ORDER BY subordinados_activos DESC;

-- =============================================================================
-- NOTAS:
-- =============================================================================
-- 1. La aplicación web (React/Next.js) maneja la reasignación masiva 
--    automáticamente a través del endpoint API:
--    POST /api/administracion/usuarios/reasignar-jefes
--
-- 2. Este script SQL es para verificación manual y mantenimiento
--
-- 3. Las relaciones con chiefs inactivos NO se eliminan automáticamente
--    por la base de datos; la aplicación filtra estos casos al mostrar
--    los nombres de chiefs
--
-- 4. Para una limpieza completa, ejecutar la sección 3 después de
--    hacer backup de los datos
-- =============================================================================
