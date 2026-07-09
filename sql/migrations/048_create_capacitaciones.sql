-- =====================================================
-- Módulo de Capacitaciones
-- =====================================================

-- 1. Cursos
CREATE TABLE IF NOT EXISTS capacitaciones_cursos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  titulo VARCHAR(200) NOT NULL,
  descripcion_corta VARCHAR(500) NOT NULL,
  descripcion_completa TEXT,
  imagen_destacada_url TEXT,
  estado VARCHAR(20) NOT NULL DEFAULT 'borrador' CHECK (estado IN ('borrador', 'publicado', 'archivado')),
  nota_aprobacion NUMERIC(5,2) DEFAULT 70.00 CHECK (nota_aprobacion >= 0 AND nota_aprobacion <= 100),
  autor_id UUID NOT NULL REFERENCES usuario_nomina(auth_user_id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_capacitaciones_cursos_estado ON capacitaciones_cursos(estado);
CREATE INDEX idx_capacitaciones_cursos_autor ON capacitaciones_cursos(autor_id);

-- 2. Lecciones
CREATE TABLE IF NOT EXISTS capacitaciones_lecciones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  curso_id UUID NOT NULL REFERENCES capacitaciones_cursos(id) ON DELETE CASCADE,
  titulo VARCHAR(200) NOT NULL,
  descripcion TEXT,
  orden INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_capacitaciones_lecciones_curso ON capacitaciones_lecciones(curso_id, orden);

-- 3. Recursos de lección (texto, video, imagen, documento)
CREATE TABLE IF NOT EXISTS capacitaciones_recursos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  leccion_id UUID NOT NULL REFERENCES capacitaciones_lecciones(id) ON DELETE CASCADE,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('texto', 'video', 'imagen', 'documento')),
  titulo VARCHAR(200),
  contenido_texto TEXT,
  video_url TEXT,
  archivo_url TEXT,
  orden INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_capacitaciones_recursos_leccion ON capacitaciones_recursos(leccion_id, orden);

-- 4. Examen (uno por curso)
CREATE TABLE IF NOT EXISTS capacitaciones_examenes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  curso_id UUID NOT NULL UNIQUE REFERENCES capacitaciones_cursos(id) ON DELETE CASCADE,
  titulo VARCHAR(200) DEFAULT 'Examen final',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Preguntas
CREATE TABLE IF NOT EXISTS capacitaciones_preguntas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  examen_id UUID NOT NULL REFERENCES capacitaciones_examenes(id) ON DELETE CASCADE,
  enunciado TEXT NOT NULL,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('seleccion_unica', 'seleccion_multiple', 'verdadero_falso')),
  puntos NUMERIC(5,2) DEFAULT 1.00 CHECK (puntos >= 0),
  orden INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_capacitaciones_preguntas_examen ON capacitaciones_preguntas(examen_id, orden);

-- 6. Opciones de respuesta
CREATE TABLE IF NOT EXISTS capacitaciones_opciones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pregunta_id UUID NOT NULL REFERENCES capacitaciones_preguntas(id) ON DELETE CASCADE,
  texto TEXT NOT NULL,
  es_correcta BOOLEAN DEFAULT FALSE,
  orden INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_capacitaciones_opciones_pregunta ON capacitaciones_opciones(pregunta_id, orden);

-- 7. Progreso del usuario en lecciones
CREATE TABLE IF NOT EXISTS capacitaciones_progreso (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID NOT NULL REFERENCES usuario_nomina(auth_user_id) ON DELETE CASCADE,
  leccion_id UUID NOT NULL REFERENCES capacitaciones_lecciones(id) ON DELETE CASCADE,
  completada BOOLEAN DEFAULT TRUE,
  completada_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(usuario_id, leccion_id)
);

CREATE INDEX idx_capacitaciones_progreso_usuario ON capacitaciones_progreso(usuario_id);

-- 8. Intentos del examen (un solo intento por usuario/examen)
CREATE TABLE IF NOT EXISTS capacitaciones_intentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID NOT NULL REFERENCES usuario_nomina(auth_user_id) ON DELETE CASCADE,
  examen_id UUID NOT NULL REFERENCES capacitaciones_examenes(id) ON DELETE CASCADE,
  calificacion NUMERIC(5,2) CHECK (calificacion >= 0 AND calificacion <= 100),
  aprobado BOOLEAN DEFAULT FALSE,
  fecha_intento TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(usuario_id, examen_id)
);

CREATE INDEX idx_capacitaciones_intentos_usuario ON capacitaciones_intentos(usuario_id);
CREATE INDEX idx_capacitaciones_intentos_examen ON capacitaciones_intentos(examen_id, fecha_intento DESC);

-- 9. Respuestas por intento
CREATE TABLE IF NOT EXISTS capacitaciones_respuestas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  intento_id UUID NOT NULL REFERENCES capacitaciones_intentos(id) ON DELETE CASCADE,
  pregunta_id UUID NOT NULL REFERENCES capacitaciones_preguntas(id) ON DELETE CASCADE,
  opciones_seleccionadas UUID[] DEFAULT '{}'::uuid[],
  correcta BOOLEAN DEFAULT FALSE,
  puntos_obtenidos NUMERIC(5,2) DEFAULT 0,
  UNIQUE(intento_id, pregunta_id)
);

