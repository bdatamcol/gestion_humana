-- La empresa del acta corresponde al receptor. El manifiesto solo se
-- incorpora a nuevas actas y borradores para no alterar contenido firmado.

ALTER TABLE actas_entrega
  ADD COLUMN IF NOT EXISTS manifiesto TEXT;

UPDATE actas_entrega
SET manifiesto = $manifesto$Al firmar la presente acta, la persona receptora manifiesta:

1. Que es responsable del bien y/o suministro que recibe mediante esta acta, así como de su adecuado y buen uso a partir de la fecha.
2. Que, en caso de daño, deterioro o pérdida, se hará responsable del mismo.
3. Que, si el bien y/o suministro es entregado posteriormente a otro colaborador, deberá formalizar dicha entrega mediante una nueva acta, incluyendo las recomendaciones adicionales a que haya lugar.$manifesto$
WHERE estado = 'borrador'
  AND manifiesto IS NULL;

UPDATE actas_entrega AS a
SET empresa_id = receptor.empresa_id,
    empresa_nombre = empresa.nombre,
    updated_at = now()
FROM usuario_nomina AS receptor
JOIN empresas AS empresa ON empresa.id = receptor.empresa_id
WHERE a.receptor_id = receptor.auth_user_id
  AND a.estado = 'borrador';
