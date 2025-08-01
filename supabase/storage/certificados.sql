-- Crear el bucket si no existe
INSERT INTO storage.buckets (id, name)
VALUES ('certificados', 'certificados')
ON CONFLICT (id) DO NOTHING;

-- Política para permitir acceso público a los certificados
CREATE POLICY "Acceso público a certificados" ON storage.objects
FOR SELECT
USING (bucket_id = 'certificados');

-- Política para permitir subida de certificados por usuarios autenticados
CREATE POLICY "Permitir subida de certificados" ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'certificados' AND
  auth.role() = 'authenticated' AND
  EXISTS (
    SELECT 1
    FROM usuario_nomina un
    WHERE un.auth_user_id = auth.uid()
  )
);

-- Política para permitir actualización de certificados
CREATE POLICY "Permitir actualización de certificados" ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'certificados' AND
  auth.role() = 'authenticated' AND
  EXISTS (
    SELECT 1
    FROM usuario_nomina un
    WHERE un.auth_user_id = auth.uid()
  )
);

-- Política para permitir eliminación de certificados
CREATE POLICY "Permitir eliminación de certificados" ON storage.objects
FOR DELETE
USING (
  bucket_id = 'certificados' AND
  auth.role() = 'authenticated' AND
  EXISTS (
    SELECT 1
    FROM usuario_nomina un
    WHERE un.auth_user_id = auth.uid()
  )
);
