import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAuthContext, canEdit } from "@/lib/auth/context";
import { PageHeader } from "@/components/ui/page-header";
import { AssetForm } from "@/features/assets/asset-form";
import { FORM_CATALOG_TYPES, getActiveCriteria, getCatalogs } from "@/features/assets/data";
import { ASSET_FORM_DEFAULTS } from "@/lib/validations/asset";

export const metadata: Metadata = { title: "Nuevo activo" };

export default async function NewAssetPage() {
  const ctx = await getAuthContext();
  if (!canEdit(ctx.role)) notFound();

  const [criteria, catalogs] = await Promise.all([
    getActiveCriteria(ctx),
    getCatalogs(ctx, FORM_CATALOG_TYPES),
  ]);

  return (
    <>
      <PageHeader
        title="Registrar activo de información"
        description="Completa el formulario por pasos. Puedes guardar un borrador en cualquier momento y terminar después."
      />
      <AssetForm
        isDraftRecord
        initialValues={ASSET_FORM_DEFAULTS}
        catalogs={catalogs}
        criteria={{
          cia: criteria.cia,
          reviewMonths: criteria.reviewMonths,
          version: criteria.version,
          label: criteria.label,
        }}
        canEdit
      />
    </>
  );
}
