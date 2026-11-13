# Backend - Activos y Riesgos API

Backend desarrollado con FastAPI para la gestión de activos de información y evaluación de riesgos.

## 🏗️ Arquitectura

- **Framework**: FastAPI
- **Base de datos**: PostgreSQL (Supabase)
- **ORM**: SQLAlchemy
- **Validación**: Pydantic
- **Autenticación**: JWT

## 📁 Estructura

```
backend/
├── app/
│   ├── api/              # Endpoints
│   │   └── v1/           # API versión 1
│   │       ├── auth.py   # Autenticación
│   │       ├── assets.py # Activos
│   │       ├── risks.py  # Riesgos
│   │       └── ...
│   ├── core/             # Configuración y seguridad
│   │   ├── config.py
│   │   └── security.py
│   ├── models/           # Modelos SQLAlchemy
│   │   └── models.py
│   ├── schemas/          # Schemas Pydantic
│   │   ├── user.py
│   │   ├── organization.py
│   │   ├── asset.py
│   │   └── risk.py
│   ├── database.py       # Conexión a DB
│   └── main.py           # App principal
└── requirements.txt
```

## 🚀 Instalación

1. Crear entorno virtual:
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Linux/Mac
# o
venv\Scripts\activate     # Windows
```

2. Instalar dependencias:
```bash
pip install -r requirements.txt
```

3. Configurar variables de entorno:
```bash
cp .env.example .env
# Editar .env con tus credenciales de Supabase
```

4. Ejecutar el servidor:
```bash
uvicorn app.main:app --reload
```

## 📡 Endpoints

La API estará disponible en: `http://localhost:8000`

### Documentación interactiva:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### Endpoints principales:

#### Autenticación
- `POST /api/v1/auth/register` - Registrar usuario
- `POST /api/v1/auth/login` - Iniciar sesión

#### Activos
- `GET /api/v1/assets` - Listar activos
- `GET /api/v1/assets/{id}` - Obtener activo
- `POST /api/v1/assets` - Crear activo
- `PUT /api/v1/assets/{id}` - Actualizar activo
- `DELETE /api/v1/assets/{id}` - Archivar activo

#### Riesgos
- `GET /api/v1/risks` - Listar riesgos
- `GET /api/v1/risks/{id}` - Obtener riesgo
- `POST /api/v1/risks` - Crear riesgo
- `PUT /api/v1/risks/{id}` - Actualizar riesgo
- `DELETE /api/v1/risks/{id}` - Archivar riesgo

## 🔐 Seguridad

- Autenticación JWT
- Hash de contraseñas con bcrypt
- CORS configurado para frontend
- Validación de datos con Pydantic
