-- Tabla de comentarios para comunicados
CREATE TABLE IF NOT EXISTS comentarios_comunicados (
    id SERIAL PRIMARY KEY,
    comunicado_id UUID NOT NULL REFERENCES comunicados(id) ON DELETE CASCADE,
    usuario_id UUID NOT NULL REFERENCES usuario_nomina(auth_user_id) ON DELETE CASCADE,
    comentario TEXT NOT NULL,
    fecha TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    respuesta_a INTEGER REFERENCES comentarios_comunicados(id) ON DELETE CASCADE
);

-- Índices para mejorar consultas
CREATE INDEX IF NOT EXISTS idx_comentarios_comunicados_comunicado_id ON comentarios_comunicados(comunicado_id);
CREATE INDEX IF NOT EXISTS idx_comentarios_comunicados_respuesta_a ON comentarios_comunicados(respuesta_a);
