/**
 * Indicadores del panel y reglas de prioridad. Funciones puras: reciben registros ya
 * filtrados por el usuario y devuelven cifras reproducibles. No contienen tendencias
 * ni cifras inventadas: si no hay datos, los valores son 0 o null.
 */
import type { AssetView } from "@/features/assets/data";
import { isValidOwner } from "@/lib/calculations/asset-registry";
import { classifyRisk, riskScore, type RiskLevel, DEFAULT_RISK_THRESHOLDS, type RiskThresholds } from "@/lib/calculations/risk";
import { followUpAlert, type FollowUpAlert } from "@/lib/calculations/follow-up";

export interface RiskInput {
  id: string;
  code: string;
  asset_id: string;
  probability_inherent: number | null;
  impact_inherent: number | null;
  probability_residual: number | null;
  impact_residual: number | null;
  treatment_code: string | null;
}

export interface ControlInput {
  id: string;
  code: string;
  risk_id: string;
  implementation_status_code: string | null;
  effectiveness_verified: "Sí" | "No" | "Pendiente";
}

export interface FollowUpInput {
  id: string;
  code: string;
  asset_id: string | null;
  status: string;
  scheduled_date: string | null;
  completed_date: string | null;
}

export type ControlGroup =
  | "verificado"
  | "pendiente_verificacion"
  | "en_verificacion"
  | "planificado"
  | "propuesto"
  | "no_implementado";

export const CONTROL_GROUP_LABEL: Record<ControlGroup, string> = {
  verificado: "Verificados",
  pendiente_verificacion: "Implementados, pendientes de verificar",
  en_verificacion: "En verificación",
  planificado: "Planificados",
  propuesto: "Propuestos",
  no_implementado: "No implementados",
};

export interface DashboardInput {
  assets: AssetView[];
  risks: RiskInput[];
  controls: ControlInput[];
  followUps: FollowUpInput[];
  today: string;
  riskThresholds?: RiskThresholds;
}

export interface DashboardMetrics {
  assets: {
    registered: number;
    ready: number;
    incomplete: number;
    drafts: number;
    validated: number;
    highCriticality: number;
    mediumCriticality: number;
    lowCriticality: number;
    withoutCia: number;
    withoutOwner: number;
    highWithoutOwner: number;
    highWithoutVerifiedEvidence: number;
    reviewsOverdue: number;
    completePct: number | null;
    highPct: number | null;
    byCategory: Array<{ code: string; count: number; pct: number }>;
    byArea: Array<{ area: string; total: number; high: number }>;
  };
  risks: {
    registered: number;
    inherentHigh: number;
    inherentMedium: number;
    inherentLow: number;
    residualEvaluated: number;
    residualNotEvaluated: number;
    residualHigh: number;
    residualMedium: number;
    residualLow: number;
    withoutTreatment: number;
    highWithoutTreatment: number;
  };
  controls: {
    registered: number;
    verified: number;
    groups: Record<ControlGroup, number>;
  };
  followUps: {
    registered: number;
    counts: Record<FollowUpAlert, number>;
  };
}

