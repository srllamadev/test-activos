/** Formatea una fecha "YYYY-MM-DD" como dd/mm/aaaa sin pasar por zonas horarias. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

/** Formatea una marca de tiempo en la zona horaria indicada. */
export function formatDateTime(value: string | null | undefined, timeZone: string): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-BO", {
    timeZone,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
