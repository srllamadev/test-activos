import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { AuthContext } from "@/lib/auth/context";
import { DEFAULT_CIA_THRESHOLDS, type CiaThresholds, evaluateCia, type CriticalityLevel } from "@/lib/calculations/cia";
import { nextReviewDate, todayIn } from "@/lib/calculations/dates";
import {
  assetRegistryStatus,
  type AssetRegistryInput,
  type RegistryStatus,
} from "@/lib/calculations/asset-registry";
import { DEFAULT_RISK_THRESHOLDS, type RiskThresholds } from "@/lib/calculations/risk";

export type CatalogType =
  | "categoria"
  | "tipo_activo"
  | "clasificacion"
  | "estado_evidencia"
  | "ciclo_vida";

/** Catálogos que usa el formulario de activos. */
export const FORM_CATALOG_TYPES: CatalogType[] = [
  "categoria",
  "tipo_activo",
  "clasificacion",
  "estado_evidencia",
  "ciclo_vida",
];

export interface CatalogOption {
  code: string;
  label: string;
  active: boolean;
}

export interface ActiveCriteria {
  version: number;
  label: string;
  cia: CiaThresholds;
  risk: RiskThresholds;
  reviewMonths: number;
  approved: boolean;
}

/** Fila de activo tal como se guarda en PostgreSQL (snake_case). */
export interface AssetRow {
  id: string;
  code: string;
  name: string | null;
  category_code: string | null;
  asset_type_code: string | null;
  description: string | null;
  macroprocess: string | null;
  process: string | null;
  subprocess: string | null;
  responsible_area: string | null;
  location: string | null;
  supplier: string | null;
  owner_name: string | null;
  custodian_name: string | null;
  administrator_name: string | null;
  authorized_users: string | null;
  confidentiality: number | null;
  integrity: number | null;
  availability: number | null;
  criticality_justification: string | null;
  evidence_reference: string | null;
  evidence_status_code: string | null;
  source_reference: string | null;
  review_date: string | null;
  classification_code: string | null;
  lifecycle_code: string | null;
  regulatory_reference: string | null;
  observations: string | null;
  is_draft: boolean;
  validated_at: string | null;
  archived_at: string | null;
  updated_at: string;
}

/** Vista calculada para listados y fichas. */
export interface AssetView extends AssetRow {
  criticality: CriticalityLevel | null;
  criticalityMax: number | null;
  registryStatus: RegistryStatus;
  missing: string[];
  nextReview: string | null;
  reviewOverdue: boolean;
}

export const ASSET_LIST_COLUMNS =
  "id, code, name, category_code, asset_type_code, description, macroprocess, process, subprocess, responsible_area, location, supplier, owner_name, custodian_name, administrator_name, authorized_users, confidentiality, integrity, availability, criticality_justification, evidence_reference, evidence_status_code, source_reference, review_date, classification_code, lifecycle_code, regulatory_reference, observations, is_draft, validated_at, archived_at, updated_at";

export async function getActiveCriteria(ctx: AuthContext): Promise<ActiveCriteria> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("criteria_versions")
    .select("version_number, label, critical_from, medium_from, risk_high_from, risk_medium_from, review_months")
    .eq("organization_id", ctx.organizationId)
    .eq("status", "vigente")
    .maybeSingle();

  if (error) throw new Error("No se pudieron cargar los criterios vigentes.");
  if (!data) {
    return {
      version: 0,
      label: "Valores por defecto (sin versión registrada)",
      cia: DEFAULT_CIA_THRESHOLDS,
      risk: DEFAULT_RISK_THRESHOLDS,
      reviewMonths: 3,
      approved: false,
    };
  }

  const { data: org } = await supabase
    .from("organizations")
    .select("criteria_approved")
    .eq("id", ctx.organizationId)
    .single();

  return {
    version: data.version_number,
    label: data.label,
    cia: { criticalFrom: data.critical_from, mediumFrom: data.medium_from },
    risk: { highFrom: data.risk_high_from, mediumFrom: data.risk_medium_from },
    reviewMonths: data.review_months,
    approved: Boolean(org?.criteria_approved),
  };
}

export async function getCatalogs(
  ctx: AuthContext,
  types: CatalogType[],
): Promise<Record<CatalogType, CatalogOption[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("catalog_options")
    .select("catalog_type, code, label, active, sort_order")
    .eq("organization_id", ctx.organizationId)
    .in("catalog_type", types)
    .order("sort_order", { ascending: true });

  if (error) throw new Error("No se pudieron cargar los catálogos.");

  const result = Object.fromEntries(types.map((t) => [t, [] as CatalogOption[]])) as Record<
    CatalogType,
    CatalogOption[]
  >;
  for (const row of data ?? []) {
    result[row.catalog_type as CatalogType].push({ code: row.code, label: row.label, active: row.active });
  }
  return result;
}

