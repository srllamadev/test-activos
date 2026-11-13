-- =============================================================================
-- Migración 2: seguridad (RLS), auditoría y validación de catálogos
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Funciones de autorización. SECURITY DEFINER evita recursión de RLS sobre
-- organization_members. search_path vacío y referencias calificadas.
-- -----------------------------------------------------------------------------
create or replace function public.org_role(org uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select m.role
  from public.organization_members m
  where m.organization_id = org
    and m.user_id = (select auth.uid())
  limit 1;
$$;

create or replace function public.is_org_member(org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.org_role(org) is not null;
$$;

create or replace function public.can_edit(org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.org_role(org) in ('admin', 'editor'), false);
$$;

create or replace function public.is_org_admin(org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.org_role(org) = 'admin', false);
$$;

revoke execute on function public.org_role(uuid) from public, anon;
revoke execute on function public.is_org_member(uuid) from public, anon;
revoke execute on function public.can_edit(uuid) from public, anon;
revoke execute on function public.is_org_admin(uuid) from public, anon;
grant execute on function public.org_role(uuid) to authenticated;
grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.can_edit(uuid) to authenticated;
grant execute on function public.is_org_admin(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- Activación de RLS en todas las tablas institucionales
-- -----------------------------------------------------------------------------
alter table public.organizations          enable row level security;
alter table public.profiles               enable row level security;
alter table public.organization_members   enable row level security;
alter table public.catalog_options        enable row level security;
alter table public.criteria_versions      enable row level security;
alter table public.assets                 enable row level security;
alter table public.asset_dependencies     enable row level security;
alter table public.risks                  enable row level security;
alter table public.risk_assessments       enable row level security;
alter table public.controls               enable row level security;
alter table public.control_verifications  enable row level security;
alter table public.follow_up_activities   enable row level security;
alter table public.reference_sources      enable row level security;
alter table public.evidences              enable row level security;
alter table public.evidence_links         enable row level security;
alter table public.audit_logs             enable row level security;

-- Organizaciones: lectura para miembros, actualización solo administradores.
-- No hay INSERT/DELETE para clientes: las organizaciones se crean con el script de
-- arranque (service role, solo servidor).
create policy organizations_select on public.organizations for select to authenticated
  using (public.is_org_member(id));
create policy organizations_update on public.organizations for update to authenticated
  using (public.is_org_admin(id)) with check (public.is_org_admin(id));

-- Perfiles: cada usuario ve y edita su perfil; compañeros de organización pueden verse.
create policy profiles_select on public.profiles for select to authenticated
  using (
    id = (select auth.uid())
    or exists (
      select 1
      from public.organization_members a
      join public.organization_members b on b.organization_id = a.organization_id
      where a.user_id = (select auth.uid()) and b.user_id = profiles.id
    )
  );
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Miembros: visibles para la organización; gestión solo por administradores.
create policy members_select on public.organization_members for select to authenticated
  using (public.is_org_member(organization_id));
create policy members_insert on public.organization_members for insert to authenticated
  with check (public.is_org_admin(organization_id));
create policy members_update on public.organization_members for update to authenticated
  using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));
create policy members_delete on public.organization_members for delete to authenticated
  using (public.is_org_admin(organization_id));

-- Catálogos: lectura para miembros; administradores gestionan opciones (nunca se borran:
-- se desactivan con active = false para preservar integridad histórica).
create policy catalogs_select on public.catalog_options for select to authenticated
  using (public.is_org_member(organization_id));
create policy catalogs_insert on public.catalog_options for insert to authenticated
  with check (public.is_org_admin(organization_id));
create policy catalogs_update on public.catalog_options for update to authenticated
  using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));

-- Criterios: lectura para miembros; cambios solo administradores.
create policy criteria_select on public.criteria_versions for select to authenticated
  using (public.is_org_member(organization_id));
create policy criteria_insert on public.criteria_versions for insert to authenticated
  with check (public.is_org_admin(organization_id));
create policy criteria_update on public.criteria_versions for update to authenticated
  using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));

-- Tablas operativas: patrón común.
--  SELECT: miembros.  INSERT/UPDATE: administrador o editor.  DELETE: sin política
--  (los registros se archivan con archived_at; las tablas de vínculos sí admiten borrado
--  por administrador).
do $$
declare
  t text;
