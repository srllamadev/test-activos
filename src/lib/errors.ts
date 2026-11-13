/** Mensajes seguros para el usuario: nunca se muestran detalles internos de la base de datos. */
export function toUserMessage(error: unknown): string {
  if (error instanceof Error && error.message && !isInternal(error.message)) {
    return error.message;
  }
  const code = (error as { code?: string } | null)?.code;
  if (code === "23505") return "Ya existe un registro con ese código en esta organización.";
  if (code === "42501") return "No tienes permisos para realizar esta acción.";
  if (code === "23514") return "Algún valor no es válido según las reglas del sistema.";
  if (code === "23503") return "Hay una referencia a un registro que no existe.";
  return "No se pudo completar la operación. Inténtalo de nuevo o contacta al administrador.";
}

function isInternal(message: string): boolean {
  return /supabase|postgres|pgrst|relation |column |violates|jwt/i.test(message);
}
