-- Crear bucket para almacenar los PDFs de permisos
INSERT INTO storage.buckets (id, name, public)
VALUES ('permisos', 'permisos', true);

-- Crear políticas para el bucket de permisos

-- Política para permitir a los usuarios autenticados leer archivos del bucket
CREATE POLICY "Usuarios autenticados pueden ver permisos"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'permisos');

-- Política para permitir a los administradores subir archivos al bucket
CREATE POLICY "Administradores pueden subir permisos"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'permisos' AND
    auth.uid() IN (
      SELECT auth_user_id FROM public.usuario_nomina WHERE rol = 'administrador'
    )
  );

-- Política para permitir a los administradores actualizar archivos en el bucket
CREATE POLICY "Administradores pueden actualizar permisos"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'permisos' AND
    auth.uid() IN (
      SELECT auth_user_id FROM public.usuario_nomina WHERE rol = 'administrador'
    )
  );

-- Política para permitir a los administradores eliminar archivos del bucket
CREATE POLICY "Administradores pueden eliminar permisos"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'permisos' AND
    auth.uid() IN (
      SELECT auth_user_id FROM public.usuario_nomina WHERE rol = 'administrador'
    )
  );
