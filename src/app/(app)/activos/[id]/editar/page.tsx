import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getAuthContext, canEdit } from "@/lib/auth/context";
import { PageHeader } from "@/components/ui/page-header";
import { AssetForm } from "@/features/assets/asset-form";
import { FORM_CATALOG_TYPES, getActiveCriteria, getAssetDetail, getCatalogs } from "@/features/assets/data";
import { assetToFormValues } from "@/features/assets/to-form";

export const metadata: Metadata = { title: "Editar activo" };

export default async function EditAssetPage({ params }: PageProps<"/activos/[id]/editar">) {
  const { id } = await params;
  const ctx = await getAuthContext();
  if (!canEdit(ctx.role)) notFound();

  const [detail, criteria, catalogs] = await Promise.all([
    getAssetDetail(ctx, id),
    getActiveCriteria(ctx),
    getCatalogs(ctx, FORM_CATALOG_TYPES),
  ]);
  if (!detail || detail.view.archived_at) notFound();

  const { view } = detail;
  return (
    <>
      <Link href={`/activos/${id}`} className="btn btn-ghost btn-sm mb-2 -ml-2">
        <ArrowLeft className="size-4" aria-hidden /> Volver a la ficha
      </Link>
      <PageHeader
        title={`Editar ${view.code}`}
        description={
          view.validated_at
            ? "Este activo estaba validado. Al guardar cambios, la validación se retira y debe repetirse."
            : "Los cambios se guardan al confirmar. Los borradores se guardan automáticamente."
        }
      />
      <AssetForm
        assetId={id}
        isDraftRecord={view.is_draft}
        initialValues={assetToFormValues(view, detail.dependencies.map((d) => d.code))}
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
