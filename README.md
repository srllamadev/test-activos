# Sistema de Gestión de Activos de Información y Riesgos

Aplicación web para registrar activos de información, valorarlos con criterios CIA, gestionar riesgos,
controles y seguimiento, y consultar indicadores institucionales. Está construida con Next.js (App Router),
TypeScript estricto, Supabase (PostgreSQL, Auth, Storage con RLS) y Tailwind CSS con daisyUI.

El Excel de referencia (caso AGETIC, datos hipotéticos no auditados) sirvió como fuente de reglas. El sistema
es genérico: cada entidad configura sus datos y criterios, y sus datos quedan aislados por organización.

## Estado del proyecto

| Módulo | Estado |
|---|---|
| Autenticación (login, recuperación, cierre de sesión, protección de rutas) | Implementado |
| Roles (administrador, editor, consulta) con RLS en PostgreSQL | Implementado y verificado |
| Configuración institucional y versiones de criterios | Implementado |
| Inventario de activos (31 campos, formulario por pasos, borradores, CIA, validación, archivado) | Implementado |
| Panel ejecutivo (KPI, gráficos, prioridades) | Implementado (filtros de área y categoría) |
| Riesgos, controles, seguimiento | Pendiente (tablas y reglas listas; interfaz no construida) |
| Exportación e importación Excel | Pendiente |
| Evidencias y fuentes (subida a Storage) | Pendiente (bucket y políticas creados) |
| Gestión de usuarios desde la aplicación | Pendiente (se crean con el script de arranque) |
| Pruebas E2E con Playwright | Pendiente (configuración no incluida aún) |

Consulta `USER_GUIDE.md` para el uso y `EXCEL_MAPPING.md` para las diferencias respecto al Excel.

## Requisitos

- Node.js 20 o superior y npm.
- Un proyecto de Supabase (plan gratuito suficiente para pruebas).

## Instalación

```bash
npm install
cp .env.example .env.local   # completa los valores de tu proyecto Supabase
```

## Variables de entorno

| Variable | Uso |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave pública (puede llegar al navegador; la seguridad la aplica RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | Solo servidor y scripts de arranque. Nunca con prefijo `NEXT_PUBLIC_` |
| `NEXT_PUBLIC_SITE_URL` | URL pública de la aplicación (enlaces de recuperación) |

## Base de datos

Aplica las migraciones en orden desde el SQL Editor de Supabase, o con la CLI (`supabase db push`):

1. `supabase/migrations/20260101000001_core_schema.sql`
2. `supabase/migrations/20260101000002_security_rls.sql`
3. `supabase/migrations/20260101000003_catalogs_storage.sql`

Detalles en `DATABASE.md`.

## Primer administrador

No existen credenciales en el repositorio. Crea la organización y el administrador con el script:

```bash
ORG_NAME="Mi entidad" ADMIN_EMAIL="admin@entidad.gob" \
NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
npm run bootstrap:admin
```

Si no defines `ADMIN_PASSWORD`, el script imprime una contraseña temporal una sola vez. Cámbiala al entrar
(opción «¿Olvidaste tu contraseña?»).

## Ejecución

```bash
npm run dev         # desarrollo en http://localhost:3000
npm run build       # compilación de producción
npm run start       # servidor de producción tras build
```

## Calidad y pruebas

```bash
npm run typecheck   # TypeScript en modo estricto
npm run lint        # ESLint
npm test            # Vitest: reglas de negocio e indicadores (40 pruebas)
npm run test:db     # PostgreSQL en memoria (PGlite): migraciones, RLS, auditoría, Storage (27 comprobaciones)
```

`test:db` aplica las migraciones reales y simula los roles `authenticated` y `auth.uid()` de Supabase. No
sustituye una prueba contra tu proyecto desplegado.

## Estructura

```
src/app/            rutas, layouts, páginas (App Router) y route handlers
src/proxy.ts        protección de rutas y refresco de sesión (Next 16: "proxy")
src/lib/calculations/   reglas de negocio puras (CIA, riesgo, fechas, seguimiento, registro)
src/lib/validations/    esquemas Zod compartidos por formulario y servidor
src/lib/supabase/       clientes de Supabase (servidor, admin, proxy)
src/features/           dominios: auth, assets, dashboard, settings
src/components/         interfaz reutilizable (ui, forms, charts)
supabase/migrations/    esquema, RLS, catálogos y Storage
supabase/tests/         verificación de la base de datos
scripts/                script de arranque del administrador
```

## Despliegue

Consulta `DEPLOYMENT.md` para Supabase, Vercel, URLs de autenticación y variables de producción.
