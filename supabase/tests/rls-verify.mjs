/**
 * Verificación de la base de datos: aplica las migraciones sobre PostgreSQL (PGlite, en memoria),
 * simula roles de Supabase (authenticated, auth.uid()) y comprueba RLS, auditoría,
 * validación de catálogos, restricciones y acceso a Storage.
 * Ejecutar: npm run test:db
 */
import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const dir = fileURLToPath(new URL("../migrations/", import.meta.url));
const db = new PGlite();

const stub = `
create schema auth;
create table auth.users (id uuid primary key default gen_random_uuid(), email text);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
create schema storage;
create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language sql immutable as $$
  select (string_to_array(name, '/'))[1:array_length(string_to_array(name,'/'),1)-1]
$$;
create role anon nologin;
create role authenticated nologin;
grant usage on schema public, auth, storage to authenticated, anon;
`;

async function run(sql, label) {
  try {
    await db.exec(sql);
    console.log("OK  ", label);
  } catch (e) {
    console.log("FAIL", label, "->", String(e.message).slice(0,400), "pos", e.position);
    process.exitCode = 1;
    throw e;
  }
}

await run(stub, "stub supabase");
for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
  await run(fs.readFileSync(path.join(dir, f), "utf8"), f);
}

// Grant privileges as Supabase does by default
await db.exec(`grant all on all tables in schema public to authenticated;
grant all on all sequences in schema public to authenticated;
grant execute on all functions in schema public to authenticated;
grant select, insert, update, delete on storage.objects to authenticated;`);

// Users and org
const u = {
  admin: "00000000-0000-0000-0000-00000000000a",
  editor: "00000000-0000-0000-0000-00000000000b",
  viewer: "00000000-0000-0000-0000-00000000000c",
  outsider: "00000000-0000-0000-0000-00000000000d",
  otherAdmin: "00000000-0000-0000-0000-00000000000e",
};
await db.exec(`insert into auth.users (id,email) values
 ('${u.admin}','a@x'),('${u.editor}','e@x'),('${u.viewer}','v@x'),('${u.outsider}','o@x'),('${u.otherAdmin}','b@x');`);
await db.exec(`insert into public.organizations (id,name,created_by) values
  ('11111111-1111-1111-1111-111111111111','Org A','${u.admin}'),
  ('22222222-2222-2222-2222-222222222222','Org B','${u.otherAdmin}');`);
await db.exec(`insert into public.organization_members (organization_id,user_id,role) values
  ('11111111-1111-1111-1111-111111111111','${u.admin}','admin'),
  ('11111111-1111-1111-1111-111111111111','${u.editor}','editor'),
  ('11111111-1111-1111-1111-111111111111','${u.viewer}','viewer'),
  ('22222222-2222-2222-2222-222222222222','${u.otherAdmin}','admin');`);

const ORG_A = "11111111-1111-1111-1111-111111111111";
const ORG_B = "22222222-2222-2222-2222-222222222222";

async function as(userId, fn) {
  // Simulate PostgREST: role authenticated + jwt claim
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${userId ?? ""}', false);`);
  try {
    return await fn();
  } finally {
    await db.exec(`reset role; select set_config('request.jwt.claim.sub','', false);`);
  }
}

let passed = 0, failed = 0;
function check(name, cond, detail = "") {
  if (cond) { passed++; console.log("PASS", name); }
  else { failed++; console.log("FAIL", name, detail); }
}
async function expectError(name, fn) {
  try { await fn(); check(name, false, "no error raised"); }
  catch (e) { check(name, true, e.message); }
}

// Seed defaults check (trigger)
const cats = await db.query(`select count(*)::int c from public.catalog_options where organization_id='${ORG_A}'`);
check("catálogos por defecto creados", cats.rows[0].c > 60, `count=${cats.rows[0].c}`);
const crit = await db.query(`select critical_from,medium_from,risk_high_from,risk_medium_from,review_months from public.criteria_versions where organization_id='${ORG_A}' and status='vigente'`);
check("criterios iniciales 4/3/15/6/3", crit.rows[0] && crit.rows[0].critical_from === 4 && crit.rows[0].review_months === 3, JSON.stringify(crit.rows));

