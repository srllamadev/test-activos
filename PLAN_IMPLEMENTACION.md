# Plan de Implementación - Módulos Pendientes

## Estado Actual del Proyecto

### ✅ Implementado y Funcional

| Módulo | Estado | Notas |
|--------|--------|-------|
| **Autenticación** | ✅ Completo | Login, recuperación, cierre de sesión, roles (admin/editor/consultor) |
| **Configuración** | ✅ Completo | Datos de organización, criterios CIA versionados, catálogos |
| **Inventario de Activos** | ✅ Completo | 31 campos, formulario por pasos, CIA, validaciones, archivado |
| **Dashboard Básico** | ✅ Parcial | KPIs, gráficos básicos, alertas |
| **Base de Datos** | ✅ Completo | Todas las tablas creadas, RLS configurado, triggers |
| **Seguridad** | ✅ Completo | RLS en todas las tablas, auditoría automática |

### ⚠️ Parcialmente Implementado

| Módulo | Estado | Falta |
|--------|--------|-------|
| **Dashboard** | ⚠️ 60% | Matriz de riesgo 5x5 interactiva, filtros avanzados por período, exportación de datos filtrados |

### ❌ No Implementado (Base de datos lista)

| Módulo | Tablas | UI | Prioridad |
|--------|--------|-----|-----------|
| **Riesgos** | ✅ | ❌ | Alta |
| **Controles** | ✅ | ❌ | Alta |
| **Seguimiento** | ✅ | ❌ | Alta |
| **Evidencias** | ✅ Bucket | ❌ | Media |
| **Fuentes** | ✅ | ❌ | Media |
| **Exportación Excel** | ❌ | ❌ | Alta |
| **Importación Excel** | ❌ | ❌ | Media |
| **Análisis y Decisiones** | ❌ | ❌ | Media |

---

## Plan de Implementación por Fases

### 🔴 FASE 1: Gestión de Riesgos (Prioridad ALTA)

**Objetivo:** Permitir registrar y evaluar riesgos asociados a activos

#### 1.1 Lista de Riesgos
- [ ] Página `/riesgos` con tabla
- [ ] Filtros: nivel inherente, nivel residual, activo, tratamiento
- [ ] Búsqueda por código o nombre
- [ ] Ordenamiento
- [ ] Paginación
- [ ] Estado visual (colores por nivel)

#### 1.2 Registro de Riesgos
- [ ] Formulario con los 22 campos del Excel:
  - ID riesgo (auto)
  - ID activo (selector con búsqueda)
  - Activo asociado (auto)
  - Amenaza/fuente
  - Vulnerabilidad
  - Escenario y consecuencia
  - Proceso afectado
  - Probabilidad inherente (1-5)
  - Impacto inherente (1-5)
  - Riesgo inherente (auto = P × I)
  - Nivel inherente (auto: Bajo/Medio/Alto)
  - Controles existentes
  - Probabilidad residual (1-5)
  - Impacto residual (1-5)
  - Riesgo residual (auto = P × I)
  - Nivel residual (auto)
  - Tratamiento (Mitigar/Aceptar/Transferir/Evitar)
  - Dueño del riesgo
  - Fecha de evaluación
  - Estado de evidencia
  - Evidencia/fundamento
  - Observaciones
- [ ] Validaciones
- [ ] Autoguardado de borradores

#### 1.3 Matriz de Riesgo 5x5
- [ ] Componente visual interactivo
- [ ] Ejes: Probabilidad (Y) × Impacto (X)
- [ ] Celdas coloreadas por nivel
- [ ] Click en celda → lista de riesgos en ese nivel
- [ ] Toggle: Inherente vs Residual
- [ ] Exportar matriz como imagen

#### 1.4 Detalle de Riesgo
- [ ] Vista completa con todos los campos
- [ ] Historial de evaluaciones
- [ ] Controles asociados
- [ ] Acciones: Editar, Archivar

