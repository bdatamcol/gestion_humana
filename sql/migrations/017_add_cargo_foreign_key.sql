-- Modificar tabla usuario_nomina para relacionar con tabla cargos
-- Fecha: $(date)
-- Descripción: Agregar foreign key entre usuario_nomina.cargo y cargos.id

-- Paso 1: Agregar nueva columna cargo_id como foreign key
ALTER TABLE usuario_nomina ADD COLUMN cargo_id UUID;

-- Paso 2: Crear foreign key constraint
ALTER TABLE usuario_nomina 
ADD CONSTRAINT fk_usuario_nomina_cargo 
FOREIGN KEY (cargo_id) REFERENCES cargos(id) ON DELETE SET NULL;

-- Paso 3: Crear índice para mejorar performance en consultas
CREATE INDEX idx_usuario_nomina_cargo_id ON usuario_nomina(cargo_id);

-- Paso 4: Migrar datos existentes del campo cargo (varchar) al nuevo cargo_id (int)
-- Actualizar cargo_id basado en coincidencias exactas con nombres de cargos
UPDATE usuario_nomina 
SET cargo_id = c.id 
FROM cargos c 
WHERE UPPER(TRIM(usuario_nomina.cargo)) = UPPER(TRIM(c.nombre));

-- Paso 5: Verificar la migración de datos
SELECT 
    COUNT(*) as total_usuarios,
    COUNT(cargo_id) as usuarios_con_cargo_id,
    COUNT(*) - COUNT(cargo_id) as usuarios_sin_cargo_id
FROM usuario_nomina;

-- Paso 6: Mostrar usuarios que no pudieron ser migrados
SELECT 
    id,
    colaborador,
    cargo as cargo_original,
    'No encontrado en tabla cargos' as observacion
FROM usuario_nomina 
WHERE cargo_id IS NULL AND cargo IS NOT NULL;

-- Paso 7: Opcional - Renombrar columna cargo original para mantener histórico
-- ALTER TABLE usuario_nomina RENAME COLUMN cargo TO cargo_legacy;

-- Comentarios en las columnas
COMMENT ON COLUMN usuario_nomina.cargo_id IS 'ID del cargo del usuario (foreign key a tabla cargos)';

COMMIT;

-- Nota: Después de ejecutar este script y verificar que todo está correcto,
-- se puede considerar eliminar la columna 'cargo' original si ya no se necesita:
-- ALTER TABLE usuario_nomina DROP COLUMN cargo;
