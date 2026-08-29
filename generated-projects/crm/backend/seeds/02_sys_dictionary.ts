/**
 * System Dictionary Seed
 * Populates sys_ tables with metadata for business entities
 *
 * Generated: 2026-08-29T04:45:21.834Z
 *
 * This seed creates:
 * - sys_table entries for each business entity
 * - sys_column entries for each entity attribute
 * - sys_window entries for entity management
 * - sys_tab entries for window tabs
 * - sys_field entries with randomized seq_no for runtime modification demo
 */

import { Kysely, sql } from 'kysely';
import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// Application Dictionary Help Text
// ============================================================================
// Help is composed from the dictionary itself rather than hand-written per
// project, so it cannot drift from the schema it describes: what is mandatory,
// what has to be unique, which records link to which, and the draft -> final
// lifecycle every business record goes through.
//
// Administrators can overwrite any of this from Window, Tab and Field; the
// seed only supplies the starting text.

interface HelpColumn {
  columnName: string;
  displayName: string;
  type: string;
  isMandatory: boolean;
  isUnique: boolean;
  isForeignKey: boolean;
  maxLength?: number;
  /** Display label of the entity this column points at, once resolved. */
  fkTarget?: string;
  /** The entity's own <name>_id column carried over from the ERD. */
  isBusinessKey?: boolean;
}

interface HelpEntity {
  label: string;
  tableName: string;
  stem: string;
  columns: HelpColumn[];
}

/** Columns the framework maintains; never described as user input. */
const HELP_AUDIT_COLUMNS = [
  'created_at',
  'updated_at',
  'deleted_at',
  'created_by',
  'updated_by',
  'version',
];

/** 'a', 'a and b', 'a, b and c' */
function helpJoin(items: string[]): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/** 'a Patient' / 'an Encounter' */
function helpArticle(word: string): string {
  return /^[aeiou]/i.test(word) ? 'an' : 'a';
}

function isAuditColumn(col: HelpColumn): boolean {
  return HELP_AUDIT_COLUMNS.includes(col.columnName);
}

/**
 * Resolve the cross-references the help text leans on: which columns point at
 * another entity, and which entities point back at this one.
 */
function resolveHelpModel(entities: HelpEntity[]): Map<string, { entity: HelpEntity; children: string[] }> {
  const byStem = new Map(entities.map((e) => [e.stem, e]));
  const resolved = new Map<string, { entity: HelpEntity; children: string[] }>();

  for (const entity of entities) {
    for (const col of entity.columns) {
      if (!col.columnName.endsWith('_id')) continue;
      const stem = col.columnName.slice(0, -'_id'.length);
      const target = byStem.get(stem);
      if (!target) continue;
      if (target.tableName === entity.tableName) {
        // The entity's own identifier from the ERD, not a link to anything.
        col.isBusinessKey = true;
      } else if (col.isForeignKey) {
        col.fkTarget = target.label;
      }
    }
  }

  for (const entity of entities) {
    const children = entities
      .filter((other) =>
        other.tableName !== entity.tableName &&
        other.columns.some((c) => c.fkTarget === entity.label),
      )
      .map((other) => other.label);
    resolved.set(entity.tableName, { entity, children });
  }

  return resolved;
}

function windowHelpText(entity: HelpEntity, children: string[]): string {
  const label = entity.label;
  const parents = [...new Set(entity.columns.filter((c) => c.fkTarget).map((c) => c.fkTarget!))];
  const uniques = entity.columns.filter((c) => c.isUnique).map((c) => c.displayName);
  const required = entity.columns
    .filter((c) => c.isMandatory && !isAuditColumn(c))
    .map((c) => c.displayName);

  const paragraphs: string[] = [];

  paragraphs.push(
    `Create, find and maintain ${label} records. The list shows every ${label} you have access to — ` +
      `select a row to open it, or use New to add one. Each row is a single ${label}, described by ` +
      `${entity.columns.length} field${entity.columns.length === 1 ? '' : 's'}.`,
  );

  const identity: string[] = [];
  if (uniques.length > 0) {
    identity.push(
      `${helpJoin(uniques)} ${uniques.length === 1 ? 'is unique' : 'are unique'}: no two ${label} records ` +
        `may share the same value, and a save that would duplicate one is rejected.`,
    );
  }
  if (required.length > 0) {
    identity.push(`${helpJoin(required)} must be filled in before the record can be saved.`);
  }
  if (identity.length > 0) paragraphs.push(identity.join(' '));

  const links: string[] = [];
  if (parents.length > 0) {
    links.push(
      `Every ${label} points at ${helpJoin(parents)}. Choose the linked record from the lookup on those ` +
        `fields rather than typing an identifier.`,
    );
  }
  if (children.length > 0) {
    links.push(
      `${helpJoin(children)} ${children.length === 1 ? 'refers' : 'refer'} back to ${label}, so what you ` +
        `change here can affect ${children.length === 1 ? 'that record' : 'those records'}.`,
    );
  }
  if (links.length > 0) paragraphs.push(links.join(' '));

  paragraphs.push(
    `Every save starts as a Draft. The business rules and workflows attached to ${label} then run together ` +
      `in a single transaction: if all of them succeed the record becomes Final; if any of them fails, ` +
      `nothing they changed is kept — the record stays Draft and the reason is written onto it so you can ` +
      `fix the cause and retry. ${helpArticle(label) === 'an' ? 'An' : 'A'} ${label} with no rules or ` +
      `workflows attached is marked Final immediately.`,
  );

  return paragraphs.join('\n\n');
}

function tabHelpText(entity: HelpEntity): string {
  const label = entity.label;
  const required = entity.columns.filter((c) => c.isMandatory && !isAuditColumn(c));
  const lookups = entity.columns.filter((c) => c.fkTarget);
  const sentences: string[] = [];

  sentences.push(
    `Shows one ${label} at a time. Fields are grouped: General carries the identifying fields and Details ` +
      `carries the rest.`,
  );
  if (required.length > 0) {
    sentences.push(
      `${required.length} field${required.length === 1 ? '' : 's'} marked with a red asterisk (*) must have ` +
        `a value before Save will accept the record.`,
    );
  }
  if (lookups.length > 0) {
    sentences.push(
      `${helpJoin(lookups.map((c) => c.displayName))} ${lookups.length === 1 ? 'is a lookup' : 'are lookups'} — ` +
        `search the linked records instead of entering an identifier by hand.`,
    );
  }
  sentences.push(
    `Any field showing a ? beside its label has help of its own; click it for the rules that apply there.`,
  );

  return sentences.join(' ');
}

function fieldTypeSentence(entity: HelpEntity, col: HelpColumn): string {
  const noun = col.displayName.toLowerCase();
  switch (col.type) {
    case 'date':
      return `The ${noun} of this ${entity.label}, as a calendar date.`;
    case 'datetime':
      return `The ${noun} of this ${entity.label}, as a date and time.`;
    case 'integer':
      return `The ${noun} of this ${entity.label}, as a whole number.`;
    case 'decimal':
      return `The ${noun} of this ${entity.label}, as a decimal amount.`;
    case 'boolean':
      return `Whether this ${entity.label} is marked as ${noun}.`;
    case 'text':
      return `Free-form ${noun} for this ${entity.label}. The box grows as you type.`;
    case 'json':
      return `The ${noun} of this ${entity.label}, held as structured JSON.`;
    default:
      return `The ${noun} of this ${entity.label}.`;
  }
}

function fieldHelpText(entity: HelpEntity, col: HelpColumn): string {
  const parts: string[] = [];

  if (col.fkTarget) {
    parts.push(
      `Links this ${entity.label} to ${helpArticle(col.fkTarget)} ${col.fkTarget} record. Pick the ` +
        `${col.fkTarget} from the lookup — the identifier is stored for you.`,
    );
  } else if (col.isBusinessKey) {
    parts.push(
      `The ${entity.label} reference used outside this system. It identifies the ${entity.label} on ` +
        `documents and in exports, and stays with the record for its whole life.`,
    );
  } else if (isAuditColumn(col)) {
    parts.push(`Maintained by the system as part of the audit trail. It is set automatically, not entered here.`);
  } else {
    parts.push(fieldTypeSentence(entity, col));
  }

  if (col.isMandatory && !isAuditColumn(col)) {
    parts.push(`Required — the record cannot be saved while this is empty.`);
  }
  if (col.isUnique) {
    parts.push(`Must be unique: a save is rejected if another ${entity.label} already uses this value.`);
  }
  if (col.maxLength) {
    parts.push(`Up to ${col.maxLength} characters.`);
  }

  return parts.join(' ');
}

const dictionaryHelpEntities: HelpEntity[] = [
  {
    label: 'User',
    tableName: 'bus_user',
    stem: 'user',
    columns: [
      { columnName: 'id', displayName: 'Id', type: 'string', isMandatory: false, isUnique: true, isForeignKey: false },
      { columnName: 'email', displayName: 'Email', type: 'string', isMandatory: true, isUnique: true, isForeignKey: false },
      { columnName: 'first_name', displayName: 'First Name', type: 'string', isMandatory: true, isUnique: false, isForeignKey: false },
      { columnName: 'last_name', displayName: 'Last Name', type: 'string', isMandatory: true, isUnique: false, isForeignKey: false },
      { columnName: 'role', displayName: 'Role', type: 'string', isMandatory: true, isUnique: false, isForeignKey: false },
      { columnName: 'job_title', displayName: 'Job Title', type: 'string', isMandatory: false, isUnique: false, isForeignKey: false },
      { columnName: 'phone', displayName: 'Phone', type: 'string', isMandatory: false, isUnique: false, isForeignKey: false },
      { columnName: 'team_id', displayName: 'Team Id', type: 'string', isMandatory: false, isUnique: false, isForeignKey: true },
      { columnName: 'quota_annual', displayName: 'Quota Annual', type: 'decimal', isMandatory: false, isUnique: false, isForeignKey: false },
      { columnName: 'is_active', displayName: 'Is Active', type: 'boolean', isMandatory: true, isUnique: false, isForeignKey: false },
      { columnName: 'last_login', displayName: 'Last Login', type: 'datetime', isMandatory: false, isUnique: false, isForeignKey: false },
    ],
  },
  {
    label: 'Team',
    tableName: 'bus_team',
    stem: 'team',
    columns: [
      { columnName: 'id', displayName: 'Id', type: 'string', isMandatory: false, isUnique: true, isForeignKey: false },
      { columnName: 'name', displayName: 'Name', type: 'string', isMandatory: true, isUnique: false, isForeignKey: false },
      { columnName: 'manager_id', displayName: 'Manager Id', type: 'string', isMandatory: false, isUnique: false, isForeignKey: true },
      { columnName: 'region', displayName: 'Region', type: 'string', isMandatory: false, isUnique: false, isForeignKey: false },
      { columnName: 'quota_annual', displayName: 'Quota Annual', type: 'decimal', isMandatory: false, isUnique: false, isForeignKey: false },
      { columnName: 'is_active', displayName: 'Is Active', type: 'boolean', isMandatory: true, isUnique: false, isForeignKey: false },
    ],
  },
  {
    label: 'Territory',
    tableName: 'bus_territory',
    stem: 'territory',
    columns: [
      { columnName: 'id', displayName: 'Id', type: 'string', isMandatory: false, isUnique: true, isForeignKey: false },
      { columnName: 'name', displayName: 'Name', type: 'string', isMandatory: true, isUnique: false, isForeignKey: false },
      { columnName: 'region', displayName: 'Region', type: 'string', isMandatory: true, isUnique: false, isForeignKey: false },
      { columnName: 'country_code', displayName: 'Country Code', type: 'string', isMandatory: false, isUnique: false, isForeignKey: false },
      { columnName: 'manager_id', displayName: 'Manager Id', type: 'string', isMandatory: false, isUnique: false, isForeignKey: true },
      { columnName: 'employee_count_floor', displayName: 'Employee Count Floor', type: 'integer', isMandatory: false, isUnique: false, isForeignKey: false },
      { columnName: 'employee_count_ceiling', displayName: 'Employee Count Ceiling', type: 'integer', isMandatory: false, isUnique: false, isForeignKey: false },
      { columnName: 'is_active', displayName: 'Is Active', type: 'boolean', isMandatory: true, isUnique: false, isForeignKey: false },
    ],
  },
  {
    label: 'Account',
    tableName: 'bus_account',
    stem: 'account',
    columns: [
      { columnName: 'id', displayName: 'Id', type: 'string', isMandatory: false, isUnique: true, isForeignKey: false },
      { columnName: 'name', displayName: 'Name', type: 'string', isMandatory: true, isUnique: false, isForeignKey: false },
      { columnName: 'account_number', displayName: 'Account Number', type: 'string', isMandatory: false, isUnique: true, isForeignKey: false },
      { columnName: 'account_type', displayName: 'Account Type', type: 'string', isMandatory: true, isUnique: false, isForeignKey: false },
      { columnName: 'tier', displayName: 'Tier', type: 'string', isMandatory: false, isUnique: false, isForeignKey: false },
      { columnName: 'industry', displayName: 'Industry', type: 'string', isMandatory: false, isUnique: false, isForeignKey: false },
      { columnName: 'website', displayName: 'Website', type: 'string', isMandatory: false, isUnique: false, isForeignKey: false },
      { columnName: 'phone', displayName: 'Phone', type: 'string', isMandatory: false, isUnique: false, isForeignKey: false },
      { columnName: 'billing_street', displayName: 'Billing Street', type: 'string', isMandatory: false, isUnique: false, isForeignKey: false },
      { columnName: 'billing_city', displayName: 'Billing City', type: 'string', isMandatory: false, isUnique: false, isForeignKey: false },
      { columnName: 'billing_postal_code', displayName: 'Billing Postal Code', type: 'string', isMandatory: false, isUnique: false, isForeignKey: false },
      { columnName: 'billing_country', displayName: 'Billing Country', type: 'string', isMandatory: false, isUnique: false, isForeignKey: false },
      { columnName: 'employee_count', displayName: 'Employee Count', type: 'integer', isMandatory: false, isUnique: false, isForeignKey: false },
      { columnName: 'annual_revenue', displayName: 'Annual Revenue', type: 'decimal', isMandatory: false, isUnique: false, isForeignKey: false },
      { columnName: 'health_score', displayName: 'Health Score', type: 'integer', isMandatory: false, isUnique: false, isForeignKey: false },
      { columnName: 'territory_id', displayName: 'Territory Id', type: 'string', isMandatory: false, isUnique: false, isForeignKey: true },
      { columnName: 'sla_policy_id', displayName: 'Sla Policy Id', type: 'string', isMandatory: false, isUnique: false, isForeignKey: true },
      { columnName: 'status', displayName: 'Status', type: 'string', isMandatory: true, isUnique: false, isForeignKey: false },
      { columnName: 'owner_id', displayName: 'Owner Id', type: 'string', isMandatory: true, isUnique: false, isForeignKey: true },
    ],
  },
  {
    label: 'Contact',
    tableName: 'bus_contact',
    stem: 'contact',
    columns: [
      { columnName: 'id', displayName: 'Id', type: 'string', isMandatory: false, isUnique: true, isForeignKey: false },
      { columnName: 'account_id', displayName: 'Account Id', type: 'string', isMandatory: false, isUnique: false, isForeignKey: true },
      { columnName: 'first_name', displayName: 'First Name', type: 'string', isMandatory: true, isUnique: false, isForeignKey: false },
      { columnName: 'last_name', displayName: 'Last Name', type: 'string', isMandatory: true, isUnique: false, isForeignKey: false },
      { columnName: 'email', displayName: 'Email', type: 'string', isMandatory: true, isUnique: true, isForeignKey: false },
      { columnName: 'phone', displayName: 'Phone', type: 'string', isMandatory: false, isUnique: false, isForeignKey: false },
      { columnName: 'mobile', displayName: 'Mobile', type: 'string', isMandatory: false, isUnique: false, isForeignKey: false },
      { columnName: 'job_title', displayName: 'Job Title', type: 'string', isMandatory: false, isUnique: false, isForeignKey: false },
      { columnName: 'department', displayName: 'Department', type: 'string', isMandatory: false, isUnique: false, isForeignKey: false },
      { columnName: 'lead_source', displayName: 'Lead Source', type: 'string', isMandatory: false, isUnique: false, isForeignKey: false },
      { columnName: 'is_primary', displayName: 'Is Primary', type: 'boolean', isMandatory: true, isUnique: false, isForeignKey: false },
      { columnName: 'email_opt_out', displayName: 'Email Opt Out', type: 'boolean', isMandatory: true, isUnique: false, isForeignKey: false },
      { columnName: 'do_not_call', displayName: 'Do Not Call', type: 'boolean', isMandatory: true, isUnique: false, isForeignKey: false },
      { columnName: 'status', displayName: 'Status', type: 'string', isMandatory: true, isUnique: false, isForeignKey: false },
      { columnName: 'owner_id', displayName: 'Owner Id', type: 'string', isMandatory: true, isUnique: false, isForeignKey: true },
    ],
  },
  {
    label: 'Lead',
    tableName: 'bus_lead',
    stem: 'lead',
    columns: [
      { columnName: 'id', displayName: 'Id', type: 'string', isMandatory: false, isUnique: true, isForeignKey: false },
      { columnName: 'first_name', displayName: 'First Name', type: 'string', isMandatory: true, isUnique: false, isForeignKey: false },
      { columnName: 'last_name', displayName: 'Last Name', type: 'string', isMandatory: true, isUnique: false, isForeignKey: false },
      { columnName: 'company_name', displayName: 'Company Name', type: 'string', isMandatory: true, isUnique: false, isForeignKey: false },
      { columnName: 'email', displayName: 'Email', type: 'string', isMandatory: true, isUnique: false, isForeignKey: false },
      { columnName: 'phone', displayName: 'Phone', type: 'string', isMandatory: false, isUnique: false, isForeignKey: false },
      { columnName: 'job_title', displayName: 'Job Title', type: 'string', isMandatory: false, isUnique: false, isForeignKey: false },
      { columnName: 'industry', displayName: 'Industry', type: 'string', isMandatory: false, isUnique: false, isForeignKey: false },
      { columnName: 'employee_count', displayName: 'Employee Count', type: 'integer', isMandatory: false, isUnique: false, isForeignKey: false },
      { columnName: 'annual_revenue', displayName: 'Annual Revenue', type: 'decimal', isMandatory: false, isUnique: false, isForeignKey: false },
      { columnName: 'lead_source', displayName: 'Lead Source', type: 'string', isMandatory: true, isUnique: false, isForeignKey: false },
      { columnName: 'rating', displayName: 'Rating', type: 'string', isMandatory: false, isUnique: false, isForeignKey: false },
      { columnName: 'score', displayName: 'Score', type: 'integer', isMandatory: false, isUnique: false, isForeignKey: false },
      { columnName: 'campaign_id', displayName: 'Campaign Id', type: 'string', isMandatory: false, isUnique: false, isForeignKey: true },
      { columnName: 'status', displayName: 'Status', type: 'string', isMandatory: true, isUnique: false, isForeignKey: false },
      { columnName: 'owner_id', displayName: 'Owner Id', type: 'string', isMandatory: true, isUnique: false, isForeignKey: true },
      { columnName: 'converted_at', displayName: 'Converted At', type: 'datetime', isMandatory: false, isUnique: false, isForeignKey: false },
      { columnName: 'disqualification_reason', displayName: 'Disqualification Reason', type: 'string', isMandatory: false, isUnique: false, isForeignKey: false },
    ],
  },
  {
    label: 'Campaign',
    tableName: 'bus_campaign',
    stem: 'campaign',
    columns: [
      { columnName: 'id', displayName: 'Id', type: 'string', isMandatory: false, isUnique: true, isForeignKey: false },
      { columnName: 'name', displayName: 'Name', type: 'string', isMandatory: true, isUnique: false, isForeignKey: false },
      { columnName: 'campaign_type', displayName: 'Campaign Type', type: 'string', isMandatory: true, isUnique: false, isForeignKey: false },
      { columnName: 'status', displayName: 'Status', type: 'string', isMandatory: true, isUnique: false, isForeignKey: false },
      { columnName: 'start_date', displayName: 'Start Date', type: 'date', isMandatory: true, isUnique: false, isForeignKey: false },
      { columnName: 'end_date', displayName: 'End Date', type: 'date', isMandatory: false, isUnique: false, isForeignKey: false },
      { columnName: 'budgeted_cost', displayName: 'Budgeted Cost', type: 'decimal', isMandatory: false, isUnique: false, isForeignKey: false },
      { columnName: 'actual_cost', displayName: 'Actual Cost', type: 'decimal', isMandatory: false, isUnique: false, isForeignKey: false },
      { columnName: 'expected_revenue', displayName: 'Expected Revenue', type: 'decimal', isMandatory: false, isUnique: false, isForeignKey: false },
      { columnName: 'expected_response_count', displayName: 'Expected Response Count', type: 'integer', isMandatory: false, isUnique: false, isForeignKey: false },
      { columnName: 'target_audience', displayName: 'Target Audience', type: 'string', isMandatory: false, isUnique: false, isForeignKey: false },
      { columnName: 'owner_id', displayName: 'Owner Id', type: 'string', isMandatory: true, isUnique: false, isForeignKey: true },
    ],
  },
  {
    label: 'Campaign Member',
    tableName: 'bus_campaign_member',
    stem: 'campaign_member',
    columns: [
      { columnName: 'id', displayName: 'Id', type: 'string', isMandatory: false, isUnique: true, isForeignKey: false },
      { columnName: 'campaign_id', displayName: 'Campaign Id', type: 'string', isMandatory: true, isUnique: false, isForeignKey: true },
      { columnName: 'lead_id', displayName: 'Lead Id', type: 'string', isMandatory: false, isUnique: false, isForeignKey: true },
      { columnName: 'contact_id', displayName: 'Contact Id', type: 'string', isMandatory: false, isUnique: false, isForeignKey: true },
      { columnName: 'member_status', displayName: 'Member Status', type: 'string', isMandatory: true, isUnique: false, isForeignKey: false },
      { columnName: 'responded_at', displayName: 'Responded At', type: 'datetime', isMandatory: false, isUnique: false, isForeignKey: false },
      { columnName: 'has_responded', displayName: 'Has Responded', type: 'boolean', isMandatory: true, isUnique: false, isForeignKey: false },
    ],
  },
  {
    label: 'Opportunity',
    tableName: 'bus_opportunity',
    stem: 'opportunity',
    columns: [
      { columnName: 'id', displayName: 'Id', type: 'string', isMandatory: false, isUnique: true, isForeignKey: false },
      { columnName: 'account_id', displayName: 'Account Id', type: 'string', isMandatory: true, isUnique: false, isForeignKey: true },
      { columnName: 'contact_id', displayName: 'Contact Id', type: 'string', isMandatory: false, isUnique: false, isForeignKey: true },
      { columnName: 'campaign_id', displayName: 'Campaign Id', type: 'string', isMandatory: false, isUnique: false, isForeignKey: true },
      { columnName: 'name', displayName: 'Name', type: 'string', isMandatory: true, isUnique: false, isForeignKey: false },
      { columnName: 'description', displayName: 'Description', type: 'text', isMandatory: false, isUnique: false, isForeignKey: false },
      { columnName: 'amount', displayName: 'Amount', type: 'decimal', isMandatory: false, isUnique: false, isForeignKey: false },
      { columnName: 'currency_code', displayName: 'Currency Code', type: 'string', isMandatory: true, isUnique: false, isForeignKey: false },
      { columnName: 'stage', displayName: 'Stage', type: 'string', isMandatory: true, isUnique: false, isForeignKey: false },
      { columnName: 'probability', displayName: 'Probability', type: 'integer', isMandatory: false, isUnique: false, isForeignKey: false },
      { columnName: 'forecast_category', displayName: 'Forecast Category', type: 'string', isMandatory: false, isUnique: false, isForeignKey: false },
      { columnName: 'expected_close_date', displayName: 'Expected Close Date', type: 'date', isMandatory: false, isUnique: false, isForeignKey: false },
      { columnName: 'actual_close_date', displayName: 'Actual Close Date', type: 'date', isMandatory: false, isUnique: false, isForeignKey: false },
      { columnName: 'lead_source', displayName: 'Lead Source', type: 'string', isMandatory: false, isUnique: false, isForeignKey: false },
      { columnName: 'next_step', displayName: 'Next Step', type: 'string', isMandatory: false, isUnique: false, isForeignKey: false },
      { columnName: 'loss_reason', displayName: 'Loss Reason', type: 'string', isMandatory: false, isUnique: false, isForeignKey: false },
      { columnName: 'owner_id', displayName: 'Owner Id', type: 'string', isMandatory: true, isUnique: false, isForeignKey: true },
    ],
  },
  {
    label: 'Opportunity Line Item',
    tableName: 'bus_opportunity_line_item',
    stem: 'opportunity_line_item',
    columns: [
      { columnName: 'id', displayName: 'Id', type: 'string', isMandatory: false, isUnique: true, isForeignKey: false },
      { columnName: 'opportunity_id', displayName: 'Opportunity Id', type: 'string', isMandatory: true, isUnique: false, isForeignKey: true },
      { columnName: 'product_id', displayName: 'Product Id', type: 'string', isMandatory: true, isUnique: false, isForeignKey: true },
      { columnName: 'quantity', displayName: 'Quantity', type: 'decimal', isMandatory: true, isUnique: false, isForeignKey: false },
      { columnName: 'unit_price', displayName: 'Unit Price', type: 'decimal', isMandatory: true, isUnique: false, isForeignKey: false },
      { columnName: 'discount_percent', displayName: 'Discount Percent', type: 'decimal', isMandatory: false, isUnique: false, isForeignKey: false },
      { columnName: 'line_total', displayName: 'Line Total', type: 'decimal', isMandatory: true, isUnique: false, isForeignKey: false },
      { columnName: 'line_description', displayName: 'Line Description', type: 'string', isMandatory: false, isUnique: false, isForeignKey: false },
    ],
  },
  {
    label: 'Product',
    tableName: 'bus_product',
    stem: 'product',
    columns: [
      { columnName: 'id', displayName: 'Id', type: 'string', isMandatory: false, isUnique: true, isForeignKey: false },
      { columnName: 'product_code', displayName: 'Product Code', type: 'string', isMandatory: true, isUnique: true, isForeignKey: false },
      { columnName: 'name', displayName: 'Name', type: 'string', isMandatory: true, isUnique: false, isForeignKey: false },
      { columnName: 'description', displayName: 'Description', type: 'text', isMandatory: false, isUnique: false, isForeignKey: false },
      { columnName: 'family', displayName: 'Family', type: 'string', isMandatory: true, isUnique: false, isForeignKey: false },
      { columnName: 'list_price', displayName: 'List Price', type: 'decimal', isMandatory: true, isUnique: false, isForeignKey: false },
      { columnName: 'unit_cost', displayName: 'Unit Cost', type: 'decimal', isMandatory: false, isUnique: false, isForeignKey: false },
      { columnName: 'billing_frequency', displayName: 'Billing Frequency', type: 'string', isMandatory: false, isUnique: false, isForeignKey: false },
      { columnName: 'is_active', displayName: 'Is Active', type: 'boolean', isMandatory: true, isUnique: false, isForeignKey: false },
    ],
  },
  {
    label: 'Quote',
    tableName: 'bus_quote',
    stem: 'quote',
    columns: [
      { columnName: 'id', displayName: 'Id', type: 'string', isMandatory: false, isUnique: true, isForeignKey: false },
      { columnName: 'quote_number', displayName: 'Quote Number', type: 'string', isMandatory: false, isUnique: true, isForeignKey: false },
      { columnName: 'opportunity_id', displayName: 'Opportunity Id', type: 'string', isMandatory: true, isUnique: false, isForeignKey: true },
      { columnName: 'account_id', displayName: 'Account Id', type: 'string', isMandatory: true, isUnique: false, isForeignKey: true },
      { columnName: 'name', displayName: 'Name', type: 'string', isMandatory: true, isUnique: false, isForeignKey: false },
      { columnName: 'status', displayName: 'Status', type: 'string', isMandatory: true, isUnique: false, isForeignKey: false },
      { columnName: 'version_number', displayName: 'Version Number', type: 'integer', isMandatory: true, isUnique: false, isForeignKey: false },
      { columnName: 'valid_until', displayName: 'Valid Until', type: 'date', isMandatory: false, isUnique: false, isForeignKey: false },
      { columnName: 'subtotal', displayName: 'Subtotal', type: 'decimal', isMandatory: true, isUnique: false, isForeignKey: false },
      { columnName: 'discount_percent', displayName: 'Discount Percent', type: 'decimal', isMandatory: false, isUnique: false, isForeignKey: false },
      { columnName: 'discount_amount', displayName: 'Discount Amount', type: 'decimal', isMandatory: false, isUnique: false, isForeignKey: false },
      { columnName: 'tax_amount', displayName: 'Tax Amount', type: 'decimal', isMandatory: false, isUnique: false, isForeignKey: false },
      { columnName: 'grand_total', displayName: 'Grand Total', type: 'decimal', isMandatory: true, isUnique: false, isForeignKey: false },
      { columnName: 'approved_by_id', displayName: 'Approved By Id', type: 'string', isMandatory: false, isUnique: false, isForeignKey: true },
      { columnName: 'approved_at', displayName: 'Approved At', type: 'datetime', isMandatory: false, isUnique: false, isForeignKey: false },
      { columnName: 'approval_notes', displayName: 'Approval Notes', type: 'text', isMandatory: false, isUnique: false, isForeignKey: false },
      { columnName: 'owner_id', displayName: 'Owner Id', type: 'string', isMandatory: true, isUnique: false, isForeignKey: true },
    ],
  },
  {
    label: 'Quote Line Item',
    tableName: 'bus_quote_line_item',
    stem: 'quote_line_item',
    columns: [
      { columnName: 'id', displayName: 'Id', type: 'string', isMandatory: false, isUnique: true, isForeignKey: false },
      { columnName: 'quote_id', displayName: 'Quote Id', type: 'string', isMandatory: true, isUnique: false, isForeignKey: true },
      { columnName: 'product_id', displayName: 'Product Id', type: 'string', isMandatory: true, isUnique: false, isForeignKey: true },
      { columnName: 'quantity', displayName: 'Quantity', type: 'decimal', isMandatory: true, isUnique: false, isForeignKey: false },
      { columnName: 'unit_price', displayName: 'Unit Price', type: 'decimal', isMandatory: true, isUnique: false, isForeignKey: false },
      { columnName: 'discount_percent', displayName: 'Discount Percent', type: 'decimal', isMandatory: false, isUnique: false, isForeignKey: false },
      { columnName: 'line_total', displayName: 'Line Total', type: 'decimal', isMandatory: true, isUnique: false, isForeignKey: false },
      { columnName: 'sort_order', displayName: 'Sort Order', type: 'integer', isMandatory: false, isUnique: false, isForeignKey: false },
    ],
  },
  {
    label: 'Contract',
    tableName: 'bus_contract',
    stem: 'contract',
    columns: [
      { columnName: 'id', displayName: 'Id', type: 'string', isMandatory: false, isUnique: true, isForeignKey: false },
      { columnName: 'contract_number', displayName: 'Contract Number', type: 'string', isMandatory: false, isUnique: true, isForeignKey: false },
      { columnName: 'account_id', displayName: 'Account Id', type: 'string', isMandatory: true, isUnique: false, isForeignKey: true },
      { columnName: 'quote_id', displayName: 'Quote Id', type: 'string', isMandatory: false, isUnique: false, isForeignKey: true },
      { columnName: 'status', displayName: 'Status', type: 'string', isMandatory: true, isUnique: false, isForeignKey: false },
      { columnName: 'start_date', displayName: 'Start Date', type: 'date', isMandatory: false, isUnique: false, isForeignKey: false },
      { columnName: 'end_date', displayName: 'End Date', type: 'date', isMandatory: false, isUnique: false, isForeignKey: false },
      { columnName: 'term_months', displayName: 'Term Months', type: 'integer', isMandatory: true, isUnique: false, isForeignKey: false },
      { columnName: 'annual_value', displayName: 'Annual Value', type: 'decimal', isMandatory: true, isUnique: false, isForeignKey: false },
      { columnName: 'auto_renew', displayName: 'Auto Renew', type: 'boolean', isMandatory: true, isUnique: false, isForeignKey: false },
      { columnName: 'renewal_notice_days', displayName: 'Renewal Notice Days', type: 'integer', isMandatory: false, isUnique: false, isForeignKey: false },
      { columnName: 'signed_by_id', displayName: 'Signed By Id', type: 'string', isMandatory: false, isUnique: false, isForeignKey: true },
      { columnName: 'signed_at', displayName: 'Signed At', type: 'datetime', isMandatory: false, isUnique: false, isForeignKey: false },
      { columnName: 'owner_id', displayName: 'Owner Id', type: 'string', isMandatory: true, isUnique: false, isForeignKey: true },
    ],
  },
  {
    label: 'Support Case',
    tableName: 'bus_support_case',
    stem: 'support_case',
    columns: [
      { columnName: 'id', displayName: 'Id', type: 'string', isMandatory: false, isUnique: true, isForeignKey: false },
      { columnName: 'case_number', displayName: 'Case Number', type: 'string', isMandatory: false, isUnique: true, isForeignKey: false },
      { columnName: 'account_id', displayName: 'Account Id', type: 'string', isMandatory: true, isUnique: false, isForeignKey: true },
      { columnName: 'contact_id', displayName: 'Contact Id', type: 'string', isMandatory: false, isUnique: false, isForeignKey: true },
      { columnName: 'sla_policy_id', displayName: 'Sla Policy Id', type: 'string', isMandatory: false, isUnique: false, isForeignKey: true },
      { columnName: 'subject', displayName: 'Subject', type: 'string', isMandatory: true, isUnique: false, isForeignKey: false },
      { columnName: 'description', displayName: 'Description', type: 'text', isMandatory: false, isUnique: false, isForeignKey: false },
      { columnName: 'case_type', displayName: 'Case Type', type: 'string', isMandatory: true, isUnique: false, isForeignKey: false },
      { columnName: 'priority', displayName: 'Priority', type: 'string', isMandatory: true, isUnique: false, isForeignKey: false },
      { columnName: 'origin', displayName: 'Origin', type: 'string', isMandatory: true, isUnique: false, isForeignKey: false },
      { columnName: 'status', displayName: 'Status', type: 'string', isMandatory: true, isUnique: false, isForeignKey: false },
      { columnName: 'first_response_due_at', displayName: 'First Response Due At', type: 'datetime', isMandatory: false, isUnique: false, isForeignKey: false },
      { columnName: 'first_response_at', displayName: 'First Response At', type: 'datetime', isMandatory: false, isUnique: false, isForeignKey: false },
      { columnName: 'resolution_due_at', displayName: 'Resolution Due At', type: 'datetime', isMandatory: false, isUnique: false, isForeignKey: false },
      { columnName: 'resolved_at', displayName: 'Resolved At', type: 'datetime', isMandatory: false, isUnique: false, isForeignKey: false },
      { columnName: 'is_sla_breached', displayName: 'Is Sla Breached', type: 'boolean', isMandatory: true, isUnique: false, isForeignKey: false },
      { columnName: 'resolution_notes', displayName: 'Resolution Notes', type: 'text', isMandatory: false, isUnique: false, isForeignKey: false },
      { columnName: 'satisfaction_score', displayName: 'Satisfaction Score', type: 'integer', isMandatory: false, isUnique: false, isForeignKey: false },
      { columnName: 'escalated_by_id', displayName: 'Escalated By Id', type: 'string', isMandatory: false, isUnique: false, isForeignKey: true },
      { columnName: 'owner_id', displayName: 'Owner Id', type: 'string', isMandatory: true, isUnique: false, isForeignKey: true },
    ],
  },
  {
    label: 'Sla Policy',
    tableName: 'bus_sla_policy',
    stem: 'sla_policy',
    columns: [
      { columnName: 'id', displayName: 'Id', type: 'string', isMandatory: false, isUnique: true, isForeignKey: false },
      { columnName: 'name', displayName: 'Name', type: 'string', isMandatory: true, isUnique: false, isForeignKey: false },
      { columnName: 'tier', displayName: 'Tier', type: 'string', isMandatory: true, isUnique: false, isForeignKey: false },
      { columnName: 'first_response_minutes', displayName: 'First Response Minutes', type: 'integer', isMandatory: true, isUnique: false, isForeignKey: false },
      { columnName: 'resolution_hours', displayName: 'Resolution Hours', type: 'integer', isMandatory: true, isUnique: false, isForeignKey: false },
      { columnName: 'business_hours_only', displayName: 'Business Hours Only', type: 'boolean', isMandatory: true, isUnique: false, isForeignKey: false },
      { columnName: 'is_active', displayName: 'Is Active', type: 'boolean', isMandatory: true, isUnique: false, isForeignKey: false },
    ],
  },
  {
    label: 'Activity',
    tableName: 'bus_activity',
    stem: 'activity',
    columns: [
      { columnName: 'id', displayName: 'Id', type: 'string', isMandatory: false, isUnique: true, isForeignKey: false },
      { columnName: 'activity_type', displayName: 'Activity Type', type: 'string', isMandatory: true, isUnique: false, isForeignKey: false },
      { columnName: 'subject', displayName: 'Subject', type: 'string', isMandatory: true, isUnique: false, isForeignKey: false },
      { columnName: 'description', displayName: 'Description', type: 'text', isMandatory: false, isUnique: false, isForeignKey: false },
      { columnName: 'status', displayName: 'Status', type: 'string', isMandatory: true, isUnique: false, isForeignKey: false },
      { columnName: 'priority', displayName: 'Priority', type: 'string', isMandatory: true, isUnique: false, isForeignKey: false },
      { columnName: 'due_at', displayName: 'Due At', type: 'datetime', isMandatory: false, isUnique: false, isForeignKey: false },
      { columnName: 'completed_at', displayName: 'Completed At', type: 'datetime', isMandatory: false, isUnique: false, isForeignKey: false },
      { columnName: 'duration_minutes', displayName: 'Duration Minutes', type: 'integer', isMandatory: false, isUnique: false, isForeignKey: false },
      { columnName: 'account_id', displayName: 'Account Id', type: 'string', isMandatory: false, isUnique: false, isForeignKey: true },
      { columnName: 'contact_id', displayName: 'Contact Id', type: 'string', isMandatory: false, isUnique: false, isForeignKey: true },
      { columnName: 'lead_id', displayName: 'Lead Id', type: 'string', isMandatory: false, isUnique: false, isForeignKey: true },
      { columnName: 'opportunity_id', displayName: 'Opportunity Id', type: 'string', isMandatory: false, isUnique: false, isForeignKey: true },
      { columnName: 'support_case_id', displayName: 'Support Case Id', type: 'string', isMandatory: false, isUnique: false, isForeignKey: true },
      { columnName: 'contract_id', displayName: 'Contract Id', type: 'string', isMandatory: false, isUnique: false, isForeignKey: true },
      { columnName: 'owner_id', displayName: 'Owner Id', type: 'string', isMandatory: true, isUnique: false, isForeignKey: true },
    ],
  },
];

