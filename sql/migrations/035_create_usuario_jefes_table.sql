-- Tabla de asignación de jefes a usuarios
CREATE TABLE IF NOT EXISTS usuario_jefes (
  usuario_id uuid NOT NULL,
  jefe_id uuid NOT NULL,
  created_at timestamptz DEFAULT NOW(),
  PRIMARY KEY (usuario_id, jefe_id),
  CONSTRAINT usuario_jefes_usuario_fk FOREIGN KEY (usuario_id) REFERENCES auth.users (id) ON DELETE CASCADE,
  CONSTRAINT usuario_jefes_jefe_fk FOREIGN KEY (jefe_id) REFERENCES auth.users (id) ON DELETE CASCADE,
  CONSTRAINT usuario_jefes_distintos CHECK (usuario_id <> jefe_id)
);

-- Índices de ayuda
CREATE INDEX IF NOT EXISTS idx_usuario_jefes_usuario ON usuario_jefes (usuario_id);
CREATE INDEX IF NOT EXISTS idx_usuario_jefes_jefe ON usuario_jefes (jefe_id);

-- Activar RLS
ALTER TABLE usuario_jefes ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
-- Administradores: acceso completo
CREATE POLICY usuario_jefes_admin_all ON usuario_jefes
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM usuario_nomina u
      WHERE u.auth_user_id = auth.uid() AND u.rol = 'administrador'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuario_nomina u
      WHERE u.auth_user_id = auth.uid() AND u.rol = 'administrador'
    )
  );

-- Usuarios: pueden ver sus jefes
CREATE POLICY usuario_jefes_usuario_select ON usuario_jefes
  FOR SELECT
  USING (usuario_id = auth.uid());

-- Jefes: pueden ver sus subordinados
CREATE POLICY usuario_jefes_jefe_select ON usuario_jefes
  FOR SELECT
  USING (jefe_id = auth.uid());

-- Por defecto, solo administradores pueden INSERT/UPDATE/DELETE por la política admin_all
