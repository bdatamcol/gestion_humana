-- Corregir políticas RLS para notificaciones
-- Fecha: 2024-12-19
-- Descripción: Permitir que los triggers puedan crear notificaciones

-- Eliminar la política restrictiva actual
DROP POLICY IF EXISTS "Permitir crear notificaciones" ON notificaciones;

-- Crear nueva política más permisiva para triggers
CREATE POLICY "Permitir crear notificaciones"
  ON notificaciones
  FOR INSERT
  WITH CHECK (
    -- Permitir al service role (para funciones del sistema y triggers)
    auth.role() = 'service_role' OR
    -- Permitir a administradores y moderadores
    auth.uid() IN (
      SELECT auth_user_id FROM usuario_nomina WHERE rol IN ('administrador', 'moderador')
    ) OR
    -- Permitir cuando se ejecutan desde triggers (contexto de función)
    current_setting('role', true) = 'postgres' OR
    -- Permitir a usuarios autenticados (para casos donde los triggers necesiten permisos)
    auth.uid() IS NOT NULL
  );

-- Verificar que la política se creó correctamente
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  roles
FROM pg_policies 
WHERE tablename = 'notificaciones' AND cmd = 'INSERT';
