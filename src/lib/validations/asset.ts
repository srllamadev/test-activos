import { z } from "zod";
import { isIsoDate } from "@/lib/calculations/dates";

/**
 * Esquema del formulario de activos (31 campos del Excel, agrupados en 6 pasos).
 * Los valores llegan como cadenas desde el formulario; parseAssetForm() los normaliza.
 * El mismo esquema se aplica en el cliente (React Hook Form) y en el servidor (Server Action).
 */

const CODE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,39}$/;
const CATALOG_CODE = /^[a-z0-9_]+$/;

const text = (max: number, label: string) =>
  z.string().max(max, `${label}: máximo ${max} caracteres.`);

const ciaField = z.enum(["", "1", "2", "3", "4", "5"], {
  error: "Selecciona un valor entre 1 y 5.",
});

export const assetFormSchema = z.object({
  // Paso 1 — Identificación
  code: text(40, "Código"),
  name: text(200, "Nombre"),
  categoryCode: z.string(),
  assetTypeCode: z.string(),
  description: text(2000, "Descripción"),
  // Paso 2 — Contexto organizacional
  macroprocess: text(200, "Macroproceso"),
  process: text(200, "Proceso"),
  subprocess: text(200, "Subproceso"),
  responsibleArea: text(200, "Área responsable"),
  location: text(500, "Ubicación"),
  supplier: text(300, "Proveedor o tercero"),
  // Paso 3 — Responsabilidades
  ownerName: text(200, "Propietario"),
  custodianName: text(200, "Custodio"),
  administratorName: text(200, "Administrador"),
  authorizedUsers: text(500, "Usuarios autorizados"),
  dependencyCodes: text(500, "Dependencias"),
  // Paso 4 — Valoración CIA
  confidentiality: ciaField,
  integrity: ciaField,
  availability: ciaField,
  criticalityJustification: text(2000, "Justificación"),
  // Paso 5 — Evidencias
  evidenceReference: text(1000, "Evidencia o referencia"),
  evidenceStatusCode: z.string(),
  sourceReference: text(1000, "Fuente o sección"),
  classificationCode: z.string(),
  regulatoryReference: text(1000, "Referencia normativa"),
  // Paso 6 — Revisión
  lifecycleCode: z.string(),
  reviewDate: z
    .string()
    .refine((v) => v === "" || isIsoDate(v), { message: "Fecha de revisión no válida." }),
  observations: text(3000, "Observaciones"),
});

export type AssetFormValues = z.infer<typeof assetFormSchema>;

export const ASSET_FORM_DEFAULTS: AssetFormValues = {
  code: "",
  name: "",
  categoryCode: "",
  assetTypeCode: "",
  description: "",
  macroprocess: "",
  process: "",
  subprocess: "",
  responsibleArea: "",
  location: "",
  supplier: "",
  ownerName: "",
  custodianName: "",
  administratorName: "",
  authorizedUsers: "",
  dependencyCodes: "",
  confidentiality: "",
  integrity: "",
  availability: "",
  criticalityJustification: "",
  evidenceReference: "",
  evidenceStatusCode: "",
  sourceReference: "",
  classificationCode: "",
  regulatoryReference: "",
  lifecycleCode: "",
  reviewDate: "",
  observations: "",
};

/** Campos que forman cada paso del formulario (para validar por paso). */
export const ASSET_STEP_FIELDS: Array<Array<keyof AssetFormValues>> = [
  ["code", "name", "categoryCode", "assetTypeCode", "description"],
  ["macroprocess", "process", "subprocess", "responsibleArea", "location", "supplier"],
  ["ownerName", "custodianName", "administratorName", "authorizedUsers", "dependencyCodes"],
  ["confidentiality", "integrity", "availability", "criticalityJustification"],
  ["evidenceReference", "evidenceStatusCode", "sourceReference", "classificationCode", "regulatoryReference"],
  ["lifecycleCode", "reviewDate", "observations"],
];

/** Campos mínimos para guardar un registro que no sea borrador. El resto puede quedar pendiente
 *  y el estado del registro lo indicará como "Incompleto". */
const REQUIRED_TO_SAVE: Array<[keyof AssetFormValues, string]> = [
  ["code", "Código"],
  ["name", "Nombre"],
  ["categoryCode", "Categoría"],
  ["assetTypeCode", "Tipo de activo"],
];

export interface ParsedAssetInput {
  code: string;
  name: string | null;
  categoryCode: string | null;
  assetTypeCode: string | null;
  description: string | null;
  macroprocess: string | null;
  process: string | null;
  subprocess: string | null;
  responsibleArea: string | null;
  location: string | null;
  supplier: string | null;
  ownerName: string | null;
  custodianName: string | null;
  administratorName: string | null;
  authorizedUsers: string | null;
  dependencyCodes: string[];
  confidentiality: number | null;
  integrity: number | null;
  availability: number | null;
  criticalityJustification: string | null;
  evidenceReference: string | null;
  evidenceStatusCode: string | null;
  sourceReference: string | null;
  classificationCode: string | null;
  regulatoryReference: string | null;
  lifecycleCode: string | null;
  reviewDate: string | null;
  observations: string | null;
}

