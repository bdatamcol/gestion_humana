-- Tabla de comentarios para solicitudes de permisos
CREATE TABLE IF NOT EXISTS comentarios_permisos (
  id SERIAL PRIMARY KEY,
  solicitud_id UUID NOT NULL REFERENCES solicitudes_permisos(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES usuario_nomina(auth_user_id) ON DELETE CASCADE,
  contenido TEXT NOT NULL,
  fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  respuesta_a INTEGER REFERENCES comentarios_permisos(id) ON DELETE CASCADE,
  leido BOOLEAN DEFAULT FALSE
);

-- Índices para mejorar el rendimiento de las consultas
CREATE INDEX IF NOT EXISTS idx_comentarios_permisos_solicitud_id ON comentarios_permisos(solicitud_id);
CREATE INDEX IF NOT EXISTS idx_comentarios_permisos_respuesta_a ON comentarios_permisos(respuesta_a);
CREATE INDEX IF NOT EXISTS idx_comentarios_permisos_usuario_id ON comentarios_permisos(usuario_id);
