-- Agregar columna soporte_url a la tabla solicitudes_permisos
ALTER TABLE solicitudes_permisos ADD COLUMN IF NOT EXISTS soporte_url TEXT;

-- Comentarios sobre la columna
COMMENT ON COLUMN solicitudes_permisos.soporte_url IS 'URL del documento de soporte adjunto a la solicitud';

-- Crear bucket de permisos si no existe
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('permisos', 'permisos', true, 5242880, '{image/*,application/pdf}')
on conflict (id) do nothing;

-- Configurar políticas de seguridad para el bucket 'permisos'
create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'permisos' );

create policy "Authenticated Insert"
  on storage.objects for insert
  with check ( bucket_id = 'permisos' and auth.role() = 'authenticated' );

create policy "Authenticated Update"
  on storage.objects for update
  using ( bucket_id = 'permisos' and auth.role() = 'authenticated' );

create policy "Authenticated Delete"
  on storage.objects for delete
  using ( bucket_id = 'permisos' and auth.role() = 'authenticated' );
