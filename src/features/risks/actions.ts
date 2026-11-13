"use server";

import { revalidatePath } from "next/cache";
import { requireEditor, type AuthContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { toUserMessage } from "@/lib/errors";
import { parseRiskForm, type RiskFormValues } from "@/lib/validations/risk";

export type RiskSaveResult =
  | { ok: true; id: string; message: string }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };

/**
 * Crea o actualiza un riesgo.
 */
export async function saveRiskAction(input: {
  id?: string;
  intent: "draft" | "save";
  values: RiskFormValues;
}): Promise<RiskSaveResult> {
  try {
    const ctx = await requireEditor();
    
    // Parsear y validar
    const parsed = parseRiskForm(input.values, { draft: input.intent === "draft" });
    if (!parsed.ok) {
      return { ok: false, message: parsed.message, fieldErrors: parsed.fieldErrors };
    }
    
    const supabase = await createClient();
    const data = parsed.data;
    
    // Convertir strings a números para campos CIA
    const row = {
      code: data.code.trim(),
      asset_id: data.assetId,
      threat_source: data.threatSource.trim(),
      vulnerability: data.vulnerability.trim(),
      scenario_consequence: data.scenarioConsequence.trim(),
      affected_process: data.affectedProcess.trim(),
      probability_inherent: data.probabilityInherent ? parseInt(data.probabilityInherent) : null,
      impact_inherent: data.impactInherent ? parseInt(data.impactInherent) : null,
      existing_controls: data.existingControls?.trim() || null,
      probability_residual: data.probabilityResidual ? parseInt(data.probabilityResidual) : null,
      impact_residual: data.impactResidual ? parseInt(data.impactResidual) : null,
      treatment_code: data.treatmentCode,
      risk_owner: data.riskOwner.trim(),
      assessment_date: data.assessmentDate,
      evidence_status_code: data.evidenceStatusCode,
      evidence_basis: data.evidenceBasis.trim(),
      observations: data.observations?.trim() || null,
      is_draft: input.intent === "draft",
    };
    
    let riskId = input.id;
    
    if (riskId) {
      // Actualizar
      const { data: existing, error: readError } = await supabase
        .from("risks")
        .select("id, archived_at")
        .eq("organization_id", ctx.organizationId)
        .eq("id", riskId)
        .maybeSingle();
      
      if (readError) throw readError;
      if (!existing) return { ok: false, message: "El riesgo no existe o no tienes acceso." };
      if (existing.archived_at) return { ok: false, message: "Un riesgo archivado no se puede modificar." };
      
      const { error } = await supabase
        .from("risks")
        .update(row)
        .eq("organization_id", ctx.organizationId)
        .eq("id", riskId);
      
      if (error) throw error;
    } else {
      // Crear
      const { data: inserted, error } = await supabase
        .from("risks")
        .insert({ ...row, organization_id: ctx.organizationId })
        .select("id")
        .single();
      
      if (error) throw error;
      riskId = inserted.id;
    }
    
    revalidatePath("/riesgos");
    revalidatePath(`/riesgos/${riskId}`);
    revalidatePath("/");
    
    return {
      ok: true,
      id: riskId!,
      message: input.intent === "draft" ? "Borrador guardado." : "Riesgo guardado.",
    };
  } catch (error) {
    console.error("Error saving risk:", error);
    return { ok: false, message: toUserMessage(error) };
  }
}

/**
 * Archiva un riesgo.
 */
export async function archiveRiskAction(id: string): Promise<{ ok: boolean; message: string }> {
  try {
    const ctx = await requireEditor();
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from("risks")
      .update({ archived_at: new Date().toISOString() })
      .eq("organization_id", ctx.organizationId)
      .eq("id", id)
      .is("archived_at", null)
      .select("id");
    
    if (error) throw error;
    if (!data || data.length === 0) {
      return { ok: false, message: "El riesgo no existe o ya está archivado." };
    }
    
    revalidatePath("/riesgos");
    revalidatePath(`/riesgos/${id}`);
    revalidatePath("/");
    
    return { ok: true, message: "Riesgo archivado." };
  } catch (error) {
    console.error("Error archiving risk:", error);
    return { ok: false, message: toUserMessage(error) };
  }
}

/**
 * Valida que un código de riesgo sea único dentro de la organización.
 */
export async function checkRiskCodeUnique(
  ctx: AuthContext,
  code: string,
  excludeId?: string
): Promise<boolean> {
  const supabase = await createClient();
  
  let query = supabase
    .from("risks")
    .select("id")
    .eq("organization_id", ctx.organizationId)
    .eq("code", code.trim())
    .is("archived_at", null)
    .limit(1);
  
  if (excludeId) {
    query = query.neq("id", excludeId);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error("Error checking risk code:", error);
    return false;
  }
  
  return !data || data.length === 0;
}