// Admin inserts an asset
await as(u.admin, async () => {
  const r = await db.query(`insert into public.assets (organization_id, code, name, category_code, is_draft, confidentiality, integrity, availability)
    values ('${ORG_A}','AG-001','Plataforma','software_aplicaciones', false, 5,5,5) returning id`);
  globalThis.assetId = r.rows[0].id;
});
check("admin inserta activo", !!globalThis.assetId);

// Editor can insert; viewer cannot
await as(u.editor, async () => {
  await db.query(`insert into public.assets (organization_id, code, name, is_draft) values ('${ORG_A}','AG-002','Otro',true)`);
});
check("editor inserta activo", true);

await expectError("viewer no puede insertar activo", () => as(u.viewer, () =>
  db.query(`insert into public.assets (organization_id, code, name, is_draft) values ('${ORG_A}','AG-099','X',true)`)));

// Outsider and other org admin see nothing from Org A
const outsiderRows = await as(u.outsider, () => db.query(`select count(*)::int c from public.assets`));
check("usuario sin membresía no ve activos", outsiderRows.rows[0].c === 0, JSON.stringify(outsiderRows.rows));
const crossRows = await as(u.otherAdmin, () => db.query(`select count(*)::int c from public.assets where organization_id='${ORG_A}'`));
check("admin de Org B no ve activos de Org A", crossRows.rows[0].c === 0);
await expectError("admin de Org B no puede insertar en Org A", () => as(u.otherAdmin, () =>
  db.query(`insert into public.assets (organization_id, code, name, is_draft) values ('${ORG_A}','AG-777','Intruso',true)`)));

// Viewer reads
const viewerRows = await as(u.viewer, () => db.query(`select count(*)::int c from public.assets`));
check("viewer lee activos de su organización", viewerRows.rows[0].c === 2, JSON.stringify(viewerRows.rows));

// Deletion is not allowed for assets (no policy => 0 rows affected)
const del = await as(u.admin, () => db.query(`delete from public.assets where code='AG-002' returning id`));
check("no se pueden borrar activos (solo archivar)", del.rows.length === 0);

// Archive works
await as(u.editor, () => db.query(`update public.assets set archived_at=now() where code='AG-002'`));
check("archivar activo permitido", true);

// Catalog validation trigger
await expectError("valor de catálogo inexistente es rechazado", () => as(u.admin, () =>
  db.query(`insert into public.assets (organization_id, code, name, category_code, is_draft) values ('${ORG_A}','AG-050','X','no_existe',true)`)));

// Cross-org dependency rejected by composite FK
await expectError("dependencia a activo de otra organización es rechazada", async () => {
  await as(u.admin, async () => {
    const other = await db.query(`insert into public.assets (organization_id, code, name, is_draft) values ('${ORG_B}','B-1','Ajeno',true) returning id`);
    await db.query(`insert into public.asset_dependencies (organization_id, asset_id, depends_on_asset_id) values ('${ORG_A}','${globalThis.assetId}','${other.rows[0].id}')`);
  });
});

// Risk and residual constraints
await as(u.editor, async () => {
  await db.query(`insert into public.risks (organization_id, code, asset_id, probability_inherent, impact_inherent, is_draft)
    values ('${ORG_A}','R-AG-001','${globalThis.assetId}',4,5,false)`);
});
await expectError("riesgo con probabilidad 6 rechazado", () => as(u.editor, () =>
  db.query(`insert into public.risks (organization_id, code, asset_id, probability_inherent, impact_inherent, is_draft)
    values ('${ORG_A}','R-AG-002','${globalThis.assetId}',6,5,false)`)));

// Control: verified requires evidence
const riskId = (await db.query(`select id from public.risks where code='R-AG-001'`)).rows[0].id;
await expectError("control 'Sí' verificado sin evidencia rechazado", () => as(u.editor, () =>
  db.query(`insert into public.controls (organization_id, code, risk_id, control_name, effectiveness_verified)
    values ('${ORG_A}','C-1','${riskId}','Control MFA','Sí')`)));
