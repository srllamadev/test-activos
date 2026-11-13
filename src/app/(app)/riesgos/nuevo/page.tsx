import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAuthContext, canEdit } from "@/lib/auth/context";
import { PageHeader } from "@/components/ui/page-header";
import { RiskForm } from "@/features/risks/risk-form";
import { getActiveCriteria } from "@/features/assets/data";
import { RISK_FORM_DEFAULTS } from "@/lib/validations/risk";
import { getRiskCatalogs, getAssetsForRisk } from "@/features/risks/data";

export const metadata: Metadata = { title: "Nuevo riesgo" };

export default async function NewRiskPage() {
  const ctx = await getAuthContext();
  if (!canEdit(ctx.role)) notFound();

  const [criteria, catalogs, assets] = await Promise.all([
    getActiveCriteria(ctx),
    getRiskCatalogs(ctx),
    getAssetsForRisk(ctx),
  ]);

  return (
    <>
      <PageHeader
        title="Registrar nuevo riesgo"
        description="Completa el formulario por pasos. Puedes guardar un borrador en cualquier momento y terminar después."
      />
      <RiskForm
        initialValues={RISK_FORM_DEFAULTS}
        assets={assets}
        catalogs={catalogs}
        thresholds={criteria.risk}
        canEdit
      />
    </>
  );
}
