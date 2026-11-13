/**
 * Cálculo de riesgo (inherente y residual).
 * Equivalente a Riesgos!J/K (inherente) y Riesgos!O/P (residual) del Excel:
 *   riesgo = probabilidad × impacto ; nivel: >= Alto => "Alto", >= Medio => "Medio", resto "Bajo".
 */

export type RiskLevel = "Alto" | "Medio" | "Bajo";
export const NOT_EVALUATED = "No evaluado" as const;

export interface RiskThresholds {
  /** Excel 'Criterios CIA'!B16 = 15 */
  highFrom: number;
  /** Excel 'Criterios CIA'!B17 = 6 */
  mediumFrom: number;
}

export const DEFAULT_RISK_THRESHOLDS: RiskThresholds = { highFrom: 15, mediumFrom: 6 };

export function isValidScale(value: unknown): value is 1 | 2 | 3 | 4 | 5 {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 5;
}

export function validateRiskThresholds(t: RiskThresholds): string[] {
  const errors: string[] = [];
  if (!Number.isInteger(t.highFrom) || t.highFrom < 2 || t.highFrom > 25) {
    errors.push("El umbral de riesgo alto debe ser un entero entre 2 y 25.");
  }
  if (!Number.isInteger(t.mediumFrom) || t.mediumFrom < 1 || t.mediumFrom > 25) {
    errors.push("El umbral de riesgo medio debe ser un entero entre 1 y 25.");
  }
  if (errors.length === 0 && t.mediumFrom >= t.highFrom) {
    errors.push("El umbral de riesgo medio debe ser menor que el umbral alto.");
  }
  return errors;
}

/** Puntuación 1–25 o null si falta probabilidad o impacto (nunca 0). */
export function riskScore(probability: unknown, impact: unknown): number | null {
  if (!isValidScale(probability) || !isValidScale(impact)) return null;
  return probability * impact;
}

export function classifyRisk(
  score: number | null,
  thresholds: RiskThresholds = DEFAULT_RISK_THRESHOLDS,
): RiskLevel | null {
  if (score === null) return null;
  if (score >= thresholds.highFrom) return "Alto";
  if (score >= thresholds.mediumFrom) return "Medio";
  return "Bajo";
}

export interface RiskEvaluation {
  score: number | null;
  level: RiskLevel | null;
  /** Texto para mostrar al usuario cuando no hay evaluación válida */
  label: string;
}

export function evaluateInherentRisk(
  probability: unknown,
  impact: unknown,
  thresholds: RiskThresholds = DEFAULT_RISK_THRESHOLDS,
): RiskEvaluation {
  const score = riskScore(probability, impact);
  const level = classifyRisk(score, thresholds);
  return { score, level, label: level ?? "Sin calcular" };
}

/**
 * El riesgo residual solo existe con una nueva valoración completa.
 * Nunca se deduce del número de controles registrados.
 */
export function evaluateResidualRisk(
  probability: unknown,
  impact: unknown,
  thresholds: RiskThresholds = DEFAULT_RISK_THRESHOLDS,
): RiskEvaluation {
  const score = riskScore(probability, impact);
  if (score === null) return { score: null, level: null, label: NOT_EVALUATED };
  const level = classifyRisk(score, thresholds);
  return { score, level, label: level ?? NOT_EVALUATED };
}
