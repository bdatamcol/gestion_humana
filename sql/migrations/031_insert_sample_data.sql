-- Insertar datos de ejemplo para probar las secciones de la página principal
-- Este archivo contiene publicaciones de ejemplo para cada tipo de sección

-- Primero, obtener IDs de categorías y usuarios para las relaciones
-- Nota: Este script asume que ya existen categorías y usuarios en el sistema

-- Insertar publicaciones de ejemplo para BIENESTAR
INSERT INTO publicaciones_bienestar (
  titulo,
  contenido,
  categoria_id,
  autor_id,
  estado,
  tipo_seccion,
  vistas,
  destacado,
  fecha_publicacion
) VALUES 
(
  'Beneficios del Ejercicio Regular',
  '<p>El ejercicio regular no solo mejora tu condición física, sino que también tiene un impacto positivo en tu salud mental. Estudios demuestran que 30 minutos de actividad física diaria pueden reducir significativamente el estrés y mejorar tu estado de ánimo.</p><p>Te recomendamos incorporar actividades como caminar, nadar o hacer yoga en tu rutina diaria.</p>',
  (SELECT id FROM categorias_bienestar WHERE nombre = 'Ejercicio y Fitness' LIMIT 1),
  (SELECT auth_user_id FROM usuario_nomina WHERE rol = 'administrador' LIMIT 1),
  'publicado',
  'bienestar',
  45,
  true,
  NOW() - INTERVAL '2 days'
),
(
  'Alimentación Saludable en el Trabajo',
  '<p>Mantener una alimentación balanceada durante la jornada laboral es fundamental para tu productividad y bienestar. Aquí te compartimos algunos consejos prácticos:</p><ul><li>Planifica tus comidas con anticipación</li><li>Incluye frutas y verduras en cada comida</li><li>Mantente hidratado bebiendo suficiente agua</li><li>Evita el exceso de cafeína y azúcar</li></ul>',
  (SELECT id FROM categorias_bienestar WHERE nombre = 'Nutrición' LIMIT 1),
  (SELECT auth_user_id FROM usuario_nomina WHERE rol = 'administrador' LIMIT 1),
  'publicado',
  'bienestar',
  32,
  false,
  NOW() - INTERVAL '5 days'
);

-- Insertar publicaciones de ejemplo para ACTIVIDADES
INSERT INTO publicaciones_bienestar (
  titulo,
  contenido,
  categoria_id,
  autor_id,
  estado,
  tipo_seccion,
  vistas,
  destacado,
  fecha_publicacion
) VALUES 
(
  'Torneo de Fútbol Empresarial 2024',
  '<p>¡Se acerca nuestro torneo anual de fútbol! Este año contaremos con la participación de todas las sedes de la empresa.</p><p><strong>Fechas importantes:</strong></p><ul><li>Inscripciones: hasta el 15 de febrero</li><li>Inicio del torneo: 1 de marzo</li><li>Final: 15 de abril</li></ul><p>¡Forma tu equipo y participa en esta gran celebración deportiva!</p>',
  (SELECT id FROM categorias_bienestar WHERE nombre = 'Actividades - Deportivas' LIMIT 1),
  (SELECT auth_user_id FROM usuario_nomina WHERE rol = 'administrador' LIMIT 1),
  'publicado',
  'actividades',
  78,
  true,
  NOW() - INTERVAL '1 day'
),
(
  'Taller de Liderazgo y Trabajo en Equipo',
  '<p>Te invitamos a participar en nuestro taller de desarrollo de habilidades de liderazgo.</p><p><strong>Detalles del evento:</strong></p><ul><li>Fecha: 25 de febrero</li><li>Hora: 2:00 PM - 6:00 PM</li><li>Lugar: Auditorio principal</li><li>Facilitador: Experto en desarrollo organizacional</li></ul><p>Inscríbete en recursos humanos antes del 20 de febrero.</p>',
  (SELECT id FROM categorias_bienestar WHERE nombre = 'Actividades - Capacitación' LIMIT 1),
  (SELECT auth_user_id FROM usuario_nomina WHERE rol = 'administrador' LIMIT 1),
  'publicado',
  'actividades',
  56,
  false,
  NOW() - INTERVAL '3 days'
);

