-- =============================================================================
-- Migración 3: catálogos por defecto, criterios iniciales, referencias normativas
-- y almacenamiento privado de evidencias.
-- Los valores provienen de la hoja "Catálogos" y "Criterios CIA" del Excel de referencia.
-- No se incluyen datos específicos de AGETIC: esos datos solo se cargan mediante la
-- importación demostrativa explícita (ver DEPLOYMENT.md / EXCEL_MAPPING.md).
-- =============================================================================

create or replace function public.seed_default_catalogs(p_org uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.catalog_options (organization_id, catalog_type, code, label, sort_order) values
    -- Categoría de activo (8 categorías originales)
    (p_org, 'categoria', 'informacion_datos', 'Información y datos', 1),
    (p_org, 'categoria', 'hardware', 'Hardware', 2),
    (p_org, 'categoria', 'software_aplicaciones', 'Software y aplicaciones', 3),
    (p_org, 'categoria', 'infraestructura_redes', 'Infraestructura y redes', 4),
    (p_org, 'categoria', 'personas_conocimiento', 'Personas y conocimiento', 5),
    (p_org, 'categoria', 'instalaciones_fisicas', 'Instalaciones físicas', 6),
    (p_org, 'categoria', 'servicios_terceros', 'Servicios y terceros', 7),
    (p_org, 'categoria', 'identidades_accesos', 'Identidades y accesos', 8),
    -- Tipo de activo
    (p_org, 'tipo_activo', 'primario', 'Primario', 1),
    (p_org, 'tipo_activo', 'soporte', 'Soporte', 2),
    (p_org, 'tipo_activo', 'servicio', 'Servicio', 3),
    (p_org, 'tipo_activo', 'tercero', 'Tercero', 4),
    (p_org, 'tipo_activo', 'componente', 'Componente', 5),
    -- Clasificación de información
    (p_org, 'clasificacion', 'publica', 'Pública', 1),
    (p_org, 'clasificacion', 'interna', 'Interna', 2),
    (p_org, 'clasificacion', 'confidencial', 'Confidencial', 3),
    (p_org, 'clasificacion', 'restringida', 'Restringida', 4),
    (p_org, 'clasificacion', 'no_aplica', 'No aplica', 5),
    -- Estado de evidencia
    (p_org, 'estado_evidencia', 'verificada', 'Verificada', 1),
    (p_org, 'estado_evidencia', 'parcial', 'Parcial', 2),
    (p_org, 'estado_evidencia', 'pendiente', 'Pendiente', 3),
    (p_org, 'estado_evidencia', 'no_disponible', 'No disponible', 4),
    -- Ciclo de vida
    (p_org, 'ciclo_vida', 'planificado', 'Planificado', 1),
    (p_org, 'ciclo_vida', 'activo', 'Activo', 2),
    (p_org, 'ciclo_vida', 'mantenimiento', 'Mantenimiento', 3),
    (p_org, 'ciclo_vida', 'retirado', 'Retirado', 4),
    -- Tratamiento de riesgo
    (p_org, 'tratamiento', 'mitigar', 'Mitigar', 1),
    (p_org, 'tratamiento', 'aceptar', 'Aceptar', 2),
    (p_org, 'tratamiento', 'transferir', 'Transferir', 3),
    (p_org, 'tratamiento', 'evitar', 'Evitar', 4),
    (p_org, 'tratamiento', 'pendiente', 'Pendiente', 5),
    -- Estado de implementación del control ("Verificado" se deriva, no es un estado manual)
    (p_org, 'estado_implementacion', 'propuesto', 'Propuesto', 1),
    (p_org, 'estado_implementacion', 'planificado', 'Planificado', 2),
    (p_org, 'estado_implementacion', 'implementado', 'Implementado', 3),
    (p_org, 'estado_implementacion', 'en_verificacion', 'En verificación', 4),
    (p_org, 'estado_implementacion', 'no_implementado', 'No implementado', 5),
    -- Tipo de control (lista hoy fija en el Excel; ahora configurable)
    (p_org, 'tipo_control', 'preventivo', 'Preventivo', 1),
    (p_org, 'tipo_control', 'detectivo', 'Detectivo', 2),
    (p_org, 'tipo_control', 'correctivo', 'Correctivo', 3),
    (p_org, 'tipo_control', 'compensatorio', 'Compensatorio', 4),
    -- Estado de seguimiento
    (p_org, 'estado_seguimiento', 'pendiente', 'Pendiente', 1),
    (p_org, 'estado_seguimiento', 'en_curso', 'En curso', 2),
    (p_org, 'estado_seguimiento', 'completada', 'Completada', 3),
    (p_org, 'estado_seguimiento', 'vencida', 'Vencida', 4),
    -- Tipo de actividad (unión de la validación del Excel y de los valores usados en sus datos)
    (p_org, 'tipo_actividad', 'validacion', 'Validación', 1),
    (p_org, 'tipo_actividad', 'modificacion', 'Modificación', 2),
    (p_org, 'tipo_actividad', 'baja', 'Baja', 3),
    (p_org, 'tipo_actividad', 'revision', 'Revisión', 4),
    (p_org, 'tipo_actividad', 'asignacion_responsable', 'Asignación de responsable', 5),
    (p_org, 'tipo_actividad', 'verificacion_evidencia', 'Verificación de evidencia', 6),
    (p_org, 'tipo_actividad', 'reevaluacion_riesgo', 'Reevaluación de riesgo', 7),
    (p_org, 'tipo_actividad', 'documentacion', 'Documentación', 8),
    (p_org, 'tipo_actividad', 'entrevista', 'Entrevista', 9),
    (p_org, 'tipo_actividad', 'identificacion', 'Identificación', 10),
    (p_org, 'tipo_actividad', 'control', 'Control', 11),
    (p_org, 'tipo_actividad', 'terceros', 'Terceros', 12),
    (p_org, 'tipo_actividad', 'inventario', 'Inventario', 13),
    (p_org, 'tipo_actividad', 'visita', 'Visita', 14),
    (p_org, 'tipo_actividad', 'roles', 'Roles', 15),
    (p_org, 'tipo_actividad', 'metodologia', 'Metodología', 16),
    -- Fuente de evidencia
    (p_org, 'fuente_evidencia', 'documento', 'Documento', 1),
    (p_org, 'fuente_evidencia', 'politica', 'Política', 2),
    (p_org, 'fuente_evidencia', 'manual', 'Manual', 3),
    (p_org, 'fuente_evidencia', 'inventario_tecnico', 'Inventario técnico', 4),
    (p_org, 'fuente_evidencia', 'entrevista', 'Entrevista', 5),
    (p_org, 'fuente_evidencia', 'observacion', 'Observación', 6),
    (p_org, 'fuente_evidencia', 'otro', 'Otro', 7),
    -- Estado de validación
    (p_org, 'estado_validacion', 'pendiente', 'Pendiente', 1),
    (p_org, 'estado_validacion', 'validado', 'Validado', 2),
    (p_org, 'estado_validacion', 'requiere_correccion', 'Requiere corrección', 3),
    -- Prioridad
    (p_org, 'prioridad', 'alta', 'Alta', 1),
    (p_org, 'prioridad', 'media', 'Media', 2),
    (p_org, 'prioridad', 'baja', 'Baja', 3)
  on conflict (organization_id, catalog_type, code) do nothing;
end;
$$;

-- Criterios iniciales. Son los valores PROPUESTOS del Excel y no están aprobados.
-- Se crean como versión 1 "vigente" para que la aplicación funcione; el administrador
-- debe revisarlos y registrar la aprobación en Configuración.
create or replace function public.seed_organization_defaults()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.seed_default_catalogs(new.id);

  insert into public.criteria_versions (
    organization_id, version_number, label, critical_from, medium_from,
    risk_high_from, risk_medium_from, review_months, status, created_by
  ) values (
    new.id, 1, 'Versión inicial propuesta (pendiente de aprobación)', 4, 3, 15, 6, 3, 'vigente', new.created_by
  );

  insert into public.reference_sources (organization_id, code, title, issuer, reference_text, url, verification_scope) values
    (new.id, 'ISO27001', 'ISO/IEC 27001:2022', 'ISO/IEC', 'Anexo A.5.9 y A.5.12 (inventario y clasificación de información)',
      'https://www.iso.org/standard/27001', 'Referencia normativa. Registrar un control no implica cumplimiento.'),
    (new.id, 'ISO27005', 'ISO/IEC 27005:2022', 'ISO/IEC', 'Gestión de riesgos de seguridad de la información',
      'https://www.iso.org/standard/80585.html', 'Referencia metodológica para evaluación y tratamiento de riesgos.'),
    (new.id, 'NIST_CSF2', 'NIST CSF 2.0', 'NIST', 'ID.AM (gestión de activos), ID.RA (evaluación de riesgos), GV',
      'https://doi.org/10.6028/NIST.CSWP.29', 'Marco de referencia; no constituye certificación.');

  return new;
end;
$$;

create trigger organizations_seed_defaults after insert on public.organizations
  for each row execute function public.seed_organization_defaults();

-- -----------------------------------------------------------------------------
-- Almacenamiento privado de evidencias.
-- Convención de ruta: {organization_id}/{evidence_id}/{nombre_saneado}
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'evidencias',
  'evidencias',
  false,
  10485760,
  array[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/csv'
  ]
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy evidencias_read on storage.objects for select to authenticated
  using (
    bucket_id = 'evidencias'
    and exists (
      select 1 from public.organization_members m
      where m.user_id = (select auth.uid())
        and m.organization_id::text = (storage.foldername(name))[1]
    )
  );

create policy evidencias_write on storage.objects for insert to authenticated
  with check (
    bucket_id = 'evidencias'
    and exists (
      select 1 from public.organization_members m
      where m.user_id = (select auth.uid())
        and m.role in ('admin', 'editor')
        and m.organization_id::text = (storage.foldername(name))[1]
    )
  );

create policy evidencias_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'evidencias'
    and exists (
      select 1 from public.organization_members m
      where m.user_id = (select auth.uid())
        and m.role = 'admin'
        and m.organization_id::text = (storage.foldername(name))[1]
    )
  );

