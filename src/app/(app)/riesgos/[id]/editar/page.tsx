import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getAuthContext, canEdit } from "@/lib/auth/context";
import { PageHeader } from "@/components/ui/page-header";
import { RiskForm } from "@/features/risks/risk-form";
import { getActiveCriteria } from "@/features/assets/data";
import { getRiskDetail, getRiskCatalogs, getAssetsForRisk } from "@/features/risks/data";

export const metadata: Metadata = { title: "Editar riesgo" };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toFormValues(risk: any): any {
  return {
    code: risk.code || "",
    assetId: risk.asset_id || "",
    threatSource: risk.threat_source || "",
    vulnerability: risk.vulnerability || "",
    scenarioConsequence: risk.scenario_consequence || "",
    affectedProcess: risk.affected_process || "",
    probabilityInherent: risk.probability_inherent?.toString() || "",
    impactInherent: risk.impact_inherent?.toString() || "",
    existingControls: risk.existing_controls || "",
    probabilityResidual: risk.probability_residual?.toString() || "",
    impactResidual: risk.impact_residual?.toString() || "",
    treatmentCode: risk.treatment_code || "",
    riskOwner: risk.risk_owner || "",
    assessmentDate: risk.assessment_date || "",
    evidenceStatusCode: risk.evidence_status_code || "",
    evidenceBasis: risk.evidence_basis || "",
    observations: risk.observations || "",
    isDraft: risk.is_draft,
  };
}

export default async function EditRiskPage({ params }: PageProps<"/riesgos/[id]/editar">) {
  const { id } = await params;
  const ctx = await getAuthContext();
  if (!canEdit(ctx.role)) notFound();

  const [risk, criteria, catalogs, assets] = await Promise.all([
    getRiskDetail(ctx, id),
    getActiveCriteria(ctx),
    getRiskCatalogs(ctx),
    getAssetsForRisk(ctx),
  ]);

  if (!risk || risk.archived_at) notFound();

  return (
    <>
      <Link href={`/riesgos/${id}`} className="btn btn-ghost btn-sm mb-2 -ml-2">
        <ArrowLeft className="size-4" aria-hidden /> Volver al detalle
      </Link>
      <PageHeader
        title={`Editar ${risk.code}`}
        description="Modifica los datos del riesgo. Los cambios se guardan al confirmar."
      />
      <RiskForm
        riskId={id}
        initialValues={toFormValues(risk)}
        assets={assets}
        catalogs={catalogs}
        thresholds={criteria.risk}
        canEdit
      />
    </>
  );
}
