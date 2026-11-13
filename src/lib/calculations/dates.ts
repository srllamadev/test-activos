/**
 * Utilidades de fechas. Todas las fechas de negocio se manejan como cadenas
 * "YYYY-MM-DD" (tipo DATE de PostgreSQL) para evitar desfases por zona horaria.
 */

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const m = ISO_DATE.exec(value);
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const date = new Date(Date.UTC(y, mo - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d;
}

/**
 * Suma meses calendario respetando el final de mes.
 * Equivalente a EDATE(fecha, meses): 31-ene + 1 mes = 28/29-feb.
 */
export function addCalendarMonths(isoDate: string, months: number): string {
  if (!isIsoDate(isoDate)) throw new Error(`Fecha inválida: ${isoDate}`);
  if (!Number.isInteger(months)) throw new Error("Los meses deben ser un entero.");
  const [y, m, d] = isoDate.split("-").map(Number) as [number, number, number];
  const totalMonths = y * 12 + (m - 1) + months;
  const targetYear = Math.floor(totalMonths / 12);
  const targetMonth = totalMonths % 12; // 0-based
  const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  const day = Math.min(d, lastDay);
  return formatIso(targetYear, targetMonth + 1, day);
}

/** proxima_revision = fecha_revision + meses configurados; null si no hay fecha. */
export function nextReviewDate(reviewDate: string | null | undefined, months: number): string | null {
  if (!reviewDate || !isIsoDate(reviewDate)) return null;
  return addCalendarMonths(reviewDate, months);
}

/** Fecha actual en la zona horaria de la organización, formato YYYY-MM-DD. */
export function todayIn(timeZone: string, now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Diferencia en días calendario entre dos fechas ISO (b - a). */
export function diffDays(a: string, b: string): number {
  return Math.round((toUtcMs(b) - toUtcMs(a)) / 86_400_000);
}

function toUtcMs(isoDate: string): number {
  if (!isIsoDate(isoDate)) throw new Error(`Fecha inválida: ${isoDate}`);
  const [y, m, d] = isoDate.split("-").map(Number) as [number, number, number];
  return Date.UTC(y, m - 1, d);
}

function formatIso(y: number, m: number, d: number): string {
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
