-- 042_normalizar_rol_jefe_minusculas.sql
-- Problema: la migracion 034 amplio el CHECK de usuario_nomina.rol para
-- aceptar el valor 'jefe', pero NO normalizo los datos pre-existentes.
-- Como consecuencia, en produccion existen filas con 'Jefe', 'JEFE' e
-- incluso ' jefe' (con espacio), que el CHECK acepta pero que rompen
-- todas las comparaciones exact-case que hace el frontend
-- (currentUser.rol !== "jefe", userData?.rol === 'jefe', etc.).
--
-- Evidencia en el codigo: app/administracion/estadisticas/page.tsx
-- consulta .in('rol', ['usuario', 'jefe', 'Jefe', 'JEFE']) en 9 lugares,
-- confirmando que en BD conviven multiples variantes de casing.
--
-- Solucion:
--   1) UPDATE normalizando todos los valores a lowercase.
--   2) UPDATE de valores vacios/nulos a 'usuario' (rol por defecto
--      del CHECK original).
--   3) Re-afirmar el CHECK constraint por si algun valor quedo fuera
--      del set valido.

-- 1) Normalizar a lowercase
UPDATE usuario_nomina
SET rol = LOWER(rol)
WHERE rol IS NOT NULL
  AND rol <> LOWER(rol);

-- 2) Asignar rol por defecto a valores vacios / nulos
UPDATE usuario_nomina
SET rol = 'usuario'
WHERE rol IS NULL OR TRIM(rol) = '';

-- 3) Re-afirmar CHECK constraint
ALTER TABLE usuario_nomina DROP CONSTRAINT IF EXISTS usuario_nomina_rol_check;
ALTER TABLE usuario_nomina
  ADD CONSTRAINT usuario_nomina_rol_check
  CHECK (rol IN ('usuario', 'jefe', 'administrador'));
