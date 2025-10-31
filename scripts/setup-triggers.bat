@echo off
echo Ejecutando migracion de triggers de notificaciones...

:: Configurar variables de entorno desde .env.local
for /f "tokens=1,2 delims==" %%a in ('type .env.local ^| findstr /v "^#"') do (
    if "%%a"=="DATABASE_URL" set DB_URL=%%b
)

:: Extraer componentes de la URL de la base de datos
:: Formato: postgresql://user:password@host:port/database
for /f "tokens=1,2,3,4,5 delims=/:@" %%a in ("%DB_URL:~13%") do (
    set DB_USER=%%a
    set DB_PASS=%%b
    set DB_HOST=%%c
    set DB_PORT=%%d
    set DB_NAME=%%e
)

echo Conectando a la base de datos...
echo Host: %DB_HOST%
echo Puerto: %DB_PORT%
echo Base de datos: %DB_NAME%
echo Usuario: %DB_USER%

:: Ejecutar el archivo SQL
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -f sql\migrations\024_create_notification_triggers.sql

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ Triggers de notificaciones creados exitosamente
) else (
    echo.
    echo ❌ Error al crear los triggers
)

pause
