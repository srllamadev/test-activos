"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, requireEditor, type AuthContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { toUserMessage } from "@/lib/errors";
import { parseAssetForm, type AssetFormValues, type FieldErrors, type ParsedAssetInput } from "@/lib/validations/asset";
import { assetRegistryStatus } from "@/lib/calculations/asset-registry";
import {
  ASSET_LIST_COLUMNS,
  getAssetQueryContext,
  registryInputFromRow,
  toAssetView,
  type AssetRow,
} from "./data";

export type SaveResult =
  | { ok: true; id: string; status: string; message: string }
  | { ok: false; message: string; fieldErrors?: FieldErrors };

/**
 * Crea o actualiza un activo.
 * - intent "draft": guarda aunque esté incompleto (is_draft = true).
 * - intent "save": guarda el registro (is_draft = false). Su estado se calcula según reglas.
 * Editar un activo validado limpia la validación: requiere nueva aprobación.
 */
export async function saveAssetAction(input: {
  id?: string;
  intent: "draft" | "save" | "autosave";
  values: AssetFormValues;
}): Promise<SaveResult> {
  try {
    const ctx = await requireEditor();
    const draft = input.intent !== "save";
    const parsed = parseAssetForm(input.values, { draft });
    if (!parsed.ok) return { ok: false, message: parsed.message, fieldErrors: parsed.fieldErrors };

    const supabase = await createClient();
    const data = parsed.data;

    const dependencyIds = await resolveDependencies(ctx.organizationId, data.dependencyCodes);
    if (!dependencyIds.ok) {
      return { ok: false, message: dependencyIds.message, fieldErrors: { dependencyCodes: dependencyIds.message } };
    }

    const row = toRow(data, draft);

    let assetId = input.id;
    if (assetId) {
      const { data: existing, error: readError } = await supabase
        .from("assets")
        .select("id, is_draft, archived_at")
        .eq("organization_id", ctx.organizationId)
        .eq("id", assetId)
        .maybeSingle();
      if (readError) throw readError;
      if (!existing) return { ok: false, message: "El activo no existe o no tienes acceso." };
      if (existing.archived_at) return { ok: false, message: "Un activo archivado no se puede modificar." };
      // Un registro ya guardado no vuelve a borrador por autoguardado ni por "guardar borrador".
      if (!existing.is_draft && draft) {
        return { ok: false, message: "Este registro ya fue guardado. Usa «Guardar registro» para actualizarlo." };
      }

      const { error } = await supabase
        .from("assets")
        .update({ ...row, validated_at: null, validated_by: null, updated_by: ctx.userId })
        .eq("organization_id", ctx.organizationId)
        .eq("id", assetId);
      if (error) throw error;
    } else {
      const { data: inserted, error } = await supabase
        .from("assets")
        .insert({ ...row, organization_id: ctx.organizationId, created_by: ctx.userId, updated_by: ctx.userId })
        .select("id")
        .single();
      if (error) throw error;
      assetId = inserted.id;
    }

    // Reemplazo de dependencias (la sincronización es completa: refleja el formulario).
    const { error: delError } = await supabase
      .from("asset_dependencies")
      .delete()
      .eq("organization_id", ctx.organizationId)
      .eq("asset_id", assetId!);
    if (delError) throw delError;
    if (dependencyIds.ids.length > 0) {
      const { error: insError } = await supabase.from("asset_dependencies").insert(
        dependencyIds.ids.map((depId) => ({
          organization_id: ctx.organizationId,
          asset_id: assetId!,
          depends_on_asset_id: depId,
        })),
      );
      if (insError) throw insError;
    }

    revalidatePath("/activos");
    revalidatePath(`/activos/${assetId}`);
    revalidatePath("/");

    const view = await loadAssetView(ctx, assetId!);
    return {
      ok: true,
      id: assetId!,
      status: view?.registryStatus ?? "Incompleto",
      message: draft ? "Borrador guardado." : "Registro guardado.",
    };
  } catch (error) {
    return { ok: false, message: toUserMessage(error) };
  }
}

