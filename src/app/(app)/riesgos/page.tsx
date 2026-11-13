import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Eye, Pencil, Archive } from "lucide-react";
import { getAuthContext, canEdit } from "@/lib/auth/context";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { listRiskViews, getRiskCatalogs } from "@/features/risks/data";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Riesgos" };

export default async function RisksPage() {
  const ctx = await getAuthContext();
  const writable = canEdit(ctx.role);
  
  const [risks, catalogs] = await Promise.all([
    listRiskViews(ctx),
    getRiskCatalogs(ctx),
  ]);
  
  const activeRisks = risks.filter(r => !r.archived_at);
  const treatmentLabels = new Map(catalogs.tratamiento.map(t => [t.code, t.label]));

  return (
    <>
      <PageHeader
        title="Gestión de Riesgos"
        description={`${activeRisks.length} riesgos registrados. Evalúa, trata y monitorea los riesgos de tus activos.`}
        actions={
          writable ? (
            <Link href="/riesgos/nuevo" className="btn btn-accent font-bold">
              <Plus className="size-4" aria-hidden /> Nuevo riesgo
            </Link>
          ) : null
        }
      />

      {activeRisks.length === 0 ? (
        <EmptyState
          title="Aún no hay riesgos registrados"
          action={
            writable ? (
              <Link href="/riesgos/nuevo" className="btn btn-accent">
                <Plus className="size-4" aria-hidden /> Registrar el primer riesgo
              </Link>
            ) : undefined
          }
        >
          Registra los riesgos identificados en tus activos. Cada riesgo se evalúa con probabilidad e impacto para determinar su nivel.
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Resumen rápido */}
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard
              label="Riesgos Alto"
              value={activeRisks.filter(r => r.riskInherentLevel === "Alto").length}
              color="error"
            />
            <StatCard
              label="Riesgos Medio"
              value={activeRisks.filter(r => r.riskInherentLevel === "Medio").length}
              color="warning"
            />
            <StatCard
              label="Riesgos Bajo"
              value={activeRisks.filter(r => r.riskInherentLevel === "Bajo").length}
              color="success"
            />
          </div>

          {/* Tabla de riesgos */}
          <div className="card overflow-hidden bg-base-100 shadow-sm">
            <div className="overflow-x-auto">
              <table className="table table-zebra">
                <caption className="sr-only">Riesgos registrados</caption>
                <thead className="bg-primary text-primary-content">
                  <tr>
                    <th>Código</th>
                    <th>Activo</th>
                    <th>Amenaza</th>
                    <th>Nivel Inherente</th>
                    <th>Nivel Residual</th>
                    <th>Tratamiento</th>
                    <th>Fecha</th>
                    <th className="text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {activeRisks.map((risk) => (
                    <tr key={risk.id}>
                      <td className="font-mono text-sm font-semibold text-primary">{risk.code}</td>
                      <td>
                        <Link href={`/activos/${risk.asset_id}`} className="link link-hover text-sm">
                          {risk.asset_name || risk.asset_code}
                        </Link>
                      </td>
                      <td className="max-w-xs truncate text-sm">{risk.threat_source}</td>
                      <td>
                        {risk.riskInherentLevel && (
                          <Badge tone={risk.riskInherentLevel === "Alto" ? "accent" : risk.riskInherentLevel === "Medio" ? "primary" : "neutral"}>
                            {risk.riskInherentLevel}
                          </Badge>
                        )}
                      </td>
                      <td>
                        {risk.hasResidualEvaluation ? (
                          <Badge tone={risk.riskResidualLevel === "Alto" ? "accent" : risk.riskResidualLevel === "Medio" ? "primary" : "neutral"}>
                            {risk.riskResidualLevel}
                          </Badge>
                        ) : (
                          <span className="text-xs text-primary/60">No evaluado</span>
                        )}
                      </td>
                      <td className="text-sm">
                        {risk.treatment_code ? treatmentLabels.get(risk.treatment_code) || risk.treatment_code : "—"}
                      </td>
                      <td className="text-sm">{formatDate(risk.assessment_date)}</td>
                      <td className="text-right">
                        <div className="flex justify-end gap-1">
                          <Link
                            href={`/riesgos/${risk.id}`}
                            className="btn btn-ghost btn-sm btn-square"
                            aria-label={`Ver ${risk.code}`}
                          >
                            <Eye className="size-4" aria-hidden />
                          </Link>
                          {writable && !risk.archived_at && (
                            <>
                              <Link
                                href={`/riesgos/${risk.id}/editar`}
                                className="btn btn-ghost btn-sm btn-square"
                                aria-label={`Editar ${risk.code}`}
                              >
                                <Pencil className="size-4" aria-hidden />
                              </Link>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: "error" | "warning" | "success" }) {
  const bgClass = color === "error" ? "bg-error/10 border-error/30" : 
                  color === "warning" ? "bg-warning/10 border-warning/30" : 
                  "bg-success/10 border-success/30";
  
  return (
    <div className={`card border ${bgClass} shadow-sm`}>
      <div className="card-body gap-2 p-4">
        <p className="text-sm font-semibold text-primary">{label}</p>
        <p className="text-3xl font-extrabold text-primary">{value}</p>
      </div>
    </div>
  );
}