**Estimación:** 3-4 días de desarrollo

---

### 🔴 FASE 2: Gestión de Controles (Prioridad ALTA)

**Objetivo:** Registrar controles de seguridad y verificar su eficacia

#### 2.1 Lista de Controles
- [ ] Página `/controles` con tabla
- [ ] Filtros: estado implementación, eficacia verificada, tipo, responsable
- [ ] Búsqueda
- [ ] Estado visual (pendiente, implementado, verificado)

#### 2.2 Registro de Controles
- [ ] Formulario con los 16 campos del Excel:
  - ID control (auto)
  - ID riesgo (selector)
  - ID activo (auto)
  - Control/salvaguarda
  - Tipo de control (Preventivo/Detectivo/Correctivo/Compensatorio)
  - Referencia de control
  - Responsable
  - Estado de implementación
  - Fecha de implementación
  - Evidencia del control
  - Fecha de verificación
  - Eficacia verificada (Sí/No)
  - Resultado de verificación
  - Próxima revisión (auto)
  - Estado de registro (auto)
  - Observaciones
- [ ] Validaciones

#### 2.3 Verificación de Controles
- [ ] Flujo de verificación con confirmación
- [ ] Registro de auditoría obligatorio
- [ ] Cambio automático de estado

#### 2.4 Detalle de Control
- [ ] Vista completa
- [ ] Historial de verificaciones
- [ ] Riesgo asociado

**Estimación:** 2-3 días de desarrollo

---

### 🔴 FASE 3: Seguimiento y Alertas (Prioridad ALTA)

**Objetivo:** Dar seguimiento a actividades y gestionar alertas

#### 3.1 Lista de Seguimiento
- [ ] Página `/seguimiento` con tabla
- [ ] Filtros: estado, tipo actividad, responsable, fecha
- [ ] Vista de calendario
- [ ] Alertas visuales (vencido, próximo)

#### 3.2 Registro de Actividades
- [ ] Formulario con los 13 campos del Excel:
  - ID seguimiento (auto)
  - ID activo
  - Tipo de actividad
  - Hallazgo/cambio/tarea
  - Responsable
  - Fecha programada
  - Fecha realizada
  - Estado (Pendiente/En curso/Completada/Vencida)
  - Evidencia/enlace
  - ID riesgo (opcional)
  - Resultado/acuerdo
  - Próximo paso
  - Alerta (auto: Vencida/Próxima/En plazo/Cerrada/Sin fecha)
- [ ] Cálculo automático de alertas
- [ ] Actualización de estado

#### 3.3 Centro de Alertas
- [ ] Panel de alertas activas
- [ ] Agrupación por tipo
- [ ] Acciones rápidas: Marcar completada, Reprogramar

**Estimación:** 2-3 días de desarrollo

---

### 🟡 FASE 4: Dashboard Avanzado (Prioridad MEDIA)

**Objetivo:** Completar el dashboard con funcionalidades avanzadas

#### 4.1 Matriz de Riesgo Interactiva
- [ ] Integrar componente de matriz en dashboard
- [ ] Toggle Inherente/Residual
- [ ] Filtros por período, categoría, área
- [ ] Drill-down: click en celda → modal con lista de riesgos

#### 4.2 Filtros Avanzados
- [ ] Selector de período (último mes, trimestre, año, personalizado)
- [ ] Filtros combinados persistentes
- [ ] Exportar datos filtrados

#### 4.3 Centro de Prioridades
- [ ] Lista de acciones prioritarias
- [ ] Reglas configurables
- [ ] Enlaces directos a módulos

**Estimación:** 2 días de desarrollo

---

### 🟡 FASE 5: Gestión de Evidencias (Prioridad MEDIA)

**Objetivo:** Subir y gestionar archivos de evidencia

#### 5.1 Módulo de Evidencias
- [ ] Página `/evidencias` con lista
- [ ] Subida de archivos (máx 10MB)
- [ ] Tipos permitidos: PDF, JPG, PNG, DOC, DOCX
- [ ] Metadatos: título, descripción, fecha
- [ ] Vinculación con activos, riesgos, controles

