/**
 * Business Data Seed
 * Sample records for each business entity for E2E testing
 *
 * Generated: 2026-08-17T16:41:43.598Z
 */

import { Kysely, sql } from 'kysely';
import { v4 as uuidv4 } from 'uuid';

const SAMPLE_COUNT = 4;

/**
 * Primary keys are generated up front for every table so foreign key columns
 * can point at rows that actually exist, in either direction, regardless of the
 * order the tables are seeded in. Without this the sample data has no usable
 * relationships and nothing that traverses them (lookups, cascade rules,
 * cross-entity workflows) can be exercised on a freshly generated app.
 */
const ids: Record<string, string[]> = {
  'bus_user': Array.from({ length: SAMPLE_COUNT }, () => uuidv4()),
  'bus_team': Array.from({ length: SAMPLE_COUNT }, () => uuidv4()),
  'bus_territory': Array.from({ length: SAMPLE_COUNT }, () => uuidv4()),
  'bus_account': Array.from({ length: SAMPLE_COUNT }, () => uuidv4()),
  'bus_contact': Array.from({ length: SAMPLE_COUNT }, () => uuidv4()),
  'bus_lead': Array.from({ length: SAMPLE_COUNT }, () => uuidv4()),
  'bus_campaign': Array.from({ length: SAMPLE_COUNT }, () => uuidv4()),
  'bus_campaign_member': Array.from({ length: SAMPLE_COUNT }, () => uuidv4()),
  'bus_opportunity': Array.from({ length: SAMPLE_COUNT }, () => uuidv4()),
  'bus_opportunity_line_item': Array.from({ length: SAMPLE_COUNT }, () => uuidv4()),
  'bus_product': Array.from({ length: SAMPLE_COUNT }, () => uuidv4()),
  'bus_quote': Array.from({ length: SAMPLE_COUNT }, () => uuidv4()),
  'bus_quote_line_item': Array.from({ length: SAMPLE_COUNT }, () => uuidv4()),
  'bus_contract': Array.from({ length: SAMPLE_COUNT }, () => uuidv4()),
  'bus_support_case': Array.from({ length: SAMPLE_COUNT }, () => uuidv4()),
  'bus_sla_policy': Array.from({ length: SAMPLE_COUNT }, () => uuidv4()),
  'bus_activity': Array.from({ length: SAMPLE_COUNT }, () => uuidv4()),
};

/**
 * FK columns naming a person by the role they played rather than by entity.
 * The _by / _by_id suffixes are handled by rule in fk(); this map covers the
 * role names that carry no suffix at all. Kept in sync with
 * `foreignKeys.personRoleColumns` in language/erdwithai-language.json.
 */
const FK_COLUMN_TABLE_MAP: Record<string, string> = {
  pi_id: 'bus_user',
  lab_manager_id: 'bus_user',
  assigned_to: 'bus_user',
  owner_id: 'bus_user',
  author_id: 'bus_user',
  manager_id: 'bus_user',
  user_id: 'bus_user',
  created_by_user: 'bus_user',
  remediation_owner: 'bus_user',
  remediation_owner_id: 'bus_user',
};

/**
 * Resolve a foreign key column to a real parent row id.
 * Handles: explicit alias map, _by / _by_id suffix (→ bus_user), standard
 * <entity>_id. Returns null when unresolvable so the field is left empty rather
 * than filled with a UUID that points at nothing.
 */
function fk(column: string, index: number): string | null {
  if (FK_COLUMN_TABLE_MAP[column]) {
    const pool = ids[FK_COLUMN_TABLE_MAP[column]];
    if (pool && pool.length > 0) return pool[index % pool.length];
  }
  // Both spellings: _by_id is what the EML fixer produces, _by is what an
  // unfixed model still carries.
  if (column.endsWith('_by_id') || column.endsWith('_by')) {
    const pool = ids['bus_user'];
    if (pool && pool.length > 0) return pool[index % pool.length];
  }
  const parent = `bus_${column.replace(/_id$/, '')}`;
  const pool = ids[parent];
  return pool && pool.length > 0 ? pool[index % pool.length] : null;
}