export type FieldErrors = Partial<Record<keyof AssetFormValues, string>>;

export type ParseResult =
  | { ok: true; data: ParsedAssetInput }
  | { ok: false; fieldErrors: FieldErrors; message: string };

const blankToNull = (v: string): string | null => {
  const t = v.trim();
  return t === "" ? null : t;
};

/** Parsea y valida el formulario. Reglas de guardado: borrador = solo validación de formato;
 *  registro = además exige identificación mínima. */
export function parseAssetForm(raw: unknown, options: { draft: boolean }): ParseResult {
  const base = assetFormSchema.safeParse(raw);
  if (!base.success) {
    return { ok: false, fieldErrors: collectErrors(base.error), message: "Revisa los campos marcados." };
  }
  const v = base.data;
  const fieldErrors: FieldErrors = {};

  if (!options.draft) {
    for (const [key, label] of REQUIRED_TO_SAVE) {
      if (!v[key].trim()) fieldErrors[key] = `${label} es obligatorio para guardar el registro.`;
    }
  }
  if (v.code.trim() && !CODE_PATTERN.test(v.code.trim())) {
    fieldErrors.code = "Usa 1–40 caracteres: letras, números, punto, guion o guion bajo (ej. AG-001).";
  }
  if (v.code.trim() === "") {
    fieldErrors.code = "El código es obligatorio, incluso en un borrador.";
  }
  for (const key of ["categoryCode", "assetTypeCode", "evidenceStatusCode", "classificationCode", "lifecycleCode"] as const) {
    if (v[key] && !CATALOG_CODE.test(v[key])) fieldErrors[key] = "Valor de catálogo no válido.";
  }

  const dependencyCodes = splitCodes(v.dependencyCodes);
  const own = v.code.trim().toUpperCase();
  const badDep = dependencyCodes.find((c) => !CODE_PATTERN.test(c));
  if (badDep) fieldErrors.dependencyCodes = `Código de dependencia no válido: ${badDep}.`;
  else if (dependencyCodes.some((c) => c.toUpperCase() === own)) {
    fieldErrors.dependencyCodes = "Un activo no puede depender de sí mismo.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors, message: "Revisa los campos marcados." };
  }

  const cia = (s: string) => (s === "" ? null : Number(s));
  return {
    ok: true,
    data: {
      code: v.code.trim(),
      name: blankToNull(v.name),
      categoryCode: blankToNull(v.categoryCode),
      assetTypeCode: blankToNull(v.assetTypeCode),
      description: blankToNull(v.description),
      macroprocess: blankToNull(v.macroprocess),
      process: blankToNull(v.process),
      subprocess: blankToNull(v.subprocess),
      responsibleArea: blankToNull(v.responsibleArea),
      location: blankToNull(v.location),
      supplier: blankToNull(v.supplier),
      ownerName: blankToNull(v.ownerName),
      custodianName: blankToNull(v.custodianName),
      administratorName: blankToNull(v.administratorName),
      authorizedUsers: blankToNull(v.authorizedUsers),
      dependencyCodes,
      confidentiality: cia(v.confidentiality),
      integrity: cia(v.integrity),
      availability: cia(v.availability),
      criticalityJustification: blankToNull(v.criticalityJustification),
      evidenceReference: blankToNull(v.evidenceReference),
      evidenceStatusCode: blankToNull(v.evidenceStatusCode),
      sourceReference: blankToNull(v.sourceReference),
      classificationCode: blankToNull(v.classificationCode),
      regulatoryReference: blankToNull(v.regulatoryReference),
      lifecycleCode: blankToNull(v.lifecycleCode),
      reviewDate: blankToNull(v.reviewDate),
      observations: blankToNull(v.observations),
    },
  };
}

/** Separa "AG-001; AG-002, AG-003" en códigos normalizados y sin duplicados. */
export function splitCodes(value: string): string[] {
  const parts = value
    .split(/[;,\s]+/)
    .map((p) => p.trim())
    .filter(Boolean);
  return Array.from(new Set(parts));
}

function collectErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path[0] as keyof AssetFormValues | undefined;
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}

/** Índice del paso que contiene el primer campo con error (para navegar al usuario). */
export function firstStepWithError(errors: FieldErrors): number {
  const idx = ASSET_STEP_FIELDS.findIndex((fields) => fields.some((f) => errors[f]));
  return idx === -1 ? 0 : idx;
}
