# Equivalencias Excel ↔ aplicación

Fuente: `Inventario_Activos_XXXXXX_Bolivia.xlsx` (copia de referencia, 9 hojas). Las cifras del caso AGETIC
son hipotéticas y no auditadas; no se cargan por defecto en ninguna organización.

## Hojas

| Hoja Excel | Equivalente en la aplicación | Estado |
|---|---|---|
| Panel | Panel ejecutivo (`/`) | Implementado; ver `BUSINESS_RULES.md` §7 |
| Inventario | Inventario de activos (`/activos`) | Implementado (31 campos) |
| Catálogos | Catálogos en Configuración y `catalog_options` | Lectura implementada; edición pendiente |
| Criterios CIA | Configuración → Criterios (`criteria_versions`) | Implementado |
| Riesgos | Riesgos (`risks`, `risk_assessments`) | Tabla lista; interfaz pendiente |
| Controles | Controles (`controls`, `control_verifications`) | Tabla lista; interfaz pendiente |
| Seguimiento | Seguimiento (`follow_up_activities`) | Tabla y alertas listas; interfaz pendiente |
| Guía y normativa | Configuración + `reference_sources` | Referencias creadas; módulo pendiente |
| Fuentes AGETIC | Fuentes y evidencias (`evidences`, `reference_sources`) | Tablas y bucket listos; interfaz pendiente |

## Inventario: 31 columnas

| # | Columna Excel | Tipo | Campo / tabla | Validación | Componente |
|---|---|---|---|---|---|
| A | ID | texto | `assets.code` | único por organización; patrón `^[A-Za-z0-9][A-Za-z0-9._-]{0,39}$` | Paso 1 |
| B | Nombre del activo | texto | `assets.name` | ≤ 200 | Paso 1 |
| C | Categoría | catálogo | `assets.category_code` (`categoria`) | código activo | Paso 1 |
| D | Tipo de activo | catálogo | `asset_type_code` (`tipo_activo`) | código activo | Paso 1 |
| E | Descripción y finalidad | texto | `description` | ≤ 2000 | Paso 1 |
| F | Macroproceso | texto | `macroprocess` | ≤ 200 | Paso 2 |
| G | Proceso | texto | `process` | ≤ 200 | Paso 2 |
| H | Subproceso o actividad | texto | `subprocess` | ≤ 200 | Paso 2 |
| I | Propietario | texto | `owner_name` | «Por identificar» no es válido | Paso 3 |
| J | Custodio | texto | `custodian_name` | | Paso 3 |
| K | Administrador | texto | `administrator_name` | | Paso 3 |
| L | Usuarios autorizados | texto | `authorized_users` | | Paso 3 |
| M | Ubicación | texto | `location` | ≤ 500 | Paso 2 |
| N | Proveedor o tercero | texto | `supplier` | ≤ 300 | Paso 2 |
| O | Dependencias (ID) | lista de códigos | `asset_dependencies` | códigos existentes; no a sí mismo | Paso 3 (texto separado por `;`) |
| P | Confidencialidad (1–5) | entero | `confidentiality` | 1–5 | Paso 4 |
| Q | Integridad (1–5) | entero | `integrity` | 1–5 | Paso 4 |
| R | Disponibilidad (1–5) | entero | `availability` | 1–5 | Paso 4 |
| S | Criticidad preliminar | **calculado** | `criticality` (vista) | regla CIA | Paso 4 y ficha |
| T | Justificación de criticidad | texto | `criticality_justification` | ≤ 2000 | Paso 4 |
| U | Evidencia / referencia | texto | `evidence_reference` | ≤ 1000 | Paso 5 |
| V | Estado de evidencia | catálogo | `evidence_status_code` (`estado_evidencia`) | código activo | Paso 5 |
| W | Fuente o sección | texto | `source_reference` | ≤ 1000 | Paso 5 |
| X | Fecha de revisión | fecha | `review_date` | ISO válida | Paso 6 |
| Y | Estado del registro | **calculado** | `registryStatus` (vista) | ver `BUSINESS_RULES.md` §3 | Paso 6 y listado |
| Z | Observaciones y pendientes | texto | `observations` | ≤ 3000 | Paso 6 |
| AA | Área / unidad responsable | texto | `responsible_area` | ≤ 200 | Paso 2 |
| AB | Clasificación de información | catálogo | `classification_code` (`clasificacion`) | código activo | Paso 5 |
| AC | Ciclo de vida | catálogo | `lifecycle_code` (`ciclo_vida`) | código activo | Paso 6 |
| AD | Próxima revisión | **calculado** | `nextReview` | EDATE con meses del criterio | Paso 6 y listado |
| AE | Referencia normativa | texto | `regulatory_reference` | ≤ 1000 | Paso 5 |