export async function seed(db: Kysely<any>): Promise<void> {
  const now = new Date();

  // Constraint checking is disabled so tables can be truncated and repopulated
  // in any order; the rows themselves are referentially consistent.
  await sql`SET session_replication_role = replica`.execute(db);

  // User (bus_user)
  await db.deleteFrom('bus_user').execute();

  const userRecords = [
    {
      id: ids['bus_user'][0],
        email: 'test0@example.com',
        
        
        
        
        
        
        
        
        
        
        first_name: 'James',
        
        
        
        
        
        
        
        
        
        
        last_name: 'Smith',
        
        
        
        
        
        
        
        
        
        
        role: 'Role 1',
        
        
        
        
        
        
        
        
        
        
        job_title: 'Job Title 1',
        
        
        
        
        
        
        
        
        
        
        phone: '555-1000',
        
        
        
        
        
        
        
        
        
        
        team_id: fk('team_id', 0),
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        quota_annual: 0.50,
        
        
        
        
        
        
        
        
        
        
        
        
        
        is_active: true,
        
        
        
        
        
        
        
        
        
        last_login: new Date(Date.now() + 0 * 3600000),
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: ids['bus_user'][1],
        email: 'test1@example.com',
        
        
        
        
        
        
        
        
        
        
        first_name: 'Mary',
        
        
        
        
        
        
        
        
        
        
        last_name: 'Johnson',
        
        
        
        
        
        
        
        
        
        
        role: 'Role 2',
        
        
        
        
        
        
        
        
        
        
        job_title: 'Job Title 2',
        
        
        
        
        
        
        
        
        
        
        phone: '555-1101',
        
        
        
        
        
        
        
        
        
        
        team_id: fk('team_id', 1),
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        quota_annual: 1.50,
        
        
        
        
        
        
        
        
        
        
        
        
        
        is_active: true,
        
        
        
        
        
        
        
        
        
        last_login: new Date(Date.now() + 1 * 3600000),
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: ids['bus_user'][2],
        email: 'test2@example.com',
        
        
        
        
        
        
        
        
        
        
        first_name: 'Robert',
        
        
        
        
        
        
        
        
        
        
        last_name: 'Williams',
        
        
        
        
        
        
        
        
        
        
        role: 'Role 3',
        
        
        
        
        
        
        
        
        
        
        job_title: 'Job Title 3',
        
        
        
        
        
        
        
        
        
        
        phone: '555-1202',
        
        
        
        
        
        
        
        
        
        
        team_id: fk('team_id', 2),
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        quota_annual: 2.50,
        
        
        
        
        
        
        
        
        
        
        
        
        
        is_active: false,
        
        
        
        
        
        
        
        
        
        last_login: new Date(Date.now() + 2 * 3600000),
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: ids['bus_user'][3],
        email: 'test3@example.com',
        
        
        
        
        
        
        
        
        
        
        first_name: 'Patricia',
        
        
        
        
        
        
        
        
        
        
        last_name: 'Brown',
        
        
        
        
        
        
        
        
        
        
        role: 'Role 4',
        
        
        
        
        
        
        
        
        
        
        job_title: 'Job Title 4',
        
        
        
        
        
        
        
        
        
        
        phone: '555-1303',
        
        
        
        
        
        
        
        
        
        
        team_id: fk('team_id', 3),
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        quota_annual: 3.50,
        
        
        
        
        
        
        
        
        
        
        
        
        
        is_active: true,
        
        
        
        
        
        
        
        
        
        last_login: new Date(Date.now() + 3 * 3600000),
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  ];

  await db.insertInto('bus_user').values(userRecords).execute();

  // Team (bus_team)
  await db.deleteFrom('bus_team').execute();

  const teamRecords = [
    {
      id: ids['bus_team'][0],
        name: 'Name 1',
        
        
        
        
        
        
        
        
        
        
        manager_id: fk('manager_id', 0),
        
        
        
        
        
        
        
        
        
        
        region: 'Region 1',
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        quota_annual: 0.50,
        
        
        
        
        
        
        
        
        
        
        
        
        
        is_active: true,
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: ids['bus_team'][1],
        name: 'Name 2',
        
        
        
        
        
        
        
        
        
        
        manager_id: fk('manager_id', 1),
        
        
        
        
        
        
        
        
        
        
        region: 'Region 2',
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        quota_annual: 1.50,
        
        
        
        
        
        
        
        
        
        
        
        
        
        is_active: true,
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: ids['bus_team'][2],
        name: 'Name 3',
        
        
        
        
        
        
        
        
        
        
        manager_id: fk('manager_id', 2),
        
        
        
        
        
        
        
        
        
        
        region: 'Region 3',
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        quota_annual: 2.50,
        
        
        
        
        
        
        
        
        
        
        
        
        
        is_active: false,
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: ids['bus_team'][3],
        name: 'Name 4',
        
        
        
        
        
        
        
        
        
        
        manager_id: fk('manager_id', 3),
        
        
        
        
        
        
        
        
        
        
        region: 'Region 4',
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        quota_annual: 3.50,
        
        
        
        
        
        
        
        
        
        
        
        
        
        is_active: true,
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  ];

  await db.insertInto('bus_team').values(teamRecords).execute();

  // Territory (bus_territory)
  await db.deleteFrom('bus_territory').execute();

  const territoryRecords = [
    {
      id: ids['bus_territory'][0],
        name: 'Name 1',
        
        
        
        
        
        
        
        
        
        
        region: 'Region 1',
        
        
        
        
        
        
        
        
        
        
        country_code: 'Country Code 1',
        
        
        
        
        
        
        
        
        
        
        manager_id: fk('manager_id', 0),
        
        
        
        
        
        
        
        
        
        
        
        
        
        employee_count_floor: 0,
        
        
        
        
        
        
        
        
        
        
        employee_count_ceiling: 0,
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        is_active: true,
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: ids['bus_territory'][1],
        name: 'Name 2',
        
        
        
        
        
        
        
        
        
        
        region: 'Region 2',
        
        
        
        
        
        
        
        
        
        
        country_code: 'Country Code 2',
        
        
        
        
        
        
        
        
        
        
        manager_id: fk('manager_id', 1),
        
        
        
        
        
        
        
        
        
        
        
        
        
        employee_count_floor: 1,
        
        
        
        
        
        
        
        
        
        
        employee_count_ceiling: 1,
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        is_active: true,
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: ids['bus_territory'][2],
        name: 'Name 3',
        
        
        
        
        
        
        
        
        
        
        region: 'Region 3',
        
        
        
        
        
        
        
        
        
        
        country_code: 'Country Code 3',
        
        
        
        
        
        
        
        
        
        
        manager_id: fk('manager_id', 2),
        
        
        
        
        
        
        
        
        
        
        
        
        
        employee_count_floor: 2,
        
        
        
        
        
        
        
        
        
        
        employee_count_ceiling: 2,
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        is_active: false,
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: ids['bus_territory'][3],
        name: 'Name 4',
        
        
        
        
        
        
        
        
        
        
        region: 'Region 4',
        
        
        
        
        
        
        
        
        
        
        country_code: 'Country Code 4',
        
        
        
        
        
        
        
        
        
        
        manager_id: fk('manager_id', 3),
        
        
        
        
        
        
        
        
        
        
        
        
        
        employee_count_floor: 3,
        
        
        
        
        
        
        
        
        
        
        employee_count_ceiling: 3,
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        is_active: true,
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  ];

  await db.insertInto('bus_territory').values(territoryRecords).execute();

  // Account (bus_account)
  await db.deleteFrom('bus_account').execute();

  const accountRecords = [
    {
      id: ids['bus_account'][0],
        name: 'Name 1',
        
        
        
        
        
        
        
        
        
        
        account_number: 'Account Number 1',
        
        
        
        
        
        
        
        
        
        
        account_type: 'Account Type 1',
        
        
        
        
        
        
        
        
        
        
        tier: 'Tier 1',
        
        
        
        
        
        
        
        
        
        
        industry: 'Industry 1',
        
        
        
        
        
        
        
        
        
        
        website: 'Website 1',
        
        
        
        
        
        
        
        
        
        
        phone: '555-1000',
        
        
        
        
        
        
        
        
        
        
        billing_street: 'Billing Street 1',
        
        
        
        
        
        
        
        
        
        
        billing_city: 'Billing City 1',
        
        
        
        
        
        
        
        
        
        
        billing_postal_code: 'Billing Postal Code 1',
        
        
        
        
        
        
        
        
        
        
        billing_country: 'Billing Country 1',
        
        
        
        
        
        
        
        
        
        
        
        
        
        employee_count: 0,
        
        
        
        
        
        
        
        
        
        
        
        annual_revenue: 0.50,
        
        
        
        
        
        
        
        
        
        health_score: 0,
        
        
        
        
        
        
        
        territory_id: fk('territory_id', 0),
        
        
        
        
        
        
        
        
        
        
        sla_policy_id: fk('sla_policy_id', 0),
        
        
        
        
        
        
        
        
        
        
        status: 'Active',
        
        
        
        
        
        
        
        
        
        
        owner_id: fk('owner_id', 0),
        
        
        
        
        
        
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: ids['bus_account'][1],
        name: 'Name 2',
        
        
        
        
        
        
        
        
        
        
        account_number: 'Account Number 2',
        
        
        
        
        
        
        
        
        
        
        account_type: 'Account Type 2',
        
        
        
        
        
        
        
        
        
        
        tier: 'Tier 2',
        
        
        
        
        
        
        
        
        
        
        industry: 'Industry 2',
        
        
        
        
        
        
        
        
        
        
        website: 'Website 2',
        
        
        
        
        
        
        
        
        
        
        phone: '555-1101',
        
        
        
        
        
        
        
        
        
        
        billing_street: 'Billing Street 2',
        
        
        
        
        
        
        
        
        
        
        billing_city: 'Billing City 2',
        
        
        
        
        
        
        
        
        
        
        billing_postal_code: 'Billing Postal Code 2',
        
        
        
        
        
        
        
        
        
        
        billing_country: 'Billing Country 2',
        
        
        
        
        
        
        
        
        
        
        
        
        
        employee_count: 1,
        
        
        
        
        
        
        
        
        
        
        
        annual_revenue: 1.50,
        
        
        
        
        
        
        
        
        
        health_score: 1,
        
        
        
        
        
        
        
        territory_id: fk('territory_id', 1),
        
        
        
        
        
        
        
        
        
        
        sla_policy_id: fk('sla_policy_id', 1),
        
        
        
        
        
        
        
        
        
        
        status: 'Pending',
        
        
        
        
        
        
        
        
        
        
        owner_id: fk('owner_id', 1),
        
        
        
        
        
        
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: ids['bus_account'][2],
        name: 'Name 3',
        
        
        
        
        
        
        
        
        
        
        account_number: 'Account Number 3',
        
        
        
        
        
        
        
        
        
        
        account_type: 'Account Type 3',
        
        
        
        
        
        
        
        
        
        
        tier: 'Tier 3',
        
        
        
        
        
        
        
        
        
        
        industry: 'Industry 3',
        
        
        
        
        
        
        
        
        
        
        website: 'Website 3',
        
        
        
        
        
        
        
        
        
        
        phone: '555-1202',
        
        
        
        
        
        
        
        
        
        
        billing_street: 'Billing Street 3',
        
        
        
        
        
        
        
        
        
        
        billing_city: 'Billing City 3',
        
        
        
        
        
        
        
        
        
        
        billing_postal_code: 'Billing Postal Code 3',
        
        
        
        
        
        
        
        
        
        
        billing_country: 'Billing Country 3',
        
        
        
        
        
        
        
        
        
        
        
        
        
        employee_count: 2,
        
        
        
        
        
        
        
        
        
        
        
        annual_revenue: 2.50,
        
        
        
        
        
        
        
        
        
        health_score: 2,
        
        
        
        
        
        
        
        territory_id: fk('territory_id', 2),
        
        
        
        
        
        
        
        
        
        
        sla_policy_id: fk('sla_policy_id', 2),
        
        
        
        
        
        
        
        
        
        
        status: 'Completed',
        
        
        
        
        
        
        
        
        
        
        owner_id: fk('owner_id', 2),
        
        
        
        
        
        
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: ids['bus_account'][3],
        name: 'Name 4',
        
        
        
        
        
        
        
        
        
        
        account_number: 'Account Number 4',
        
        
        
        
        
        
        
        
        
        
        account_type: 'Account Type 4',
        
        
        
        
        
        
        
        
        
        
        tier: 'Tier 4',
        
        
        
        
        
        
        
        
        
        
        industry: 'Industry 4',
        
        
        
        
        
        
        
        
        
        
        website: 'Website 4',
        
        
        
        
        
        
        
        
        
        
        phone: '555-1303',
        
        
        
        
        
        
        
        
        
        
        billing_street: 'Billing Street 4',
        
        
        
        
        
        
        
        
        
        
        billing_city: 'Billing City 4',
        
        
        
        
        
        
        
        
        
        
        billing_postal_code: 'Billing Postal Code 4',
        
        
        
        
        
        
        
        
        
        
        billing_country: 'Billing Country 4',
        
        
        
        
        
        
        
        
        
        
        
        
        
        employee_count: 3,
        
        
        
        
        
        
        
        
        
        
        
        annual_revenue: 3.50,
        
        
        
        
        
        
        
        
        
        health_score: 3,
        
        
        
        
        
        
        
        territory_id: fk('territory_id', 3),
        
        
        
        
        
        
        
        
        
        
        sla_policy_id: fk('sla_policy_id', 3),
        
        
        
        
        
        
        
        
        
        
        status: 'In Progress',
        
        
        
        
        
        
        
        
        
        
        owner_id: fk('owner_id', 3),
        
        
        
        
        
        
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  ];

  await db.insertInto('bus_account').values(accountRecords).execute();

  // Contact (bus_contact)
  await db.deleteFrom('bus_contact').execute();

  const contactRecords = [
    {
      id: ids['bus_contact'][0],
        account_id: fk('account_id', 0),
        
        
        
        
        
        
        
        
        
        
        first_name: 'James',
        
        
        
        
        
        
        
        
        
        
        last_name: 'Smith',
        
        
        
        
        
        
        
        
        
        
        email: 'test0@example.com',
        
        
        
        
        
        
        
        
        
        
        phone: '555-1000',
        
        
        
        
        
        
        
        
        
        
        mobile: '555-1000',
        
        
        
        
        
        
        
        
        
        
        job_title: 'Job Title 1',
        
        
        
        
        
        
        
        
        
        
        department: 'Engineering',
        
        
        
        
        
        
        
        
        
        
        lead_source: 'Lead Source 1',
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        is_primary: true,
        
        
        
        
        
        
        
        
        
        
        email_opt_out: true,
        
        
        
        
        
        
        
        
        
        
        do_not_call: true,
        
        
        
        status: 'Active',
        
        
        
        
        
        
        
        
        
        
        owner_id: fk('owner_id', 0),
        
        
        
        
        
        
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: ids['bus_contact'][1],
        account_id: fk('account_id', 1),
        
        
        
        
        
        
        
        
        
        
        first_name: 'Mary',
        
        
        
        
        
        
        
        
        
        
        last_name: 'Johnson',
        
        
        
        
        
        
        
        
        
        
        email: 'test1@example.com',
        
        
        
        
        
        
        
        
        
        
        phone: '555-1101',
        
        
        
        
        
        
        
        
        
        
        mobile: '555-1101',
        
        
        
        
        
        
        
        
        
        
        job_title: 'Job Title 2',
        
        
        
        
        
        
        
        
        
        
        department: 'Marketing',
        
        
        
        
        
        
        
        
        
        
        lead_source: 'Lead Source 2',
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        is_primary: true,
        
        
        
        
        
        
        
        
        
        
        email_opt_out: true,
        
        
        
        
        
        
        
        
        
        
        do_not_call: true,
        
        
        
        status: 'Pending',
        
        
        
        
        
        
        
        
        
        
        owner_id: fk('owner_id', 1),
        
        
        
        
        
        
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: ids['bus_contact'][2],
        account_id: fk('account_id', 2),
        
        
        
        
        
        
        
        
        
        
        first_name: 'Robert',
        
        
        
        
        
        
        
        
        
        
        last_name: 'Williams',
        
        
        
        
        
        
        
        
        
        
        email: 'test2@example.com',
        
        
        
        
        
        
        
        
        
        
        phone: '555-1202',
        
        
        
        
        
        
        
        
        
        
        mobile: '555-1202',
        
        
        
        
        
        
        
        
        
        
        job_title: 'Job Title 3',
        
        
        
        
        
        
        
        
        
        
        department: 'Finance',
        
        
        
        
        
        
        
        
        
        
        lead_source: 'Lead Source 3',
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        is_primary: false,
        
        
        
        
        
        
        
        
        
        
        email_opt_out: false,
        
        
        
        
        
        
        
        
        
        
        do_not_call: false,
        
        
        
        status: 'Completed',
        
        
        
        
        
        
        
        
        
        
        owner_id: fk('owner_id', 2),
        
        
        
        
        
        
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: ids['bus_contact'][3],
        account_id: fk('account_id', 3),
        
        
        
        
        
        
        
        
        
        
        first_name: 'Patricia',
        
        
        
        
        
        
        
        
        
        
        last_name: 'Brown',
        
        
        
        
        
        
        
        
        
        
        email: 'test3@example.com',
        
        
        
        
        
        
        
        
        
        
        phone: '555-1303',
        
        
        
        
        
        
        
        
        
        
        mobile: '555-1303',
        
        
        
        
        
        
        
        
        
        
        job_title: 'Job Title 4',
        
        
        
        
        
        
        
        
        
        
        department: 'Operations',
        
        
        
        
        
        
        
        
        
        
        lead_source: 'Lead Source 4',
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        is_primary: true,
        
        
        
        
        
        
        
        
        
        
        email_opt_out: true,
        
        
        
        
        
        
        
        
        
        
        do_not_call: true,
        
        
        
        status: 'In Progress',
        
        
        
        
        
        
        
        
        
        
        owner_id: fk('owner_id', 3),
        
        
        
        
        
        
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  ];

  await db.insertInto('bus_contact').values(contactRecords).execute();

  // Lead (bus_lead)
  await db.deleteFrom('bus_lead').execute();

  const leadRecords = [
    {
      id: ids['bus_lead'][0],
        first_name: 'James',
        
        
        
        
        
        
        
        
        
        
        last_name: 'Smith',
        
        
        
        
        
        
        
        
        
        
        company_name: 'Company Name 1',
        
        
        
        
        
        
        
        
        
        
        email: 'test0@example.com',
        
        
        
        
        
        
        
        
        
        
        phone: '555-1000',
        
        
        
        
        
        
        
        
        
        
        job_title: 'Job Title 1',
        
        
        
        
        
        
        
        
        
        
        industry: 'Industry 1',
        
        
        
        
        
        
        
        
        
        
        
        
        
        employee_count: 0,
        
        
        
        
        
        
        
        
        
        
        
        annual_revenue: 0.50,
        
        
        
        
        
        
        lead_source: 'Lead Source 1',
        
        
        
        
        
        
        
        
        
        
        rating: 'Rating 1',
        
        
        
        
        
        
        
        
        
        
        
        
        
        score: 0,
        
        
        
        
        
        
        
        campaign_id: fk('campaign_id', 0),
        
        
        
        
        
        
        
        
        
        
        status: 'Active',
        
        
        
        
        
        
        
        
        
        
        owner_id: fk('owner_id', 0),
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        converted_at: new Date(Date.now() + 0 * 3600000),
        
        
        
        
        disqualification_reason: 'Disqualification Reason 1',
        
        
        
        
        
        
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: ids['bus_lead'][1],
        first_name: 'Mary',
        
        
        
        
        
        
        
        
        
        
        last_name: 'Johnson',
        
        
        
        
        
        
        
        
        
        
        company_name: 'Company Name 2',
        
        
        
        
        
        
        
        
        
        
        email: 'test1@example.com',
        
        
        
        
        
        
        
        
        
        
        phone: '555-1101',
        
        
        
        
        
        
        
        
        
        
        job_title: 'Job Title 2',
        
        
        
        
        
        
        
        
        
        
        industry: 'Industry 2',
        
        
        
        
        
        
        
        
        
        
        
        
        
        employee_count: 1,
        
        
        
        
        
        
        
        
        
        
        
        annual_revenue: 1.50,
        
        
        
        
        
        
        lead_source: 'Lead Source 2',
        
        
        
        
        
        
        
        
        
        
        rating: 'Rating 2',
        
        
        
        
        
        
        
        
        
        
        
        
        
        score: 1,
        
        
        
        
        
        
        
        campaign_id: fk('campaign_id', 1),
        
        
        
        
        
        
        
        
        
        
        status: 'Pending',
        
        
        
        
        
        
        
        
        
        
        owner_id: fk('owner_id', 1),
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        converted_at: new Date(Date.now() + 1 * 3600000),
        
        
        
        
        disqualification_reason: 'Disqualification Reason 2',
        
        
        
        
        
        
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: ids['bus_lead'][2],
        first_name: 'Robert',
        
        
        
        
        
        
        
        
        
        
        last_name: 'Williams',
        
        
        
        
        
        
        
        
        
        
        company_name: 'Company Name 3',
        
        
        
        
        
        
        
        
        
        
        email: 'test2@example.com',
        
        
        
        
        
        
        
        
        
        
        phone: '555-1202',
        
        
        
        
        
        
        
        
        
        
        job_title: 'Job Title 3',
        
        
        
        
        
        
        
        
        
        
        industry: 'Industry 3',
        
        
        
        
        
        
        
        
        
        
        
        
        
        employee_count: 2,
        
        
        
        
        
        
        
        
        
        
        
        annual_revenue: 2.50,
        
        
        
        
        
        
        lead_source: 'Lead Source 3',
        
        
        
        
        
        
        
        
        
        
        rating: 'Rating 3',
        
        
        
        
        
        
        
        
        
        
        
        
        
        score: 2,
        
        
        
        
        
        
        
        campaign_id: fk('campaign_id', 2),
        
        
        
        
        
        
        
        
        
        
        status: 'Completed',
        
        
        
        
        
        
        
        
        
        
        owner_id: fk('owner_id', 2),
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        converted_at: new Date(Date.now() + 2 * 3600000),
        
        
        
        
        disqualification_reason: 'Disqualification Reason 3',
        
        
        
        
        
        
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: ids['bus_lead'][3],
        first_name: 'Patricia',
        
        
        
        
        
        
        
        
        
        
        last_name: 'Brown',
        
        
        
        
        
        
        
        
        
        
        company_name: 'Company Name 4',
        
        
        
        
        
        
        
        
        
        
        email: 'test3@example.com',
        
        
        
        
        
        
        
        
        
        
        phone: '555-1303',
        
        
        
        
        
        
        
        
        
        
        job_title: 'Job Title 4',
        
        
        
        
        
        
        
        
        
        
        industry: 'Industry 4',
        
        
        
        
        
        
        
        
        
        
        
        
        
        employee_count: 3,
        
        
        
        
        
        
        
        
        
        
        
        annual_revenue: 3.50,
        
        
        
        
        
        
        lead_source: 'Lead Source 4',
        
        
        
        
        
        
        
        
        
        
        rating: 'Rating 4',
        
        
        
        
        
        
        
        
        
        
        
        
        
        score: 3,
        
        
        
        
        
        
        
        campaign_id: fk('campaign_id', 3),
        
        
        
        
        
        
        
        
        
        
        status: 'In Progress',
        
        
        
        
        
        
        
        
        
        
        owner_id: fk('owner_id', 3),
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        converted_at: new Date(Date.now() + 3 * 3600000),
        
        
        
        
        disqualification_reason: 'Disqualification Reason 4',
        
        
        
        
        
        
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  ];

  await db.insertInto('bus_lead').values(leadRecords).execute();

  // Campaign (bus_campaign)
  await db.deleteFrom('bus_campaign').execute();

  const campaignRecords = [
    {
      id: ids['bus_campaign'][0],
        name: 'Name 1',
        
        
        
        
        
        
        
        
        
        
        campaign_type: 'Campaign Type 1',
        
        
        
        
        
        
        
        
        
        
        status: 'Active',
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        start_date: new Date(2000 + 0, 0 % 12, 15),
        
        
        
        
        
        
        
        
        
        
        end_date: new Date(2000 + 0, 0 % 12, 15),
        
        
        
        
        
        
        
        
        
        budgeted_cost: 0.50,
        
        
        
        
        
        
        
        
        
        
        actual_cost: 0.50,
        
        
        
        
        
        
        
        
        
        
        expected_revenue: 0.50,
        
        
        
        
        
        
        
        
        
        expected_response_count: 0,
        
        
        
        
        
        
        
        target_audience: 'Target Audience 1',
        
        
        
        
        
        
        
        
        
        
        owner_id: fk('owner_id', 0),
        
        
        
        
        
        
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: ids['bus_campaign'][1],
        name: 'Name 2',
        
        
        
        
        
        
        
        
        
        
        campaign_type: 'Campaign Type 2',
        
        
        
        
        
        
        
        
        
        
        status: 'Pending',
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        start_date: new Date(2000 + 1, 1 % 12, 15),
        
        
        
        
        
        
        
        
        
        
        end_date: new Date(2000 + 1, 1 % 12, 15),
        
        
        
        
        
        
        
        
        
        budgeted_cost: 1.50,
        
        
        
        
        
        
        
        
        
        
        actual_cost: 1.50,
        
        
        
        
        
        
        
        
        
        
        expected_revenue: 1.50,
        
        
        
        
        
        
        
        
        
        expected_response_count: 1,
        
        
        
        
        
        
        
        target_audience: 'Target Audience 2',
        
        
        
        
        
        
        
        
        
        
        owner_id: fk('owner_id', 1),
        
        
        
        
        
        
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: ids['bus_campaign'][2],
        name: 'Name 3',
        
        
        
        
        
        
        
        
        
        
        campaign_type: 'Campaign Type 3',
        
        
        
        
        
        
        
        
        
        
        status: 'Completed',
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        start_date: new Date(2000 + 2, 2 % 12, 15),
        
        
        
        
        
        
        
        
        
        
        end_date: new Date(2000 + 2, 2 % 12, 15),
        
        
        
        
        
        
        
        
        
        budgeted_cost: 2.50,
        
        
        
        
        
        
        
        
        
        
        actual_cost: 2.50,
        
        
        
        
        
        
        
        
        
        
        expected_revenue: 2.50,
        
        
        
        
        
        
        
        
        
        expected_response_count: 2,
        
        
        
        
        
        
        
        target_audience: 'Target Audience 3',
        
        
        
        
        
        
        
        
        
        
        owner_id: fk('owner_id', 2),
        
        
        
        
        
        
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: ids['bus_campaign'][3],
        name: 'Name 4',
        
        
        
        
        
        
        
        
        
        
        campaign_type: 'Campaign Type 4',
        
        
        
        
        
        
        
        
        
        
        status: 'In Progress',
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        start_date: new Date(2000 + 3, 3 % 12, 15),
        
        
        
        
        
        
        
        
        
        
        end_date: new Date(2000 + 3, 3 % 12, 15),
        
        
        
        
        
        
        
        
        
        budgeted_cost: 3.50,
        
        
        
        
        
        
        
        
        
        
        actual_cost: 3.50,
        
        
        
        
        
        
        
        
        
        
        expected_revenue: 3.50,
        
        
        
        
        
        
        
        
        
        expected_response_count: 3,
        
        
        
        
        
        
        
        target_audience: 'Target Audience 4',
        
        
        
        
        
        
        
        
        
        
        owner_id: fk('owner_id', 3),
        
        
        
        
        
        
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  ];

  await db.insertInto('bus_campaign').values(campaignRecords).execute();

  // Campaign Member (bus_campaign_member)
  await db.deleteFrom('bus_campaign_member').execute();

  const campaignMemberRecords = [
    {
      id: ids['bus_campaign_member'][0],
        campaign_id: fk('campaign_id', 0),
        
        
        
        
        
        
        
        
        
        
        lead_id: fk('lead_id', 0),
        
        
        
        
        
        
        
        
        
        
        contact_id: fk('contact_id', 0),
        
        
        
        
        
        
        
        
        
        
        member_status: 'Member Status 1',
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        responded_at: new Date(Date.now() + 0 * 3600000),
        
        
        
        
        
        
        
        
        
        
        
        has_responded: true,
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: ids['bus_campaign_member'][1],
        campaign_id: fk('campaign_id', 1),
        
        
        
        
        
        
        
        
        
        
        lead_id: fk('lead_id', 1),
        
        
        
        
        
        
        
        
        
        
        contact_id: fk('contact_id', 1),
        
        
        
        
        
        
        
        
        
        
        member_status: 'Member Status 2',
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        responded_at: new Date(Date.now() + 1 * 3600000),
        
        
        
        
        
        
        
        
        
        
        
        has_responded: true,
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: ids['bus_campaign_member'][2],
        campaign_id: fk('campaign_id', 2),
        
        
        
        
        
        
        
        
        
        
        lead_id: fk('lead_id', 2),
        
        
        
        
        
        
        
        
        
        
        contact_id: fk('contact_id', 2),
        
        
        
        
        
        
        
        
        
        
        member_status: 'Member Status 3',
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        responded_at: new Date(Date.now() + 2 * 3600000),
        
        
        
        
        
        
        
        
        
        
        
        has_responded: false,
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: ids['bus_campaign_member'][3],
        campaign_id: fk('campaign_id', 3),
        
        
        
        
        
        
        
        
        
        
        lead_id: fk('lead_id', 3),
        
        
        
        
        
        
        
        
        
        
        contact_id: fk('contact_id', 3),
        
        
        
        
        
        
        
        
        
        
        member_status: 'Member Status 4',
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        responded_at: new Date(Date.now() + 3 * 3600000),
        
        
        
        
        
        
        
        
        
        
        
        has_responded: true,
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  ];

  await db.insertInto('bus_campaign_member').values(campaignMemberRecords).execute();

  // Opportunity (bus_opportunity)
  await db.deleteFrom('bus_opportunity').execute();

  const opportunityRecords = [
    {
      id: ids['bus_opportunity'][0],
        account_id: fk('account_id', 0),
        
        
        
        
        
        
        
        
        
        
        contact_id: fk('contact_id', 0),
        
        
        
        
        
        
        
        
        
        
        campaign_id: fk('campaign_id', 0),
        
        
        
        
        
        
        
        
        
        
        name: 'Name 1',
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        description: 'Sample description text 0',
        
        
        
        
        
        amount: 0.50,
        
        
        
        
        
        
        currency_code: 'Currency Code 1',
        
        
        
        
        
        
        
        
        
        
        stage: 'Stage 1',
        
        
        
        
        
        
        
        
        
        
        
        
        
        probability: 0,
        
        
        
        
        
        
        
        forecast_category: 'Forecast Category 1',
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        expected_close_date: new Date(2000 + 0, 0 % 12, 15),
        
        
        
        
        
        
        
        
        
        
        actual_close_date: new Date(2000 + 0, 0 % 12, 15),
        
        
        
        
        
        lead_source: 'Lead Source 1',
        
        
        
        
        
        
        
        
        
        
        next_step: 'Next Step 1',
        
        
        
        
        
        
        
        
        
        
        loss_reason: 'Loss Reason 1',
        
        
        
        
        
        
        
        
        
        
        owner_id: fk('owner_id', 0),
        
        
        
        
        
        
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: ids['bus_opportunity'][1],
        account_id: fk('account_id', 1),
        
        
        
        
        
        
        
        
        
        
        contact_id: fk('contact_id', 1),
        
        
        
        
        
        
        
        
        
        
        campaign_id: fk('campaign_id', 1),
        
        
        
        
        
        
        
        
        
        
        name: 'Name 2',
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        description: 'Sample description text 1',
        
        
        
        
        
        amount: 1.50,
        
        
        
        
        
        
        currency_code: 'Currency Code 2',
        
        
        
        
        
        
        
        
        
        
        stage: 'Stage 2',
        
        
        
        
        
        
        
        
        
        
        
        
        
        probability: 1,
        
        
        
        
        
        
        
        forecast_category: 'Forecast Category 2',
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        expected_close_date: new Date(2000 + 1, 1 % 12, 15),
        
        
        
        
        
        
        
        
        
        
        actual_close_date: new Date(2000 + 1, 1 % 12, 15),
        
        
        
        
        
        lead_source: 'Lead Source 2',
        
        
        
        
        
        
        
        
        
        
        next_step: 'Next Step 2',
        
        
        
        
        
        
        
        
        
        
        loss_reason: 'Loss Reason 2',
        
        
        
        
        
        
        
        
        
        
        owner_id: fk('owner_id', 1),
        
        
        
        
        
        
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: ids['bus_opportunity'][2],
        account_id: fk('account_id', 2),
        
        
        
        
        
        
        
        
        
        
        contact_id: fk('contact_id', 2),
        
        
        
        
        
        
        
        
        
        
        campaign_id: fk('campaign_id', 2),
        
        
        
        
        
        
        
        
        
        
        name: 'Name 3',
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        description: 'Sample description text 2',
        
        
        
        
        
        amount: 2.50,
        
        
        
        
        
        
        currency_code: 'Currency Code 3',
        
        
        
        
        
        
        
        
        
        
        stage: 'Stage 3',
        
        
        
        
        
        
        
        
        
        
        
        
        
        probability: 2,
        
        
        
        
        
        
        
        forecast_category: 'Forecast Category 3',
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        expected_close_date: new Date(2000 + 2, 2 % 12, 15),
        
        
        
        
        
        
        
        
        
        
        actual_close_date: new Date(2000 + 2, 2 % 12, 15),
        
        
        
        
        
        lead_source: 'Lead Source 3',
        
        
        
        
        
        
        
        
        
        
        next_step: 'Next Step 3',
        
        
        
        
        
        
        
        
        
        
        loss_reason: 'Loss Reason 3',
        
        
        
        
        
        
        
        
        
        
        owner_id: fk('owner_id', 2),
        
        
        
        
        
        
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: ids['bus_opportunity'][3],
        account_id: fk('account_id', 3),
        
        
        
        
        
        
        
        
        
        
        contact_id: fk('contact_id', 3),
        
        
        
        
        
        
        
        
        
        
        campaign_id: fk('campaign_id', 3),
        
        
        
        
        
        
        
        
        
        
        name: 'Name 4',
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        description: 'Sample description text 3',
        
        
        
        
        
        amount: 3.50,
        
        
        
        
        
        
        currency_code: 'Currency Code 4',
        
        
        
        
        
        
        
        
        
        
        stage: 'Stage 4',
        
        
        
        
        
        
        
        
        
        
        
        
        
        probability: 3,
        
        
        
        
        
        
        
        forecast_category: 'Forecast Category 4',
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        expected_close_date: new Date(2000 + 3, 3 % 12, 15),
        
        
        
        
        
        
        
        
        
        
        actual_close_date: new Date(2000 + 3, 3 % 12, 15),
        
        
        
        
        
        lead_source: 'Lead Source 4',
        
        
        
        
        
        
        
        
        
        
        next_step: 'Next Step 4',
        
        
        
        
        
        
        
        
        
        
        loss_reason: 'Loss Reason 4',
        
        
        
        
        
        
        
        
        
        
        owner_id: fk('owner_id', 3),
        
        
        
        
        
        
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  ];

  await db.insertInto('bus_opportunity').values(opportunityRecords).execute();

  // Opportunity Line Item (bus_opportunity_line_item)
  await db.deleteFrom('bus_opportunity_line_item').execute();

  const opportunityLineItemRecords = [
    {
      id: ids['bus_opportunity_line_item'][0],
        opportunity_id: fk('opportunity_id', 0),
        
        
        
        
        
        
        
        
        
        
        product_id: fk('product_id', 0),
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        quantity: 0.50,
        
        
        
        
        
        
        
        
        
        
        unit_price: 0.50,
        
        
        
        
        
        
        
        
        
        
        discount_percent: 0.50,
        
        
        
        
        
        
        
        
        
        
        line_total: 0.50,
        
        
        
        
        
        
        line_description: 'Line Description 1',
        
        
        
        
        
        
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: ids['bus_opportunity_line_item'][1],
        opportunity_id: fk('opportunity_id', 1),
        
        
        
        
        
        
        
        
        
        
        product_id: fk('product_id', 1),
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        quantity: 1.50,
        
        
        
        
        
        
        
        
        
        
        unit_price: 1.50,
        
        
        
        
        
        
        
        
        
        
        discount_percent: 1.50,
        
        
        
        
        
        
        
        
        
        
        line_total: 1.50,
        
        
        
        
        
        
        line_description: 'Line Description 2',
        
        
        
        
        
        
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: ids['bus_opportunity_line_item'][2],
        opportunity_id: fk('opportunity_id', 2),
        
        
        
        
        
        
        
        
        
        
        product_id: fk('product_id', 2),
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        quantity: 2.50,
        
        
        
        
        
        
        
        
        
        
        unit_price: 2.50,
        
        
        
        
        
        
        
        
        
        
        discount_percent: 2.50,
        
        
        
        
        
        
        
        
        
        
        line_total: 2.50,
        
        
        
        
        
        
        line_description: 'Line Description 3',
        
        
        
        
        
        
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: ids['bus_opportunity_line_item'][3],
        opportunity_id: fk('opportunity_id', 3),
        
        
        
        
        
        
        
        
        
        
        product_id: fk('product_id', 3),
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        quantity: 3.50,
        
        
        
        
        
        
        
        
        
        
        unit_price: 3.50,
        
        
        
        
        
        
        
        
        
        
        discount_percent: 3.50,
        
        
        
        
        
        
        
        
        
        
        line_total: 3.50,
        
        
        
        
        
        
        line_description: 'Line Description 4',
        
        
        
        
        
        
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  ];

  await db.insertInto('bus_opportunity_line_item').values(opportunityLineItemRecords).execute();

  // Product (bus_product)
  await db.deleteFrom('bus_product').execute();

  const productRecords = [
    {
      id: ids['bus_product'][0],
        product_code: 'Product Code 1',
        
        
        
        
        
        
        
        
        
        
        name: 'Name 1',
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        description: 'Sample description text 0',
        
        family: 'Family 1',
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        list_price: 0.50,
        
        
        
        
        
        
        
        
        
        
        unit_cost: 0.50,
        
        
        
        
        
        
        billing_frequency: 'Billing Frequency 1',
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        is_active: true,
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: ids['bus_product'][1],
        product_code: 'Product Code 2',
        
        
        
        
        
        
        
        
        
        
        name: 'Name 2',
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        description: 'Sample description text 1',
        
        family: 'Family 2',
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        list_price: 1.50,
        
        
        
        
        
        
        
        
        
        
        unit_cost: 1.50,
        
        
        
        
        
        
        billing_frequency: 'Billing Frequency 2',
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        is_active: true,
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: ids['bus_product'][2],
        product_code: 'Product Code 3',
        
        
        
        
        
        
        
        
        
        
        name: 'Name 3',
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        description: 'Sample description text 2',
        
        family: 'Family 3',
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        list_price: 2.50,
        
        
        
        
        
        
        
        
        
        
        unit_cost: 2.50,
        
        
        
        
        
        
        billing_frequency: 'Billing Frequency 3',
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        is_active: false,
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: ids['bus_product'][3],
        product_code: 'Product Code 4',
        
        
        
        
        
        
        
        
        
        
        name: 'Name 4',
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        description: 'Sample description text 3',
        
        family: 'Family 4',
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        list_price: 3.50,
        
        
        
        
        
        
        
        
        
        
        unit_cost: 3.50,
        
        
        
        
        
        
        billing_frequency: 'Billing Frequency 4',
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        is_active: true,
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  ];

  await db.insertInto('bus_product').values(productRecords).execute();

  // Quote (bus_quote)
  await db.deleteFrom('bus_quote').execute();

  const quoteRecords = [
    {
      id: ids['bus_quote'][0],
        quote_number: 'Quote Number 1',
        
        
        
        
        
        
        
        
        
        
        opportunity_id: fk('opportunity_id', 0),
        
        
        
        
        
        
        
        
        
        
        account_id: fk('account_id', 0),
        
        
        
        
        
        
        
        
        
        
        name: 'Name 1',
        
        
        
        
        
        
        
        
        
        
        status: 'Active',
        
        
        
        
        
        
        
        
        
        
        
        
        
        version_number: 0,
        
        
        
        
        
        
        
        
        
        
        
        
        valid_until: new Date(2000 + 0, 0 % 12, 15),
        
        
        
        
        
        
        
        
        
        subtotal: 0.50,
        
        
        
        
        
        
        
        
        
        
        discount_percent: 0.50,
        
        
        
        
        
        
        
        
        
        
        discount_amount: 0.50,
        
        
        
        
        
        
        
        
        
        
        tax_amount: 0.50,
        
        
        
        
        
        
        
        
        
        
        grand_total: 0.50,
        
        
        
        
        
        
        approved_by_id: fk('approved_by_id', 0),
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        approved_at: new Date(Date.now() + 0 * 3600000),
        
        
        
        
        
        
        
        
        
        
        
        
        
        approval_notes: 'Sample approval_notes text 0',
        
        owner_id: fk('owner_id', 0),
        
        
        
        
        
        
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: ids['bus_quote'][1],
        quote_number: 'Quote Number 2',
        
        
        
        
        
        
        
        
        
        
        opportunity_id: fk('opportunity_id', 1),
        
        
        
        
        
        
        
        
        
        
        account_id: fk('account_id', 1),
        
        
        
        
        
        
        
        
        
        
        name: 'Name 2',
        
        
        
        
        
        
        
        
        
        
        status: 'Pending',
        
        
        
        
        
        
        
        
        
        
        
        
        
        version_number: 1,
        
        
        
        
        
        
        
        
        
        
        
        
        valid_until: new Date(2000 + 1, 1 % 12, 15),
        
        
        
        
        
        
        
        
        
        subtotal: 1.50,
        
        
        
        
        
        
        
        
        
        
        discount_percent: 1.50,
        
        
        
        
        
        
        
        
        
        
        discount_amount: 1.50,
        
        
        
        
        
        
        
        
        
        
        tax_amount: 1.50,
        
        
        
        
        
        
        
        
        
        
        grand_total: 1.50,
        
        
        
        
        
        
        approved_by_id: fk('approved_by_id', 1),
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        approved_at: new Date(Date.now() + 1 * 3600000),
        
        
        
        
        
        
        
        
        
        
        
        
        
        approval_notes: 'Sample approval_notes text 1',
        
        owner_id: fk('owner_id', 1),
        
        
        
        
        
        
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: ids['bus_quote'][2],
        quote_number: 'Quote Number 3',
        
        
        
        
        
        
        
        
        
        
        opportunity_id: fk('opportunity_id', 2),
        
        
        
        
        
        
        
        
        
        
        account_id: fk('account_id', 2),
        
        
        
        
        
        
        
        
        
        
        name: 'Name 3',
        
        
        
        
        
        
        
        
        
        
        status: 'Completed',
        
        
        
        
        
        
        
        
        
        
        
        
        
        version_number: 2,
        
        
        
        
        
        
        
        
        
        
        
        
        valid_until: new Date(2000 + 2, 2 % 12, 15),
        
        
        
        
        
        
        
        
        
        subtotal: 2.50,
        
        
        
        
        
        
        
        
        
        
        discount_percent: 2.50,
        
        
        
        
        
        
        
        
        
        
        discount_amount: 2.50,
        
        
        
        
        
        
        
        
        
        
        tax_amount: 2.50,
        
        
        
        
        
        
        
        
        
        
        grand_total: 2.50,
        
        
        
        
        
        
        approved_by_id: fk('approved_by_id', 2),
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        approved_at: new Date(Date.now() + 2 * 3600000),
        
        
        
        
        
        
        
        
        
        
        
        
        
        approval_notes: 'Sample approval_notes text 2',
        
        owner_id: fk('owner_id', 2),
        
        
        
        
        
        
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: ids['bus_quote'][3],
        quote_number: 'Quote Number 4',
        
        
        
        
        
        
        
        
        
        
        opportunity_id: fk('opportunity_id', 3),
        
        
        
        
        
        
        
        
        
        
        account_id: fk('account_id', 3),
        
        
        
        
        
        
        
        
        
        
        name: 'Name 4',
        
        
        
        
        
        
        
        
        
        
        status: 'In Progress',
        
        
        
        
        
        
        
        
        
        
        
        
        
        version_number: 3,
        
        
        
        
        
        
        
        
        
        
        
        
        valid_until: new Date(2000 + 3, 3 % 12, 15),
        
        
        
        
        
        
        
        
        
        subtotal: 3.50,
        
        
        
        
        
        
        
        
        
        
        discount_percent: 3.50,
        
        
        
        
        
        
        
        
        
        
        discount_amount: 3.50,
        
        
        
        
        
        
        
        
        
        
        tax_amount: 3.50,
        
        
        
        
        
        
        
        
        
        
        grand_total: 3.50,
        
        
        
        
        
        
        approved_by_id: fk('approved_by_id', 3),
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        approved_at: new Date(Date.now() + 3 * 3600000),
        
        
        
        
        
        
        
        
        
        
        
        
        
        approval_notes: 'Sample approval_notes text 3',
        
        owner_id: fk('owner_id', 3),
        
        
        
        
        
        
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  ];

  await db.insertInto('bus_quote').values(quoteRecords).execute();

  // Quote Line Item (bus_quote_line_item)
  await db.deleteFrom('bus_quote_line_item').execute();

  const quoteLineItemRecords = [
    {
      id: ids['bus_quote_line_item'][0],
        quote_id: fk('quote_id', 0),
        
        
        
        
        
        
        
        
        
        
        product_id: fk('product_id', 0),
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        quantity: 0.50,
        
        
        
        
        
        
        
        
        
        
        unit_price: 0.50,
        
        
        
        
        
        
        
        
        
        
        discount_percent: 0.50,
        
        
        
        
        
        
        
        
        
        
        line_total: 0.50,
        
        
        
        
        
        
        
        
        
        sort_order: 0,
        
        
        
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: ids['bus_quote_line_item'][1],
        quote_id: fk('quote_id', 1),
        
        
        
        
        
        
        
        
        
        
        product_id: fk('product_id', 1),
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        quantity: 1.50,
        
        
        
        
        
        
        
        
        
        
        unit_price: 1.50,
        
        
        
        
        
        
        
        
        
        
        discount_percent: 1.50,
        
        
        
        
        
        
        
        
        
        
        line_total: 1.50,
        
        
        
        
        
        
        
        
        
        sort_order: 1,
        
        
        
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: ids['bus_quote_line_item'][2],
        quote_id: fk('quote_id', 2),
        
        
        
        
        
        
        
        
        
        
        product_id: fk('product_id', 2),
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        quantity: 2.50,
        
        
        
        
        
        
        
        
        
        
        unit_price: 2.50,
        
        
        
        
        
        
        
        
        
        
        discount_percent: 2.50,
        
        
        
        
        
        
        
        
        
        
        line_total: 2.50,
        
        
        
        
        
        
        
        
        
        sort_order: 2,
        
        
        
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: ids['bus_quote_line_item'][3],
        quote_id: fk('quote_id', 3),
        
        
        
        
        
        
        
        
        
        
        product_id: fk('product_id', 3),
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        quantity: 3.50,
        
        
        
        
        
        
        
        
        
        
        unit_price: 3.50,
        
        
        
        
        
        
        
        
        
        
        discount_percent: 3.50,
        
        
        
        
        
        
        
        
        
        
        line_total: 3.50,
        
        
        
        
        
        
        
        
        
        sort_order: 3,
        
        
        
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  ];

  await db.insertInto('bus_quote_line_item').values(quoteLineItemRecords).execute();

  // Contract (bus_contract)
  await db.deleteFrom('bus_contract').execute();

  const contractRecords = [
    {
      id: ids['bus_contract'][0],
        contract_number: 'Contract Number 1',
        
        
        
        
        
        
        
        
        
        
        account_id: fk('account_id', 0),
        
        
        
        
        
        
        
        
        
        
        quote_id: fk('quote_id', 0),
        
        
        
        
        
        
        
        
        
        
        status: 'Active',
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        start_date: new Date(2000 + 0, 0 % 12, 15),
        
        
        
        
        
        
        
        
        
        
        end_date: new Date(2000 + 0, 0 % 12, 15),
        
        
        
        
        
        
        
        
        term_months: 0,
        
        
        
        
        
        
        
        
        
        
        
        annual_value: 0.50,
        
        
        
        
        
        
        
        
        
        
        
        
        
        auto_renew: true,
        
        
        
        
        
        
        renewal_notice_days: 0,
        
        
        
        
        
        
        
        signed_by_id: fk('signed_by_id', 0),
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        signed_at: new Date(Date.now() + 0 * 3600000),
        
        
        
        
        owner_id: fk('owner_id', 0),
        
        
        
        
        
        
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: ids['bus_contract'][1],
        contract_number: 'Contract Number 2',
        
        
        
        
        
        
        
        
        
        
        account_id: fk('account_id', 1),
        
        
        
        
        
        
        
        
        
        
        quote_id: fk('quote_id', 1),
        
        
        
        
        
        
        
        
        
        
        status: 'Pending',
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        start_date: new Date(2000 + 1, 1 % 12, 15),
        
        
        
        
        
        
        
        
        
        
        end_date: new Date(2000 + 1, 1 % 12, 15),
        
        
        
        
        
        
        
        
        term_months: 1,
        
        
        
        
        
        
        
        
        
        
        
        annual_value: 1.50,
        
        
        
        
        
        
        
        
        
        
        
        
        
        auto_renew: true,
        
        
        
        
        
        
        renewal_notice_days: 1,
        
        
        
        
        
        
        
        signed_by_id: fk('signed_by_id', 1),
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        signed_at: new Date(Date.now() + 1 * 3600000),
        
        
        
        
        owner_id: fk('owner_id', 1),
        
        
        
        
        
        
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: ids['bus_contract'][2],
        contract_number: 'Contract Number 3',
        
        
        
        
        
        
        
        
        
        
        account_id: fk('account_id', 2),
        
        
        
        
        
        
        
        
        
        
        quote_id: fk('quote_id', 2),
        
        
        
        
        
        
        
        
        
        
        status: 'Completed',
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        start_date: new Date(2000 + 2, 2 % 12, 15),
        
        
        
        
        
        
        
        
        
        
        end_date: new Date(2000 + 2, 2 % 12, 15),
        
        
        
        
        
        
        
        
        term_months: 2,
        
        
        
        
        
        
        
        
        
        
        
        annual_value: 2.50,
        
        
        
        
        
        
        
        
        
        
        
        
        
        auto_renew: false,
        
        
        
        
        
        
        renewal_notice_days: 2,
        
        
        
        
        
        
        
        signed_by_id: fk('signed_by_id', 2),
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        signed_at: new Date(Date.now() + 2 * 3600000),
        
        
        
        
        owner_id: fk('owner_id', 2),
        
        
        
        
        
        
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: ids['bus_contract'][3],
        contract_number: 'Contract Number 4',
        
        
        
        
        
        
        
        
        
        
        account_id: fk('account_id', 3),
        
        
        
        
        
        
        
        
        
        
        quote_id: fk('quote_id', 3),
        
        
        
        
        
        
        
        
        
        
        status: 'In Progress',
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        start_date: new Date(2000 + 3, 3 % 12, 15),
        
        
        
        
        
        
        
        
        
        
        end_date: new Date(2000 + 3, 3 % 12, 15),
        
        
        
        
        
        
        
        
        term_months: 3,
        
        
        
        
        
        
        
        
        
        
        
        annual_value: 3.50,
        
        
        
        
        
        
        
        
        
        
        
        
        
        auto_renew: true,
        
        
        
        
        
        
        renewal_notice_days: 3,
        
        
        
        
        
        
        
        signed_by_id: fk('signed_by_id', 3),
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        signed_at: new Date(Date.now() + 3 * 3600000),
        
        
        
        
        owner_id: fk('owner_id', 3),
        
        
        
        
        
        
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  ];

  await db.insertInto('bus_contract').values(contractRecords).execute();

  // Support Case (bus_support_case)
  await db.deleteFrom('bus_support_case').execute();

  const supportCaseRecords = [
    {
      id: ids['bus_support_case'][0],
        case_number: 'Case Number 1',
        
        
        
        
        
        
        
        
        
        
        account_id: fk('account_id', 0),
        
        
        
        
        
        
        
        
        
        
        contact_id: fk('contact_id', 0),
        
        
        
        
        
        
        
        
        
        
        sla_policy_id: fk('sla_policy_id', 0),
        
        
        
        
        
        
        
        
        
        
        subject: 'Mathematics',
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        description: 'Sample description text 0',
        
        case_type: 'Case Type 1',
        
        
        
        
        
        
        
        
        
        
        priority: 'Priority 1',
        
        
        
        
        
        
        
        
        
        
        origin: 'Origin 1',
        
        
        
        
        
        
        
        
        
        
        status: 'Active',
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        first_response_due_at: new Date(Date.now() + 0 * 3600000),
        
        
        
        
        
        
        
        
        
        
        first_response_at: new Date(Date.now() + 0 * 3600000),
        
        
        
        
        
        
        
        
        
        
        resolution_due_at: new Date(Date.now() + 0 * 3600000),
        
        
        
        
        
        
        
        
        
        
        resolved_at: new Date(Date.now() + 0 * 3600000),
        
        
        
        
        
        
        
        
        
        
        
        is_sla_breached: true,
        
        
        
        
        
        
        
        
        
        
        
        
        resolution_notes: 'Sample resolution_notes text 0',
        
        
        
        
        satisfaction_score: 0,
        
        
        
        
        
        
        
        escalated_by_id: fk('escalated_by_id', 0),
        
        
        
        
        
        
        
        
        
        
        owner_id: fk('owner_id', 0),
        
        
        
        
        
        
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: ids['bus_support_case'][1],
        case_number: 'Case Number 2',
        
        
        
        
        
        
        
        
        
        
        account_id: fk('account_id', 1),
        
        
        
        
        
        
        
        
        
        
        contact_id: fk('contact_id', 1),
        
        
        
        
        
        
        
        
        
        
        sla_policy_id: fk('sla_policy_id', 1),
        
        
        
        
        
        
        
        
        
        
        subject: 'Science',
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        description: 'Sample description text 1',
        
        case_type: 'Case Type 2',
        
        
        
        
        
        
        
        
        
        
        priority: 'Priority 2',
        
        
        
        
        
        
        
        
        
        
        origin: 'Origin 2',
        
        
        
        
        
        
        
        
        
        
        status: 'Pending',
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        first_response_due_at: new Date(Date.now() + 1 * 3600000),
        
        
        
        
        
        
        
        
        
        
        first_response_at: new Date(Date.now() + 1 * 3600000),
        
        
        
        
        
        
        
        
        
        
        resolution_due_at: new Date(Date.now() + 1 * 3600000),
        
        
        
        
        
        
        
        
        
        
        resolved_at: new Date(Date.now() + 1 * 3600000),
        
        
        
        
        
        
        
        
        
        
        
        is_sla_breached: true,
        
        
        
        
        
        
        
        
        
        
        
        
        resolution_notes: 'Sample resolution_notes text 1',
        
        
        
        
        satisfaction_score: 1,
        
        
        
        
        
        
        
        escalated_by_id: fk('escalated_by_id', 1),
        
        
        
        
        
        
        
        
        
        
        owner_id: fk('owner_id', 1),
        
        
        
        
        
        
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: ids['bus_support_case'][2],
        case_number: 'Case Number 3',
        
        
        
        
        
        
        
        
        
        
        account_id: fk('account_id', 2),
        
        
        
        
        
        
        
        
        
        
        contact_id: fk('contact_id', 2),
        
        
        
        
        
        
        
        
        
        
        sla_policy_id: fk('sla_policy_id', 2),
        
        
        
        
        
        
        
        
        
        
        subject: 'English',
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        description: 'Sample description text 2',
        
        case_type: 'Case Type 3',
        
        
        
        
        
        
        
        
        
        
        priority: 'Priority 3',
        
        
        
        
        
        
        
        
        
        
        origin: 'Origin 3',
        
        
        
        
        
        
        
        
        
        
        status: 'Completed',
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        first_response_due_at: new Date(Date.now() + 2 * 3600000),
        
        
        
        
        
        
        
        
        
        
        first_response_at: new Date(Date.now() + 2 * 3600000),
        
        
        
        
        
        
        
        
        
        
        resolution_due_at: new Date(Date.now() + 2 * 3600000),
        
        
        
        
        
        
        
        
        
        
        resolved_at: new Date(Date.now() + 2 * 3600000),
        
        
        
        
        
        
        
        
        
        
        
        is_sla_breached: false,
        
        
        
        
        
        
        
        
        
        
        
        
        resolution_notes: 'Sample resolution_notes text 2',
        
        
        
        
        satisfaction_score: 2,
        
        
        
        
        
        
        
        escalated_by_id: fk('escalated_by_id', 2),
        
        
        
        
        
        
        
        
        
        
        owner_id: fk('owner_id', 2),
        
        
        
        
        
        
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: ids['bus_support_case'][3],
        case_number: 'Case Number 4',
        
        
        
        
        
        
        
        
        
        
        account_id: fk('account_id', 3),
        
        
        
        
        
        
        
        
        
        
        contact_id: fk('contact_id', 3),
        
        
        
        
        
        
        
        
        
        
        sla_policy_id: fk('sla_policy_id', 3),
        
        
        
        
        
        
        
        
        
        
        subject: 'History',
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        description: 'Sample description text 3',
        
        case_type: 'Case Type 4',
        
        
        
        
        
        
        
        
        
        
        priority: 'Priority 4',
        
        
        
        
        
        
        
        
        
        
        origin: 'Origin 4',
        
        
        
        
        
        
        
        
        
        
        status: 'In Progress',
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        first_response_due_at: new Date(Date.now() + 3 * 3600000),
        
        
        
        
        
        
        
        
        
        
        first_response_at: new Date(Date.now() + 3 * 3600000),
        
        
        
        
        
        
        
        
        
        
        resolution_due_at: new Date(Date.now() + 3 * 3600000),
        
        
        
        
        
        
        
        
        
        
        resolved_at: new Date(Date.now() + 3 * 3600000),
        
        
        
        
        
        
        
        
        
        
        
        is_sla_breached: true,
        
        
        
        
        
        
        
        
        
        
        
        
        resolution_notes: 'Sample resolution_notes text 3',
        
        
        
        
        satisfaction_score: 3,
        
        
        
        
        
        
        
        escalated_by_id: fk('escalated_by_id', 3),
        
        
        
        
        
        
        
        
        
        
        owner_id: fk('owner_id', 3),
        
        
        
        
        
        
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  ];

  await db.insertInto('bus_support_case').values(supportCaseRecords).execute();

  // Sla Policy (bus_sla_policy)
  await db.deleteFrom('bus_sla_policy').execute();

  const slaPolicyRecords = [
    {
      id: ids['bus_sla_policy'][0],
        name: 'Name 1',
        
        
        
        
        
        
        
        
        
        
        tier: 'Tier 1',
        
        
        
        
        
        
        
        
        
        
        
        
        
        first_response_minutes: 0,
        
        
        
        
        
        
        
        
        
        
        resolution_hours: 0,
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        business_hours_only: true,
        
        
        
        
        
        
        
        
        
        
        is_active: true,
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: ids['bus_sla_policy'][1],
        name: 'Name 2',
        
        
        
        
        
        
        
        
        
        
        tier: 'Tier 2',
        
        
        
        
        
        
        
        
        
        
        
        
        
        first_response_minutes: 1,
        
        
        
        
        
        
        
        
        
        
        resolution_hours: 1,
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        business_hours_only: true,
        
        
        
        
        
        
        
        
        
        
        is_active: true,
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: ids['bus_sla_policy'][2],
        name: 'Name 3',
        
        
        
        
        
        
        
        
        
        
        tier: 'Tier 3',
        
        
        
        
        
        
        
        
        
        
        
        
        
        first_response_minutes: 2,
        
        
        
        
        
        
        
        
        
        
        resolution_hours: 2,
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        business_hours_only: false,
        
        
        
        
        
        
        
        
        
        
        is_active: false,
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: ids['bus_sla_policy'][3],
        name: 'Name 4',
        
        
        
        
        
        
        
        
        
        
        tier: 'Tier 4',
        
        
        
        
        
        
        
        
        
        
        
        
        
        first_response_minutes: 3,
        
        
        
        
        
        
        
        
        
        
        resolution_hours: 3,
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        business_hours_only: true,
        
        
        
        
        
        
        
        
        
        
        is_active: true,
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  ];

  await db.insertInto('bus_sla_policy').values(slaPolicyRecords).execute();

  // Activity (bus_activity)
  await db.deleteFrom('bus_activity').execute();

  const activityRecords = [
    {
      id: ids['bus_activity'][0],
        activity_type: 'Activity Type 1',
        
        
        
        
        
        
        
        
        
        
        subject: 'Mathematics',
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        description: 'Sample description text 0',
        
        status: 'Active',
        
        
        
        
        
        
        
        
        
        
        priority: 'Priority 1',
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        due_at: new Date(Date.now() + 0 * 3600000),
        
        
        
        
        
        
        
        
        
        
        completed_at: new Date(Date.now() + 0 * 3600000),
        
        
        
        
        
        
        
        duration_minutes: 0,
        
        
        
        
        
        
        
        account_id: fk('account_id', 0),
        
        
        
        
        
        
        
        
        
        
        contact_id: fk('contact_id', 0),
        
        
        
        
        
        
        
        
        
        
        lead_id: fk('lead_id', 0),
        
        
        
        
        
        
        
        
        
        
        opportunity_id: fk('opportunity_id', 0),
        
        
        
        
        
        
        
        
        
        
        support_case_id: fk('support_case_id', 0),
        
        
        
        
        
        
        
        
        
        
        contract_id: fk('contract_id', 0),
        
        
        
        
        
        
        
        
        
        
        owner_id: fk('owner_id', 0),
        
        
        
        
        
        
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: ids['bus_activity'][1],
        activity_type: 'Activity Type 2',
        
        
        
        
        
        
        
        
        
        
        subject: 'Science',
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        description: 'Sample description text 1',
        
        status: 'Pending',
        
        
        
        
        
        
        
        
        
        
        priority: 'Priority 2',
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        due_at: new Date(Date.now() + 1 * 3600000),
        
        
        
        
        
        
        
        
        
        
        completed_at: new Date(Date.now() + 1 * 3600000),
        
        
        
        
        
        
        
        duration_minutes: 1,
        
        
        
        
        
        
        
        account_id: fk('account_id', 1),
        
        
        
        
        
        
        
        
        
        
        contact_id: fk('contact_id', 1),
        
        
        
        
        
        
        
        
        
        
        lead_id: fk('lead_id', 1),
        
        
        
        
        
        
        
        
        
        
        opportunity_id: fk('opportunity_id', 1),
        
        
        
        
        
        
        
        
        
        
        support_case_id: fk('support_case_id', 1),
        
        
        
        
        
        
        
        
        
        
        contract_id: fk('contract_id', 1),
        
        
        
        
        
        
        
        
        
        
        owner_id: fk('owner_id', 1),
        
        
        
        
        
        
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: ids['bus_activity'][2],
        activity_type: 'Activity Type 3',
        
        
        
        
        
        
        
        
        
        
        subject: 'English',
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        description: 'Sample description text 2',
        
        status: 'Completed',
        
        
        
        
        
        
        
        
        
        
        priority: 'Priority 3',
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        due_at: new Date(Date.now() + 2 * 3600000),
        
        
        
        
        
        
        
        
        
        
        completed_at: new Date(Date.now() + 2 * 3600000),
        
        
        
        
        
        
        
        duration_minutes: 2,
        
        
        
        
        
        
        
        account_id: fk('account_id', 2),
        
        
        
        
        
        
        
        
        
        
        contact_id: fk('contact_id', 2),
        
        
        
        
        
        
        
        
        
        
        lead_id: fk('lead_id', 2),
        
        
        
        
        
        
        
        
        
        
        opportunity_id: fk('opportunity_id', 2),
        
        
        
        
        
        
        
        
        
        
        support_case_id: fk('support_case_id', 2),
        
        
        
        
        
        
        
        
        
        
        contract_id: fk('contract_id', 2),
        
        
        
        
        
        
        
        
        
        
        owner_id: fk('owner_id', 2),
        
        
        
        
        
        
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: ids['bus_activity'][3],
        activity_type: 'Activity Type 4',
        
        
        
        
        
        
        
        
        
        
        subject: 'History',
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        description: 'Sample description text 3',
        
        status: 'In Progress',
        
        
        
        
        
        
        
        
        
        
        priority: 'Priority 4',
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        due_at: new Date(Date.now() + 3 * 3600000),
        
        
        
        
        
        
        
        
        
        
        completed_at: new Date(Date.now() + 3 * 3600000),
        
        
        
        
        
        
        
        duration_minutes: 3,
        
        
        
        
        
        
        
        account_id: fk('account_id', 3),
        
        
        
        
        
        
        
        
        
        
        contact_id: fk('contact_id', 3),
        
        
        
        
        
        
        
        
        
        
        lead_id: fk('lead_id', 3),
        
        
        
        
        
        
        
        
        
        
        opportunity_id: fk('opportunity_id', 3),
        
        
        
        
        
        
        
        
        
        
        support_case_id: fk('support_case_id', 3),
        
        
        
        
        
        
        
        
        
        
        contract_id: fk('contract_id', 3),
        
        
        
        
        
        
        
        
        
        
        owner_id: fk('owner_id', 3),
        
        
        
        
        
        
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  ];

  await db.insertInto('bus_activity').values(activityRecords).execute();


  // Re-enable FK constraint checking
  await sql`SET session_replication_role = DEFAULT`.execute(db);

  console.log('✓ Business sample data seeded');
}
