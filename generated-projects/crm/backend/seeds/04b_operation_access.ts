/**
 * Operation access seed — the model's `%%rbac` directives, made enforceable.
 *
 * Each row closes one `(table, operation)` pair to one role. A pair with no
 * rows is unrestricted, so this seed only ever *narrows*, and only where the
 * model asked for it.
 *
 * Two things happen here, in order:
 *
 *   1. Every role named by a directive is created in `sys_role` if absent, so
 *      an administrator can see and assign it. A rule naming a role that exists
 *      nowhere would otherwise be a restriction no user could ever satisfy.
 *   2. The rules themselves are written, replacing any previous model-declared
 *      set.
 *
 * Step 2 deletes only rows carrying `entity_type = 'D'` (declared by the
 * model). Rules an administrator adds in the running application are marked
 * 'U' and survive regeneration — the same ownership split the workflow
 * definitions use, and for the same reason: regenerating must not silently
 * discard access rules a human wrote.
 *
 * Generated: 2026-08-29T04:45:21.916Z
 * Project: my-app
 */

import { sql, type Kysely } from 'kysely';
import { v4 as uuidv4 } from 'uuid';

interface TransitionAccessSeed {
  tableName: string;
  transition: string;
  statusField: string;
  edges: Array<{ from: string; to: string }>;
  roles: string[];
}

interface OperationAccessSeed {
  tableName: string;
  operation: 'create' | 'read' | 'update' | 'delete';
  roles: string[];
}

/** Roles named by at least one rule. Created before the rules reference them. */
const RBAC_ROLES: string[] = ['account_executive', 'administrator', 'marketing_manager', 'sales_manager', 'sales_ops', 'sales_rep', 'support_agent', 'support_manager'];

const OPERATION_ACCESS: OperationAccessSeed[] = [
  {
    tableName: 'bus_account',
    operation: 'read',
    roles: ['account_executive', 'marketing_manager', 'sales_manager', 'sales_ops', 'sales_rep', 'support_agent', 'support_manager'],
  },
  {
    tableName: 'bus_activity',
    operation: 'read',
    roles: ['account_executive', 'marketing_manager', 'sales_manager', 'sales_ops', 'sales_rep', 'support_agent', 'support_manager'],
  },
  {
    tableName: 'bus_campaign',
    operation: 'read',
    roles: ['marketing_manager', 'sales_ops'],
  },
  {
    tableName: 'bus_campaign_member',
    operation: 'read',
    roles: ['marketing_manager', 'sales_ops'],
  },
  {
    tableName: 'bus_contact',
    operation: 'read',
    roles: ['account_executive', 'marketing_manager', 'sales_manager', 'sales_ops', 'sales_rep', 'support_agent', 'support_manager'],
  },
  {
    tableName: 'bus_contract',
    operation: 'read',
    roles: ['account_executive', 'sales_manager', 'sales_ops'],
  },
  {
    tableName: 'bus_contract',
    operation: 'update',
    roles: ['sales_manager', 'sales_ops'],
  },
  {
    tableName: 'bus_lead',
    operation: 'read',
    roles: ['account_executive', 'marketing_manager', 'sales_manager', 'sales_ops', 'sales_rep'],
  },
  {
    tableName: 'bus_lead',
    operation: 'update',
    roles: ['account_executive', 'sales_manager', 'sales_rep'],
  },
  {
    tableName: 'bus_opportunity',
    operation: 'delete',
    roles: ['sales_manager', 'sales_ops'],
  },
  {
    tableName: 'bus_opportunity',
    operation: 'read',
    roles: ['account_executive', 'sales_manager', 'sales_ops', 'sales_rep'],
  },
  {
    tableName: 'bus_opportunity',
    operation: 'update',
    roles: ['account_executive', 'sales_rep'],
  },
  {
    tableName: 'bus_opportunity_line_item',
    operation: 'read',
    roles: ['account_executive', 'sales_manager', 'sales_ops', 'sales_rep'],
  },
  {
    tableName: 'bus_product',
    operation: 'read',
    roles: ['account_executive', 'sales_manager', 'sales_ops', 'sales_rep'],
  },
  {
    tableName: 'bus_quote',
    operation: 'read',
    roles: ['account_executive', 'sales_manager', 'sales_ops', 'sales_rep'],
  },
  {
    tableName: 'bus_quote',
    operation: 'update',
    roles: ['account_executive', 'sales_rep'],
  },
  {
    tableName: 'bus_quote_line_item',
    operation: 'read',
    roles: ['account_executive', 'sales_manager', 'sales_ops', 'sales_rep'],
  },
  {
    tableName: 'bus_sla_policy',
    operation: 'read',
    roles: ['support_agent', 'support_manager'],
  },
  {
    tableName: 'bus_support_case',
    operation: 'delete',
    roles: ['administrator', 'support_manager'],
  },
  {
    tableName: 'bus_support_case',
    operation: 'read',
    roles: ['support_agent', 'support_manager'],
  },
  {
    tableName: 'bus_support_case',
    operation: 'update',
    roles: ['support_agent', 'support_manager'],
  },
  {
    tableName: 'bus_team',
    operation: 'read',
    roles: ['sales_manager', 'sales_ops'],
  },
  {
    tableName: 'bus_territory',
    operation: 'read',
    roles: ['sales_manager', 'sales_ops'],
  },
  {
    tableName: 'bus_user',
    operation: 'read',
    roles: ['sales_manager', 'sales_ops', 'support_manager'],
  },
];

