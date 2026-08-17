/**
 * Business Rules Seed
 * Loads the generated GoRules JDM decision models into sys_rule_definitions
 * so business rules are enforced on entity create/update/delete out of the box.
 *
 * Generated: 2026-08-17T17:20:18.628Z
 */

import * as fs from 'fs';
import * as path from 'path';
import { Kysely } from 'kysely';
import { v4 as uuidv4 } from 'uuid';

const JDM_DIR = path.join(__dirname, '..', 'src', 'modules', 'rules', 'jdm');

const RULES = [
  { file: 'bus_user.jdm.json', entityName: 'bus_user', ruleName: 'bus_user_validation', operation: 'ALL' },
  { file: 'bus_team.jdm.json', entityName: 'bus_team', ruleName: 'bus_team_validation', operation: 'ALL' },
  { file: 'bus_territory.jdm.json', entityName: 'bus_territory', ruleName: 'bus_territory_validation', operation: 'ALL' },
  { file: 'bus_account.jdm.json', entityName: 'bus_account', ruleName: 'bus_account_validation', operation: 'ALL' },
  { file: 'bus_contact.jdm.json', entityName: 'bus_contact', ruleName: 'bus_contact_validation', operation: 'ALL' },
  { file: 'bus_lead.jdm.json', entityName: 'bus_lead', ruleName: 'bus_lead_validation', operation: 'ALL' },
  { file: 'bus_campaign.jdm.json', entityName: 'bus_campaign', ruleName: 'bus_campaign_validation', operation: 'ALL' },
  { file: 'bus_campaign_member.jdm.json', entityName: 'bus_campaign_member', ruleName: 'bus_campaign_member_validation', operation: 'ALL' },
  { file: 'bus_opportunity.jdm.json', entityName: 'bus_opportunity', ruleName: 'bus_opportunity_validation', operation: 'ALL' },
  { file: 'bus_opportunity_line_item.jdm.json', entityName: 'bus_opportunity_line_item', ruleName: 'bus_opportunity_line_item_validation', operation: 'ALL' },
  { file: 'bus_product.jdm.json', entityName: 'bus_product', ruleName: 'bus_product_validation', operation: 'ALL' },
  { file: 'bus_quote.jdm.json', entityName: 'bus_quote', ruleName: 'bus_quote_validation', operation: 'ALL' },
  { file: 'bus_quote_line_item.jdm.json', entityName: 'bus_quote_line_item', ruleName: 'bus_quote_line_item_validation', operation: 'ALL' },
  { file: 'bus_contract.jdm.json', entityName: 'bus_contract', ruleName: 'bus_contract_validation', operation: 'ALL' },
  { file: 'bus_support_case.jdm.json', entityName: 'bus_support_case', ruleName: 'bus_support_case_validation', operation: 'ALL' },
  { file: 'bus_sla_policy.jdm.json', entityName: 'bus_sla_policy', ruleName: 'bus_sla_policy_validation', operation: 'ALL' },
  { file: 'bus_activity.jdm.json', entityName: 'bus_activity', ruleName: 'bus_activity_validation', operation: 'ALL' },
];

