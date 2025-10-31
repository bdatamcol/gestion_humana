-- Add visto_usuario field to comentarios_certificacion table
-- This field tracks whether a comment has been seen by the user

ALTER TABLE comentarios_certificacion ADD COLUMN visto_usuario BOOLEAN DEFAULT FALSE;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_comentarios_certificacion_visto_usuario ON comentarios_certificacion(visto_usuario);

-- Update existing comments to be marked as not seen
UPDATE comentarios_certificacion SET visto_usuario = FALSE;
