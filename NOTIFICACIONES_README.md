# Sistema de Notificaciones en Tiempo Real

Este documento describe la implementación del sistema de notificaciones en tiempo real para la aplicación de gestión humana.

## Características Implementadas

### ✅ Funcionalidades Completadas

1. **Notificaciones Automáticas**: Se crean automáticamente cuando:
   - Un usuario envía una nueva solicitud de certificación laboral
   - Un usuario envía una nueva solicitud de vacaciones
   - Un usuario envía una nueva solicitud de permisos
   - Un usuario registra una nueva incapacidad

2. **Panel de Administración**: 
   - Icono de notificaciones en la esquina superior derecha
   - Dropdown con lista de notificaciones
   - Contador de notificaciones no leídas
   - Opción para marcar como leídas individualmente o todas a la vez

3. **Tiempo Real**: 
   - Utiliza Supabase Realtime para actualizaciones instantáneas
   - Las notificaciones aparecen inmediatamente sin necesidad de recargar

4. **Base de Datos**:
   - Tabla `notificaciones` con políticas RLS (Row Level Security)
   - Índices optimizados para consultas rápidas
   - Triggers automáticos para actualizar timestamps

## Estructura de Archivos

### Archivos Creados/Modificados

```
├── sql/migrations/
│   └── 023_create_notificaciones_table.sql    # Migración de BD
├── scripts/
│   └── setup-notifications.sql                # Script de configuración
├── lib/
│   └── notificaciones.ts                      # Funciones helper
├── components/ui/
│   └── notifications-dropdown.tsx             # Componente de notificaciones
├── app/api/notificaciones/
│   └── route.ts                               # API endpoints
├── app/administracion/
│   └── layout.tsx                             # Layout con notificaciones
└── app/perfil/solicitudes/
    ├── certificacion-laboral/page.tsx         # Modificado
    ├── vacaciones/page.tsx                    # Modificado
    ├── permisos/page.tsx                      # Modificado
    └── ../novedades/incapacidades/page.tsx    # Modificado
```

## Configuración

### 1. Base de Datos

Ejecuta el script de configuración en la consola SQL de Supabase:

```sql
-- Ejecutar el contenido de scripts/setup-notifications.sql
```

### 2. Realtime

Asegúrate de que Supabase Realtime esté habilitado para la tabla `notificaciones`:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE notificaciones;
```

### 3. Políticas RLS

Las políticas ya están configuradas en el script, pero verifica que estén activas:

- Los usuarios solo pueden ver sus propias notificaciones
- Solo administradores/moderadores pueden crear notificaciones
- Los usuarios pueden marcar sus notificaciones como leídas

## API Endpoints

### GET `/api/notificaciones`

Obtiene las notificaciones del usuario autenticado.

**Parámetros de consulta:**
- `page`: Número de página (default: 1)
- `limit`: Límite por página (default: 10)
- `unread_only`: Solo no leídas (default: false)

**Respuesta:**
```json
{
  "notificaciones": [...],
  "total": 25,
  "unread_count": 5
}
```

### POST `/api/notificaciones`

Crea una nueva notificación (solo admin/moderador).

**Body:**
```json
{
  "usuario_id": "uuid",
  "tipo": "certificacion_laboral",
  "titulo": "Nueva solicitud",
  "mensaje": "Descripción...",
  "solicitud_id": "uuid" // opcional
}
```

### PATCH `/api/notificaciones`

Marca notificaciones como leídas.

**Body:**
```json
{
  "notification_ids": ["uuid1", "uuid2"], // opcional
  "mark_all_read": true // opcional
}
```

## Componentes

### NotificationsDropdown

Componente principal que maneja:
- Estado de las notificaciones
- Suscripción a Realtime
- Interfaz de usuario
- Acciones (marcar como leída, ver todas)

**Props:** Ninguna (obtiene datos automáticamente)

**Uso:**
```tsx
import { NotificationsDropdown } from '@/components/ui/notifications-dropdown'

<NotificationsDropdown />
```

## Funciones Helper

### `crearNotificacionNuevaSolicitud`

Crea notificaciones para administradores cuando hay nuevas solicitudes.

**Parámetros:**
```typescript
{
  tipo: 'certificacion_laboral' | 'vacaciones' | 'permisos' | 'incapacidades',
  solicitud_id: string,
  usuario_solicitante_id: string,
  nombre_usuario: string
}
```

### `crearNotificacionCambioEstado`

Crea notificaciones para usuarios cuando cambia el estado de sus solicitudes.

### `obtenerConteoNotificacionesNoLeidas`

Obtiene el conteo de notificaciones no leídas para un usuario.

## Tipos de Notificaciones

1. **certificacion_laboral**: Nuevas solicitudes de certificación laboral
2. **vacaciones**: Nuevas solicitudes de vacaciones
3. **permisos**: Nuevas solicitudes de permisos
4. **incapacidades**: Nuevas incapacidades registradas

## Seguridad

- **RLS habilitado**: Solo usuarios autorizados pueden acceder a sus datos
- **Autenticación requerida**: Todos los endpoints requieren autenticación
- **Roles verificados**: Solo admin/moderador pueden crear notificaciones
- **Validación de datos**: Todos los inputs son validados

## Rendimiento

- **Índices optimizados**: Para consultas rápidas por usuario, estado y fecha
- **Paginación**: Las consultas están paginadas para evitar sobrecarga
- **Realtime eficiente**: Solo se suscriben a cambios relevantes
- **Lazy loading**: Las notificaciones se cargan bajo demanda

## Próximos Pasos (Opcionales)

1. **Notificaciones por email**: Integrar con servicio de email
2. **Push notifications**: Para dispositivos móviles
3. **Configuración de usuario**: Permitir personalizar tipos de notificaciones
4. **Historial extendido**: Archivo de notificaciones antiguas
5. **Métricas**: Dashboard de estadísticas de notificaciones

## Troubleshooting

### Notificaciones no aparecen
1. Verificar que RLS esté configurado correctamente
2. Comprobar que Realtime esté habilitado
3. Revisar logs de la consola del navegador

### Realtime no funciona
1. Verificar configuración de Supabase Realtime
2. Comprobar que la tabla esté en la publicación
3. Revisar políticas RLS

### Errores de permisos
1. Verificar rol del usuario en `usuario_nomina`
2. Comprobar políticas RLS
3. Verificar autenticación

## Soporte

Para problemas o preguntas sobre el sistema de notificaciones, revisar:
1. Logs de la aplicación
2. Logs de Supabase
3. Políticas RLS en la base de datos
4. Estado de Realtime en Supabase Dashboard