begin
  foreach t in array array[
    'assets', 'risks', 'controls', 'follow_up_activities', 'reference_sources', 'evidences',
    'risk_assessments', 'control_verifications', 'asset_dependencies', 'evidence_links'
  ] loop
    execute format('create policy %I on public.%I for select to authenticated using (public.is_org_member(organization_id))',
      t || '_select', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.can_edit(organization_id))',
      t || '_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using (public.can_edit(organization_id)) with check (public.can_edit(organization_id))',
      t || '_update', t);
  end loop;
end
$$;

-- Borrado físico: vínculos (editores/administradores) y referencias/evidencias (solo administradores).
create policy asset_dependencies_delete on public.asset_dependencies for delete to authenticated
  using (public.can_edit(organization_id));
create policy evidence_links_delete on public.evidence_links for delete to authenticated
  using (public.can_edit(organization_id));
create policy reference_sources_delete on public.reference_sources for delete to authenticated
  using (public.is_org_admin(organization_id));
create policy evidences_delete on public.evidences for delete to authenticated
  using (public.is_org_admin(organization_id));

-- Auditoría: solo lectura para administradores. Escritura exclusiva por triggers.
create policy audit_logs_select on public.audit_logs for select to authenticated
  using (public.is_org_admin(organization_id));

-- -----------------------------------------------------------------------------
-- Auditoría automática
-- -----------------------------------------------------------------------------
create or replace function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_id uuid;
begin
  if tg_op = 'DELETE' then
    v_org := old.organization_id;
    v_id := case when to_jsonb(old) ? 'id' then (to_jsonb(old)->>'id')::uuid else null end;
  else
    v_org := new.organization_id;
    v_id := case when to_jsonb(new) ? 'id' then (to_jsonb(new)->>'id')::uuid else null end;
  end if;

  insert into public.audit_logs (organization_id, actor_id, table_name, record_id, action, old_data, new_data)
  values (
    v_org,
    (select auth.uid()),
    tg_table_name,
    v_id,
    tg_op,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );

  return coalesce(new, old);
end;
$$;