// Business rules authored in the model's `%%rule` sections, compiled from their
// decision flowcharts to GoRules JDM. These are the rules a designer drew; they
// are seeded alongside the generated validation rules and are editable in the
// admin rules editor afterwards.
const AUTHORED_RULES = [
  {
    entityName: 'bus_lead',
    ruleName: 'leadScoring',
    operation: 'CREATE',
    priority: 10,
    jdmContent: '{"nodes":[{"id":"node-A","name":"Start: Lead Captured","type":"inputNode"},{"id":"node-B","name":"employee_count >= 1000?","type":"switchNode"},{"id":"node-C","name":"Add 35 firmographic points","type":"expressionNode"},{"id":"node-D","name":"employee_count >= 100?","type":"switchNode"},{"id":"node-E","name":"Add 20 firmographic points","type":"expressionNode"},{"id":"node-F","name":"Add 5 firmographic points","type":"expressionNode"},{"id":"node-G","name":"lead_source == referral?","type":"switchNode"},{"id":"node-H","name":"Add 30 source points","type":"expressionNode"},{"id":"node-I","name":"lead_source == event?","type":"switchNode"},{"id":"node-J","name":"Add 20 source points","type":"expressionNode"},{"id":"node-K","name":"Add 8 source points","type":"expressionNode"},{"id":"node-L","name":"annual_revenue > 10000000?","type":"switchNode"},{"id":"node-M","name":"Add 25 revenue points","type":"expressionNode"},{"id":"node-N","name":"Add 5 revenue points","type":"expressionNode"},{"id":"node-O","name":"Compute lead score","type":"functionNode"},{"id":"node-P","name":"score >= 70?","type":"switchNode"},{"id":"node-Q","name":"Set rating hot","type":"expressionNode"},{"id":"node-R","name":"score >= 40?","type":"switchNode"},{"id":"node-S","name":"Set rating warm","type":"expressionNode"},{"id":"node-T","name":"Set rating cold","type":"expressionNode"},{"id":"node-Z","name":"End: Lead Scored","type":"outputNode"}],"edges":[{"id":"edge-1","sourceId":"node-A","targetId":"node-B"},{"id":"edge-2","name":"Yes","sourceId":"node-B","targetId":"node-C"},{"id":"edge-3","name":"No","sourceId":"node-B","targetId":"node-D"},{"id":"edge-4","name":"Yes","sourceId":"node-D","targetId":"node-E"},{"id":"edge-5","name":"No","sourceId":"node-D","targetId":"node-F"},{"id":"edge-6","sourceId":"node-C","targetId":"node-G"},{"id":"edge-7","sourceId":"node-E","targetId":"node-G"},{"id":"edge-8","sourceId":"node-F","targetId":"node-G"},{"id":"edge-9","name":"Yes","sourceId":"node-G","targetId":"node-H"},{"id":"edge-10","name":"No","sourceId":"node-G","targetId":"node-I"},{"id":"edge-11","name":"Yes","sourceId":"node-I","targetId":"node-J"},{"id":"edge-12","name":"No","sourceId":"node-I","targetId":"node-K"},{"id":"edge-13","sourceId":"node-H","targetId":"node-L"},{"id":"edge-14","sourceId":"node-J","targetId":"node-L"},{"id":"edge-15","sourceId":"node-K","targetId":"node-L"},{"id":"edge-16","name":"Yes","sourceId":"node-L","targetId":"node-M"},{"id":"edge-17","name":"No","sourceId":"node-L","targetId":"node-N"},{"id":"edge-18","sourceId":"node-M","targetId":"node-O"},{"id":"edge-19","sourceId":"node-N","targetId":"node-O"},{"id":"edge-20","sourceId":"node-O","targetId":"node-P"},{"id":"edge-21","name":"Yes","sourceId":"node-P","targetId":"node-Q"},{"id":"edge-22","name":"No","sourceId":"node-P","targetId":"node-R"},{"id":"edge-23","name":"Yes","sourceId":"node-R","targetId":"node-S"},{"id":"edge-24","name":"No","sourceId":"node-R","targetId":"node-T"},{"id":"edge-25","sourceId":"node-Q","targetId":"node-Z"},{"id":"edge-26","sourceId":"node-S","targetId":"node-Z"},{"id":"edge-27","sourceId":"node-T","targetId":"node-Z"}]}',
  },
  {
    entityName: 'bus_lead',
    ruleName: 'leadRouting',
    operation: 'CREATE',
    priority: 20,
    jdmContent: '{"nodes":[{"id":"node-A","name":"Start: Lead Scored","type":"inputNode"},{"id":"node-B","name":"lead_source == partner?","type":"switchNode"},{"id":"node-C","name":"Route to Partner Desk","type":"expressionNode"},{"id":"node-D","name":"annual_revenue > 50000000?","type":"switchNode"},{"id":"node-E","name":"Route to Strategic Accounts Team","type":"expressionNode"},{"id":"node-F","name":"employee_count >= 500?","type":"switchNode"},{"id":"node-G","name":"Route to Enterprise Team","type":"expressionNode"},{"id":"node-H","name":"rating == hot?","type":"switchNode"},{"id":"node-I","name":"Route to Mid Market Team","type":"expressionNode"},{"id":"node-J","name":"Route to SMB Queue","type":"expressionNode"},{"id":"node-K","name":"Assign owner from territory","type":"functionNode"},{"id":"node-L","name":"owner assigned?","type":"switchNode"},{"id":"node-M","name":"Notify assigned owner","type":"expressionNode"},{"id":"node-N","name":"Hold in unassigned queue","type":"expressionNode"},{"id":"node-Z","name":"End: Lead Routed","type":"outputNode"}],"edges":[{"id":"edge-1","sourceId":"node-A","targetId":"node-B"},{"id":"edge-2","name":"Yes","sourceId":"node-B","targetId":"node-C"},{"id":"edge-3","name":"No","sourceId":"node-B","targetId":"node-D"},{"id":"edge-4","name":"Yes","sourceId":"node-D","targetId":"node-E"},{"id":"edge-5","name":"No","sourceId":"node-D","targetId":"node-F"},{"id":"edge-6","name":"Yes","sourceId":"node-F","targetId":"node-G"},{"id":"edge-7","name":"No","sourceId":"node-F","targetId":"node-H"},{"id":"edge-8","name":"Yes","sourceId":"node-H","targetId":"node-I"},{"id":"edge-9","name":"No","sourceId":"node-H","targetId":"node-J"},{"id":"edge-10","sourceId":"node-C","targetId":"node-K"},{"id":"edge-11","sourceId":"node-E","targetId":"node-K"},{"id":"edge-12","sourceId":"node-G","targetId":"node-K"},{"id":"edge-13","sourceId":"node-I","targetId":"node-K"},{"id":"edge-14","sourceId":"node-J","targetId":"node-K"},{"id":"edge-15","sourceId":"node-K","targetId":"node-L"},{"id":"edge-16","name":"Yes","sourceId":"node-L","targetId":"node-M"},{"id":"edge-17","name":"No","sourceId":"node-L","targetId":"node-N"},{"id":"edge-18","sourceId":"node-M","targetId":"node-Z"},{"id":"edge-19","sourceId":"node-N","targetId":"node-Z"}]}',
  },
  {
    entityName: 'bus_lead',
    ruleName: 'leadQualification',
    operation: 'UPDATE',
    priority: 15,
    jdmContent: '{"nodes":[{"id":"input","name":"Input","type":"inputNode"},{"id":"leadQualification-table","name":"leadQualification","type":"decisionTableNode","content":{"hitPolicy":"collect","inputs":[{"id":"i1","name":"Record","field":""}],"outputs":[{"id":"o1","name":"Action","field":"action"},{"id":"o2","name":"Message","field":"message"},{"id":"o3","name":"Rule ID","field":"ruleId"},{"id":"o4","name":"Workflow Name","field":"workflowName"},{"id":"o5","name":"Field","field":"field"},{"id":"o6","name":"Value","field":"value"},{"id":"o7","name":"Target Entity","field":"targetEntity"},{"id":"o8","name":"Link Field","field":"linkField"}],"rules":[{"_id":"leadQualification-convertQualifiedLead","i1":"status == \\"qualified\\"","o1":"\'trigger-workflow\'","o2":"\'Lead qualified — opening the account, contact and first opportunity\'","o3":"\'leadQualification\'","o4":"\'LeadConversion\'","o5":"\'\'","o6":"\'\'","o7":"\'\'","o8":"\'\'"}]}},{"id":"output","name":"Output","type":"outputNode"}],"edges":[{"id":"edge-1","sourceId":"input","targetId":"leadQualification-table"},{"id":"edge-2","sourceId":"leadQualification-table","targetId":"output"}]}',
  },
  {
    entityName: 'bus_opportunity',
    ruleName: 'opportunityForecast',
    operation: 'UPDATE',
    priority: 10,
    jdmContent: '{"nodes":[{"id":"node-A","name":"Start: Opportunity Updated","type":"inputNode"},{"id":"node-B","name":"stage == closed_won?","type":"switchNode"},{"id":"node-C","name":"Set probability 100 and category closed","type":"expressionNode"},{"id":"node-D","name":"stage == closed_lost?","type":"switchNode"},{"id":"node-E","name":"Set probability 0 and category omitted","type":"expressionNode"},{"id":"node-F","name":"stage == negotiation?","type":"switchNode"},{"id":"node-G","name":"Set probability 80 and category commit","type":"expressionNode"},{"id":"node-H","name":"stage == proposal?","type":"switchNode"},{"id":"node-I","name":"Set probability 60 and category best_case","type":"expressionNode"},{"id":"node-J","name":"stage == needs_analysis?","type":"switchNode"},{"id":"node-K","name":"Set probability 40 and category pipeline","type":"expressionNode"},{"id":"node-L","name":"stage == qualification?","type":"switchNode"},{"id":"node-M","name":"Set probability 20 and category pipeline","type":"expressionNode"},{"id":"node-N","name":"Set probability 10 and category pipeline","type":"expressionNode"},{"id":"node-O","name":"Recompute account pipeline","type":"functionNode"},{"id":"node-P","name":"expected_close_date in the past?","type":"switchNode"},{"id":"node-Q","name":"Flag as slipped","type":"expressionNode"},{"id":"node-R","name":"Keep current close date","type":"expressionNode"},{"id":"node-Z","name":"End: Forecast Recomputed","type":"outputNode"}],"edges":[{"id":"edge-1","sourceId":"node-A","targetId":"node-B"},{"id":"edge-2","name":"Yes","sourceId":"node-B","targetId":"node-C"},{"id":"edge-3","name":"No","sourceId":"node-B","targetId":"node-D"},{"id":"edge-4","name":"Yes","sourceId":"node-D","targetId":"node-E"},{"id":"edge-5","name":"No","sourceId":"node-D","targetId":"node-F"},{"id":"edge-6","name":"Yes","sourceId":"node-F","targetId":"node-G"},{"id":"edge-7","name":"No","sourceId":"node-F","targetId":"node-H"},{"id":"edge-8","name":"Yes","sourceId":"node-H","targetId":"node-I"},{"id":"edge-9","name":"No","sourceId":"node-H","targetId":"node-J"},{"id":"edge-10","name":"Yes","sourceId":"node-J","targetId":"node-K"},{"id":"edge-11","name":"No","sourceId":"node-J","targetId":"node-L"},{"id":"edge-12","name":"Yes","sourceId":"node-L","targetId":"node-M"},{"id":"edge-13","name":"No","sourceId":"node-L","targetId":"node-N"},{"id":"edge-14","sourceId":"node-C","targetId":"node-O"},{"id":"edge-15","sourceId":"node-E","targetId":"node-O"},{"id":"edge-16","sourceId":"node-G","targetId":"node-O"},{"id":"edge-17","sourceId":"node-I","targetId":"node-O"},{"id":"edge-18","sourceId":"node-K","targetId":"node-O"},{"id":"edge-19","sourceId":"node-M","targetId":"node-O"},{"id":"edge-20","sourceId":"node-N","targetId":"node-O"},{"id":"edge-21","sourceId":"node-O","targetId":"node-P"},{"id":"edge-22","name":"Yes","sourceId":"node-P","targetId":"node-Q"},{"id":"edge-23","name":"No","sourceId":"node-P","targetId":"node-R"},{"id":"edge-24","sourceId":"node-Q","targetId":"node-Z"},{"id":"edge-25","sourceId":"node-R","targetId":"node-Z"}]}',
  },
  {
    entityName: 'bus_opportunity',
    ruleName: 'opportunityCloseGate',
    operation: 'UPDATE',
    priority: 5,
    jdmContent: '{"nodes":[{"id":"node-A","name":"Start: Close Requested","type":"inputNode"},{"id":"node-B","name":"stage == closed_won?","type":"switchNode"},{"id":"node-C","name":"stage == closed_lost?","type":"switchNode"},{"id":"node-D","name":"loss_reason present?","type":"switchNode"},{"id":"node-E","name":"Reject: Loss reason required","type":"expressionNode"},{"id":"node-F","name":"Stamp actual close date","type":"expressionNode"},{"id":"node-G","name":"Allow: Not a closing transition","type":"expressionNode"},{"id":"node-H","name":"amount > 0?","type":"switchNode"},{"id":"node-I","name":"Reject: Amount required to close won","type":"expressionNode"},{"id":"node-J","name":"accepted quote present?","type":"switchNode"},{"id":"node-K","name":"Reject: An accepted quote is required","type":"expressionNode"},{"id":"node-L","name":"primary contact present?","type":"switchNode"},{"id":"node-M","name":"Reject: A primary contact is required","type":"expressionNode"},{"id":"node-N","name":"Stamp actual close date and category closed","type":"expressionNode"},{"id":"node-Z","name":"End: Close Decided","type":"outputNode"}],"edges":[{"id":"edge-1","sourceId":"node-A","targetId":"node-B"},{"id":"edge-2","name":"No","sourceId":"node-B","targetId":"node-C"},{"id":"edge-3","name":"Yes","sourceId":"node-C","targetId":"node-D"},{"id":"edge-4","name":"No","sourceId":"node-D","targetId":"node-E"},{"id":"edge-5","name":"Yes","sourceId":"node-D","targetId":"node-F"},{"id":"edge-6","name":"No","sourceId":"node-C","targetId":"node-G"},{"id":"edge-7","name":"Yes","sourceId":"node-B","targetId":"node-H"},{"id":"edge-8","name":"No","sourceId":"node-H","targetId":"node-I"},{"id":"edge-9","name":"Yes","sourceId":"node-H","targetId":"node-J"},{"id":"edge-10","name":"No","sourceId":"node-J","targetId":"node-K"},{"id":"edge-11","name":"Yes","sourceId":"node-J","targetId":"node-L"},{"id":"edge-12","name":"No","sourceId":"node-L","targetId":"node-M"},{"id":"edge-13","name":"Yes","sourceId":"node-L","targetId":"node-N"},{"id":"edge-14","sourceId":"node-E","targetId":"node-Z"},{"id":"edge-15","sourceId":"node-F","targetId":"node-Z"},{"id":"edge-16","sourceId":"node-G","targetId":"node-Z"},{"id":"edge-17","sourceId":"node-I","targetId":"node-Z"},{"id":"edge-18","sourceId":"node-K","targetId":"node-Z"},{"id":"edge-19","sourceId":"node-M","targetId":"node-Z"},{"id":"edge-20","sourceId":"node-N","targetId":"node-Z"}]}',
  },
  {
    entityName: 'bus_quote',
    ruleName: 'quoteDiscountApproval',
    operation: 'UPDATE',
    priority: 10,
    jdmContent: '{"nodes":[{"id":"input","name":"Input","type":"inputNode"},{"id":"quoteDiscountApproval-table","name":"quoteDiscountApproval","type":"decisionTableNode","content":{"hitPolicy":"collect","inputs":[{"id":"i1","name":"Record","field":""}],"outputs":[{"id":"o1","name":"Action","field":"action"},{"id":"o2","name":"Message","field":"message"},{"id":"o3","name":"Rule ID","field":"ruleId"},{"id":"o4","name":"Workflow Name","field":"workflowName"},{"id":"o5","name":"Field","field":"field"},{"id":"o6","name":"Value","field":"value"},{"id":"o7","name":"Target Entity","field":"targetEntity"},{"id":"o8","name":"Link Field","field":"linkField"}],"rules":[{"_id":"quoteDiscountApproval-escalateDiscount","i1":"discount_percent > 15","o1":"\'trigger-workflow\'","o2":"\'Discount above rep authority — holding the quote for approval\'","o3":"\'quoteDiscountApproval\'","o4":"\'QuoteApprovalEscalation\'","o5":"\'\'","o6":"\'\'","o7":"\'\'","o8":"\'\'"},{"_id":"quoteDiscountApproval-refuseDiscount","i1":"discount_percent > 40","o1":"\'validation-error\'","o2":"\'Discounts above 40 percent cannot be approved by anyone — reprice the quote\'","o3":"\'quoteDiscountApproval\'","o4":"\'\'","o5":"\'\'","o6":"\'\'","o7":"\'\'","o8":"\'\'"}]}},{"id":"output","name":"Output","type":"outputNode"}],"edges":[{"id":"edge-1","sourceId":"input","targetId":"quoteDiscountApproval-table"},{"id":"edge-2","sourceId":"quoteDiscountApproval-table","targetId":"output"}]}',
  },
  {
    entityName: 'bus_support_case',
    ruleName: 'caseTriage',
    operation: 'CREATE',
    priority: 5,
    jdmContent: '{"nodes":[{"id":"input","name":"Input","type":"inputNode"},{"id":"caseTriage-table","name":"caseTriage","type":"decisionTableNode","content":{"hitPolicy":"collect","inputs":[{"id":"i1","name":"Record","field":""}],"outputs":[{"id":"o1","name":"Action","field":"action"},{"id":"o2","name":"Message","field":"message"},{"id":"o3","name":"Rule ID","field":"ruleId"},{"id":"o4","name":"Workflow Name","field":"workflowName"},{"id":"o5","name":"Field","field":"field"},{"id":"o6","name":"Value","field":"value"},{"id":"o7","name":"Target Entity","field":"targetEntity"},{"id":"o8","name":"Link Field","field":"linkField"}],"rules":[{"_id":"caseTriage-escalateCriticalCase","i1":"priority == \\"critical\\"","o1":"\'trigger-workflow\'","o2":"\'Critical case — escalating and raising an escalation task\'","o3":"\'caseTriage\'","o4":"\'CriticalCaseEscalation\'","o5":"\'\'","o6":"\'\'","o7":"\'\'","o8":"\'\'"},{"_id":"caseTriage-requireResolutionNotes","i1":"status == \\"resolved\\" and resolution_notes == null","o1":"\'validation-error\'","o2":"\'A resolved case needs resolution notes\'","o3":"\'caseTriage\'","o4":"\'\'","o5":"\'\'","o6":"\'\'","o7":"\'\'","o8":"\'\'"}]}},{"id":"output","name":"Output","type":"outputNode"}],"edges":[{"id":"edge-1","sourceId":"input","targetId":"caseTriage-table"},{"id":"edge-2","sourceId":"caseTriage-table","targetId":"output"}]}',
  },
  {
    entityName: 'bus_contract',
    ruleName: 'renewalRisk',
    operation: 'UPDATE',
    priority: 15,
    jdmContent: '{"nodes":[{"id":"node-A","name":"Start: Renewal Window Opened","type":"inputNode"},{"id":"node-B","name":"account health_score < 40?","type":"switchNode"},{"id":"node-C","name":"Grade renewal at risk","type":"expressionNode"},{"id":"node-D","name":"open critical cases > 0?","type":"switchNode"},{"id":"node-E","name":"Grade renewal watch","type":"expressionNode"},{"id":"node-F","name":"annual_value >= 250000?","type":"switchNode"},{"id":"node-G","name":"auto_renew == true?","type":"switchNode"},{"id":"node-H","name":"Grade renewal secure and confirm terms","type":"expressionNode"},{"id":"node-I","name":"Grade renewal strategic and assign an executive","type":"expressionNode"},{"id":"node-J","name":"auto_renew == true?","type":"switchNode"},{"id":"node-K","name":"Grade renewal automatic","type":"expressionNode"},{"id":"node-L","name":"Grade renewal standard","type":"expressionNode"},{"id":"node-M","name":"Compute renewal probability","type":"functionNode"},{"id":"node-Z","name":"End: Renewal Graded","type":"outputNode"}],"edges":[{"id":"edge-1","sourceId":"node-A","targetId":"node-B"},{"id":"edge-2","name":"Yes","sourceId":"node-B","targetId":"node-C"},{"id":"edge-3","name":"No","sourceId":"node-B","targetId":"node-D"},{"id":"edge-4","name":"Yes","sourceId":"node-D","targetId":"node-E"},{"id":"edge-5","name":"No","sourceId":"node-D","targetId":"node-F"},{"id":"edge-6","name":"Yes","sourceId":"node-F","targetId":"node-G"},{"id":"edge-7","name":"Yes","sourceId":"node-G","targetId":"node-H"},{"id":"edge-8","name":"No","sourceId":"node-G","targetId":"node-I"},{"id":"edge-9","name":"No","sourceId":"node-F","targetId":"node-J"},{"id":"edge-10","name":"Yes","sourceId":"node-J","targetId":"node-K"},{"id":"edge-11","name":"No","sourceId":"node-J","targetId":"node-L"},{"id":"edge-12","sourceId":"node-C","targetId":"node-M"},{"id":"edge-13","sourceId":"node-E","targetId":"node-M"},{"id":"edge-14","sourceId":"node-H","targetId":"node-M"},{"id":"edge-15","sourceId":"node-I","targetId":"node-M"},{"id":"edge-16","sourceId":"node-K","targetId":"node-M"},{"id":"edge-17","sourceId":"node-L","targetId":"node-M"},{"id":"edge-18","sourceId":"node-M","targetId":"node-Z"}]}',
  },
];

