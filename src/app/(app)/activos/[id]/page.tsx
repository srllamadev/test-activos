import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Archive, BadgeCheck, Pencil, CircleCheck, TriangleAlert } from "lucide-react";
import { getAuthContext, canEdit, isAdmin } from "@/lib/auth/context";
import { PageHeader } from "@/components/ui/page-header";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { getActiveCriteria, getAssetDetail, getCatalogs } from "@/features/assets/data";
import { CriticalityBadge, RegistryStatusBadge } from "@/features/assets/status-badges";
import { archiveAssetAction, validateAssetAction } from "@/features/assets/actions";
import { assetChecklist, isValidOwner } from "@/lib/calculations/asset-registry";
import { evaluateCia, CIA_DIMENSION_LABEL } from "@/lib/calculations/cia";
import { CIA_HELP } from "@/lib/calculations/cia-help";
import { formatDate, formatDateTime } from "@/lib/format";
import { registryInputFromRow } from "@/features/assets/data";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Ficha de activo" };

export default async function AssetDetailPage({ params, searchParams }: PageProps<"/activos/[id]">) {
  const { id } = await params;
  const query = await searchParams;
  const ctx = await getAuthContext();
  const detail = await getAssetDetail(ctx, id);
  if (!detail) notFound();

  const [catalogs, criteria] = await Promise.all([
    getCatalogs(ctx, ["categoria", "tipo_activo", "clasificacion", "estado_evidencia", "ciclo_vida"]),
    getActiveCriteria(ctx),
  ]);

  const { view } = detail;
  const writable = canEdit(ctx.role) && !view.archived_at;
  const checklist = assetChecklist(registryInputFromRow(view));
  const missing = checklist.filter((i) => !i.ok);
  const cia = evaluateCia(
    { confidencialidad: view.confidentiality, integridad: view.integrity, disponibilidad: view.availability },
    criteria.cia,
  );
  const label = (list: { code: string; label: string }[], code: string | null) =>
    list.find((o) => o.code === code)?.label ?? code ?? "—";
  const canValidate = isAdmin(ctx.role) && !view.archived_at && view.registryStatus === "Listo para revisión";

  return (
    <>
      <Link href="/activos" className="btn btn-ghost btn-sm mb-2 -ml-2">
        <ArrowLeft className="size-4" aria-hidden /> Inventario
      </Link>

      <PageHeader
        title={`${view.code} · ${view.name ?? "Sin nombre"}`}
        description={label(catalogs.categoria, view.category_code) + (view.asset_type_code ? ` · ${label(catalogs.tipo_activo, view.asset_type_code)}` : "")}
        actions={
          <>
            {writable && (
              <Link href={`/activos/${id}/editar`} className="btn btn-primary">
                <Pencil className="size-4" aria-hidden /> Editar
              </Link>
            )}
            {canValidate && (
              <ConfirmAction
                action={() => validateAssetAction(id)}
                buttonLabel="Validar"
                icon={<BadgeCheck className="size-4" aria-hidden />}
                title="Validar activo"
                description="La validación confirma que la información fue revisada. Quedará registrado tu usuario y la fecha. Cualquier cambio posterior retirará la validación."
                confirmLabel="Confirmar validación"
              />
            )}
            {writable && (
              <ConfirmAction
                action={() => archiveAssetAction(id)}
                buttonLabel="Archivar"
                variant="danger"
                icon={<Archive className="size-4" aria-hidden />}
                title="Archivar activo"
                description="El activo dejará de aparecer en el inventario activo, pero su historial y sus vínculos se conservan."
                confirmLabel="Archivar activo"
                redirectTo="/activos"
                openOnMount={query.accion === "archivar"}
              />
            )}
          </>
        }
      />

      {query.guardado === "1" && (
        <div role="status" className="alert mb-4 text-sm">
          <CircleCheck className="size-4" aria-hidden /> Registro guardado.
        </div>
      )}
      {view.archived_at && (
        <div role="status" className="alert alert-warning mb-4 text-sm">
          Activo archivado el {formatDate(view.archived_at)}. Se conserva para trazabilidad y no puede modificarse.
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <RegistryStatusBadge status={view.registryStatus} />
        <CriticalityBadge level={view.criticality} />
        {view.validated_at && <Badge tone="accent">Validado el {formatDateTime(view.validated_at, ctx.timeZone)}</Badge>}
        {view.reviewOverdue && <Badge tone="accent">Revisión vencida</Badge>}
      </div>

      {view.registryStatus !== "Validado" && !view.archived_at && (
        <section aria-labelledby="pendientes" className="card mb-6 border border-primary/20 bg-base-100 shadow-sm">
          <div className="card-body gap-2 p-5">
            <h2 id="pendientes" className="card-title text-base text-primary">
              {missing.length === 0 ? "Lista de verificación completa" : `Requisitos pendientes (${missing.length})`}
            </h2>
            {missing.length === 0 ? (
              <p className="text-sm">El registro cumple todos los requisitos automáticos. {canValidate ? "Un administrador puede validarlo." : ""}</p>
            ) : (
              <ul className="grid gap-1 text-sm md:grid-cols-2">
                {missing.map((m) => (
                  <li key={m.key} className="flex items-start gap-2">
                    <TriangleAlert className="mt-0.5 size-4 shrink-0 text-accent-content" aria-hidden />
                    <span>{m.label}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Identificación">
          <Field label="Código" value={view.code} mono />
          <Field label="Nombre" value={view.name} />
          <Field label="Categoría" value={label(catalogs.categoria, view.category_code)} />
          <Field label="Tipo de activo" value={label(catalogs.tipo_activo, view.asset_type_code)} />
          <Field label="Descripción y finalidad" value={view.description} wide />
        </Panel>

        <Panel title="Contexto organizacional">
          <Field label="Macroproceso" value={view.macroprocess} />
          <Field label="Proceso" value={view.process} />
          <Field label="Subproceso o actividad" value={view.subprocess} />
          <Field label="Área o unidad responsable" value={view.responsible_area} />
          <Field label="Ubicación" value={view.location} />
          <Field label="Proveedor o tercero" value={view.supplier} />
        </Panel>

        <Panel title="Responsabilidades">
          <Field label="Propietario" value={isValidOwner(view.owner_name) ? view.owner_name : null} hint={!isValidOwner(view.owner_name) ? "Sin propietario válido" : undefined} />
          <Field label="Custodio" value={view.custodian_name} />
          <Field label="Administrador" value={view.administrator_name} />
          <Field label="Usuarios autorizados" value={view.authorized_users} />
          <div className="sm:col-span-2">
            <dt className="text-xs font-semibold uppercase tracking-wide text-primary/70">Depende de</dt>
            <dd className="text-sm">
              {detail.dependencies.length === 0 ? "—" : detail.dependencies.map((d) => d.code).join(", ")}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs font-semibold uppercase tracking-wide text-primary/70">Activos que dependen de este</dt>
            <dd className="text-sm">
              {detail.dependents.length === 0 ? "—" : detail.dependents.map((d) => d.code).join(", ")}
            </dd>
          </div>
        </Panel>

        <Panel title="Valoración CIA y criticidad" className="xl:row-span-2">
          <div className="sm:col-span-2 grid gap-3">
            {(
              [
                ["confidencialidad", view.confidentiality],
                ["integridad", view.integrity],
                ["disponibilidad", view.availability],
              ] as const
            ).map(([dim, value]) => (
              <div key={dim} className="rounded-lg bg-base-200 p-3">
                <p className="text-sm font-semibold text-primary">
                  {CIA_DIMENSION_LABEL[dim]}: {value ?? "sin valorar"}
                </p>
                {value && <p className="text-xs text-primary/80">{CIA_HELP[dim][value as 1 | 2 | 3 | 4 | 5]}</p>}
              </div>
            ))}
          </div>
          <div className="sm:col-span-2 rounded-box bg-base-200 p-4">
            <p className="text-sm font-semibold text-primary">
              Criticidad: {cia.complete ? cia.level : "sin calcular"}
            </p>
            {cia.complete && (
              <p className="mt-1 text-sm">
                Máximo CIA = {cia.max}, determinado por {cia.dimensionsAtMax.map((d) => CIA_DIMENSION_LABEL[d]).join(" y ")}.
                La criticidad no es un riesgo evaluado.
              </p>
            )}
          </div>
          <Field label="Justificación de la criticidad" value={view.criticality_justification} wide />
        </Panel>

        <Panel title="Evidencias y fuentes">
          <Field label="Evidencia o referencia documental" value={view.evidence_reference} wide />
          <Field label="Estado de evidencia" value={label(catalogs.estado_evidencia, view.evidence_status_code)} />
          <Field label="Clasificación de la información" value={label(catalogs.clasificacion, view.classification_code)} />
          <Field label="Fuente o sección" value={view.source_reference} wide />
          <Field label="Referencia normativa" value={view.regulatory_reference} wide />
        </Panel>

        <Panel title="Revisión y ciclo de vida">
          <Field label="Ciclo de vida" value={label(catalogs.ciclo_vida, view.lifecycle_code)} />
          <Field label="Fecha de revisión" value={formatDate(view.review_date)} />
          <Field
            label="Próxima revisión (calculada)"
            value={view.nextReview ? `${formatDate(view.nextReview)}${view.reviewOverdue ? " · vencida" : ""}` : null}
          />
          <Field label="Observaciones y pendientes" value={view.observations} wide />
        </Panel>

        <Panel title="Trazabilidad">
          <Field label="Creado" value={formatDateTime(detail.createdAt, ctx.timeZone)} />
          <Field label="Última modificación" value={formatDateTime(view.updated_at, ctx.timeZone)} />
          <Field label="Validación" value={view.validated_at ? formatDateTime(view.validated_at, ctx.timeZone) : "Pendiente"} />
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
  hint,
}: {
  label: string;
  value: string | null | undefined;
  wide?: boolean;
  mono?: boolean;
  hint?: string;
}) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <dt className="text-xs font-semibold uppercase tracking-wide text-primary/70">{label}</dt>
      <dd className={`whitespace-pre-line text-sm ${mono ? "font-mono" : ""}`}>
        {value ? value : <span className="opacity-60">—</span>}
        {hint && (
          <span className="ml-2 inline-flex items-center gap-1 text-xs font-semibold text-accent-content">
            <TriangleAlert className="size-3" aria-hidden /> {hint}
          </span>
        )}
      </dd>
    </div>
  );
}