/** Archiva un activo (no se borra para preservar la trazabilidad). */
export async function archiveAssetAction(id: string): Promise<{ ok: boolean; message: string }> {
  try {
    const ctx = await requireEditor();
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("assets")
      .update({ archived_at: new Date().toISOString(), updated_by: ctx.userId })
      .eq("organization_id", ctx.organizationId)
      .eq("id", id)
      .is("archived_at", null)
      .select("id");
    if (error) throw error;
    if (!data || data.length === 0) return { ok: false, message: "El activo no existe o ya está archivado." };
    revalidatePath("/activos");
    revalidatePath(`/activos/${id}`);
    revalidatePath("/");
    return { ok: true, message: "Activo archivado. Su historial se conserva." };
  } catch (error) {
    return { ok: false, message: toUserMessage(error) };
  }
}

/**
 * Validación formal. Solo administradores. Verifica en servidor la lista de comprobaciones
 * y registra quién validó y cuándo.
 */
export async function validateAssetAction(id: string): Promise<{ ok: boolean; message: string }> {
  try {
    const ctx = await requireAdmin();
    const supabase = await createClient();
    const { data: row, error } = await supabase
      .from("assets")
      .select("*")
      .eq("organization_id", ctx.organizationId)
      .eq("id", id)
      .is("archived_at", null)
      .maybeSingle();
    if (error) throw error;
    if (!row) return { ok: false, message: "El activo no existe o está archivado." };

    const { status, missing } = assetRegistryStatus(registryInputFromRow(row as unknown as AssetRow));

    if (status === "Validado") return { ok: true, message: "El activo ya está validado." };
    if (status !== "Listo para revisión") {
      return {
        ok: false,
        message: `No se puede validar. Pendiente: ${missing.map((m) => m.label).join("; ")}.`,
      };
    }

    const { error: updError } = await supabase
      .from("assets")
      .update({ validated_at: new Date().toISOString(), validated_by: ctx.userId, updated_by: ctx.userId })
      .eq("organization_id", ctx.organizationId)
      .eq("id", id);
    if (updError) throw updError;

    revalidatePath("/activos");
    revalidatePath(`/activos/${id}`);
    return { ok: true, message: "Activo validado y trazabilidad registrada." };
  } catch (error) {
    return { ok: false, message: toUserMessage(error) };
  }
}

// ---------------------------------------------------------------------------

async function resolveDependencies(
  organizationId: string,
  codes: string[],
): Promise<{ ok: true; ids: string[] } | { ok: false; message: string }> {
  if (codes.length === 0) return { ok: true, ids: [] };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("assets")
    .select("id, code")
    .eq("organization_id", organizationId)
    .in("code", codes)
    .is("archived_at", null);
  if (error) throw error;
  const found = new Map((data ?? []).map((r) => [r.code.toUpperCase(), r.id]));
  const missing = codes.filter((c) => !found.has(c.toUpperCase()));
  if (missing.length > 0) {
    return { ok: false, message: `Estos activos no existen en la organización: ${missing.join(", ")}.` };
  }
  return { ok: true, ids: codes.map((c) => found.get(c.toUpperCase())!) };
}

async function loadAssetView(ctx: AuthContext, id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("assets")
    .select(ASSET_LIST_COLUMNS)
    .eq("organization_id", ctx.organizationId)
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const qc = await getAssetQueryContext(ctx);
  return toAssetView(data as unknown as AssetRow, qc.criteria, qc.today);
}

function toRow(d: ParsedAssetInput, draft: boolean) {
  return {
    code: d.code,
    name: d.name,
    category_code: d.categoryCode,
    asset_type_code: d.assetTypeCode,
    description: d.description,
    macroprocess: d.macroprocess,
    process: d.process,
    subprocess: d.subprocess,
    responsible_area: d.responsibleArea,
    location: d.location,
    supplier: d.supplier,
    owner_name: d.ownerName,
    custodian_name: d.custodianName,
    administrator_name: d.administratorName,
    authorized_users: d.authorizedUsers,
    confidentiality: d.confidentiality,
    integrity: d.integrity,
    availability: d.availability,
    criticality_justification: d.criticalityJustification,
    evidence_reference: d.evidenceReference,
    evidence_status_code: d.evidenceStatusCode,
    source_reference: d.sourceReference,
    classification_code: d.classificationCode,
    regulatory_reference: d.regulatoryReference,
    lifecycle_code: d.lifecycleCode,
    review_date: d.reviewDate,
    observations: d.observations,
    is_draft: draft,
  };
}
