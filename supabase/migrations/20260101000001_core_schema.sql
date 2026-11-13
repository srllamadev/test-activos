-- =============================================================================
-- Sistema de Gestión de Activos de Información y Riesgos
-- Migración 1: esquema principal (tablas, restricciones, índices, updated_at)
-- Ver DATABASE.md para la descripción completa.
-- =============================================================================

-- gen_random_uuid() es nativo en PostgreSQL 13+ (no requiere extensión).

-- -----------------------------------------------------------------------------
-- Utilidad: marca de tiempo de actualización
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Organizaciones (entidades) y perfiles
-- -----------------------------------------------------------------------------
create table public.organizations (
  id                       uuid primary key default gen_random_uuid(),
  name                     text not null check (char_length(trim(name)) between 2 and 200),
  short_name               text check (short_name is null or char_length(short_name) <= 30),
  sector                   text not null default 'publico'
                             check (sector in ('publico', 'privado', 'academico', 'salud', 'otro')),
  description              text,
  inventory_scope          text,
  methodological_owner     text,
  start_date               date,
  review_frequency_months  smallint not null default 3 check (review_frequency_months between 1 and 36),
  criteria_version_label   text not null default '1.0',
  criteria_approved        boolean not null default false,
  regulatory_references    text,
  time_zone                text not null default 'America/La_Paz',
  logo_path                text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  created_by               uuid
);
create trigger organizations_updated_at before update on public.organizations
  for each row execute function public.set_updated_at();

create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text,
  email       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create table public.organization_members (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id         uuid not null references auth.users (id) on delete cascade,
  role            text not null check (role in ('admin', 'editor', 'viewer')),
  created_at      timestamptz not null default now(),
  created_by      uuid,
  primary key (organization_id, user_id)
);
create index organization_members_user_idx on public.organization_members (user_id);

-- -----------------------------------------------------------------------------
-- Catálogos configurables (códigos estables + etiquetas editables)
-- -----------------------------------------------------------------------------
create table public.catalog_options (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  catalog_type    text not null check (catalog_type in (
                    'categoria', 'tipo_activo', 'clasificacion', 'estado_evidencia',
                    'ciclo_vida', 'tratamiento', 'estado_implementacion', 'tipo_control',
                    'estado_seguimiento', 'tipo_actividad', 'fuente_evidencia',
                    'estado_validacion', 'prioridad')),
  code            text not null check (code ~ '^[a-z0-9_]+$' and char_length(code) <= 60),
  label           text not null check (char_length(trim(label)) between 1 and 150),
  sort_order      integer not null default 0,
  active          boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (organization_id, catalog_type, code)
);
create trigger catalog_options_updated_at before update on public.catalog_options
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Parámetros de criterios (versionados). Solo una versión 'vigente' por organización.
-- Excel: 'Criterios CIA'!B13:B17 y B15 (revisión en meses).
-- -----------------------------------------------------------------------------
create table public.criteria_versions (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations (id) on delete cascade,
  version_number    integer not null check (version_number >= 1),
  label             text not null,
  critical_from     smallint not null check (critical_from between 1 and 5),
  medium_from       smallint not null check (medium_from between 1 and 5),
  risk_high_from    smallint not null check (risk_high_from between 2 and 25),
  risk_medium_from  smallint not null check (risk_medium_from between 1 and 25),
  review_months     smallint not null check (review_months between 1 and 36),
  status            text not null check (status in ('borrador', 'vigente', 'historico')),
  approved_by       uuid,
  approved_at       timestamptz,
  created_at        timestamptz not null default now(),
  created_by        uuid,
  constraint criteria_medium_below_critical check (medium_from < critical_from),
  constraint criteria_risk_medium_below_high check (risk_medium_from < risk_high_from),
  unique (organization_id, version_number)
);
create unique index criteria_one_vigente_idx on public.criteria_versions (organization_id)
  where status = 'vigente';

-- -----------------------------------------------------------------------------
-- Activos de información (Inventario, 31 campos del Excel)
-- Campos calculados (criticidad, estado del registro, próxima revisión) se derivan
-- en la capa de reglas de negocio (src/lib/calculations), nunca se almacenan.
-- -----------------------------------------------------------------------------
create table public.assets (
  id                        uuid primary key default gen_random_uuid(),
  organization_id           uuid not null references public.organizations (id) on delete cascade,
  code                      text not null check (char_length(trim(code)) between 1 and 40),
  name                      text check (name is null or char_length(name) <= 200),
  category_code             text,
  asset_type_code           text,
  description               text,
  macroprocess              text,
  process                   text,
  subprocess                text,
  responsible_area          text,
  owner_name                text,
  custodian_name            text,
  administrator_name        text,
  authorized_users          text,
  location                  text,
  supplier                  text,
  confidentiality           smallint check (confidentiality is null or confidentiality between 1 and 5),
  integrity                 smallint check (integrity is null or integrity between 1 and 5),
  availability              smallint check (availability is null or availability between 1 and 5),
  criticality_justification text,
  evidence_reference        text,
  evidence_status_code      text,
  source_reference          text,
  review_date               date,
  classification_code       text,
  lifecycle_code            text,
  regulatory_reference      text,
  observations              text,
  is_draft                  boolean not null default true,
  validated_at              timestamptz,
  validated_by              uuid,
  archived_at               timestamptz,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  created_by                uuid,
  updated_by                uuid,
  unique (organization_id, id),
  unique (organization_id, code)
);
create trigger assets_updated_at before update on public.assets
  for each row execute function public.set_updated_at();
