-- Crear tabla de comentarios para solicitudes de vacaciones
CREATE TABLE IF NOT EXISTS comentarios_vacaciones (
  id SERIAL PRIMARY KEY,
  solicitud_id UUID NOT NULL REFERENCES solicitudes_vacaciones(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES usuario_nomina(auth_user_id) ON DELETE CASCADE,
  contenido TEXT NOT NULL,
  fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  respuesta_a INTEGER REFERENCES comentarios_vacaciones(id) ON DELETE CASCADE,
  visto_admin BOOLEAN DEFAULT FALSE,
  visto_usuario BOOLEAN DEFAULT FALSE
);

-- Índices para mejorar el rendimiento de las consultas
CREATE INDEX IF NOT EXISTS idx_comentarios_vacaciones_solicitud_id ON comentarios_vacaciones(solicitud_id);
CREATE INDEX IF NOT EXISTS idx_comentarios_vacaciones_respuesta_a ON comentarios_vacaciones(respuesta_a);
CREATE INDEX IF NOT EXISTS idx_comentarios_vacaciones_usuario_id ON comentarios_vacaciones(usuario_id);
CREATE INDEX IF NOT EXISTS idx_comentarios_vacaciones_visto_admin ON comentarios_vacaciones(visto_admin);
CREATE INDEX IF NOT EXISTS idx_comentarios_vacaciones_visto_usuario ON comentarios_vacaciones(visto_usuario);