-- Insertar publicaciones de ejemplo para SST
INSERT INTO publicaciones_bienestar (
  titulo,
  contenido,
  categoria_id,
  autor_id,
  estado,
  tipo_seccion,
  vistas,
  destacado,
  fecha_publicacion
) VALUES 
(
  'Protocolo de Evacuación Actualizado',
  '<p>Se ha actualizado nuestro protocolo de evacuación de emergencias. Es importante que todos los colaboradores conozcan los nuevos procedimientos.</p><p><strong>Puntos clave del nuevo protocolo:</strong></p><ul><li>Nuevas rutas de evacuación señalizadas</li><li>Puntos de encuentro actualizados</li><li>Procedimientos para personas con movilidad reducida</li><li>Roles de los brigadistas de emergencia</li></ul><p>La capacitación obligatoria se realizará la próxima semana.</p>',
  (SELECT id FROM categorias_bienestar WHERE nombre = 'SST - Emergencias' LIMIT 1),
  (SELECT auth_user_id FROM usuario_nomina WHERE rol = 'administrador' LIMIT 1),
  'publicado',
  'sst',
  92,
  true,
  NOW() - INTERVAL '4 days'
),
(
  'Uso Correcto de Elementos de Protección Personal',
  '<p>Recordamos la importancia del uso adecuado de los elementos de protección personal (EPP) en todas las áreas de trabajo.</p><p><strong>EPP obligatorios por área:</strong></p><ul><li>Área de producción: Casco, gafas de seguridad, guantes</li><li>Laboratorio: Bata, gafas, guantes nitrilo</li><li>Almacén: Casco, chaleco reflectivo, zapatos de seguridad</li></ul><p>Recuerda que el uso de EPP es obligatorio y contribuye a tu seguridad.</p>',
  (SELECT id FROM categorias_bienestar WHERE nombre = 'SST - Equipos' LIMIT 1),
  (SELECT auth_user_id FROM usuario_nomina WHERE rol = 'administrador' LIMIT 1),
  'publicado',
  'sst',
  67,
  false,
  NOW() - INTERVAL '6 days'
);

-- Insertar publicaciones de ejemplo para NORMATIVIDAD
INSERT INTO publicaciones_bienestar (
  titulo,
  contenido,
  categoria_id,
  autor_id,
  estado,
  tipo_seccion,
  vistas,
  destacado,
  fecha_publicacion
) VALUES 
(
  'Actualización del Código de Conducta 2024',
  '<p>Se ha actualizado nuestro Código de Conducta empresarial con nuevas directrices y políticas.</p><p><strong>Principales actualizaciones:</strong></p><ul><li>Políticas de trabajo remoto e híbrido</li><li>Uso responsable de redes sociales</li><li>Prevención del acoso laboral</li><li>Manejo de información confidencial</li></ul><p>Todos los colaboradores deben revisar y firmar el nuevo código antes del 28 de febrero.</p>',
  (SELECT id FROM categorias_bienestar WHERE nombre = 'Normatividad - Administrativa' LIMIT 1),
  (SELECT auth_user_id FROM usuario_nomina WHERE rol = 'administrador' LIMIT 1),
  'publicado',
  'normatividad',
  134,
  true,
  NOW() - INTERVAL '1 day'
),
(
  'Nueva Ley de Protección de Datos Personales',
  '<p>Entra en vigencia la nueva normativa sobre protección de datos personales que afecta el manejo de información en nuestra empresa.</p><p><strong>Aspectos importantes:</strong></p><ul><li>Consentimiento explícito para el tratamiento de datos</li><li>Derecho al olvido y portabilidad de datos</li><li>Notificación obligatoria de brechas de seguridad</li><li>Designación de un oficial de protección de datos</li></ul><p>Se realizarán capacitaciones específicas para cada área.</p>',
  (SELECT id FROM categorias_bienestar WHERE nombre = 'Normatividad - Legal' LIMIT 1),
  (SELECT auth_user_id FROM usuario_nomina WHERE rol = 'administrador' LIMIT 1),
  'publicado',
  'normatividad',
  89,
  false,
  NOW() - INTERVAL '7 days'
);

-- Comentario para documentación
COMMENT ON TABLE publicaciones_bienestar IS 'Datos de ejemplo insertados para probar las secciones de la página principal';
