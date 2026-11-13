"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, ChevronLeft, ChevronRight, LoaderCircle, Save } from "lucide-react";
import {
  RISK_FORM_DEFAULTS,
  RISK_STEP_FIELDS,
  riskFormSchema,
  firstStepWithError,
  type RiskFormValues,
} from "@/lib/validations/risk";
import { evaluateInherentRisk, evaluateResidualRisk } from "@/lib/calculations/risk";
import { saveRiskAction } from "./actions";
import type { CatalogOption } from "@/features/assets/data";
import { Badge } from "@/components/ui/badge";

const STEPS = [
  { title: "Identificación", hint: "Datos básicos" },
  { title: "Escenario", hint: "Amenaza y vulnerabilidad" },
  { title: "Evaluación Inherente", hint: "Probabilidad e impacto" },
  { title: "Evaluación Residual", hint: "Después de controles" },
  { title: "Tratamiento", hint: "Cómo mitigar" },
  { title: "Evidencia", hint: "Sustento documental" },
];

export interface RiskFormProps {
  riskId?: string;
  initialValues: RiskFormValues;
  assets: Array<{ id: string; code: string; name: string | null }>;
  catalogs: {
    tratamiento: CatalogOption[];
    estado_evidencia: CatalogOption[];
  };
  thresholds: {
    highFrom: number;
    mediumFrom: number;
  };
  canEdit: boolean;
}

type SaveIntent = "draft" | "save";

