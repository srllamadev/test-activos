import { describe, expect, it } from "vitest";
import { buildPriorities, computeDashboardMetrics, controlGroup, type ControlInput, type RiskInput } from "./metrics";
import type { AssetView } from "@/features/assets/data";

function asset(over: Partial<AssetView>): AssetView {
  return {
    id: over.id ?? "id",
    code: over.code ?? "AG-000",
    name: "Activo",
    category_code: "software_aplicaciones",
    asset_type_code: "primario",
    description: null,
    macroprocess: null,
    process: null,
    subprocess: null,
    responsible_area: "Área A",
    location: null,
    supplier: null,
    owner_name: null,
    custodian_name: null,
    administrator_name: null,
    authorized_users: null,
    confidentiality: 5,
    integrity: 5,
    availability: 5,
    criticality_justification: null,
    evidence_reference: null,
    evidence_status_code: "parcial",
    source_reference: null,
    review_date: "2026-11-01",
    classification_code: null,
    lifecycle_code: null,
    regulatory_reference: null,
    observations: null,
    is_draft: false,
    validated_at: null,
    archived_at: null,
    updated_at: "2026-11-01T00:00:00Z",
    criticality: "Alta",
    criticalityMax: 5,
    registryStatus: "Incompleto",
    missing: [],
    nextReview: "2027-02-01",
    reviewOverdue: false,
    ...over,
  };
}

const TODAY = "2026-11-12";