export function computeDashboardMetrics(input: DashboardInput): DashboardMetrics {
  const thresholds = input.riskThresholds ?? DEFAULT_RISK_THRESHOLDS;
  const { assets, risks, controls, followUps, today } = input;
  const total = assets.length;
  const pct = (n: number, d: number) => (d === 0 ? null : Math.round((n / d) * 1000) / 10);

  // Activos
  const categoryMap = new Map<string, number>();
  const areaMap = new Map<string, { total: number; high: number }>();
  for (const a of assets) {
    const cat = a.category_code ?? "sin_categoria";
    categoryMap.set(cat, (categoryMap.get(cat) ?? 0) + 1);
    const area = a.responsible_area?.trim() || "Sin área";
    const entry = areaMap.get(area) ?? { total: 0, high: 0 };
    entry.total += 1;
    if (a.criticality === "Alta") entry.high += 1;
    areaMap.set(area, entry);
  }
  const ready = assets.filter((a) => a.registryStatus === "Listo para revisión").length;
  const validated = assets.filter((a) => a.registryStatus === "Validado").length;
  const highCriticality = assets.filter((a) => a.criticality === "Alta").length;
  const complete = ready + validated;

  // Riesgos
  let inherentHigh = 0;
  let inherentMedium = 0;
  let inherentLow = 0;
  let residualEvaluated = 0;
  let residualHigh = 0;
  let residualMedium = 0;
  let residualLow = 0;
  let withoutTreatment = 0;
  let highWithoutTreatment = 0;
  for (const r of risks) {
    const inherent = classifyRisk(riskScore(r.probability_inherent, r.impact_inherent), thresholds);
    if (inherent === "Alto") inherentHigh++;
    else if (inherent === "Medio") inherentMedium++;
    else if (inherent === "Bajo") inherentLow++;

    const residual = classifyRisk(riskScore(r.probability_residual, r.impact_residual), thresholds) as RiskLevel | null;
    if (residual) {
      residualEvaluated++;
      if (residual === "Alto") residualHigh++;
      else if (residual === "Medio") residualMedium++;
      else residualLow++;
    }

    const untreated = !r.treatment_code || r.treatment_code === "pendiente";
    if (untreated) withoutTreatment++;
    if (untreated && inherent === "Alto") highWithoutTreatment++;
  }

  // Controles: cada control pertenece exactamente a un grupo (sin duplicar registros)
  const groups: Record<ControlGroup, number> = {
    verificado: 0,
    pendiente_verificacion: 0,
    en_verificacion: 0,
    planificado: 0,
    propuesto: 0,
    no_implementado: 0,
  };
  for (const c of controls) {
    groups[controlGroup(c)]++;
  }

  // Seguimiento
  const counts: Record<FollowUpAlert, number> = {
    Cerrada: 0,
    "Sin fecha": 0,
    Vencida: 0,
    Próxima: 0,
    "En plazo": 0,
  };
  for (const f of followUps) {
    counts[followUpAlert(f.status, f.scheduled_date, today)]++;
  }

  return {
    assets: {
      registered: total,
      ready,
      incomplete: assets.filter((a) => a.registryStatus === "Incompleto").length,
      drafts: assets.filter((a) => a.registryStatus === "Borrador").length,
      validated,
      highCriticality,
      mediumCriticality: assets.filter((a) => a.criticality === "Media").length,
      lowCriticality: assets.filter((a) => a.criticality === "Baja").length,
      withoutCia: assets.filter((a) => a.criticality === null).length,
      withoutOwner: assets.filter((a) => !isValidOwner(a.owner_name)).length,
      highWithoutOwner: assets.filter((a) => a.criticality === "Alta" && !isValidOwner(a.owner_name)).length,
      highWithoutVerifiedEvidence: assets.filter(
        (a) => a.criticality === "Alta" && a.evidence_status_code !== "verificada",
      ).length,
      reviewsOverdue: assets.filter((a) => a.reviewOverdue).length,
      completePct: pct(complete, total),
      highPct: pct(highCriticality, total),
      byCategory: Array.from(categoryMap.entries())
        .map(([code, count]) => ({ code, count, pct: pct(count, total) ?? 0 }))
        .sort((a, b) => b.count - a.count),
      byArea: Array.from(areaMap.entries())
        .map(([area, v]) => ({ area, ...v }))
        .sort((a, b) => b.total - a.total),
    },
    risks: {
      registered: risks.length,
      inherentHigh,
      inherentMedium,
      inherentLow,
      residualEvaluated,
      residualNotEvaluated: risks.length - residualEvaluated,
      residualHigh,
      residualMedium,
      residualLow,
      withoutTreatment,
      highWithoutTreatment,
    },
    controls: {
      registered: controls.length,
      verified: groups.verificado,
      groups,
    },
    followUps: {
      registered: followUps.length,
      counts,
    },
  };
}