export function RiskForm(props: RiskFormProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const riskIdRef = useRef<string | undefined>(props.riskId);
  const [banner, setBanner] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const intentRef = useRef<SaveIntent>("draft");

  const form = useForm<RiskFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(riskFormSchema) as unknown as any,
    defaultValues: props.initialValues,
    mode: "onTouched",
  });

  const values = form.watch();
  
  // Calcular riesgo inherente en vivo
  const inherentRisk = evaluateInherentRisk(
    values.probabilityInherent ? parseInt(values.probabilityInherent) : null,
    values.impactInherent ? parseInt(values.impactInherent) : null,
    props.thresholds
  );
  
  // Calcular riesgo residual en vivo
  const residualRisk = evaluateResidualRisk(
    values.probabilityResidual ? parseInt(values.probabilityResidual) : null,
    values.impactResidual ? parseInt(values.impactResidual) : null,
    props.thresholds
  );

  async function persist(intent: SaveIntent, values: RiskFormValues) {
    return saveRiskAction({ id: riskIdRef.current, intent, values });
  }

  function applyFieldErrors(errors: Record<string, string>) {
    for (const [key, message] of Object.entries(errors)) {
      if (message) form.setError(key as keyof RiskFormValues, { type: "server", message });
    }
    setStep(firstStepWithError(errors));
  }

  const onSubmit = (data: RiskFormValues) => {
    const intent = intentRef.current;
    setBanner(null);
    startTransition(async () => {
      const result = await persist(intent, data);
      if (!result.ok) {
        setBanner({ kind: "error", text: result.message });
        if (result.fieldErrors) applyFieldErrors(result.fieldErrors);
        return;
      }
      riskIdRef.current = result.id;
      if (intent === "save") {
        router.push(`/riesgos/${result.id}?guardado=1`);
        router.refresh();
        return;
      }
      setBanner({ kind: "ok", text: result.message });
      if (!props.riskId) {
        window.history.replaceState(window.history.state, "", `/riesgos/${result.id}/editar`);
      }
    });
  };

  async function goNext() {
    const fields = RISK_STEP_FIELDS[step];
    const ok = await form.trigger(fields as Array<keyof RiskFormValues>);
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
          {banner.text}
        </div>
      )}

      {/* Paso 1: Identificación */}
      <section hidden={step !== 0} aria-labelledby="s1" className="card bg-base-100 shadow-sm">
        <div className="card-body gap-4">
          <h2 id="s1" className="card-title text-primary">1. Identificación</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <TextField form={form} name="code" label="Código de riesgo" required disabled={disabled} placeholder="R-AG-001" />
            <AssetSelect form={form} name="assetId" label="Activo asociado" required disabled={disabled} assets={props.assets} />
          </div>
        </div>
      </section>

      {/* Paso 2: Escenario */}
      <section hidden={step !== 1} aria-labelledby="s2" className="card bg-base-100 shadow-sm">
        <div className="card-body gap-4">
          <h2 id="s2" className="card-title text-primary">2. Escenario de Riesgo</h2>
          <div className="grid gap-4">
            <TextField form={form} name="threatSource" label="Amenaza o fuente" required disabled={disabled} multiline hint="¿Qué podría causar el incidente?" />
            <TextField form={form} name="vulnerability" label="Vulnerabilidad" required disabled={disabled} multiline hint="¿Qué debilidad podría ser explotada?" />
            <TextField form={form} name="scenarioConsequence" label="Escenario y consecuencia" required disabled={disabled} multiline hint="¿Qué pasaría si se materializa el riesgo?" />
            <TextField form={form} name="affectedProcess" label="Proceso afectado" required disabled={disabled} />
          </div>
        </div>
      </section>

      {/* Paso 3: Evaluación Inherente */}
      <section hidden={step !== 2} aria-labelledby="s3" className="card bg-base-100 shadow-sm">
        <div className="card-body gap-4">
          <h2 id="s3" className="card-title text-primary">3. Evaluación de Riesgo Inherente</h2>
          <p className="text-sm text-primary/80">
            Evalúa el riesgo antes de aplicar controles de seguridad.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <NumberSelect form={form} name="probabilityInherent" label="Probabilidad (1-5)" required disabled={disabled} />
            <NumberSelect form={form} name="impactInherent" label="Impacto (1-5)" required disabled={disabled} />
          </div>
          <RiskScoreDisplay
            score={inherentRisk.score}
            level={inherentRisk.level}
            label="Riesgo Inherente"
          />
          <TextField form={form} name="existingControls" label="Controles existentes" disabled={disabled} multiline hint="Describe los controles actualmente implementados (si los hay)" />
        </div>
      </section>

      {/* Paso 4: Evaluación Residual */}
      <section hidden={step !== 3} aria-labelledby="s4" className="card bg-base-100 shadow-sm">
        <div className="card-body gap-4">
          <h2 id="s4" className="card-title text-primary">4. Evaluación de Riesgo Residual</h2>
          <p className="text-sm text-primary/80">
            Evalúa el riesgo después de aplicar los controles. Puedes dejar esto en blanco inicialmente y completarlo después.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <NumberSelect form={form} name="probabilityResidual" label="Probabilidad Residual (1-5)" disabled={disabled} />
            <NumberSelect form={form} name="impactResidual" label="Impacto Residual (1-5)" disabled={disabled} />
          </div>
          <RiskScoreDisplay
            score={residualRisk.score}
            level={residualRisk.level}
            label="Riesgo Residual"
          />
        </div>
      </section>

      {/* Paso 5: Tratamiento */}
      <section hidden={step !== 4} aria-labelledby="s5" className="card bg-base-100 shadow-sm">
        <div className="card-body gap-4">
          <h2 id="s5" className="card-title text-primary">5. Tratamiento del Riesgo</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <SelectField form={form} name="treatmentCode" label="Tratamiento" required disabled={disabled} options={props.catalogs.tratamiento} />
            <TextField form={form} name="riskOwner" label="Dueño del riesgo" required disabled={disabled} hint="Persona responsable de gestionar este riesgo" />
            <DateField form={form} name="assessmentDate" label="Fecha de evaluación" required disabled={disabled} />
          </div>
        </div>
      </section>

      {/* Paso 6: Evidencia */}
      <section hidden={step !== 5} aria-labelledby="s6" className="card bg-base-100 shadow-sm">
        <div className="card-body gap-4">
          <h2 id="s6" className="card-title text-primary">6. Evidencia y Documentación</h2>
          <div className="grid gap-4">
            <SelectField form={form} name="evidenceStatusCode" label="Estado de evidencia" required disabled={disabled} options={props.catalogs.estado_evidencia} />
            <TextField form={form} name="evidenceBasis" label="Evidencia o fundamento" required disabled={disabled} multiline hint="Documenta la base de tu evaluación" />
            <TextField form={form} name="observations" label="Observaciones" disabled={disabled} multiline />
          </div>
        </div>
      </section>

      {/* Barra de acciones */}
      <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center justify-between gap-3 border-t border-primary/15 bg-base-100/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="text-xs text-primary/80">
          {/* Aquí puedes agregar indicador de autoguardado si lo implementas */}
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

// Componentes de formulario reutilizables

type FormApi = ReturnType<typeof useForm<RiskFormValues>>;

function getErrorMessage(error: unknown): string | null {
  if (!error) return null;
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") return error.message;
  return null;
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
}: {
  form: FormApi;
  name: keyof RiskFormValues;
  label: string;
  required?: boolean;
  disabled?: boolean;
  hint?: string;
  multiline?: boolean;
  placeholder?: string;
}) {
  const id = `f-${name}`;
  const error = form.formState.errors[name]?.message;
  const common = {
    id,
    disabled,
    placeholder,
    "aria-invalid": error ? true : undefined,
    ...form.register(name),
  };
  return (
    <div className="form-control w-full">
      <label htmlFor={id} className="mb-1 font-medium text-primary">
        {label}
        {required ? <span className="text-accent" aria-hidden> *</span> : <span className="ml-1 text-xs font-normal text-primary/60">(opcional)</span>}
      </label>
      {multiline ? (
        <textarea rows={3} className="textarea w-full" {...common} />
      ) : (
        <input type="text" className="input w-full" {...common} />
      )}
      {hint && !error && <span className="mt-1 text-xs text-primary/70">{hint}</span>}
      {getErrorMessage(error) && <span className="mt-1 text-xs font-medium text-error-content">{getErrorMessage(error)}</span>}
    </div>
  );
}

