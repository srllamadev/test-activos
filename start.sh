#!/bin/bash

# Script para iniciar ambos servicios (backend y frontend)

echo "🚀 Iniciando sistema de Gestión de Activos y Riesgos"
echo ""

# Verificar si estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    echo "❌ Error: Ejecuta este script desde el directorio raíz del proyecto"
    exit 1
fi

# Función para limpiar procesos al salir
cleanup() {
    echo ""
    echo "🛑 Deteniendo servicios..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    echo "✅ Servicios detenidos"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Iniciar backend
echo "📦 Iniciando backend (FastAPI)..."
cd backend

# Verificar si existe el entorno virtual
if [ ! -d "venv" ]; then
    echo "⚠️  Entorno virtual no encontrado. Creando..."
    python -m venv venv
fi

# Activar entorno virtual
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    source venv/Scripts/activate
else
    source venv/bin/activate
fi

# Instalar dependencias si es necesario
if [ ! -f "venv/.installed" ]; then
    echo "📥 Instalando dependencias del backend..."
    pip install -r requirements.txt
    touch venv/.installed
fi

# Iniciar backend en background
uvicorn app.main:app --reload --port 8000 &
BACKEND_PID=$!
echo "✅ Backend iniciado en http://localhost:8000 (PID: $BACKEND_PID)"
echo "📖 Documentación API: http://localhost:8000/docs"

cd ..

# Iniciar frontend
echo ""
echo "📦 Iniciando frontend (Next.js)..."
npm run dev &
FRONTEND_PID=$!
echo "✅ Frontend iniciado en http://localhost:3000 (PID: $FRONTEND_PID)"

echo ""
echo "🎉 Sistema iniciado correctamente!"
echo ""
echo "📋 URLs de acceso:"
echo "   • Frontend: http://localhost:3000"
echo "   • Backend API: http://localhost:8000"
echo "   • Documentación API: http://localhost:8000/docs"
echo ""
echo "🔐 Credenciales por defecto:"
echo "   • Email: admin@ejemplo.com"
echo "   • Password: Admin123!Seguro"
echo ""
echo "Presiona Ctrl+C para detener ambos servicios"

# Esperar a que los procesos terminen
wait
