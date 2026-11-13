"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, ChevronLeft, ChevronRight, CircleAlert, CircleCheck, LoaderCircle, Save } from "lucide-react";
import {
  ASSET_STEP_FIELDS,
  assetFormSchema,
  firstStepWithError,
  type AssetFormValues,
  type FieldErrors,
} from "@/lib/validations/asset";
import { evaluateCia, CIA_DIMENSION_LABEL, type CiaThresholds, type CiaDimension } from "@/lib/calculations/cia";
import { assetRegistryStatus, type AssetRegistryInput } from "@/lib/calculations/asset-registry";
import { addCalendarMonths, isIsoDate } from "@/lib/calculations/dates";
import { CIA_HELP } from "@/lib/calculations/cia-help";
import { saveAssetAction } from "./actions";
import type { CatalogOption, CatalogType } from "./data";
import { Badge } from "@/components/ui/badge";

const STEPS = [
  { title: "Identificación", hint: "Qué es el activo" },
  { title: "Contexto", hint: "Dónde se usa" },
  { title: "Responsables", hint: "Quién responde" },
  { title: "Valoración CIA", hint: "Cuánto impacta" },
  { title: "Evidencias", hint: "Cómo se respalda" },
  { title: "Revisión", hint: "Cuándo revisar y confirmar" },
];

export interface AssetFormProps {
  assetId?: string;
  isDraftRecord: boolean;
  initialValues: AssetFormValues;
  catalogs: Record<CatalogType, CatalogOption[]>;
  criteria: { cia: CiaThresholds; reviewMonths: number; version: number; label: string };
  canEdit: boolean;
}

type SaveIntent = "draft" | "save";

