"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { toUserMessage } from "@/lib/errors";
import { validateCiaThresholds } from "@/lib/calculations/cia";
import { validateRiskThresholds } from "@/lib/calculations/risk";

export interface SettingsResult {
  ok: boolean;
  message: string;
  errors?: Record<string, string>;
}

const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo ${max} caracteres.`)
    .transform((v) => (v === "" ? null : v));

const orgSchema = z.object({
  name: z.string().trim().min(2, "Ingresa el nombre de la entidad.").max(200),
  shortName: optional(30),
  sector: z.enum(["publico", "privado", "academico", "salud", "otro"]),
  description: optional(2000),
  inventoryScope: optional(2000),
  methodologicalOwner: optional(200),
  startDate: z
    .string()
    .refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), "Fecha no válida.")
    .transform((v) => (v === "" ? null : v)),
  regulatoryReferences: optional(2000),
  timeZone: z.string().trim().min(3).max(64).regex(/^[A-Za-z_]+(\/[A-Za-z_+-]+)*$/, "Zona horaria no válida."),
});

export async function saveOrganizationAction(_prev: SettingsResult | null, formData: FormData): Promise<SettingsResult> {
  try {
    const ctx = await requireAdmin();
    const parsed = orgSchema.safeParse({
      name: formData.get("name"),
      shortName: formData.get("shortName") ?? "",
      sector: formData.get("sector"),
      description: formData.get("description") ?? "",
      inventoryScope: formData.get("inventoryScope") ?? "",
      methodologicalOwner: formData.get("methodologicalOwner") ?? "",
      startDate: formData.get("startDate") ?? "",
      regulatoryReferences: formData.get("regulatoryReferences") ?? "",
      timeZone: formData.get("timeZone"),
    });
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const i of parsed.error.issues) errors[String(i.path[0])] ??= i.message;
      return { ok: false, message: "Revisa los campos marcados.", errors };
    }
    const d = parsed.data;
    const supabase = await createClient();
    const { error } = await supabase
      .from("organizations")
      .update({
        name: d.name,
        short_name: d.shortName,
        sector: d.sector,
        description: d.description,
        inventory_scope: d.inventoryScope,
        methodological_owner: d.methodologicalOwner,
        start_date: d.startDate,
        regulatory_references: d.regulatoryReferences,
        time_zone: d.timeZone,
      })
      .eq("id", ctx.organizationId);
    if (error) throw error;
    revalidatePath("/", "layout");
    return { ok: true, message: "Datos de la entidad guardados." };
  } catch (error) {
    return { ok: false, message: toUserMessage(error) };
  }
}

const criteriaSchema = z.object({
  label: z.string().trim().min(3, "Describe la versión (p. ej. «Versión 2026-1 aprobada por Dirección»).").max(200),
  criticalFrom: z.coerce.number().int().min(1).max(5),
  mediumFrom: z.coerce.number().int().min(1).max(5),
  riskHighFrom: z.coerce.number().int().min(2).max(25),
  riskMediumFrom: z.coerce.number().int().min(1).max(25),
  reviewMonths: z.coerce.number().int().min(1).max(36),
  approve: z.boolean(),
});

/** Publica una nueva versión de criterios. La anterior queda como histórico. */
export async function publishCriteriaAction(_prev: SettingsResult | null, formData: FormData): Promise<SettingsResult> {
  try {
    const ctx = await requireAdmin();
    const parsed = criteriaSchema.safeParse({
      label: formData.get("label"),
      criticalFrom: formData.get("criticalFrom"),
      mediumFrom: formData.get("mediumFrom"),
      riskHighFrom: formData.get("riskHighFrom"),
      riskMediumFrom: formData.get("riskMediumFrom"),
      reviewMonths: formData.get("reviewMonths"),
      approve: formData.get("approve") === "on",
    });
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const i of parsed.error.issues) errors[String(i.path[0])] ??= i.message;
      return { ok: false, message: "Revisa los valores de los criterios.", errors };
    }
    const c = parsed.data;
    const ciaErrors = validateCiaThresholds({ criticalFrom: c.criticalFrom, mediumFrom: c.mediumFrom });
    const riskErrors = validateRiskThresholds({ highFrom: c.riskHighFrom, mediumFrom: c.riskMediumFrom });
    const problems = [...ciaErrors, ...riskErrors];
    if (problems.length > 0) return { ok: false, message: problems.join(" ") };

    const supabase = await createClient();
    const { error } = await supabase.rpc("publish_criteria_version", {
      p_org: ctx.organizationId,
      p_label: c.label,
      p_critical_from: c.criticalFrom,
      p_medium_from: c.mediumFrom,
      p_risk_high_from: c.riskHighFrom,
      p_risk_medium_from: c.riskMediumFrom,
      p_review_months: c.reviewMonths,
      p_approve: c.approve,
    });
    if (error) throw error;
    revalidatePath("/", "layout");
    return {
      ok: true,
      message: c.approve
        ? "Criterios publicados y marcados como aprobados. La versión anterior se conserva como histórico."
        : "Criterios publicados como no aprobados. La versión anterior se conserva como histórico.",
    };
  } catch (error) {
    return { ok: false, message: toUserMessage(error) };
  }
}
