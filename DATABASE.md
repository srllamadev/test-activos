# Base de datos

PostgreSQL en Supabase. Las migraciones están en `supabase/migrations/` y se ejecutan en orden.

## Principios

- Claves primarias UUID internas. Los códigos comerciales del Excel (`AG-001`, `R-AG-001`, `C-AG-001`, `S-AG-001`) se conservan como columnas `code`, únicas por organización.
- Toda tabla institucional tiene `organization_id` y RLS activado.
- Los catálogos guardan **códigos estables** (`software_aplicaciones`) con una etiqueta editable. Renombrar una etiqueta no altera los registros.
- Los registros se **archivan** (`archived_at`); no hay política de borrado para activos, riesgos, controles ni seguimientos.
- La auditoría la escriben triggers `SECURITY DEFINER`, no el cliente.
- Los campos calculados (criticidad, estado del registro, próxima revisión, nivel de riesgo, alertas de seguimiento) no se almacenan: se derivan en `src/lib/calculations`. Así existe una sola fórmula.

## Tablas

| Tabla | Propósito | Notas |
|---|---|---|
| `organizations` | Entidades | Datos institucionales, zona horaria, frecuencia de revisión |
| `profiles` | Perfil del usuario | Enlazado a `auth.users` |
| `organization_members` | Pertenencia y rol (`admin`, `editor`, `viewer`) | Clave primaria compuesta |
| `catalog_options` | Catálogos configurables | Único por (organización, tipo, código); se desactivan, no se borran |
| `criteria_versions` | Parámetros CIA y de riesgo versionados | Una sola versión `vigente` por organización (índice parcial) |
| `assets` | Inventario (31 campos del Excel; ver `EXCEL_MAPPING.md`) | `is_draft`, `validated_at/by`, `archived_at` |
| `asset_dependencies` | Dependencias entre activos | Claves compuestas con `organization_id`: no se puede cruzar entidades |
| `risks` | Riesgos (inherente y residual) | Probabilidad e impacto 1–5 |
| `risk_assessments` | Historial de evaluaciones de riesgo | Una fila por evaluación (inherente o residual) |
| `controls` | Controles de seguridad | Restricción: `Verificado` exige fecha, resultado, responsable y evidencia |
| `control_verifications` | Historial de verificaciones | |
| `follow_up_activities` | Seguimiento | Restricción: `Completada` exige fecha realizada |
| `reference_sources` | Fuentes normativas (ISO/IEC 27001, 27005, NIST CSF 2.0) | Se crean al crear la organización |
| `evidences` | Evidencias (archivo en Storage o URL) | Debe tener archivo o URL |
| `evidence_links` | Vínculos evidencia ↔ activo / riesgo / control / seguimiento | Trigger que comprueba que la entidad pertenece a la organización |
| `audit_logs` | Registro de cambios relevantes | Solo lectura para administradores |

Las relaciones entre registros usan claves compuestas `(organization_id, id)`, de modo que una referencia a un registro de otra organización es rechazada por la base de datos.

## Migraciones

1. `20260101000001_core_schema.sql`: tablas, restricciones de rango (1–5, 1–25), índices, `updated_at`.
2. `20260101000002_security_rls.sql`: funciones `org_role`, `is_org_member`, `can_edit`, `is_org_admin`; políticas RLS; auditoría; validación de catálogos y de vínculos de evidencia; restricciones de verificación de controles y de validación de activos.
3. `20260101000003_catalogs_storage.sql`: catálogos por defecto (tomados del Excel, sin datos de AGETIC), criterios iniciales **no aprobados**, referencias normativas, bucket privado `evidencias` con políticas, función `publish_criteria_version` (publicación atómica).

Al insertar una organización, un trigger crea catálogos, la versión de criterios 1 y las referencias normativas.

## Roles y RLS

| Operación | Consulta (`viewer`) | Editor | Administrador |
|---|---|---|---|
| Leer datos de su organización | Sí | Sí | Sí |
| Insertar / actualizar activos, riesgos, controles, seguimiento | No | Sí | Sí |
| Borrar físicamente activos, riesgos, controles | No | No | No (se archivan) |
| Gestionar miembros, catálogos, criterios, datos de la entidad | No | No | Sí |
| Leer auditoría | No | No | Sí |
| Borrar dependencias y vínculos de evidencia | No | Sí | Sí |

Las funciones de autorización son `SECURITY DEFINER` con `search_path` vacío para evitar recursión de RLS y ataques por esquema. Los clientes `anon` no pueden ejecutarlas.

## Storage

Bucket privado `evidencias`, límite de 10 MB, tipos permitidos: PDF, PNG, JPEG, XLSX, DOCX y CSV.
Convención de ruta: `{organization_id}/{evidence_id}/{nombre}`. Las políticas comprueban que la primera carpeta
corresponda a una organización de la que el usuario es miembro. La eliminación exige rol administrador.

## Verificación

`npm run test:db` aplica las tres migraciones sobre PGlite y comprueba, entre otros:
aislamiento entre organizaciones, bloqueo de escritura a consulta, bloqueo de borrado de activos,
rechazo de valores de catálogo inexistentes, rechazo de dependencias entre organizaciones, rango de riesgos,
verificación de controles sin evidencia, auditoría, publicación de criterios solo por administradores y
políticas de Storage.

## Índices

Índices parciales para activos no archivados, índices por organización y categoría, propietario, área y revisión,
y por organización y fecha programada en seguimiento.