Campos añadidos que no estaban en el Excel: `is_draft`, `validated_at`, `validated_by`, `archived_at`,
`created_by`, `updated_by`, y las marcas de fecha de creación y modificación.

## Fórmulas migradas

| Excel | Migración |
|---|---|
| `Inventario!S` criticidad | `evaluateCia` (`cia.ts`) |
| `Inventario!Y` estado del registro | `assetRegistryStatus` (`asset-registry.ts`) |
| `Inventario!AD` = `EDATE(X, meses)` | `nextReviewDate` (`dates.ts`) |
| `Riesgos!C`, `Controles!C` (búsqueda del activo) | Relación por clave foránea; se muestra el código y el nombre |
| `Riesgos!J/K` inherente | `evaluateInherentRisk` (`risk.ts`) |
| `Riesgos!O/P` residual | `evaluateResidualRisk` (`risk.ts`), devuelve «No evaluado» si falta un valor |
| `Controles!O` estado de registro | Pendiente de implementar en la interfaz de controles (regla: exige verificación completa) |
| `Seguimiento!M` alerta | `followUpAlert` (`follow-up.ts`) |
| `Panel` KPI y gráficos | `computeDashboardMetrics` (`dashboard/metrics.ts`) |
| `Panel` criticidad y riesgo por conteo | Agregados de `metrics.ts` |

Las fórmulas de criticidad y de riesgo no se duplican: el panel, el listado, la ficha, el formulario y la
validación usan las mismas funciones.

## Listas desplegables (validaciones)

Las validaciones `INDIRECT` del Excel apuntan a rangos de la hoja Catálogos. En la aplicación, las listas
provienen de `catalog_options`, y la base de datos rechaza códigos inexistentes o inactivos mediante triggers.

Diferencias detectadas en el Excel de referencia:

- **Tipo de actividad (Seguimiento)**: la validación lista 7 valores, pero los datos usan 9 más (Documentación, Entrevista, Identificación, Control, Terceros, Inventario, Visita, Roles, Metodología). La aplicación incluye los 16 valores como catálogo.
- **Tipo de control (Controles)**: la lista está fija en la validación del Excel; en la aplicación es un catálogo configurable.
- **Escala CIA**: se trata como regla (enteros 1–5 con descripciones), no como catálogo.

## Reglas de verificación del Excel

| Regla original | Comportamiento en la aplicación |
|---|---|
| `Controles!O` marca «Verificado» si `L="Sí"` y `M<>""` | Más estricto: exige además fecha de verificación, resultado de al menos 5 caracteres, responsable y evidencia (restricción en base de datos). La mera existencia de texto en `M` (que el Excel rellena por defecto) no basta. |
| `Inventario!Y` exige ID único | Garantizado por restricción `unique (organization_id, code)` |
| Seguimiento «Vencida» depende de la fecha | Igual, con zona horaria de la organización |
| `Panel!G11` revisiones vencidas = alertas «Vencida» de seguimiento | Diferencia: en la aplicación, «Revisiones vencidas» cuenta activos con próxima revisión vencida. Las actividades vencidas se muestran por separado |

## Importación y exportación

**No implementadas en esta versión.** El diseño previsto es:

- Importación: lectura de las hojas, validación de encabezados, conversión de fechas de Excel, detección de duplicados e IDs inexistentes, vista previa por fila, confirmación explícita y resumen. Las fórmulas no se importan como texto.
- Exportación: `.xlsx` con ExcelJS en un Route Handler, a partir de consultas filtradas. Los datos calculados se escribirán como valores, y las fórmulas solo donde sean compatibles.

Hasta implementarse, no existe exportación de Excel; el sistema no simula archivos.
