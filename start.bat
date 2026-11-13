@echo off
setlocal enabledelayedexpansion

echo Iniciando sistema de Gestion de Activos y Riesgos
echo.

REM Verificar si estamos en el directorio correcto
if not exist "package.json" (
    echo Error: Ejecuta este script desde el directorio raiz del proyecto
    exit /b 1
)

REM Iniciar backend
echo Iniciando backend (FastAPI)...
cd backend

REM Verificar si existe el entorno virtual
if not exist "venv" (
    echo Entorno virtual no encontrado. Creando...
    python -m venv venv
)

REM Activar entorno virtual
call venv\Scripts\activate.bat

REM Instalar dependencias si es necesario
if not exist "venv\.installed" (
    echo Instalando dependencias del backend...
    pip install -r requirements.txt
    echo. > venv\.installed
)

REM Iniciar backend en background
start "Backend FastAPI" cmd /c "uvicorn app.main:app --reload --port 8000"
echo Backend iniciado en http://localhost:8000
echo Documentacion API: http://localhost:8000/docs

cd ..

REM Iniciar frontend
echo.
echo Iniciando frontend (Next.js)...
start "Frontend Next.js" cmd /c "npm run dev"
echo Frontend iniciado en http://localhost:3000

echo.
echo Sistema iniciado correctamente!
echo.
echo URLs de acceso:
echo    - Frontend: http://localhost:3000
echo    - Backend API: http://localhost:8000
echo    - Documentacion API: http://localhost:8000/docs
echo.
echo Credenciales por defecto:
echo    - Email: admin@ejemplo.com
echo    - Password: Admin123!Seguro
echo.
echo Cierra las ventanas de consola para detener los servicios

pause
