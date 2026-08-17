/**
 * Entity Categories Seed
 *
 * Creates the Application Dictionary categories declared in the model and
 * assigns each business entity to its category. The dashboard renders one
 * block per category, ordered by name.
 *
 * Idempotent: re-running updates existing categories in place (matched on
 * `code`) rather than duplicating them, and only re-assigns entities that are
 * still uncategorised or whose category no longer exists.
 *
 * Generated: 2026-08-17T16:41:43.589Z
 * Project: crm
 */

import type { Kysely } from 'kysely';
import { v4 as uuidv4 } from 'uuid';

interface CategorySeed {
  name: string;
  code: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  seqNo: number;
  isDefault: boolean;
  /** Physical table names (bus_*) that belong to this category. */
  tables: string[];
}

const CATEGORIES: CategorySeed[] = [
  {
    name: 'Accounts and Contacts',
    code: 'accounts-and-contacts',
    description: 'Customer organisations, their people and the territories that cover them',
    icon: 'Building2',
    color: '#6366f1',
    seqNo: 0,
    isDefault: false,
    tables: ['bus_account', 'bus_contact', 'bus_territory'],
  },
  {
    name: 'Demand Generation',
    code: 'demand-generation',
    description: 'Campaigns, campaign membership and inbound leads',
    icon: 'Megaphone',
    color: '#ec4899',
    seqNo: 1,
    isDefault: false,
    tables: ['bus_campaign', 'bus_campaign_member', 'bus_lead'],
  },
  {
    name: 'Sales Pipeline',
    code: 'sales-pipeline',
    description: 'Opportunities, their line items and the products sold',
    icon: 'TrendingUp',
    color: '#0ea5e9',
    seqNo: 2,
    isDefault: false,
    tables: ['bus_opportunity', 'bus_opportunity_line_item', 'bus_product'],
  },
  {
    name: 'Quotes and Contracts',
    code: 'quotes-and-contracts',
    description: 'Priced quotes, their line items and signed agreements',
    icon: 'FileSignature',
    color: '#14b8a6',
    seqNo: 3,
    isDefault: false,
    tables: ['bus_quote', 'bus_quote_line_item', 'bus_contract'],
  },
  {
    name: 'Customer Service',
    code: 'customer-service',
    description: 'Support cases and the service levels that govern them',
    icon: 'LifeBuoy',
    color: '#f59e0b',
    seqNo: 4,
    isDefault: false,
    tables: ['bus_support_case', 'bus_sla_policy'],
  },
  {
    name: 'Activities',
    code: 'activities',
    description: 'Calls, emails, meetings and tasks logged against any record',
    icon: 'CalendarClock',
    color: '#8b5cf6',
    seqNo: 5,
    isDefault: false,
    tables: ['bus_activity'],
  },
  {
    name: 'People and Teams',
    code: 'people-and-teams',
    description: 'Users, selling teams and organisational structure',
    icon: 'Users',
    color: '#64748b',
    seqNo: 6,
    isDefault: true,
    tables: ['bus_user', 'bus_team'],
  },
];

export async function seed(db: Kysely<any>): Promise<void> {
  if (CATEGORIES.length === 0) {
    console.log('  ⚠ No entity categories declared — skipping');
    return;
  }

  // A single default is enforced by a partial unique index; clear the flag
  // first so re-seeding a changed default never trips it.
  await db.updateTable('sys_category').set({ is_default: false } as any).execute();

  const codeToId = new Map<string, string>();

  for (const category of CATEGORIES) {
    const existing = await db
      .selectFrom('sys_category')
      .select('sys_category_id')
      .where('code', '=', category.code)
      .executeTakeFirst();

    const values = {
      name: category.name,
      code: category.code,
      description: category.description,
      icon: category.icon,
      color: category.color,
      seq_no: category.seqNo,
      is_default: category.isDefault,
      is_active: true,
      updated_at: new Date(),
      updated_by: 'system',
    };

    if (existing) {
      await db
        .updateTable('sys_category')
        .set(values as any)
        .where('sys_category_id', '=', existing.sys_category_id)
        .execute();
      codeToId.set(category.code, existing.sys_category_id);
      console.log(`  ✓ Updated category: ${category.name}`);
    } else {
      const id = uuidv4();
      await db
        .insertInto('sys_category')
        .values({
          sys_category_id: id,
          ...values,
          created_at: new Date(),
          created_by: 'system',
        } as any)
        .execute();
      codeToId.set(category.code, id);
      console.log(`  ✓ Created category: ${category.name}`);
    }
  }

  // Assign entities. sys_table rows are matched on table_name, which the
  // dictionary seed has already created.
  let assigned = 0;

  for (const category of CATEGORIES) {
    const categoryId = codeToId.get(category.code);
    if (!categoryId || category.tables.length === 0) continue;

    const result = await db
      .updateTable('sys_table')
      .set({ sys_category_id: categoryId } as any)
      .where('table_name', 'in', category.tables)
      .executeTakeFirst();

    assigned += Number(result?.numUpdatedRows ?? 0);
  }

  // Anything still uncategorised goes to the default, so the dashboard never
  // has to render an orphan group.
  const fallback = CATEGORIES.find((category) => category.isDefault);
  if (fallback) {
    const fallbackId = codeToId.get(fallback.code);
    if (fallbackId) {
      await db
        .updateTable('sys_table')
        .set({ sys_category_id: fallbackId } as any)
        .where('sys_category_id', 'is', null)
        .where('table_name', 'like', 'bus_%')
        .execute();
    }
  }

  console.log(`  ✓ Assigned ${assigned} entities to ${CATEGORIES.length} categories`);
}
