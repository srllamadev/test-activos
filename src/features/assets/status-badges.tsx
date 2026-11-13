import { Badge, type BadgeTone } from "@/components/ui/badge";
import type { CriticalityLevel } from "@/lib/calculations/cia";
import type { RegistryStatus } from "@/lib/calculations/asset-registry";

const REGISTRY_TONE: Record<RegistryStatus, BadgeTone> = {
  Borrador: "outline",
  Incompleto: "neutral",
  "Listo para revisión": "primary",
  Validado: "accent",
};

export function RegistryStatusBadge({ status }: { status: RegistryStatus }) {
  return <Badge tone={REGISTRY_TONE[status]}>{status}</Badge>;
}

/** La criticidad alta se distingue por texto y peso, no solo por color. */
export function CriticalityBadge({ level }: { level: CriticalityLevel | null }) {
  if (!level) return <Badge tone="outline">Sin calcular</Badge>;
  if (level === "Alta") return <Badge tone="accent">▲ Alta</Badge>;
  return <Badge tone="primary">{level}</Badge>;
}
