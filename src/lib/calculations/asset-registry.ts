/**
 * Estado del registro de activo.
 * Equivalente a Inventario!Y (Estado del registro). Replica las comprobaciones originales
 * y añade la distinción Borrador / Validado que el Excel no tenía.
 *
 * Estados:
 *  - Borrador:            el usuario lo guardó sin completar; no se evalúa.
 *  - Incompleto:          faltan requisitos de la lista de verificación.
 *  - Listo para revisión: cumple todos los requisitos automáticos.
 *  - Validado:            aprobado formalmente por un usuario autorizado (validated_at/by) y
 *                         sin cambios posteriores (la edición limpia la validación en la capa de acciones).
 */
import { evaluateCia, type CiaInput, type CiaThresholds, DEFAULT_CIA_THRESHOLDS } from "./cia";
import { isIsoDate } from "./dates";

export type RegistryStatus = "Borrador" | "Incompleto" | "Listo para revisión" | "Validado";

/** Valores provisionales del Excel que no cuentan como propietario válido. */
export const PROVISIONAL_VALUES = ["Por identificar", "Por designar", "Por asignar", "Por confirmar"] as const;

/** Código almacenado para "Verificada" (catálogo estado_evidencia). */
export const EVIDENCE_VERIFIED = "verificada";

export interface AssetRegistryInput {
  code: string | null | undefined;
  name: string | null | undefined;
  category: string | null | undefined;
  assetType: string | null | undefined;
  description: string | null | undefined;
  macroprocess: string | null | undefined;
  process: string | null | undefined;
  owner: string | null | undefined;
  responsibleArea: string | null | undefined;
  classification: string | null | undefined;
  lifecycle: string | null | undefined;
  reviewDate: string | null | undefined;
  confidentiality: number | null | undefined;
  integrity: number | null | undefined;
  availability: number | null | undefined;
  criticalityJustification: string | null | undefined;
  evidenceReference: string | null | undefined;
  /** Código de catálogo (p. ej. "verificada"), no la etiqueta. */
  evidenceStatus: string | null | undefined;
  source: string | null | undefined;
  isDraft: boolean;
  validatedAt: string | null | undefined;
  /** true si el código aparece más de una vez en la organización */
  duplicateCode?: boolean;
}

export interface ChecklistItem {
  key: string;
  label: string;
  ok: boolean;
}

function filled(v: string | null | undefined): boolean {
  return typeof v === "string" && v.trim().length > 0;
}

/** Propietario válido: no vacío y no provisional (regla de registro). */
export function isValidOwner(owner: string | null | undefined): boolean {
  return filled(owner) && !PROVISIONAL_VALUES.some((p) => p.toLowerCase() === owner!.trim().toLowerCase());
}

/** Lista de verificación completa, igual a las comprobaciones de la fórmula original. */
export function assetChecklist(a: AssetRegistryInput): ChecklistItem[] {
  return [
    { key: "code", label: "ID existente y único", ok: filled(a.code) && !a.duplicateCode },
    { key: "name", label: "Nombre del activo", ok: filled(a.name) },
    { key: "category", label: "Categoría", ok: filled(a.category) },
    { key: "assetType", label: "Tipo de activo", ok: filled(a.assetType) },
    { key: "description", label: "Descripción y finalidad", ok: filled(a.description) },
    { key: "macroprocess", label: "Macroproceso", ok: filled(a.macroprocess) },
    { key: "process", label: "Proceso", ok: filled(a.process) },
    { key: "owner", label: "Propietario identificado (no provisional)", ok: isValidOwner(a.owner) },
    { key: "area", label: "Área o unidad responsable", ok: filled(a.responsibleArea) },
    { key: "classification", label: "Clasificación de información", ok: filled(a.classification) },
    { key: "lifecycle", label: "Ciclo de vida", ok: filled(a.lifecycle) },
    { key: "reviewDate", label: "Fecha de revisión válida", ok: isIsoDate(a.reviewDate) },
    {
      key: "cia",
      label: "Tres valores CIA completos (1–5)",
      ok: evaluateCia(toCiaInput(a)).complete,
    },
    { key: "justification", label: "Justificación de criticidad", ok: filled(a.criticalityJustification) },
    { key: "evidenceRef", label: "Evidencia o referencia documental", ok: filled(a.evidenceReference) },
    { key: "evidenceStatus", label: "Evidencia verificada", ok: a.evidenceStatus === EVIDENCE_VERIFIED },
    { key: "source", label: "Fuente o sección documentada", ok: filled(a.source) },
  ];
}

export function assetRegistryStatus(
  a: AssetRegistryInput,
): { status: RegistryStatus; missing: ChecklistItem[] } {
  if (a.isDraft) {
    return { status: "Borrador", missing: assetChecklist(a).filter((i) => !i.ok) };
  }
  const missing = assetChecklist(a).filter((i) => !i.ok);
  if (missing.length > 0) return { status: "Incompleto", missing };
  if (filled(a.validatedAt ?? null)) return { status: "Validado", missing };
  return { status: "Listo para revisión", missing };
}

export function toCiaInput(a: {
  confidentiality?: number | null;
  integrity?: number | null;
  availability?: number | null;
}): CiaInput {
  return {
    confidencialidad: a.confidentiality,
    integridad: a.integrity,
    disponibilidad: a.availability,
  };
}

export function assetCriticality(
  a: { confidentiality?: number | null; integrity?: number | null; availability?: number | null },
  thresholds: CiaThresholds = DEFAULT_CIA_THRESHOLDS,
) {
  return evaluateCia(toCiaInput(a), thresholds);
}
