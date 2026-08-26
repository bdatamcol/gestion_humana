-- Rol de consulta global, limitado al modulo de actas de entrega.

ALTER TABLE usuario_nomina DROP CONSTRAINT IF EXISTS usuario_nomina_rol_check;
ALTER TABLE usuario_nomina
  ADD CONSTRAINT usuario_nomina_rol_check
  CHECK (rol IN ('usuario', 'jefe', 'administrador', 'gestor_actas'));

DROP POLICY IF EXISTS "Participantes y admin ven actas" ON actas_entrega;
CREATE POLICY "Participantes admin y gestor ven actas"
  ON actas_entrega FOR SELECT
  USING (
    auth.uid() IN (entregante_id, receptor_id) OR EXISTS (
      SELECT 1
      FROM usuario_nomina u
      WHERE u.auth_user_id = auth.uid()
        AND u.estado = 'activo'
        AND u.rol IN ('administrador', 'gestor_actas')
    )
  );
