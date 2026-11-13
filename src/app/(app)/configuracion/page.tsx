import type { Metadata } from "next";
import { getAuthContext, isAdmin, ROLE_LABEL } from "@/lib/auth/context";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { getActiveCriteria, getCatalogs, FORM_CATALOG_TYPES } from "@/features/assets/data";
import { OrganizationForm, CriteriaForm } from "@/features/settings/settings-forms";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Configuración" };

export default async function SettingsPage() {
  const ctx = await getAuthContext();
  const admin = isAdmin(ctx.role);
  const supabase = await createClient();

  const [{ data: org }, criteria, history, catalogs] = await Promise.all([
    supabase
      .from("organizations")
      .select("name, short_name, sector, description, inventory_scope, methodological_owner, start_date, regulatory_references, time_zone, criteria_approved")
      .eq("id", ctx.organizationId)
      .single(),
    getActiveCriteria(ctx),
    supabase
      .from("criteria_versions")
      .select("version_number, label, status, critical_from, medium_from, risk_high_from, risk_medium_from, review_months, approved_at, created_at")
      .eq("organization_id", ctx.organizationId)
      .order("version_number", { ascending: false }),
    getCatalogs(ctx, FORM_CATALOG_TYPES),
  ]);

  if (!org) throw new Error("No se pudo cargar la organización.");

  return (
    <>
      <PageHeader
        title="Configuración institucional"
        description={`Datos de la entidad, criterios de valoración y catálogos. Tu rol: ${ROLE_LABEL[ctx.role]}.`}
      />

      {!admin && (
        <div role="status" className="alert mb-6 text-sm">
          Solo los administradores pueden modificar esta configuración. Puedes consultarla en modo lectura.
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <section aria-labelledby="org" className="card bg-base-100 shadow-sm">
          <div className="card-body gap-4">
            <h2 id="org" className="card-title text-primary">Entidad</h2>
            <OrganizationForm
              readOnly={!admin}
              initial={{
                name: org.name,
                shortName: org.short_name ?? "",
                sector: org.sector,
                description: org.description ?? "",
                inventoryScope: org.inventory_scope ?? "",
                methodologicalOwner: org.methodological_owner ?? "",
                startDate: org.start_date ?? "",
                regulatoryReferences: org.regulatory_references ?? "",
                timeZone: org.time_zone,
              }}
            />
          </div>
        </section>

        <section aria-labelledby="crit" className="card bg-base-100 shadow-sm">
          <div className="card-body gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="crit" className="card-title text-primary">Criterios de valoración</h2>
              <Badge tone={criteria.approved ? "accent" : "outline"}>
                {criteria.approved ? "Aprobados" : "No aprobados"}
              </Badge>
            </div>
            <p className="text-sm text-primary/80">
              Los criterios vigentes se aplican a todos los cálculos. Cada publicación crea una versión nueva; las anteriores se conservan como histórico.
            </p>
            <CriteriaForm
              readOnly={!admin}
              initial={{
                label: criteria.version ? criteria.label : "",
                criticalFrom: criteria.cia.criticalFrom,
                mediumFrom: criteria.cia.mediumFrom,
                riskHighFrom: criteria.risk.highFrom,
                riskMediumFrom: criteria.risk.mediumFrom,
                reviewMonths: criteria.reviewMonths,
              }}
            />
          </div>
        </section>

        <section aria-labelledby="hist" className="card bg-base-100 shadow-sm xl:col-span-2">
          <div className="card-body gap-3">
            <h2 id="hist" className="card-title text-primary">Historial de versiones de criterios</h2>
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <caption className="sr-only">Versiones de criterios</caption>
                <thead>
                  <tr>
                    <th scope="col">Versión</th>
                    <th scope="col">Descripción</th>
                    <th scope="col">Estado</th>
                    <th scope="col">CIA alta / media</th>
                    <th scope="col">Riesgo alto / medio</th>
                    <th scope="col">Revisión (meses)</th>
                    <th scope="col">Creada</th>
                  </tr>
                </thead>
                <tbody>
                  {(history.data ?? []).map((v) => (
                    <tr key={v.version_number}>
                      <td>{v.version_number}</td>
                      <td className="whitespace-normal">{v.label}</td>
                      <td>
                        <Badge tone={v.status === "vigente" ? "accent" : "outline"}>{v.status}</Badge>
                      </td>
                      <td>{v.critical_from} / {v.medium_from}</td>
                      <td>{v.risk_high_from} / {v.risk_medium_from}</td>
                      <td>{v.review_months}</td>
                      <td>{formatDate(v.created_at.slice(0, 10))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section aria-labelledby="cat" className="card bg-base-100 shadow-sm xl:col-span-2">
          <div className="card-body gap-3">
            <h2 id="cat" className="card-title text-primary">Catálogos</h2>
            <p className="text-sm text-primary/80">
              Las listas desplegables usan códigos estables. Renombrar una etiqueta no altera los registros existentes.
              Los valores que ya se usan se desactivan en lugar de borrarse.
            </p>
            <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {FORM_CATALOG_TYPES.map((t) => (
                <div key={t} className="rounded-box bg-base-200 p-3">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-primary/70">{CATALOG_TITLES[t]}</dt>
                  <dd className="text-sm">
                    {catalogs[t].filter((o) => o.active).map((o) => o.label).join(" · ") || "—"}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      </div>
    </>
  );
}

const CATALOG_TITLES: Record<(typeof FORM_CATALOG_TYPES)[number], string> = {
  categoria: "Categoría",
  tipo_activo: "Tipo de activo",
  clasificacion: "Clasificación de información",
  estado_evidencia: "Estado de evidencia",
  ciclo_vida: "Ciclo de vida",
};
