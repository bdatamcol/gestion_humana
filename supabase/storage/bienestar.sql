-- Crear bucket para imágenes de bienestar
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'bienestar',
  'bienestar',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO NOTHING;

-- Política para permitir a todos ver las imágenes
CREATE POLICY "Todos pueden ver imágenes de bienestar" ON storage.objects
  FOR SELECT USING (bucket_id = 'bienestar');

-- Política para permitir a administradores subir imágenes
CREATE POLICY "Solo administradores pueden subir imágenes de bienestar" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'bienestar' AND
    auth.uid() IN (
      SELECT auth_user_id FROM usuario_nomina WHERE rol = 'administrador'
    )
  );

-- Política para permitir a administradores actualizar imágenes
CREATE POLICY "Solo administradores pueden actualizar imágenes de bienestar" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'bienestar' AND
    auth.uid() IN (
      SELECT auth_user_id FROM usuario_nomina WHERE rol = 'administrador'
    )
  );

-- Política para permitir a administradores eliminar imágenes
CREATE POLICY "Solo administradores pueden eliminar imágenes de bienestar" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'bienestar' AND
    auth.uid() IN (
      SELECT auth_user_id FROM usuario_nomina WHERE rol = 'administrador'
    )
  );
