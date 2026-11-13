/**
 * Alertas de seguimiento. Equivalente a Seguimiento!M:
 *   =IF(H="Completada","Cerrada",IF(F="","Sin fecha",IF(F<HOY,"Vencida",IF(F<=HOY+7,"Próxima","En plazo"))))
 * La fecha "hoy" se obtiene en la zona horaria de la organización.
 */
import { diffDays } from "./dates";

export const FOLLOW_UP_STATUSES = ["Pendiente", "En curso", "Completada", "Vencida"] as const;
export type FollowUpStatus = (typeof FOLLOW_UP_STATUSES)[number];

export type FollowUpAlert = "Cerrada" | "Sin fecha" | "Vencida" | "Próxima" | "En plazo";

export const UPCOMING_WINDOW_DAYS = 7;

export function followUpAlert(
  status: FollowUpStatus | string,
  scheduledDate: string | null | undefined,
  today: string,
): FollowUpAlert {
  if (status === "Completada") return "Cerrada";
  if (!scheduledDate) return "Sin fecha";
  const delta = diffDays(today, scheduledDate); // >0 => futuro
  if (delta < 0) return "Vencida";
  if (delta <= UPCOMING_WINDOW_DAYS) return "Próxima";
  return "En plazo";
}
