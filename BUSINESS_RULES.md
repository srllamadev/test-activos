# Reglas de negocio

Todas las reglas están en `src/lib/calculations/` (funciones puras, probadas en `npm test`) y se reutilizan en
formularios, tablas, panel y pruebas. No deben reimplementarse en otro lugar.

## 1. Criticidad CIA (`cia.ts`)

Equivale a `Inventario!S`: `=IF(COUNT(P:R)<3,"",IF(MAX(P:R)>=Crítico,"Alta",IF(MAX(P:R)>=Medio,"Media","Baja")))`.

- Cada dimensión (confidencialidad, integridad, disponibilidad) es un entero entre 1 y 5.
- Si falta una dimensión, la criticidad es `null` («Sin calcular»).
- `máximo = MAX(C, I, D)`. Umbrales por defecto (del Excel, propuestos): Alta si máximo ≥ 4; Media si ≥ 3; Baja en otro caso.
- Los umbrales son configurables por organización. Validación: enteros 1–5 y Medio < Alto.
- La criticidad **no es un riesgo**: no representa probabilidad de amenaza.

## 2. Riesgo inherente y residual (`risk.ts`)

- `riesgo = probabilidad × impacto`, rango 1–25.
- Niveles por defecto (propuestos): Alto ≥ 15; Medio ≥ 6; Bajo en otro caso. Configurables.
- **Residual**: solo se calcula con probabilidad y de impacto residuales completos. Si falta alguno, el resultado es
  `No evaluado`, nunca 0.
- El residual no se reduce automáticamente por tener controles registrados. Requiere una nueva valoración.

## 3. Estado del registro de activo (`asset-registry.ts`)

Equivale a `Inventario!Y`. Estados:

| Estado | Condición |
|---|---|
| Borrador | Guardado como borrador por el usuario (`is_draft`). No se evalúa. |
| Incompleto | Falta algún requisito de la lista de verificación. |
| Listo para revisión | Cumple todos los requisitos. |
| Validado | Validado por un administrador (`validated_at`, `validated_by`). Cualquier edición retira la validación. |

Lista de verificación (equivale a las comprobaciones originales): ID único; nombre; categoría; tipo; descripción;
macroproceso; proceso; **propietario válido** (no vacío y no provisional: «Por identificar», «Por designar», «Por asignar», «Por confirmar»);
área responsable; clasificación; ciclo de vida; fecha de revisión válida; tres valores CIA; justificación;
evidencia o referencia; **evidencia verificada** (código `verificada`); fuente documentada.

La validación formal exige rol administrador y que el registro esté en «Listo para revisión». El servidor
recalcula la lista antes de validar.

## 4. Próxima revisión (`dates.ts`)

`próxima = fecha_revisión + meses` con meses calendario que respetan el cierre de mes
(31-ene + 1 mes = 28/29-feb, equivalente a `EDATE`). Los meses se leen del criterio vigente.
Una revisión está **vencida** si la próxima fecha es anterior a hoy y el activo no está archivado.

«Hoy» se calcula en la zona horaria de la organización (`organizations.time_zone`, por defecto `America/La_Paz`).

## 5. Alertas de seguimiento (`follow-up.ts`)

Equivale a `Seguimiento!M`:

| Alerta | Condición |
|---|---|
| Cerrada | Estado `Completada` |
| Sin fecha | No hay fecha programada |
| Vencida | Fecha programada anterior a hoy |
| Próxima | Entre hoy y hoy + 7 días, inclusive |
| En plazo | Posterior a hoy + 7 días |

## 6. Estado de control (`dashboard/metrics.ts`)

Cada control pertenece a exactamente un grupo, para que los gráficos no dupliquen registros:
Verificado (eficacia verificada = «Sí») > Implementado pendiente de verificar > En verificación > Planificado > Propuesto / No implementado.

Un control **verificado** exige en base de datos: fecha de verificación, resultado (≥ 5 caracteres), responsable y evidencia.
Implementar un control no lo convierte en eficaz.

## 7. Indicadores del panel (`dashboard/metrics.ts`)

- Porcentaje de inventario completo = (listos + validados) / activos. Sin activos, no se muestra porcentaje.
- Porcentaje de criticidad alta = criticidad alta / activos.
- Sin propietario = propietario no válido (incluye provisionales).
- Riesgos altos sin tratamiento = nivel inherente alto y tratamiento vacío o «pendiente».
- Los filtros de área y categoría se aplican antes de contar. Cada KPI coincide con su listado filtrado.

No se calculan tendencias, variaciones, pérdidas económicas ni ROI/ROSI: no hay histórico ni modelo económico aprobado.

## 8. Prioridades de atención (`buildPriorities`)

Cada alerta se muestra solo si hay registros afectados. Su texto, gravedad y acción salen de la regla:

- Activos de criticidad alta sin propietario válido (gravedad alta).
- Activos de criticidad alta sin evidencia verificada (alta).
- Riesgos altos sin tratamiento (alta).
- Controles implementados sin verificar (media).
- Revisiones vencidas (alta).
- Activos sin valoración CIA completa (media).
- Actividades de seguimiento vencidas (media).
- Activos sin propietario válido (baja).

## 9. Umbrales y versiones de criterios

Los criterios se guardan como versiones (`criteria_versions`). Solo una está `vigente`. Al publicar una nueva versión, la anterior pasa a `historico` y se conserva.

Comportamiento actual: la criticidad, la próxima revisión y los niveles de riesgo **se recalculan con la versión vigente en cada consulta**; no se almacenan. Por tanto, publicar nuevos umbrales cambia la vista de todos los activos. Las versiones históricas documentan qué criterios estuvieron vigentes, pero no congelan los resultados previos. Si la entidad necesita resultados congelados por evaluación, deberá añadirse un snapshot de la versión en cada evaluación (pendiente).

Los valores iniciales están marcados como **no aprobados** hasta que la organización publique una versión aprobada.
