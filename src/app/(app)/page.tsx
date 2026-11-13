import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Boxes, CircleCheck, FileWarning, Flame, UserX, ShieldAlert, CalendarClock, ShieldCheck, ArrowRight, Info } from "lucide-react";
import { getAuthContext } from "@/lib/auth/context";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { BarChartPanel, CHART_COLORS } from "@/components/charts/bar-chart";
import { loadDashboard } from "@/features/dashboard/data";
import { CONTROL_GROUP_LABEL, type ControlGroup } from "@/features/dashboard/metrics";
import { getCatalogs } from "@/features/assets/data";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Panel" };

export default async function DashboardPage({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  const ctx = await getAuthContext();
  const filters = {
    area: typeof params.area === "string" ? params.area : "",
    category: typeof params.categoria === "string" ? params.categoria : "",
  };

  const [data, catalogs] = await Promise.all([loadDashboard(ctx, filters), getCatalogs(ctx, ["categoria"])]);
  const m = data.metrics;
  const hasFilters = Boolean(filters.area || filters.category);

  if (m.assets.registered === 0 && !hasFilters) {
    return (
      <>
        <PageHeader title="Panel ejecutivo" description={`Organización: ${ctx.organizationName}`} />
        <EmptyState
          title="El panel se llenará con tu inventario"
          action={
            <Link href="/activos/nuevo" className="btn btn-accent">
              Registrar el primer activo
            </Link>
          }
        >
          Todos los indicadores se calculan a partir de los activos y riesgos registrados. Aún no hay datos para mostrar.
        </EmptyState>
      </>
    );
  }

  const categoryLabel = (code: string) => catalogs.categoria.find((c) => c.code === code)?.label ?? code;

  return (
    <>
      <PageHeader
        title="Panel ejecutivo"
        description={`${ctx.organizationName} · Datos al ${formatDate(data.today)} (zona horaria de la organización)`}
        actions={
          <form className="flex flex-wrap items-end gap-2" role="search" aria-label="Filtros del panel">
            <label className="form-control">
              <span className="mb-1 text-xs font-semibold text-primary">Área</span>
              <select name="area" defaultValue={filters.area} className="select select-sm w-48">
                <option value="">Todas</option>
                {data.areas.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-control">
              <span className="mb-1 text-xs font-semibold text-primary">Categoría</span>
              <select name="categoria" defaultValue={filters.category} className="select select-sm w-52">
                <option value="">Todas</option>
                {catalogs.categoria.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className="btn btn-primary btn-sm">Aplicar</button>
            {hasFilters && (
              <Link href="/" className="btn btn-ghost btn-sm">Quitar filtros</Link>
            )}
          </form>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-2 text-sm">
        <Badge tone={data.criteriaApproved ? "accent" : "outline"}>
          {data.criteriaApproved ? "Criterios aprobados" : "Criterios no aprobados"}
        </Badge>
        <span className="text-primary/80">Versión vigente: {data.criteriaLabel}</span>
        {hasFilters && <Badge tone="primary">Filtrado</Badge>}
      </div>

      {/* KPIs principales */}
      <section aria-labelledby="kpi-principales" className="mb-8">
        <h2 id="kpi-principales" className="sr-only">Indicadores principales</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi title="Activos registrados" value={m.assets.registered} icon={<Boxes />} context="Activos activos en el alcance seleccionado." href="/activos" />
          <Kpi title="Listos para revisión" value={m.assets.ready} icon={<CircleCheck />} context="Cumplen la lista de verificación y esperan validación." href="/activos?estado=Listo%20para%20revisi%C3%B3n" />
          <Kpi title="Incompletos" value={m.assets.incomplete} icon={<FileWarning />} context="Tienen requisitos pendientes." href="/activos?estado=Incompleto" />
          <Kpi title="Criticidad alta" value={m.assets.highCriticality} icon={<Flame />} context={pctText(m.assets.highPct, "del inventario")} href="/activos?criticidad=Alta" />
          <Kpi title="Sin propietario" value={m.assets.withoutOwner} icon={<UserX />} context="Sin propietario válido (no provisional)." href="/activos?propietario=sin_propietario" />
          <Kpi title="Riesgos registrados" value={m.risks.registered} icon={<ShieldAlert />} context={`${m.risks.inherentHigh} con nivel inherente alto.`} />
          <Kpi title="Revisiones vencidas" value={m.assets.reviewsOverdue} icon={<CalendarClock />} context="Próxima revisión anterior a hoy." href="/activos?orden=review" />
          <Kpi title="Controles verificados" value={m.controls.verified} icon={<ShieldCheck />} context={`De ${m.controls.registered} controles registrados.`} />
        </div>
      </section>

      {/* KPIs complementarios */}
      <section aria-labelledby="kpi-complementarios" className="mb-8">
        <h2 id="kpi-complementarios" className="mb-3 text-lg font-bold text-primary">Indicadores complementarios</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Mini label="Inventario completo" value={m.assets.completePct === null ? "—" : `${m.assets.completePct}%`} help="Listos + validados sobre el total." />
          <Mini label="Activos sin evaluación CIA" value={String(m.assets.withoutCia)} help="Falta alguna de las tres dimensiones." />
          <Mini label="Riesgos inherentes altos" value={String(m.risks.inherentHigh)} help="Probabilidad × impacto dentro del nivel Alto." />
          <Mini label="Residual alto evaluado" value={`${m.risks.residualHigh} de ${m.risks.residualEvaluated}`} help={`${m.risks.residualNotEvaluated} riesgos sin evaluación residual.`} />
          <Mini label="Controles pendientes de verificación" value={String(m.controls.groups.pendiente_verificacion)} help="Implementados sin prueba de eficacia." />
          <Mini label="Actividades próximas a vencer" value={String(m.followUps.counts["Próxima"])} help="Dentro de los próximos siete días." />
          <Mini label="Actividades vencidas" value={String(m.followUps.counts.Vencida)} help="Fecha programada anterior a hoy, sin completar." />
          <Mini label="Activos sin propietario" value={String(m.assets.withoutOwner)} help="Ver también la lista de prioridades." />
        </div>
      </section>

      {/* Prioridades */}
      <section aria-labelledby="prioridades" className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="prioridades" className="text-lg font-bold text-primary">Prioridades de atención</h2>
          <span className="text-xs text-primary/70">Reglas explícitas sobre datos verificables</span>
        </div>
        {data.priorities.length === 0 ? (
          <div role="status" className="alert">
            <CircleCheck className="size-5" aria-hidden />
            <span>No hay situaciones de prioridad con las reglas actuales.</span>
          </div>
        ) : (
          <ul className="grid gap-3 lg:grid-cols-2">
            {data.priorities.map((p) => (
              <li key={p.id} className="card bg-base-100 shadow-sm">
                <div className="card-body gap-2 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold text-primary">{p.problem}</p>
                    <Badge tone={p.severity === "alta" ? "accent" : "outline"}>
                      {p.severity === "alta" ? "Prioridad alta" : p.severity === "media" ? "Prioridad media" : "Prioridad baja"}
                    </Badge>
                  </div>
                  <p className="text-sm text-primary/80">{p.explanation}</p>
                  <div className="card-actions mt-1 justify-end">
                    {p.href ? (
                      <Link href={p.href} className="btn btn-sm btn-outline">
                        {p.action} <ArrowRight className="size-4" aria-hidden />
                      </Link>
                    ) : (
                      <span className="text-xs text-primary/70">Disponible cuando el módulo esté activo.</span>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Gráficos */}
      <section aria-labelledby="graficos" className="grid gap-6 xl:grid-cols-2">
        <h2 id="graficos" className="sr-only">Gráficos</h2>
        <ChartCard title="Distribución de activos por categoría" subtitle="Cantidad y porcentaje sobre el total.">
          {m.assets.byCategory.length === 0 ? (
            <p className="text-sm">Sin activos en el alcance seleccionado.</p>
          ) : (
            <BarChartPanel
              ariaLabel="Activos por categoría"
              data={m.assets.byCategory.map((c) => ({ label: categoryLabel(c.code), value: c.count, pct: c.pct, color: CHART_COLORS.navy }))}
            />
          )}
        </ChartCard>

        <ChartCard title="Criticidad de activos" subtitle="Según el máximo de C, I y D y los umbrales vigentes.">
          <BarChartPanel
            ariaLabel="Criticidad de activos"
            data={[
              { label: "Alta", value: m.assets.highCriticality, color: CHART_COLORS.coral },
              { label: "Media", value: m.assets.mediumCriticality, color: CHART_COLORS.navyMid },
              { label: "Baja", value: m.assets.lowCriticality, color: CHART_COLORS.navyLight },
              { label: "Sin calcular", value: m.assets.withoutCia, color: "rgba(0,41,65,0.15)" },
            ]}
          />
        </ChartCard>

        <ChartCard title="Calidad del inventario" subtitle="Estado del registro de cada activo.">
          <BarChartPanel
            ariaLabel="Estado del registro de activos"
            data={[
              { label: "Borrador", value: m.assets.drafts, color: CHART_COLORS.navyLight },
              { label: "Incompleto", value: m.assets.incomplete, color: CHART_COLORS.navyMid },
              { label: "Listo para revisión", value: m.assets.ready, color: CHART_COLORS.navy },
              { label: "Validado", value: m.assets.validated, color: CHART_COLORS.coral },
            ]}
          />
        </ChartCard>

        <ChartCard title="Activos por área" subtitle="Total y activos de criticidad alta por unidad responsable.">
          {m.assets.byArea.length === 0 ? (
            <p className="text-sm">Sin datos de área.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th scope="col">Área</th>
                    <th scope="col" className="text-right">Activos</th>
                    <th scope="col" className="text-right">Criticidad alta</th>
                  </tr>
                </thead>
                <tbody>
                  {m.assets.byArea.map((a) => (
                    <tr key={a.area}>
                      <td className="max-w-xs whitespace-normal">{a.area}</td>
                      <td className="text-right font-semibold">
                        <Link className="link link-hover" href={`/activos?area=${encodeURIComponent(a.area === "Sin área" ? "" : a.area)}`}>
                          {a.total}
                        </Link>
                      </td>
                      <td className="text-right">{a.high}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ChartCard>

        <ChartCard title="Riesgos: inherente frente a residual" subtitle="El residual solo cuenta cuando existe una evaluación.">
          {m.risks.registered === 0 ? (
            <p className="text-sm">No hay riesgos registrados en el alcance seleccionado.</p>
          ) : (
            <BarChartPanel
              ariaLabel="Riesgos inherentes y residuales"
              valueLabel="Riesgos"
              data={[
                { label: "Inherente alto", value: m.risks.inherentHigh, color: CHART_COLORS.coral },
                { label: "Inherente medio", value: m.risks.inherentMedium, color: CHART_COLORS.navyMid },
                { label: "Inherente bajo", value: m.risks.inherentLow, color: CHART_COLORS.navyLight },
                { label: "Residual evaluado", value: m.risks.residualEvaluated, color: CHART_COLORS.navy },
                { label: "Residual no evaluado", value: m.risks.residualNotEvaluated, color: "rgba(0,41,65,0.15)" },
              ]}
            />
          )}
        </ChartCard>

        <ChartCard title="Estado de controles" subtitle="Cada control aparece en un solo grupo.">
          {m.controls.registered === 0 ? (
            <p className="text-sm">No hay controles registrados.</p>
          ) : (
            <BarChartPanel
              ariaLabel="Estado de controles"
              valueLabel="Controles"
              data={(Object.keys(CONTROL_GROUP_LABEL) as ControlGroup[]).map((g) => ({
                label: CONTROL_GROUP_LABEL[g],
                value: m.controls.groups[g],
                color: g === "verificado" ? CHART_COLORS.coral : CHART_COLORS.navy,
              }))}
            />
          )}
        </ChartCard>

        <ChartCard title="Seguimiento" subtitle="Actividades según su alerta calculada.">
          {m.followUps.registered === 0 ? (
            <p className="text-sm">No hay actividades de seguimiento registradas.</p>
          ) : (
            <BarChartPanel
              ariaLabel="Alertas de seguimiento"
              valueLabel="Actividades"
              data={[
                { label: "Vencidas", value: m.followUps.counts.Vencida, color: CHART_COLORS.coral },
                { label: "Próximas (7 días)", value: m.followUps.counts["Próxima"], color: CHART_COLORS.navyMid },
                { label: "En plazo", value: m.followUps.counts["En plazo"], color: CHART_COLORS.navy },
                { label: "Cerradas", value: m.followUps.counts.Cerrada, color: CHART_COLORS.navyLight },
                { label: "Sin fecha", value: m.followUps.counts["Sin fecha"], color: "rgba(0,41,65,0.15)" },
              ]}
            />
          )}
        </ChartCard>
      </section>

      <p className="mt-8 flex items-start gap-2 text-xs text-primary/80">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
        Las cifras reflejan los datos registrados y las reglas aprobadas. La criticidad CIA no equivale a un riesgo evaluado.
      </p>
    </>
  );
}

function Kpi({
  title,
  value,
  icon,
  context,
  href,
}: {
  title: string;
  value: number;
  icon: ReactNode;
  context: string;
  href?: string;
}) {
  return (
    <article className="card bg-base-100 shadow-sm transition-shadow duration-200 hover:shadow-md">
      <div className="card-body gap-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-sm font-semibold text-primary">{title}</h3>
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-base-200 text-primary [&_svg]:size-5" aria-hidden>
            {icon}
          </span>
        </div>
        <p className="text-3xl font-extrabold text-primary">{value}</p>
        <p className="text-xs text-primary/80">{context}</p>
        {href && (
          <Link href={href} className="link link-hover mt-auto inline-flex items-center gap-1 text-xs font-semibold text-primary">
            Ver registros <ArrowRight className="size-3" aria-hidden />
          </Link>
        )}
      </div>
    </article>
  );
}

function Mini({ label, value, help }: { label: string; value: string; help: string }) {
  return (
    <div className="rounded-box border border-primary/15 bg-base-100 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-primary/70">{label}</p>
      <p className="mt-1 text-xl font-bold text-primary">{value}</p>
      <p className="mt-1 text-xs text-primary/80">{help}</p>
    </div>
  );
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <section className="card bg-base-100 shadow-sm" aria-labelledby={`c-${title}`}>
      <div className="card-body gap-3 p-5">
        <div>
          <h3 id={`c-${title}`} className="font-bold text-primary">{title}</h3>
          <p className="text-xs text-primary/80">{subtitle}</p>
        </div>
        {children}
      </div>
    </section>
  );
}

function pctText(pct: number | null, suffix: string): string {
  return pct === null ? `Sin datos ${suffix}` : `${pct}% ${suffix}`;
}
