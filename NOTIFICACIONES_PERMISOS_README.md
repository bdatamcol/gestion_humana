# Notificaciones de Comentarios de Permisos

## Descripción

Este sistema implementa notificaciones automáticas para comentarios en solicitudes de permisos, siguiendo el mismo patrón utilizado para las notificaciones de comentarios de vacaciones.

## Archivos Creados/Modificados

### 1. Migración SQL
- **Archivo**: `db/migrations/20241219_setup_comentarios_permisos_notifications.sql`
- **Propósito**: Configura RLS, función de notificación y trigger para comentarios de permisos

### 2. Script de Configuración
- **Archivo**: `scripts/setup-comentarios-permisos-notifications.js`
- **Propósito**: Ejecuta la migración SQL y verifica la configuración

### 3. Script de Prueba
- **Archivo**: `scripts/test-comentarios-permisos-notifications.js`
- **Propósito**: Prueba el sistema de notificaciones creando comentarios de prueba

### 4. Componente de Notificaciones
- **Archivo**: `components/ui/notifications-dropdown.tsx`
- **Modificación**: Agregado soporte para el tipo `comentario_permisos`

## Funcionalidades Implementadas

### Políticas RLS (Row Level Security)
1. **Ver comentarios**: Todos los usuarios autenticados pueden ver comentarios
2. **Crear comentarios**: Usuarios autenticados pueden crear comentarios
3. **Actualizar comentarios**: Solo el autor puede actualizar sus comentarios
4. **Eliminar comentarios**: Solo el autor o administradores pueden eliminar

### Sistema de Notificaciones

#### Tipos de Notificaciones
- **Comentario nuevo**: Cuando alguien comenta en una solicitud de permisos
- **Respuesta a comentario**: Cuando alguien responde a un comentario existente

#### Destinatarios de Notificaciones

**Para comentarios nuevos:**
- Dueño de la solicitud (si no es quien comentó)
- Administradores y moderadores (si no son quienes comentaron)

**Para respuestas a comentarios:**
- Dueño de la solicitud (si no es quien respondió)
- Autor del comentario original (si es diferente al que responde y al dueño)

### Redirección
- Las notificaciones de tipo `comentario_permisos` redirigen a `/administracion/solicitudes/permisos`
- Icono utilizado: 💬 (emoji de comentario)

## Instrucciones de Implementación

### Paso 1: Ejecutar la Migración

```bash
# Opción 1: Usando el script de Node.js (requiere variables de entorno)
node scripts/setup-comentarios-permisos-notifications.js

# Opción 2: Ejecutar SQL directamente en Supabase
# Copiar y pegar el contenido de db/migrations/20241219_setup_comentarios_permisos_notifications.sql
# en el editor SQL de Supabase Dashboard
```

### Paso 2: Verificar la Implementación

```bash
# Ejecutar script de prueba
node scripts/test-comentarios-permisos-notifications.js
```

### Paso 3: Variables de Entorno Requeridas

Asegúrate de tener configuradas las siguientes variables en `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
```

## Verificación Manual

### 1. Verificar Políticas RLS

```sql
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies 
WHERE tablename = 'comentarios_permisos'
ORDER BY cmd, policyname;
```

### 2. Verificar Trigger

```sql
SELECT 
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'comentarios_permisos';
```

### 3. Verificar Función

```sql
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines 
WHERE routine_name = 'crear_notificacion_comentario_permisos';
```

## Prueba Manual

1. **Crear un comentario en una solicitud de permisos**
2. **Verificar que se crearon notificaciones**:
   ```sql
   SELECT * FROM notificaciones 
   WHERE tipo = 'comentario_permisos' 
   ORDER BY created_at DESC;
   ```
3. **Probar la redirección** haciendo clic en la notificación

## Estructura de la Notificación

```typescript
interface NotificacionComentarioPermisos {
  id: string
  tipo: 'comentario_permisos'
  titulo: string // 'Nuevo comentario en permisos' o 'Nueva respuesta en permisos'
  mensaje: string // '[Usuario] comentó en una solicitud de permisos'
  solicitud_id: string // ID de la solicitud de permisos
  usuario_id: string // ID del destinatario
  leida: boolean
  created_at: string
}
```

## Notas Técnicas

- La función `crear_notificacion_comentario_permisos()` se ejecuta automáticamente después de cada INSERT en `comentarios_permisos`
- Se evita crear notificaciones duplicadas verificando que el usuario que comenta no sea el mismo que recibe la notificación
- El sistema maneja tanto comentarios nuevos como respuestas a comentarios existentes
- Las notificaciones se crean de forma asíncrona sin afectar la operación principal

## Troubleshooting

### Error: "función no existe"
- Verificar que la migración SQL se ejecutó correctamente
- Revisar que la función `crear_notificacion_comentario_permisos` existe en la base de datos

### Error: "trigger no existe"
- Verificar que el trigger `trigger_notificar_comentario_permisos` está creado
- Revisar que está asociado a la tabla `comentarios_permisos`

### No se crean notificaciones
- Verificar que el usuario que comenta es diferente al dueño de la solicitud
- Revisar los logs de la base de datos para errores en la función
- Ejecutar el script de prueba para diagnosticar el problema