CREATE INDEX idx_capacitaciones_respuestas_intento ON capacitaciones_respuestas(intento_id);

-- =====================================================
-- Triggers para updated_at
-- =====================================================
CREATE TRIGGER update_capacitaciones_cursos_updated_at
  BEFORE UPDATE ON capacitaciones_cursos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_capacitaciones_lecciones_updated_at
  BEFORE UPDATE ON capacitaciones_lecciones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_capacitaciones_examenes_updated_at
  BEFORE UPDATE ON capacitaciones_examenes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- RLS
-- =====================================================
ALTER TABLE capacitaciones_cursos ENABLE ROW LEVEL SECURITY;
ALTER TABLE capacitaciones_lecciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE capacitaciones_recursos ENABLE ROW LEVEL SECURITY;
ALTER TABLE capacitaciones_examenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE capacitaciones_preguntas ENABLE ROW LEVEL SECURITY;
ALTER TABLE capacitaciones_opciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE capacitaciones_progreso ENABLE ROW LEVEL SECURITY;
ALTER TABLE capacitaciones_intentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE capacitaciones_respuestas ENABLE ROW LEVEL SECURITY;

-- Helper: subquery para validar admin
-- Cursos: admin gestiona todo; usuarios ven publicados
CREATE POLICY "Usuarios ven cursos publicados"
  ON capacitaciones_cursos FOR SELECT
  USING (
    estado = 'publicado' OR auth.uid() IN (
      SELECT auth_user_id FROM usuario_nomina WHERE rol = 'administrador'
    )
  );

CREATE POLICY "Admin crea cursos"
  ON capacitaciones_cursos FOR INSERT
  WITH CHECK (auth.uid() IN (
    SELECT auth_user_id FROM usuario_nomina WHERE rol = 'administrador'
  ));

CREATE POLICY "Admin actualiza cursos"
  ON capacitaciones_cursos FOR UPDATE
  USING (auth.uid() IN (
    SELECT auth_user_id FROM usuario_nomina WHERE rol = 'administrador'
  ));

CREATE POLICY "Admin elimina cursos"
  ON capacitaciones_cursos FOR DELETE
  USING (auth.uid() IN (
    SELECT auth_user_id FROM usuario_nomina WHERE rol = 'administrador'
  ));

-- Lecciones: visibles para usuarios en cursos publicados; admin gestiona
CREATE POLICY "Usuarios ven lecciones de cursos publicados"
  ON capacitaciones_lecciones FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM capacitaciones_cursos c
      WHERE c.id = capacitaciones_lecciones.curso_id
        AND (c.estado = 'publicado' OR auth.uid() IN (
          SELECT auth_user_id FROM usuario_nomina WHERE rol = 'administrador'
        ))
    )
  );

CREATE POLICY "Admin crea lecciones"
  ON capacitaciones_lecciones FOR INSERT
  WITH CHECK (auth.uid() IN (
    SELECT auth_user_id FROM usuario_nomina WHERE rol = 'administrador'
  ));

CREATE POLICY "Admin actualiza lecciones"
  ON capacitaciones_lecciones FOR UPDATE
  USING (auth.uid() IN (
    SELECT auth_user_id FROM usuario_nomina WHERE rol = 'administrador'
  ));

CREATE POLICY "Admin elimina lecciones"
  ON capacitaciones_lecciones FOR DELETE
  USING (auth.uid() IN (
    SELECT auth_user_id FROM usuario_nomina WHERE rol = 'administrador'
  ));

-- Recursos
CREATE POLICY "Usuarios ven recursos de cursos publicados"
  ON capacitaciones_recursos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM capacitaciones_lecciones l
      JOIN capacitaciones_cursos c ON c.id = l.curso_id
      WHERE l.id = capacitaciones_recursos.leccion_id
        AND (c.estado = 'publicado' OR auth.uid() IN (
          SELECT auth_user_id FROM usuario_nomina WHERE rol = 'administrador'
        ))
    )
  );

CREATE POLICY "Admin crea recursos"
  ON capacitaciones_recursos FOR INSERT
  WITH CHECK (auth.uid() IN (
    SELECT auth_user_id FROM usuario_nomina WHERE rol = 'administrador'
  ));

CREATE POLICY "Admin actualiza recursos"
  ON capacitaciones_recursos FOR UPDATE
  USING (auth.uid() IN (
    SELECT auth_user_id FROM usuario_nomina WHERE rol = 'administrador'
  ));

CREATE POLICY "Admin elimina recursos"
  ON capacitaciones_recursos FOR DELETE
  USING (auth.uid() IN (
    SELECT auth_user_id FROM usuario_nomina WHERE rol = 'administrador'
  ));

