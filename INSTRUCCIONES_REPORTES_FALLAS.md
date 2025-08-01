# 📋 Instrucciones para Configurar Reportes de Fallas

## 🚨 Configuración Requerida

Para que la funcionalidad de **Reporte de Fallas** funcione correctamente, necesitas ejecutar la migración SQL en tu base de datos de Supabase.

## 📝 Pasos para Configurar:

### 1. Acceder al Dashboard de Supabase
1. Ve a [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto
3. Ve a la sección **SQL Editor** en el menú lateral

### 2. Ejecutar la Migración SQL
1. Abre el archivo: `sql/migrations/create_reportes_fallas_table.sql`
2. Copia todo el contenido del archivo
3. Pégalo en el SQL Editor de Supabase
4. Haz clic en **Run** para ejecutar la migración

### 3. Crear el Bucket para Imágenes
1. Ve a la sección **Storage** en el menú lateral
2. Haz clic en **Create Bucket**
3. Nombre del bucket: `fallas`
4. Marca como **Public bucket**: ✅
5. Haz clic en **Create bucket**

### 4. Configurar Políticas de Storage (Opcional)
Si necesitas políticas específicas para el bucket, puedes ejecutar las consultas comentadas al final del archivo SQL.

## ✅ Verificación

Después de ejecutar la migración:

1. **Verifica la tabla**: En el dashboard, ve a **Table Editor** y busca `reportes_fallas`
2. **Verifica el bucket**: En **Storage**, debe aparecer el bucket `fallas`
3. **Prueba la funcionalidad**: Ve a `/perfil/reporte-fallas` en tu aplicación

## 🔧 Estructura de la Tabla

La tabla `reportes_fallas` incluye:

- `id`: UUID único del reporte
- `usuario_id`: ID del usuario que creó el reporte
- `tipo_falla`: Tipo de falla seleccionado
- `descripcion`: Descripción detallada del problema
- `imagen_path`: Ruta de la imagen adjunta (opcional)
- `estado`: Estado del reporte (pendiente, en_proceso, resuelto, cerrado)
- `fecha_creacion`: Fecha de creación
- `fecha_actualizacion`: Fecha de última actualización
- `resuelto_por`: ID del usuario que resolvió (para administradores)
- `fecha_resolucion`: Fecha de resolución
- `comentarios_resolucion`: Comentarios de resolución

## 🛡️ Seguridad

La tabla incluye:
- **Row Level Security (RLS)** habilitado
- **Políticas** para que usuarios vean solo sus reportes
- **Políticas** para que administradores vean todos los reportes
- **Índices** para optimizar consultas
- **Triggers** para actualización automática de fechas

## 🎯 Estados de Reportes

- **Pendiente**: Reporte recién enviado, esperando revisión
- **En Proceso**: Reporte siendo trabajado por el equipo técnico
- **Resuelto**: Problema solucionado
- **Cerrado**: Reporte cerrado (resuelto o descartado)

---

**Nota**: Una vez ejecutada la migración, la funcionalidad estará completamente operativa y los usuarios podrán enviar reportes de fallas con imágenes adjuntas.