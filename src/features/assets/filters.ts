/** Filtros, orden y paginación del inventario. Funciones puras (sin acceso a datos). */
import type { AssetView } from "./data";
import { isValidOwner, type RegistryStatus } from "@/lib/calculations/asset-registry";

export const PAGE_SIZE = 25;

export const SORT_OPTIONS = {
  code: "Código",
  name: "Nombre",
  criticality: "Criticidad (mayor primero)",
  review: "Próxima revisión (más próxima primero)",
  updated: "Última modificación",
} as const;
export type SortKey = keyof typeof SORT_OPTIONS;

export interface AssetFilters {
  q: string;
  category: string;
  area: string;
  owner: "" | "sin_propietario" | "con_propietario";
  criticality: "" | "Alta" | "Media" | "Baja" | "sin_calcular";
  status: "" | RegistryStatus;
  classification: string;
  archived: boolean;
  sort: SortKey;
  page: number;
}

const CRITICALITY_RANK: Record<string, number> = { Alta: 3, Media: 2, Baja: 1 };

export function parseFilters(params: Record<string, string | string[] | undefined>): AssetFilters {
  const get = (k: string) => {
    const v = params[k];
    return Array.isArray(v) ? (v[0] ?? "") : (v ?? "");
  };
  const sort = (get("orden") || "code") as SortKey;
  const page = Math.max(1, Number.parseInt(get("pagina") || "1", 10) || 1);
  return {
    q: get("q").trim().slice(0, 120),
    category: get("categoria"),
    area: get("area"),
    owner: (get("propietario") as AssetFilters["owner"]) || "",
    criticality: (get("criticidad") as AssetFilters["criticality"]) || "",
    status: (get("estado") as AssetFilters["status"]) || "",
    classification: get("clasificacion"),
    archived: get("archivados") === "1",
    sort: sort in SORT_OPTIONS ? sort : "code",
    page,
  };
}

/** Parámetros de URL a partir de filtros (sin valores vacíos). */
export function filtersToSearchParams(f: Partial<AssetFilters>): URLSearchParams {
  const p = new URLSearchParams();
  const set = (k: string, v: string | undefined | boolean) => {
    if (v === undefined || v === "" || v === false) return;
    p.set(k, v === true ? "1" : String(v));
  };
  set("q", f.q);
  set("categoria", f.category);
  set("area", f.area);
  set("propietario", f.owner);
  set("criticidad", f.criticality);
  set("estado", f.status);
  set("clasificacion", f.classification);
  set("archivados", f.archived);
  if (f.sort && f.sort !== "code") set("orden", f.sort);
  if (f.page && f.page > 1) set("pagina", String(f.page));
  return p;
}

export function applyAssetFilters(rows: AssetView[], f: AssetFilters): AssetView[] {
  const q = normalize(f.q);
  const filtered = rows.filter((r) => {
    if (!f.archived && r.archived_at) return false;
    if (f.archived && !r.archived_at) return false;
    if (q) {
      const hay = normalize(`${r.code} ${r.name ?? ""}`);
      if (!hay.includes(q)) return false;
    }
    if (f.category && r.category_code !== f.category) return false;
    if (f.area && r.responsible_area !== f.area) return false;
    if (f.classification && r.classification_code !== f.classification) return false;
    if (f.owner === "sin_propietario" && isValidOwner(r.owner_name)) return false;
    if (f.owner === "con_propietario" && !isValidOwner(r.owner_name)) return false;
    if (f.criticality === "sin_calcular" && r.criticality !== null) return false;
    if (f.criticality && f.criticality !== "sin_calcular" && r.criticality !== f.criticality) return false;
    if (f.status && r.registryStatus !== f.status) return false;
    return true;
  });
  return sortAssets(filtered, f.sort);
}

export function sortAssets(rows: AssetView[], key: SortKey): AssetView[] {
  const copy = [...rows];
  switch (key) {
    case "name":
      return copy.sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "", "es"));
    case "criticality":
      return copy.sort(
        (a, b) =>
          (CRITICALITY_RANK[b.criticality ?? ""] ?? 0) - (CRITICALITY_RANK[a.criticality ?? ""] ?? 0) ||
          a.code.localeCompare(b.code, "es", { numeric: true }),
      );
    case "review":
      return copy.sort((a, b) => (a.nextReview ?? "9999").localeCompare(b.nextReview ?? "9999"));
    case "updated":
      return copy.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    case "code":
    default:
      return copy.sort((a, b) => a.code.localeCompare(b.code, "es", { numeric: true }));
  }
}

export function paginate<T>(rows: T[], page: number, size = PAGE_SIZE) {
  const totalPages = Math.max(1, Math.ceil(rows.length / size));
  const current = Math.min(Math.max(1, page), totalPages);
  const start = (current - 1) * size;
  return { items: rows.slice(start, start + size), page: current, totalPages, total: rows.length };
}

function normalize(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}