-- Examenes
CREATE POLICY "Usuarios ven examenes de cursos publicados"
  ON capacitaciones_examenes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM capacitaciones_cursos c
      WHERE c.id = capacitaciones_examenes.curso_id
        AND (c.estado = 'publicado' OR auth.uid() IN (
          SELECT auth_user_id FROM usuario_nomina WHERE rol = 'administrador'
        ))
    )
  );

CREATE POLICY "Admin gestiona examenes"
  ON capacitaciones_examenes FOR ALL
  USING (auth.uid() IN (
    SELECT auth_user_id FROM usuario_nomina WHERE rol = 'administrador'
  ));

-- Preguntas
CREATE POLICY "Usuarios ven preguntas de examenes publicados"
  ON capacitaciones_preguntas FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM capacitaciones_examenes e
      JOIN capacitaciones_cursos c ON c.id = e.curso_id
      WHERE e.id = capacitaciones_preguntas.examen_id
        AND (c.estado = 'publicado' OR auth.uid() IN (
          SELECT auth_user_id FROM usuario_nomina WHERE rol = 'administrador'
        ))
    )
  );

CREATE POLICY "Admin gestiona preguntas"
  ON capacitaciones_preguntas FOR ALL
  USING (auth.uid() IN (
    SELECT auth_user_id FROM usuario_nomina WHERE rol = 'administrador'
  ));

-- Opciones
CREATE POLICY "Usuarios ven opciones de examenes publicados"
  ON capacitaciones_opciones FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM capacitaciones_preguntas p
      JOIN capacitaciones_examenes e ON e.id = p.examen_id
      JOIN capacitaciones_cursos c ON c.id = e.curso_id
      WHERE p.id = capacitaciones_opciones.pregunta_id
        AND (c.estado = 'publicado' OR auth.uid() IN (
          SELECT auth_user_id FROM usuario_nomina WHERE rol = 'administrador'
        ))
    )
  );

CREATE POLICY "Admin gestiona opciones"
  ON capacitaciones_opciones FOR ALL
  USING (auth.uid() IN (
    SELECT auth_user_id FROM usuario_nomina WHERE rol = 'administrador'
  ));

-- Progreso: cada usuario gestiona el suyo
CREATE POLICY "Usuarios ven su progreso"
  ON capacitaciones_progreso FOR SELECT
  USING (
    auth.uid() = usuario_id OR auth.uid() IN (
      SELECT auth_user_id FROM usuario_nomina WHERE rol = 'administrador'
    )
  );

CREATE POLICY "Usuarios crean su progreso"
  ON capacitaciones_progreso FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Usuarios actualizan su progreso"
  ON capacitaciones_progreso FOR UPDATE
  USING (auth.uid() = usuario_id);

CREATE POLICY "Usuarios eliminan su progreso"
  ON capacitaciones_progreso FOR DELETE
  USING (auth.uid() = usuario_id);

-- Intentos: cada usuario solo el suyo; admin ve todos
CREATE POLICY "Usuarios ven sus intentos"
  ON capacitaciones_intentos FOR SELECT
  USING (
    auth.uid() = usuario_id OR auth.uid() IN (
      SELECT auth_user_id FROM usuario_nomina WHERE rol = 'administrador'
    )
  );

CREATE POLICY "Usuarios crean sus intentos"
  ON capacitaciones_intentos FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

-- Respuestas: vinculadas al intento del usuario
CREATE POLICY "Usuarios ven sus respuestas"
  ON capacitaciones_respuestas FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM capacitaciones_intentos i
      WHERE i.id = capacitaciones_respuestas.intento_id
        AND (i.usuario_id = auth.uid() OR auth.uid() IN (
          SELECT auth_user_id FROM usuario_nomina WHERE rol = 'administrador'
        ))
    )
  );

CREATE POLICY "Usuarios crean sus respuestas"
  ON capacitaciones_respuestas FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM capacitaciones_intentos i
      WHERE i.id = capacitaciones_respuestas.intento_id
        AND i.usuario_id = auth.uid()
    )
  );

-- =====================================================
-- Comentarios
-- =====================================================
COMMENT ON TABLE capacitaciones_cursos IS 'Cursos de capacitación publicados por el admin';
COMMENT ON TABLE capacitaciones_lecciones IS 'Lecciones dentro de un curso, con orden';
COMMENT ON TABLE capacitaciones_recursos IS 'Recursos multimedia de una lección (texto, video, imagen, documento)';
COMMENT ON TABLE capacitaciones_examenes IS 'Examen final asociado a un curso (1:1)';
COMMENT ON TABLE capacitaciones_preguntas IS 'Preguntas del examen';
COMMENT ON TABLE capacitaciones_opciones IS 'Opciones de respuesta con bandera de correcta';
COMMENT ON TABLE capacitaciones_progreso IS 'Progreso del usuario en cada lección';
COMMENT ON TABLE capacitaciones_intentos IS 'Intento único por usuario/examen con calificación';
COMMENT ON TABLE capacitaciones_respuestas IS 'Respuestas del usuario en un intento';