-- Crear bucket para almacenar los PDFs de incapacidades
INSERT INTO storage.buckets (id, name, public)
VALUES ('incapacidades', 'incapacidades', true);

-- Crear políticas para el bucket de incapacidades

-- Política para permitir a los usuarios autenticados leer archivos del bucket
CREATE POLICY "Usuarios autenticados pueden ver incapacidades"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'incapacidades');

-- Política para permitir a los usuarios subir sus propias incapacidades
CREATE POLICY "Usuarios pueden subir sus propias incapacidades"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'incapacidades' AND
    (auth.uid() = SPLIT_PART(name, '_', 1)::uuid)
  );

-- Política para permitir a los administradores subir cualquier incapacidad
CREATE POLICY "Administradores pueden subir cualquier incapacidad"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'incapacidades' AND
    auth.uid() IN (
      SELECT auth_user_id FROM public.usuario_nomina WHERE rol = 'administrador'
    )
  );

-- Política para permitir a los administradores actualizar archivos en el bucket
CREATE POLICY "Administradores pueden actualizar incapacidades"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'incapacidades' AND
    auth.uid() IN (
      SELECT auth_user_id FROM public.usuario_nomina WHERE rol = 'administrador'
    )
  );

-- Política para permitir a los administradores eliminar archivos del bucket
CREATE POLICY "Administradores pueden eliminar incapacidades"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'incapacidades' AND
    auth.uid() IN (
      SELECT auth_user_id FROM public.usuario_nomina WHERE rol = 'administrador'
    )
  );