create index assets_org_active_idx on public.assets (organization_id) where archived_at is null;
create index assets_org_category_idx on public.assets (organization_id, category_code);
create index assets_org_owner_idx on public.assets (organization_id, owner_name);
create index assets_org_area_idx on public.assets (organization_id, responsible_area);
create index assets_org_review_idx on public.assets (organization_id, review_date);

-- Dependencias entre activos (Excel: "Dependencias (ID)" separadas por "; ")
create table public.asset_dependencies (
  organization_id       uuid not null,
  asset_id              uuid not null,
  depends_on_asset_id   uuid not null,
  notes                 text,
  created_at            timestamptz not null default now(),
  primary key (asset_id, depends_on_asset_id),
  constraint dependencies_not_self check (asset_id <> depends_on_asset_id),
  constraint dependencies_asset_fk foreign key (organization_id, asset_id)
    references public.assets (organization_id, id) on delete cascade,
  constraint dependencies_target_fk foreign key (organization_id, depends_on_asset_id)
    references public.assets (organization_id, id) on delete cascade
);
create index asset_dependencies_target_idx on public.asset_dependencies (depends_on_asset_id);

-- -----------------------------------------------------------------------------
-- Riesgos (hoja Riesgos, 22 campos)
-- -----------------------------------------------------------------------------
create table public.risks (
  id                       uuid primary key default gen_random_uuid(),
  organization_id          uuid not null references public.organizations (id) on delete cascade,
  code                     text not null check (char_length(trim(code)) between 1 and 40),
  asset_id                 uuid not null,
  threat_source            text,
  vulnerability            text,
  scenario_consequence     text,
  affected_process         text,
  probability_inherent     smallint check (probability_inherent is null or probability_inherent between 1 and 5),
  impact_inherent          smallint check (impact_inherent is null or impact_inherent between 1 and 5),
  existing_controls        text,
  probability_residual     smallint check (probability_residual is null or probability_residual between 1 and 5),
  impact_residual          smallint check (impact_residual is null or impact_residual between 1 and 5),
  residual_assessed_at     timestamptz,
  residual_assessed_by     uuid,
  treatment_code           text,
  risk_owner               text,
  assessment_date          date,
  evidence_status_code     text,
  evidence_basis           text,
  observations             text,
  is_draft                 boolean not null default true,
  archived_at              timestamptz,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  created_by               uuid,
  updated_by               uuid,
  unique (organization_id, id),
  unique (organization_id, code),
  constraint risks_asset_fk foreign key (organization_id, asset_id)
    references public.assets (organization_id, id)
);
create trigger risks_updated_at before update on public.risks
  for each row execute function public.set_updated_at();
create index risks_org_asset_idx on public.risks (organization_id, asset_id);
create index risks_org_treatment_idx on public.risks (organization_id, treatment_code);

-- Historial de evaluaciones (inherente y residual). Cada evaluación es un registro nuevo.
create table public.risk_assessments (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  risk_id          uuid not null,
  kind             text not null check (kind in ('inherente', 'residual')),
  probability      smallint not null check (probability between 1 and 5),
  impact           smallint not null check (impact between 1 and 5),
  assessed_on      date not null,
  justification    text,
  assessed_by      uuid,
  created_at       timestamptz not null default now(),
  constraint risk_assessments_risk_fk foreign key (organization_id, risk_id)
    references public.risks (organization_id, id) on delete cascade
);
create index risk_assessments_risk_idx on public.risk_assessments (risk_id, created_at desc);

-- -----------------------------------------------------------------------------
-- Controles de seguridad (hoja Controles, 16 campos)
-- -----------------------------------------------------------------------------
create table public.controls (
  id                         uuid primary key default gen_random_uuid(),
  organization_id            uuid not null references public.organizations (id) on delete cascade,
  code                       text not null check (char_length(trim(code)) between 1 and 40),
  risk_id                    uuid not null,
  control_name               text not null check (char_length(trim(control_name)) between 1 and 500),
  control_type_code          text,
  control_reference          text,
  responsible                text,
  implementation_status_code text,
  implementation_date        date,
  evidence_text              text,
  verification_date          date,
  effectiveness_verified     text not null default 'No' check (effectiveness_verified in ('Sí', 'No', 'Pendiente')),
  verification_result        text,
  verified_by                uuid,
  verified_at                timestamptz,
  next_review_date           date,
  observations               text,
  archived_at                timestamptz,
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now(),
  created_by                 uuid,
  updated_by                 uuid,
  unique (organization_id, id),
  unique (organization_id, code),
  constraint controls_risk_fk foreign key (organization_id, risk_id)
    references public.risks (organization_id, id)
);
create trigger controls_updated_at before update on public.controls
  for each row execute function public.set_updated_at();
