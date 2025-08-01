-- Tabla de comentarios para solicitudes de certificación laboral
CREATE TABLE IF NOT EXISTS comentarios_certificacion (
    id SERIAL PRIMARY KEY,
    solicitud_id UUID NOT NULL REFERENCES solicitudes_certificacion(id) ON DELETE CASCADE,
    usuario_id UUID NOT NULL,
    comentario TEXT NOT NULL,
    fecha TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    respuesta_a INTEGER REFERENCES comentarios_certificacion(id) ON DELETE CASCADE
);

-- Índices para mejorar el rendimiento de las consultas
CREATE INDEX IF NOT EXISTS idx_comentarios_certificacion_solicitud_id ON comentarios_certificacion(solicitud_id);
CREATE INDEX IF NOT EXISTS idx_comentarios_certificacion_respuesta_a ON comentarios_certificacion(respuesta_a);