// Workflows are not triggered by seeded rules.
//
// The generator seeds a workflow definition per entity per operation (see
// 05_workflow_definitions.ts), and the promotion pipeline runs the matching
// definition automatically on every write. A seeded `trigger-workflow` rule
// naming the same definition ran it a second time, so one create produced
// duplicate workflow runs and duplicate side effects.
//
// `trigger-workflow` remains available as a rule action for rules you author
// yourself, where choosing a workflow by name is the point.

export async function seed(db: Kysely<any>): Promise<void> {
  const now = new Date();

  for (const rule of RULES) {
    const jdmPath = path.join(JDM_DIR, rule.file);
    if (!fs.existsSync(jdmPath)) {
      console.warn(`  ⚠ JDM file not found, skipping rule seed: ${jdmPath}`);
      continue;
    }

    const jdmContent = fs.readFileSync(jdmPath, 'utf-8');
    // Fail fast on malformed JDM rather than seeding a broken rule
    JSON.parse(jdmContent);

    const existing = await db
      .selectFrom('sys_rule_definitions')
      .select('id')
      .where('entity_name', '=', rule.entityName)
      .where('operation', '=', rule.operation)
      .where('rule_name', '=', rule.ruleName)
      .executeTakeFirst();

    if (existing) {
      await db
        .updateTable('sys_rule_definitions')
        .set({ jdm_content: jdmContent, is_active: true, updated_by: 'seed', updated_at: now })
        .where('id', '=', (existing as any).id)
        .execute();
      console.log(`  ↻ Updated business rule: ${rule.entityName} (${rule.operation})`);
    } else {
      await db
        .insertInto('sys_rule_definitions')
        .values({
          id: uuidv4(),
          entity_name: rule.entityName,
          rule_name: rule.ruleName,
          operation: rule.operation,
          jdm_content: jdmContent,
          version: 1,
          is_active: true,
          created_by: 'seed',
          created_at: now,
          updated_at: now,
        } as any)
        .execute();
      console.log(`  ✓ Seeded business rule: ${rule.entityName} (${rule.operation})`);
    }
  }
  await seedAuthoredRules(db);
}

