import { sql, type Kysely } from 'kysely';

const TRANSITIONS = [
  {
    tableName: 'bus_lead',
    statusField: 'status',
    fromState: 'new',
    toState: 'working',
    transitionName: 'engage',
  },
  {
    tableName: 'bus_lead',
    statusField: 'status',
    fromState: 'working',
    toState: 'nurturing',
    transitionName: 'nurture',
  },
  {
    tableName: 'bus_lead',
    statusField: 'status',
    fromState: 'nurturing',
    toState: 'working',
    transitionName: 're_engage',
  },
  {
    tableName: 'bus_lead',
    statusField: 'status',
    fromState: 'working',
    toState: 'qualified',
    transitionName: 'qualify',
  },
  {
    tableName: 'bus_lead',
    statusField: 'status',
    fromState: 'qualified',
    toState: 'working',
    transitionName: 'return_to_working',
  },
  {
    tableName: 'bus_lead',
    statusField: 'status',
    fromState: 'qualified',
    toState: 'converted',
    transitionName: 'convert',
  },
  {
    tableName: 'bus_lead',
    statusField: 'status',
    fromState: 'working',
    toState: 'disqualified',
    transitionName: 'disqualify',
  },
  {
    tableName: 'bus_lead',
    statusField: 'status',
    fromState: 'nurturing',
    toState: 'disqualified',
    transitionName: 'disqualify',
  },
  {
    tableName: 'bus_lead',
    statusField: 'status',
    fromState: 'new',
    toState: 'disqualified',
    transitionName: 'reject',
  },
  {
    tableName: 'bus_opportunity',
    statusField: 'workflow_status',
    fromState: 'prospecting',
    toState: 'qualification',
    transitionName: 'qualify',
  },
  {
    tableName: 'bus_opportunity',
    statusField: 'workflow_status',
    fromState: 'qualification',
    toState: 'needs_analysis',
    transitionName: 'discover',
  },
  {
    tableName: 'bus_opportunity',
    statusField: 'workflow_status',
    fromState: 'qualification',
    toState: 'closed_lost',
    transitionName: 'disqualify',
  },
  {
    tableName: 'bus_opportunity',
    statusField: 'workflow_status',
    fromState: 'needs_analysis',
    toState: 'proposal',
    transitionName: 'send_proposal',
  },
  {
    tableName: 'bus_opportunity',
    statusField: 'workflow_status',
    fromState: 'needs_analysis',
    toState: 'closed_lost',
    transitionName: 'no_fit',
  },
  {
    tableName: 'bus_opportunity',
    statusField: 'workflow_status',
    fromState: 'proposal',
    toState: 'negotiation',
    transitionName: 'negotiate',
  },
  {
    tableName: 'bus_opportunity',
    statusField: 'workflow_status',
    fromState: 'proposal',
    toState: 'closed_lost',
    transitionName: 'lose',
  },
  {
    tableName: 'bus_opportunity',
    statusField: 'workflow_status',
    fromState: 'negotiation',
    toState: 'closed_won',
    transitionName: 'close_won',
  },
  {
    tableName: 'bus_opportunity',
    statusField: 'workflow_status',
    fromState: 'negotiation',
    toState: 'closed_lost',
    transitionName: 'close_lost',
  },
  {
    tableName: 'bus_opportunity',
    statusField: 'workflow_status',
    fromState: 'negotiation',
    toState: 'proposal',
    transitionName: 'reprice',
  },
  {
    tableName: 'bus_quote',
    statusField: 'status',
    fromState: 'draft',
    toState: 'in_review',
    transitionName: 'submit_for_approval',
  },
  {
    tableName: 'bus_quote',
    statusField: 'status',
    fromState: 'in_review',
    toState: 'approved',
    transitionName: 'approve',
  },
  {
    tableName: 'bus_quote',
    statusField: 'status',
    fromState: 'in_review',
    toState: 'rejected',
    transitionName: 'reject',
  },
  {
    tableName: 'bus_quote',
    statusField: 'status',
    fromState: 'rejected',
    toState: 'draft',
    transitionName: 'revise',
  },
  {
    tableName: 'bus_quote',
    statusField: 'status',
    fromState: 'approved',
    toState: 'presented',
    transitionName: 'present',
  },
  {
    tableName: 'bus_quote',
    statusField: 'status',
    fromState: 'approved',
    toState: 'expired',
    transitionName: 'lapse',
  },
  {
    tableName: 'bus_quote',
    statusField: 'status',
    fromState: 'presented',
    toState: 'accepted',
    transitionName: 'accept',
  },
  {
    tableName: 'bus_quote',
    statusField: 'status',
    fromState: 'presented',
    toState: 'draft',
    transitionName: 'renegotiate',
  },
  {
    tableName: 'bus_quote',
    statusField: 'status',
    fromState: 'presented',
    toState: 'expired',
    transitionName: 'lapse',
  },
  {
    tableName: 'bus_contract',
    statusField: 'status',
    fromState: 'draft',
    toState: 'in_approval',
    transitionName: 'submit_for_signature',
  },
  {
    tableName: 'bus_contract',
    statusField: 'status',
    fromState: 'in_approval',
    toState: 'draft',
    transitionName: 'return_for_edit',
  },
  {
    tableName: 'bus_contract',
    statusField: 'status',
    fromState: 'in_approval',
    toState: 'active',
    transitionName: 'counter_signed',
  },
  {
    tableName: 'bus_contract',
    statusField: 'status',
    fromState: 'active',
    toState: 'expiring',
    transitionName: 'enter_renewal_window',
  },
  {
    tableName: 'bus_contract',
    statusField: 'status',
    fromState: 'active',
    toState: 'terminated',
    transitionName: 'terminate',
  },
  {
    tableName: 'bus_contract',
    statusField: 'status',
    fromState: 'expiring',
    toState: 'renewed',
    transitionName: 'renew',
  },
  {
    tableName: 'bus_contract',
    statusField: 'status',
    fromState: 'expiring',
    toState: 'expired',
    transitionName: 'lapse',
  },
  {
    tableName: 'bus_contract',
    statusField: 'status',
    fromState: 'expiring',
    toState: 'terminated',
    transitionName: 'terminate',
  },
  {
    tableName: 'bus_contract',
    statusField: 'status',
    fromState: 'renewed',
    toState: 'active',
    transitionName: 'activate_renewal',
  },
  {
    tableName: 'bus_support_case',
    statusField: 'status',
    fromState: 'new',
    toState: 'assigned',
    transitionName: 'assign',
  },
  {
    tableName: 'bus_support_case',
    statusField: 'status',
    fromState: 'assigned',
    toState: 'in_progress',
    transitionName: 'start_work',
  },
  {
    tableName: 'bus_support_case',
    statusField: 'status',
    fromState: 'in_progress',
    toState: 'waiting_on_customer',
    transitionName: 'request_information',
  },
  {
    tableName: 'bus_support_case',
    statusField: 'status',
    fromState: 'waiting_on_customer',
    toState: 'in_progress',
    transitionName: 'customer_responded',
  },
  {
    tableName: 'bus_support_case',
    statusField: 'status',
    fromState: 'in_progress',
    toState: 'escalated',
    transitionName: 'escalate',
  },
  {
    tableName: 'bus_support_case',
    statusField: 'status',
    fromState: 'escalated',
    toState: 'in_progress',
    transitionName: 'de_escalate',
  },
  {
    tableName: 'bus_support_case',
    statusField: 'status',
    fromState: 'in_progress',
    toState: 'resolved',
    transitionName: 'resolve',
  },
  {
    tableName: 'bus_support_case',
    statusField: 'status',
    fromState: 'resolved',
    toState: 'in_progress',
    transitionName: 'reopen',
  },
  {
    tableName: 'bus_support_case',
    statusField: 'status',
    fromState: 'resolved',
    toState: 'closed',
    transitionName: 'close',
  },
] as const;

export async function seed(db: Kysely<any>): Promise<void> {
  // Replace all model-declared transitions on each table, keeping any
  // hand-crafted rows (source = 'designer') untouched.
  const tables = [...new Set(TRANSITIONS.map((t) => t.tableName))];
  for (const tbl of tables) {
    await sql`
      DELETE FROM sys_workflow_transitions
      WHERE table_name = ${tbl}
    `.execute(db);
  }
  for (const t of TRANSITIONS) {
    await db
      .insertInto('sys_workflow_transitions' as any)
      .values({
        table_name: t.tableName,
        status_field: t.statusField,
        from_state: t.fromState,
        to_state: t.toState,
        transition_name: t.transitionName || null,
        is_active: true,
      } as any)
      .onConflict((oc) =>
        oc.constraint('sys_workflow_transitions_unique').doUpdateSet({
          transition_name: t.transitionName || null,
          is_active: true,
        } as any)
      )
      .execute();
  }
}