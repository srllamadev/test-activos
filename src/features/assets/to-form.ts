import { ASSET_FORM_DEFAULTS, type AssetFormValues } from "@/lib/validations/asset";
import type { AssetRow } from "./data";

/** Convierte un registro guardado en valores de formulario (null => cadena vacía). */
export function assetToFormValues(row: AssetRow, dependencyCodes: string[]): AssetFormValues {
  const s = (v: string | null | undefined) => v ?? "";
  const n = (v: number | null | undefined) =>
    (v === null || v === undefined ? "" : String(v)) as AssetFormValues["confidentiality"];
  return {
    ...ASSET_FORM_DEFAULTS,
    code: row.code,
    name: s(row.name),
    categoryCode: s(row.category_code),
    assetTypeCode: s(row.asset_type_code),
    description: s(row.description),
    macroprocess: s(row.macroprocess),
    process: s(row.process),
    subprocess: s(row.subprocess),
    responsibleArea: s(row.responsible_area),
    location: s(row.location),
    supplier: s(row.supplier),
    ownerName: s(row.owner_name),
    custodianName: s(row.custodian_name),
    administratorName: s(row.administrator_name),
    authorizedUsers: s(row.authorized_users),
    dependencyCodes: dependencyCodes.join("; "),
    confidentiality: n(row.confidentiality),
    integrity: n(row.integrity),
    availability: n(row.availability),
    criticalityJustification: s(row.criticality_justification),
    evidenceReference: s(row.evidence_reference),
    evidenceStatusCode: s(row.evidence_status_code),
    sourceReference: s(row.source_reference),
    classificationCode: s(row.classification_code),
    regulatoryReference: s(row.regulatory_reference),
    lifecycleCode: s(row.lifecycle_code),
    reviewDate: s(row.review_date),
    observations: s(row.observations),
  };
}
