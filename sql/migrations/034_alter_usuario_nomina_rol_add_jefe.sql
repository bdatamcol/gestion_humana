-- Ampliar los roles permitidos para incluir 'jefe'
DO $$
BEGIN
  -- Eliminar constraint de rol si existe
  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'usuario_nomina_rol_check'
      AND table_name = 'usuario_nomina'
      AND constraint_type = 'CHECK'
  ) THEN
    ALTER TABLE usuario_nomina DROP CONSTRAINT usuario_nomina_rol_check;
  END IF;
END$$;

-- Crear nuevamente el constraint con el nuevo set de roles
ALTER TABLE usuario_nomina
ADD CONSTRAINT usuario_nomina_rol_check
CHECK (rol IN ('usuario', 'jefe', 'administrador'));

-- Opcional: actualizar documentación interna
COMMENT ON COLUMN usuario_nomina.rol IS 'Rol del usuario: usuario, jefe o administrador';