-- -----------------------------------------------------------------------------
-- Publicación atómica de una nueva versión de criterios.
-- La versión vigente anterior pasa a 'historico' y se conserva para trazabilidad.
-- Solo administradores (verificado dentro de la función).
-- -----------------------------------------------------------------------------
create or replace function public.publish_criteria_version(
  p_org uuid,
  p_label text,
  p_critical_from integer,
  p_medium_from integer,
  p_risk_high_from integer,
  p_risk_medium_from integer,
  p_review_months integer,
  p_approve boolean
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_next integer;
  v_id uuid;
begin
  if not public.is_org_admin(p_org) then
    raise exception 'Solo un administrador puede publicar criterios' using errcode = '42501';
  end if;

  select coalesce(max(version_number), 0) + 1 into v_next
  from public.criteria_versions where organization_id = p_org;

  update public.criteria_versions
     set status = 'historico'
   where organization_id = p_org and status = 'vigente';

  insert into public.criteria_versions (
    organization_id, version_number, label, critical_from, medium_from,
    risk_high_from, risk_medium_from, review_months, status,
    approved_by, approved_at, created_by
  ) values (
    p_org, v_next, p_label, p_critical_from, p_medium_from,
    p_risk_high_from, p_risk_medium_from, p_review_months, 'vigente',
    case when p_approve then (select auth.uid()) end,
    case when p_approve then now() end,
    (select auth.uid())
  ) returning id into v_id;

  update public.organizations
     set criteria_approved = p_approve,
         criteria_version_label = p_label
   where id = p_org;

  return v_id;
end;
$$;

revoke execute on function public.publish_criteria_version(uuid, text, integer, integer, integer, integer, integer, boolean) from public, anon;
grant execute on function public.publish_criteria_version(uuid, text, integer, integer, integer, integer, integer, boolean) to authenticated;
