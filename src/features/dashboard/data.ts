import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { AuthContext } from "@/lib/auth/context";
import { getAssetQueryContext, listAssetViews, type AssetView } from "@/features/assets/data";
import {
  buildPriorities,
  computeDashboardMetrics,
  type ControlInput,
  type FollowUpInput,
  type RiskInput,
} from "./metrics";

export interface DashboardFilters {
  area: string;
  category: string;
}

export interface DashboardData {
  assets: AssetView[];
  areas: string[];
  metrics: ReturnType<typeof computeDashboardMetrics>;
  priorities: ReturnType<typeof buildPriorities>;
  today: string;
  criteriaLabel: string;
  criteriaApproved: boolean;
}

/**
 * Carga los datos reales de la organización y calcula indicadores y prioridades.
 * Los filtros se aplican antes de contar, de modo que cada KPI corresponde al listado
 * que se abre desde él con los mismos filtros.
 */
export async function loadDashboard(ctx: AuthContext, filters: DashboardFilters): Promise<DashboardData> {
  const supabase = await createClient();
  const [all, qc] = await Promise.all([listAssetViews(ctx), getAssetQueryContext(ctx)]);

  const areas = Array.from(new Set(all.map((a) => a.responsible_area).filter((v): v is string => !!v))).sort();
  const assets = all.filter(
    (a) =>
      (!filters.area || a.responsible_area === filters.area) &&
      (!filters.category || a.category_code === filters.category),
  );
  const assetIds = new Set(assets.map((a) => a.id));

  const { data: riskRows, error: riskError } = await supabase
    .from("risks")
    .select("id, code, asset_id, probability_inherent, impact_inherent, probability_residual, impact_residual, treatment_code")
    .eq("organization_id", ctx.organizationId)
    .is("archived_at", null);
  if (riskError) throw new Error("No se pudieron cargar los riesgos.");
  const risks = ((riskRows ?? []) as RiskInput[]).filter((r) => assetIds.has(r.asset_id));
  const riskIds = new Set(risks.map((r) => r.id));

  const { data: controlRows, error: controlError } = await supabase
    .from("controls")
    .select("id, code, risk_id, implementation_status_code, effectiveness_verified")
    .eq("organization_id", ctx.organizationId)
    .is("archived_at", null);
  if (controlError) throw new Error("No se pudieron cargar los controles.");
  const controls = ((controlRows ?? []) as ControlInput[]).filter((c) => riskIds.has(c.risk_id));

  const { data: followRows, error: followError } = await supabase
    .from("follow_up_activities")
    .select("id, code, asset_id, status, scheduled_date, completed_date")
    .eq("organization_id", ctx.organizationId)
    .is("archived_at", null);
  if (followError) throw new Error("No se pudo cargar el seguimiento.");
  const followUps = ((followRows ?? []) as FollowUpInput[]).filter(
    (f) => (f.asset_id === null ? !filters.area && !filters.category : assetIds.has(f.asset_id)),
  );

  const metrics = computeDashboardMetrics({
    assets,
    risks,
    controls,
    followUps,
    today: qc.today,
    riskThresholds: qc.criteria.risk,
  });

  return {
    assets,
    areas,
    metrics,
    priorities: buildPriorities(metrics),
    today: qc.today,
    criteriaLabel: qc.criteria.label,
    criteriaApproved: qc.criteria.approved,
  };
}
