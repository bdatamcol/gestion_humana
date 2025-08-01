# Notificaciones de Comentarios de Incapacidades

Este documento describe la implementación del sistema de notificaciones automáticas para comentarios en incapacidades.

## Archivos Creados/Modificados

### Nuevos Archivos

1. **`db/migrations/20241219_create_comentarios_incapacidades_table.sql`**
   - Define la estructura de la tabla `comentarios_incapacidades`
   - Incluye índices para optimizar consultas

2. **`db/migrations/20241219_setup_comentarios_incapacidades_notifications.sql`**
   - Configura políticas RLS para la tabla `comentarios_incapacidades`
   - Implementa la función `crear_notificacion_comentario_incapacidades()`
   - Crea el trigger `trigger_notificar_comentario_incapacidades`

3. **`scripts/setup-comentarios-incapacidades-notifications.js`**
   - Script para ejecutar la migración de notificaciones
   - Verifica la correcta creación del trigger

4. **`scripts/test-comentarios-incapacidades-notifications.js`**
   - Script de prueba para verificar el funcionamiento del sistema
   - Crea comentarios de prueba y verifica las notificaciones generadas

### Archivos Modificados

1. **`components/ui/notifications-dropdown.tsx`**
   - Agregado soporte para el tipo `comentario_incapacidades`
   - Configurado icono (💬) y URL de redirección

## Estructura de la Tabla

```sql
CREATE TABLE comentarios_incapacidades (
  id SERIAL PRIMARY KEY,
  incapacidad_id UUID NOT NULL REFERENCES incapacidades(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES usuario_nomina(auth_user_id) ON DELETE CASCADE,
  contenido TEXT NOT NULL,
  fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  respuesta_a INTEGER REFERENCES comentarios_incapacidades(id) ON DELETE CASCADE,
  leido BOOLEAN DEFAULT FALSE,
  visto_admin BOOLEAN DEFAULT FALSE
);
```

## Políticas RLS

### Política de Lectura
- Los usuarios pueden ver comentarios de sus propias incapacidades
- Los administradores pueden ver todos los comentarios

### Política de Inserción
- Los usuarios pueden comentar en sus propias incapacidades
- Los administradores pueden comentar en cualquier incapacidad

### Políticas de Actualización y Eliminación
- Solo el autor del comentario puede modificarlo o eliminarlo
- Los administradores tienen permisos completos

## Sistema de Notificaciones

### Tipos de Notificación

- **Tipo**: `comentario_incapacidades`
- **Icono**: 💬
- **Redirección**: `/administracion/novedades/incapacidades`

### Destinatarios de Notificaciones

#### Para Comentarios Nuevos
1. **Propietario de la incapacidad** (si no es quien comenta)
   - Título: "Nuevo comentario en tu incapacidad"
   - Mensaje: "[Usuario] comentó en tu incapacidad"

2. **Administradores y Moderadores** (excepto quien comenta)
   - Título: "Nuevo comentario en incapacidad"
   - Mensaje: "[Usuario] comentó en una incapacidad"

#### Para Respuestas a Comentarios
1. **Autor del comentario original** (si no es quien responde)
   - Título: "Nueva respuesta a tu comentario"
   - Mensaje: "[Usuario] respondió a tu comentario en una incapacidad"

2. **Propietario de la incapacidad** (si no es el autor original ni quien responde)
   - Título: "Nueva respuesta en tu incapacidad"
   - Mensaje: "[Usuario] respondió a un comentario en tu incapacidad"

3. **Administradores y Moderadores** (excepto quien responde)
   - Título: "Nuevo comentario en incapacidad"
   - Mensaje: "[Usuario] respondió a un comentario en una incapacidad"

## Lógica de Redirección

Cuando un usuario hace clic en una notificación de `comentario_incapacidades`, será redirigido a:
- **Administradores**: `/administracion/novedades/incapacidades`
- **Usuarios regulares**: La misma URL (pueden acceder a sus propias incapacidades)

## Implementación

### Paso 1: Ejecutar Migraciones

```bash
# Ejecutar script de configuración
node scripts/setup-comentarios-incapacidades-notifications.js
```

### Paso 2: Verificar Implementación

```bash
# Ejecutar script de prueba
node scripts/test-comentarios-incapacidades-notifications.js
```

### Paso 3: Verificar en la Aplicación

1. Navegar a una incapacidad
2. Agregar un comentario
3. Verificar que se generen las notificaciones correspondientes
4. Comprobar que las notificaciones redirijan correctamente

## Funcionalidades Implementadas

✅ **Notificaciones automáticas** para nuevos comentarios y respuestas
✅ **Determinación inteligente de destinatarios** basada en roles y relaciones
✅ **Políticas RLS** para seguridad de datos
✅ **Integración con el dropdown de notificaciones**
✅ **Redirección correcta** al hacer clic en notificaciones
✅ **Scripts de configuración y prueba**
✅ **Documentación completa**

## Troubleshooting

### Problema: No se generan notificaciones
**Solución**: Verificar que el trigger esté activo:
```sql
SELECT * FROM information_schema.triggers 
WHERE trigger_name = 'trigger_notificar_comentario_incapacidades';
```

### Problema: Error de permisos RLS
**Solución**: Verificar que las políticas RLS estén configuradas correctamente:
```sql
SELECT * FROM pg_policies WHERE tablename = 'comentarios_incapacidades';
```

### Problema: Notificaciones duplicadas
**Solución**: Verificar que no existan triggers duplicados y que la lógica de destinatarios esté funcionando correctamente.

## Notas Técnicas

- El sistema utiliza la misma arquitectura que las notificaciones de vacaciones y permisos
- Las notificaciones se crean automáticamente mediante triggers de base de datos
- La función de notificación maneja tanto comentarios nuevos como respuestas
- Se evitan notificaciones circulares (el autor no se notifica a sí mismo)
- Los administradores reciben notificaciones de toda la actividad de comentarios