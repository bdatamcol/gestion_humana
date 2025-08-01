-- Crear tabla para incapacidades
CREATE TABLE IF NOT EXISTS incapacidades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  fecha_subida TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  documento_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear política RLS para que los usuarios solo puedan ver sus propias incapacidades
CREATE POLICY "Los usuarios pueden ver sus propias incapacidades"
  ON incapacidades
  FOR SELECT
  USING (auth.uid() = usuario_id OR auth.uid() IN (
    SELECT auth_user_id FROM usuario_nomina WHERE rol = 'administrador'
  ));

-- Crear política RLS para que los usuarios puedan crear sus propias incapacidades
CREATE POLICY "Los usuarios pueden crear sus propias incapacidades"
  ON incapacidades
  FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

-- Crear política RLS para que los administradores puedan actualizar cualquier incapacidad
CREATE POLICY "Los administradores pueden actualizar cualquier incapacidad"
  ON incapacidades
  FOR UPDATE
  USING (auth.uid() IN (
    SELECT auth_user_id FROM usuario_nomina WHERE rol = 'administrador'
  ));

-- Crear política RLS para que los usuarios puedan actualizar sus propias incapacidades
CREATE POLICY "Los usuarios pueden actualizar sus propias incapacidades"
  ON incapacidades
  FOR UPDATE
  USING (auth.uid() = usuario_id);

-- Crear política RLS para que los administradores puedan eliminar cualquier incapacidad
CREATE POLICY "Los administradores pueden eliminar cualquier incapacidad"
  ON incapacidades
  FOR DELETE
  USING (auth.uid() IN (
    SELECT auth_user_id FROM usuario_nomina WHERE rol = 'administrador'
  ));

-- Habilitar RLS en la tabla
ALTER TABLE incapacidades ENABLE ROW LEVEL SECURITY;
