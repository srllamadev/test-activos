import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Search, Eye, Pencil, Archive, TriangleAlert } from "lucide-react";
import { getAuthContext, canEdit } from "@/lib/auth/context";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { getCatalogs, listAssetViews } from "@/features/assets/data";
import {
  applyAssetFilters,
  filtersToSearchParams,
  paginate,
  parseFilters,
  SORT_OPTIONS,
  PAGE_SIZE,
} from "@/features/assets/filters";
import { CriticalityBadge, RegistryStatusBadge } from "@/features/assets/status-badges";
import { isValidOwner, type RegistryStatus } from "@/lib/calculations/asset-registry";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Inventario de activos" };

const STATUS_OPTIONS: RegistryStatus[] = ["Borrador", "Incompleto", "Listo para revisión", "Validado"];

export default async function AssetsPage({ searchParams }: PageProps<"/activos">) {
  const params = await searchParams;
  const ctx = await getAuthContext();
  const filters = parseFilters(params);

  const [all, catalogs] = await Promise.all([
    listAssetViews(ctx, { includeArchived: true }),
    getCatalogs(ctx, ["categoria", "clasificacion"]),
  ]);

  const areas = Array.from(new Set(all.map((a) => a.responsible_area).filter((v): v is string => !!v))).sort();
  const filtered = applyAssetFilters(all, filters);
  const pageData = paginate(filtered, filters.page, PAGE_SIZE);
  const writable = canEdit(ctx.role);

  const pageHref = (p: number) => {
    const s = filtersToSearchParams({ ...filters, page: p }).toString();
    return s ? `/activos?${s}` : "/activos";
  };

  const activeCount = all.filter((a) => !a.archived_at).length;
  const hasFilters = Boolean(
    filters.q ||
      filters.category ||
      filters.area ||
      filters.owner ||
      filters.criticality ||
      filters.status ||
      filters.classification ||
      filters.archived,
  );

  return (
    <>
      <PageHeader
        title="Inventario de activos"
        description={`${activeCount} activos activos. Registro maestro de activos de información con su valoración CIA y su estado de validación.`}
        actions={
          writable ? (
            <Link href="/activos/nuevo" className="btn btn-accent font-bold">
              <Plus className="size-4" aria-hidden /> Nuevo activo
            </Link>
          ) : null
        }
      />

      {all.length === 0 ? (
        <EmptyState
          title="Aún no hay activos registrados"
          action={
            writable ? (
              <Link href="/activos/nuevo" className="btn btn-accent">
                <Plus className="size-4" aria-hidden /> Registrar el primer activo
              </Link>
            ) : undefined
          }
        >
          Registra los activos de información de tu entidad. Cada activo se valora con criterios CIA y pasa por una
          lista de verificación antes de validarse.
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Filtros: formulario GET; el estado vive en la URL (compartible y persistente al navegar) */}
          <form className="card bg-base-100 shadow-sm" role="search" aria-label="Filtrar inventario">
            <div className="card-body gap-4 p-4 sm:p-5">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <label className="form-control">
                  <span className="mb-1 text-sm font-medium text-primary">Buscar por código o nombre</span>
                  <span className="input flex items-center gap-2">
                    <Search className="size-4 opacity-60" aria-hidden />
                    <input name="q" defaultValue={filters.q} className="grow" placeholder="Ej. AG-001 o Ciudadanía" />
                  </span>
                </label>
                <SelectFilter
                  name="categoria"
                  label="Categoría"
                  value={filters.category}
                  options={catalogs.categoria.map((c) => [c.code, c.label])}
                />
                <SelectFilter name="area" label="Área responsable" value={filters.area} options={areas.map((a) => [a, a])} />
                <SelectFilter
                  name="criticidad"
                  label="Criticidad"
                  value={filters.criticality}
                  options={[
                    ["Alta", "Alta"],
                    ["Media", "Media"],
                    ["Baja", "Baja"],
                    ["sin_calcular", "Sin calcular"],
                  ]}
                />
                <SelectFilter
                  name="propietario"
                  label="Propietario"
                  value={filters.owner}
                  options={[
                    ["sin_propietario", "Sin propietario válido"],
                    ["con_propietario", "Con propietario"],
                  ]}
                />
                <SelectFilter
                  name="estado"
                  label="Estado del registro"
                  value={filters.status}
                  options={STATUS_OPTIONS.map((s) => [s, s])}
                />
                <SelectFilter
                  name="clasificacion"
                  label="Clasificación"
                  value={filters.classification}
                  options={catalogs.clasificacion.map((c) => [c.code, c.label])}
                />
                <SelectFilter
                  name="orden"
                  label="Ordenar por"
                  value={filters.sort}
                  options={Object.entries(SORT_OPTIONS)}
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="label cursor-pointer gap-2 p-0 text-sm">
                  <input
                    type="checkbox"
                    name="archivados"
                    value="1"
                    className="checkbox checkbox-sm"
                    defaultChecked={filters.archived}
                  />
                  Mostrar archivados
                </label>
                <div className="flex gap-2">
                  {hasFilters && (
                    <Link href="/activos" className="btn btn-ghost btn-sm">
                      Limpiar filtros
                    </Link>
                  )}
                  <button type="submit" className="btn btn-primary btn-sm">
                    Aplicar
                  </button>
                </div>
              </div>
            </div>
          </form>

          <p className="text-sm text-primary/80" aria-live="polite">
            {pageData.total} {pageData.total === 1 ? "resultado" : "resultados"}
            {pageData.total > 0 && ` · página ${pageData.page} de ${pageData.totalPages}`}
          </p>

          {pageData.total === 0 ? (
            <EmptyState title="Sin resultados para estos filtros">
              Prueba con otra búsqueda o limpia los filtros para ver todo el inventario.
            </EmptyState>
          ) : (
            <div className="card overflow-hidden bg-base-100 shadow-sm">
              <div className="overflow-x-auto">
                <table className="table table-zebra">
                  <caption className="sr-only">Activos de información</caption>
                  <thead className="bg-primary text-primary-content">
                    <tr>
                      <th scope="col">Código</th>
                      <th scope="col">Nombre</th>
                      <th scope="col">Categoría</th>
                      <th scope="col">Criticidad</th>
                      <th scope="col">Propietario</th>
                      <th scope="col">Estado</th>
                      <th scope="col">Próxima revisión</th>
                      <th scope="col" className="text-right">
                        <span className="sr-only">Acciones</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageData.items.map((a) => (
                      <tr key={a.id} className={a.archived_at ? "opacity-60" : undefined}>
                        <td className="font-mono text-sm font-semibold text-primary">{a.code}</td>
                        <td className="max-w-xs">
                          <Link href={`/activos/${a.id}`} className="link link-hover font-medium text-primary">
                            {a.name ?? <span className="italic opacity-70">Sin nombre</span>}
                          </Link>
                          {a.archived_at && <span className="badge badge-ghost badge-sm ml-2">Archivado</span>}
                        </td>
                        <td className="text-sm">
                          {catalogs.categoria.find((c) => c.code === a.category_code)?.label ?? "—"}
                        </td>
                        <td>
                          <CriticalityBadge level={a.criticality} />
                        </td>
                        <td>
                          {isValidOwner(a.owner_name) ? (
                            <span className="text-sm">{a.owner_name}</span>
                          ) : (
                            <span className="badge badge-warning badge-sm gap-1 font-semibold">
                              <TriangleAlert className="size-3" aria-hidden /> Sin propietario
                            </span>
                          )}
                        </td>
                        <td>
                          <RegistryStatusBadge status={a.registryStatus} />
                        </td>
                        <td className="text-sm">
                          {a.nextReview ? (
                            <span>
                              {a.reviewOverdue && <span className="badge badge-accent badge-sm mr-1">Vencida</span>}
                              {formatDate(a.nextReview)}
                            </span>
                          ) : (
                            <span className="opacity-70">Sin fecha</span>
                          )}
                        </td>
                        <td className="text-right">
                          <div className="flex justify-end gap-1">
                            <Link
                              href={`/activos/${a.id}`}
                              className="btn btn-ghost btn-sm btn-square"
                              aria-label={`Ver ${a.code}`}
                              title="Ver ficha"
                            >
                              <Eye className="size-4" aria-hidden />
                            </Link>
                            {writable && !a.archived_at && (
                              <>
                                <Link
                                  href={`/activos/${a.id}/editar`}
                                  className="btn btn-ghost btn-sm btn-square"
                                  aria-label={`Editar ${a.code}`}
                                  title="Editar"
                                >
                                  <Pencil className="size-4" aria-hidden />
                                </Link>
                                <Link
                                  href={`/activos/${a.id}?accion=archivar`}
                                  className="btn btn-ghost btn-sm btn-square"
                                  aria-label={`Archivar ${a.code}`}
                                  title="Archivar"
                                >
                                  <Archive className="size-4" aria-hidden />
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
          )}

          {pageData.totalPages > 1 && (
            <nav className="join self-end" aria-label="Paginación">
              <Link
                href={pageHref(Math.max(1, pageData.page - 1))}
                aria-disabled={pageData.page <= 1}
                className={`btn join-item ${pageData.page <= 1 ? "btn-disabled" : ""}`}
              >
                Anterior
              </Link>
              <span className="btn join-item btn-ghost no-animation" aria-current="page">
                {pageData.page} / {pageData.totalPages}
              </span>
              <Link
                href={pageHref(Math.min(pageData.totalPages, pageData.page + 1))}
                aria-disabled={pageData.page >= pageData.totalPages}
                className={`btn join-item ${pageData.page >= pageData.totalPages ? "btn-disabled" : ""}`}
              >
                Siguiente
              </Link>
            </nav>
          )}
        </div>
      )}
    </>
  );
}

function SelectFilter({
  name,
  label,
  value,
  options,
}: {
  name: string;
  label: string;
  value: string;
  options: Array<[string, string]>;
}) {
  return (
    <label className="form-control">
      <span className="mb-1 text-sm font-medium text-primary">{label}</span>
      <select name={name} defaultValue={value} className="select w-full">
        <option value="">Todos</option>
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}
