import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { AuthContext } from "@/lib/auth/context";
import { evaluateInherentRisk, evaluateResidualRisk, type RiskThresholds, type RiskLevel } from "@/lib/calculations/risk";
import { getActiveCriteria } from "@/features/assets/data";

/**
 * Fila de riesgo tal como se guarda en PostgreSQL (snake_case).
 */
export interface RiskRow {
  id: string;
  code: string;
  asset_id: string;
  threat_source: string | null;
  vulnerability: string | null;
  scenario_consequence: string | null;
  affected_process: string | null;
  probability_inherent: number | null;
  impact_inherent: number | null;
  existing_controls: string | null;
  probability_residual: number | null;
  impact_residual: number | null;
  residual_assessed_at: string | null;
  residual_assessed_by: string | null;
  treatment_code: string | null;
  risk_owner: string | null;
  assessment_date: string | null;
  evidence_status_code: string | null;
  evidence_basis: string | null;
  observations: string | null;
  is_draft: boolean;
  archived_at: string | null;
  updated_at: string;
  created_at: string;
}

/**
 * Vista calculada para listados y fichas.
 */
export interface RiskView extends RiskRow {
  // Datos del activo asociado
  asset_code: string;
  asset_name: string | null;
  asset_category_code: string | null;
  
  // Cálculos de riesgo
  riskInherentScore: number | null;
  riskInherentLevel: RiskLevel | null;
  riskResidualScore: number | null;
  riskResidualLevel: RiskLevel | null;
  
  // Estado de evaluación residual
  hasResidualEvaluation: boolean;
}

export const RISK_LIST_COLUMNS = `
  id, code, asset_id, threat_source, vulnerability, scenario_consequence, affected_process,
  probability_inherent, impact_inherent, existing_controls,
  probability_residual, impact_residual, residual_assessed_at, residual_assessed_by,
  treatment_code, risk_owner, assessment_date,
  evidence_status_code, evidence_basis, observations,
  is_draft, archived_at, updated_at, created_at
`;

/**
 * Obtiene la lista de todos los riesgos de la organización (sin archivar salvo que se pida).
 */
export async function listRiskViews(
  ctx: AuthContext,
  options: { includeArchived?: boolean } = {}
): Promise<RiskView[]> {
  const supabase = await createClient();
  
  // Obtener criterios vigentes para los umbrales
  const criteria = await getActiveCriteria(ctx);
  const thresholds: RiskThresholds = {
    highFrom: criteria.risk.highFrom,
    mediumFrom: criteria.risk.mediumFrom,
  };
  
  // Consultar riesgos con datos del activo
  let query = supabase
    .from("risks")
    .select(`
      ${RISK_LIST_COLUMNS},
      asset:assets!risks_asset_fk(id, code, name, category_code)
    `)
    .eq("organization_id", ctx.organizationId)
    .order("code", { ascending: true })
    .limit(5000);
  
  if (!options.includeArchived) {
    query = query.is("archived_at", null);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error("Error loading risks:", error);
    throw new Error("No se pudieron cargar los riesgos.");
  }
  
  // Mapear a RiskView con cálculos
  return (data || []).map((row) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const asset = (row as any).asset || { code: "N/A", name: null, category_code: null };
    
    // Calcular riesgo inherente
    const inherentResult = evaluateInherentRisk(
      row.probability_inherent,
      row.impact_inherent,
      thresholds
    );
    
    // Calcular riesgo residual
    const residualResult = evaluateResidualRisk(
      row.probability_residual,
      row.impact_residual,
      thresholds
    );
    
    return {
      ...row,
      asset_code: asset.code,
      asset_name: asset.name,
      asset_category_code: asset.category_code,
      riskInherentScore: inherentResult.score,
      riskInherentLevel: inherentResult.level,
      riskResidualScore: residualResult.score,
      riskResidualLevel: residualResult.level,
      hasResidualEvaluation: residualResult.level !== null,
    } as RiskView;
  });
}

/**
 * Obtiene el detalle completo de un riesgo.
 */
export async function getRiskDetail(ctx: AuthContext, id: string): Promise<RiskView | null> {
  const supabase = await createClient();
  const criteria = await getActiveCriteria(ctx);
  const thresholds: RiskThresholds = {
    highFrom: criteria.risk.highFrom,
    mediumFrom: criteria.risk.mediumFrom,
  };
  
  const { data: row, error } = await supabase
    .from("risks")
    .select(`
      ${RISK_LIST_COLUMNS},
      asset:assets!risks_asset_fk(id, code, name, category_code)
    `)
    .eq("organization_id", ctx.organizationId)
    .eq("id", id)
    .maybeSingle();
  
  if (error) {
    console.error("Error loading risk:", error);
    throw new Error("No se pudo cargar el riesgo.");
  }
  
  if (!row) return null;
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const asset = (row as any).asset || { code: "N/A", name: null, category_code: null };
  
  const inherentResult = evaluateInherentRisk(
    row.probability_inherent,
    row.impact_inherent,
    thresholds
  );
  
  const residualResult = evaluateResidualRisk(
    row.probability_residual,
    row.impact_residual,
    thresholds
  );
  
  return {
    ...row,
    asset_code: asset.code,
    asset_name: asset.name,
    asset_category_code: asset.category_code,
    riskInherentScore: inherentResult.score,
    riskInherentLevel: inherentResult.level,
    riskResidualScore: residualResult.score,
    riskResidualLevel: residualResult.level,
    hasResidualEvaluation: residualResult.level !== null,
  } as RiskView;
}

/**
 * Obtiene los catálogos necesarios para el formulario de riesgos.
 */
export async function getRiskCatalogs(ctx: AuthContext) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("catalog_options")
    .select("catalog_type, code, label, active, sort_order")
    .eq("organization_id", ctx.organizationId)
    .in("catalog_type", ["tratamiento", "estado_evidencia"])
    .order("sort_order", { ascending: true });
  
  if (error) {
    console.error("Error loading catalogs:", error);
    throw new Error("No se pudieron cargar los catálogos.");
  }
  
  const result = {
    tratamiento: [] as Array<{ code: string; label: string; active: boolean }>,
    estado_evidencia: [] as Array<{ code: string; label: string; active: boolean }>,
  };
  
  for (const row of data || []) {
    if (row.catalog_type === "tratamiento") {
      result.tratamiento.push({ code: row.code, label: row.label, active: row.active });
    } else if (row.catalog_type === "estado_evidencia") {
      result.estado_evidencia.push({ code: row.code, label: row.label, active: row.active });
    }
  }
  
  return result;
}

/**
 * Obtiene la lista de activos para el selector.
 */
export async function getAssetsForRisk(ctx: AuthContext): Promise<Array<{ id: string; code: string; name: string | null }>> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("assets")
    .select("id, code, name")
    .eq("organization_id", ctx.organizationId)
    .is("archived_at", null)
    .order("code", { ascending: true });
  
  if (error) {
    console.error("Error loading assets:", error);
    throw new Error("No se pudieron cargar los activos.");
  }
  
  return data || [];
}

/**
 * Carga todos los datos necesarios para el dashboard de riesgos (matriz, KPIs).
 */
export async function loadRiskDashboard(ctx: AuthContext) {
  const risks = await listRiskViews(ctx);
  const criteria = await getActiveCriteria(ctx);
  
  return {
    risks,
    criteria,
    thresholds: {
      highFrom: criteria.risk.highFrom,
      mediumFrom: criteria.risk.mediumFrom,
    },
  };
}