const dictionaryHelp = resolveHelpModel(dictionaryHelpEntities);

function windowHelpFor(tableName: string): string | null {
  const found = dictionaryHelp.get(tableName);
  return found ? windowHelpText(found.entity, found.children) : null;
}

function tabHelpFor(tableName: string): string | null {
  const found = dictionaryHelp.get(tableName);
  return found ? tabHelpText(found.entity) : null;
}

function fieldHelpFor(tableName: string, columnName: string): string | null {
  const found = dictionaryHelp.get(tableName);
  const col = found?.entity.columns.find((c) => c.columnName === columnName);
  return found && col ? fieldHelpText(found.entity, col) : null;
}

export async function seed(db: Kysely<any>): Promise<void> {
  const now = new Date();
  const createdBy = '';

  // Truncate sys_ tables so the seed is idempotent (safe to re-run)
  await sql`TRUNCATE sys_field, sys_tab, sys_window, sys_column, sys_table, sys_field_group CASCADE`.execute(db).catch(() => {});

  // ============================================================================
  // Create Default Roles (lookup-or-create so re-runs are safe)
  // ============================================================================
  let adminRoleId: string;
  const existingAdminRole = await db.selectFrom('sys_role').select('sys_role_id').where('name', '=', 'Administrator').executeTakeFirst();
  if (existingAdminRole) {
    adminRoleId = existingAdminRole.sys_role_id;
  } else {
    adminRoleId = uuidv4();
    await db.insertInto('sys_role').values({
      sys_role_id: adminRoleId,
      name: 'Administrator',
      description: 'System administrator with full access',
      user_level: 'S',
      is_master_role: true,
      is_can_export: true,
      is_can_report: true,
      is_personal_lock: false,
      is_personal_access: false,
      max_query_records: 0,
      is_show_accounting: true,
      entity_type: 'D',
      is_active: true,
      created_by: createdBy,
      updated_by: createdBy,
      created_at: now,
      updated_at: now,
    }).execute();
  }

  let userRoleId: string;
  const existingUserRole = await db.selectFrom('sys_role').select('sys_role_id').where('name', '=', 'User').executeTakeFirst();
  if (existingUserRole) {
    userRoleId = existingUserRole.sys_role_id;
  } else {
    userRoleId = uuidv4();
    await db.insertInto('sys_role').values({
      sys_role_id: userRoleId,
      name: 'User',
      description: 'Standard user with limited access',
      user_level: 'C',
      is_master_role: false,
      is_can_export: true,
      is_can_report: true,
      is_personal_lock: false,
      is_personal_access: false,
      max_query_records: 1000,
      is_show_accounting: false,
      entity_type: 'D',
      is_active: true,
      created_by: createdBy,
      updated_by: createdBy,
      created_at: now,
      updated_at: now,
    }).execute();
  }

  // Every role that is not the Administrator gets the business windows.
  //
  // Granting only 'User' was invisible while the dictionary was served
  // unfiltered over HTTP — every role saw every window regardless. Now that a
  // shape is scoped by role, a role with no grant syncs no dictionary at all,
  // and 00_users_and_roles seeds Manager and Analyst accounts that would open
  // to an empty application.
  const businessRoles = await db
    .selectFrom('sys_role')
    .select('sys_role_id')
    .where('sys_role_id', '!=', adminRoleId)
    .where('is_active', '=', true)
    .execute();
  const businessRoleIds: string[] = businessRoles.length > 0
    ? businessRoles.map((r: { sys_role_id: string }) => r.sys_role_id)
    : [userRoleId];

  /**
   * Role ids for the names a `%%rbac … .read` directive used.
   *
   * The model writes `support_agent` and the dictionary seeds `Support Agent`,
   * so the match normalises separators and case — the same rule the runtime
   * guard applies, and for the same reason: a name that resolves in the guard
   * and not here would hide a window from the very role allowed to read it.
   */
  const normalizeRole = (value: string) =>
    String(value ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  const allRoles = await db
    .selectFrom('sys_role')
    .select(['sys_role_id', 'name'])
    .where('is_active', '=', true)
    .execute();
  const roleIdsNamed = (names: string[]): string[] => {
    const wanted = new Set(names.map(normalizeRole));
    return allRoles
      .filter((r: { name: string }) => wanted.has(normalizeRole(r.name)))
      .map((r: { sys_role_id: string }) => r.sys_role_id);
  };

  // ============================================================================
  // Create Default Admin User (lookup-or-create so re-runs are safe)
  // ============================================================================
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@admin.com';

  let adminUserId: string;
  const existingAdmin = await db.selectFrom('sys_user').select('sys_user_id').where('email', '=', adminEmail).executeTakeFirst();
  if (existingAdmin) {
    adminUserId = existingAdmin.sys_user_id;
  } else {
    adminUserId = uuidv4();
    await db.insertInto('sys_user').values({
      sys_user_id: adminUserId,
      name: 'System Administrator',
      email: adminEmail,
      password_hash: '$2b$10$rIC/7qZmzCi9F4g4OKL8wO4k5XYzJ5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5', // replaced by ensureAdminUser on first boot
      description: 'Default system administrator',
      is_system_user: true,
      is_sales_rep: false,
      login_failure_count: 0,
      is_locked: false,
      is_account_verified: true,
      default_sys_role_id: adminRoleId,
      entity_type: 'D',
      is_active: true,
      created_by: createdBy,
      updated_by: createdBy,
      created_at: now,
      updated_at: now,
    }).execute();
  }

  // Assign admin role to admin user (idempotent)
  await db.insertInto('sys_user_roles').values({
    sys_user_roles_id: uuidv4(),
    sys_user_id: adminUserId,
    sys_role_id: adminRoleId,
    entity_type: 'D',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).onConflict((oc) => oc.doNothing()).execute();

  // ============================================================================
  // Create Default Field Groups
  // ============================================================================
  const fieldGroupGeneral = uuidv4();
  const fieldGroupDetails = uuidv4();
  const fieldGroupSystem = uuidv4();

  await db.insertInto('sys_field_group').values([
    {
      sys_field_group_id: fieldGroupGeneral,
      name: 'General',
      description: 'General information fields',
      field_group_type: 'C',
      is_collapsed_by_default: false,
      entity_type: 'D',
      is_active: true,
      created_by: createdBy,
      updated_by: createdBy,
      created_at: now,
      updated_at: now,
    },
    {
      sys_field_group_id: fieldGroupDetails,
      name: 'Details',
      description: 'Detailed information fields',
      field_group_type: 'C',
      is_collapsed_by_default: true,
      entity_type: 'D',
      is_active: true,
      created_by: createdBy,
      updated_by: createdBy,
      created_at: now,
      updated_at: now,
    },
    {
      sys_field_group_id: fieldGroupSystem,
      name: 'System',
      description: 'System fields (audit trail)',
      field_group_type: 'C',
      is_collapsed_by_default: true,
      entity_type: 'D',
      is_active: true,
      created_by: createdBy,
      updated_by: createdBy,
      created_at: now,
      updated_at: now,
    },
  ]).execute();

  // ============================================================================
  // Business Entities Dictionary Entries
  // ============================================================================

  // --------------------------------------------------------------------------
  // User (bus_user)
  // --------------------------------------------------------------------------
  const userTableId = uuidv4();
  const userWindowId = uuidv4();
  const userTabId = uuidv4();

  // Create sys_window entry FIRST (sys_table references it)
  await db.insertInto('sys_window').values({
    sys_window_id: userWindowId,
    name: 'User',
    description: 'Maintain User records',
    help: windowHelpFor('bus_user'),
    window_type: 'M',
    is_sales_transaction: false,
    is_default: true,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();

  // Create sys_table entry AFTER sys_window
  await db.insertInto('sys_table').values({
    sys_table_id: userTableId,
    table_name: 'bus_user',
    name: 'User',
    description: "Someone who signs in and does the work — a rep, a manager, an agent. Every business record names one as its owner.",
    access_level: 'A',
    is_view: false,
    is_document: false,
    is_high_volume: false,
    is_changelog: true,
    sys_window_id: userWindowId,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();

  // Create sys_tab entry
  await db.insertInto('sys_tab').values({
    sys_tab_id: userTabId,
    sys_window_id: userWindowId,
    sys_table_id: userTableId,
    name: 'User',
    help: tabHelpFor('bus_user'),
    tab_level: 0,
    seq_no: 10,
    is_single_row: true,
    has_tree: false,
    is_info_tab: false,
    is_translation_tab: false,
    is_read_only: false,
    is_insert_record: true,
    is_advanced_tab: false,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();

  // Create sys_column entries
  const userColumns: Array<{ id: string; name: string; displayName: string; isKey: boolean }> = [];

  let userColumnSeqNo = 10;
  const user_id_columnId = uuidv4();
  userColumns.push({
    id: user_id_columnId,
    name: 'id',
    displayName: 'Id',
    isKey: true,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: user_id_columnId,
    sys_table_id: userTableId,
    column_name: 'id',
    name: 'Id',
    sys_reference_id: 13,
    is_key: true,
    is_parent: false,
    is_mandatory: false,
    is_updateable: false,
    is_identifier: false,
    is_selection_column: true,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: false,
    seq_no: userColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  userColumnSeqNo += 10;
  const user_email_columnId = uuidv4();
  userColumns.push({
    id: user_email_columnId,
    name: 'email',
    displayName: 'Email',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: user_email_columnId,
    sys_table_id: userTableId,
    column_name: 'email',
    name: 'Email',
    sys_reference_id: 30,
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: true,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: userColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  userColumnSeqNo += 10;
  const user_firstName_columnId = uuidv4();
  userColumns.push({
    id: user_firstName_columnId,
    name: 'first_name',
    displayName: 'First Name',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: user_firstName_columnId,
    sys_table_id: userTableId,
    column_name: 'first_name',
    name: 'First Name',
    sys_reference_id: 10,
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: true,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: userColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  userColumnSeqNo += 10;
  const user_lastName_columnId = uuidv4();
  userColumns.push({
    id: user_lastName_columnId,
    name: 'last_name',
    displayName: 'Last Name',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: user_lastName_columnId,
    sys_table_id: userTableId,
    column_name: 'last_name',
    name: 'Last Name',
    sys_reference_id: 10,
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: true,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: userColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  userColumnSeqNo += 10;
  const user_role_columnId = uuidv4();
  userColumns.push({
    id: user_role_columnId,
    name: 'role',
    displayName: 'Role',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: user_role_columnId,
    sys_table_id: userTableId,
    column_name: 'role',
    name: 'Role',
    sys_reference_id: 1025,
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: userColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  userColumnSeqNo += 10;
  const user_jobTitle_columnId = uuidv4();
  userColumns.push({
    id: user_jobTitle_columnId,
    name: 'job_title',
    displayName: 'Job Title',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: user_jobTitle_columnId,
    sys_table_id: userTableId,
    column_name: 'job_title',
    name: 'Job Title',
    sys_reference_id: 10,
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: userColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  userColumnSeqNo += 10;
  const user_phone_columnId = uuidv4();
  userColumns.push({
    id: user_phone_columnId,
    name: 'phone',
    displayName: 'Phone',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: user_phone_columnId,
    sys_table_id: userTableId,
    column_name: 'phone',
    name: 'Phone',
    sys_reference_id: 31,
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: userColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  userColumnSeqNo += 10;
  const user_teamId_columnId = uuidv4();
  userColumns.push({
    id: user_teamId_columnId,
    name: 'team_id',
    displayName: 'Team Id',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: user_teamId_columnId,
    sys_table_id: userTableId,
    column_name: 'team_id',
    name: 'Team Id',
    sys_reference_id: 19,
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: userColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  userColumnSeqNo += 10;
  const user_quotaAnnual_columnId = uuidv4();
  userColumns.push({
    id: user_quotaAnnual_columnId,
    name: 'quota_annual',
    displayName: 'Quota Annual',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: user_quotaAnnual_columnId,
    sys_table_id: userTableId,
    column_name: 'quota_annual',
    name: 'Quota Annual',
    sys_reference_id: 12,
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: userColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  userColumnSeqNo += 10;
  const user_isActive_columnId = uuidv4();
  userColumns.push({
    id: user_isActive_columnId,
    name: 'is_active',
    displayName: 'Is Active',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: user_isActive_columnId,
    sys_table_id: userTableId,
    column_name: 'is_active',
    name: 'Is Active',
    sys_reference_id: 20,
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: userColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  userColumnSeqNo += 10;
  const user_lastLogin_columnId = uuidv4();
  userColumns.push({
    id: user_lastLogin_columnId,
    name: 'last_login',
    displayName: 'Last Login',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: user_lastLogin_columnId,
    sys_table_id: userTableId,
    column_name: 'last_login',
    name: 'Last Login',
    sys_reference_id: 16,
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: userColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  userColumnSeqNo += 10;

  // Create sys_field entries with sequential seq_no
  for (let i = 0; i < userColumns.length; i++) {
    const col = userColumns[i];
    await db.insertInto('sys_field').values({
      sys_field_id: uuidv4(),
      sys_tab_id: userTabId,
      sys_column_id: col.id,
      sys_field_group_id: i < 3 ? fieldGroupGeneral : fieldGroupDetails,
      name: col.displayName,
      help: fieldHelpFor('bus_user', col.name),
      seq_no: (i + 1) * 10,
      seq_no_grid: (i + 1) * 10,
      is_displayed: !col.isKey,
      is_displayed_grid: !col.isKey && i < 8, // show first 8 non-pk columns in grid
      is_read_only: ['created_at', 'updated_at', 'deleted_at'].includes(col.name),
      is_encrypted: false,
      is_same_line: false,
      is_heading: false,
      is_field_only: false,
      entity_type: 'U',
      is_active: true,
      created_by: createdBy,
      updated_by: createdBy,
      created_at: now,
      updated_at: now,
    }).execute();
  }

  // Grant access to admin role
  await db.insertInto('sys_access').values({
    sys_access_id: uuidv4(),
    sys_role_id: adminRoleId,
    sys_table_id: userTableId,
    sys_window_id: userWindowId,
    access_type_table: 'W',
    is_read_only: false,
    is_exclude: false,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();

  // Grant read access.
  //
  // To the roles the model says own this entity, when it restricted `read` on
  // it — that is what makes a functional role's application *its* application
  // rather than the whole system with most of it refusing to open. To every
  // role otherwise, which is the behaviour of every model that declares no read
  // restriction, and therefore of every model written before this existed.
  const userRoleIds = roleIdsNamed(['sales_manager', 'sales_ops', 'support_manager']);
  for (const roleId of userRoleIds) {
    await db.insertInto('sys_access').values({
      sys_access_id: uuidv4(),
      sys_role_id: roleId,
      sys_table_id: userTableId,
      sys_window_id: userWindowId,
      access_type_table: 'R',
      is_read_only: true,
      is_exclude: false,
      entity_type: 'U',
      is_active: true,
      created_by: createdBy,
      updated_by: createdBy,
      created_at: now,
      updated_at: now,
    }).execute();
  }

  console.log('✓ Created dictionary entries for User');

  // --------------------------------------------------------------------------
  // Team (bus_team)
  // --------------------------------------------------------------------------
  const teamTableId = uuidv4();
  const teamWindowId = uuidv4();
  const teamTabId = uuidv4();

  // Create sys_window entry FIRST (sys_table references it)
  await db.insertInto('sys_window').values({
    sys_window_id: teamWindowId,
    name: 'Team',
    description: 'Maintain Team records',
    help: windowHelpFor('bus_team'),
    window_type: 'M',
    is_sales_transaction: false,
    is_default: true,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();

  // Create sys_table entry AFTER sys_window
  await db.insertInto('sys_table').values({
    sys_table_id: teamTableId,
    table_name: 'bus_team',
    name: 'Team',
    description: "A group of users under one manager, carrying a shared quota. Teams are how sales targets roll up.",
    access_level: 'A',
    is_view: false,
    is_document: false,
    is_high_volume: false,
    is_changelog: true,
    sys_window_id: teamWindowId,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();

  // Create sys_tab entry
  await db.insertInto('sys_tab').values({
    sys_tab_id: teamTabId,
    sys_window_id: teamWindowId,
    sys_table_id: teamTableId,
    name: 'Team',
    help: tabHelpFor('bus_team'),
    tab_level: 0,
    seq_no: 10,
    is_single_row: true,
    has_tree: false,
    is_info_tab: false,
    is_translation_tab: false,
    is_read_only: false,
    is_insert_record: true,
    is_advanced_tab: false,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();

  // Create sys_column entries
  const teamColumns: Array<{ id: string; name: string; displayName: string; isKey: boolean }> = [];

  let teamColumnSeqNo = 10;
  const team_id_columnId = uuidv4();
  teamColumns.push({
    id: team_id_columnId,
    name: 'id',
    displayName: 'Id',
    isKey: true,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: team_id_columnId,
    sys_table_id: teamTableId,
    column_name: 'id',
    name: 'Id',
    sys_reference_id: 13,
    is_key: true,
    is_parent: false,
    is_mandatory: false,
    is_updateable: false,
    is_identifier: false,
    is_selection_column: true,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: false,
    seq_no: teamColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  teamColumnSeqNo += 10;
  const team_name_columnId = uuidv4();
  teamColumns.push({
    id: team_name_columnId,
    name: 'name',
    displayName: 'Name',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: team_name_columnId,
    sys_table_id: teamTableId,
    column_name: 'name',
    name: 'Name',
    sys_reference_id: 10,
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: true,
    is_selection_column: true,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: teamColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  teamColumnSeqNo += 10;
  const team_managerId_columnId = uuidv4();
  teamColumns.push({
    id: team_managerId_columnId,
    name: 'manager_id',
    displayName: 'Manager Id',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: team_managerId_columnId,
    sys_table_id: teamTableId,
    column_name: 'manager_id',
    name: 'Manager Id',
    sys_reference_id: 19,
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: teamColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  teamColumnSeqNo += 10;
  const team_region_columnId = uuidv4();
  teamColumns.push({
    id: team_region_columnId,
    name: 'region',
    displayName: 'Region',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: team_region_columnId,
    sys_table_id: teamTableId,
    column_name: 'region',
    name: 'Region',
    sys_reference_id: 10,
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: teamColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  teamColumnSeqNo += 10;
  const team_quotaAnnual_columnId = uuidv4();
  teamColumns.push({
    id: team_quotaAnnual_columnId,
    name: 'quota_annual',
    displayName: 'Quota Annual',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: team_quotaAnnual_columnId,
    sys_table_id: teamTableId,
    column_name: 'quota_annual',
    name: 'Quota Annual',
    sys_reference_id: 12,
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: teamColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  teamColumnSeqNo += 10;
  const team_isActive_columnId = uuidv4();
  teamColumns.push({
    id: team_isActive_columnId,
    name: 'is_active',
    displayName: 'Is Active',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: team_isActive_columnId,
    sys_table_id: teamTableId,
    column_name: 'is_active',
    name: 'Is Active',
    sys_reference_id: 20,
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: teamColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  teamColumnSeqNo += 10;

  // Create sys_field entries with sequential seq_no
  for (let i = 0; i < teamColumns.length; i++) {
    const col = teamColumns[i];
    await db.insertInto('sys_field').values({
      sys_field_id: uuidv4(),
      sys_tab_id: teamTabId,
      sys_column_id: col.id,
      sys_field_group_id: i < 3 ? fieldGroupGeneral : fieldGroupDetails,
      name: col.displayName,
      help: fieldHelpFor('bus_team', col.name),
      seq_no: (i + 1) * 10,
      seq_no_grid: (i + 1) * 10,
      is_displayed: !col.isKey,
      is_displayed_grid: !col.isKey && i < 8, // show first 8 non-pk columns in grid
      is_read_only: ['created_at', 'updated_at', 'deleted_at'].includes(col.name),
      is_encrypted: false,
      is_same_line: false,
      is_heading: false,
      is_field_only: false,
      entity_type: 'U',
      is_active: true,
      created_by: createdBy,
      updated_by: createdBy,
      created_at: now,
      updated_at: now,
    }).execute();
  }

  // Grant access to admin role
  await db.insertInto('sys_access').values({
    sys_access_id: uuidv4(),
    sys_role_id: adminRoleId,
    sys_table_id: teamTableId,
    sys_window_id: teamWindowId,
    access_type_table: 'W',
    is_read_only: false,
    is_exclude: false,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();

  // Grant read access.
  //
  // To the roles the model says own this entity, when it restricted `read` on
  // it — that is what makes a functional role's application *its* application
  // rather than the whole system with most of it refusing to open. To every
  // role otherwise, which is the behaviour of every model that declares no read
  // restriction, and therefore of every model written before this existed.
  const teamRoleIds = roleIdsNamed(['sales_manager', 'sales_ops']);
  for (const roleId of teamRoleIds) {
    await db.insertInto('sys_access').values({
      sys_access_id: uuidv4(),
      sys_role_id: roleId,
      sys_table_id: teamTableId,
      sys_window_id: teamWindowId,
      access_type_table: 'R',
      is_read_only: true,
      is_exclude: false,
      entity_type: 'U',
      is_active: true,
      created_by: createdBy,
      updated_by: createdBy,
      created_at: now,
      updated_at: now,
    }).execute();
  }

  console.log('✓ Created dictionary entries for Team');

  // --------------------------------------------------------------------------
  // Territory (bus_territory)
  // --------------------------------------------------------------------------
  const territoryTableId = uuidv4();
  const territoryWindowId = uuidv4();
  const territoryTabId = uuidv4();

  // Create sys_window entry FIRST (sys_table references it)
  await db.insertInto('sys_window').values({
    sys_window_id: territoryWindowId,
    name: 'Territory',
    description: 'Maintain Territory records',
    help: windowHelpFor('bus_territory'),
    window_type: 'M',
    is_sales_transaction: false,
    is_default: true,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();

  // Create sys_table entry AFTER sys_window
  await db.insertInto('sys_table').values({
    sys_table_id: territoryTableId,
    table_name: 'bus_territory',
    name: 'Territory',
    description: "A slice of the market — a region, a country, a company-size band — that accounts are assigned to.",
    access_level: 'A',
    is_view: false,
    is_document: false,
    is_high_volume: false,
    is_changelog: true,
    sys_window_id: territoryWindowId,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();

  // Create sys_tab entry
  await db.insertInto('sys_tab').values({
    sys_tab_id: territoryTabId,
    sys_window_id: territoryWindowId,
    sys_table_id: territoryTableId,
    name: 'Territory',
    help: tabHelpFor('bus_territory'),
    tab_level: 0,
    seq_no: 10,
    is_single_row: true,
    has_tree: false,
    is_info_tab: false,
    is_translation_tab: false,
    is_read_only: false,
    is_insert_record: true,
    is_advanced_tab: false,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();

  // Create sys_column entries
  const territoryColumns: Array<{ id: string; name: string; displayName: string; isKey: boolean }> = [];

  let territoryColumnSeqNo = 10;
  const territory_id_columnId = uuidv4();
  territoryColumns.push({
    id: territory_id_columnId,
    name: 'id',
    displayName: 'Id',
    isKey: true,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: territory_id_columnId,
    sys_table_id: territoryTableId,
    column_name: 'id',
    name: 'Id',
    sys_reference_id: 13,
    is_key: true,
    is_parent: false,
    is_mandatory: false,
    is_updateable: false,
    is_identifier: false,
    is_selection_column: true,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: false,
    seq_no: territoryColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  territoryColumnSeqNo += 10;
  const territory_name_columnId = uuidv4();
  territoryColumns.push({
    id: territory_name_columnId,
    name: 'name',
    displayName: 'Name',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: territory_name_columnId,
    sys_table_id: territoryTableId,
    column_name: 'name',
    name: 'Name',
    sys_reference_id: 10,
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: true,
    is_selection_column: true,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: territoryColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  territoryColumnSeqNo += 10;
  const territory_region_columnId = uuidv4();
  territoryColumns.push({
    id: territory_region_columnId,
    name: 'region',
    displayName: 'Region',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: territory_region_columnId,
    sys_table_id: territoryTableId,
    column_name: 'region',
    name: 'Region',
    sys_reference_id: 10,
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: territoryColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  territoryColumnSeqNo += 10;
  const territory_countryCode_columnId = uuidv4();
  territoryColumns.push({
    id: territory_countryCode_columnId,
    name: 'country_code',
    displayName: 'Country Code',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: territory_countryCode_columnId,
    sys_table_id: territoryTableId,
    column_name: 'country_code',
    name: 'Country Code',
    sys_reference_id: 10,
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: territoryColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  territoryColumnSeqNo += 10;
  const territory_managerId_columnId = uuidv4();
  territoryColumns.push({
    id: territory_managerId_columnId,
    name: 'manager_id',
    displayName: 'Manager Id',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: territory_managerId_columnId,
    sys_table_id: territoryTableId,
    column_name: 'manager_id',
    name: 'Manager Id',
    sys_reference_id: 19,
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: territoryColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  territoryColumnSeqNo += 10;
  const territory_employeeCountFloor_columnId = uuidv4();
  territoryColumns.push({
    id: territory_employeeCountFloor_columnId,
    name: 'employee_count_floor',
    displayName: 'Employee Count Floor',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: territory_employeeCountFloor_columnId,
    sys_table_id: territoryTableId,
    column_name: 'employee_count_floor',
    name: 'Employee Count Floor',
    sys_reference_id: 11,
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: territoryColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  territoryColumnSeqNo += 10;
  const territory_employeeCountCeiling_columnId = uuidv4();
  territoryColumns.push({
    id: territory_employeeCountCeiling_columnId,
    name: 'employee_count_ceiling',
    displayName: 'Employee Count Ceiling',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: territory_employeeCountCeiling_columnId,
    sys_table_id: territoryTableId,
    column_name: 'employee_count_ceiling',
    name: 'Employee Count Ceiling',
    sys_reference_id: 11,
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: territoryColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  territoryColumnSeqNo += 10;
  const territory_isActive_columnId = uuidv4();
  territoryColumns.push({
    id: territory_isActive_columnId,
    name: 'is_active',
    displayName: 'Is Active',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: territory_isActive_columnId,
    sys_table_id: territoryTableId,
    column_name: 'is_active',
    name: 'Is Active',
    sys_reference_id: 20,
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: territoryColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  territoryColumnSeqNo += 10;

  // Create sys_field entries with sequential seq_no
  for (let i = 0; i < territoryColumns.length; i++) {
    const col = territoryColumns[i];
    await db.insertInto('sys_field').values({
      sys_field_id: uuidv4(),
      sys_tab_id: territoryTabId,
      sys_column_id: col.id,
      sys_field_group_id: i < 3 ? fieldGroupGeneral : fieldGroupDetails,
      name: col.displayName,
      help: fieldHelpFor('bus_territory', col.name),
      seq_no: (i + 1) * 10,
      seq_no_grid: (i + 1) * 10,
      is_displayed: !col.isKey,
      is_displayed_grid: !col.isKey && i < 8, // show first 8 non-pk columns in grid
      is_read_only: ['created_at', 'updated_at', 'deleted_at'].includes(col.name),
      is_encrypted: false,
      is_same_line: false,
      is_heading: false,
      is_field_only: false,
      entity_type: 'U',
      is_active: true,
      created_by: createdBy,
      updated_by: createdBy,
      created_at: now,
      updated_at: now,
    }).execute();
  }

  // Grant access to admin role
  await db.insertInto('sys_access').values({
    sys_access_id: uuidv4(),
    sys_role_id: adminRoleId,
    sys_table_id: territoryTableId,
    sys_window_id: territoryWindowId,
    access_type_table: 'W',
    is_read_only: false,
    is_exclude: false,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();

  // Grant read access.
  //
  // To the roles the model says own this entity, when it restricted `read` on
  // it — that is what makes a functional role's application *its* application
  // rather than the whole system with most of it refusing to open. To every
  // role otherwise, which is the behaviour of every model that declares no read
  // restriction, and therefore of every model written before this existed.
  const territoryRoleIds = roleIdsNamed(['sales_manager', 'sales_ops']);
  for (const roleId of territoryRoleIds) {
    await db.insertInto('sys_access').values({
      sys_access_id: uuidv4(),
      sys_role_id: roleId,
      sys_table_id: territoryTableId,
      sys_window_id: territoryWindowId,
      access_type_table: 'R',
      is_read_only: true,
      is_exclude: false,
      entity_type: 'U',
      is_active: true,
      created_by: createdBy,
      updated_by: createdBy,
      created_at: now,
      updated_at: now,
    }).execute();
  }

  console.log('✓ Created dictionary entries for Territory');

  // --------------------------------------------------------------------------
  // Account (bus_account)
  // --------------------------------------------------------------------------
  const accountTableId = uuidv4();
  const accountWindowId = uuidv4();
  const accountTabId = uuidv4();

  // Create sys_window entry FIRST (sys_table references it)
  await db.insertInto('sys_window').values({
    sys_window_id: accountWindowId,
    name: 'Account',
    description: 'Maintain Account records',
    help: windowHelpFor('bus_account'),
    window_type: 'M',
    is_sales_transaction: false,
    is_default: true,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();

  // Create sys_table entry AFTER sys_window
  await db.insertInto('sys_table').values({
    sys_table_id: accountTableId,
    table_name: 'bus_account',
    name: 'Account',
    description: "A company you sell to or support. Almost everything else in this application hangs off an account.",
    access_level: 'A',
    is_view: false,
    is_document: false,
    is_high_volume: false,
    is_changelog: true,
    sys_window_id: accountWindowId,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();

  // Create sys_tab entry
  await db.insertInto('sys_tab').values({
    sys_tab_id: accountTabId,
    sys_window_id: accountWindowId,
    sys_table_id: accountTableId,
    name: 'Account',
    help: tabHelpFor('bus_account'),
    tab_level: 0,
    seq_no: 10,
    is_single_row: true,
    has_tree: false,
    is_info_tab: false,
    is_translation_tab: false,
    is_read_only: false,
    is_insert_record: true,
    is_advanced_tab: false,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();

  // Create sys_column entries
  const accountColumns: Array<{ id: string; name: string; displayName: string; isKey: boolean }> = [];

  let accountColumnSeqNo = 10;
  const account_id_columnId = uuidv4();
  accountColumns.push({
    id: account_id_columnId,
    name: 'id',
    displayName: 'Id',
    isKey: true,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: account_id_columnId,
    sys_table_id: accountTableId,
    column_name: 'id',
    name: 'Id',
    sys_reference_id: 13,
    is_key: true,
    is_parent: false,
    is_mandatory: false,
    is_updateable: false,
    is_identifier: false,
    is_selection_column: true,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: false,
    seq_no: accountColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  accountColumnSeqNo += 10;
  const account_name_columnId = uuidv4();
  accountColumns.push({
    id: account_name_columnId,
    name: 'name',
    displayName: 'Name',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: account_name_columnId,
    sys_table_id: accountTableId,
    column_name: 'name',
    name: 'Name',
    sys_reference_id: 10,
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: true,
    is_selection_column: true,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: accountColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  accountColumnSeqNo += 10;
  const account_accountNumber_columnId = uuidv4();
  accountColumns.push({
    id: account_accountNumber_columnId,
    name: 'account_number',
    displayName: 'Account Number',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: account_accountNumber_columnId,
    sys_table_id: accountTableId,
    column_name: 'account_number',
    name: 'Account Number',
    sys_reference_id: 10,
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: true,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: accountColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  accountColumnSeqNo += 10;
  const account_accountType_columnId = uuidv4();
  accountColumns.push({
    id: account_accountType_columnId,
    name: 'account_type',
    displayName: 'Account Type',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: account_accountType_columnId,
    sys_table_id: accountTableId,
    column_name: 'account_type',
    name: 'Account Type',
    sys_reference_id: 1002,
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: accountColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  accountColumnSeqNo += 10;
  const account_tier_columnId = uuidv4();
  accountColumns.push({
    id: account_tier_columnId,
    name: 'tier',
    displayName: 'Tier',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: account_tier_columnId,
    sys_table_id: accountTableId,
    column_name: 'tier',
    name: 'Tier',
    sys_reference_id: 1001,
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: accountColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  accountColumnSeqNo += 10;
  const account_industry_columnId = uuidv4();
  accountColumns.push({
    id: account_industry_columnId,
    name: 'industry',
    displayName: 'Industry',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: account_industry_columnId,
    sys_table_id: accountTableId,
    column_name: 'industry',
    name: 'Industry',
    sys_reference_id: 1016,
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: accountColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  accountColumnSeqNo += 10;
  const account_website_columnId = uuidv4();
  accountColumns.push({
    id: account_website_columnId,
    name: 'website',
    displayName: 'Website',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: account_website_columnId,
    sys_table_id: accountTableId,
    column_name: 'website',
    name: 'Website',
    sys_reference_id: 24,
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: accountColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  accountColumnSeqNo += 10;
  const account_phone_columnId = uuidv4();
  accountColumns.push({
    id: account_phone_columnId,
    name: 'phone',
    displayName: 'Phone',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: account_phone_columnId,
    sys_table_id: accountTableId,
    column_name: 'phone',
    name: 'Phone',
    sys_reference_id: 31,
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: accountColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  accountColumnSeqNo += 10;
  const account_billingStreet_columnId = uuidv4();
  accountColumns.push({
    id: account_billingStreet_columnId,
    name: 'billing_street',
    displayName: 'Billing Street',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: account_billingStreet_columnId,
    sys_table_id: accountTableId,
    column_name: 'billing_street',
    name: 'Billing Street',
    sys_reference_id: 10,
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: accountColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  accountColumnSeqNo += 10;
  const account_billingCity_columnId = uuidv4();
  accountColumns.push({
    id: account_billingCity_columnId,
    name: 'billing_city',
    displayName: 'Billing City',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: account_billingCity_columnId,
    sys_table_id: accountTableId,
    column_name: 'billing_city',
    name: 'Billing City',
    sys_reference_id: 10,
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: accountColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  accountColumnSeqNo += 10;
  const account_billingPostalCode_columnId = uuidv4();
  accountColumns.push({
    id: account_billingPostalCode_columnId,
    name: 'billing_postal_code',
    displayName: 'Billing Postal Code',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: account_billingPostalCode_columnId,
    sys_table_id: accountTableId,
    column_name: 'billing_postal_code',
    name: 'Billing Postal Code',
    sys_reference_id: 10,
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: accountColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  accountColumnSeqNo += 10;
  const account_billingCountry_columnId = uuidv4();
  accountColumns.push({
    id: account_billingCountry_columnId,
    name: 'billing_country',
    displayName: 'Billing Country',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: account_billingCountry_columnId,
    sys_table_id: accountTableId,
    column_name: 'billing_country',
    name: 'Billing Country',
    sys_reference_id: 10,
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: accountColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  accountColumnSeqNo += 10;
  const account_employeeCount_columnId = uuidv4();
  accountColumns.push({
    id: account_employeeCount_columnId,
    name: 'employee_count',
    displayName: 'Employee Count',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: account_employeeCount_columnId,
    sys_table_id: accountTableId,
    column_name: 'employee_count',
    name: 'Employee Count',
    sys_reference_id: 11,
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: accountColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  accountColumnSeqNo += 10;
  const account_annualRevenue_columnId = uuidv4();
  accountColumns.push({
    id: account_annualRevenue_columnId,
    name: 'annual_revenue',
    displayName: 'Annual Revenue',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: account_annualRevenue_columnId,
    sys_table_id: accountTableId,
    column_name: 'annual_revenue',
    name: 'Annual Revenue',
    sys_reference_id: 12,
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: accountColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  accountColumnSeqNo += 10;
  const account_healthScore_columnId = uuidv4();
  accountColumns.push({
    id: account_healthScore_columnId,
    name: 'health_score',
    displayName: 'Health Score',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: account_healthScore_columnId,
    sys_table_id: accountTableId,
    column_name: 'health_score',
    name: 'Health Score',
    sys_reference_id: 11,
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: accountColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  accountColumnSeqNo += 10;
  const account_territoryId_columnId = uuidv4();
  accountColumns.push({
    id: account_territoryId_columnId,
    name: 'territory_id',
    displayName: 'Territory Id',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: account_territoryId_columnId,
    sys_table_id: accountTableId,
    column_name: 'territory_id',
    name: 'Territory Id',
    sys_reference_id: 19,
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: accountColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  accountColumnSeqNo += 10;
  const account_slaPolicyId_columnId = uuidv4();
  accountColumns.push({
    id: account_slaPolicyId_columnId,
    name: 'sla_policy_id',
    displayName: 'Sla Policy Id',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: account_slaPolicyId_columnId,
    sys_table_id: accountTableId,
    column_name: 'sla_policy_id',
    name: 'Sla Policy Id',
    sys_reference_id: 19,
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: accountColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  accountColumnSeqNo += 10;
  const account_status_columnId = uuidv4();
  accountColumns.push({
    id: account_status_columnId,
    name: 'status',
    displayName: 'Status',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: account_status_columnId,
    sys_table_id: accountTableId,
    column_name: 'status',
    name: 'Status',
    sys_reference_id: 1000,
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: accountColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  accountColumnSeqNo += 10;
  const account_ownerId_columnId = uuidv4();
  accountColumns.push({
    id: account_ownerId_columnId,
    name: 'owner_id',
    displayName: 'Owner Id',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: account_ownerId_columnId,
    sys_table_id: accountTableId,
    column_name: 'owner_id',
    name: 'Owner Id',
    sys_reference_id: 19,
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: accountColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  accountColumnSeqNo += 10;

  // Create sys_field entries with sequential seq_no
  for (let i = 0; i < accountColumns.length; i++) {
    const col = accountColumns[i];
    await db.insertInto('sys_field').values({
      sys_field_id: uuidv4(),
      sys_tab_id: accountTabId,
      sys_column_id: col.id,
      sys_field_group_id: i < 3 ? fieldGroupGeneral : fieldGroupDetails,
      name: col.displayName,
      help: fieldHelpFor('bus_account', col.name),
      seq_no: (i + 1) * 10,
      seq_no_grid: (i + 1) * 10,
      is_displayed: !col.isKey,
      is_displayed_grid: !col.isKey && i < 8, // show first 8 non-pk columns in grid
      is_read_only: ['created_at', 'updated_at', 'deleted_at'].includes(col.name),
      is_encrypted: false,
      is_same_line: false,
      is_heading: false,
      is_field_only: false,
      entity_type: 'U',
      is_active: true,
      created_by: createdBy,
      updated_by: createdBy,
      created_at: now,
      updated_at: now,
    }).execute();
  }

  // Grant access to admin role
  await db.insertInto('sys_access').values({
    sys_access_id: uuidv4(),
    sys_role_id: adminRoleId,
    sys_table_id: accountTableId,
    sys_window_id: accountWindowId,
    access_type_table: 'W',
    is_read_only: false,
    is_exclude: false,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();

  // Grant read access.
  //
  // To the roles the model says own this entity, when it restricted `read` on
  // it — that is what makes a functional role's application *its* application
  // rather than the whole system with most of it refusing to open. To every
  // role otherwise, which is the behaviour of every model that declares no read
  // restriction, and therefore of every model written before this existed.
  const accountRoleIds = roleIdsNamed(['account_executive', 'marketing_manager', 'sales_manager', 'sales_ops', 'sales_rep', 'support_agent', 'support_manager']);
  for (const roleId of accountRoleIds) {
    await db.insertInto('sys_access').values({
      sys_access_id: uuidv4(),
      sys_role_id: roleId,
      sys_table_id: accountTableId,
      sys_window_id: accountWindowId,
      access_type_table: 'R',
      is_read_only: true,
      is_exclude: false,
      entity_type: 'U',
      is_active: true,
      created_by: createdBy,
      updated_by: createdBy,
      created_at: now,
      updated_at: now,
    }).execute();
  }

  console.log('✓ Created dictionary entries for Account');

  // --------------------------------------------------------------------------
  // Contact (bus_contact)
  // --------------------------------------------------------------------------
  const contactTableId = uuidv4();
  const contactWindowId = uuidv4();
  const contactTabId = uuidv4();

  // Create sys_window entry FIRST (sys_table references it)
  await db.insertInto('sys_window').values({
    sys_window_id: contactWindowId,
    name: 'Contact',
    description: 'Maintain Contact records',
    help: windowHelpFor('bus_contact'),
    window_type: 'M',
    is_sales_transaction: false,
    is_default: true,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();

  // Create sys_table entry AFTER sys_window
  await db.insertInto('sys_table').values({
    sys_table_id: contactTableId,
    table_name: 'bus_contact',
    name: 'Contact',
    description: "A person at an account. Contacts are who you talk to; accounts are who you invoice.",
    access_level: 'A',
    is_view: false,
    is_document: false,
    is_high_volume: false,
    is_changelog: true,
    sys_window_id: contactWindowId,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();

  // Create sys_tab entry
  await db.insertInto('sys_tab').values({
    sys_tab_id: contactTabId,
    sys_window_id: contactWindowId,
    sys_table_id: contactTableId,
    name: 'Contact',
    help: tabHelpFor('bus_contact'),
    tab_level: 0,
    seq_no: 10,
    is_single_row: true,
    has_tree: false,
    is_info_tab: false,
    is_translation_tab: false,
    is_read_only: false,
    is_insert_record: true,
    is_advanced_tab: false,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();

  // Create sys_column entries
  const contactColumns: Array<{ id: string; name: string; displayName: string; isKey: boolean }> = [];

  let contactColumnSeqNo = 10;
  const contact_id_columnId = uuidv4();
  contactColumns.push({
    id: contact_id_columnId,
    name: 'id',
    displayName: 'Id',
    isKey: true,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: contact_id_columnId,
    sys_table_id: contactTableId,
    column_name: 'id',
    name: 'Id',
    sys_reference_id: 13,
    is_key: true,
    is_parent: false,
    is_mandatory: false,
    is_updateable: false,
    is_identifier: false,
    is_selection_column: true,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: false,
    seq_no: contactColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  contactColumnSeqNo += 10;
  const contact_accountId_columnId = uuidv4();
  contactColumns.push({
    id: contact_accountId_columnId,
    name: 'account_id',
    displayName: 'Account Id',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: contact_accountId_columnId,
    sys_table_id: contactTableId,
    column_name: 'account_id',
    name: 'Account Id',
    sys_reference_id: 19,
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: contactColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  contactColumnSeqNo += 10;
  const contact_firstName_columnId = uuidv4();
  contactColumns.push({
    id: contact_firstName_columnId,
    name: 'first_name',
    displayName: 'First Name',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: contact_firstName_columnId,
    sys_table_id: contactTableId,
    column_name: 'first_name',
    name: 'First Name',
    sys_reference_id: 10,
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: true,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: contactColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  contactColumnSeqNo += 10;
  const contact_lastName_columnId = uuidv4();
  contactColumns.push({
    id: contact_lastName_columnId,
    name: 'last_name',
    displayName: 'Last Name',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: contact_lastName_columnId,
    sys_table_id: contactTableId,
    column_name: 'last_name',
    name: 'Last Name',
    sys_reference_id: 10,
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: true,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: contactColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  contactColumnSeqNo += 10;
  const contact_email_columnId = uuidv4();
  contactColumns.push({
    id: contact_email_columnId,
    name: 'email',
    displayName: 'Email',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: contact_email_columnId,
    sys_table_id: contactTableId,
    column_name: 'email',
    name: 'Email',
    sys_reference_id: 30,
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: true,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: contactColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  contactColumnSeqNo += 10;
  const contact_phone_columnId = uuidv4();
  contactColumns.push({
    id: contact_phone_columnId,
    name: 'phone',
    displayName: 'Phone',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: contact_phone_columnId,
    sys_table_id: contactTableId,
    column_name: 'phone',
    name: 'Phone',
    sys_reference_id: 31,
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: contactColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  contactColumnSeqNo += 10;
  const contact_mobile_columnId = uuidv4();
  contactColumns.push({
    id: contact_mobile_columnId,
    name: 'mobile',
    displayName: 'Mobile',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: contact_mobile_columnId,
    sys_table_id: contactTableId,
    column_name: 'mobile',
    name: 'Mobile',
    sys_reference_id: 31,
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: contactColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  contactColumnSeqNo += 10;
  const contact_jobTitle_columnId = uuidv4();
  contactColumns.push({
    id: contact_jobTitle_columnId,
    name: 'job_title',
    displayName: 'Job Title',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: contact_jobTitle_columnId,
    sys_table_id: contactTableId,
    column_name: 'job_title',
    name: 'Job Title',
    sys_reference_id: 10,
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: contactColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  contactColumnSeqNo += 10;
  const contact_department_columnId = uuidv4();
  contactColumns.push({
    id: contact_department_columnId,
    name: 'department',
    displayName: 'Department',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: contact_department_columnId,
    sys_table_id: contactTableId,
    column_name: 'department',
    name: 'Department',
    sys_reference_id: 10,
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: contactColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  contactColumnSeqNo += 10;
  const contact_leadSource_columnId = uuidv4();
  contactColumns.push({
    id: contact_leadSource_columnId,
    name: 'lead_source',
    displayName: 'Lead Source',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: contact_leadSource_columnId,
    sys_table_id: contactTableId,
    column_name: 'lead_source',
    name: 'Lead Source',
    sys_reference_id: 1018,
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: contactColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  contactColumnSeqNo += 10;
  const contact_isPrimary_columnId = uuidv4();
  contactColumns.push({
    id: contact_isPrimary_columnId,
    name: 'is_primary',
    displayName: 'Is Primary',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: contact_isPrimary_columnId,
    sys_table_id: contactTableId,
    column_name: 'is_primary',
    name: 'Is Primary',
    sys_reference_id: 20,
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: contactColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  contactColumnSeqNo += 10;
  const contact_emailOptOut_columnId = uuidv4();
  contactColumns.push({
    id: contact_emailOptOut_columnId,
    name: 'email_opt_out',
    displayName: 'Email Opt Out',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: contact_emailOptOut_columnId,
    sys_table_id: contactTableId,
    column_name: 'email_opt_out',
    name: 'Email Opt Out',
    sys_reference_id: 20,
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: contactColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  contactColumnSeqNo += 10;
  const contact_doNotCall_columnId = uuidv4();
  contactColumns.push({
    id: contact_doNotCall_columnId,
    name: 'do_not_call',
    displayName: 'Do Not Call',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: contact_doNotCall_columnId,
    sys_table_id: contactTableId,
    column_name: 'do_not_call',
    name: 'Do Not Call',
    sys_reference_id: 20,
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: contactColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  contactColumnSeqNo += 10;
  const contact_status_columnId = uuidv4();
  contactColumns.push({
    id: contact_status_columnId,
    name: 'status',
    displayName: 'Status',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: contact_status_columnId,
    sys_table_id: contactTableId,
    column_name: 'status',
    name: 'Status',
    sys_reference_id: 1013,
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: contactColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  contactColumnSeqNo += 10;
  const contact_ownerId_columnId = uuidv4();
  contactColumns.push({
    id: contact_ownerId_columnId,
    name: 'owner_id',
    displayName: 'Owner Id',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: contact_ownerId_columnId,
    sys_table_id: contactTableId,
    column_name: 'owner_id',
    name: 'Owner Id',
    sys_reference_id: 19,
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: contactColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  contactColumnSeqNo += 10;

  // Create sys_field entries with sequential seq_no
  for (let i = 0; i < contactColumns.length; i++) {
    const col = contactColumns[i];
    await db.insertInto('sys_field').values({
      sys_field_id: uuidv4(),
      sys_tab_id: contactTabId,
      sys_column_id: col.id,
      sys_field_group_id: i < 3 ? fieldGroupGeneral : fieldGroupDetails,
      name: col.displayName,
      help: fieldHelpFor('bus_contact', col.name),
      seq_no: (i + 1) * 10,
      seq_no_grid: (i + 1) * 10,
      is_displayed: !col.isKey,
      is_displayed_grid: !col.isKey && i < 8, // show first 8 non-pk columns in grid
      is_read_only: ['created_at', 'updated_at', 'deleted_at'].includes(col.name),
      is_encrypted: false,
      is_same_line: false,
      is_heading: false,
      is_field_only: false,
      entity_type: 'U',
      is_active: true,
      created_by: createdBy,
      updated_by: createdBy,
      created_at: now,
      updated_at: now,
    }).execute();
  }

  // Grant access to admin role
  await db.insertInto('sys_access').values({
    sys_access_id: uuidv4(),
    sys_role_id: adminRoleId,
    sys_table_id: contactTableId,
    sys_window_id: contactWindowId,
    access_type_table: 'W',
    is_read_only: false,
    is_exclude: false,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();

  // Grant read access.
  //
  // To the roles the model says own this entity, when it restricted `read` on
  // it — that is what makes a functional role's application *its* application
  // rather than the whole system with most of it refusing to open. To every
  // role otherwise, which is the behaviour of every model that declares no read
  // restriction, and therefore of every model written before this existed.
  const contactRoleIds = roleIdsNamed(['account_executive', 'marketing_manager', 'sales_manager', 'sales_ops', 'sales_rep', 'support_agent', 'support_manager']);
  for (const roleId of contactRoleIds) {
    await db.insertInto('sys_access').values({
      sys_access_id: uuidv4(),
      sys_role_id: roleId,
      sys_table_id: contactTableId,
      sys_window_id: contactWindowId,
      access_type_table: 'R',
      is_read_only: true,
      is_exclude: false,
      entity_type: 'U',
      is_active: true,
      created_by: createdBy,
      updated_by: createdBy,
      created_at: now,
      updated_at: now,
    }).execute();
  }

  console.log('✓ Created dictionary entries for Contact');

  // --------------------------------------------------------------------------
  // Lead (bus_lead)
  // --------------------------------------------------------------------------
  const leadTableId = uuidv4();
  const leadWindowId = uuidv4();
  const leadTabId = uuidv4();

  // Create sys_window entry FIRST (sys_table references it)
  await db.insertInto('sys_window').values({
    sys_window_id: leadWindowId,
    name: 'Lead',
    description: 'Maintain Lead records',
    help: windowHelpFor('bus_lead'),
    window_type: 'M',
    is_sales_transaction: false,
    is_default: true,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();

  // Create sys_table entry AFTER sys_window
  await db.insertInto('sys_table').values({
    sys_table_id: leadTableId,
    table_name: 'bus_lead',
    name: 'Lead',
    description: "An unqualified enquiry that has not been connected to an account yet. A lead is either converted into an account, a contact and an opportunity, or disqualified.",
    access_level: 'A',
    is_view: false,
    is_document: false,
    is_high_volume: false,
    is_changelog: true,
    sys_window_id: leadWindowId,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();

  // Create sys_tab entry
  await db.insertInto('sys_tab').values({
    sys_tab_id: leadTabId,
    sys_window_id: leadWindowId,
    sys_table_id: leadTableId,
    name: 'Lead',
    help: tabHelpFor('bus_lead'),
    tab_level: 0,
    seq_no: 10,
    is_single_row: true,
    has_tree: false,
    is_info_tab: false,
    is_translation_tab: false,
    is_read_only: false,
    is_insert_record: true,
    is_advanced_tab: false,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();

  // Create sys_column entries
  const leadColumns: Array<{ id: string; name: string; displayName: string; isKey: boolean }> = [];

  let leadColumnSeqNo = 10;
  const lead_id_columnId = uuidv4();
  leadColumns.push({
    id: lead_id_columnId,
    name: 'id',
    displayName: 'Id',
    isKey: true,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: lead_id_columnId,
    sys_table_id: leadTableId,
    column_name: 'id',
    name: 'Id',
    sys_reference_id: 13,
    is_key: true,
    is_parent: false,
    is_mandatory: false,
    is_updateable: false,
    is_identifier: false,
    is_selection_column: true,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: false,
    seq_no: leadColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  leadColumnSeqNo += 10;
  const lead_firstName_columnId = uuidv4();
  leadColumns.push({
    id: lead_firstName_columnId,
    name: 'first_name',
    displayName: 'First Name',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: lead_firstName_columnId,
    sys_table_id: leadTableId,
    column_name: 'first_name',
    name: 'First Name',
    sys_reference_id: 10,
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: true,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: leadColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  leadColumnSeqNo += 10;
  const lead_lastName_columnId = uuidv4();
  leadColumns.push({
    id: lead_lastName_columnId,
    name: 'last_name',
    displayName: 'Last Name',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: lead_lastName_columnId,
    sys_table_id: leadTableId,
    column_name: 'last_name',
    name: 'Last Name',
    sys_reference_id: 10,
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: true,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: leadColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  leadColumnSeqNo += 10;
  const lead_companyName_columnId = uuidv4();
  leadColumns.push({
    id: lead_companyName_columnId,
    name: 'company_name',
    displayName: 'Company Name',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: lead_companyName_columnId,
    sys_table_id: leadTableId,
    column_name: 'company_name',
    name: 'Company Name',
    sys_reference_id: 10,
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: leadColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  leadColumnSeqNo += 10;
  const lead_email_columnId = uuidv4();
  leadColumns.push({
    id: lead_email_columnId,
    name: 'email',
    displayName: 'Email',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: lead_email_columnId,
    sys_table_id: leadTableId,
    column_name: 'email',
    name: 'Email',
    sys_reference_id: 30,
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: leadColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  leadColumnSeqNo += 10;
  const lead_phone_columnId = uuidv4();
  leadColumns.push({
    id: lead_phone_columnId,
    name: 'phone',
    displayName: 'Phone',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: lead_phone_columnId,
    sys_table_id: leadTableId,
    column_name: 'phone',
    name: 'Phone',
    sys_reference_id: 31,
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: leadColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  leadColumnSeqNo += 10;
  const lead_jobTitle_columnId = uuidv4();
  leadColumns.push({
    id: lead_jobTitle_columnId,
    name: 'job_title',
    displayName: 'Job Title',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: lead_jobTitle_columnId,
    sys_table_id: leadTableId,
    column_name: 'job_title',
    name: 'Job Title',
    sys_reference_id: 10,
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: leadColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  leadColumnSeqNo += 10;
  const lead_industry_columnId = uuidv4();
  leadColumns.push({
    id: lead_industry_columnId,
    name: 'industry',
    displayName: 'Industry',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: lead_industry_columnId,
    sys_table_id: leadTableId,
    column_name: 'industry',
    name: 'Industry',
    sys_reference_id: 1016,
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: leadColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  leadColumnSeqNo += 10;
  const lead_employeeCount_columnId = uuidv4();
  leadColumns.push({
    id: lead_employeeCount_columnId,
    name: 'employee_count',
    displayName: 'Employee Count',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: lead_employeeCount_columnId,
    sys_table_id: leadTableId,
    column_name: 'employee_count',
    name: 'Employee Count',
    sys_reference_id: 11,
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: leadColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  leadColumnSeqNo += 10;
  const lead_annualRevenue_columnId = uuidv4();
  leadColumns.push({
    id: lead_annualRevenue_columnId,
    name: 'annual_revenue',
    displayName: 'Annual Revenue',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: lead_annualRevenue_columnId,
    sys_table_id: leadTableId,
    column_name: 'annual_revenue',
    name: 'Annual Revenue',
    sys_reference_id: 12,
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: leadColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  leadColumnSeqNo += 10;
  const lead_leadSource_columnId = uuidv4();
  leadColumns.push({
    id: lead_leadSource_columnId,
    name: 'lead_source',
    displayName: 'Lead Source',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: lead_leadSource_columnId,
    sys_table_id: leadTableId,
    column_name: 'lead_source',
    name: 'Lead Source',
    sys_reference_id: 1018,
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: leadColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  leadColumnSeqNo += 10;
  const lead_rating_columnId = uuidv4();
  leadColumns.push({
    id: lead_rating_columnId,
    name: 'rating',
    displayName: 'Rating',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: lead_rating_columnId,
    sys_table_id: leadTableId,
    column_name: 'rating',
    name: 'Rating',
    sys_reference_id: 1017,
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: leadColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  leadColumnSeqNo += 10;
  const lead_score_columnId = uuidv4();
  leadColumns.push({
    id: lead_score_columnId,
    name: 'score',
    displayName: 'Score',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: lead_score_columnId,
    sys_table_id: leadTableId,
    column_name: 'score',
    name: 'Score',
    sys_reference_id: 11,
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: leadColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  leadColumnSeqNo += 10;
  const lead_campaignId_columnId = uuidv4();
  leadColumns.push({
    id: lead_campaignId_columnId,
    name: 'campaign_id',
    displayName: 'Campaign Id',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: lead_campaignId_columnId,
    sys_table_id: leadTableId,
    column_name: 'campaign_id',
    name: 'Campaign Id',
    sys_reference_id: 19,
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: leadColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  leadColumnSeqNo += 10;
  const lead_status_columnId = uuidv4();
  leadColumns.push({
    id: lead_status_columnId,
    name: 'status',
    displayName: 'Status',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: lead_status_columnId,
    sys_table_id: leadTableId,
    column_name: 'status',
    name: 'Status',
    sys_reference_id: 1019,
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: leadColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  leadColumnSeqNo += 10;
  const lead_ownerId_columnId = uuidv4();
  leadColumns.push({
    id: lead_ownerId_columnId,
    name: 'owner_id',
    displayName: 'Owner Id',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: lead_ownerId_columnId,
    sys_table_id: leadTableId,
    column_name: 'owner_id',
    name: 'Owner Id',
    sys_reference_id: 19,
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: leadColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  leadColumnSeqNo += 10;
  const lead_convertedAt_columnId = uuidv4();
  leadColumns.push({
    id: lead_convertedAt_columnId,
    name: 'converted_at',
    displayName: 'Converted At',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: lead_convertedAt_columnId,
    sys_table_id: leadTableId,
    column_name: 'converted_at',
    name: 'Converted At',
    sys_reference_id: 16,
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: leadColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  leadColumnSeqNo += 10;
  const lead_disqualificationReason_columnId = uuidv4();
  leadColumns.push({
    id: lead_disqualificationReason_columnId,
    name: 'disqualification_reason',
    displayName: 'Disqualification Reason',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: lead_disqualificationReason_columnId,
    sys_table_id: leadTableId,
    column_name: 'disqualification_reason',
    name: 'Disqualification Reason',
    sys_reference_id: 10,
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: leadColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  leadColumnSeqNo += 10;

  // Create sys_field entries with sequential seq_no
  for (let i = 0; i < leadColumns.length; i++) {
    const col = leadColumns[i];
    await db.insertInto('sys_field').values({
      sys_field_id: uuidv4(),
      sys_tab_id: leadTabId,
      sys_column_id: col.id,
      sys_field_group_id: i < 3 ? fieldGroupGeneral : fieldGroupDetails,
      name: col.displayName,
      help: fieldHelpFor('bus_lead', col.name),
      seq_no: (i + 1) * 10,
      seq_no_grid: (i + 1) * 10,
      is_displayed: !col.isKey,
      is_displayed_grid: !col.isKey && i < 8, // show first 8 non-pk columns in grid
      is_read_only: ['created_at', 'updated_at', 'deleted_at'].includes(col.name),
      is_encrypted: false,
      is_same_line: false,
      is_heading: false,
      is_field_only: false,
      entity_type: 'U',
      is_active: true,
      created_by: createdBy,
      updated_by: createdBy,
      created_at: now,
      updated_at: now,
    }).execute();
  }

  // Grant access to admin role
  await db.insertInto('sys_access').values({
    sys_access_id: uuidv4(),
    sys_role_id: adminRoleId,
    sys_table_id: leadTableId,
    sys_window_id: leadWindowId,
    access_type_table: 'W',
    is_read_only: false,
    is_exclude: false,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();

  // Grant read access.
  //
  // To the roles the model says own this entity, when it restricted `read` on
  // it — that is what makes a functional role's application *its* application
  // rather than the whole system with most of it refusing to open. To every
  // role otherwise, which is the behaviour of every model that declares no read
  // restriction, and therefore of every model written before this existed.
  const leadRoleIds = roleIdsNamed(['account_executive', 'marketing_manager', 'sales_manager', 'sales_ops', 'sales_rep']);
  for (const roleId of leadRoleIds) {
    await db.insertInto('sys_access').values({
      sys_access_id: uuidv4(),
      sys_role_id: roleId,
      sys_table_id: leadTableId,
      sys_window_id: leadWindowId,
      access_type_table: 'R',
      is_read_only: true,
      is_exclude: false,
      entity_type: 'U',
      is_active: true,
      created_by: createdBy,
      updated_by: createdBy,
      created_at: now,
      updated_at: now,
    }).execute();
  }

  console.log('✓ Created dictionary entries for Lead');

  // --------------------------------------------------------------------------
  // Campaign (bus_campaign)
  // --------------------------------------------------------------------------
  const campaignTableId = uuidv4();
  const campaignWindowId = uuidv4();
  const campaignTabId = uuidv4();

  // Create sys_window entry FIRST (sys_table references it)
  await db.insertInto('sys_window').values({
    sys_window_id: campaignWindowId,
    name: 'Campaign',
    description: 'Maintain Campaign records',
    help: windowHelpFor('bus_campaign'),
    window_type: 'M',
    is_sales_transaction: false,
    is_default: true,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();

  // Create sys_table entry AFTER sys_window
  await db.insertInto('sys_table').values({
    sys_table_id: campaignTableId,
    table_name: 'bus_campaign',
    name: 'Campaign',
    description: "A marketing programme with a budget and a window, run to generate leads.",
    access_level: 'A',
    is_view: false,
    is_document: false,
    is_high_volume: false,
    is_changelog: true,
    sys_window_id: campaignWindowId,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();

  // Create sys_tab entry
  await db.insertInto('sys_tab').values({
    sys_tab_id: campaignTabId,
    sys_window_id: campaignWindowId,
    sys_table_id: campaignTableId,
    name: 'Campaign',
    help: tabHelpFor('bus_campaign'),
    tab_level: 0,
    seq_no: 10,
    is_single_row: true,
    has_tree: false,
    is_info_tab: false,
    is_translation_tab: false,
    is_read_only: false,
    is_insert_record: true,
    is_advanced_tab: false,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();

  // Create sys_column entries
  const campaignColumns: Array<{ id: string; name: string; displayName: string; isKey: boolean }> = [];

  let campaignColumnSeqNo = 10;
  const campaign_id_columnId = uuidv4();
  campaignColumns.push({
    id: campaign_id_columnId,
    name: 'id',
    displayName: 'Id',
    isKey: true,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: campaign_id_columnId,
    sys_table_id: campaignTableId,
    column_name: 'id',
    name: 'Id',
    sys_reference_id: 13,
    is_key: true,
    is_parent: false,
    is_mandatory: false,
    is_updateable: false,
    is_identifier: false,
    is_selection_column: true,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: false,
    seq_no: campaignColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  campaignColumnSeqNo += 10;
  const campaign_name_columnId = uuidv4();
  campaignColumns.push({
    id: campaign_name_columnId,
    name: 'name',
    displayName: 'Name',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: campaign_name_columnId,
    sys_table_id: campaignTableId,
    column_name: 'name',
    name: 'Name',
    sys_reference_id: 10,
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: true,
    is_selection_column: true,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: campaignColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  campaignColumnSeqNo += 10;
  const campaign_campaignType_columnId = uuidv4();
  campaignColumns.push({
    id: campaign_campaignType_columnId,
    name: 'campaign_type',
    displayName: 'Campaign Type',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: campaign_campaignType_columnId,
    sys_table_id: campaignTableId,
    column_name: 'campaign_type',
    name: 'Campaign Type',
    sys_reference_id: 1008,
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: campaignColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  campaignColumnSeqNo += 10;
  const campaign_status_columnId = uuidv4();
  campaignColumns.push({
    id: campaign_status_columnId,
    name: 'status',
    displayName: 'Status',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: campaign_status_columnId,
    sys_table_id: campaignTableId,
    column_name: 'status',
    name: 'Status',
    sys_reference_id: 1007,
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: campaignColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  campaignColumnSeqNo += 10;
  const campaign_startDate_columnId = uuidv4();
  campaignColumns.push({
    id: campaign_startDate_columnId,
    name: 'start_date',
    displayName: 'Start Date',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: campaign_startDate_columnId,
    sys_table_id: campaignTableId,
    column_name: 'start_date',
    name: 'Start Date',
    sys_reference_id: 15,
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: campaignColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  campaignColumnSeqNo += 10;
  const campaign_endDate_columnId = uuidv4();
  campaignColumns.push({
    id: campaign_endDate_columnId,
    name: 'end_date',
    displayName: 'End Date',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: campaign_endDate_columnId,
    sys_table_id: campaignTableId,
    column_name: 'end_date',
    name: 'End Date',
    sys_reference_id: 15,
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: campaignColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  campaignColumnSeqNo += 10;
  const campaign_budgetedCost_columnId = uuidv4();
  campaignColumns.push({
    id: campaign_budgetedCost_columnId,
    name: 'budgeted_cost',
    displayName: 'Budgeted Cost',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: campaign_budgetedCost_columnId,
    sys_table_id: campaignTableId,
    column_name: 'budgeted_cost',
    name: 'Budgeted Cost',
    sys_reference_id: 12,
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: campaignColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  campaignColumnSeqNo += 10;
  const campaign_actualCost_columnId = uuidv4();
  campaignColumns.push({
    id: campaign_actualCost_columnId,
    name: 'actual_cost',
    displayName: 'Actual Cost',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: campaign_actualCost_columnId,
    sys_table_id: campaignTableId,
    column_name: 'actual_cost',
    name: 'Actual Cost',
    sys_reference_id: 12,
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: campaignColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  campaignColumnSeqNo += 10;
  const campaign_expectedRevenue_columnId = uuidv4();
  campaignColumns.push({
    id: campaign_expectedRevenue_columnId,
    name: 'expected_revenue',
    displayName: 'Expected Revenue',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: campaign_expectedRevenue_columnId,
    sys_table_id: campaignTableId,
    column_name: 'expected_revenue',
    name: 'Expected Revenue',
    sys_reference_id: 12,
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: campaignColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  campaignColumnSeqNo += 10;
  const campaign_expectedResponseCount_columnId = uuidv4();
  campaignColumns.push({
    id: campaign_expectedResponseCount_columnId,
    name: 'expected_response_count',
    displayName: 'Expected Response Count',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: campaign_expectedResponseCount_columnId,
    sys_table_id: campaignTableId,
    column_name: 'expected_response_count',
    name: 'Expected Response Count',
    sys_reference_id: 11,
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: campaignColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  campaignColumnSeqNo += 10;
  const campaign_targetAudience_columnId = uuidv4();
  campaignColumns.push({
    id: campaign_targetAudience_columnId,
    name: 'target_audience',
    displayName: 'Target Audience',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: campaign_targetAudience_columnId,
    sys_table_id: campaignTableId,
    column_name: 'target_audience',
    name: 'Target Audience',
    sys_reference_id: 10,
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: campaignColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  campaignColumnSeqNo += 10;
  const campaign_ownerId_columnId = uuidv4();
  campaignColumns.push({
    id: campaign_ownerId_columnId,
    name: 'owner_id',
    displayName: 'Owner Id',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: campaign_ownerId_columnId,
    sys_table_id: campaignTableId,
    column_name: 'owner_id',
    name: 'Owner Id',
    sys_reference_id: 19,
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: campaignColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  campaignColumnSeqNo += 10;

  // Create sys_field entries with sequential seq_no
  for (let i = 0; i < campaignColumns.length; i++) {
    const col = campaignColumns[i];
    await db.insertInto('sys_field').values({
      sys_field_id: uuidv4(),
      sys_tab_id: campaignTabId,
      sys_column_id: col.id,
      sys_field_group_id: i < 3 ? fieldGroupGeneral : fieldGroupDetails,
      name: col.displayName,
      help: fieldHelpFor('bus_campaign', col.name),
      seq_no: (i + 1) * 10,
      seq_no_grid: (i + 1) * 10,
      is_displayed: !col.isKey,
      is_displayed_grid: !col.isKey && i < 8, // show first 8 non-pk columns in grid
      is_read_only: ['created_at', 'updated_at', 'deleted_at'].includes(col.name),
      is_encrypted: false,
      is_same_line: false,
      is_heading: false,
      is_field_only: false,
      entity_type: 'U',
      is_active: true,
      created_by: createdBy,
      updated_by: createdBy,
      created_at: now,
      updated_at: now,
    }).execute();
  }

  // Grant access to admin role
  await db.insertInto('sys_access').values({
    sys_access_id: uuidv4(),
    sys_role_id: adminRoleId,
    sys_table_id: campaignTableId,
    sys_window_id: campaignWindowId,
    access_type_table: 'W',
    is_read_only: false,
    is_exclude: false,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();

  // Grant read access.
  //
  // To the roles the model says own this entity, when it restricted `read` on
  // it — that is what makes a functional role's application *its* application
  // rather than the whole system with most of it refusing to open. To every
  // role otherwise, which is the behaviour of every model that declares no read
  // restriction, and therefore of every model written before this existed.
  const campaignRoleIds = roleIdsNamed(['marketing_manager', 'sales_ops']);
  for (const roleId of campaignRoleIds) {
    await db.insertInto('sys_access').values({
      sys_access_id: uuidv4(),
      sys_role_id: roleId,
      sys_table_id: campaignTableId,
      sys_window_id: campaignWindowId,
      access_type_table: 'R',
      is_read_only: true,
      is_exclude: false,
      entity_type: 'U',
      is_active: true,
      created_by: createdBy,
      updated_by: createdBy,
      created_at: now,
      updated_at: now,
    }).execute();
  }

  console.log('✓ Created dictionary entries for Campaign');

  // --------------------------------------------------------------------------
  // Campaign Member (bus_campaign_member)
  // --------------------------------------------------------------------------
  const campaignMemberTableId = uuidv4();
  const campaignMemberWindowId = uuidv4();
  const campaignMemberTabId = uuidv4();

  // Create sys_window entry FIRST (sys_table references it)
  await db.insertInto('sys_window').values({
    sys_window_id: campaignMemberWindowId,
    name: 'Campaign Member',
    description: 'Maintain Campaign Member records',
    help: windowHelpFor('bus_campaign_member'),
    window_type: 'M',
    is_sales_transaction: false,
    is_default: true,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();

  // Create sys_table entry AFTER sys_window
  await db.insertInto('sys_table').values({
    sys_table_id: campaignMemberTableId,
    table_name: 'bus_campaign_member',
    name: 'Campaign Member',
    description: "One person on one campaign's target list, and whether they responded.",
    access_level: 'A',
    is_view: false,
    is_document: false,
    is_high_volume: false,
    is_changelog: true,
    sys_window_id: campaignMemberWindowId,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();

  // Create sys_tab entry
  await db.insertInto('sys_tab').values({
    sys_tab_id: campaignMemberTabId,
    sys_window_id: campaignMemberWindowId,
    sys_table_id: campaignMemberTableId,
    name: 'Campaign Member',
    help: tabHelpFor('bus_campaign_member'),
    tab_level: 0,
    seq_no: 10,
    is_single_row: true,
    has_tree: false,
    is_info_tab: false,
    is_translation_tab: false,
    is_read_only: false,
    is_insert_record: true,
    is_advanced_tab: false,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();

  // Create sys_column entries
  const campaignMemberColumns: Array<{ id: string; name: string; displayName: string; isKey: boolean }> = [];

  let campaignMemberColumnSeqNo = 10;
  const campaignMember_id_columnId = uuidv4();
  campaignMemberColumns.push({
    id: campaignMember_id_columnId,
    name: 'id',
    displayName: 'Id',
    isKey: true,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: campaignMember_id_columnId,
    sys_table_id: campaignMemberTableId,
    column_name: 'id',
    name: 'Id',
    sys_reference_id: 13,
    is_key: true,
    is_parent: false,
    is_mandatory: false,
    is_updateable: false,
    is_identifier: false,
    is_selection_column: true,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: false,
    seq_no: campaignMemberColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  campaignMemberColumnSeqNo += 10;
  const campaignMember_campaignId_columnId = uuidv4();
  campaignMemberColumns.push({
    id: campaignMember_campaignId_columnId,
    name: 'campaign_id',
    displayName: 'Campaign Id',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: campaignMember_campaignId_columnId,
    sys_table_id: campaignMemberTableId,
    column_name: 'campaign_id',
    name: 'Campaign Id',
    sys_reference_id: 19,
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: true,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: campaignMemberColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  campaignMemberColumnSeqNo += 10;
  const campaignMember_leadId_columnId = uuidv4();
  campaignMemberColumns.push({
    id: campaignMember_leadId_columnId,
    name: 'lead_id',
    displayName: 'Lead Id',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: campaignMember_leadId_columnId,
    sys_table_id: campaignMemberTableId,
    column_name: 'lead_id',
    name: 'Lead Id',
    sys_reference_id: 19,
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: true,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: campaignMemberColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  campaignMemberColumnSeqNo += 10;
  const campaignMember_contactId_columnId = uuidv4();
  campaignMemberColumns.push({
    id: campaignMember_contactId_columnId,
    name: 'contact_id',
    displayName: 'Contact Id',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: campaignMember_contactId_columnId,
    sys_table_id: campaignMemberTableId,
    column_name: 'contact_id',
    name: 'Contact Id',
    sys_reference_id: 19,
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: campaignMemberColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  campaignMemberColumnSeqNo += 10;
  const campaignMember_memberStatus_columnId = uuidv4();
  campaignMemberColumns.push({
    id: campaignMember_memberStatus_columnId,
    name: 'member_status',
    displayName: 'Member Status',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: campaignMember_memberStatus_columnId,
    sys_table_id: campaignMemberTableId,
    column_name: 'member_status',
    name: 'Member Status',
    sys_reference_id: 1006,
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: campaignMemberColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  campaignMemberColumnSeqNo += 10;
  const campaignMember_respondedAt_columnId = uuidv4();
  campaignMemberColumns.push({
    id: campaignMember_respondedAt_columnId,
    name: 'responded_at',
    displayName: 'Responded At',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: campaignMember_respondedAt_columnId,
    sys_table_id: campaignMemberTableId,
    column_name: 'responded_at',
    name: 'Responded At',
    sys_reference_id: 16,
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: campaignMemberColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  campaignMemberColumnSeqNo += 10;
  const campaignMember_hasResponded_columnId = uuidv4();
  campaignMemberColumns.push({
    id: campaignMember_hasResponded_columnId,
    name: 'has_responded',
    displayName: 'Has Responded',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: campaignMember_hasResponded_columnId,
    sys_table_id: campaignMemberTableId,
    column_name: 'has_responded',
    name: 'Has Responded',
    sys_reference_id: 20,
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: campaignMemberColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  campaignMemberColumnSeqNo += 10;

  // Create sys_field entries with sequential seq_no
  for (let i = 0; i < campaignMemberColumns.length; i++) {
    const col = campaignMemberColumns[i];
    await db.insertInto('sys_field').values({
      sys_field_id: uuidv4(),
      sys_tab_id: campaignMemberTabId,
      sys_column_id: col.id,
      sys_field_group_id: i < 3 ? fieldGroupGeneral : fieldGroupDetails,
      name: col.displayName,
      help: fieldHelpFor('bus_campaign_member', col.name),
      seq_no: (i + 1) * 10,
      seq_no_grid: (i + 1) * 10,
      is_displayed: !col.isKey,
      is_displayed_grid: !col.isKey && i < 8, // show first 8 non-pk columns in grid
      is_read_only: ['created_at', 'updated_at', 'deleted_at'].includes(col.name),
      is_encrypted: false,
      is_same_line: false,
      is_heading: false,
      is_field_only: false,
      entity_type: 'U',
      is_active: true,
      created_by: createdBy,
      updated_by: createdBy,
      created_at: now,
      updated_at: now,
    }).execute();
  }

  // Grant access to admin role
  await db.insertInto('sys_access').values({
    sys_access_id: uuidv4(),
    sys_role_id: adminRoleId,
    sys_table_id: campaignMemberTableId,
    sys_window_id: campaignMemberWindowId,
    access_type_table: 'W',
    is_read_only: false,
    is_exclude: false,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();

  // Grant read access.
  //
  // To the roles the model says own this entity, when it restricted `read` on
  // it — that is what makes a functional role's application *its* application
  // rather than the whole system with most of it refusing to open. To every
  // role otherwise, which is the behaviour of every model that declares no read
  // restriction, and therefore of every model written before this existed.
  const campaignMemberRoleIds = roleIdsNamed(['marketing_manager', 'sales_ops']);
  for (const roleId of campaignMemberRoleIds) {
    await db.insertInto('sys_access').values({
      sys_access_id: uuidv4(),
      sys_role_id: roleId,
      sys_table_id: campaignMemberTableId,
      sys_window_id: campaignMemberWindowId,
      access_type_table: 'R',
      is_read_only: true,
      is_exclude: false,
      entity_type: 'U',
      is_active: true,
      created_by: createdBy,
      updated_by: createdBy,
      created_at: now,
      updated_at: now,
    }).execute();
  }

  console.log('✓ Created dictionary entries for Campaign Member');

  // --------------------------------------------------------------------------
  // Opportunity (bus_opportunity)
  // --------------------------------------------------------------------------
  const opportunityTableId = uuidv4();
  const opportunityWindowId = uuidv4();
  const opportunityTabId = uuidv4();

  // Create sys_window entry FIRST (sys_table references it)
  await db.insertInto('sys_window').values({
    sys_window_id: opportunityWindowId,
    name: 'Opportunity',
    description: 'Maintain Opportunity records',
    help: windowHelpFor('bus_opportunity'),
    window_type: 'M',
    is_sales_transaction: false,
    is_default: true,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();

  // Create sys_table entry AFTER sys_window
  await db.insertInto('sys_table').values({
    sys_table_id: opportunityTableId,
    table_name: 'bus_opportunity',
    name: 'Opportunity',
    description: "A deal in progress against an account, with an amount, a stage and a close date. The pipeline is the sum of these.",
    access_level: 'A',
    is_view: false,
    is_document: false,
    is_high_volume: false,
    is_changelog: true,
    sys_window_id: opportunityWindowId,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();

  // Create sys_tab entry
  await db.insertInto('sys_tab').values({
    sys_tab_id: opportunityTabId,
    sys_window_id: opportunityWindowId,
    sys_table_id: opportunityTableId,
    name: 'Opportunity',
    help: tabHelpFor('bus_opportunity'),
    tab_level: 0,
    seq_no: 10,
    is_single_row: true,
    has_tree: false,
    is_info_tab: false,
    is_translation_tab: false,
    is_read_only: false,
    is_insert_record: true,
    is_advanced_tab: false,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();

  // Create sys_column entries
  const opportunityColumns: Array<{ id: string; name: string; displayName: string; isKey: boolean }> = [];

  let opportunityColumnSeqNo = 10;
  const opportunity_id_columnId = uuidv4();
  opportunityColumns.push({
    id: opportunity_id_columnId,
    name: 'id',
    displayName: 'Id',
    isKey: true,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: opportunity_id_columnId,
    sys_table_id: opportunityTableId,
    column_name: 'id',
    name: 'Id',
    sys_reference_id: 13,
    is_key: true,
    is_parent: false,
    is_mandatory: false,
    is_updateable: false,
    is_identifier: false,
    is_selection_column: true,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: false,
    seq_no: opportunityColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  opportunityColumnSeqNo += 10;
  const opportunity_accountId_columnId = uuidv4();
  opportunityColumns.push({
    id: opportunity_accountId_columnId,
    name: 'account_id',
    displayName: 'Account Id',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: opportunity_accountId_columnId,
    sys_table_id: opportunityTableId,
    column_name: 'account_id',
    name: 'Account Id',
    sys_reference_id: 19,
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: opportunityColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  opportunityColumnSeqNo += 10;
  const opportunity_contactId_columnId = uuidv4();
  opportunityColumns.push({
    id: opportunity_contactId_columnId,
    name: 'contact_id',
    displayName: 'Contact Id',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: opportunity_contactId_columnId,
    sys_table_id: opportunityTableId,
    column_name: 'contact_id',
    name: 'Contact Id',
    sys_reference_id: 19,
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: opportunityColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  opportunityColumnSeqNo += 10;
  const opportunity_campaignId_columnId = uuidv4();
  opportunityColumns.push({
    id: opportunity_campaignId_columnId,
    name: 'campaign_id',
    displayName: 'Campaign Id',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: opportunity_campaignId_columnId,
    sys_table_id: opportunityTableId,
    column_name: 'campaign_id',
    name: 'Campaign Id',
    sys_reference_id: 19,
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: opportunityColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  opportunityColumnSeqNo += 10;
  const opportunity_name_columnId = uuidv4();
  opportunityColumns.push({
    id: opportunity_name_columnId,
    name: 'name',
    displayName: 'Name',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: opportunity_name_columnId,
    sys_table_id: opportunityTableId,
    column_name: 'name',
    name: 'Name',
    sys_reference_id: 10,
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: true,
    is_selection_column: true,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: opportunityColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  opportunityColumnSeqNo += 10;
  const opportunity_description_columnId = uuidv4();
  opportunityColumns.push({
    id: opportunity_description_columnId,
    name: 'description',
    displayName: 'Description',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: opportunity_description_columnId,
    sys_table_id: opportunityTableId,
    column_name: 'description',
    name: 'Description',
    sys_reference_id: 14,
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: opportunityColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  opportunityColumnSeqNo += 10;
  const opportunity_amount_columnId = uuidv4();
  opportunityColumns.push({
    id: opportunity_amount_columnId,
    name: 'amount',
    displayName: 'Amount',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: opportunity_amount_columnId,
    sys_table_id: opportunityTableId,
    column_name: 'amount',
    name: 'Amount',
    sys_reference_id: 12,
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: opportunityColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  opportunityColumnSeqNo += 10;
  const opportunity_currencyCode_columnId = uuidv4();
  opportunityColumns.push({
    id: opportunity_currencyCode_columnId,
    name: 'currency_code',
    displayName: 'Currency Code',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: opportunity_currencyCode_columnId,
    sys_table_id: opportunityTableId,
    column_name: 'currency_code',
    name: 'Currency Code',
    sys_reference_id: 10,
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: opportunityColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  opportunityColumnSeqNo += 10;
  const opportunity_stage_columnId = uuidv4();
  opportunityColumns.push({
    id: opportunity_stage_columnId,
    name: 'stage',
    displayName: 'Stage',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: opportunity_stage_columnId,
    sys_table_id: opportunityTableId,
    column_name: 'stage',
    name: 'Stage',
    sys_reference_id: 1021,
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: opportunityColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  opportunityColumnSeqNo += 10;
  const opportunity_probability_columnId = uuidv4();
  opportunityColumns.push({
    id: opportunity_probability_columnId,
    name: 'probability',
    displayName: 'Probability',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: opportunity_probability_columnId,
    sys_table_id: opportunityTableId,
    column_name: 'probability',
    name: 'Probability',
    sys_reference_id: 11,
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: opportunityColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  opportunityColumnSeqNo += 10;
  const opportunity_forecastCategory_columnId = uuidv4();
  opportunityColumns.push({
    id: opportunity_forecastCategory_columnId,
    name: 'forecast_category',
    displayName: 'Forecast Category',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: opportunity_forecastCategory_columnId,
    sys_table_id: opportunityTableId,
    column_name: 'forecast_category',
    name: 'Forecast Category',
    sys_reference_id: 1015,
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: opportunityColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  opportunityColumnSeqNo += 10;
  const opportunity_expectedCloseDate_columnId = uuidv4();
  opportunityColumns.push({
    id: opportunity_expectedCloseDate_columnId,
    name: 'expected_close_date',
    displayName: 'Expected Close Date',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: opportunity_expectedCloseDate_columnId,
    sys_table_id: opportunityTableId,
    column_name: 'expected_close_date',
    name: 'Expected Close Date',
    sys_reference_id: 15,
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: opportunityColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  opportunityColumnSeqNo += 10;
  const opportunity_actualCloseDate_columnId = uuidv4();
  opportunityColumns.push({
    id: opportunity_actualCloseDate_columnId,
    name: 'actual_close_date',
    displayName: 'Actual Close Date',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: opportunity_actualCloseDate_columnId,
    sys_table_id: opportunityTableId,
    column_name: 'actual_close_date',
    name: 'Actual Close Date',
    sys_reference_id: 15,
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: opportunityColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  opportunityColumnSeqNo += 10;
  const opportunity_leadSource_columnId = uuidv4();
  opportunityColumns.push({
    id: opportunity_leadSource_columnId,
    name: 'lead_source',
    displayName: 'Lead Source',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: opportunity_leadSource_columnId,
    sys_table_id: opportunityTableId,
    column_name: 'lead_source',
    name: 'Lead Source',
    sys_reference_id: 1018,
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: opportunityColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  opportunityColumnSeqNo += 10;
  const opportunity_nextStep_columnId = uuidv4();
  opportunityColumns.push({
    id: opportunity_nextStep_columnId,
    name: 'next_step',
    displayName: 'Next Step',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: opportunity_nextStep_columnId,
    sys_table_id: opportunityTableId,
    column_name: 'next_step',
    name: 'Next Step',
    sys_reference_id: 10,
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: opportunityColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  opportunityColumnSeqNo += 10;
  const opportunity_lossReason_columnId = uuidv4();
  opportunityColumns.push({
    id: opportunity_lossReason_columnId,
    name: 'loss_reason',
    displayName: 'Loss Reason',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: opportunity_lossReason_columnId,
    sys_table_id: opportunityTableId,
    column_name: 'loss_reason',
    name: 'Loss Reason',
    sys_reference_id: 1020,
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: opportunityColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  opportunityColumnSeqNo += 10;
  const opportunity_ownerId_columnId = uuidv4();
  opportunityColumns.push({
    id: opportunity_ownerId_columnId,
    name: 'owner_id',
    displayName: 'Owner Id',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: opportunity_ownerId_columnId,
    sys_table_id: opportunityTableId,
    column_name: 'owner_id',
    name: 'Owner Id',
    sys_reference_id: 19,
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: opportunityColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  opportunityColumnSeqNo += 10;

  // Create sys_field entries with sequential seq_no
  for (let i = 0; i < opportunityColumns.length; i++) {
    const col = opportunityColumns[i];
    await db.insertInto('sys_field').values({
      sys_field_id: uuidv4(),
      sys_tab_id: opportunityTabId,
      sys_column_id: col.id,
      sys_field_group_id: i < 3 ? fieldGroupGeneral : fieldGroupDetails,
      name: col.displayName,
      help: fieldHelpFor('bus_opportunity', col.name),
      seq_no: (i + 1) * 10,
      seq_no_grid: (i + 1) * 10,
      is_displayed: !col.isKey,
      is_displayed_grid: !col.isKey && i < 8, // show first 8 non-pk columns in grid
      is_read_only: ['created_at', 'updated_at', 'deleted_at'].includes(col.name),
      is_encrypted: false,
      is_same_line: false,
      is_heading: false,
      is_field_only: false,
      entity_type: 'U',
      is_active: true,
      created_by: createdBy,
      updated_by: createdBy,
      created_at: now,
      updated_at: now,
    }).execute();
  }

  // Grant access to admin role
  await db.insertInto('sys_access').values({
    sys_access_id: uuidv4(),
    sys_role_id: adminRoleId,
    sys_table_id: opportunityTableId,
    sys_window_id: opportunityWindowId,
    access_type_table: 'W',
    is_read_only: false,
    is_exclude: false,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();

  // Grant read access.
  //
  // To the roles the model says own this entity, when it restricted `read` on
  // it — that is what makes a functional role's application *its* application
  // rather than the whole system with most of it refusing to open. To every
  // role otherwise, which is the behaviour of every model that declares no read
  // restriction, and therefore of every model written before this existed.
  const opportunityRoleIds = roleIdsNamed(['account_executive', 'sales_manager', 'sales_ops', 'sales_rep']);
  for (const roleId of opportunityRoleIds) {
    await db.insertInto('sys_access').values({
      sys_access_id: uuidv4(),
      sys_role_id: roleId,
      sys_table_id: opportunityTableId,
      sys_window_id: opportunityWindowId,
      access_type_table: 'R',
      is_read_only: true,
      is_exclude: false,
      entity_type: 'U',
      is_active: true,
      created_by: createdBy,
      updated_by: createdBy,
      created_at: now,
      updated_at: now,
    }).execute();
  }

  console.log('✓ Created dictionary entries for Opportunity');

  // --------------------------------------------------------------------------
  // Opportunity Line Item (bus_opportunity_line_item)
  // --------------------------------------------------------------------------
  const opportunityLineItemTableId = uuidv4();
  const opportunityLineItemWindowId = uuidv4();
  const opportunityLineItemTabId = uuidv4();

  // Create sys_window entry FIRST (sys_table references it)
  await db.insertInto('sys_window').values({
    sys_window_id: opportunityLineItemWindowId,
    name: 'Opportunity Line Item',
    description: 'Maintain Opportunity Line Item records',
    help: windowHelpFor('bus_opportunity_line_item'),
    window_type: 'M',
    is_sales_transaction: false,
    is_default: true,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();

  // Create sys_table entry AFTER sys_window
  await db.insertInto('sys_table').values({
    sys_table_id: opportunityLineItemTableId,
    table_name: 'bus_opportunity_line_item',
    name: 'Opportunity Line Item',
    description: "One product on one opportunity, priced. The opportunity's amount is what these add up to.",
    access_level: 'A',
    is_view: false,
    is_document: false,
    is_high_volume: false,
    is_changelog: true,
    sys_window_id: opportunityLineItemWindowId,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();

  // Create sys_tab entry
  await db.insertInto('sys_tab').values({
    sys_tab_id: opportunityLineItemTabId,
    sys_window_id: opportunityLineItemWindowId,
    sys_table_id: opportunityLineItemTableId,
    name: 'Opportunity Line Item',
    help: tabHelpFor('bus_opportunity_line_item'),
    tab_level: 0,
    seq_no: 10,
    is_single_row: true,
    has_tree: false,
    is_info_tab: false,
    is_translation_tab: false,
    is_read_only: false,
    is_insert_record: true,
    is_advanced_tab: false,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();

  // Create sys_column entries
  const opportunityLineItemColumns: Array<{ id: string; name: string; displayName: string; isKey: boolean }> = [];

  let opportunityLineItemColumnSeqNo = 10;
  const opportunityLineItem_id_columnId = uuidv4();
  opportunityLineItemColumns.push({
    id: opportunityLineItem_id_columnId,
    name: 'id',
    displayName: 'Id',
    isKey: true,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: opportunityLineItem_id_columnId,
    sys_table_id: opportunityLineItemTableId,
    column_name: 'id',
    name: 'Id',
    sys_reference_id: 13,
    is_key: true,
    is_parent: false,
    is_mandatory: false,
    is_updateable: false,
    is_identifier: false,
    is_selection_column: true,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: false,
    seq_no: opportunityLineItemColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  opportunityLineItemColumnSeqNo += 10;
  const opportunityLineItem_opportunityId_columnId = uuidv4();
  opportunityLineItemColumns.push({
    id: opportunityLineItem_opportunityId_columnId,
    name: 'opportunity_id',
    displayName: 'Opportunity Id',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: opportunityLineItem_opportunityId_columnId,
    sys_table_id: opportunityLineItemTableId,
    column_name: 'opportunity_id',
    name: 'Opportunity Id',
    sys_reference_id: 19,
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: true,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: opportunityLineItemColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  opportunityLineItemColumnSeqNo += 10;
  const opportunityLineItem_productId_columnId = uuidv4();
  opportunityLineItemColumns.push({
    id: opportunityLineItem_productId_columnId,
    name: 'product_id',
    displayName: 'Product Id',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: opportunityLineItem_productId_columnId,
    sys_table_id: opportunityLineItemTableId,
    column_name: 'product_id',
    name: 'Product Id',
    sys_reference_id: 19,
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: true,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: opportunityLineItemColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  opportunityLineItemColumnSeqNo += 10;
  const opportunityLineItem_quantity_columnId = uuidv4();
  opportunityLineItemColumns.push({
    id: opportunityLineItem_quantity_columnId,
    name: 'quantity',
    displayName: 'Quantity',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: opportunityLineItem_quantity_columnId,
    sys_table_id: opportunityLineItemTableId,
    column_name: 'quantity',
    name: 'Quantity',
    sys_reference_id: 12,
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: opportunityLineItemColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  opportunityLineItemColumnSeqNo += 10;
  const opportunityLineItem_unitPrice_columnId = uuidv4();
  opportunityLineItemColumns.push({
    id: opportunityLineItem_unitPrice_columnId,
    name: 'unit_price',
    displayName: 'Unit Price',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: opportunityLineItem_unitPrice_columnId,
    sys_table_id: opportunityLineItemTableId,
    column_name: 'unit_price',
    name: 'Unit Price',
    sys_reference_id: 12,
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: opportunityLineItemColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  opportunityLineItemColumnSeqNo += 10;
  const opportunityLineItem_discountPercent_columnId = uuidv4();
  opportunityLineItemColumns.push({
    id: opportunityLineItem_discountPercent_columnId,
    name: 'discount_percent',
    displayName: 'Discount Percent',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: opportunityLineItem_discountPercent_columnId,
    sys_table_id: opportunityLineItemTableId,
    column_name: 'discount_percent',
    name: 'Discount Percent',
    sys_reference_id: 12,
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: opportunityLineItemColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  opportunityLineItemColumnSeqNo += 10;
  const opportunityLineItem_lineTotal_columnId = uuidv4();
  opportunityLineItemColumns.push({
    id: opportunityLineItem_lineTotal_columnId,
    name: 'line_total',
    displayName: 'Line Total',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: opportunityLineItem_lineTotal_columnId,
    sys_table_id: opportunityLineItemTableId,
    column_name: 'line_total',
    name: 'Line Total',
    sys_reference_id: 12,
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: opportunityLineItemColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  opportunityLineItemColumnSeqNo += 10;
  const opportunityLineItem_lineDescription_columnId = uuidv4();
  opportunityLineItemColumns.push({
    id: opportunityLineItem_lineDescription_columnId,
    name: 'line_description',
    displayName: 'Line Description',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: opportunityLineItem_lineDescription_columnId,
    sys_table_id: opportunityLineItemTableId,
    column_name: 'line_description',
    name: 'Line Description',
    sys_reference_id: 10,
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: opportunityLineItemColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  opportunityLineItemColumnSeqNo += 10;

  // Create sys_field entries with sequential seq_no
  for (let i = 0; i < opportunityLineItemColumns.length; i++) {
    const col = opportunityLineItemColumns[i];
    await db.insertInto('sys_field').values({
      sys_field_id: uuidv4(),
      sys_tab_id: opportunityLineItemTabId,
      sys_column_id: col.id,
      sys_field_group_id: i < 3 ? fieldGroupGeneral : fieldGroupDetails,
      name: col.displayName,
      help: fieldHelpFor('bus_opportunity_line_item', col.name),
      seq_no: (i + 1) * 10,
      seq_no_grid: (i + 1) * 10,
      is_displayed: !col.isKey,
      is_displayed_grid: !col.isKey && i < 8, // show first 8 non-pk columns in grid
      is_read_only: ['created_at', 'updated_at', 'deleted_at'].includes(col.name),
      is_encrypted: false,
      is_same_line: false,
      is_heading: false,
      is_field_only: false,
      entity_type: 'U',
      is_active: true,
      created_by: createdBy,
      updated_by: createdBy,
      created_at: now,
      updated_at: now,
    }).execute();
  }

  // Grant access to admin role
  await db.insertInto('sys_access').values({
    sys_access_id: uuidv4(),
    sys_role_id: adminRoleId,
    sys_table_id: opportunityLineItemTableId,
    sys_window_id: opportunityLineItemWindowId,
    access_type_table: 'W',
    is_read_only: false,
    is_exclude: false,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();

  // Grant read access.
  //
  // To the roles the model says own this entity, when it restricted `read` on
  // it — that is what makes a functional role's application *its* application
  // rather than the whole system with most of it refusing to open. To every
  // role otherwise, which is the behaviour of every model that declares no read
  // restriction, and therefore of every model written before this existed.
  const opportunityLineItemRoleIds = roleIdsNamed(['account_executive', 'sales_manager', 'sales_ops', 'sales_rep']);
  for (const roleId of opportunityLineItemRoleIds) {
    await db.insertInto('sys_access').values({
      sys_access_id: uuidv4(),
      sys_role_id: roleId,
      sys_table_id: opportunityLineItemTableId,
      sys_window_id: opportunityLineItemWindowId,
      access_type_table: 'R',
      is_read_only: true,
      is_exclude: false,
      entity_type: 'U',
      is_active: true,
      created_by: createdBy,
      updated_by: createdBy,
      created_at: now,
      updated_at: now,
    }).execute();
  }

  console.log('✓ Created dictionary entries for Opportunity Line Item');

  // --------------------------------------------------------------------------
  // Product (bus_product)
  // --------------------------------------------------------------------------
  const productTableId = uuidv4();
  const productWindowId = uuidv4();
  const productTabId = uuidv4();

  // Create sys_window entry FIRST (sys_table references it)
  await db.insertInto('sys_window').values({
    sys_window_id: productWindowId,
    name: 'Product',
    description: 'Maintain Product records',
    help: windowHelpFor('bus_product'),
    window_type: 'M',
    is_sales_transaction: false,
    is_default: true,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();

  // Create sys_table entry AFTER sys_window
  await db.insertInto('sys_table').values({
    sys_table_id: productTableId,
    table_name: 'bus_product',
    name: 'Product',
    description: "Something you sell, with a list price. Products are what line items point at.",
    access_level: 'A',
    is_view: false,
    is_document: false,
    is_high_volume: false,
    is_changelog: true,
    sys_window_id: productWindowId,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();

  // Create sys_tab entry
  await db.insertInto('sys_tab').values({
    sys_tab_id: productTabId,
    sys_window_id: productWindowId,
    sys_table_id: productTableId,
    name: 'Product',
    help: tabHelpFor('bus_product'),
    tab_level: 0,
    seq_no: 10,
    is_single_row: true,
    has_tree: false,
    is_info_tab: false,
    is_translation_tab: false,
    is_read_only: false,
    is_insert_record: true,
    is_advanced_tab: false,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();

  // Create sys_column entries
  const productColumns: Array<{ id: string; name: string; displayName: string; isKey: boolean }> = [];

  let productColumnSeqNo = 10;
  const product_id_columnId = uuidv4();
  productColumns.push({
    id: product_id_columnId,
    name: 'id',
    displayName: 'Id',
    isKey: true,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: product_id_columnId,
    sys_table_id: productTableId,
    column_name: 'id',
    name: 'Id',
    sys_reference_id: 13,
    is_key: true,
    is_parent: false,
    is_mandatory: false,
    is_updateable: false,
    is_identifier: false,
    is_selection_column: true,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: false,
    seq_no: productColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  productColumnSeqNo += 10;
  const product_productCode_columnId = uuidv4();
  productColumns.push({
    id: product_productCode_columnId,
    name: 'product_code',
    displayName: 'Product Code',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: product_productCode_columnId,
    sys_table_id: productTableId,
    column_name: 'product_code',
    name: 'Product Code',
    sys_reference_id: 10,
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: true,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: productColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  productColumnSeqNo += 10;
  const product_name_columnId = uuidv4();
  productColumns.push({
    id: product_name_columnId,
    name: 'name',
    displayName: 'Name',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: product_name_columnId,
    sys_table_id: productTableId,
    column_name: 'name',
    name: 'Name',
    sys_reference_id: 10,
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: true,
    is_selection_column: true,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: productColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  productColumnSeqNo += 10;
  const product_description_columnId = uuidv4();
  productColumns.push({
    id: product_description_columnId,
    name: 'description',
    displayName: 'Description',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: product_description_columnId,
    sys_table_id: productTableId,
    column_name: 'description',
    name: 'Description',
    sys_reference_id: 14,
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: productColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  productColumnSeqNo += 10;
  const product_family_columnId = uuidv4();
  productColumns.push({
    id: product_family_columnId,
    name: 'family',
    displayName: 'Family',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: product_family_columnId,
    sys_table_id: productTableId,
    column_name: 'family',
    name: 'Family',
    sys_reference_id: 1022,
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: productColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  productColumnSeqNo += 10;
  const product_listPrice_columnId = uuidv4();
  productColumns.push({
    id: product_listPrice_columnId,
    name: 'list_price',
    displayName: 'List Price',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: product_listPrice_columnId,
    sys_table_id: productTableId,
    column_name: 'list_price',
    name: 'List Price',
    sys_reference_id: 12,
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: productColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  productColumnSeqNo += 10;
  const product_unitCost_columnId = uuidv4();
  productColumns.push({
    id: product_unitCost_columnId,
    name: 'unit_cost',
    displayName: 'Unit Cost',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: product_unitCost_columnId,
    sys_table_id: productTableId,
    column_name: 'unit_cost',
    name: 'Unit Cost',
    sys_reference_id: 12,
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: productColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  productColumnSeqNo += 10;
  const product_billingFrequency_columnId = uuidv4();
  productColumns.push({
    id: product_billingFrequency_columnId,
    name: 'billing_frequency',
    displayName: 'Billing Frequency',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: product_billingFrequency_columnId,
    sys_table_id: productTableId,
    column_name: 'billing_frequency',
    name: 'Billing Frequency',
    sys_reference_id: 10,
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: productColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  productColumnSeqNo += 10;
  const product_isActive_columnId = uuidv4();
  productColumns.push({
    id: product_isActive_columnId,
    name: 'is_active',
    displayName: 'Is Active',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: product_isActive_columnId,
    sys_table_id: productTableId,
    column_name: 'is_active',
    name: 'Is Active',
    sys_reference_id: 20,
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: productColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  productColumnSeqNo += 10;

  // Create sys_field entries with sequential seq_no
  for (let i = 0; i < productColumns.length; i++) {
    const col = productColumns[i];
    await db.insertInto('sys_field').values({
      sys_field_id: uuidv4(),
      sys_tab_id: productTabId,
      sys_column_id: col.id,
      sys_field_group_id: i < 3 ? fieldGroupGeneral : fieldGroupDetails,
      name: col.displayName,
      help: fieldHelpFor('bus_product', col.name),
      seq_no: (i + 1) * 10,
      seq_no_grid: (i + 1) * 10,
      is_displayed: !col.isKey,
      is_displayed_grid: !col.isKey && i < 8, // show first 8 non-pk columns in grid
      is_read_only: ['created_at', 'updated_at', 'deleted_at'].includes(col.name),
      is_encrypted: false,
      is_same_line: false,
      is_heading: false,
      is_field_only: false,
      entity_type: 'U',
      is_active: true,
      created_by: createdBy,
      updated_by: createdBy,
      created_at: now,
      updated_at: now,
    }).execute();
  }

  // Grant access to admin role
  await db.insertInto('sys_access').values({
    sys_access_id: uuidv4(),
    sys_role_id: adminRoleId,
    sys_table_id: productTableId,
    sys_window_id: productWindowId,
    access_type_table: 'W',
    is_read_only: false,
    is_exclude: false,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();

  // Grant read access.
  //
  // To the roles the model says own this entity, when it restricted `read` on
  // it — that is what makes a functional role's application *its* application
  // rather than the whole system with most of it refusing to open. To every
  // role otherwise, which is the behaviour of every model that declares no read
  // restriction, and therefore of every model written before this existed.
  const productRoleIds = roleIdsNamed(['account_executive', 'sales_manager', 'sales_ops', 'sales_rep']);
  for (const roleId of productRoleIds) {
    await db.insertInto('sys_access').values({
      sys_access_id: uuidv4(),
      sys_role_id: roleId,
      sys_table_id: productTableId,
      sys_window_id: productWindowId,
      access_type_table: 'R',
      is_read_only: true,
      is_exclude: false,
      entity_type: 'U',
      is_active: true,
      created_by: createdBy,
      updated_by: createdBy,
      created_at: now,
      updated_at: now,
    }).execute();
  }

  console.log('✓ Created dictionary entries for Product');

  // --------------------------------------------------------------------------
  // Quote (bus_quote)
  // --------------------------------------------------------------------------
  const quoteTableId = uuidv4();
  const quoteWindowId = uuidv4();
  const quoteTabId = uuidv4();

  // Create sys_window entry FIRST (sys_table references it)
  await db.insertInto('sys_window').values({
    sys_window_id: quoteWindowId,
    name: 'Quote',
    description: 'Maintain Quote records',
    help: windowHelpFor('bus_quote'),
    window_type: 'M',
    is_sales_transaction: false,
    is_default: true,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();

  // Create sys_table entry AFTER sys_window
  await db.insertInto('sys_table').values({
    sys_table_id: quoteTableId,
    table_name: 'bus_quote',
    name: 'Quote',
    description: "A priced, versioned offer to an account for one opportunity. A quote is what gets approved and sent.",
    access_level: 'A',
    is_view: false,
    is_document: false,
    is_high_volume: false,
    is_changelog: true,
    sys_window_id: quoteWindowId,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();

  // Create sys_tab entry
  await db.insertInto('sys_tab').values({
    sys_tab_id: quoteTabId,
    sys_window_id: quoteWindowId,
    sys_table_id: quoteTableId,
    name: 'Quote',
    help: tabHelpFor('bus_quote'),
    tab_level: 0,
    seq_no: 10,
    is_single_row: true,
    has_tree: false,
    is_info_tab: false,
    is_translation_tab: false,
    is_read_only: false,
    is_insert_record: true,
    is_advanced_tab: false,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();

  // Create sys_column entries
  const quoteColumns: Array<{ id: string; name: string; displayName: string; isKey: boolean }> = [];

  let quoteColumnSeqNo = 10;
  const quote_id_columnId = uuidv4();
  quoteColumns.push({
    id: quote_id_columnId,
    name: 'id',
    displayName: 'Id',
    isKey: true,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: quote_id_columnId,
    sys_table_id: quoteTableId,
    column_name: 'id',
    name: 'Id',
    sys_reference_id: 13,
    is_key: true,
    is_parent: false,
    is_mandatory: false,
    is_updateable: false,
    is_identifier: false,
    is_selection_column: true,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: false,
    seq_no: quoteColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  quoteColumnSeqNo += 10;
  const quote_quoteNumber_columnId = uuidv4();
  quoteColumns.push({
    id: quote_quoteNumber_columnId,
    name: 'quote_number',
    displayName: 'Quote Number',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: quote_quoteNumber_columnId,
    sys_table_id: quoteTableId,
    column_name: 'quote_number',
    name: 'Quote Number',
    sys_reference_id: 10,
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: true,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: quoteColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  quoteColumnSeqNo += 10;
  const quote_opportunityId_columnId = uuidv4();
  quoteColumns.push({
    id: quote_opportunityId_columnId,
    name: 'opportunity_id',
    displayName: 'Opportunity Id',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: quote_opportunityId_columnId,
    sys_table_id: quoteTableId,
    column_name: 'opportunity_id',
    name: 'Opportunity Id',
    sys_reference_id: 19,
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: quoteColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  quoteColumnSeqNo += 10;
  const quote_accountId_columnId = uuidv4();
  quoteColumns.push({
    id: quote_accountId_columnId,
    name: 'account_id',
    displayName: 'Account Id',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: quote_accountId_columnId,
    sys_table_id: quoteTableId,
    column_name: 'account_id',
    name: 'Account Id',
    sys_reference_id: 19,
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: quoteColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  quoteColumnSeqNo += 10;
  const quote_name_columnId = uuidv4();
  quoteColumns.push({
    id: quote_name_columnId,
    name: 'name',
    displayName: 'Name',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: quote_name_columnId,
    sys_table_id: quoteTableId,
    column_name: 'name',
    name: 'Name',
    sys_reference_id: 10,
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: true,
    is_selection_column: true,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: quoteColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  quoteColumnSeqNo += 10;
  const quote_status_columnId = uuidv4();
  quoteColumns.push({
    id: quote_status_columnId,
    name: 'status',
    displayName: 'Status',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: quote_status_columnId,
    sys_table_id: quoteTableId,
    column_name: 'status',
    name: 'Status',
    sys_reference_id: 1023,
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: quoteColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  quoteColumnSeqNo += 10;
  const quote_versionNumber_columnId = uuidv4();
  quoteColumns.push({
    id: quote_versionNumber_columnId,
    name: 'version_number',
    displayName: 'Version Number',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: quote_versionNumber_columnId,
    sys_table_id: quoteTableId,
    column_name: 'version_number',
    name: 'Version Number',
    sys_reference_id: 11,
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: quoteColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  quoteColumnSeqNo += 10;
  const quote_validUntil_columnId = uuidv4();
  quoteColumns.push({
    id: quote_validUntil_columnId,
    name: 'valid_until',
    displayName: 'Valid Until',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: quote_validUntil_columnId,
    sys_table_id: quoteTableId,
    column_name: 'valid_until',
    name: 'Valid Until',
    sys_reference_id: 15,
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: quoteColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  quoteColumnSeqNo += 10;
  const quote_subtotal_columnId = uuidv4();
  quoteColumns.push({
    id: quote_subtotal_columnId,
    name: 'subtotal',
    displayName: 'Subtotal',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: quote_subtotal_columnId,
    sys_table_id: quoteTableId,
    column_name: 'subtotal',
    name: 'Subtotal',
    sys_reference_id: 12,
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: quoteColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  quoteColumnSeqNo += 10;
  const quote_discountPercent_columnId = uuidv4();
  quoteColumns.push({
    id: quote_discountPercent_columnId,
    name: 'discount_percent',
    displayName: 'Discount Percent',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: quote_discountPercent_columnId,
    sys_table_id: quoteTableId,
    column_name: 'discount_percent',
    name: 'Discount Percent',
    sys_reference_id: 12,
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: quoteColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  quoteColumnSeqNo += 10;
  const quote_discountAmount_columnId = uuidv4();
  quoteColumns.push({
    id: quote_discountAmount_columnId,
    name: 'discount_amount',
    displayName: 'Discount Amount',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: quote_discountAmount_columnId,
    sys_table_id: quoteTableId,
    column_name: 'discount_amount',
    name: 'Discount Amount',
    sys_reference_id: 12,
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: quoteColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  quoteColumnSeqNo += 10;
  const quote_taxAmount_columnId = uuidv4();
  quoteColumns.push({
    id: quote_taxAmount_columnId,
    name: 'tax_amount',
    displayName: 'Tax Amount',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: quote_taxAmount_columnId,
    sys_table_id: quoteTableId,
    column_name: 'tax_amount',
    name: 'Tax Amount',
    sys_reference_id: 12,
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: quoteColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  quoteColumnSeqNo += 10;
  const quote_grandTotal_columnId = uuidv4();
  quoteColumns.push({
    id: quote_grandTotal_columnId,
    name: 'grand_total',
    displayName: 'Grand Total',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: quote_grandTotal_columnId,
    sys_table_id: quoteTableId,
    column_name: 'grand_total',
    name: 'Grand Total',
    sys_reference_id: 12,
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: quoteColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  quoteColumnSeqNo += 10;
  const quote_approvedById_columnId = uuidv4();
  quoteColumns.push({
    id: quote_approvedById_columnId,
    name: 'approved_by_id',
    displayName: 'Approved By Id',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: quote_approvedById_columnId,
    sys_table_id: quoteTableId,
    column_name: 'approved_by_id',
    name: 'Approved By Id',
    sys_reference_id: 19,
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: quoteColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  quoteColumnSeqNo += 10;
  const quote_approvedAt_columnId = uuidv4();
  quoteColumns.push({
    id: quote_approvedAt_columnId,
    name: 'approved_at',
    displayName: 'Approved At',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: quote_approvedAt_columnId,
    sys_table_id: quoteTableId,
    column_name: 'approved_at',
    name: 'Approved At',
    sys_reference_id: 16,
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: quoteColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  quoteColumnSeqNo += 10;
  const quote_approvalNotes_columnId = uuidv4();
  quoteColumns.push({
    id: quote_approvalNotes_columnId,
    name: 'approval_notes',
    displayName: 'Approval Notes',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: quote_approvalNotes_columnId,
    sys_table_id: quoteTableId,
    column_name: 'approval_notes',
    name: 'Approval Notes',
    sys_reference_id: 14,
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: quoteColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  quoteColumnSeqNo += 10;
  const quote_ownerId_columnId = uuidv4();
  quoteColumns.push({
    id: quote_ownerId_columnId,
    name: 'owner_id',
    displayName: 'Owner Id',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: quote_ownerId_columnId,
    sys_table_id: quoteTableId,
    column_name: 'owner_id',
    name: 'Owner Id',
    sys_reference_id: 19,
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: quoteColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  quoteColumnSeqNo += 10;

  // Create sys_field entries with sequential seq_no
  for (let i = 0; i < quoteColumns.length; i++) {
    const col = quoteColumns[i];
    await db.insertInto('sys_field').values({
      sys_field_id: uuidv4(),
      sys_tab_id: quoteTabId,
      sys_column_id: col.id,
      sys_field_group_id: i < 3 ? fieldGroupGeneral : fieldGroupDetails,
      name: col.displayName,
      help: fieldHelpFor('bus_quote', col.name),
      seq_no: (i + 1) * 10,
      seq_no_grid: (i + 1) * 10,
      is_displayed: !col.isKey,
      is_displayed_grid: !col.isKey && i < 8, // show first 8 non-pk columns in grid
      is_read_only: ['created_at', 'updated_at', 'deleted_at'].includes(col.name),
      is_encrypted: false,
      is_same_line: false,
      is_heading: false,
      is_field_only: false,
      entity_type: 'U',
      is_active: true,
      created_by: createdBy,
      updated_by: createdBy,
      created_at: now,
      updated_at: now,
    }).execute();
  }

  // Grant access to admin role
  await db.insertInto('sys_access').values({
    sys_access_id: uuidv4(),
    sys_role_id: adminRoleId,
    sys_table_id: quoteTableId,
    sys_window_id: quoteWindowId,
    access_type_table: 'W',
    is_read_only: false,
    is_exclude: false,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();

  // Grant read access.
  //
  // To the roles the model says own this entity, when it restricted `read` on
  // it — that is what makes a functional role's application *its* application
  // rather than the whole system with most of it refusing to open. To every
  // role otherwise, which is the behaviour of every model that declares no read
  // restriction, and therefore of every model written before this existed.
  const quoteRoleIds = roleIdsNamed(['account_executive', 'sales_manager', 'sales_ops', 'sales_rep']);
  for (const roleId of quoteRoleIds) {
    await db.insertInto('sys_access').values({
      sys_access_id: uuidv4(),
      sys_role_id: roleId,
      sys_table_id: quoteTableId,
      sys_window_id: quoteWindowId,
      access_type_table: 'R',
      is_read_only: true,
      is_exclude: false,
      entity_type: 'U',
      is_active: true,
      created_by: createdBy,
      updated_by: createdBy,
      created_at: now,
      updated_at: now,
    }).execute();
  }

  console.log('✓ Created dictionary entries for Quote');

  // --------------------------------------------------------------------------
  // Quote Line Item (bus_quote_line_item)
  // --------------------------------------------------------------------------
  const quoteLineItemTableId = uuidv4();
  const quoteLineItemWindowId = uuidv4();
  const quoteLineItemTabId = uuidv4();

  // Create sys_window entry FIRST (sys_table references it)
  await db.insertInto('sys_window').values({
    sys_window_id: quoteLineItemWindowId,
    name: 'Quote Line Item',
    description: 'Maintain Quote Line Item records',
    help: windowHelpFor('bus_quote_line_item'),
    window_type: 'M',
    is_sales_transaction: false,
    is_default: true,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();

  // Create sys_table entry AFTER sys_window
  await db.insertInto('sys_table').values({
    sys_table_id: quoteLineItemTableId,
    table_name: 'bus_quote_line_item',
    name: 'Quote Line Item',
    description: "One product on one quote, priced, in the order it appears on the document.",
    access_level: 'A',
    is_view: false,
    is_document: false,
    is_high_volume: false,
    is_changelog: true,
    sys_window_id: quoteLineItemWindowId,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();

  // Create sys_tab entry
  await db.insertInto('sys_tab').values({
    sys_tab_id: quoteLineItemTabId,
    sys_window_id: quoteLineItemWindowId,
    sys_table_id: quoteLineItemTableId,
    name: 'Quote Line Item',
    help: tabHelpFor('bus_quote_line_item'),
    tab_level: 0,
    seq_no: 10,
    is_single_row: true,
    has_tree: false,
    is_info_tab: false,
    is_translation_tab: false,
    is_read_only: false,
    is_insert_record: true,
    is_advanced_tab: false,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();

  // Create sys_column entries
  const quoteLineItemColumns: Array<{ id: string; name: string; displayName: string; isKey: boolean }> = [];

  let quoteLineItemColumnSeqNo = 10;
  const quoteLineItem_id_columnId = uuidv4();
  quoteLineItemColumns.push({
    id: quoteLineItem_id_columnId,
    name: 'id',
    displayName: 'Id',
    isKey: true,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: quoteLineItem_id_columnId,
    sys_table_id: quoteLineItemTableId,
    column_name: 'id',
    name: 'Id',
    sys_reference_id: 13,
    is_key: true,
    is_parent: false,
    is_mandatory: false,
    is_updateable: false,
    is_identifier: false,
    is_selection_column: true,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: false,
    seq_no: quoteLineItemColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  quoteLineItemColumnSeqNo += 10;
  const quoteLineItem_quoteId_columnId = uuidv4();
  quoteLineItemColumns.push({
    id: quoteLineItem_quoteId_columnId,
    name: 'quote_id',
    displayName: 'Quote Id',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: quoteLineItem_quoteId_columnId,
    sys_table_id: quoteLineItemTableId,
    column_name: 'quote_id',
    name: 'Quote Id',
    sys_reference_id: 19,
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: true,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: quoteLineItemColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  quoteLineItemColumnSeqNo += 10;
  const quoteLineItem_productId_columnId = uuidv4();
  quoteLineItemColumns.push({
    id: quoteLineItem_productId_columnId,
    name: 'product_id',
    displayName: 'Product Id',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: quoteLineItem_productId_columnId,
    sys_table_id: quoteLineItemTableId,
    column_name: 'product_id',
    name: 'Product Id',
    sys_reference_id: 19,
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: true,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: quoteLineItemColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  quoteLineItemColumnSeqNo += 10;
  const quoteLineItem_quantity_columnId = uuidv4();
  quoteLineItemColumns.push({
    id: quoteLineItem_quantity_columnId,
    name: 'quantity',
    displayName: 'Quantity',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: quoteLineItem_quantity_columnId,
    sys_table_id: quoteLineItemTableId,
    column_name: 'quantity',
    name: 'Quantity',
    sys_reference_id: 12,
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: quoteLineItemColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  quoteLineItemColumnSeqNo += 10;
  const quoteLineItem_unitPrice_columnId = uuidv4();
  quoteLineItemColumns.push({
    id: quoteLineItem_unitPrice_columnId,
    name: 'unit_price',
    displayName: 'Unit Price',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: quoteLineItem_unitPrice_columnId,
    sys_table_id: quoteLineItemTableId,
    column_name: 'unit_price',
    name: 'Unit Price',
    sys_reference_id: 12,
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: quoteLineItemColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  quoteLineItemColumnSeqNo += 10;
  const quoteLineItem_discountPercent_columnId = uuidv4();
  quoteLineItemColumns.push({
    id: quoteLineItem_discountPercent_columnId,
    name: 'discount_percent',
    displayName: 'Discount Percent',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: quoteLineItem_discountPercent_columnId,
    sys_table_id: quoteLineItemTableId,
    column_name: 'discount_percent',
    name: 'Discount Percent',
    sys_reference_id: 12,
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: quoteLineItemColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  quoteLineItemColumnSeqNo += 10;
  const quoteLineItem_lineTotal_columnId = uuidv4();
  quoteLineItemColumns.push({
    id: quoteLineItem_lineTotal_columnId,
    name: 'line_total',
    displayName: 'Line Total',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: quoteLineItem_lineTotal_columnId,
    sys_table_id: quoteLineItemTableId,
    column_name: 'line_total',
    name: 'Line Total',
    sys_reference_id: 12,
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: quoteLineItemColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  quoteLineItemColumnSeqNo += 10;
  const quoteLineItem_sortOrder_columnId = uuidv4();
  quoteLineItemColumns.push({
    id: quoteLineItem_sortOrder_columnId,
    name: 'sort_order',
    displayName: 'Sort Order',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: quoteLineItem_sortOrder_columnId,
    sys_table_id: quoteLineItemTableId,
    column_name: 'sort_order',
    name: 'Sort Order',
    sys_reference_id: 11,
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: quoteLineItemColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  quoteLineItemColumnSeqNo += 10;

  // Create sys_field entries with sequential seq_no
  for (let i = 0; i < quoteLineItemColumns.length; i++) {
    const col = quoteLineItemColumns[i];
    await db.insertInto('sys_field').values({
      sys_field_id: uuidv4(),
      sys_tab_id: quoteLineItemTabId,
      sys_column_id: col.id,
      sys_field_group_id: i < 3 ? fieldGroupGeneral : fieldGroupDetails,
      name: col.displayName,
      help: fieldHelpFor('bus_quote_line_item', col.name),
      seq_no: (i + 1) * 10,
      seq_no_grid: (i + 1) * 10,
      is_displayed: !col.isKey,
      is_displayed_grid: !col.isKey && i < 8, // show first 8 non-pk columns in grid
      is_read_only: ['created_at', 'updated_at', 'deleted_at'].includes(col.name),
      is_encrypted: false,
      is_same_line: false,
      is_heading: false,
      is_field_only: false,
      entity_type: 'U',
      is_active: true,
      created_by: createdBy,
      updated_by: createdBy,
      created_at: now,
      updated_at: now,
    }).execute();
  }

  // Grant access to admin role
  await db.insertInto('sys_access').values({
    sys_access_id: uuidv4(),
    sys_role_id: adminRoleId,
    sys_table_id: quoteLineItemTableId,
    sys_window_id: quoteLineItemWindowId,
    access_type_table: 'W',
    is_read_only: false,
    is_exclude: false,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();

  // Grant read access.
  //
  // To the roles the model says own this entity, when it restricted `read` on
  // it — that is what makes a functional role's application *its* application
  // rather than the whole system with most of it refusing to open. To every
  // role otherwise, which is the behaviour of every model that declares no read
  // restriction, and therefore of every model written before this existed.
  const quoteLineItemRoleIds = roleIdsNamed(['account_executive', 'sales_manager', 'sales_ops', 'sales_rep']);
  for (const roleId of quoteLineItemRoleIds) {
    await db.insertInto('sys_access').values({
      sys_access_id: uuidv4(),
      sys_role_id: roleId,
      sys_table_id: quoteLineItemTableId,
      sys_window_id: quoteLineItemWindowId,
      access_type_table: 'R',
      is_read_only: true,
      is_exclude: false,
      entity_type: 'U',
      is_active: true,
      created_by: createdBy,
      updated_by: createdBy,
      created_at: now,
      updated_at: now,
    }).execute();
  }

  console.log('✓ Created dictionary entries for Quote Line Item');

  // --------------------------------------------------------------------------
  // Contract (bus_contract)
  // --------------------------------------------------------------------------
  const contractTableId = uuidv4();
  const contractWindowId = uuidv4();
  const contractTabId = uuidv4();

  // Create sys_window entry FIRST (sys_table references it)
  await db.insertInto('sys_window').values({
    sys_window_id: contractWindowId,
    name: 'Contract',
    description: 'Maintain Contract records',
    help: windowHelpFor('bus_contract'),
    window_type: 'M',
    is_sales_transaction: false,
    is_default: true,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();

  // Create sys_table entry AFTER sys_window
  await db.insertInto('sys_table').values({
    sys_table_id: contractTableId,
    table_name: 'bus_contract',
    name: 'Contract',
    description: "The signed commitment that follows an accepted quote — a term, an annual value and a renewal date.",
    access_level: 'A',
    is_view: false,
    is_document: false,
    is_high_volume: false,
    is_changelog: true,
    sys_window_id: contractWindowId,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();

  // Create sys_tab entry
  await db.insertInto('sys_tab').values({
    sys_tab_id: contractTabId,
    sys_window_id: contractWindowId,
    sys_table_id: contractTableId,
    name: 'Contract',
    help: tabHelpFor('bus_contract'),
    tab_level: 0,
    seq_no: 10,
    is_single_row: true,
    has_tree: false,
    is_info_tab: false,
    is_translation_tab: false,
    is_read_only: false,
    is_insert_record: true,
    is_advanced_tab: false,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();

  // Create sys_column entries
  const contractColumns: Array<{ id: string; name: string; displayName: string; isKey: boolean }> = [];

  let contractColumnSeqNo = 10;
  const contract_id_columnId = uuidv4();
  contractColumns.push({
    id: contract_id_columnId,
    name: 'id',
    displayName: 'Id',
    isKey: true,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: contract_id_columnId,
    sys_table_id: contractTableId,
    column_name: 'id',
    name: 'Id',
    sys_reference_id: 13,
    is_key: true,
    is_parent: false,
    is_mandatory: false,
    is_updateable: false,
    is_identifier: false,
    is_selection_column: true,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: false,
    seq_no: contractColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  contractColumnSeqNo += 10;
  const contract_contractNumber_columnId = uuidv4();
  contractColumns.push({
    id: contract_contractNumber_columnId,
    name: 'contract_number',
    displayName: 'Contract Number',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: contract_contractNumber_columnId,
    sys_table_id: contractTableId,
    column_name: 'contract_number',
    name: 'Contract Number',
    sys_reference_id: 10,
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: true,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: contractColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  contractColumnSeqNo += 10;
  const contract_accountId_columnId = uuidv4();
  contractColumns.push({
    id: contract_accountId_columnId,
    name: 'account_id',
    displayName: 'Account Id',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: contract_accountId_columnId,
    sys_table_id: contractTableId,
    column_name: 'account_id',
    name: 'Account Id',
    sys_reference_id: 19,
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: true,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: contractColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  contractColumnSeqNo += 10;
  const contract_quoteId_columnId = uuidv4();
  contractColumns.push({
    id: contract_quoteId_columnId,
    name: 'quote_id',
    displayName: 'Quote Id',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: contract_quoteId_columnId,
    sys_table_id: contractTableId,
    column_name: 'quote_id',
    name: 'Quote Id',
    sys_reference_id: 19,
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: true,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: contractColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  contractColumnSeqNo += 10;
  const contract_status_columnId = uuidv4();
  contractColumns.push({
    id: contract_status_columnId,
    name: 'status',
    displayName: 'Status',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: contract_status_columnId,
    sys_table_id: contractTableId,
    column_name: 'status',
    name: 'Status',
    sys_reference_id: 1014,
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: contractColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  contractColumnSeqNo += 10;
  const contract_startDate_columnId = uuidv4();
  contractColumns.push({
    id: contract_startDate_columnId,
    name: 'start_date',
    displayName: 'Start Date',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: contract_startDate_columnId,
    sys_table_id: contractTableId,
    column_name: 'start_date',
    name: 'Start Date',
    sys_reference_id: 15,
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: contractColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  contractColumnSeqNo += 10;
  const contract_endDate_columnId = uuidv4();
  contractColumns.push({
    id: contract_endDate_columnId,
    name: 'end_date',
    displayName: 'End Date',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: contract_endDate_columnId,
    sys_table_id: contractTableId,
    column_name: 'end_date',
    name: 'End Date',
    sys_reference_id: 15,
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: contractColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  contractColumnSeqNo += 10;
  const contract_termMonths_columnId = uuidv4();
  contractColumns.push({
    id: contract_termMonths_columnId,
    name: 'term_months',
    displayName: 'Term Months',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: contract_termMonths_columnId,
    sys_table_id: contractTableId,
    column_name: 'term_months',
    name: 'Term Months',
    sys_reference_id: 11,
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: contractColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  contractColumnSeqNo += 10;
  const contract_annualValue_columnId = uuidv4();
  contractColumns.push({
    id: contract_annualValue_columnId,
    name: 'annual_value',
    displayName: 'Annual Value',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: contract_annualValue_columnId,
    sys_table_id: contractTableId,
    column_name: 'annual_value',
    name: 'Annual Value',
    sys_reference_id: 12,
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: contractColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  contractColumnSeqNo += 10;
  const contract_autoRenew_columnId = uuidv4();
  contractColumns.push({
    id: contract_autoRenew_columnId,
    name: 'auto_renew',
    displayName: 'Auto Renew',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: contract_autoRenew_columnId,
    sys_table_id: contractTableId,
    column_name: 'auto_renew',
    name: 'Auto Renew',
    sys_reference_id: 20,
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: contractColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  contractColumnSeqNo += 10;
  const contract_renewalNoticeDays_columnId = uuidv4();
  contractColumns.push({
    id: contract_renewalNoticeDays_columnId,
    name: 'renewal_notice_days',
    displayName: 'Renewal Notice Days',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: contract_renewalNoticeDays_columnId,
    sys_table_id: contractTableId,
    column_name: 'renewal_notice_days',
    name: 'Renewal Notice Days',
    sys_reference_id: 11,
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: contractColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  contractColumnSeqNo += 10;
  const contract_signedById_columnId = uuidv4();
  contractColumns.push({
    id: contract_signedById_columnId,
    name: 'signed_by_id',
    displayName: 'Signed By Id',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: contract_signedById_columnId,
    sys_table_id: contractTableId,
    column_name: 'signed_by_id',
    name: 'Signed By Id',
    sys_reference_id: 19,
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: contractColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  contractColumnSeqNo += 10;
  const contract_signedAt_columnId = uuidv4();
  contractColumns.push({
    id: contract_signedAt_columnId,
    name: 'signed_at',
    displayName: 'Signed At',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: contract_signedAt_columnId,
    sys_table_id: contractTableId,
    column_name: 'signed_at',
    name: 'Signed At',
    sys_reference_id: 16,
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: contractColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  contractColumnSeqNo += 10;
  const contract_ownerId_columnId = uuidv4();
  contractColumns.push({
    id: contract_ownerId_columnId,
    name: 'owner_id',
    displayName: 'Owner Id',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: contract_ownerId_columnId,
    sys_table_id: contractTableId,
    column_name: 'owner_id',
    name: 'Owner Id',
    sys_reference_id: 19,
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: contractColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  contractColumnSeqNo += 10;

  // Create sys_field entries with sequential seq_no
  for (let i = 0; i < contractColumns.length; i++) {
    const col = contractColumns[i];
    await db.insertInto('sys_field').values({
      sys_field_id: uuidv4(),
      sys_tab_id: contractTabId,
      sys_column_id: col.id,
      sys_field_group_id: i < 3 ? fieldGroupGeneral : fieldGroupDetails,
      name: col.displayName,
      help: fieldHelpFor('bus_contract', col.name),
      seq_no: (i + 1) * 10,
      seq_no_grid: (i + 1) * 10,
      is_displayed: !col.isKey,
      is_displayed_grid: !col.isKey && i < 8, // show first 8 non-pk columns in grid
      is_read_only: ['created_at', 'updated_at', 'deleted_at'].includes(col.name),
      is_encrypted: false,
      is_same_line: false,
      is_heading: false,
      is_field_only: false,
      entity_type: 'U',
      is_active: true,
      created_by: createdBy,
      updated_by: createdBy,
      created_at: now,
      updated_at: now,
    }).execute();
  }

  // Grant access to admin role
  await db.insertInto('sys_access').values({
    sys_access_id: uuidv4(),
    sys_role_id: adminRoleId,
    sys_table_id: contractTableId,
    sys_window_id: contractWindowId,
    access_type_table: 'W',
    is_read_only: false,
    is_exclude: false,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();

  // Grant read access.
  //
  // To the roles the model says own this entity, when it restricted `read` on
  // it — that is what makes a functional role's application *its* application
  // rather than the whole system with most of it refusing to open. To every
  // role otherwise, which is the behaviour of every model that declares no read
  // restriction, and therefore of every model written before this existed.
  const contractRoleIds = roleIdsNamed(['account_executive', 'sales_manager', 'sales_ops']);
  for (const roleId of contractRoleIds) {
    await db.insertInto('sys_access').values({
      sys_access_id: uuidv4(),
      sys_role_id: roleId,
      sys_table_id: contractTableId,
      sys_window_id: contractWindowId,
      access_type_table: 'R',
      is_read_only: true,
      is_exclude: false,
      entity_type: 'U',
      is_active: true,
      created_by: createdBy,
      updated_by: createdBy,
      created_at: now,
      updated_at: now,
    }).execute();
  }

  console.log('✓ Created dictionary entries for Contract');

  // --------------------------------------------------------------------------
  // Support Case (bus_support_case)
  // --------------------------------------------------------------------------
  const supportCaseTableId = uuidv4();
  const supportCaseWindowId = uuidv4();
  const supportCaseTabId = uuidv4();

  // Create sys_window entry FIRST (sys_table references it)
  await db.insertInto('sys_window').values({
    sys_window_id: supportCaseWindowId,
    name: 'Support Case',
    description: 'Maintain Support Case records',
    help: windowHelpFor('bus_support_case'),
    window_type: 'M',
    is_sales_transaction: false,
    is_default: true,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();

  // Create sys_table entry AFTER sys_window
  await db.insertInto('sys_table').values({
    sys_table_id: supportCaseTableId,
    table_name: 'bus_support_case',
    name: 'Support Case',
    description: "A customer problem, from the moment it arrives to the moment it is resolved, measured against an SLA.",
    access_level: 'A',
    is_view: false,
    is_document: false,
    is_high_volume: false,
    is_changelog: true,
    sys_window_id: supportCaseWindowId,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();

  // Create sys_tab entry
  await db.insertInto('sys_tab').values({
    sys_tab_id: supportCaseTabId,
    sys_window_id: supportCaseWindowId,
    sys_table_id: supportCaseTableId,
    name: 'Support Case',
    help: tabHelpFor('bus_support_case'),
    tab_level: 0,
    seq_no: 10,
    is_single_row: true,
    has_tree: false,
    is_info_tab: false,
    is_translation_tab: false,
    is_read_only: false,
    is_insert_record: true,
    is_advanced_tab: false,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();

  // Create sys_column entries
  const supportCaseColumns: Array<{ id: string; name: string; displayName: string; isKey: boolean }> = [];

  let supportCaseColumnSeqNo = 10;
  const supportCase_id_columnId = uuidv4();
  supportCaseColumns.push({
    id: supportCase_id_columnId,
    name: 'id',
    displayName: 'Id',
    isKey: true,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: supportCase_id_columnId,
    sys_table_id: supportCaseTableId,
    column_name: 'id',
    name: 'Id',
    sys_reference_id: 13,
    is_key: true,
    is_parent: false,
    is_mandatory: false,
    is_updateable: false,
    is_identifier: false,
    is_selection_column: true,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: false,
    seq_no: supportCaseColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  supportCaseColumnSeqNo += 10;
  const supportCase_caseNumber_columnId = uuidv4();
  supportCaseColumns.push({
    id: supportCase_caseNumber_columnId,
    name: 'case_number',
    displayName: 'Case Number',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: supportCase_caseNumber_columnId,
    sys_table_id: supportCaseTableId,
    column_name: 'case_number',
    name: 'Case Number',
    sys_reference_id: 10,
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: true,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: supportCaseColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  supportCaseColumnSeqNo += 10;
  const supportCase_accountId_columnId = uuidv4();
  supportCaseColumns.push({
    id: supportCase_accountId_columnId,
    name: 'account_id',
    displayName: 'Account Id',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: supportCase_accountId_columnId,
    sys_table_id: supportCaseTableId,
    column_name: 'account_id',
    name: 'Account Id',
    sys_reference_id: 19,
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: supportCaseColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  supportCaseColumnSeqNo += 10;
  const supportCase_contactId_columnId = uuidv4();
  supportCaseColumns.push({
    id: supportCase_contactId_columnId,
    name: 'contact_id',
    displayName: 'Contact Id',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: supportCase_contactId_columnId,
    sys_table_id: supportCaseTableId,
    column_name: 'contact_id',
    name: 'Contact Id',
    sys_reference_id: 19,
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: supportCaseColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  supportCaseColumnSeqNo += 10;
  const supportCase_slaPolicyId_columnId = uuidv4();
  supportCaseColumns.push({
    id: supportCase_slaPolicyId_columnId,
    name: 'sla_policy_id',
    displayName: 'Sla Policy Id',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: supportCase_slaPolicyId_columnId,
    sys_table_id: supportCaseTableId,
    column_name: 'sla_policy_id',
    name: 'Sla Policy Id',
    sys_reference_id: 19,
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: supportCaseColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  supportCaseColumnSeqNo += 10;
  const supportCase_subject_columnId = uuidv4();
  supportCaseColumns.push({
    id: supportCase_subject_columnId,
    name: 'subject',
    displayName: 'Subject',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: supportCase_subject_columnId,
    sys_table_id: supportCaseTableId,
    column_name: 'subject',
    name: 'Subject',
    sys_reference_id: 10,
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: true,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: supportCaseColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  supportCaseColumnSeqNo += 10;
  const supportCase_description_columnId = uuidv4();
  supportCaseColumns.push({
    id: supportCase_description_columnId,
    name: 'description',
    displayName: 'Description',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: supportCase_description_columnId,
    sys_table_id: supportCaseTableId,
    column_name: 'description',
    name: 'Description',
    sys_reference_id: 14,
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: supportCaseColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  supportCaseColumnSeqNo += 10;
  const supportCase_caseType_columnId = uuidv4();
  supportCaseColumns.push({
    id: supportCase_caseType_columnId,
    name: 'case_type',
    displayName: 'Case Type',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: supportCase_caseType_columnId,
    sys_table_id: supportCaseTableId,
    column_name: 'case_type',
    name: 'Case Type',
    sys_reference_id: 1012,
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: supportCaseColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  supportCaseColumnSeqNo += 10;
  const supportCase_priority_columnId = uuidv4();
  supportCaseColumns.push({
    id: supportCase_priority_columnId,
    name: 'priority',
    displayName: 'Priority',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: supportCase_priority_columnId,
    sys_table_id: supportCaseTableId,
    column_name: 'priority',
    name: 'Priority',
    sys_reference_id: 1010,
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: supportCaseColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  supportCaseColumnSeqNo += 10;
  const supportCase_origin_columnId = uuidv4();
  supportCaseColumns.push({
    id: supportCase_origin_columnId,
    name: 'origin',
    displayName: 'Origin',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: supportCase_origin_columnId,
    sys_table_id: supportCaseTableId,
    column_name: 'origin',
    name: 'Origin',
    sys_reference_id: 1009,
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: supportCaseColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  supportCaseColumnSeqNo += 10;
  const supportCase_status_columnId = uuidv4();
  supportCaseColumns.push({
    id: supportCase_status_columnId,
    name: 'status',
    displayName: 'Status',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: supportCase_status_columnId,
    sys_table_id: supportCaseTableId,
    column_name: 'status',
    name: 'Status',
    sys_reference_id: 1011,
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: supportCaseColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  supportCaseColumnSeqNo += 10;
  const supportCase_firstResponseDueAt_columnId = uuidv4();
  supportCaseColumns.push({
    id: supportCase_firstResponseDueAt_columnId,
    name: 'first_response_due_at',
    displayName: 'First Response Due At',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: supportCase_firstResponseDueAt_columnId,
    sys_table_id: supportCaseTableId,
    column_name: 'first_response_due_at',
    name: 'First Response Due At',
    sys_reference_id: 16,
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: supportCaseColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  supportCaseColumnSeqNo += 10;
  const supportCase_firstResponseAt_columnId = uuidv4();
  supportCaseColumns.push({
    id: supportCase_firstResponseAt_columnId,
    name: 'first_response_at',
    displayName: 'First Response At',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: supportCase_firstResponseAt_columnId,
    sys_table_id: supportCaseTableId,
    column_name: 'first_response_at',
    name: 'First Response At',
    sys_reference_id: 16,
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: supportCaseColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  supportCaseColumnSeqNo += 10;
  const supportCase_resolutionDueAt_columnId = uuidv4();
  supportCaseColumns.push({
    id: supportCase_resolutionDueAt_columnId,
    name: 'resolution_due_at',
    displayName: 'Resolution Due At',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: supportCase_resolutionDueAt_columnId,
    sys_table_id: supportCaseTableId,
    column_name: 'resolution_due_at',
    name: 'Resolution Due At',
    sys_reference_id: 16,
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: supportCaseColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  supportCaseColumnSeqNo += 10;
  const supportCase_resolvedAt_columnId = uuidv4();
  supportCaseColumns.push({
    id: supportCase_resolvedAt_columnId,
    name: 'resolved_at',
    displayName: 'Resolved At',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: supportCase_resolvedAt_columnId,
    sys_table_id: supportCaseTableId,
    column_name: 'resolved_at',
    name: 'Resolved At',
    sys_reference_id: 16,
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: supportCaseColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  supportCaseColumnSeqNo += 10;
  const supportCase_isSlaBreached_columnId = uuidv4();
  supportCaseColumns.push({
    id: supportCase_isSlaBreached_columnId,
    name: 'is_sla_breached',
    displayName: 'Is Sla Breached',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: supportCase_isSlaBreached_columnId,
    sys_table_id: supportCaseTableId,
    column_name: 'is_sla_breached',
    name: 'Is Sla Breached',
    sys_reference_id: 20,
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: supportCaseColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  supportCaseColumnSeqNo += 10;
  const supportCase_resolutionNotes_columnId = uuidv4();
  supportCaseColumns.push({
    id: supportCase_resolutionNotes_columnId,
    name: 'resolution_notes',
    displayName: 'Resolution Notes',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: supportCase_resolutionNotes_columnId,
    sys_table_id: supportCaseTableId,
    column_name: 'resolution_notes',
    name: 'Resolution Notes',
    sys_reference_id: 14,
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: supportCaseColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  supportCaseColumnSeqNo += 10;
  const supportCase_satisfactionScore_columnId = uuidv4();
  supportCaseColumns.push({
    id: supportCase_satisfactionScore_columnId,
    name: 'satisfaction_score',
    displayName: 'Satisfaction Score',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: supportCase_satisfactionScore_columnId,
    sys_table_id: supportCaseTableId,
    column_name: 'satisfaction_score',
    name: 'Satisfaction Score',
    sys_reference_id: 11,
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: supportCaseColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  supportCaseColumnSeqNo += 10;
  const supportCase_escalatedById_columnId = uuidv4();
  supportCaseColumns.push({
    id: supportCase_escalatedById_columnId,
    name: 'escalated_by_id',
    displayName: 'Escalated By Id',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: supportCase_escalatedById_columnId,
    sys_table_id: supportCaseTableId,
    column_name: 'escalated_by_id',
    name: 'Escalated By Id',
    sys_reference_id: 19,
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: supportCaseColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  supportCaseColumnSeqNo += 10;
  const supportCase_ownerId_columnId = uuidv4();
  supportCaseColumns.push({
    id: supportCase_ownerId_columnId,
    name: 'owner_id',
    displayName: 'Owner Id',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: supportCase_ownerId_columnId,
    sys_table_id: supportCaseTableId,
    column_name: 'owner_id',
    name: 'Owner Id',
    sys_reference_id: 19,
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: supportCaseColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  supportCaseColumnSeqNo += 10;

  // Create sys_field entries with sequential seq_no
  for (let i = 0; i < supportCaseColumns.length; i++) {
    const col = supportCaseColumns[i];
    await db.insertInto('sys_field').values({
      sys_field_id: uuidv4(),
      sys_tab_id: supportCaseTabId,
      sys_column_id: col.id,
      sys_field_group_id: i < 3 ? fieldGroupGeneral : fieldGroupDetails,
      name: col.displayName,
      help: fieldHelpFor('bus_support_case', col.name),
      seq_no: (i + 1) * 10,
      seq_no_grid: (i + 1) * 10,
      is_displayed: !col.isKey,
      is_displayed_grid: !col.isKey && i < 8, // show first 8 non-pk columns in grid
      is_read_only: ['created_at', 'updated_at', 'deleted_at'].includes(col.name),
      is_encrypted: false,
      is_same_line: false,
      is_heading: false,
      is_field_only: false,
      entity_type: 'U',
      is_active: true,
      created_by: createdBy,
      updated_by: createdBy,
      created_at: now,
      updated_at: now,
    }).execute();
  }

  // Grant access to admin role
  await db.insertInto('sys_access').values({
    sys_access_id: uuidv4(),
    sys_role_id: adminRoleId,
    sys_table_id: supportCaseTableId,
    sys_window_id: supportCaseWindowId,
    access_type_table: 'W',
    is_read_only: false,
    is_exclude: false,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();

  // Grant read access.
  //
  // To the roles the model says own this entity, when it restricted `read` on
  // it — that is what makes a functional role's application *its* application
  // rather than the whole system with most of it refusing to open. To every
  // role otherwise, which is the behaviour of every model that declares no read
  // restriction, and therefore of every model written before this existed.
  const supportCaseRoleIds = roleIdsNamed(['support_agent', 'support_manager']);
  for (const roleId of supportCaseRoleIds) {
    await db.insertInto('sys_access').values({
      sys_access_id: uuidv4(),
      sys_role_id: roleId,
      sys_table_id: supportCaseTableId,
      sys_window_id: supportCaseWindowId,
      access_type_table: 'R',
      is_read_only: true,
      is_exclude: false,
      entity_type: 'U',
      is_active: true,
      created_by: createdBy,
      updated_by: createdBy,
      created_at: now,
      updated_at: now,
    }).execute();
  }

  console.log('✓ Created dictionary entries for Support Case');

  // --------------------------------------------------------------------------
  // Sla Policy (bus_sla_policy)
  // --------------------------------------------------------------------------
  const slaPolicyTableId = uuidv4();
  const slaPolicyWindowId = uuidv4();
  const slaPolicyTabId = uuidv4();

  // Create sys_window entry FIRST (sys_table references it)
  await db.insertInto('sys_window').values({
    sys_window_id: slaPolicyWindowId,
    name: 'Sla Policy',
    description: 'Maintain Sla Policy records',
    help: windowHelpFor('bus_sla_policy'),
    window_type: 'M',
    is_sales_transaction: false,
    is_default: true,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();

  // Create sys_table entry AFTER sys_window
  await db.insertInto('sys_table').values({
    sys_table_id: slaPolicyTableId,
    table_name: 'bus_sla_policy',
    name: 'Sla Policy',
    description: "How quickly cases must be answered and resolved for a given tier of customer.",
    access_level: 'A',
    is_view: false,
    is_document: false,
    is_high_volume: false,
    is_changelog: true,
    sys_window_id: slaPolicyWindowId,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();

  // Create sys_tab entry
  await db.insertInto('sys_tab').values({
    sys_tab_id: slaPolicyTabId,
    sys_window_id: slaPolicyWindowId,
    sys_table_id: slaPolicyTableId,
    name: 'Sla Policy',
    help: tabHelpFor('bus_sla_policy'),
    tab_level: 0,
    seq_no: 10,
    is_single_row: true,
    has_tree: false,
    is_info_tab: false,
    is_translation_tab: false,
    is_read_only: false,
    is_insert_record: true,
    is_advanced_tab: false,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();

  // Create sys_column entries
  const slaPolicyColumns: Array<{ id: string; name: string; displayName: string; isKey: boolean }> = [];

  let slaPolicyColumnSeqNo = 10;
  const slaPolicy_id_columnId = uuidv4();
  slaPolicyColumns.push({
    id: slaPolicy_id_columnId,
    name: 'id',
    displayName: 'Id',
    isKey: true,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: slaPolicy_id_columnId,
    sys_table_id: slaPolicyTableId,
    column_name: 'id',
    name: 'Id',
    sys_reference_id: 13,
    is_key: true,
    is_parent: false,
    is_mandatory: false,
    is_updateable: false,
    is_identifier: false,
    is_selection_column: true,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: false,
    seq_no: slaPolicyColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  slaPolicyColumnSeqNo += 10;
  const slaPolicy_name_columnId = uuidv4();
  slaPolicyColumns.push({
    id: slaPolicy_name_columnId,
    name: 'name',
    displayName: 'Name',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: slaPolicy_name_columnId,
    sys_table_id: slaPolicyTableId,
    column_name: 'name',
    name: 'Name',
    sys_reference_id: 10,
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: true,
    is_selection_column: true,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: slaPolicyColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  slaPolicyColumnSeqNo += 10;
  const slaPolicy_tier_columnId = uuidv4();
  slaPolicyColumns.push({
    id: slaPolicy_tier_columnId,
    name: 'tier',
    displayName: 'Tier',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: slaPolicy_tier_columnId,
    sys_table_id: slaPolicyTableId,
    column_name: 'tier',
    name: 'Tier',
    sys_reference_id: 1024,
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: slaPolicyColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  slaPolicyColumnSeqNo += 10;
  const slaPolicy_firstResponseMinutes_columnId = uuidv4();
  slaPolicyColumns.push({
    id: slaPolicy_firstResponseMinutes_columnId,
    name: 'first_response_minutes',
    displayName: 'First Response Minutes',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: slaPolicy_firstResponseMinutes_columnId,
    sys_table_id: slaPolicyTableId,
    column_name: 'first_response_minutes',
    name: 'First Response Minutes',
    sys_reference_id: 11,
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: slaPolicyColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  slaPolicyColumnSeqNo += 10;
  const slaPolicy_resolutionHours_columnId = uuidv4();
  slaPolicyColumns.push({
    id: slaPolicy_resolutionHours_columnId,
    name: 'resolution_hours',
    displayName: 'Resolution Hours',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: slaPolicy_resolutionHours_columnId,
    sys_table_id: slaPolicyTableId,
    column_name: 'resolution_hours',
    name: 'Resolution Hours',
    sys_reference_id: 11,
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: slaPolicyColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  slaPolicyColumnSeqNo += 10;
  const slaPolicy_businessHoursOnly_columnId = uuidv4();
  slaPolicyColumns.push({
    id: slaPolicy_businessHoursOnly_columnId,
    name: 'business_hours_only',
    displayName: 'Business Hours Only',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: slaPolicy_businessHoursOnly_columnId,
    sys_table_id: slaPolicyTableId,
    column_name: 'business_hours_only',
    name: 'Business Hours Only',
    sys_reference_id: 20,
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: slaPolicyColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  slaPolicyColumnSeqNo += 10;
  const slaPolicy_isActive_columnId = uuidv4();
  slaPolicyColumns.push({
    id: slaPolicy_isActive_columnId,
    name: 'is_active',
    displayName: 'Is Active',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: slaPolicy_isActive_columnId,
    sys_table_id: slaPolicyTableId,
    column_name: 'is_active',
    name: 'Is Active',
    sys_reference_id: 20,
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: slaPolicyColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  slaPolicyColumnSeqNo += 10;

  // Create sys_field entries with sequential seq_no
  for (let i = 0; i < slaPolicyColumns.length; i++) {
    const col = slaPolicyColumns[i];
    await db.insertInto('sys_field').values({
      sys_field_id: uuidv4(),
      sys_tab_id: slaPolicyTabId,
      sys_column_id: col.id,
      sys_field_group_id: i < 3 ? fieldGroupGeneral : fieldGroupDetails,
      name: col.displayName,
      help: fieldHelpFor('bus_sla_policy', col.name),
      seq_no: (i + 1) * 10,
      seq_no_grid: (i + 1) * 10,
      is_displayed: !col.isKey,
      is_displayed_grid: !col.isKey && i < 8, // show first 8 non-pk columns in grid
      is_read_only: ['created_at', 'updated_at', 'deleted_at'].includes(col.name),
      is_encrypted: false,
      is_same_line: false,
      is_heading: false,
      is_field_only: false,
      entity_type: 'U',
      is_active: true,
      created_by: createdBy,
      updated_by: createdBy,
      created_at: now,
      updated_at: now,
    }).execute();
  }

  // Grant access to admin role
  await db.insertInto('sys_access').values({
    sys_access_id: uuidv4(),
    sys_role_id: adminRoleId,
    sys_table_id: slaPolicyTableId,
    sys_window_id: slaPolicyWindowId,
    access_type_table: 'W',
    is_read_only: false,
    is_exclude: false,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();

  // Grant read access.
  //
  // To the roles the model says own this entity, when it restricted `read` on
  // it — that is what makes a functional role's application *its* application
  // rather than the whole system with most of it refusing to open. To every
  // role otherwise, which is the behaviour of every model that declares no read
  // restriction, and therefore of every model written before this existed.
  const slaPolicyRoleIds = roleIdsNamed(['support_agent', 'support_manager']);
  for (const roleId of slaPolicyRoleIds) {
    await db.insertInto('sys_access').values({
      sys_access_id: uuidv4(),
      sys_role_id: roleId,
      sys_table_id: slaPolicyTableId,
      sys_window_id: slaPolicyWindowId,
      access_type_table: 'R',
      is_read_only: true,
      is_exclude: false,
      entity_type: 'U',
      is_active: true,
      created_by: createdBy,
      updated_by: createdBy,
      created_at: now,
      updated_at: now,
    }).execute();
  }

  console.log('✓ Created dictionary entries for Sla Policy');

  // --------------------------------------------------------------------------
  // Activity (bus_activity)
  // --------------------------------------------------------------------------
  const activityTableId = uuidv4();
  const activityWindowId = uuidv4();
  const activityTabId = uuidv4();

  // Create sys_window entry FIRST (sys_table references it)
  await db.insertInto('sys_window').values({
    sys_window_id: activityWindowId,
    name: 'Activity',
    description: 'Maintain Activity records',
    help: windowHelpFor('bus_activity'),
    window_type: 'M',
    is_sales_transaction: false,
    is_default: true,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();

  // Create sys_table entry AFTER sys_window
  await db.insertInto('sys_table').values({
    sys_table_id: activityTableId,
    table_name: 'bus_activity',
    name: 'Activity',
    description: "A call, a meeting, an email or a task, attached to whatever it was about. The history of a relationship is its activities.",
    access_level: 'A',
    is_view: false,
    is_document: false,
    is_high_volume: false,
    is_changelog: true,
    sys_window_id: activityWindowId,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();

  // Create sys_tab entry
  await db.insertInto('sys_tab').values({
    sys_tab_id: activityTabId,
    sys_window_id: activityWindowId,
    sys_table_id: activityTableId,
    name: 'Activity',
    help: tabHelpFor('bus_activity'),
    tab_level: 0,
    seq_no: 10,
    is_single_row: true,
    has_tree: false,
    is_info_tab: false,
    is_translation_tab: false,
    is_read_only: false,
    is_insert_record: true,
    is_advanced_tab: false,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();

  // Create sys_column entries
  const activityColumns: Array<{ id: string; name: string; displayName: string; isKey: boolean }> = [];

  let activityColumnSeqNo = 10;
  const activity_id_columnId = uuidv4();
  activityColumns.push({
    id: activity_id_columnId,
    name: 'id',
    displayName: 'Id',
    isKey: true,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: activity_id_columnId,
    sys_table_id: activityTableId,
    column_name: 'id',
    name: 'Id',
    sys_reference_id: 13,
    is_key: true,
    is_parent: false,
    is_mandatory: false,
    is_updateable: false,
    is_identifier: false,
    is_selection_column: true,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: false,
    seq_no: activityColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  activityColumnSeqNo += 10;
  const activity_activityType_columnId = uuidv4();
  activityColumns.push({
    id: activity_activityType_columnId,
    name: 'activity_type',
    displayName: 'Activity Type',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: activity_activityType_columnId,
    sys_table_id: activityTableId,
    column_name: 'activity_type',
    name: 'Activity Type',
    sys_reference_id: 1005,
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: activityColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  activityColumnSeqNo += 10;
  const activity_subject_columnId = uuidv4();
  activityColumns.push({
    id: activity_subject_columnId,
    name: 'subject',
    displayName: 'Subject',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: activity_subject_columnId,
    sys_table_id: activityTableId,
    column_name: 'subject',
    name: 'Subject',
    sys_reference_id: 10,
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: true,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: activityColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  activityColumnSeqNo += 10;
  const activity_description_columnId = uuidv4();
  activityColumns.push({
    id: activity_description_columnId,
    name: 'description',
    displayName: 'Description',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: activity_description_columnId,
    sys_table_id: activityTableId,
    column_name: 'description',
    name: 'Description',
    sys_reference_id: 14,
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: activityColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  activityColumnSeqNo += 10;
  const activity_status_columnId = uuidv4();
  activityColumns.push({
    id: activity_status_columnId,
    name: 'status',
    displayName: 'Status',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: activity_status_columnId,
    sys_table_id: activityTableId,
    column_name: 'status',
    name: 'Status',
    sys_reference_id: 1004,
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: activityColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  activityColumnSeqNo += 10;
  const activity_priority_columnId = uuidv4();
  activityColumns.push({
    id: activity_priority_columnId,
    name: 'priority',
    displayName: 'Priority',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: activity_priority_columnId,
    sys_table_id: activityTableId,
    column_name: 'priority',
    name: 'Priority',
    sys_reference_id: 1003,
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: activityColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  activityColumnSeqNo += 10;
  const activity_dueAt_columnId = uuidv4();
  activityColumns.push({
    id: activity_dueAt_columnId,
    name: 'due_at',
    displayName: 'Due At',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: activity_dueAt_columnId,
    sys_table_id: activityTableId,
    column_name: 'due_at',
    name: 'Due At',
    sys_reference_id: 16,
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: activityColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  activityColumnSeqNo += 10;
  const activity_completedAt_columnId = uuidv4();
  activityColumns.push({
    id: activity_completedAt_columnId,
    name: 'completed_at',
    displayName: 'Completed At',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: activity_completedAt_columnId,
    sys_table_id: activityTableId,
    column_name: 'completed_at',
    name: 'Completed At',
    sys_reference_id: 16,
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: activityColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  activityColumnSeqNo += 10;
  const activity_durationMinutes_columnId = uuidv4();
  activityColumns.push({
    id: activity_durationMinutes_columnId,
    name: 'duration_minutes',
    displayName: 'Duration Minutes',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: activity_durationMinutes_columnId,
    sys_table_id: activityTableId,
    column_name: 'duration_minutes',
    name: 'Duration Minutes',
    sys_reference_id: 11,
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: activityColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  activityColumnSeqNo += 10;
  const activity_accountId_columnId = uuidv4();
  activityColumns.push({
    id: activity_accountId_columnId,
    name: 'account_id',
    displayName: 'Account Id',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: activity_accountId_columnId,
    sys_table_id: activityTableId,
    column_name: 'account_id',
    name: 'Account Id',
    sys_reference_id: 19,
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: activityColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  activityColumnSeqNo += 10;
  const activity_contactId_columnId = uuidv4();
  activityColumns.push({
    id: activity_contactId_columnId,
    name: 'contact_id',
    displayName: 'Contact Id',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: activity_contactId_columnId,
    sys_table_id: activityTableId,
    column_name: 'contact_id',
    name: 'Contact Id',
    sys_reference_id: 19,
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: activityColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  activityColumnSeqNo += 10;
  const activity_leadId_columnId = uuidv4();
  activityColumns.push({
    id: activity_leadId_columnId,
    name: 'lead_id',
    displayName: 'Lead Id',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: activity_leadId_columnId,
    sys_table_id: activityTableId,
    column_name: 'lead_id',
    name: 'Lead Id',
    sys_reference_id: 19,
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: activityColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  activityColumnSeqNo += 10;
  const activity_opportunityId_columnId = uuidv4();
  activityColumns.push({
    id: activity_opportunityId_columnId,
    name: 'opportunity_id',
    displayName: 'Opportunity Id',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: activity_opportunityId_columnId,
    sys_table_id: activityTableId,
    column_name: 'opportunity_id',
    name: 'Opportunity Id',
    sys_reference_id: 19,
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: activityColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  activityColumnSeqNo += 10;
  const activity_supportCaseId_columnId = uuidv4();
  activityColumns.push({
    id: activity_supportCaseId_columnId,
    name: 'support_case_id',
    displayName: 'Support Case Id',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: activity_supportCaseId_columnId,
    sys_table_id: activityTableId,
    column_name: 'support_case_id',
    name: 'Support Case Id',
    sys_reference_id: 19,
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: activityColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  activityColumnSeqNo += 10;
  const activity_contractId_columnId = uuidv4();
  activityColumns.push({
    id: activity_contractId_columnId,
    name: 'contract_id',
    displayName: 'Contract Id',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: activity_contractId_columnId,
    sys_table_id: activityTableId,
    column_name: 'contract_id',
    name: 'Contract Id',
    sys_reference_id: 19,
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: activityColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  activityColumnSeqNo += 10;
  const activity_ownerId_columnId = uuidv4();
  activityColumns.push({
    id: activity_ownerId_columnId,
    name: 'owner_id',
    displayName: 'Owner Id',
    isKey: false,
  });

  await db.insertInto('sys_column').values({
    sys_column_id: activity_ownerId_columnId,
    sys_table_id: activityTableId,
    column_name: 'owner_id',
    name: 'Owner Id',
    sys_reference_id: 19,
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: activityColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  activityColumnSeqNo += 10;

  // Create sys_field entries with sequential seq_no
  for (let i = 0; i < activityColumns.length; i++) {
    const col = activityColumns[i];
    await db.insertInto('sys_field').values({
      sys_field_id: uuidv4(),
      sys_tab_id: activityTabId,
      sys_column_id: col.id,
      sys_field_group_id: i < 3 ? fieldGroupGeneral : fieldGroupDetails,
      name: col.displayName,
      help: fieldHelpFor('bus_activity', col.name),
      seq_no: (i + 1) * 10,
      seq_no_grid: (i + 1) * 10,
      is_displayed: !col.isKey,
      is_displayed_grid: !col.isKey && i < 8, // show first 8 non-pk columns in grid
      is_read_only: ['created_at', 'updated_at', 'deleted_at'].includes(col.name),
      is_encrypted: false,
      is_same_line: false,
      is_heading: false,
      is_field_only: false,
      entity_type: 'U',
      is_active: true,
      created_by: createdBy,
      updated_by: createdBy,
      created_at: now,
      updated_at: now,
    }).execute();
  }

  // Grant access to admin role
  await db.insertInto('sys_access').values({
    sys_access_id: uuidv4(),
    sys_role_id: adminRoleId,
    sys_table_id: activityTableId,
    sys_window_id: activityWindowId,
    access_type_table: 'W',
    is_read_only: false,
    is_exclude: false,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();

  // Grant read access.
  //
  // To the roles the model says own this entity, when it restricted `read` on
  // it — that is what makes a functional role's application *its* application
  // rather than the whole system with most of it refusing to open. To every
  // role otherwise, which is the behaviour of every model that declares no read
  // restriction, and therefore of every model written before this existed.
  const activityRoleIds = roleIdsNamed(['account_executive', 'marketing_manager', 'sales_manager', 'sales_ops', 'sales_rep', 'support_agent', 'support_manager']);
  for (const roleId of activityRoleIds) {
    await db.insertInto('sys_access').values({
      sys_access_id: uuidv4(),
      sys_role_id: roleId,
      sys_table_id: activityTableId,
      sys_window_id: activityWindowId,
      access_type_table: 'R',
      is_read_only: true,
      is_exclude: false,
      entity_type: 'U',
      is_active: true,
      created_by: createdBy,
      updated_by: createdBy,
      created_at: now,
      updated_at: now,
    }).execute();
  }

  console.log('✓ Created dictionary entries for Activity');


  // ============================================================================
  // Admin Windows (entity_type = 'S') — Application Dictionary section on dashboard
  // ============================================================================
  // Every business window carries help generated from the model. These seven do
  // not describe an entity, so nothing generated help for them and the Help
  // button hid itself — the six screens that explain how the application is put
  // together were the six with no explanation of their own. The text lives in
  // the dictionary rather than in the pages so an administrator can rewrite it
  // from Window, Tab and Field like any other help.
  const adminWindowDefs = [
    {
      name: 'Business Rules',
      route: '/admin/rules',
      help:
        'Every rule that runs when a record is written. A rule belongs to one entity and one ' +
        'operation — CREATE, UPDATE or ALL — and is evaluated as a decision table: the inputs are ' +
        'columns of the record being saved, and the outputs are what the rule decides.\n\n' +
        'Rules declared in the model are seeded here on generation. A rule can also emit an action: ' +
        'reject the write with a message, overwrite a field, or trigger a workflow by name, which is ' +
        'how a condition on a record starts a multi-step process.\n\n' +
        'Rules run inside the transaction that saved the record. If one fails the write is rolled ' +
        'back, so a rule is a guarantee about the data rather than a reminder after the fact.',
    },
    {
      name: 'Workflow Designer',
      route: '/admin/workflow-definitions',
      help:
        'Everything that runs automatically on your records. Each workflow is bound to one entity ' +
        'and lists its steps in the order they run: look up a decision table, create a record on ' +
        'another entity, write a field back, delete related rows, call an external service.\n\n' +
        'The Runs when column is the difference that matters. EVERY WRITE means the workflow runs on ' +
        'each matching save. WHEN A RULE TRIGGERS IT means it runs only when a business rule names ' +
        'it, so the rule decides.\n\n' +
        'Workflows marked FROM THE MODEL are owned by the model and are rewritten on the next ' +
        'generation; anything built here is yours and is never overwritten. A run that fails rolls ' +
        'back everything it changed and records the reason against the record.',
    },
    {
      name: 'Audit Log',
      route: '/admin/audit',
      help:
        'The record of who changed what. One entry per insert, update and delete, holding the entity, ' +
        'the row, the user, the time and the before and after values of every column that moved.\n\n' +
        'Entries are written by the same transaction as the change, so the log cannot drift from the ' +
        'data. It is append-only: nothing here can be edited or deleted from the application.\n\n' +
        'Use it to answer who set this field, when did this record change state, and what did it look ' +
        'like before. Filter by entity to follow one table, or open a record to see its whole history.',
    },
    {
      name: 'Table and Column',
      route: '/admin/tables',
      help:
        'The database as the application understands it. One row per table, with its columns, their ' +
        'types, and the flags that decide behaviour everywhere else: mandatory, unique, and which ' +
        'table a foreign key points at.\n\n' +
        'This is the layer the rest of the dictionary builds on. A column marked mandatory here is ' +
        'required in every form; a column with a reference is a lookup rather than a free-text box.\n\n' +
        'Tables are created from the model on generation. Editing a definition here changes how the ' +
        'application treats the column, not the database schema itself — a new column still needs a ' +
        'migration.',
    },
    {
      name: 'Window, Tab and Field',
      route: '/admin/windows',
      help:
        'How each entity is presented. A window is one screen, a tab is one record view inside it, ' +
        'and a field is one column shown on that tab, in the order and grouping given by its sequence ' +
        'and field group.\n\n' +
        'Every screen in the application is drawn from these rows, so this is where you change what a ' +
        'form looks like without touching code: reorder fields, hide one, mark it read-only, or ' +
        'rewrite its label and help.\n\n' +
        'The help you are reading now lives here too. Window, tab and field help is what the Help ' +
        'button shows on every screen, so improving it here improves it everywhere it is read.',
    },
    {
      name: 'User',
      route: '/admin/users',
      help:
        'The people who can sign in, and the role each of them holds. A user with no role can ' +
        'authenticate but reach nothing, and deactivating a user ends their access without deleting ' +
        'the records they created.\n\n' +
        'Role assignment is what decides which windows a user sees and whether they can write in ' +
        'them. Change the role here; change what the role allows under Role.',
    },
    {
      name: 'Role',
      route: '/admin/roles',
      help:
        'What each role is allowed to reach. Access is granted per window: a role either sees a ' +
        'window or does not, and can be given it read-only.\n\n' +
        'Roles are additive over users, not over each other — a user holds one role, and that role ' +
        'is the whole of their access. A window with no grant is invisible rather than forbidden, so ' +
        'removing access removes the screen from the dashboard as well.',
    },
  ];

  for (const wd of adminWindowDefs) {
    const existing = await db.selectFrom('sys_window').select(['sys_window_id', 'help']).where('name', '=', wd.name).executeTakeFirst();
    const windowId = existing?.sys_window_id ?? uuidv4();
    if (!existing) {
      await db.insertInto('sys_window').values({
        sys_window_id: windowId,
        name: wd.name,
        description: wd.route,
        help: wd.help,
        entity_type: 'S',
        is_active: true,
        created_by: createdBy,
        updated_by: createdBy,
        created_at: now,
        updated_at: now,
      }).execute();
    } else if (!existing.help) {
      // Backfill only. An administrator who has rewritten this text keeps it —
      // re-seeding is not a licence to overwrite what someone edited.
      await db.updateTable('sys_window')
        .set({ help: wd.help, updated_by: createdBy, updated_at: now })
        .where('sys_window_id', '=', windowId)
        .execute();
    }
    const existingAccess = await db.selectFrom('sys_access').select('sys_access_id').where('sys_role_id', '=', adminRoleId).where('sys_window_id', '=', windowId).executeTakeFirst();
    if (!existingAccess) {
      await db.insertInto('sys_access').values({
        sys_access_id: uuidv4(),
        sys_role_id: adminRoleId,
        sys_window_id: windowId,
        access_type_table: 'W',
        is_read_only: false,
        is_exclude: false,
        entity_type: 'S',
        is_active: true,
        created_by: createdBy,
        updated_by: createdBy,
        created_at: now,
        updated_at: now,
      }).execute();
    }
  }

  console.log('✓ Created admin windows (Business Rules, Workflow Designer, etc.)');

  // ============================================================================
  // Summary
  // ============================================================================
  console.log('');
  console.log('Dictionary seed complete:');
  console.log('  - 17 business entities');
  console.log(`  - ${businessRoleIds.length + 1} roles granted window access`);
  console.log('  - 1 admin user (admin@localhost)');
  console.log('  - 3 field groups');
  console.log('  - 7 admin windows (Application Dictionary)');
  console.log('');
  console.log('NOTE: Field seq_no values are sequential. Administrators can');
  console.log('      reorder fields via the admin interface.');
}