/** Traduce una fila de base de datos a la entrada de las reglas de registro. */
export function registryInputFromRow(row: AssetRow): AssetRegistryInput {
  return {
    code: row.code,
    name: row.name,
    category: row.category_code,
    assetType: row.asset_type_code,
    description: row.description,
    macroprocess: row.macroprocess,
    process: row.process,
    owner: row.owner_name,
    responsibleArea: row.responsible_area,
    classification: row.classification_code,
    lifecycle: row.lifecycle_code,
    reviewDate: row.review_date,
    confidentiality: row.confidentiality,
    integrity: row.integrity,
    availability: row.availability,
    criticalityJustification: row.criticality_justification,
    evidenceReference: row.evidence_reference,
    evidenceStatus: row.evidence_status_code,
    source: row.source_reference,
    isDraft: row.is_draft,
    validatedAt: row.validated_at,
    duplicateCode: false,
  };
}

/** Convierte una fila en vista calculada usando las reglas centralizadas. */
export function toAssetView(row: AssetRow, criteria: ActiveCriteria, today: string): AssetView {
  const cia = evaluateCia(
    {
      confidencialidad: row.confidentiality,
      integridad: row.integrity,
      disponibilidad: row.availability,
    },
    criteria.cia,
  );
  const { status, missing } = assetRegistryStatus(registryInputFromRow(row));
  const nextReview = nextReviewDate(row.review_date, criteria.reviewMonths);
  const reviewOverdue = row.archived_at === null && nextReview !== null && nextReview < today;

  return {
    ...row,
    criticality: cia.level,
    criticalityMax: cia.max,
    registryStatus: status,
    missing: missing.map((m) => m.label),
    nextReview,
    reviewOverdue,
  };
}

export interface AssetQueryContext {
  criteria: ActiveCriteria;
  today: string;
}

export async function getAssetQueryContext(ctx: AuthContext): Promise<AssetQueryContext> {
  const criteria = await getActiveCriteria(ctx);
  return { criteria, today: todayIn(ctx.timeZone) };
}

/** Todos los activos de la organización (sin archivar salvo que se pida). Filtrado y paginación en servidor. */
export async function listAssetViews(ctx: AuthContext, options: { includeArchived?: boolean } = {}) {
  const supabase = await createClient();
  let query = supabase
    .from("assets")
    .select(ASSET_LIST_COLUMNS)
    .eq("organization_id", ctx.organizationId)
    .order("code", { ascending: true })
    .limit(5000);
  if (!options.includeArchived) query = query.is("archived_at", null);

  const { data, error } = await query;
  if (error) throw new Error("No se pudo cargar el inventario.");

  const qc = await getAssetQueryContext(ctx);
  return (data as unknown as AssetRow[]).map((row) => toAssetView(row, qc.criteria, qc.today));
}

export interface AssetDetail {
  view: AssetView;
  dependencies: Array<{ id: string; code: string; name: string | null }>;
  dependents: Array<{ id: string; code: string; name: string | null }>;
  createdAt: string;
}

export async function getAssetDetail(ctx: AuthContext, id: string): Promise<AssetDetail | null> {
  const supabase = await createClient();
  const { data: row, error } = await supabase
    .from("assets")
    .select(`${ASSET_LIST_COLUMNS}, created_at`)
    .eq("organization_id", ctx.organizationId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("No se pudo cargar el activo.");
  if (!row) return null;

  const qc = await getAssetQueryContext(ctx);
  const view = toAssetView(row as unknown as AssetRow, qc.criteria, qc.today);

  const { data: deps } = await supabase
    .from("asset_dependencies")
    .select("depends_on:assets!dependencies_target_fk(id, code, name)")
    .eq("asset_id", id);
  const { data: dependents } = await supabase
    .from("asset_dependencies")
    .select("source:assets!dependencies_asset_fk(id, code, name)")
    .eq("depends_on_asset_id", id);

  return {
    view,
    dependencies: (deps ?? []).map((d) => normalizeRef(d.depends_on)).filter(isRef),
    dependents: (dependents ?? []).map((d) => normalizeRef(d.source)).filter(isRef),
    createdAt: (row as unknown as { created_at: string }).created_at,
  };
}

type Ref = { id: string; code: string; name: string | null };
function normalizeRef(value: unknown): Ref | null {
  const v = Array.isArray(value) ? value[0] : value;
  return v && typeof v === "object" && "id" in v ? (v as Ref) : null;
}
function isRef(v: Ref | null): v is Ref {
  return v !== null;
}