#### 5.2 Gestión de Archivos
- [ ] Integración con Supabase Storage
- [ ] Preview de imágenes
- [ ] Descarga
- [ ] Eliminación lógica (archivado)

**Estimación:** 2 días de desarrollo

---

### 🟡 FASE 6: Fuentes y Referencias (Prioridad MEDIA)

**Objetivo:** Gestionar fuentes de información y referencias normativas

#### 6.1 Módulo de Fuentes
- [ ] Página `/fuentes`
- [ ] CRUD de fuentes
- [ ] Campos: título, emisor, tipo, URL, alcance, fecha consulta
- [ ] Vinculación con activos

#### 6.2 Referencias Normativas
- [ ] Biblioteca de normativas (ISO 27001, NIST, etc.)
- [ ] Asociación con controles
- [ ] Búsqueda y filtros

**Estimación:** 1-2 días de desarrollo

---

### 🟡 FASE 7: Exportación Excel (Prioridad ALTA)

**Objetivo:** Exportar datos a Excel con formato similar al original

#### 7.1 Exportación Completa
- [ ] Botón "Exportar inventario completo"
- [ ] Generar archivo .xlsx con ExcelJS
- [ ] Hojas:
  - Panel (KPIs)
  - Inventario
  - Riesgos
  - Controles
  - Seguimiento
  - Criterios
  - Catálogos
- [ ] Formato con estilos
- [ ] Fórmulas calculadas

#### 7.2 Exportaciones Parciales
- [ ] Exportar por módulo
- [ ] Exportar con filtros aplicados
- [ ] Exportar activos críticos
- [ ] Exportar matriz de riesgos

**Estimación:** 2-3 días de desarrollo

---

### 🟡 FASE 8: Importación Excel (Prioridad MEDIA)

**Objetivo:** Importar datos desde Excel existente

#### 8.1 Asistente de Importación
- [ ] Upload de archivo .xlsx
- [ ] Validación de estructura
- [ ] Preview de datos
- [ ] Mapeo de columnas
- [ ] Detección de duplicados
- [ ] Confirmación antes de importar

#### 8.2 Importación por Módulos
- [ ] Importar inventario
- [ ] Importar riesgos
- [ ] Importar controles
- [ ] Manejo de errores

**Estimación:** 3-4 días de desarrollo

---

### 🟢 FASE 9: Análisis y Decisiones (Prioridad BAJA)

**Objetivo:** Vista especializada para análisis de decisiones

#### 9.1 Página de Análisis
- [ ] Ruta `/analisis`
- [ ] Visualizaciones avanzadas
- [ ] Comparativos históricos
- [ ] Tendencias

#### 9.2 Reportes
- [ ] Reportes predefinidos
- [ ] Personalización
- [ ] Exportación a PDF

**Estimación:** 2-3 días de desarrollo

---

## Resumen de Estimaciones

| Fase | Días Estimados | Prioridad |
|------|----------------|-----------|
| FASE 1: Riesgos | 3-4 días | 🔴 ALTA |
| FASE 2: Controles | 2-3 días | 🔴 ALTA |
| FASE 3: Seguimiento | 2-3 días | 🔴 ALTA |
| FASE 4: Dashboard Avanzado | 2 días | 🟡 MEDIA |
| FASE 5: Evidencias | 2 días | 🟡 MEDIA |
| FASE 6: Fuentes | 1-2 días | 🟡 MEDIA |
| FASE 7: Exportación Excel | 2-3 días | 🟡 MEDIA |
| FASE 8: Importación Excel | 3-4 días | 🟡 MEDIA |
| FASE 9: Análisis | 2-3 días | 🟢 BAJA |
| **TOTAL** | **19-24 días** | |

---

## Orden Recomendado de Implementación

