@echo off
echo ========================================
echo   CONFIGURACION DE LIMPIEZA AUTOMATICA
echo   Sistema de Usuarios en Linea
echo ========================================
echo.

echo Ejecutando migracion de limpieza automatica...
node run-cleanup-migration.js

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo   CONFIGURACION COMPLETADA EXITOSAMENTE
    echo ========================================
    echo.
    echo El sistema ahora incluye:
    echo - Limpieza automatica cada 90 segundos
    echo - Trigger de base de datos para limpieza
    echo - Heartbeat mas frecuente (20 segundos)
    echo - Mejor deteccion de desconexiones abruptas
    echo.
) else (
    echo.
    echo ========================================
    echo   ERROR EN LA CONFIGURACION
    echo ========================================
    echo.
    echo Por favor revisa los logs arriba para mas detalles.
    echo.
)

echo Presiona cualquier tecla para continuar...
pause >nul
