# Sistema de Gestión de Activos y Riesgos

Sistema web completo para la gestión de activos de información y evaluación de riesgos, desarrollado con arquitectura moderna de tres capas.

## 🏗️ Arquitectura

```
┌─────────────────┐
│   Frontend      │
│   (Next.js)     │
│   Puerto 3000   │
└────────┬────────┘
         │ HTTP/REST
         ▼
┌─────────────────┐      ┌──────────────┐
│   Backend       │◄────►│  Supabase    │
│   (FastAPI)     │      │  (Solo DB)   │
│   Puerto 8000   │      │  PostgreSQL  │
└─────────────────┘      └──────────────┘
```

### Componentes

- **Frontend**: Next.js 16 + React 19 + TypeScript + Tailwind CSS + daisyUI
- **Backend**: FastAPI (Python) + SQLAlchemy + Pydantic
- **Base de datos**: PostgreSQL en Supabase
- **Autenticación**: JWT (JSON Web Tokens)

## 🚀 Inicio Rápido

### Prerrequisitos

- Node.js 18+ y npm
- Python 3.10+
- Cuenta en Supabase (gratuita)

### Instalación

1. **Clonar o descargar el proyecto**
   ```bash
   cd test-activos
   ```

2. **Instalar dependencias del frontend**
   ```bash
   npm install
   ```

3. **Configurar el backend**
   ```bash
   cd backend
   python -m venv venv
   
   # Windows
   venv\Scripts\activate
   
   # Linux/Mac
   source venv/bin/activate
   
   pip install -r requirements.txt
   cd ..
   ```

4. **Configurar variables de entorno**
   
   El proyecto ya tiene las credenciales de Supabase configuradas en:
   - `.env.local` (frontend)
   - `backend/.env` (backend)

5. **Iniciar ambos servicios**
   
   **Opción 1: Script automático (Windows)**
   ```bash
   start.bat
   ```
   
   **Opción 2: Script automático (Linux/Mac)**
   ```bash
   chmod +x start.sh
   ./start.sh
   ```
   
   **Opción 3: Manualmente**
   ```bash
   # Terminal 1 - Backend
   cd backend
   source venv/bin/activate  # o venv\Scripts\activate en Windows
   uvicorn app.main:app --reload --port 8000
   
   # Terminal 2 - Frontend
   npm run dev
   ```

6. **Acceder a la aplicación**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - Documentación API: http://localhost:8000/docs

### Credenciales de Acceso

- **Email**: admin@ejemplo.com
- **Password**: Admin123!Seguro

## 📁 Estructura del Proyecto

```
test-activos/
├── src/                      # Frontend Next.js
│   ├── app/                  # Rutas y páginas
│   ├── components/           # Componentes UI
│   ├── features/             # Módulos de funcionalidad
│   │   ├── auth/            # Autenticación
│   │   ├── assets/          # Gestión de activos
│   │   ├── risks/           # Gestión de riesgos
│   │   └── dashboard/       # Panel de control
│   └── lib/                 # Utilidades y clientes
├── backend/                  # Backend FastAPI
│   ├── app/
│   │   ├── api/             # Endpoints
│   │   ├── models/          # Modelos SQLAlchemy
│   │   ├── schemas/         # Schemas Pydantic
│   │   ├── core/            # Configuración y seguridad
│   │   └── utils/           # Utilidades
│   ├── tests/               # Pruebas
│   └── requirements.txt     # Dependencias Python
├── supabase/                 # Configuración de Supabase
│   └── migrations/          # Migraciones SQL
└── docs/                    # Documentación
```

## 🔌 API Endpoints

### Autenticación
- `POST /api/v1/auth/register` - Registrar usuario
- `POST /api/v1/auth/login` - Iniciar sesión
- `GET /api/v1/auth/me` - Obtener usuario actual

### Activos
- `GET /api/v1/assets` - Listar activos
- `GET /api/v1/assets/{id}` - Obtener activo
- `POST /api/v1/assets` - Crear activo
- `PUT /api/v1/assets/{id}` - Actualizar activo
- `DELETE /api/v1/assets/{id}` - Archivar activo

