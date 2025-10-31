-- Agregar políticas RLS para comentarios_certificacion
-- Fecha: 2024-12-19
-- Descripción: Habilitar Row Level Security y crear políticas para comentarios de certificación

-- Habilitar RLS en la tabla
ALTER TABLE comentarios_certificacion ENABLE ROW LEVEL SECURITY;

-- Política para que todos los usuarios autenticados puedan ver comentarios
CREATE POLICY "Usuarios autenticados pueden ver comentarios de certificación"
  ON comentarios_certificacion
  FOR SELECT
  TO authenticated
  USING (true);

-- Política para que usuarios autenticados puedan insertar comentarios
CREATE POLICY "Usuarios autenticados pueden crear comentarios de certificación"
  ON comentarios_certificacion
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = usuario_id);

-- Política para que usuarios puedan actualizar sus propios comentarios
CREATE POLICY "Usuarios pueden actualizar sus propios comentarios de certificación"
  ON comentarios_certificacion
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = usuario_id)
  WITH CHECK (auth.uid() = usuario_id);

-- Política para que usuarios puedan eliminar sus propios comentarios
CREATE POLICY "Usuarios pueden eliminar sus propios comentarios de certificación"
  ON comentarios_certificacion
  FOR DELETE
  TO authenticated
  USING (auth.uid() = usuario_id);

-- Política adicional para que administradores puedan gestionar todos los comentarios
CREATE POLICY "Administradores pueden gestionar todos los comentarios de certificación"
  ON comentarios_certificacion
  FOR ALL
  TO authenticated
  USING (auth.uid() IN (
    SELECT auth_user_id FROM usuario_nomina WHERE rol = 'administrador'
  ))
  WITH CHECK (auth.uid() IN (
    SELECT auth_user_id FROM usuario_nomina WHERE rol = 'administrador'
  ));
