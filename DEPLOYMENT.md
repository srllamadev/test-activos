# Despliegue

## 1. Supabase

1. Crea un proyecto en Supabase (región cercana a los usuarios).
2. Aplica las migraciones en orden desde **SQL Editor** o con la CLI:
   ```bash
   npx supabase link --project-ref TU_REF
   npx supabase db push
   ```
   Archivos: `supabase/migrations/20260101000001_core_schema.sql`, `…000002_security_rls.sql`, `…000003_catalogs_storage.sql`.
3. **Authentication → URL Configuration**:
   - *Site URL*: la URL de producción (por ejemplo `https://activos.tu-entidad.gob`).
   - *Redirect URLs*: añade `https://activos.tu-entidad.gob/auth/callback` y, para pruebas, `http://localhost:3000/auth/callback`.
4. **Authentication → Providers → Email**: deja habilitado el correo y contraseña. Desactiva el registro público
   (**Allow new users to sign up**) porque las cuentas las crea el administrador.
5. **Authentication → Email Templates**: revisa la plantilla de recuperación para que use el enlace de confirmación.
6. **Storage**: el bucket `evidencias` lo crea la migración 3 como privado. Verifica que sea privado.
7. Anota las claves en **Project Settings → API**: URL, clave `anon` y clave `service_role`.

## 2. Primer administrador

Desde tu equipo, con las claves en el entorno (nunca en el repositorio):

```bash
ORG_NAME="Nombre de la entidad" ADMIN_EMAIL="admin@entidad.gob" \
NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=... \
npm run bootstrap:admin
```

Guarda la contraseña temporal que muestra el script o define `ADMIN_PASSWORD` para usar la tuya. El administrador
debe cambiarla al entrar.

## 3. Vercel

1. Importa el repositorio de GitHub en Vercel.
2. Framework: Next.js. Comandos por defecto: `npm run build`, salida `.next`.
3. Variables de entorno (**Production** y **Preview**):

   | Variable | Valor |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | clave anon |
   | `SUPABASE_SERVICE_ROLE_KEY` | clave service_role (marcar como *Sensitive*) |
   | `NEXT_PUBLIC_SITE_URL` | URL pública de la aplicación |

   `SUPABASE_SERVICE_ROLE_KEY` solo la usan los scripts de arranque; la aplicación web no la necesita.
   Si no se usa en la aplicación, puedes retirarla de Vercel tras crear el administrador.

4. Dominio: **Settings → Domains**, y actualiza *Site URL* en Supabase al dominio final.

La aplicación no escribe archivos en disco. Las evidencias y la futura exportación Excel deben generarse en memoria
o en Supabase Storage, nunca en el sistema de archivos de Vercel.

## 4. Verificación previa a producción

```bash
npm run typecheck
npm run lint
npm test
npm run test:db
npm run build
```

Después del despliegue, comprueba manualmente:

- Una ruta privada sin sesión redirige a `/login`.
- Un usuario de consulta no ve botones de edición y el servidor rechaza una escritura directa.
- Un usuario de otra entidad no ve los activos.
- Restablecer contraseña llega por correo y abre `/restablecer`.

## 5. Actualizaciones

1. Revisa las migraciones nuevas en `supabase/migrations/` y aplícalas en orden antes de desplegar el código.
2. Haz merge en la rama principal; Vercel despliega automáticamente.
3. Nunca edites migraciones ya aplicadas: crea una migración nueva.

## 6. Copias de seguridad

Activa las copias diarias de Supabase según tu plan. Antes de cada migración, exporta la base de datos.

## 7. Notas de seguridad

- La clave `anon` puede estar en el navegador: RLS es la barrera real.
- `service_role` evita RLS. Úsala solo en scripts controlados y rota la clave si se expone.
- Las cookies de sesión las gestiona `@supabase/ssr`. El proxy refresca la sesión en cada petición.
- Las respuestas privadas no se cachean entre usuarios (las rutas privadas se renderizan en cada petición).
