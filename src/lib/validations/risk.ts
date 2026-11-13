import { z } from "zod";

/**
 * Esquema de validación para el formulario de registro de riesgos.
 * Incluye los 22 campos especificados en el Excel de referencia.
 */

const REQUIRED_FIELDS_MESSAGE = "Este campo es obligatorio para guardar el registro.";

export const riskFormSchema = z.object({
  // Identificación
  code: z.string().min(1, REQUIRED_FIELDS_MESSAGE).max(40, "Máximo 40 caracteres"),
  
  // Activo asociado
  assetId: z.string().min(1, "Selecciona un activo asociado"),
  
  // Escenario de riesgo
  threatSource: z.string().min(1, REQUIRED_FIELDS_MESSAGE).max(500, "Máximo 500 caracteres"),
  vulnerability: z.string().min(1, REQUIRED_FIELDS_MESSAGE).max(500, "Máximo 500 caracteres"),
  scenarioConsequence: z.string().min(1, REQUIRED_FIELDS_MESSAGE).max(1000, "Máximo 1000 caracteres"),
  affectedProcess: z.string().min(1, REQUIRED_FIELDS_MESSAGE).max(200, "Máximo 200 caracteres"),
  
  // Evaluación inherente
  probabilityInherent: z.string().min(1, REQUIRED_FIELDS_MESSAGE),
  impactInherent: z.string().min(1, REQUIRED_FIELDS_MESSAGE),
  
  // Controles existentes
  existingControls: z.string().optional(),
  
  // Evaluación residual (opcional inicialmente)
  probabilityResidual: z.string().optional(),
  impactResidual: z.string().optional(),
  
  // Tratamiento
  treatmentCode: z.string().min(1, REQUIRED_FIELDS_MESSAGE),
  
  // Responsables y fechas
  riskOwner: z.string().min(1, REQUIRED_FIELDS_MESSAGE).max(200, "Máximo 200 caracteres"),
  assessmentDate: z.string().min(1, REQUIRED_FIELDS_MESSAGE),
  
  // Evidencia
  evidenceStatusCode: z.string().min(1, REQUIRED_FIELDS_MESSAGE),
  evidenceBasis: z.string().min(1, REQUIRED_FIELDS_MESSAGE).max(1000, "Máximo 1000 caracteres"),
  
  // Observaciones
  observations: z.string().optional(),
  
  // Estado
  isDraft: z.boolean().default(true),
});

export type RiskFormValues = z.infer<typeof riskFormSchema>;

export const RISK_FORM_DEFAULTS: RiskFormValues = {
  code: "",
  assetId: "",
  threatSource: "",
  vulnerability: "",
  scenarioConsequence: "",
  affectedProcess: "",
  probabilityInherent: "",
  impactInherent: "",
  existingControls: "",
  probabilityResidual: "",
  impactResidual: "",
  treatmentCode: "",
  riskOwner: "",
  assessmentDate: "",
  evidenceStatusCode: "",
  evidenceBasis: "",
  observations: "",
  isDraft: true,
};

/**
 * Campos que forman cada sección del formulario (para validación por paso).
 */
export const RISK_STEP_FIELDS: Array<Array<keyof RiskFormValues>> = [
  ["code", "assetId"], // Paso 1: Identificación
  ["threatSource", "vulnerability", "scenarioConsequence", "affectedProcess"], // Paso 2: Escenario
  ["probabilityInherent", "impactInherent", "existingControls"], // Paso 3: Evaluación Inherente
  ["probabilityResidual", "impactResidual"], // Paso 4: Evaluación Residual
  ["treatmentCode", "riskOwner", "assessmentDate"], // Paso 5: Tratamiento
  ["evidenceStatusCode", "evidenceBasis", "observations"], // Paso 6: Evidencia
];

export const ASSET_STEP_FIELDS = RISK_STEP_FIELDS; // Alias para compatibilidad

/**
 * Convierte los valores del formulario a los datos necesarios para validar.
 */
export function parseRiskForm(raw: unknown, _options: { draft: boolean }) {
  const base = riskFormSchema.safeParse(raw);
  
  if (!base.success) {
    return { ok: false as const, fieldErrors: collectErrors(base.error), message: "Revisa los campos marcados." };
  }
  
  return { ok: true as const, data: base.data };
}

function collectErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0] as string | undefined;
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}

/**
 * Índice del paso que contiene el primer campo con error.
 */
export function firstStepWithError(errors: Record<string, string>): number {
  const idx = RISK_STEP_FIELDS.findIndex((fields) => fields.some((f) => errors[f]));
  return idx === -1 ? 0 : idx;
}
