-- Tabla de comentarios para incapacidades
CREATE TABLE IF NOT EXISTS comentarios_incapacidades (
  id SERIAL PRIMARY KEY,
  incapacidad_id UUID NOT NULL REFERENCES incapacidades(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES usuario_nomina(auth_user_id) ON DELETE CASCADE,
  contenido TEXT NOT NULL,
  fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  respuesta_a INTEGER REFERENCES comentarios_incapacidades(id) ON DELETE CASCADE,
  leido BOOLEAN DEFAULT FALSE,
  visto_admin BOOLEAN DEFAULT FALSE
);

-- Índices para mejorar el rendimiento de las consultas
CREATE INDEX IF NOT EXISTS idx_comentarios_incapacidades_incapacidad_id ON comentarios_incapacidades(incapacidad_id);
CREATE INDEX IF NOT EXISTS idx_comentarios_incapacidades_respuesta_a ON comentarios_incapacidades(respuesta_a);
CREATE INDEX IF NOT EXISTS idx_comentarios_incapacidades_usuario_id ON comentarios_incapacidades(usuario_id);