export async function seedAuthoredRules(db: Kysely<any>): Promise<void> {
  const now = new Date();

  for (const rule of AUTHORED_RULES) {
    const existing = await db
      .selectFrom('sys_rule_definitions')
      .select('id')
      .where('entity_name', '=', rule.entityName)
      .where('rule_name', '=', rule.ruleName)
      .executeTakeFirst();

    if (existing) {
      await db
        .updateTable('sys_rule_definitions')
        .set({ jdm_content: rule.jdmContent, operation: rule.operation as any, is_active: true, updated_by: 'seed', updated_at: now })
        .where('id', '=', (existing as any).id)
        .execute();
      console.log(`  \u21bb Updated authored rule: ${rule.ruleName} (${rule.entityName} ${rule.operation})`);
    } else {
      await db
        .insertInto('sys_rule_definitions')
        .values({
          id: uuidv4(),
          entity_name: rule.entityName,
          rule_name: rule.ruleName,
          operation: rule.operation as any,
          jdm_content: rule.jdmContent,
          version: 1,
          is_active: true,
          created_by: 'seed',
          created_at: now,
          updated_at: now,
        } as any)
        .execute();
      console.log(`  \u2713 Seeded authored rule: ${rule.ruleName} (${rule.entityName} ${rule.operation})`);
    }
  }
}
