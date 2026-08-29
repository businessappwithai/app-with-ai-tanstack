/**
 * What the model declared — as data.
 *
 * `entities.ts` describes the *shape* the suites have to build payloads for.
 * This file is the other half: the values a column is allowed to hold and the
 * states a record is allowed to move between, taken straight from the `%%enum`
 * and `%%workflow … kind: state` directives in the source model.
 *
 * The distinction matters. A suite that reads the running application's
 * dictionary and then asserts against that same dictionary proves only that
 * the application is self-consistent — it passes just as happily when the
 * generator dropped a value on the floor. Everything here is the model's own
 * word, so a dropdown that lost an option or a state machine that lost an edge
 * fails a test instead of quietly shipping.
 *
 * Generated: 2026-08-29T04:45:22.115Z
 * Project: my-app
 */

export interface ModelEnum {
  /** Name as the `%%enum` directive spells it. */
  name: string;
  /** sys_reference_id the generator allocated — 1000 and up. */
  referenceId: number;
  /** Allowed values, in declaration order. */
  values: string[];
}

export interface StateEdge {
  from: string;
  to: string;
  /** The `:` label on the diagram's arrow, where it carries one. */
  trigger: string;
}

export interface StateMachine {
  /** ERD entity name, e.g. "Program". */
  entity: string;
  /** Physical table the guard reads transitions for. */
  tableName: string;
  /** Column holding the state — `status` unless the entity has no such column. */
  statusField: string;
  /** The state a record starts in, from the `[*] --> x` edge. */
  initial: string;
  /** States with no outgoing edge. */
  terminal: string[];
  /** Every edge the diagram draws, minus the `[*]` start and end markers. */
  edges: StateEdge[];
}

export const modelEnums: ModelEnum[] = [
  {
    name: "AccountStatus",
    referenceId: 1000,
    values: ["active", "on_hold", "churned"],
  },
  {
    name: "AccountTier",
    referenceId: 1001,
    values: ["strategic", "enterprise", "mid_market", "smb"],
  },
  {
    name: "AccountType",
    referenceId: 1002,
    values: ["prospect", "customer", "partner", "reseller", "former_customer"],
  },
  {
    name: "ActivityPriority",
    referenceId: 1003,
    values: ["low", "medium", "high", "urgent"],
  },
  {
    name: "ActivityStatus",
    referenceId: 1004,
    values: ["planned", "in_progress", "completed", "cancelled"],
  },
  {
    name: "ActivityType",
    referenceId: 1005,
    values: ["call", "email", "meeting", "task", "note", "demo"],
  },
  {
    name: "CampaignMemberStatus",
    referenceId: 1006,
    values: ["targeted", "invited", "registered", "attended", "responded", "converted", "unsubscribed"],
  },
  {
    name: "CampaignStatus",
    referenceId: 1007,
    values: ["planning", "active", "completed", "cancelled"],
  },
  {
    name: "CampaignType",
    referenceId: 1008,
    values: ["email", "webinar", "conference", "paid_search", "content", "field_event", "partner"],
  },
  {
    name: "CaseOrigin",
    referenceId: 1009,
    values: ["email", "phone", "web", "chat", "partner_portal"],
  },
  {
    name: "CasePriority",
    referenceId: 1010,
    values: ["low", "medium", "high", "critical"],
  },
  {
    name: "CaseStatus",
    referenceId: 1011,
    values: ["new", "assigned", "in_progress", "waiting_on_customer", "escalated", "resolved", "closed"],
  },
  {
    name: "CaseType",
    referenceId: 1012,
    values: ["question", "incident", "defect", "feature_request", "billing"],
  },
  {
    name: "ContactStatus",
    referenceId: 1013,
    values: ["active", "inactive", "bounced", "do_not_contact"],
  },
  {
    name: "ContractStatus",
    referenceId: 1014,
    values: ["draft", "in_approval", "active", "expiring", "renewed", "expired", "terminated"],
  },
  {
    name: "ForecastCategory",
    referenceId: 1015,
    values: ["pipeline", "best_case", "commit", "closed", "omitted"],
  },
  {
    name: "Industry",
    referenceId: 1016,
    values: ["technology", "financial_services", "healthcare", "manufacturing", "retail", "public_sector", "energy", "education", "other"],
  },
  {
    name: "LeadRating",
    referenceId: 1017,
    values: ["hot", "warm", "cold"],
  },
  {
    name: "LeadSource",
    referenceId: 1018,
    values: ["web", "inbound_call", "referral", "event", "partner", "outbound", "advertisement"],
  },
  {
    name: "LeadStatus",
    referenceId: 1019,
    values: ["new", "working", "nurturing", "qualified", "converted", "disqualified"],
  },
  {
    name: "LossReason",
    referenceId: 1020,
    values: ["price", "product_fit", "competitor", "no_decision", "timing", "budget"],
  },
  {
    name: "OpportunityStage",
    referenceId: 1021,
    values: ["prospecting", "qualification", "needs_analysis", "proposal", "negotiation", "closed_won", "closed_lost"],
  },
  {
    name: "ProductFamily",
    referenceId: 1022,
    values: ["platform", "add_on", "professional_services", "support_plan", "training"],
  },
  {
    name: "QuoteStatus",
    referenceId: 1023,
    values: ["draft", "in_review", "approved", "rejected", "presented", "accepted", "expired"],
  },
  {
    name: "SlaTier",
    referenceId: 1024,
    values: ["standard", "premium", "enterprise", "platinum"],
  },
  {
    name: "UserRole",
    referenceId: 1025,
    values: ["sales_rep", "account_executive", "sales_manager", "sales_ops", "marketing_manager", "support_agent", "support_manager", "administrator"],
  },
];