await as(u.editor, () => db.query(`insert into public.controls (organization_id, code, risk_id, control_name)
    values ('${ORG_A}','C-2','${riskId}','Control MFA')`));
check("control propuesto (no verificado) permitido", true);

// Audit log captured inserts; viewer cannot read audit
const auditAdmin = await as(u.admin, () => db.query(`select count(*)::int c from public.audit_logs where organization_id='${ORG_A}'`));
check("auditoría registra cambios", auditAdmin.rows[0].c > 0, JSON.stringify(auditAdmin.rows));
const auditViewer = await as(u.viewer, () => db.query(`select count(*)::int c from public.audit_logs`));
check("viewer no lee auditoría", auditViewer.rows[0].c === 0);

// Members: editor cannot add members
await expectError("editor no puede añadir miembros", () => as(u.editor, () =>
  db.query(`insert into public.organization_members (organization_id,user_id,role) values ('${ORG_A}','${u.outsider}','viewer')`)));

// Editor cannot update criteria
const crit2 = await as(u.editor, () => db.query(`update public.criteria_versions set critical_from=5 where organization_id='${ORG_A}' returning id`));
check("editor no modifica criterios", crit2.rows.length === 0);

// Criteria constraint
await expectError("criterios con medio >= crítico rechazados", () => as(u.admin, () =>
  db.query(`insert into public.criteria_versions (organization_id,version_number,label,critical_from,medium_from,risk_high_from,risk_medium_from,review_months,status)
  values ('${ORG_A}',9,'x',3,3,15,6,3,'borrador')`)));

// Storage policy: member can read own folder path only
await db.exec(`insert into storage.buckets (id,name,public) values ('evidencias','evidencias',false) on conflict do nothing;`);
await db.exec(`insert into storage.objects (bucket_id,name) values ('evidencias','${ORG_A}/ev1/doc.pdf'),('evidencias','${ORG_B}/ev2/doc.pdf')`);
const objA = await as(u.viewer, () => db.query(`select count(*)::int c from storage.objects`));
check("storage: miembro ve solo objetos de su organización", objA.rows[0].c === 1, JSON.stringify(objA.rows));
const objOut = await as(u.outsider, () => db.query(`select count(*)::int c from storage.objects`));
check("storage: externo no ve objetos", objOut.rows[0].c === 0);

// Seguimiento: completada requiere fecha realizada
await expectError("seguimiento Completada sin fecha realizada rechazado", () => as(u.editor, () =>
  db.query(`insert into public.follow_up_activities (organization_id, code, description, status) values ('${ORG_A}','S-1','Revisar','Completada')`)));

console.log(`\n${passed} passed, ${failed} failed`);

// Criteria publication (atomic, admin only)
await expectError("editor no puede publicar criterios", () => as(u.editor, () =>
  db.query(`select public.publish_criteria_version('${ORG_A}','x',4,3,15,6,3,true)`)));
await as(u.admin, () => db.query(`select public.publish_criteria_version('${ORG_A}','Nueva',5,3,15,6,3,true)`));
const vers = await db.query(`select version_number, status from public.criteria_versions where organization_id='${ORG_A}' order by version_number`);
check("publicar criterios deja una sola vigente y conserva histórico", JSON.stringify(vers.rows) === JSON.stringify([{version_number:1,status:'historico'},{version_number:2,status:'vigente'}]), JSON.stringify(vers.rows));
await as(u.editor, async () => {
  const a = await db.query(`select id from public.assets where code='AG-001'`);
  const b = await db.query(`select id from public.assets where code='AG-002'`);
  await db.query(`insert into public.asset_dependencies (organization_id, asset_id, depends_on_asset_id) values ('${ORG_A}','${a.rows[0].id}','${b.rows[0].id}')`);
  const d = await db.query(`delete from public.asset_dependencies where asset_id='${a.rows[0].id}' returning 1`);
  check("editor puede reemplazar dependencias", d.rows.length === 1);
});
process.exit(failed ? 1 : 0);
