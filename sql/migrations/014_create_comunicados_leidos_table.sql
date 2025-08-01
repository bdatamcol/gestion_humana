-- Crear tabla para registrar comunicados leídos por los usuarios
CREATE TABLE IF NOT EXISTS comunicados_leidos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID NOT NULL REFERENCES usuario_nomina(auth_user_id),
  comunicado_id UUID NOT NULL REFERENCES comunicados(id),
  leido_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índice para búsquedas eficientes
CREATE INDEX idx_comunicados_leidos_usuario ON comunicados_leidos(usuario_id);
CREATE INDEX idx_comunicados_leidos_comunicado ON comunicados_leidos(comunicado_id);