export const stateMachines: StateMachine[] = [
  {
    entity: "Lead",
    tableName: "bus_lead",
    statusField: "status",
    initial: "new",
    terminal: ["converted", "disqualified"],
    edges: [
      { from: "new", to: "working", trigger: "engage" },
      { from: "working", to: "nurturing", trigger: "nurture" },
      { from: "nurturing", to: "working", trigger: "re_engage" },
      { from: "working", to: "qualified", trigger: "qualify" },
      { from: "qualified", to: "working", trigger: "return_to_working" },
      { from: "qualified", to: "converted", trigger: "convert" },
      { from: "working", to: "disqualified", trigger: "disqualify" },
      { from: "nurturing", to: "disqualified", trigger: "disqualify" },
      { from: "new", to: "disqualified", trigger: "reject" },
    ],
  },
  {
    entity: "Opportunity",
    tableName: "bus_opportunity",
    statusField: "workflow_status",
    initial: "prospecting",
    terminal: ["closed_won", "closed_lost"],
    edges: [
      { from: "prospecting", to: "qualification", trigger: "qualify" },
      { from: "qualification", to: "needs_analysis", trigger: "discover" },
      { from: "qualification", to: "closed_lost", trigger: "disqualify" },
      { from: "needs_analysis", to: "proposal", trigger: "send_proposal" },
      { from: "needs_analysis", to: "closed_lost", trigger: "no_fit" },
      { from: "proposal", to: "negotiation", trigger: "negotiate" },
      { from: "proposal", to: "closed_lost", trigger: "lose" },
      { from: "negotiation", to: "closed_won", trigger: "close_won" },
      { from: "negotiation", to: "closed_lost", trigger: "close_lost" },
      { from: "negotiation", to: "proposal", trigger: "reprice" },
    ],
  },
  {
    entity: "Quote",
    tableName: "bus_quote",
    statusField: "status",
    initial: "draft",
    terminal: ["accepted", "expired"],
    edges: [
      { from: "draft", to: "in_review", trigger: "submit_for_approval" },
      { from: "in_review", to: "approved", trigger: "approve" },
      { from: "in_review", to: "rejected", trigger: "reject" },
      { from: "rejected", to: "draft", trigger: "revise" },
      { from: "approved", to: "presented", trigger: "present" },
      { from: "approved", to: "expired", trigger: "lapse" },
      { from: "presented", to: "accepted", trigger: "accept" },
      { from: "presented", to: "draft", trigger: "renegotiate" },
      { from: "presented", to: "expired", trigger: "lapse" },
    ],
  },
  {
    entity: "Contract",
    tableName: "bus_contract",
    statusField: "status",
    initial: "draft",
    terminal: ["expired", "terminated"],
    edges: [
      { from: "draft", to: "in_approval", trigger: "submit_for_signature" },
      { from: "in_approval", to: "draft", trigger: "return_for_edit" },
      { from: "in_approval", to: "active", trigger: "counter_signed" },
      { from: "active", to: "expiring", trigger: "enter_renewal_window" },
      { from: "active", to: "terminated", trigger: "terminate" },
      { from: "expiring", to: "renewed", trigger: "renew" },
      { from: "expiring", to: "expired", trigger: "lapse" },
      { from: "expiring", to: "terminated", trigger: "terminate" },
      { from: "renewed", to: "active", trigger: "activate_renewal" },
    ],
  },
  {
    entity: "SupportCase",
    tableName: "bus_support_case",
    statusField: "status",
    initial: "new",
    terminal: ["closed"],
    edges: [
      { from: "new", to: "assigned", trigger: "assign" },
      { from: "assigned", to: "in_progress", trigger: "start_work" },
      { from: "in_progress", to: "waiting_on_customer", trigger: "request_information" },
      { from: "waiting_on_customer", to: "in_progress", trigger: "customer_responded" },
      { from: "in_progress", to: "escalated", trigger: "escalate" },
      { from: "escalated", to: "in_progress", trigger: "de_escalate" },
      { from: "in_progress", to: "resolved", trigger: "resolve" },
      { from: "resolved", to: "in_progress", trigger: "reopen" },
      { from: "resolved", to: "closed", trigger: "close" },
    ],
  },
];

