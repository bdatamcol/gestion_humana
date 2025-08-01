-- Crear el bucket si no existe
INSERT INTO storage.buckets (id, name)
VALUES ('empresas', 'empresas')
ON CONFLICT (id) DO NOTHING;

-- Política para permitir acceso público a los membretes
CREATE POLICY "Acceso público a membretes" ON storage.objects
FOR SELECT
USING (bucket_id = 'empresas');

-- Política para permitir subida de membretes por usuarios autenticados con rol administrador
CREATE POLICY "Permitir subida de membretes" ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'empresas' AND
  auth.role() = 'authenticated' AND
  EXISTS (
    SELECT 1
    FROM usuario_nomina un
    WHERE un.auth_user_id = auth.uid() AND un.rol = 'administrador'
  )
);

-- Política para permitir actualización de membretes
CREATE POLICY "Permitir actualización de membretes" ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'empresas' AND
  auth.role() = 'authenticated' AND
  EXISTS (
    SELECT 1
    FROM usuario_nomina un
    WHERE un.auth_user_id = auth.uid() AND un.rol = 'administrador'
  )
);

-- Política para permitir eliminación de membretes
CREATE POLICY "Permitir eliminación de membretes" ON storage.objects
FOR DELETE
USING (
  bucket_id = 'empresas' AND
  auth.role() = 'authenticated' AND
  EXISTS (
    SELECT 1
    FROM usuario_nomina un
    WHERE un.auth_user_id = auth.uid() AND un.rol = 'administrador'
  )
);
