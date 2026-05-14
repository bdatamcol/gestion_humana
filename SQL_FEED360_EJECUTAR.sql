-- =============================================
-- FEED360 - Migration SQL para Supabase
-- Ejecutar este SQL en el SQL Editor de Supabase
-- =============================================

-- =============================================
-- 1. TABLAS
-- =============================================

-- Tabla de temáticas
CREATE TABLE IF NOT EXISTS tematicas_feed360 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo VARCHAR(255) NOT NULL,
    descripcion TEXT,
    fecha_inicio TIMESTAMPTZ NOT NULL,
    fecha_fin TIMESTAMPTZ NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'abierta' CHECK (estado IN ('abierta', 'cerrada', 'eliminada')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de publicaciones
CREATE TABLE IF NOT EXISTS publicaciones_feed360 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tematica_id UUID NOT NULL REFERENCES tematicas_feed360(id) ON DELETE CASCADE,
    usuario_id UUID NOT NULL REFERENCES usuario_nomina(id),
    imagen_url TEXT NOT NULL,
    texto TEXT,
    likes_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de likes
CREATE TABLE IF NOT EXISTS likes_feed360 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    publicacion_id UUID NOT NULL REFERENCES publicaciones_feed360(id) ON DELETE CASCADE,
    usuario_id UUID NOT NULL REFERENCES usuario_nomina(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(publicacion_id, usuario_id)
);

-- Tabla de comentarios
CREATE TABLE IF NOT EXISTS comentarios_feed360 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    publicacion_id UUID NOT NULL REFERENCES publicaciones_feed360(id) ON DELETE CASCADE,
    usuario_id UUID NOT NULL REFERENCES usuario_nomina(id),
    contenido TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 2. RLS (Row Level Security)
-- =============================================

ALTER TABLE tematicas_feed360 ENABLE ROW LEVEL SECURITY;
ALTER TABLE publicaciones_feed360 ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes_feed360 ENABLE ROW LEVEL SECURITY;
ALTER TABLE comentarios_feed360 ENABLE ROW LEVEL SECURITY;

-- Temáticas: cualquiera puede ver, admin puede gestionar
DROP POLICY IF EXISTS "Anyone can view active topics" ON tematicas_feed360;
CREATE POLICY "Anyone can view active topics"
    ON tematicas_feed360 FOR SELECT
    USING (estado IN ('abierta', 'cerrada'));

DROP POLICY IF EXISTS "Admin can manage topics" ON tematicas_feed360;
CREATE POLICY "Admin can manage topics"
    ON tematicas_feed360 FOR ALL
    USING (auth.role() = 'authenticated');

-- Publicaciones: todos pueden ver, usuarios autenticados pueden crear
DROP POLICY IF EXISTS "Anyone can view publications" ON publicaciones_feed360;
CREATE POLICY "Anyone can view publications"
    ON publicaciones_feed360 FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Authenticated users can create publications" ON publicaciones_feed360;
CREATE POLICY "Authenticated users can create publications"
    ON publicaciones_feed360 FOR INSERT
    WITH CHECK (auth.uid() = usuario_id);

DROP POLICY IF EXISTS "Users can delete own publications" ON publicaciones_feed360;
CREATE POLICY "Users can delete own publications"
    ON publicaciones_feed360 FOR DELETE
    USING (auth.uid() = usuario_id);

DROP POLICY IF EXISTS "Admin can manage publications" ON publicaciones_feed360;
CREATE POLICY "Admin can manage publications"
    ON publicaciones_feed360 FOR ALL
    USING (auth.role() = 'authenticated');

-- Likes
DROP POLICY IF EXISTS "Anyone can view likes" ON likes_feed360;
CREATE POLICY "Anyone can view likes"
    ON likes_feed360 FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Authenticated users can like" ON likes_feed360;
CREATE POLICY "Authenticated users can like"
    ON likes_feed360 FOR INSERT
    WITH CHECK (auth.uid() = usuario_id);

DROP POLICY IF EXISTS "Users can unlike" ON likes_feed360;
CREATE POLICY "Users can unlike"
    ON likes_feed360 FOR DELETE
    USING (auth.uid() = usuario_id);

-- Comentarios
DROP POLICY IF EXISTS "Anyone can view comments" ON comentarios_feed360;
CREATE POLICY "Anyone can view comments"
    ON comentarios_feed360 FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Authenticated users can comment" ON comentarios_feed360;
CREATE POLICY "Authenticated users can comment"
    ON comentarios_feed360 FOR INSERT
    WITH CHECK (auth.uid() = usuario_id);

DROP POLICY IF EXISTS "Users can delete own comments" ON comentarios_feed360;
CREATE POLICY "Users can delete own comments"
    ON comentarios_feed360 FOR DELETE
    USING (auth.uid() = usuario_id);

DROP POLICY IF EXISTS "Admin can manage comments" ON comentarios_feed360;
CREATE POLICY "Admin can manage comments"
    ON comentarios_feed360 FOR ALL
    USING (auth.role() = 'authenticated');

-- =============================================
-- 3. ÍNDICES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_publicaciones_tematica ON publicaciones_feed360(tematica_id);
CREATE INDEX IF NOT EXISTS idx_publicaciones_usuario ON publicaciones_feed360(usuario_id);
CREATE INDEX IF NOT EXISTS idx_publicaciones_created ON publicaciones_feed360(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_likes_publicacion ON likes_feed360(publicacion_id);
CREATE INDEX IF NOT EXISTS idx_comentarios_publicacion ON comentarios_feed360(publicacion_id);

-- =============================================
-- 4. FUNCIONES Y TRIGGERS
-- =============================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
DROP TRIGGER IF EXISTS tr_tematicas_updated ON tematicas_feed360;
CREATE TRIGGER tr_tematicas_updated
    BEFORE UPDATE ON tematicas_feed360
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS tr_publicaciones_updated ON publicaciones_feed360;
CREATE TRIGGER tr_publicaciones_updated
    BEFORE UPDATE ON publicaciones_feed360
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Función para incrementar likes
CREATE OR REPLACE FUNCTION increment_likes(pub_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE publicaciones_feed360
    SET likes_count = likes_count + 1
    WHERE id = pub_id;
END;
$$ LANGUAGE plpgsql;

-- Función para decrementar likes
CREATE OR REPLACE FUNCTION decrement_likes(pub_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE publicaciones_feed360
    SET likes_count = GREATEST(likes_count - 1, 0)
    WHERE id = pub_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 5. VERIFICACIÓN
-- =============================================

-- Verificar que las tablas se crearon
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE '%feed360%';