export function AssetForm(props: AssetFormProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  // Referencia (no estado) para que el autoguardado nunca use un identificador obsoleto.
  const assetIdRef = useRef<string | undefined>(props.assetId);
  const [isDraftRecord, setIsDraftRecord] = useState(props.isDraftRecord);
  const [banner, setBanner] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [autosave, setAutosave] = useState<"idle" | "pending" | "saving" | "saved" | "error">("idle");
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const intentRef = useRef<SaveIntent>("draft");

  const form = useForm<AssetFormValues>({
    resolver: zodResolver(assetFormSchema),
    defaultValues: props.initialValues,
    mode: "onTouched",
  });

  const values = form.watch();
  const cia = evaluateCia(
    {
      confidencialidad: toNum(values.confidentiality),
      integridad: toNum(values.integrity),
      disponibilidad: toNum(values.availability),
    },
    props.criteria.cia,
  );

  const preview = useMemo(() => toRegistryInput(values), [values]);
  const checklist = useMemo(() => assetRegistryStatus({ ...preview, isDraft: false }), [preview]);
  const nextReview =
    isIsoDate(values.reviewDate) && props.criteria.reviewMonths > 0
      ? addCalendarMonths(values.reviewDate, props.criteria.reviewMonths)
      : null;

  // -------------------------------------------------------------------------
  // Guardado
  // -------------------------------------------------------------------------
  async function persist(intent: SaveIntent | "autosave", values: AssetFormValues) {
    return saveAssetAction({ id: assetIdRef.current, intent, values });
  }

  function rememberId(id: string) {
    assetIdRef.current = id;
  }

  /** Cambia la URL sin remontar el formulario (no se pierde lo que el usuario escribe). */
  function replaceUrl(url: string) {
    window.history.replaceState(window.history.state, "", url);
  }

  function applyFieldErrors(errors: FieldErrors) {
    for (const [key, message] of Object.entries(errors)) {
      if (message) form.setError(key as FieldPath<AssetFormValues>, { type: "server", message });
    }
    setStep(firstStepWithError(errors));
  }

  const onSubmit = (data: AssetFormValues) => {
    const intent = intentRef.current;
    setBanner(null);
    startTransition(async () => {
      const result = await persist(intent, data);
      if (!result.ok) {
        setBanner({ kind: "error", text: result.message });
        if (result.fieldErrors) applyFieldErrors(result.fieldErrors);
        return;
      }
      rememberId(result.id);
      setIsDraftRecord(intent !== "save");
      setLastSaved(new Date().toLocaleTimeString("es"));
      if (intent === "save") {
        router.push(`/activos/${result.id}?guardado=1`);
        router.refresh();
        return;
      }
      setBanner({ kind: "ok", text: result.message });
      if (!props.assetId) replaceUrl(`/activos/${result.id}/editar`);
    });
  };

  // -------------------------------------------------------------------------
  // Autoguardado: solo para borradores (nunca sobrescribe un registro ya guardado).
  // -------------------------------------------------------------------------
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestValues = useRef(values);
  latestValues.current = values;

  useEffect(() => {
    if (!props.canEdit) return;
    // watch() con callback: suscripción imperativa para el autoguardado (no provoca renders).
    // eslint-disable-next-line react-hooks/incompatible-library
    const subscription = form.watch(() => {
      if (!isDraftRecord) return;
      if (!form.getValues("code").trim()) return;
      setAutosave("pending");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(async () => {
        setAutosave("saving");
        const result = await persist("autosave", latestValues.current);
        if (result.ok) {
          const isNew = !assetIdRef.current;
          rememberId(result.id);
          setLastSaved(new Date().toLocaleTimeString("es"));
          setAutosave("saved");
          if (isNew) replaceUrl(`/activos/${result.id}/editar`);
        } else {
          setAutosave("error");
        }
      }, 4000);
    });
    return () => {
      subscription.unsubscribe();
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDraftRecord, props.canEdit]);

  async function goNext() {
    const fields = ASSET_STEP_FIELDS[step] as Array<FieldPath<AssetFormValues>>;
    const ok = await form.trigger(fields);
    if (ok) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  const disabled = !props.canEdit || pending;

  return (
    <form className="flex flex-col gap-6" onSubmit={form.handleSubmit(onSubmit)} noValidate aria-busy={pending}>
      {/* Progreso */}
      <nav aria-label="Pasos del formulario">
        <ol className="grid grid-cols-2 gap-2 md:grid-cols-6">
          {STEPS.map((s, i) => {
            const active = i === step;
            const done = i < step;
            return (
              <li key={s.title}>
                <button
                  type="button"
                  onClick={() => setStep(i)}
                  aria-current={active ? "step" : undefined}
                  className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left transition-colors duration-200 ${
                    active ? "border-accent bg-accent text-accent-content shadow-sm" : "border-primary/20 bg-base-100 hover:bg-base-200"
                  }`}
                >
                  <span
                    className={`grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold ${
                      active ? "bg-primary text-primary-content" : done ? "bg-primary/15 text-primary" : "bg-base-200 text-primary"
                    }`}
                  >
                    {done ? <Check className="size-3.5" aria-label="completado" /> : i + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{s.title}</span>
                    <span className="hidden truncate text-xs opacity-80 xl:block">{s.hint}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      {banner && (
        <div role={banner.kind === "error" ? "alert" : "status"} className={`alert text-sm ${banner.kind === "error" ? "alert-error" : ""}`}>
          {banner.kind === "error" ? <CircleAlert className="size-4" aria-hidden /> : <CircleCheck className="size-4" aria-hidden />}
          <span>{banner.text}</span>
        </div>
      )}

      {Object.values(form.formState.errors).length > 0 && (
        <p role="status" className="text-sm text-error-content">
          <span className="badge badge-error badge-sm mr-2 font-bold">Revisar</span>
          Hay campos con errores en este paso o en pasos anteriores.
        </p>
      )}

      {/* Paso 1 */}
      <section hidden={step !== 0} aria-labelledby="s1" className="card bg-base-100 shadow-sm">
        <div className="card-body gap-4">
          <h2 id="s1" className="card-title text-primary">1. Identificación</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <TextField form={form} name="code" label="Código (ID único)" required disabled={disabled} placeholder="AG-001" hint="Letras, números, punto, guion o guion bajo." />
            <TextField form={form} name="name" label="Nombre del activo" required disabled={disabled} />
            <SelectField form={form} name="categoryCode" label="Categoría" required disabled={disabled} options={props.catalogs.categoria} />
            <SelectField form={form} name="assetTypeCode" label="Tipo de activo" required disabled={disabled} options={props.catalogs.tipo_activo} />
            <TextField form={form} name="description" label="Descripción y finalidad" required disabled={disabled} multiline className="md:col-span-2" />
          </div>
        </div>
      </section>

      {/* Paso 2 */}
      <section hidden={step !== 1} aria-labelledby="s2" className="card bg-base-100 shadow-sm">
        <div className="card-body gap-4">
          <h2 id="s2" className="card-title text-primary">2. Contexto organizacional</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <TextField form={form} name="macroprocess" label="Macroproceso" required disabled={disabled} />
            <TextField form={form} name="process" label="Proceso" required disabled={disabled} />
            <TextField form={form} name="subprocess" label="Subproceso o actividad" disabled={disabled} />
            <TextField form={form} name="responsibleArea" label="Área o unidad responsable" required disabled={disabled} />
            <TextField form={form} name="location" label="Ubicación" disabled={disabled} hint="Usa la modalidad (p. ej. 'Nube pública') si no se conoce la sede." />
            <TextField form={form} name="supplier" label="Proveedor o tercero" disabled={disabled} />
          </div>
        </div>
      </section>

      {/* Paso 3 */}
      <section hidden={step !== 2} aria-labelledby="s3" className="card bg-base-100 shadow-sm">
        <div className="card-body gap-4">
          <h2 id="s3" className="card-title text-primary">3. Responsabilidades</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <TextField form={form} name="ownerName" label="Propietario" required disabled={disabled} hint="Persona o cargo responsable. 'Por identificar' no cuenta como propietario válido." />
            <TextField form={form} name="custodianName" label="Custodio" disabled={disabled} />
            <TextField form={form} name="administratorName" label="Administrador" disabled={disabled} />
            <TextField form={form} name="authorizedUsers" label="Usuarios autorizados" disabled={disabled} />
            <TextField form={form} name="dependencyCodes" label="Activos de los que depende" disabled={disabled} className="md:col-span-2" hint="Códigos separados por punto y coma, por ejemplo: AG-001; AG-002." />
          </div>
        </div>
      </section>

      {/* Paso 4 */}
      <section hidden={step !== 3} aria-labelledby="s4" className="card bg-base-100 shadow-sm">
        <div className="card-body gap-4">
          <h2 id="s4" className="card-title text-primary">4. Valoración CIA</h2>
          <p className="text-sm text-primary/80">
            Valora cada dimensión de 1 a 5 según los criterios {props.criteria.label.toLowerCase()} (versión {props.criteria.version || "—"}).
          </p>
          <div className="grid gap-4 md:grid-cols-3">
            {(["confidentiality", "integrity", "availability"] as const).map((name) => (
              <CiaField key={name} form={form} name={name} disabled={disabled} dimension={CIA_NAME[name]} />
            ))}
          </div>

          <CriticalityPanel result={cia} thresholds={props.criteria.cia} />

          <TextField form={form} name="criticalityJustification" label="Justificación de la criticidad" required disabled={disabled} multiline hint="Explica por qué se asignaron estos valores. Es obligatorio para validar el registro." />
        </div>
      </section>

      {/* Paso 5 */}
      <section hidden={step !== 4} aria-labelledby="s5" className="card bg-base-100 shadow-sm">
        <div className="card-body gap-4">
          <h2 id="s5" className="card-title text-primary">5. Evidencias y fuentes</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <TextField form={form} name="evidenceReference" label="Evidencia o referencia documental" required disabled={disabled} multiline />
            <div className="flex flex-col gap-4">
              <SelectField form={form} name="evidenceStatusCode" label="Estado de evidencia" required disabled={disabled} options={props.catalogs.estado_evidencia} />
              <SelectField form={form} name="classificationCode" label="Clasificación de la información" required disabled={disabled} options={props.catalogs.clasificacion} />
            </div>
            <TextField form={form} name="sourceReference" label="Fuente o sección" required disabled={disabled} hint="Enlace o documento de donde se obtuvo la información." />
            <TextField form={form} name="regulatoryReference" label="Referencia normativa" disabled={disabled} hint="Por ejemplo: ISO/IEC 27001:2022 A.5.9. Registrarla no implica cumplimiento." />
          </div>
        </div>
      </section>

      {/* Paso 6 */}
      <section hidden={step !== 5} aria-labelledby="s6" className="card bg-base-100 shadow-sm">
        <div className="card-body gap-4">
          <h2 id="s6" className="card-title text-primary">6. Revisión y confirmación</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <SelectField form={form} name="lifecycleCode" label="Ciclo de vida" required disabled={disabled} options={props.catalogs.ciclo_vida} />
            <div className="form-control w-full">
              <label className="label-text mb-1 font-medium" htmlFor="reviewDate">
                Fecha de revisión <Badge tone="primary" size="xs">obligatoria para validar</Badge>
              </label>
              <input id="reviewDate" type="date" className="input w-full" disabled={disabled} {...form.register("reviewDate")} />
              {form.formState.errors.reviewDate && (
                <span className="mt-1 text-xs text-error-content">{form.formState.errors.reviewDate.message}</span>
              )}
            </div>
            <div className="form-control w-full">
              <span className="label-text mb-1 font-medium">
                Próxima revisión <Badge tone="neutral" size="xs">calculado</Badge>
              </span>
              <output className="input flex items-center bg-base-200" aria-live="polite">
                {nextReview ? `${nextReview} (cada ${props.criteria.reviewMonths} meses)` : "Indica la fecha de revisión"}
              </output>
            </div>
            <TextField form={form} name="observations" label="Observaciones y pendientes" disabled={disabled} multiline className="md:col-span-3" />
          </div>

          <div className="rounded-box border border-primary/15 bg-base-200 p-4">
            <p className="font-semibold text-primary">Estado que tendrá el registro al guardarse</p>
            <p className="mt-1 text-sm">
              {checklist.missing.length === 0 ? (
                <Badge tone="accent">Listo para revisión</Badge>
              ) : (
                <Badge tone="neutral">Incompleto</Badge>
              )}
            </p>
            {checklist.missing.length > 0 && (
              <>
                <p className="mt-3 text-sm font-medium">Requisitos pendientes ({checklist.missing.length}):</p>
                <ul className="mt-1 list-inside list-disc text-sm">
                  {checklist.missing.map((m) => (
                    <li key={m.key}>{m.label}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Barra de acciones */}
      <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center justify-between gap-3 border-t border-primary/15 bg-base-100/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="text-xs text-primary/80" role="status" aria-live="polite">
          {autosave === "pending" && "Cambios sin guardar"}
          {autosave === "saving" && (
            <span className="inline-flex items-center gap-1"><LoaderCircle className="size-3 animate-spin" aria-hidden /> Autoguardando borrador…</span>
          )}
          {autosave === "saved" && lastSaved && `Borrador guardado a las ${lastSaved}`}
          {autosave === "error" && <span className="text-error-content">No se pudo autoguardar. Guarda manualmente.</span>}
          {autosave === "idle" && lastSaved && `Último guardado: ${lastSaved}`}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-ghost" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>
            <ChevronLeft className="size-4" aria-hidden /> Anterior
          </button>
          {step < STEPS.length - 1 ? (
            <button type="button" className="btn btn-outline" onClick={goNext}>
              Siguiente <ChevronRight className="size-4" aria-hidden />
            </button>
          ) : null}
          <button
            type="submit"
            className="btn btn-outline"
            disabled={disabled}
            onClick={() => (intentRef.current = "draft")}
          >
            <Save className="size-4" aria-hidden /> Guardar borrador
          </button>
          <button
            type="submit"
            className="btn btn-accent font-bold"
            disabled={disabled}
            onClick={() => (intentRef.current = "save")}
          >
            {pending ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Check className="size-4" aria-hidden />}
            Guardar registro
          </button>
        </div>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Piezas de formulario
// ---------------------------------------------------------------------------

const CIA_NAME = {
  confidentiality: "confidencialidad",
  integrity: "integridad",
  availability: "disponibilidad",
} as const satisfies Record<"confidentiality" | "integrity" | "availability", CiaDimension>;

type FormApi = ReturnType<typeof useForm<AssetFormValues>>;

function Label({ htmlFor, text, required }: { htmlFor: string; text: string; required?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="mb-1 font-medium text-primary">
      {text}
      {required ? <span className="text-accent" aria-hidden> *</span> : <span className="ml-1 text-xs font-normal text-primary/60">(opcional)</span>}
    </label>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <span className="mt-1 text-xs font-medium text-error-content">{message}</span>;
}

function TextField({
  form,
  name,
  label,
  required,
  disabled,
  hint,
  multiline,
  placeholder,
  className,
}: {
  form: FormApi;
  name: keyof AssetFormValues;
  label: string;
  required?: boolean;
  disabled?: boolean;
  hint?: string;
  multiline?: boolean;
  placeholder?: string;
  className?: string;
}) {
  const id = `f-${name}`;
  const error = form.formState.errors[name]?.message;
  const common = {
    id,
    disabled,
    placeholder,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": hint || error ? `${id}-hint` : undefined,
    ...form.register(name),
  };
  return (
    <div className={`form-control w-full ${className ?? ""}`}>
      <Label htmlFor={id} text={label} required={required} />
      {multiline ? (
        <textarea rows={3} className="textarea w-full" {...common} />
      ) : (
        <input type="text" className="input w-full" {...common} />
      )}
      <span id={`${id}-hint`}>
        {hint && !error && <span className="mt-1 text-xs text-primary/70">{hint}</span>}
        <FieldError message={error} />
      </span>
    </div>
  );
}

function SelectField({
  form,
  name,
  label,
  required,
  disabled,
  options,
}: {
  form: FormApi;
  name: keyof AssetFormValues;
  label: string;
  required?: boolean;
  disabled?: boolean;
  options: CatalogOption[];
}) {
  const id = `f-${name}`;
  const error = form.formState.errors[name]?.message;
  const current = form.getValues(name);
  const active = options.filter((o) => o.active);
  return (
    <div className="form-control w-full">
      <Label htmlFor={id} text={label} required={required} />
      <select id={id} className="select w-full" disabled={disabled} aria-invalid={error ? true : undefined} {...form.register(name)}>
        <option value="">Seleccionar…</option>
        {active.map((o) => (
          <option key={o.code} value={o.code}>
            {o.label}
          </option>
        ))}
        {/* Conserva un valor ya guardado aunque esté desactivado en el catálogo */}
        {current && !active.some((o) => o.code === current) && (
          <option value={current}>{current} (inactivo)</option>
        )}
      </select>
      <FieldError message={error} />
    </div>
  );
}

function CiaField({
  form,
  name,
  disabled,
  dimension,
}: {
  form: FormApi;
  name: "confidentiality" | "integrity" | "availability";
  disabled?: boolean;
  dimension: CiaDimension;
}) {
  const id = `f-${name}`;
  const error = form.formState.errors[name]?.message;
  const help = CIA_HELP[dimension];
  const selected = form.watch(name);
  const description = selected ? help[Number(selected) as 1 | 2 | 3 | 4 | 5] : "";
  return (
    <fieldset className="form-control w-full" aria-describedby={`${id}-desc`}>
      <label htmlFor={id} className="mb-1 font-medium text-primary">
        {CIA_DIMENSION_LABEL[dimension]} <span className="text-accent" aria-hidden>*</span>
      </label>
      <select id={id} className="select w-full" disabled={disabled} aria-invalid={error ? true : undefined} {...form.register(name)}>
        <option value="">Seleccionar 1–5…</option>
        {[1, 2, 3, 4, 5].map((n) => (
          <option key={n} value={String(n)}>
            {n}
          </option>
        ))}
      </select>
      <span id={`${id}-desc`} className="mt-1 text-xs text-primary/80">
        {description || "Elige un nivel para ver su significado."}
      </span>
      <FieldError message={error} />
    </fieldset>
  );
}

function CriticalityPanel({
  result,
  thresholds,
}: {
  result: ReturnType<typeof evaluateCia>;
  thresholds: CiaThresholds;
}) {
  if (!result.complete) {
    return (
      <div className="rounded-box border border-dashed border-primary/40 bg-base-200 p-4" aria-live="polite">
        <p className="font-semibold text-primary">Criticidad: sin calcular</p>
        <p className="text-sm">Completa las tres dimensiones CIA para calcular la criticidad.</p>
      </div>
    );
  }
  const dims = result.dimensionsAtMax.map((d) => CIA_DIMENSION_LABEL[d]).join(", ");
  return (
    <div className={`rounded-box p-4 ${result.level === "Alta" ? "bg-accent text-accent-content" : "bg-base-200 text-primary"}`} aria-live="polite">
      <p className="text-sm font-semibold">Criticidad calculada</p>
      <p className="text-2xl font-extrabold">{result.level}</p>
      <p className="mt-1 text-sm">
        Máximo CIA = {result.max} ({dims}). Criterio: Alta ≥ {thresholds.criticalFrom}; Media ≥ {thresholds.mediumFrom}; Baja &lt; {thresholds.mediumFrom}.
      </p>
      <p className="mt-2 text-sm">
        La criticidad mide el impacto del activo; no es un riesgo evaluado ni refleja la probabilidad de una amenaza.
        {result.level === "Alta" && " Los activos de criticidad alta requieren revisión prioritaria."}
      </p>
    </div>
  );
}

function toNum(v: string): number | null {
  return v === "" ? null : Number(v);
}

function toRegistryInput(v: AssetFormValues): AssetRegistryInput {
  const cia = (s: string) => (s === "" ? null : Number(s));
  const nz = (s: string) => (s.trim() === "" ? null : s.trim());
  return {
    code: nz(v.code),
    name: nz(v.name),
    category: nz(v.categoryCode),
    assetType: nz(v.assetTypeCode),
    description: nz(v.description),
    macroprocess: nz(v.macroprocess),
    process: nz(v.process),
    owner: nz(v.ownerName),
    responsibleArea: nz(v.responsibleArea),
    classification: nz(v.classificationCode),
    lifecycle: nz(v.lifecycleCode),
    reviewDate: nz(v.reviewDate),
    confidentiality: cia(v.confidentiality),
    integrity: cia(v.integrity),
    availability: cia(v.availability),
    criticalityJustification: nz(v.criticalityJustification),
    evidenceReference: nz(v.evidenceReference),
    evidenceStatus: nz(v.evidenceStatusCode),
    source: nz(v.sourceReference),
    isDraft: false,
    validatedAt: null,
  };
}