create index controls_org_risk_idx on public.controls (organization_id, risk_id);

-- Historial de verificaciones de controles
create table public.control_verifications (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  control_id       uuid not null,
  verified_on      date not null,
  effective        boolean not null,
  result           text not null check (char_length(trim(result)) >= 5),
  evidence_text    text,
  verified_by      uuid,
  created_at       timestamptz not null default now(),
  constraint control_verifications_control_fk foreign key (organization_id, control_id)
    references public.controls (organization_id, id) on delete cascade
);
create index control_verifications_control_idx on public.control_verifications (control_id, created_at desc);

-- -----------------------------------------------------------------------------
-- Seguimiento (hoja Seguimiento, 13 campos)
-- -----------------------------------------------------------------------------
create table public.follow_up_activities (
  id                   uuid primary key default gen_random_uuid(),
  organization_id      uuid not null references public.organizations (id) on delete cascade,
  code                 text not null check (char_length(trim(code)) between 1 and 40),
  asset_id             uuid,
  risk_id              uuid,
  activity_type_code   text,
  description          text not null check (char_length(trim(description)) between 1 and 1000),
  responsible          text,
  scheduled_date       date,
  completed_date       date,
  status               text not null default 'Pendiente'
                         check (status in ('Pendiente', 'En curso', 'Completada', 'Vencida')),
  evidence_link        text,
  result_agreement     text,
  next_step            text,
  archived_at          timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  created_by           uuid,
  updated_by           uuid,
  unique (organization_id, id),
  unique (organization_id, code),
  constraint follow_up_asset_fk foreign key (organization_id, asset_id)
    references public.assets (organization_id, id),
  constraint follow_up_risk_fk foreign key (organization_id, risk_id)
    references public.risks (organization_id, id),
  constraint follow_up_completed_consistency check (
    status <> 'Completada' or completed_date is not null)
);
create trigger follow_up_updated_at before update on public.follow_up_activities
  for each row execute function public.set_updated_at();
create index follow_up_org_sched_idx on public.follow_up_activities (organization_id, scheduled_date);

-- -----------------------------------------------------------------------------
-- Fuentes de referencia, evidencias y vínculos
-- -----------------------------------------------------------------------------
create table public.reference_sources (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  code             text not null,
  title            text not null,
  issuer           text,
  reference_text   text,
  url              text,
  consulted_on     date,
  verification_scope text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (organization_id, code)
);
create trigger reference_sources_updated_at before update on public.reference_sources
  for each row execute function public.set_updated_at();

create table public.evidences (
  id                 uuid primary key default gen_random_uuid(),
  organization_id    uuid not null references public.organizations (id) on delete cascade,
  title              text not null check (char_length(trim(title)) between 1 and 300),
  evidence_type_code text,
  issuer             text,
  url                text check (url is null or url ~* '^https?://'),
  storage_path       text,
  file_name          text,
  file_size_bytes    integer check (file_size_bytes is null or file_size_bytes >= 0),
  mime_type          text,
  consulted_on       date,
  verification_scope text,
  description        text,
  archived_at        timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  created_by         uuid,
  unique (organization_id, id),
  constraint evidences_has_source check (url is not null or storage_path is not null)
);
create trigger evidences_updated_at before update on public.evidences
  for each row execute function public.set_updated_at();

create table public.evidence_links (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  evidence_id      uuid not null,
  entity_type      text not null check (entity_type in ('asset', 'risk', 'control', 'follow_up')),
  entity_id        uuid not null,
  created_at       timestamptz not null default now(),
  created_by       uuid,
  constraint evidence_links_evidence_fk foreign key (organization_id, evidence_id)
    references public.evidences (organization_id, id) on delete cascade,
  unique (evidence_id, entity_type, entity_id)
);
create index evidence_links_entity_idx on public.evidence_links (entity_type, entity_id);

-- -----------------------------------------------------------------------------
-- Auditoría (solo escritura desde triggers SECURITY DEFINER)
-- -----------------------------------------------------------------------------
create table public.audit_logs (
  id               bigint generated always as identity primary key,
  organization_id  uuid,
  actor_id         uuid,
  table_name       text not null,
  record_id        uuid,
  action           text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  old_data         jsonb,
  new_data         jsonb,
  created_at       timestamptz not null default now()
);
create index audit_logs_org_created_idx on public.audit_logs (organization_id, created_at desc);
create index audit_logs_record_idx on public.audit_logs (table_name, record_id);