/** The state machine declared for a table, if the model declared one. */
export function stateMachineFor(tableName: string): StateMachine | undefined {
  return stateMachines.find((machine) => machine.tableName === tableName);
}

/** Every state either end of an edge names, plus the initial state. */
export function statesOf(machine: StateMachine): string[] {
  const seen = new Set<string>();
  if (machine.initial) seen.add(machine.initial);
  for (const edge of machine.edges) {
    seen.add(edge.from);
    seen.add(edge.to);
  }
  return [...seen];
}

/** The states reachable from `from` in one step. */
export function successorsOf(machine: StateMachine, from: string): string[] {
  return machine.edges.filter((edge) => edge.from === from).map((edge) => edge.to);
}

/**
 * A state the model does *not* allow moving to from `from`, or null when the
 * machine allows every state from there and there is nothing illegal to try.
 */
export function illegalTargetFrom(machine: StateMachine, from: string): string | null {
  const allowed = new Set(successorsOf(machine, from));
  allowed.add(from);
  return statesOf(machine).find((state) => !allowed.has(state)) ?? null;
}

/**
 * A shortest path of edges from the machine's initial state to `target`,
 * or null when no path exists. Breadth-first, so a suite walking a record into
 * a given state takes the fewest writes that get it there.
 */
export function pathTo(machine: StateMachine, target: string): StateEdge[] | null {
  if (!machine.initial) return null;
  if (machine.initial === target) return [];

  const queue: Array<{ state: string; path: StateEdge[] }> = [
    { state: machine.initial, path: [] },
  ];
  const seen = new Set<string>([machine.initial]);

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;
    for (const edge of machine.edges) {
      if (edge.from !== current.state || seen.has(edge.to)) continue;
      const path = [...current.path, edge];
      if (edge.to === target) return path;
      seen.add(edge.to);
      queue.push({ state: edge.to, path });
    }
  }
  return null;
}
