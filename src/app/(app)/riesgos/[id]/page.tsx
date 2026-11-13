import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Archive, Pencil, BadgeCheck } from "lucide-react";
import { getAuthContext, canEdit, isAdmin } from "@/lib/auth/context";
import { PageHeader } from "@/components/ui/page-header";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { getRiskDetail, getRiskCatalogs } from "@/features/risks/data";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatDateTime } from "@/lib/format";
import { archiveRiskAction } from "@/features/risks/actions";

export const metadata: Metadata = { title: "Detalle de riesgo" };

export default async function RiskDetailPage({ params }: PageProps<"/riesgos/[id]">) {
  const { id } = await params;
  const ctx = await getAuthContext();
  const risk = await getRiskDetail(ctx, id);
  if (!risk) notFound();

  const [catalogs] = await Promise.all([getRiskCatalogs(ctx)]);
  
  const writable = canEdit(ctx.role) && !risk.archived_at;
  const treatmentLabel = catalogs.tratamiento.find(t => t.code === risk.treatment_code)?.label || risk.treatment_code || "—";
  const evidenceLabel = catalogs.estado_evidencia.find(e => e.code === risk.evidence_status_code)?.label || risk.evidence_status_code || "—";

  return (
    <>
      <Link href="/riesgos" className="btn btn-ghost btn-sm mb-2 -ml-2">
        <ArrowLeft className="size-4" aria-hidden /> Volver a riesgos
      </Link>

      <PageHeader
        title={`${risk.code}`}
        description={`Riesgo asociado a ${risk.asset_name || risk.asset_code}`}
        actions={
          <>
            {writable && (
              <Link href={`/riesgos/${id}/editar`} className="btn btn-primary">
                <Pencil className="size-4" aria-hidden /> Editar
              </Link>
            )}
            {writable && (
              <ConfirmAction
                action={() => archiveRiskAction(id)}
                buttonLabel="Archivar"
                variant="danger"
                icon={<Archive className="size-4" aria-hidden />}
                title="Archivar riesgo"
                description="El riesgo dejará de aparecer en la lista activa, pero su historial se conserva."
                confirmLabel="Archivar riesgo"
                redirectTo="/riesgos"
              />
            )}
          </>
        }
      />

      {risk.archived_at && (
        <div role="status" className="alert alert-warning mb-4 text-sm">
          Riesgo archivado el {formatDate(risk.archived_at)}. Se conserva para trazabilidad.
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Identificación */}
        <Panel title="Identificación">
          <Field label="Código" value={risk.code} mono />
          <Field label="Activo asociado" value={risk.asset_name || risk.asset_code} />
          <Field label="Proceso afectado" value={risk.affected_process} />
        </Panel>

        {/* Escenario */}
        <Panel title="Escenario de Riesgo">
          <Field label="Amenaza o fuente" value={risk.threat_source} wide />
          <Field label="Vulnerabilidad" value={risk.vulnerability} wide />
          <Field label="Escenario y consecuencia" value={risk.scenario_consequence} wide />
        </Panel>

        {/* Evaluación Inherente */}
        <Panel title="Evaluación de Riesgo Inherente" className="xl:row-span-2">
          <div className="sm:col-span-2 grid gap-3">
            <div className="rounded-lg bg-base-200 p-3">
              <p className="text-sm font-semibold text-primary">Probabilidad: {risk.probability_inherent}</p>
            </div>
            <div className="rounded-lg bg-base-200 p-3">
              <p className="text-sm font-semibold text-primary">Impacto: {risk.impact_inherent}</p>
            </div>
          </div>
          <div className="sm:col-span-2 rounded-box bg-base-200 p-4">
            <p className="text-sm font-semibold text-primary">Riesgo Inherente</p>
            {risk.riskInherentScore !== null ? (
              <>
                <p className="text-3xl font-extrabold text-primary">{risk.riskInherentScore}</p>
                <p className="mt-1">
                  <Badge tone={risk.riskInherentLevel === "Alto" ? "accent" : risk.riskInherentLevel === "Medio" ? "primary" : "neutral"}>
                    Nivel {risk.riskInherentLevel}
                  </Badge>
                </p>
              </>
            ) : (
              <p className="text-sm">Sin calcular</p>
            )}
          </div>
          <Field label="Controles existentes" value={risk.existing_controls} wide />
        </Panel>

        {/* Evaluación Residual */}
        <Panel title="Evaluación de Riesgo Residual">
          <div className="sm:col-span-2 grid gap-3">
            <div className="rounded-lg bg-base-200 p-3">
              <p className="text-sm font-semibold text-primary">
                Probabilidad Residual: {risk.probability_residual || "No evaluado"}
              </p>
            </div>
            <div className="rounded-lg bg-base-200 p-3">
              <p className="text-sm font-semibold text-primary">
                Impacto Residual: {risk.impact_residual || "No evaluado"}
              </p>
            </div>
          </div>
          <div className="sm:col-span-2 rounded-box bg-base-200 p-4">
            <p className="text-sm font-semibold text-primary">Riesgo Residual</p>
            {risk.hasResidualEvaluation ? (
              <>
                <p className="text-3xl font-extrabold text-primary">{risk.riskResidualScore}</p>
                <p className="mt-1">
                  <Badge tone={risk.riskResidualLevel === "Alto" ? "accent" : risk.riskResidualLevel === "Medio" ? "primary" : "neutral"}>
                    Nivel {risk.riskResidualLevel}
                  </Badge>
                </p>
              </>
            ) : (
              <p className="text-sm">No evaluado</p>
            )}
          </div>
        </Panel>

        {/* Tratamiento */}
        <Panel title="Tratamiento">
          <Field label="Tratamiento" value={treatmentLabel} />
          <Field label="Dueño del riesgo" value={risk.risk_owner} />
          <Field label="Fecha de evaluación" value={formatDate(risk.assessment_date)} />
        </Panel>

        {/* Evidencia */}
        <Panel title="Evidencia y Documentación">
          <Field label="Estado de evidencia" value={evidenceLabel} />
          <Field label="Evidencia o fundamento" value={risk.evidence_basis} wide />
          <Field label="Observaciones" value={risk.observations} wide />
        </Panel>

        {/* Trazabilidad */}
        <Panel title="Trazabilidad">
          <Field label="Creado" value={formatDateTime(risk.created_at, ctx.timeZone)} />
          <Field label="Última modificación" value={formatDateTime(risk.updated_at, ctx.timeZone)} />
          {risk.residual_assessed_at && (
            <Field label="Residual evaluado" value={formatDateTime(risk.residual_assessed_at, ctx.timeZone)} />
          )}
        </Panel>
      </div>
    </>
  );
}

function Panel({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`card bg-base-100 shadow-sm ${className}`} aria-labelledby={`p-${title}`}>
      <div className="card-body gap-4 p-5">
        <h2 id={`p-${title}`} className="card-title text-base text-primary">
          {title}
        </h2>
        <dl className="grid gap-3 sm:grid-cols-2">{children}</dl>
      </div>
    </section>
  );
}

function Field({
  label,
  value,
  wide,
  mono,
}: {
  label: string;
  value: string | null | undefined;
  wide?: boolean;
  mono?: boolean;
}) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <dt className="text-xs font-semibold uppercase tracking-wide text-primary/70">{label}</dt>
      <dd className={`whitespace-pre-line text-sm ${mono ? "font-mono" : ""}`}>
        {value ? value : <span className="opacity-60">—</span>}
      </dd>
    </div>
  );
}