create or replace function public.audit_organization_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.audit_logs (organization_id, actor_id, table_name, record_id, action, old_data, new_data)
  values (
    coalesce(new.id, old.id),
    (select auth.uid()),
    tg_table_name,
    coalesce(new.id, old.id),
    tg_op,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$$;

create trigger audit_organizations after insert or update on public.organizations
  for each row execute function public.audit_organization_change();
create trigger audit_criteria after insert or update on public.criteria_versions
  for each row execute function public.audit_row_change();
create trigger audit_members after insert or update or delete on public.organization_members
  for each row execute function public.audit_row_change();
create trigger audit_catalogs after insert or update on public.catalog_options
  for each row execute function public.audit_row_change();
create trigger audit_assets after insert or update on public.assets
  for each row execute function public.audit_row_change();
create trigger audit_asset_dependencies after insert or delete on public.asset_dependencies
  for each row execute function public.audit_row_change();
create trigger audit_risks after insert or update on public.risks
  for each row execute function public.audit_row_change();
create trigger audit_risk_assessments after insert on public.risk_assessments
  for each row execute function public.audit_row_change();
create trigger audit_controls after insert or update on public.controls
  for each row execute function public.audit_row_change();
create trigger audit_control_verifications after insert on public.control_verifications
  for each row execute function public.audit_row_change();
create trigger audit_follow_ups after insert or update on public.follow_up_activities
  for each row execute function public.audit_row_change();
create trigger audit_evidences after insert or update on public.evidences
  for each row execute function public.audit_row_change();
create trigger audit_evidence_links after insert or delete on public.evidence_links
  for each row execute function public.audit_row_change();

-- -----------------------------------------------------------------------------
-- Validación de referencias a catálogos: el código debe existir y estar activo
-- en la misma organización. Se usa un trigger por columna.
-- -----------------------------------------------------------------------------
create or replace function public.check_catalog_reference()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_column text := tg_argv[0];
  v_type text := tg_argv[1];
  v_value text;
begin
  v_value := to_jsonb(new)->>v_column;
  if v_value is null then
    return new;
  end if;
  if not exists (
    select 1 from public.catalog_options c
    where c.organization_id = new.organization_id
      and c.catalog_type = v_type
      and c.code = v_value
      and c.active
  ) then
    raise exception 'Valor "%" no válido para el catálogo % (organización %)', v_value, v_type, new.organization_id
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger assets_check_category before insert or update of category_code on public.assets
  for each row execute function public.check_catalog_reference('category_code', 'categoria');
create trigger assets_check_type before insert or update of asset_type_code on public.assets
  for each row execute function public.check_catalog_reference('asset_type_code', 'tipo_activo');
create trigger assets_check_classification before insert or update of classification_code on public.assets
  for each row execute function public.check_catalog_reference('classification_code', 'clasificacion');
create trigger assets_check_lifecycle before insert or update of lifecycle_code on public.assets
  for each row execute function public.check_catalog_reference('lifecycle_code', 'ciclo_vida');
create trigger assets_check_evidence before insert or update of evidence_status_code on public.assets
  for each row execute function public.check_catalog_reference('evidence_status_code', 'estado_evidencia');

create trigger risks_check_treatment before insert or update of treatment_code on public.risks
  for each row execute function public.check_catalog_reference('treatment_code', 'tratamiento');
create trigger risks_check_evidence before insert or update of evidence_status_code on public.risks
  for each row execute function public.check_catalog_reference('evidence_status_code', 'estado_evidencia');

create trigger controls_check_type before insert or update of control_type_code on public.controls
  for each row execute function public.check_catalog_reference('control_type_code', 'tipo_control');
create trigger controls_check_status before insert or update of implementation_status_code on public.controls
  for each row execute function public.check_catalog_reference('implementation_status_code', 'estado_implementacion');

create trigger follow_ups_check_type before insert or update of activity_type_code on public.follow_up_activities
  for each row execute function public.check_catalog_reference('activity_type_code', 'tipo_actividad');

create trigger evidences_check_type before insert or update of evidence_type_code on public.evidences
  for each row execute function public.check_catalog_reference('evidence_type_code', 'fuente_evidencia');

-- -----------------------------------------------------------------------------
-- Vínculos de evidencias: la entidad referenciada debe pertenecer a la misma organización.
-- -----------------------------------------------------------------------------
create or replace function public.check_evidence_link_target()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_exists boolean;
begin
  case new.entity_type
    when 'asset' then
      select exists(select 1 from public.assets a where a.id = new.entity_id and a.organization_id = new.organization_id) into v_exists;
    when 'risk' then
      select exists(select 1 from public.risks a where a.id = new.entity_id and a.organization_id = new.organization_id) into v_exists;
    when 'control' then
      select exists(select 1 from public.controls a where a.id = new.entity_id and a.organization_id = new.organization_id) into v_exists;
    when 'follow_up' then
      select exists(select 1 from public.follow_up_activities a where a.id = new.entity_id and a.organization_id = new.organization_id) into v_exists;
    else
      v_exists := false;
  end case;
  if not coalesce(v_exists, false) then
    raise exception 'La entidad % no existe en la organización indicada', new.entity_id using errcode = '23503';
  end if;
  return new;
end;
$$;

create trigger evidence_links_check_target before insert on public.evidence_links
  for each row execute function public.check_evidence_link_target();

-- -----------------------------------------------------------------------------
-- Consistencia de verificación de controles:
-- "Verificado" exige responsable de verificación, fecha, resultado y evidencia.
-- -----------------------------------------------------------------------------
alter table public.controls add constraint controls_verified_requires_evidence check (
  effectiveness_verified <> 'Sí'
  or (verification_date is not null
      and verification_result is not null
      and char_length(trim(verification_result)) >= 5
      and verified_by is not null
      and verified_at is not null
      and evidence_text is not null
      and char_length(trim(evidence_text)) > 0)
);

-- Un activo validado debe conservar validador y fecha (validación formal con trazabilidad).
alter table public.assets add constraint assets_validated_traceable check (
  validated_at is null or (validated_by is not null and is_draft = false)
);