/** Grupo único de un control, derivado de su estado de implementación y verificación. */
export function controlGroup(c: ControlInput): ControlGroup {
  if (c.effectiveness_verified === "Sí") return "verificado";
  switch (c.implementation_status_code) {
    case "implementado":
      return "pendiente_verificacion";
    case "en_verificacion":
      return "en_verificacion";
    case "planificado":
      return "planificado";
    case "no_implementado":
      return "no_implementado";
    default:
      return "propuesto";
  }
}

// ---------------------------------------------------------------------------
// Prioridades de atención: reglas explícitas y verificables.
// ---------------------------------------------------------------------------

export type Severity = "alta" | "media" | "baja";

export interface PriorityItem {
  id: string;
  problem: string;
  count: number;
  severity: Severity;
  explanation: string;
  action: string;
  /** null => el módulo aún no está disponible; se muestra el texto, sin enlace. */
  href: string | null;
}

export function buildPriorities(m: DashboardMetrics): PriorityItem[] {
  const items: PriorityItem[] = [
    {
      id: "critical-no-owner",
      problem: `${m.assets.highWithoutOwner} activos de criticidad alta no tienen propietario identificado.`,
      count: m.assets.highWithoutOwner,
      severity: "alta",
      explanation: "Un activo crítico sin propietario no tiene responsable de aprobar su protección ni sus cambios.",
      action: "Revisar activos",
      href: "/activos?criticidad=Alta&propietario=sin_propietario",
    },
    {
      id: "critical-no-evidence",
      problem: `${m.assets.highWithoutVerifiedEvidence} activos de criticidad alta sin evidencia verificada.`,
      count: m.assets.highWithoutVerifiedEvidence,
      severity: "alta",
      explanation: "La valoración de un activo crítico debe respaldarse con evidencia verificable.",
      action: "Revisar evidencias",
      href: "/activos?criticidad=Alta",
    },
    {
      id: "high-risk-untreated",
      problem: `${m.risks.highWithoutTreatment} riesgos inherentes altos sin tratamiento definido.`,
      count: m.risks.highWithoutTreatment,
      severity: "alta",
      explanation: "Los riesgos de nivel alto requieren una decisión de tratamiento: mitigar, transferir, evitar o aceptar.",
      action: "Ver riesgos",
      href: null,
    },
    {
      id: "controls-unverified",
      problem: `${m.controls.groups.pendiente_verificacion} controles implementados sin verificar su eficacia.`,
      count: m.controls.groups.pendiente_verificacion,
      severity: "media",
      explanation: "Un control implementado no equivale a un control eficaz hasta que se verifica con evidencia.",
      action: "Ver controles",
      href: null,
    },
    {
      id: "reviews-overdue",
      problem: `${m.assets.reviewsOverdue} activos con revisión vencida.`,
      count: m.assets.reviewsOverdue,
      severity: "alta",
      explanation: "La fecha de próxima revisión ya pasó según la frecuencia configurada.",
      action: "Ver por revisión",
      href: "/activos?orden=review",
    },
    {
      id: "no-cia",
      problem: `${m.assets.withoutCia} activos sin valoración CIA completa.`,
      count: m.assets.withoutCia,
      severity: "media",
      explanation: "Sin las tres dimensiones valoradas no es posible calcular la criticidad.",
      action: "Completar valoración",
      href: "/activos?criticidad=sin_calcular",
    },
    {
      id: "follow-up-overdue",
      problem: `${m.followUps.counts.Vencida} actividades de seguimiento atrasadas.`,
      count: m.followUps.counts.Vencida,
      severity: "media",
      explanation: "La fecha programada ya pasó y la actividad no está completada.",
      action: "Ver seguimiento",
      href: null,
    },
    {
      id: "no-owner",
      problem: `${m.assets.withoutOwner} activos sin propietario válido.`,
      count: m.assets.withoutOwner,
      severity: "baja",
      explanation: "Los valores provisionales como «Por identificar» no cuentan como propietario.",
      action: "Revisar activos",
      href: "/activos?propietario=sin_propietario",
    },
  ];
  return items.filter((i) => i.count > 0);
}