### Sprint 1 (Semana 1-2): Módulos Core
1. **FASE 1: Riesgos** - Es el corazón del sistema de gestión de riesgos
2. **FASE 2: Controles** - Complementa los riesgos
3. **FASE 3: Seguimiento** - Cierra el ciclo de gestión

### Sprint 2 (Semana 3): Dashboard y Visualizaciones
4. **FASE 4: Dashboard Avanzado** - Matriz de riesgo y análisis

### Sprint 3 (Semana 4): Gestión Documental
5. **FASE 5: Evidencias** - Soporte documental
6. **FASE 6: Fuentes** - Referencias normativas

### Sprint 4 (Semana 5): Excel y Reportes
7. **FASE 7: Exportación Excel** - Integración con Excel existente
8. **FASE 8: Importación Excel** - Migración de datos

### Sprint 5 (Semana 6): Análisis Avanzado
9. **FASE 9: Análisis y Decisiones** - Herramientas de BI

---

## Consideraciones Técnicas

### Dependencias entre Módulos
- Riesgos → Controles (los controles mitiguen riesgos)
- Riesgos → Dashboard (matriz de riesgo)
- Controles → Seguimiento (verificaciones programadas)
- Todos → Dashboard (KPIs)
- Todos → Exportación Excel

### Pruebas Requeridas
- [ ] Pruebas unitarias para cálculos (CIA, riesgo, alertas)
- [ ] Pruebas de integración (API → DB)
- [ ] Pruebas E2E con Playwright
- [ ] Validación de permisos por rol
- [ ] Testing de exportación Excel

### Documentación Pendiente
- [ ] Actualizar USER_GUIDE.md con nuevos módulos
- [ ] Agregar ejemplos de uso
- [ ] Documentar fórmulas de cálculo
- [ ] Guía de importación Excel

---

## Criterios de Aceptación por Módulo

### Riesgos
- [ ] Se pueden crear riesgos con los 22 campos
- [ ] El cálculo de riesgo inherente es automático (P × I)
- [ ] El cálculo de riesgo residual es automático
- [ ] La matriz 5x5 es interactiva y muestra los riesgos
- [ ] Los filtros funcionan correctamente
- [ ] El estado cambia según evaluación residual

### Controles
- [ ] Se pueden registrar controles con los 16 campos
- [ ] El estado cambia automáticamente según verificación
- [ ] La verificación requiere evidencia y fecha
- [ ] Se pueden vincular a riesgos específicos
- [ ] Las próximas revisiones se calculan automáticamente

### Seguimiento
- [ ] Se pueden registrar actividades con los 13 campos
- [ ] Las alertas se calculan automáticamente
- [ ] El estado cambia según fechas y acciones
- [ ] Se pueden ver en calendario
- [ ] Las alertas vencidas son visibles en dashboard

### Dashboard Avanzado
- [ ] La matriz de riesgo es interactiva
- [ ] Los filtros afectan todos los KPIs
- [ ] Se puede exportar datos filtrados
- [ ] Las prioridades se muestran correctamente

### Exportación Excel
- [ ] El archivo se descarga correctamente
- [ ] Contiene todas las hojas requeridas
- [ ] Los datos calculados son correctos
- [ ] El formato es legible y profesional

---

## Próximos Pasos Inmediatos

1. **Iniciar con FASE 1: Riesgos**
   - Crear página de lista `/riesgos`
   - Implementar formulario de registro
   - Crear componente de matriz 5x5
   - Integrar con dashboard

2. **Pruebas continuas**
   - Probar después de cada módulo
   - Validar cálculos con datos del Excel de referencia
   - Verificar permisos por rol

3. **Documentación incremental**
   - Actualizar USER_GUIDE.md después de cada fase
   - Documentar decisiones técnicas

---

**Nota:** Este plan está sujeto a ajustes según feedback del usuario y descubrimientos durante la implementación. Las estimaciones son aproximadas y pueden variar.
