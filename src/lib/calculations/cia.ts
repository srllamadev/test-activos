/**
 * Evaluación CIA (Confidencialidad, Integridad, Disponibilidad).
 * Equivalente a la columna "Criticidad preliminar" (S) de la hoja Inventario:
 *   =IF(COUNT(P:R)<3,"",IF(MAX(P:R)>=Crítico,"Alta",IF(MAX(P:R)>=Medio,"Media","Baja")))
 */

export type CiaValue = 1 | 2 | 3 | 4 | 5;
export type CriticalityLevel = "Alta" | "Media" | "Baja";
export type CiaDimension = "confidencialidad" | "integridad" | "disponibilidad";

export interface CiaThresholds {
  /** Máximo CIA >= criticalFrom => Alta (Excel: 'Criterios CIA'!B13 = 4) */
  criticalFrom: number;
  /** Máximo CIA >= mediumFrom (y < criticalFrom) => Media (Excel: B14 = 3) */
  mediumFrom: number;
}

export const DEFAULT_CIA_THRESHOLDS: CiaThresholds = {
  criticalFrom: 4,
  mediumFrom: 3,
};

export interface CiaInput {
  confidencialidad: number | null | undefined;
  integridad: number | null | undefined;
  disponibilidad: number | null | undefined;
}

export interface CiaResult {
  /** true solo si las tres dimensiones son enteros entre 1 y 5 */
  complete: boolean;
  max: number | null;
  level: CriticalityLevel | null;
  /** Dimensiones que alcanzan el valor máximo (para explicar el resultado) */
  dimensionsAtMax: CiaDimension[];
}

export function isValidCiaValue(value: unknown): value is CiaValue {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 5;
}

/**
 * Valida la configuración de umbrales. Devuelve lista de errores (vacía si es válida).
 * Reglas: enteros en 1..5, medio < crítico.
 */
export function validateCiaThresholds(t: CiaThresholds): string[] {
  const errors: string[] = [];
  if (!Number.isInteger(t.criticalFrom) || t.criticalFrom < 1 || t.criticalFrom > 5) {
    errors.push("El umbral de criticidad Alta debe ser un entero entre 1 y 5.");
  }
  if (!Number.isInteger(t.mediumFrom) || t.mediumFrom < 1 || t.mediumFrom > 5) {
    errors.push("El umbral de criticidad Media debe ser un entero entre 1 y 5.");
  }
  if (errors.length === 0 && t.mediumFrom >= t.criticalFrom) {
    errors.push("El umbral Medio debe ser menor que el umbral Alto.");
  }
  return errors;
}

export function evaluateCia(
  input: CiaInput,
  thresholds: CiaThresholds = DEFAULT_CIA_THRESHOLDS,
): CiaResult {
  const values: Array<[CiaDimension, unknown]> = [
    ["confidencialidad", input.confidencialidad],
    ["integridad", input.integridad],
    ["disponibilidad", input.disponibilidad],
  ];

  const complete = values.every(([, v]) => isValidCiaValue(v));
  if (!complete) {
    return { complete: false, max: null, level: null, dimensionsAtMax: [] };
  }

  const numbers = values.map(([, v]) => v as number);
  const max = Math.max(...numbers);
  const level: CriticalityLevel =
    max >= thresholds.criticalFrom ? "Alta" : max >= thresholds.mediumFrom ? "Media" : "Baja";
  const dimensionsAtMax = values
    .filter(([, v]) => v === max)
    .map(([dim]) => dim);

  return { complete: true, max, level, dimensionsAtMax };
}

export const CIA_DIMENSION_LABEL: Record<CiaDimension, string> = {
  confidencialidad: "Confidencialidad",
  integridad: "Integridad",
  disponibilidad: "Disponibilidad",
};
