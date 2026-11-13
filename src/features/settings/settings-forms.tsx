"use client";

import { useActionState } from "react";
import { LoaderCircle, Save } from "lucide-react";
import { publishCriteriaAction, saveOrganizationAction, type SettingsResult } from "./actions";

const SECTORS = [
  ["publico", "Sector público"],
  ["privado", "Sector privado"],
  ["academico", "Académico"],
  ["salud", "Salud"],
  ["otro", "Otro"],
] as const;

const TIME_ZONES = ["America/La_Paz", "America/Lima", "America/Bogota", "America/Mexico_City", "America/Santiago", "UTC"];

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <span className="mt-1 text-xs font-medium text-error-content">{message}</span>;
}

function Feedback({ result }: { result: SettingsResult | null }) {
  if (!result) return null;
  return (
    <div role={result.ok ? "status" : "alert"} className={`alert text-sm ${result.ok ? "" : "alert-error"}`}>
      {result.message}
    </div>
  );
}

export function OrganizationForm({
  initial,
  readOnly,
}: {
  initial: {
    name: string;
    shortName: string;
    sector: string;
    description: string;
    inventoryScope: string;
    methodologicalOwner: string;
    startDate: string;
    regulatoryReferences: string;
    timeZone: string;
  };
  readOnly: boolean;
}) {
  const [result, action, pending] = useActionState(saveOrganizationAction, null);
  const e = result?.errors ?? {};
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <fieldset disabled={readOnly || pending} className="flex flex-col gap-4">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="form-control">
            <span className="mb-1 font-medium text-primary">Nombre de la entidad <span className="text-accent">*</span></span>
            <input name="name" required defaultValue={initial.name} className="input w-full" />
            <FieldError message={e.name} />
          </label>
          <label className="form-control">
            <span className="mb-1 font-medium text-primary">Sigla</span>
            <input name="shortName" defaultValue={initial.shortName} className="input w-full" />
            <FieldError message={e.shortName} />
          </label>
          <label className="form-control">
            <span className="mb-1 font-medium text-primary">Sector</span>
            <select name="sector" defaultValue={initial.sector} className="select w-full">
              {SECTORS.map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </label>
          <label className="form-control">
            <span className="mb-1 font-medium text-primary">Zona horaria</span>
            <select name="timeZone" defaultValue={initial.timeZone} className="select w-full">
              {TIME_ZONES.map((z) => (
                <option key={z} value={z}>{z}</option>
              ))}
            </select>
            <span className="mt-1 text-xs text-primary/70">Define cuándo se considera vencida una actividad.</span>
          </label>
          <label className="form-control">
            <span className="mb-1 font-medium text-primary">Responsable metodológico</span>
            <input name="methodologicalOwner" defaultValue={initial.methodologicalOwner} className="input w-full" />
          </label>
          <label className="form-control">
            <span className="mb-1 font-medium text-primary">Fecha de inicio del inventario</span>
            <input type="date" name="startDate" defaultValue={initial.startDate} className="input w-full" />
            <FieldError message={e.startDate} />
          </label>
        </div>
        <label className="form-control">
          <span className="mb-1 font-medium text-primary">Descripción</span>
          <textarea name="description" rows={2} defaultValue={initial.description} className="textarea w-full" />
        </label>
        <label className="form-control">
          <span className="mb-1 font-medium text-primary">Alcance del inventario</span>
          <textarea name="inventoryScope" rows={2} defaultValue={initial.inventoryScope} className="textarea w-full" />
        </label>
        <label className="form-control">
          <span className="mb-1 font-medium text-primary">Normativa de referencia</span>
          <textarea name="regulatoryReferences" rows={2} defaultValue={initial.regulatoryReferences} className="textarea w-full" />
          <span className="mt-1 text-xs text-primary/70">Referencias de apoyo. Registrarlas no implica cumplimiento normativo.</span>
        </label>
      </fieldset>
      <Feedback result={result} />
      {!readOnly && (
        <div className="flex justify-end">
          <button type="submit" className="btn btn-accent font-bold" disabled={pending}>
            {pending ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Save className="size-4" aria-hidden />}
            Guardar datos
          </button>
        </div>
      )}
    </form>
  );
}

export function CriteriaForm({
  initial,
  readOnly,
}: {
  initial: {
    label: string;
    criticalFrom: number;
    mediumFrom: number;
    riskHighFrom: number;
    riskMediumFrom: number;
    reviewMonths: number;
  };
  readOnly: boolean;
}) {
  const [result, action, pending] = useActionState(publishCriteriaAction, null);
  const e = result?.errors ?? {};
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <fieldset disabled={readOnly || pending} className="flex flex-col gap-4">
        <label className="form-control">
          <span className="mb-1 font-medium text-primary">Descripción de la versión <span className="text-accent">*</span></span>
          <input name="label" required defaultValue={initial.label} className="input w-full" placeholder="Ej. Criterios 2026-1 aprobados por Dirección" />
          <FieldError message={e.label} />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField name="criticalFrom" label="CIA: criticidad Alta desde (máx. CIA)" min={1} max={5} defaultValue={initial.criticalFrom} error={e.criticalFrom} hint="Valor entre 1 y 5." />
          <NumberField name="mediumFrom" label="CIA: criticidad Media desde" min={1} max={5} defaultValue={initial.mediumFrom} error={e.mediumFrom} hint="Debe ser menor que el umbral Alto." />
          <NumberField name="riskHighFrom" label="Riesgo: nivel Alto desde (P × I)" min={2} max={25} defaultValue={initial.riskHighFrom} error={e.riskHighFrom} hint="Valor entre 2 y 25." />
          <NumberField name="riskMediumFrom" label="Riesgo: nivel Medio desde (P × I)" min={1} max={25} defaultValue={initial.riskMediumFrom} error={e.riskMediumFrom} hint="Debe ser menor que el umbral Alto." />
          <NumberField name="reviewMonths" label="Revisión cada (meses)" min={1} max={36} defaultValue={initial.reviewMonths} error={e.reviewMonths} hint="Meses calendario; respeta el cierre de mes." />
        </div>
        <label className="label cursor-pointer justify-start gap-3">
          <input type="checkbox" name="approve" className="checkbox" />
          <span className="text-sm">
            Marcar como aprobados formalmente (confirma que la dirección aprobó estos criterios)
          </span>
        </label>
      </fieldset>
      <Feedback result={result} />
      {!readOnly && (
        <div className="flex justify-end">
          <button type="submit" className="btn btn-accent font-bold" disabled={pending}>
            {pending ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Save className="size-4" aria-hidden />}
            Publicar nueva versión
          </button>
        </div>
      )}
    </form>
  );
}

function NumberField({
  name,
  label,
  min,
  max,
  defaultValue,
  error,
  hint,
}: {
  name: string;
  label: string;
  min: number;
  max: number;
  defaultValue: number;
  error?: string;
  hint: string;
}) {
  return (
    <label className="form-control">
      <span className="mb-1 font-medium text-primary">{label}</span>
      <input type="number" name={name} min={min} max={max} step={1} defaultValue={defaultValue} className="input w-full" required />
      <span className="mt-1 text-xs text-primary/70">{hint}</span>
      <FieldError message={error} />
    </label>
  );
}