function AssetSelect({
  form,
  name,
  label,
  required,
  disabled,
  assets,
}: {
  form: FormApi;
  name: keyof RiskFormValues;
  label: string;
  required?: boolean;
  disabled?: boolean;
  assets: Array<{ id: string; code: string; name: string | null }>;
}) {
  const id = `f-${name}`;
  const error = form.formState.errors[name]?.message;
  return (
    <div className="form-control w-full">
      <label htmlFor={id} className="mb-1 font-medium text-primary">
        {label}
        {required && <span className="text-accent" aria-hidden> *</span>}
      </label>
      <select id={id} className="select w-full" disabled={disabled} {...form.register(name)}>
        <option value="">Seleccionar activo...</option>
        {assets.map((a) => (
          <option key={a.id} value={a.id}>
            {a.code} - {a.name || "Sin nombre"}
          </option>
        ))}
      </select>
      {getErrorMessage(error) && <span className="mt-1 text-xs font-medium text-error-content">{getErrorMessage(error)}</span>}
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
  name: keyof RiskFormValues;
  label: string;
  required?: boolean;
  disabled?: boolean;
  options: CatalogOption[];
}) {
  const id = `f-${name}`;
  const error = form.formState.errors[name]?.message;
  return (
    <div className="form-control w-full">
      <label htmlFor={id} className="mb-1 font-medium text-primary">
        {label}
        {required && <span className="text-accent" aria-hidden> *</span>}
      </label>
      <select id={id} className="select w-full" disabled={disabled} {...form.register(name)}>
        <option value="">Seleccionar...</option>
        {options.filter(o => o.active).map((o) => (
          <option key={o.code} value={o.code}>
            {o.label}
          </option>
        ))}
      </select>
      {getErrorMessage(error) && <span className="mt-1 text-xs font-medium text-error-content">{getErrorMessage(error)}</span>}
    </div>
  );
}

function NumberSelect({
  form,
  name,
  label,
  required,
  disabled,
}: {
  form: FormApi;
  name: keyof RiskFormValues;
  label: string;
  required?: boolean;
  disabled?: boolean;
}) {
  const id = `f-${name}`;
  const error = form.formState.errors[name]?.message;
  return (
    <div className="form-control w-full">
      <label htmlFor={id} className="mb-1 font-medium text-primary">
        {label}
        {required && <span className="text-accent" aria-hidden> *</span>}
      </label>
      <select id={id} className="select w-full" disabled={disabled} {...form.register(name)}>
        <option value="">Seleccionar 1-5...</option>
        {[1, 2, 3, 4, 5].map((n) => (
          <option key={n} value={String(n)}>
            {n}
          </option>
        ))}
      </select>
      {getErrorMessage(error) && <span className="mt-1 text-xs font-medium text-error-content">{getErrorMessage(error)}</span>}
    </div>
  );
}

function DateField({
  form,
  name,
  label,
  required,
  disabled,
}: {
  form: FormApi;
  name: keyof RiskFormValues;
  label: string;
  required?: boolean;
  disabled?: boolean;
}) {
  const id = `f-${name}`;
  const error = form.formState.errors[name]?.message;
  return (
    <div className="form-control w-full">
      <label htmlFor={id} className="mb-1 font-medium text-primary">
        {label}
        {required && <span className="text-accent" aria-hidden> *</span>}
      </label>
      <input id={id} type="date" className="input w-full" disabled={disabled} {...form.register(name)} />
      {getErrorMessage(error) && <span className="mt-1 text-xs font-medium text-error-content">{getErrorMessage(error)}</span>}
    </div>
  );
}

function RiskScoreDisplay({
  score,
  level,
  label,
}: {
  score: number | null;
  level: "Alto" | "Medio" | "Bajo" | null;
  label: string;
}) {
  return (
    <div className={`rounded-box p-4 ${level === "Alto" ? "bg-accent text-accent-content" : "bg-base-200 text-primary"}`} aria-live="polite">
      <p className="text-sm font-semibold">{label}</p>
      {score !== null ? (
        <>
          <p className="text-2xl font-extrabold">{score}</p>
          <p className="mt-1 text-sm">
            Nivel: <Badge tone={level === "Alto" ? "accent" : level === "Medio" ? "primary" : "neutral"}>{level}</Badge>
          </p>
        </>
      ) : (
        <p className="text-sm">Completa probabilidad e impacto para calcular</p>
      )}
    </div>
  );
}