const TRANSITION_ACCESS: TransitionAccessSeed[] = [
  {
    tableName: 'bus_contract',
    transition: 'counter_signed',
    statusField: 'status',
    edges: [{ from: 'in_approval', to: 'active' }],
    roles: ['administrator', 'sales_ops'],
  },
  {
    tableName: 'bus_contract',
    transition: 'terminate',
    statusField: 'status',
    edges: [{ from: 'active', to: 'terminated' }, { from: 'expiring', to: 'terminated' }],
    roles: ['administrator'],
  },
  {
    tableName: 'bus_lead',
    transition: 'convert',
    statusField: 'status',
    edges: [{ from: 'qualified', to: 'converted' }],
    roles: ['sales_manager', 'sales_ops'],
  },
  {
    tableName: 'bus_lead',
    transition: 'disqualify',
    statusField: 'status',
    edges: [{ from: 'working', to: 'disqualified' }, { from: 'nurturing', to: 'disqualified' }],
    roles: ['sales_manager'],
  },
  {
    tableName: 'bus_opportunity',
    transition: 'close_won',
    statusField: 'workflow_status',
    edges: [{ from: 'negotiation', to: 'closed_won' }],
    roles: ['sales_manager'],
  },
  {
    tableName: 'bus_quote',
    transition: 'approve',
    statusField: 'status',
    edges: [{ from: 'in_review', to: 'approved' }],
    roles: ['sales_manager', 'sales_ops'],
  },
  {
    tableName: 'bus_quote',
    transition: 'reject',
    statusField: 'status',
    edges: [{ from: 'in_review', to: 'rejected' }],
    roles: ['sales_manager'],
  },
  {
    tableName: 'bus_support_case',
    transition: 'escalate',
    statusField: 'status',
    edges: [{ from: 'in_progress', to: 'escalated' }],
    roles: ['support_manager'],
  },
];

export async function seed(db: Kysely<any>): Promise<void> {
  if (OPERATION_ACCESS.length === 0 && TRANSITION_ACCESS.length === 0) {
    console.log('  ⚠ No %%rbac directives declared — every operation stays open');
    return;
  }

  // ---------------------------------------------------------------------------
  // 1. Roles
  // ---------------------------------------------------------------------------
  for (const roleName of RBAC_ROLES) {
    // Case-insensitive, because the guard matches that way. The seeded roles
    // are title-cased (`Manager`) and a model writes `role:manager`; an exact
    // check here would create a second, near-identical role beside the real one
    // and leave an administrator guessing which of the two to assign.
    const existing = await db
      .selectFrom('sys_role')
      .select('sys_role_id')
      .where(sql`lower(name)` as any, '=', roleName.toLowerCase())
      .executeTakeFirst();

    if (existing) continue;

    await db
      .insertInto('sys_role')
      .values({
        sys_role_id: uuidv4(),
        name: roleName,
        description: `Declared by %%rbac in the model`,
        user_level: 'C',
        is_master_role: false,
        is_active: true,
        entity_type: 'D',
        created_by: 'system',
        updated_by: 'system',
      } as any)
      .execute();
    console.log(`  ✓ Created role: ${roleName}`);
  }

  // ---------------------------------------------------------------------------
  // 2. Rules
  // ---------------------------------------------------------------------------
  await db
    .deleteFrom('sys_operation_access')
    .where('entity_type', '=', 'D')
    .execute();

  let written = 0;
  for (const rule of OPERATION_ACCESS) {
    for (const roleName of rule.roles) {
      await db
        .insertInto('sys_operation_access')
        .values({
          sys_operation_access_id: uuidv4(),
          table_name: rule.tableName,
          operation: rule.operation,
          role_name: roleName,
          entity_type: 'D',
          is_active: true,
          created_by: 'system',
          updated_by: 'system',
        } as any)
        .onConflict((oc: any) =>
          oc.columns(['table_name', 'operation', 'role_name']).doNothing()
        )
        .execute();
      written += 1;
    }
    console.log(
      `  ✓ ${rule.tableName}.${rule.operation} restricted to: ${rule.roles.join(', ')}`
    );
  }

  console.log(`  ✓ Seeded ${written} operation access rule(s)`);

  // ---------------------------------------------------------------------------
  // 3. Transition rules
  // ---------------------------------------------------------------------------
  await db
    .deleteFrom('sys_transition_access')
    .where('entity_type', '=', 'D')
    .execute();

  let transitionsWritten = 0;
  for (const rule of TRANSITION_ACCESS) {
    for (const edge of rule.edges) {
      for (const roleName of rule.roles) {
        await db
          .insertInto('sys_transition_access')
          .values({
            sys_transition_access_id: uuidv4(),
            table_name: rule.tableName,
            transition: rule.transition,
            status_field: rule.statusField,
            from_state: edge.from,
            to_state: edge.to,
            role_name: roleName,
            entity_type: 'D',
            is_active: true,
            created_by: 'system',
            updated_by: 'system',
          } as any)
          .onConflict((oc: any) =>
            oc
              .columns(['table_name', 'transition', 'from_state', 'to_state', 'role_name'])
              .doNothing()
          )
          .execute();
        transitionsWritten += 1;
      }
    }
    console.log(
      `  ✓ ${rule.tableName}.${rule.transition} restricted to: ${rule.roles.join(', ')}`
    );
  }

  if (transitionsWritten > 0) {
    console.log(`  ✓ Seeded ${transitionsWritten} transition access rule(s)`);
  }
}