### Riesgos
- `GET /api/v1/risks` - Listar riesgos
- `GET /api/v1/risks/{id}` - Obtener riesgo
- `POST /api/v1/risks` - Crear riesgo
- `PUT /api/v1/risks/{id}` - Actualizar riesgo
- `DELETE /api/v1/risks/{id}` - Archivar riesgo

Documentación completa disponible en: http://localhost:8000/docs

## 🎨 Sistema de Diseño

### Paleta de Colores
- **Pale Mint** (#CFEBE1): Fondos y superficies
- **Midnight Navy** (#002941): Textos y elementos primarios
- **Coral Orange** (#FD6E6E): Botones de acción y énfasis

### Características
- ✅ Diseño responsivo
- ✅ Modo claro (próximamente modo oscuro)
- ✅ Accesibilidad WCAG 2.1
- ✅ Componentes reutilizables con daisyUI
- ✅ Iconos de Lucide React

## 🧪 Pruebas

### Frontend
```bash
npm test                    # Pruebas unitarias
npm run test:e2e           # Pruebas end-to-end (próximamente)
```

### Backend
```bash
cd backend
pytest                     # Pruebas unitarias
pytest --cov=app          # Con cobertura
```

## 📊 Características Implementadas

### ✅ Completado
- **Autenticación**: Login con JWT
- **Dashboard**: Panel de control con KPIs
- **Gestión de Activos**: CRUD completo con 31 campos
- **Gestión de Riesgos**: CRUD completo con matriz 5x5
- **Evaluación CIA**: Confidencialidad, Integridad, Disponibilidad
- **Catálogos**: Gestión de categorías y tipos
- **Organizaciones**: Multi-tenant con aislamiento de datos

### 🚧 En Progreso
- **Controles**: Gestión de controles de seguridad
- **Seguimiento**: Actividades y verificaciones
- **Exportación**: Generación de reportes Excel
- **Importación**: Carga masiva desde Excel

### 📋 Próximas Funcionalidades
- Modo oscuro
- Notificaciones en tiempo real
- Exportación a PDF
- Gráficos avanzados
- Auditoría completa

## 🔒 Seguridad

- ✅ Autenticación JWT con tokens de acceso
- ✅ Hash de contraseñas con bcrypt
- ✅ Row Level Security (RLS) en PostgreSQL
- ✅ Validación de datos con Pydantic
- ✅ CORS configurado correctamente
- ✅ Variables de entorno seguras

## 🗄️ Base de Datos

El proyecto usa PostgreSQL en Supabase con las siguientes tablas principales:

- `users` - Usuarios del sistema
- `organizations` - Organizaciones/empresas
- `organization_members` - Miembros de organizaciones
- `assets` - Activos de información
- `risks` - Riesgos identificados
- `controls` - Controles de seguridad
- `follow_ups` - Seguimiento de actividades

Migraciones disponibles en: `supabase/migrations/`

## 📖 Documentación Adicional

- [PLAN_IMPLEMENTACION.md](./PLAN_IMPLEMENTACION.md) - Plan detallado de implementación
- [FASE1_COMPLETADA.md](./FASE1_COMPLETADA.md) - Estado de la Fase 1
- [BUSINESS_RULES.md](./BUSINESS_RULES.md) - Reglas de negocio
- [EXCEL_MAPPING.md](./EXCEL_MAPPING.md) - Mapeo desde Excel
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Guía de despliegue

## 🤝 Contribución

Para contribuir al proyecto:

1. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
2. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
3. Push a la rama (`git push origin feature/AmazingFeature`)
4. Abre un Pull Request

## 📝 Licencia

Este proyecto es de uso educativo y demostrativo.

## 👥 Autor

Desarrollado como proyecto de gestión de activos de información y evaluación de riesgos.

## 🆘 Soporte

Para soporte y preguntas:
- Revisa la documentación en la carpeta `docs/`
- Consulta la API docs en http://localhost:8000/docs
- Revisa los issues en el repositorio

---

**Estado del Proyecto**: ✅ Funcional - Fase 1 completada, Fase 2 en progreso