describe("Indicadores del panel", () => {
  it("cuenta criticidad y propietarios sin confundir provisionales", () => {
    const assets = [
      asset({ id: "1", criticality: "Alta", owner_name: "Por identificar" }),
      asset({ id: "2", criticality: "Alta", owner_name: "Director TI" }),
      asset({ id: "3", criticality: "Media", owner_name: null }),
      asset({ id: "4", criticality: null, owner_name: "Jefe" }),
    ];
    const m = computeDashboardMetrics({ assets, risks: [], controls: [], followUps: [], today: TODAY });
    expect(m.assets.registered).toBe(4);
    expect(m.assets.highCriticality).toBe(2);
    expect(m.assets.highWithoutOwner).toBe(1);
    expect(m.assets.withoutOwner).toBe(2);
    expect(m.assets.withoutCia).toBe(1);
  });

  it("porcentaje de inventario completo se calcula con listos y validados", () => {
    const assets = [
      asset({ id: "1", registryStatus: "Listo para revisión" }),
      asset({ id: "2", registryStatus: "Validado" }),
      asset({ id: "3", registryStatus: "Incompleto" }),
      asset({ id: "4", registryStatus: "Borrador" }),
    ];
    const m = computeDashboardMetrics({ assets, risks: [], controls: [], followUps: [], today: TODAY });
    expect(m.assets.completePct).toBe(50);
    expect(m.assets.ready).toBe(1);
    expect(m.assets.validated).toBe(1);
  });

  it("sin datos no inventa porcentajes", () => {
    const m = computeDashboardMetrics({ assets: [], risks: [], controls: [], followUps: [], today: TODAY });
    expect(m.assets.completePct).toBeNull();
    expect(m.assets.highPct).toBeNull();
    expect(m.risks.registered).toBe(0);
  });

  it("riesgos inherentes y residuales: residual sin evaluar no cuenta como bajo", () => {
    const risks: RiskInput[] = [
      { id: "r1", code: "R1", asset_id: "a", probability_inherent: 4, impact_inherent: 5, probability_residual: null, impact_residual: null, treatment_code: "mitigar" },
      { id: "r2", code: "R2", asset_id: "a", probability_inherent: 2, impact_inherent: 3, probability_residual: 1, impact_residual: 2, treatment_code: null },
      { id: "r3", code: "R3", asset_id: "a", probability_inherent: 3, impact_inherent: 4, probability_residual: 3, impact_residual: 3, treatment_code: "pendiente" },
    ];
    const m = computeDashboardMetrics({ assets: [asset({})], risks, controls: [], followUps: [], today: TODAY });
    expect(m.risks.inherentHigh).toBe(1);
    expect(m.risks.inherentMedium).toBe(2);
    expect(m.risks.residualEvaluated).toBe(2);
    expect(m.risks.residualNotEvaluated).toBe(1);
    expect(m.risks.residualLow).toBe(1);
    expect(m.risks.residualMedium).toBe(1);
    expect(m.risks.withoutTreatment).toBe(2);
    expect(m.risks.highWithoutTreatment).toBe(0);
  });

  it("cada control pertenece a exactamente un grupo", () => {
    const controls: ControlInput[] = [
      { id: "1", code: "C1", risk_id: "r", implementation_status_code: "implementado", effectiveness_verified: "No" },
      { id: "2", code: "C2", risk_id: "r", implementation_status_code: "implementado", effectiveness_verified: "Sí" },
      { id: "3", code: "C3", risk_id: "r", implementation_status_code: "propuesto", effectiveness_verified: "No" },
      { id: "4", code: "C4", risk_id: "r", implementation_status_code: null, effectiveness_verified: "No" },
    ];
    const m = computeDashboardMetrics({ assets: [asset({})], risks: [], controls, followUps: [], today: TODAY });
    expect(m.controls.verified).toBe(1);
    expect(m.controls.groups.pendiente_verificacion).toBe(1);
    expect(m.controls.groups.propuesto).toBe(2);
    const total = Object.values(m.controls.groups).reduce((a, b) => a + b, 0);
    expect(total).toBe(controls.length);
    expect(controlGroup(controls[1])).toBe("verificado");
  });

  it("seguimiento: alertas según la fecha de hoy", () => {
    const m = computeDashboardMetrics({
      assets: [],
      risks: [],
      controls: [],
      today: TODAY,
      followUps: [
        { id: "1", code: "S1", asset_id: null, status: "Pendiente", scheduled_date: "2026-11-01", completed_date: null },
        { id: "2", code: "S2", asset_id: null, status: "Pendiente", scheduled_date: "2026-11-15", completed_date: null },
        { id: "3", code: "S3", asset_id: null, status: "Completada", scheduled_date: "2026-10-01", completed_date: "2026-10-02" },
        { id: "4", code: "S4", asset_id: null, status: "Pendiente", scheduled_date: "2026-12-31", completed_date: null },
      ],
    });
    expect(m.followUps.counts.Vencida).toBe(1);
    expect(m.followUps.counts.Próxima).toBe(1);
    expect(m.followUps.counts.Cerrada).toBe(1);
    expect(m.followUps.counts["En plazo"]).toBe(1);
  });

  it("prioridades: solo muestran reglas con registros afectados", () => {
    const assets = [asset({ id: "1", criticality: "Alta", owner_name: null, evidence_status_code: "parcial" })];
    const m = computeDashboardMetrics({ assets, risks: [], controls: [], followUps: [], today: TODAY });
    const items = buildPriorities(m);
    const ids = items.map((i) => i.id);
    expect(ids).toContain("critical-no-owner");
    expect(ids).toContain("critical-no-evidence");
    expect(items.every((i) => i.count > 0)).toBe(true);
    expect(items.find((i) => i.id === "critical-no-owner")?.problem).toContain("1 activos de criticidad alta");
  });

  it("reproduce la estructura del caso de referencia: 50 activos, 40 críticos, 18 riesgos, 13 altos, 5 medios", () => {
    const assets = Array.from({ length: 50 }, (_, i) =>
      asset({ id: `a${i}`, code: `AG-${i}`, criticality: i < 40 ? "Alta" : "Media" }),
    );
    const risks: RiskInput[] = Array.from({ length: 18 }, (_, i) => ({
      id: `r${i}`,
      code: `R${i}`,
      asset_id: `a${i}`,
      probability_inherent: i < 13 ? 4 : 2,
      impact_inherent: i < 13 ? 5 : 3,
      probability_residual: null,
      impact_residual: null,
      treatment_code: "mitigar",
    }));
    const m = computeDashboardMetrics({ assets, risks, controls: [], followUps: [], today: TODAY });
    expect(m.assets.registered).toBe(50);
    expect(m.assets.highCriticality).toBe(40);
    expect(m.risks.registered).toBe(18);
    expect(m.risks.inherentHigh).toBe(13);
    expect(m.risks.inherentMedium).toBe(5);
    expect(m.risks.inherentLow).toBe(0);
  });
});
