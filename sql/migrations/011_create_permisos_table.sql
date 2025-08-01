-- Crear tabla para solicitudes de permisos
CREATE TABLE IF NOT EXISTS solicitudes_permisos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo_permiso VARCHAR(50) NOT NULL, -- 'no_remunerado', 'remunerado', 'actividad_interna'
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  hora_inicio TIME,
  hora_fin TIME,
  motivo TEXT NOT NULL,
  compensacion TEXT,
  estado VARCHAR(20) NOT NULL DEFAULT 'pendiente', -- 'pendiente', 'aprobado', 'rechazado'
  admin_id UUID REFERENCES auth.users(id),
  fecha_solicitud TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  fecha_resolucion TIMESTAMP WITH TIME ZONE,
  motivo_rechazo TEXT,
  pdf_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear política RLS para que los usuarios solo puedan ver sus propias solicitudes
CREATE POLICY "Los usuarios pueden ver sus propias solicitudes de permisos"
  ON solicitudes_permisos
  FOR SELECT
  USING (auth.uid() = usuario_id OR auth.uid() IN (
    SELECT auth_user_id FROM usuario_nomina WHERE rol = 'administrador'
  ));

-- Crear política RLS para que los usuarios puedan crear sus propias solicitudes
CREATE POLICY "Los usuarios pueden crear sus propias solicitudes de permisos"
  ON solicitudes_permisos
  FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

-- Crear política RLS para que los administradores puedan actualizar cualquier solicitud
CREATE POLICY "Los administradores pueden actualizar cualquier solicitud de permisos"
  ON solicitudes_permisos
  FOR UPDATE
  USING (auth.uid() IN (
    SELECT auth_user_id FROM usuario_nomina WHERE rol = 'administrador'
  ));

-- Crear política RLS para que los usuarios puedan actualizar sus propias solicitudes pendientes
CREATE POLICY "Los usuarios pueden actualizar sus propias solicitudes de permisos pendientes"
  ON solicitudes_permisos
  FOR UPDATE
  USING (auth.uid() = usuario_id AND estado = 'pendiente');

-- Crear política RLS para que los administradores puedan eliminar cualquier solicitud
CREATE POLICY "Los administradores pueden eliminar cualquier solicitud de permisos"
  ON solicitudes_permisos
  FOR DELETE
  USING (auth.uid() IN (
    SELECT auth_user_id FROM usuario_nomina WHERE rol = 'administrador'
  ));

-- Crear política RLS para que los usuarios puedan eliminar sus propias solicitudes pendientes
CREATE POLICY "Los usuarios pueden eliminar sus propias solicitudes de permisos pendientes"
  ON solicitudes_permisos
  FOR DELETE
  USING (auth.uid() = usuario_id AND estado = 'pendiente');

-- Habilitar RLS en la tabla
ALTER TABLE solicitudes_permisos ENABLE ROW LEVEL SECURITY;
