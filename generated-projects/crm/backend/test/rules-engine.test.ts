/**
 * Business Rules Engine Tests
 *
 * Verifies that the generated GoRules JDM decision models are valid and that
 * the RulesEngine enforces them: required-field violations are reported for
 * empty payloads and clean payloads pass without violations.
 *
 * Generated: 2026-08-29T04:45:22.006Z
 */

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { readFileSync } from 'fs';
import { join } from 'path';
import { RulesEngine } from '../src/modules/rules/rules-engine.service';
import { TestDataFactory } from './setup';

const JDM_DIR = join(__dirname, '..', 'src', 'modules', 'rules', 'jdm');

describe('Rules Engine (GoRules JDM)', () => {
  let engine: RulesEngine;

  beforeAll(() => {
    engine = new RulesEngine();
  });

  afterAll(() => {
    engine.onModuleDestroy();
  });

  it('returns no violations for entities without configured rules', async () => {
    const results = await engine.evaluateRules('bus_unknown_entity', {}, 'create');
    expect(results).toEqual([]);
  });

  describe('User (bus_user)', () => {
    const jdmContent = readFileSync(join(JDM_DIR, 'bus_user.jdm.json'), 'utf-8');

    it('has a valid JDM decision model', () => {
      const parsed = JSON.parse(jdmContent);
      expect(Array.isArray(parsed.nodes)).toBe(true);
      expect(Array.isArray(parsed.edges)).toBe(true);
    });

    // Every entity table also carries unconditional post-create/post-update
    // trigger-workflow rows, so these assertions look at the 'prevent' actions
    // specifically rather than at every matched row.
    it('reports required-field violations for an empty payload', async () => {
      const results = await engine.evaluateRulesWithJDM('bus_user', jdmContent, {}, 'create');

      const preventions = results.filter((r) => r.actions[0]?.type === 'prevent');
      expect(preventions.length).toBeGreaterThan(0);
      for (const result of preventions) {
        expect(result.matched).toBe(true);
        expect(result.errors).toBeUndefined();
        expect(typeof result.actions[0].config.message).toBe('string');
        expect((result.actions[0].config.message as string).length).toBeGreaterThan(0);
      }
    });

    it('passes a fully populated payload without violations', async () => {
      const data = TestDataFactory.createUser();
      const results = await engine.evaluateRulesWithJDM('bus_user', jdmContent, data, 'create');

      const violations = results.filter((r) => r.matched && r.actions[0]?.type === 'prevent');
      expect(violations).toEqual([]);
    });

    // The generated validation table used to carry a trigger-workflow row per
    // operation, naming a definition nothing created. Once definitions were
    // seeded, those rows fired the same workflow a second and third time for a
    // single write. Workflows are now reached declaratively — matched by entity
    // and operation — and `trigger-workflow` is reserved for rules an author
    // writes, where naming a workflow is the point.
    it('leaves workflow triggering to the definitions, not the validation table', async () => {
      const data = TestDataFactory.createUser();
      const results = await engine.evaluateRulesWithJDM('bus_user', jdmContent, data, 'create');

      const triggers = results.filter((r) => r.actions[0]?.type === 'trigger-workflow');
      expect(triggers).toEqual([]);
    });

    it('evaluates rules loaded from the JDM file on disk', async () => {
      const results = await engine.evaluateRules('bus_user', {}, 'create');
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('Team (bus_team)', () => {
    const jdmContent = readFileSync(join(JDM_DIR, 'bus_team.jdm.json'), 'utf-8');

    it('has a valid JDM decision model', () => {
      const parsed = JSON.parse(jdmContent);
      expect(Array.isArray(parsed.nodes)).toBe(true);
      expect(Array.isArray(parsed.edges)).toBe(true);
    });

    // Every entity table also carries unconditional post-create/post-update
    // trigger-workflow rows, so these assertions look at the 'prevent' actions
    // specifically rather than at every matched row.
    it('reports required-field violations for an empty payload', async () => {
      const results = await engine.evaluateRulesWithJDM('bus_team', jdmContent, {}, 'create');

      const preventions = results.filter((r) => r.actions[0]?.type === 'prevent');
      expect(preventions.length).toBeGreaterThan(0);
      for (const result of preventions) {
        expect(result.matched).toBe(true);
        expect(result.errors).toBeUndefined();
        expect(typeof result.actions[0].config.message).toBe('string');
        expect((result.actions[0].config.message as string).length).toBeGreaterThan(0);
      }
    });

    it('passes a fully populated payload without violations', async () => {
      const data = TestDataFactory.createTeam();
      const results = await engine.evaluateRulesWithJDM('bus_team', jdmContent, data, 'create');

      const violations = results.filter((r) => r.matched && r.actions[0]?.type === 'prevent');
      expect(violations).toEqual([]);
    });

    // The generated validation table used to carry a trigger-workflow row per
    // operation, naming a definition nothing created. Once definitions were
    // seeded, those rows fired the same workflow a second and third time for a
    // single write. Workflows are now reached declaratively — matched by entity
    // and operation — and `trigger-workflow` is reserved for rules an author
    // writes, where naming a workflow is the point.
    it('leaves workflow triggering to the definitions, not the validation table', async () => {
      const data = TestDataFactory.createTeam();
      const results = await engine.evaluateRulesWithJDM('bus_team', jdmContent, data, 'create');

      const triggers = results.filter((r) => r.actions[0]?.type === 'trigger-workflow');
      expect(triggers).toEqual([]);
    });

    it('evaluates rules loaded from the JDM file on disk', async () => {
      const results = await engine.evaluateRules('bus_team', {}, 'create');
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('Territory (bus_territory)', () => {
    const jdmContent = readFileSync(join(JDM_DIR, 'bus_territory.jdm.json'), 'utf-8');

    it('has a valid JDM decision model', () => {
      const parsed = JSON.parse(jdmContent);
      expect(Array.isArray(parsed.nodes)).toBe(true);
      expect(Array.isArray(parsed.edges)).toBe(true);
    });

    // Every entity table also carries unconditional post-create/post-update
    // trigger-workflow rows, so these assertions look at the 'prevent' actions
    // specifically rather than at every matched row.
    it('reports required-field violations for an empty payload', async () => {
      const results = await engine.evaluateRulesWithJDM('bus_territory', jdmContent, {}, 'create');

      const preventions = results.filter((r) => r.actions[0]?.type === 'prevent');
      expect(preventions.length).toBeGreaterThan(0);
      for (const result of preventions) {
        expect(result.matched).toBe(true);
        expect(result.errors).toBeUndefined();
        expect(typeof result.actions[0].config.message).toBe('string');
        expect((result.actions[0].config.message as string).length).toBeGreaterThan(0);
      }
    });

    it('passes a fully populated payload without violations', async () => {
      const data = TestDataFactory.createTerritory();
      const results = await engine.evaluateRulesWithJDM('bus_territory', jdmContent, data, 'create');

      const violations = results.filter((r) => r.matched && r.actions[0]?.type === 'prevent');
      expect(violations).toEqual([]);
    });

    // The generated validation table used to carry a trigger-workflow row per
    // operation, naming a definition nothing created. Once definitions were
    // seeded, those rows fired the same workflow a second and third time for a
    // single write. Workflows are now reached declaratively — matched by entity
    // and operation — and `trigger-workflow` is reserved for rules an author
    // writes, where naming a workflow is the point.
    it('leaves workflow triggering to the definitions, not the validation table', async () => {
      const data = TestDataFactory.createTerritory();
      const results = await engine.evaluateRulesWithJDM('bus_territory', jdmContent, data, 'create');

      const triggers = results.filter((r) => r.actions[0]?.type === 'trigger-workflow');
      expect(triggers).toEqual([]);
    });

    it('evaluates rules loaded from the JDM file on disk', async () => {
      const results = await engine.evaluateRules('bus_territory', {}, 'create');
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('Account (bus_account)', () => {
    const jdmContent = readFileSync(join(JDM_DIR, 'bus_account.jdm.json'), 'utf-8');

    it('has a valid JDM decision model', () => {
      const parsed = JSON.parse(jdmContent);
      expect(Array.isArray(parsed.nodes)).toBe(true);
      expect(Array.isArray(parsed.edges)).toBe(true);
    });

    // Every entity table also carries unconditional post-create/post-update
    // trigger-workflow rows, so these assertions look at the 'prevent' actions
    // specifically rather than at every matched row.
    it('reports required-field violations for an empty payload', async () => {
      const results = await engine.evaluateRulesWithJDM('bus_account', jdmContent, {}, 'create');

      const preventions = results.filter((r) => r.actions[0]?.type === 'prevent');
      expect(preventions.length).toBeGreaterThan(0);
      for (const result of preventions) {
        expect(result.matched).toBe(true);
        expect(result.errors).toBeUndefined();
        expect(typeof result.actions[0].config.message).toBe('string');
        expect((result.actions[0].config.message as string).length).toBeGreaterThan(0);
      }
    });

    it('passes a fully populated payload without violations', async () => {
      const data = TestDataFactory.createAccount();
      const results = await engine.evaluateRulesWithJDM('bus_account', jdmContent, data, 'create');

      const violations = results.filter((r) => r.matched && r.actions[0]?.type === 'prevent');
      expect(violations).toEqual([]);
    });

    // The generated validation table used to carry a trigger-workflow row per
    // operation, naming a definition nothing created. Once definitions were
    // seeded, those rows fired the same workflow a second and third time for a
    // single write. Workflows are now reached declaratively — matched by entity
    // and operation — and `trigger-workflow` is reserved for rules an author
    // writes, where naming a workflow is the point.
    it('leaves workflow triggering to the definitions, not the validation table', async () => {
      const data = TestDataFactory.createAccount();
      const results = await engine.evaluateRulesWithJDM('bus_account', jdmContent, data, 'create');

      const triggers = results.filter((r) => r.actions[0]?.type === 'trigger-workflow');
      expect(triggers).toEqual([]);
    });

    it('evaluates rules loaded from the JDM file on disk', async () => {
      const results = await engine.evaluateRules('bus_account', {}, 'create');
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('Contact (bus_contact)', () => {
    const jdmContent = readFileSync(join(JDM_DIR, 'bus_contact.jdm.json'), 'utf-8');

    it('has a valid JDM decision model', () => {
      const parsed = JSON.parse(jdmContent);
      expect(Array.isArray(parsed.nodes)).toBe(true);
      expect(Array.isArray(parsed.edges)).toBe(true);
    });

    // Every entity table also carries unconditional post-create/post-update
    // trigger-workflow rows, so these assertions look at the 'prevent' actions
    // specifically rather than at every matched row.
    it('reports required-field violations for an empty payload', async () => {
      const results = await engine.evaluateRulesWithJDM('bus_contact', jdmContent, {}, 'create');

      const preventions = results.filter((r) => r.actions[0]?.type === 'prevent');
      expect(preventions.length).toBeGreaterThan(0);
      for (const result of preventions) {
        expect(result.matched).toBe(true);
        expect(result.errors).toBeUndefined();
        expect(typeof result.actions[0].config.message).toBe('string');
        expect((result.actions[0].config.message as string).length).toBeGreaterThan(0);
      }
    });

    it('passes a fully populated payload without violations', async () => {
      const data = TestDataFactory.createContact();
      const results = await engine.evaluateRulesWithJDM('bus_contact', jdmContent, data, 'create');

      const violations = results.filter((r) => r.matched && r.actions[0]?.type === 'prevent');
      expect(violations).toEqual([]);
    });

    // The generated validation table used to carry a trigger-workflow row per
    // operation, naming a definition nothing created. Once definitions were
    // seeded, those rows fired the same workflow a second and third time for a
    // single write. Workflows are now reached declaratively — matched by entity
    // and operation — and `trigger-workflow` is reserved for rules an author
    // writes, where naming a workflow is the point.
    it('leaves workflow triggering to the definitions, not the validation table', async () => {
      const data = TestDataFactory.createContact();
      const results = await engine.evaluateRulesWithJDM('bus_contact', jdmContent, data, 'create');

      const triggers = results.filter((r) => r.actions[0]?.type === 'trigger-workflow');
      expect(triggers).toEqual([]);
    });

    it('evaluates rules loaded from the JDM file on disk', async () => {
      const results = await engine.evaluateRules('bus_contact', {}, 'create');
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('Lead (bus_lead)', () => {
    const jdmContent = readFileSync(join(JDM_DIR, 'bus_lead.jdm.json'), 'utf-8');

    it('has a valid JDM decision model', () => {
      const parsed = JSON.parse(jdmContent);
      expect(Array.isArray(parsed.nodes)).toBe(true);
      expect(Array.isArray(parsed.edges)).toBe(true);
    });

    // Every entity table also carries unconditional post-create/post-update
    // trigger-workflow rows, so these assertions look at the 'prevent' actions
    // specifically rather than at every matched row.
    it('reports required-field violations for an empty payload', async () => {
      const results = await engine.evaluateRulesWithJDM('bus_lead', jdmContent, {}, 'create');

      const preventions = results.filter((r) => r.actions[0]?.type === 'prevent');
      expect(preventions.length).toBeGreaterThan(0);
      for (const result of preventions) {
        expect(result.matched).toBe(true);
        expect(result.errors).toBeUndefined();
        expect(typeof result.actions[0].config.message).toBe('string');
        expect((result.actions[0].config.message as string).length).toBeGreaterThan(0);
      }
    });

    it('passes a fully populated payload without violations', async () => {
      const data = TestDataFactory.createLead();
      const results = await engine.evaluateRulesWithJDM('bus_lead', jdmContent, data, 'create');

      const violations = results.filter((r) => r.matched && r.actions[0]?.type === 'prevent');
      expect(violations).toEqual([]);
    });

    // The generated validation table used to carry a trigger-workflow row per
    // operation, naming a definition nothing created. Once definitions were
    // seeded, those rows fired the same workflow a second and third time for a
    // single write. Workflows are now reached declaratively — matched by entity
    // and operation — and `trigger-workflow` is reserved for rules an author
    // writes, where naming a workflow is the point.
    it('leaves workflow triggering to the definitions, not the validation table', async () => {
      const data = TestDataFactory.createLead();
      const results = await engine.evaluateRulesWithJDM('bus_lead', jdmContent, data, 'create');

      const triggers = results.filter((r) => r.actions[0]?.type === 'trigger-workflow');
      expect(triggers).toEqual([]);
    });

    it('evaluates rules loaded from the JDM file on disk', async () => {
      const results = await engine.evaluateRules('bus_lead', {}, 'create');
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('Campaign (bus_campaign)', () => {
    const jdmContent = readFileSync(join(JDM_DIR, 'bus_campaign.jdm.json'), 'utf-8');

    it('has a valid JDM decision model', () => {
      const parsed = JSON.parse(jdmContent);
      expect(Array.isArray(parsed.nodes)).toBe(true);
      expect(Array.isArray(parsed.edges)).toBe(true);
    });

    // Every entity table also carries unconditional post-create/post-update
    // trigger-workflow rows, so these assertions look at the 'prevent' actions
    // specifically rather than at every matched row.
    it('reports required-field violations for an empty payload', async () => {
      const results = await engine.evaluateRulesWithJDM('bus_campaign', jdmContent, {}, 'create');

      const preventions = results.filter((r) => r.actions[0]?.type === 'prevent');
      expect(preventions.length).toBeGreaterThan(0);
      for (const result of preventions) {
        expect(result.matched).toBe(true);
        expect(result.errors).toBeUndefined();
        expect(typeof result.actions[0].config.message).toBe('string');
        expect((result.actions[0].config.message as string).length).toBeGreaterThan(0);
      }
    });

    it('passes a fully populated payload without violations', async () => {
      const data = TestDataFactory.createCampaign();
      const results = await engine.evaluateRulesWithJDM('bus_campaign', jdmContent, data, 'create');

      const violations = results.filter((r) => r.matched && r.actions[0]?.type === 'prevent');
      expect(violations).toEqual([]);
    });

    // The generated validation table used to carry a trigger-workflow row per
    // operation, naming a definition nothing created. Once definitions were
    // seeded, those rows fired the same workflow a second and third time for a
    // single write. Workflows are now reached declaratively — matched by entity
    // and operation — and `trigger-workflow` is reserved for rules an author
    // writes, where naming a workflow is the point.
    it('leaves workflow triggering to the definitions, not the validation table', async () => {
      const data = TestDataFactory.createCampaign();
      const results = await engine.evaluateRulesWithJDM('bus_campaign', jdmContent, data, 'create');

      const triggers = results.filter((r) => r.actions[0]?.type === 'trigger-workflow');
      expect(triggers).toEqual([]);
    });

    it('evaluates rules loaded from the JDM file on disk', async () => {
      const results = await engine.evaluateRules('bus_campaign', {}, 'create');
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('Campaign Member (bus_campaign_member)', () => {
    const jdmContent = readFileSync(join(JDM_DIR, 'bus_campaign_member.jdm.json'), 'utf-8');

    it('has a valid JDM decision model', () => {
      const parsed = JSON.parse(jdmContent);
      expect(Array.isArray(parsed.nodes)).toBe(true);
      expect(Array.isArray(parsed.edges)).toBe(true);
    });

    // Every entity table also carries unconditional post-create/post-update
    // trigger-workflow rows, so these assertions look at the 'prevent' actions
    // specifically rather than at every matched row.
    it('reports required-field violations for an empty payload', async () => {
      const results = await engine.evaluateRulesWithJDM('bus_campaign_member', jdmContent, {}, 'create');

      const preventions = results.filter((r) => r.actions[0]?.type === 'prevent');
      expect(preventions.length).toBeGreaterThan(0);
      for (const result of preventions) {
        expect(result.matched).toBe(true);
        expect(result.errors).toBeUndefined();
        expect(typeof result.actions[0].config.message).toBe('string');
        expect((result.actions[0].config.message as string).length).toBeGreaterThan(0);
      }
    });

    it('passes a fully populated payload without violations', async () => {
      const data = TestDataFactory.createCampaignMember();
      const results = await engine.evaluateRulesWithJDM('bus_campaign_member', jdmContent, data, 'create');

      const violations = results.filter((r) => r.matched && r.actions[0]?.type === 'prevent');
      expect(violations).toEqual([]);
    });

    // The generated validation table used to carry a trigger-workflow row per
    // operation, naming a definition nothing created. Once definitions were
    // seeded, those rows fired the same workflow a second and third time for a
    // single write. Workflows are now reached declaratively — matched by entity
    // and operation — and `trigger-workflow` is reserved for rules an author
    // writes, where naming a workflow is the point.
    it('leaves workflow triggering to the definitions, not the validation table', async () => {
      const data = TestDataFactory.createCampaignMember();
      const results = await engine.evaluateRulesWithJDM('bus_campaign_member', jdmContent, data, 'create');

      const triggers = results.filter((r) => r.actions[0]?.type === 'trigger-workflow');
      expect(triggers).toEqual([]);
    });

    it('evaluates rules loaded from the JDM file on disk', async () => {
      const results = await engine.evaluateRules('bus_campaign_member', {}, 'create');
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('Opportunity (bus_opportunity)', () => {
    const jdmContent = readFileSync(join(JDM_DIR, 'bus_opportunity.jdm.json'), 'utf-8');

    it('has a valid JDM decision model', () => {
      const parsed = JSON.parse(jdmContent);
      expect(Array.isArray(parsed.nodes)).toBe(true);
      expect(Array.isArray(parsed.edges)).toBe(true);
    });

    // Every entity table also carries unconditional post-create/post-update
    // trigger-workflow rows, so these assertions look at the 'prevent' actions
    // specifically rather than at every matched row.
    it('reports required-field violations for an empty payload', async () => {
      const results = await engine.evaluateRulesWithJDM('bus_opportunity', jdmContent, {}, 'create');

      const preventions = results.filter((r) => r.actions[0]?.type === 'prevent');
      expect(preventions.length).toBeGreaterThan(0);
      for (const result of preventions) {
        expect(result.matched).toBe(true);
        expect(result.errors).toBeUndefined();
        expect(typeof result.actions[0].config.message).toBe('string');
        expect((result.actions[0].config.message as string).length).toBeGreaterThan(0);
      }
    });

    it('passes a fully populated payload without violations', async () => {
      const data = TestDataFactory.createOpportunity();
      const results = await engine.evaluateRulesWithJDM('bus_opportunity', jdmContent, data, 'create');

      const violations = results.filter((r) => r.matched && r.actions[0]?.type === 'prevent');
      expect(violations).toEqual([]);
    });

    // The generated validation table used to carry a trigger-workflow row per
    // operation, naming a definition nothing created. Once definitions were
    // seeded, those rows fired the same workflow a second and third time for a
    // single write. Workflows are now reached declaratively — matched by entity
    // and operation — and `trigger-workflow` is reserved for rules an author
    // writes, where naming a workflow is the point.
    it('leaves workflow triggering to the definitions, not the validation table', async () => {
      const data = TestDataFactory.createOpportunity();
      const results = await engine.evaluateRulesWithJDM('bus_opportunity', jdmContent, data, 'create');

      const triggers = results.filter((r) => r.actions[0]?.type === 'trigger-workflow');
      expect(triggers).toEqual([]);
    });

    it('evaluates rules loaded from the JDM file on disk', async () => {
      const results = await engine.evaluateRules('bus_opportunity', {}, 'create');
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('Opportunity Line Item (bus_opportunity_line_item)', () => {
    const jdmContent = readFileSync(join(JDM_DIR, 'bus_opportunity_line_item.jdm.json'), 'utf-8');

    it('has a valid JDM decision model', () => {
      const parsed = JSON.parse(jdmContent);
      expect(Array.isArray(parsed.nodes)).toBe(true);
      expect(Array.isArray(parsed.edges)).toBe(true);
    });

    // Every entity table also carries unconditional post-create/post-update
    // trigger-workflow rows, so these assertions look at the 'prevent' actions
    // specifically rather than at every matched row.
    it('reports required-field violations for an empty payload', async () => {
      const results = await engine.evaluateRulesWithJDM('bus_opportunity_line_item', jdmContent, {}, 'create');

      const preventions = results.filter((r) => r.actions[0]?.type === 'prevent');
      expect(preventions.length).toBeGreaterThan(0);
      for (const result of preventions) {
        expect(result.matched).toBe(true);
        expect(result.errors).toBeUndefined();
        expect(typeof result.actions[0].config.message).toBe('string');
        expect((result.actions[0].config.message as string).length).toBeGreaterThan(0);
      }
    });

    it('passes a fully populated payload without violations', async () => {
      const data = TestDataFactory.createOpportunityLineItem();
      const results = await engine.evaluateRulesWithJDM('bus_opportunity_line_item', jdmContent, data, 'create');

      const violations = results.filter((r) => r.matched && r.actions[0]?.type === 'prevent');
      expect(violations).toEqual([]);
    });

    // The generated validation table used to carry a trigger-workflow row per
    // operation, naming a definition nothing created. Once definitions were
    // seeded, those rows fired the same workflow a second and third time for a
    // single write. Workflows are now reached declaratively — matched by entity
    // and operation — and `trigger-workflow` is reserved for rules an author
    // writes, where naming a workflow is the point.
    it('leaves workflow triggering to the definitions, not the validation table', async () => {
      const data = TestDataFactory.createOpportunityLineItem();
      const results = await engine.evaluateRulesWithJDM('bus_opportunity_line_item', jdmContent, data, 'create');

      const triggers = results.filter((r) => r.actions[0]?.type === 'trigger-workflow');
      expect(triggers).toEqual([]);
    });

    it('evaluates rules loaded from the JDM file on disk', async () => {
      const results = await engine.evaluateRules('bus_opportunity_line_item', {}, 'create');
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('Product (bus_product)', () => {
    const jdmContent = readFileSync(join(JDM_DIR, 'bus_product.jdm.json'), 'utf-8');

    it('has a valid JDM decision model', () => {
      const parsed = JSON.parse(jdmContent);
      expect(Array.isArray(parsed.nodes)).toBe(true);
      expect(Array.isArray(parsed.edges)).toBe(true);
    });

    // Every entity table also carries unconditional post-create/post-update
    // trigger-workflow rows, so these assertions look at the 'prevent' actions
    // specifically rather than at every matched row.
    it('reports required-field violations for an empty payload', async () => {
      const results = await engine.evaluateRulesWithJDM('bus_product', jdmContent, {}, 'create');

      const preventions = results.filter((r) => r.actions[0]?.type === 'prevent');
      expect(preventions.length).toBeGreaterThan(0);
      for (const result of preventions) {
        expect(result.matched).toBe(true);
        expect(result.errors).toBeUndefined();
        expect(typeof result.actions[0].config.message).toBe('string');
        expect((result.actions[0].config.message as string).length).toBeGreaterThan(0);
      }
    });

    it('passes a fully populated payload without violations', async () => {
      const data = TestDataFactory.createProduct();
      const results = await engine.evaluateRulesWithJDM('bus_product', jdmContent, data, 'create');

      const violations = results.filter((r) => r.matched && r.actions[0]?.type === 'prevent');
      expect(violations).toEqual([]);
    });

    // The generated validation table used to carry a trigger-workflow row per
    // operation, naming a definition nothing created. Once definitions were
    // seeded, those rows fired the same workflow a second and third time for a
    // single write. Workflows are now reached declaratively — matched by entity
    // and operation — and `trigger-workflow` is reserved for rules an author
    // writes, where naming a workflow is the point.
    it('leaves workflow triggering to the definitions, not the validation table', async () => {
      const data = TestDataFactory.createProduct();
      const results = await engine.evaluateRulesWithJDM('bus_product', jdmContent, data, 'create');

      const triggers = results.filter((r) => r.actions[0]?.type === 'trigger-workflow');
      expect(triggers).toEqual([]);
    });

    it('evaluates rules loaded from the JDM file on disk', async () => {
      const results = await engine.evaluateRules('bus_product', {}, 'create');
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('Quote (bus_quote)', () => {
    const jdmContent = readFileSync(join(JDM_DIR, 'bus_quote.jdm.json'), 'utf-8');

    it('has a valid JDM decision model', () => {
      const parsed = JSON.parse(jdmContent);
      expect(Array.isArray(parsed.nodes)).toBe(true);
      expect(Array.isArray(parsed.edges)).toBe(true);
    });

    // Every entity table also carries unconditional post-create/post-update
    // trigger-workflow rows, so these assertions look at the 'prevent' actions
    // specifically rather than at every matched row.
    it('reports required-field violations for an empty payload', async () => {
      const results = await engine.evaluateRulesWithJDM('bus_quote', jdmContent, {}, 'create');

      const preventions = results.filter((r) => r.actions[0]?.type === 'prevent');
      expect(preventions.length).toBeGreaterThan(0);
      for (const result of preventions) {
        expect(result.matched).toBe(true);
        expect(result.errors).toBeUndefined();
        expect(typeof result.actions[0].config.message).toBe('string');
        expect((result.actions[0].config.message as string).length).toBeGreaterThan(0);
      }
    });

    it('passes a fully populated payload without violations', async () => {
      const data = TestDataFactory.createQuote();
      const results = await engine.evaluateRulesWithJDM('bus_quote', jdmContent, data, 'create');

      const violations = results.filter((r) => r.matched && r.actions[0]?.type === 'prevent');
      expect(violations).toEqual([]);
    });

    // The generated validation table used to carry a trigger-workflow row per
    // operation, naming a definition nothing created. Once definitions were
    // seeded, those rows fired the same workflow a second and third time for a
    // single write. Workflows are now reached declaratively — matched by entity
    // and operation — and `trigger-workflow` is reserved for rules an author
    // writes, where naming a workflow is the point.
    it('leaves workflow triggering to the definitions, not the validation table', async () => {
      const data = TestDataFactory.createQuote();
      const results = await engine.evaluateRulesWithJDM('bus_quote', jdmContent, data, 'create');

      const triggers = results.filter((r) => r.actions[0]?.type === 'trigger-workflow');
      expect(triggers).toEqual([]);
    });

    it('evaluates rules loaded from the JDM file on disk', async () => {
      const results = await engine.evaluateRules('bus_quote', {}, 'create');
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('Quote Line Item (bus_quote_line_item)', () => {
    const jdmContent = readFileSync(join(JDM_DIR, 'bus_quote_line_item.jdm.json'), 'utf-8');

    it('has a valid JDM decision model', () => {
      const parsed = JSON.parse(jdmContent);
      expect(Array.isArray(parsed.nodes)).toBe(true);
      expect(Array.isArray(parsed.edges)).toBe(true);
    });

    // Every entity table also carries unconditional post-create/post-update
    // trigger-workflow rows, so these assertions look at the 'prevent' actions
    // specifically rather than at every matched row.
    it('reports required-field violations for an empty payload', async () => {
      const results = await engine.evaluateRulesWithJDM('bus_quote_line_item', jdmContent, {}, 'create');

      const preventions = results.filter((r) => r.actions[0]?.type === 'prevent');
      expect(preventions.length).toBeGreaterThan(0);
      for (const result of preventions) {
        expect(result.matched).toBe(true);
        expect(result.errors).toBeUndefined();
        expect(typeof result.actions[0].config.message).toBe('string');
        expect((result.actions[0].config.message as string).length).toBeGreaterThan(0);
      }
    });

    it('passes a fully populated payload without violations', async () => {
      const data = TestDataFactory.createQuoteLineItem();
      const results = await engine.evaluateRulesWithJDM('bus_quote_line_item', jdmContent, data, 'create');

      const violations = results.filter((r) => r.matched && r.actions[0]?.type === 'prevent');
      expect(violations).toEqual([]);
    });

    // The generated validation table used to carry a trigger-workflow row per
    // operation, naming a definition nothing created. Once definitions were
    // seeded, those rows fired the same workflow a second and third time for a
    // single write. Workflows are now reached declaratively — matched by entity
    // and operation — and `trigger-workflow` is reserved for rules an author
    // writes, where naming a workflow is the point.
    it('leaves workflow triggering to the definitions, not the validation table', async () => {
      const data = TestDataFactory.createQuoteLineItem();
      const results = await engine.evaluateRulesWithJDM('bus_quote_line_item', jdmContent, data, 'create');

      const triggers = results.filter((r) => r.actions[0]?.type === 'trigger-workflow');
      expect(triggers).toEqual([]);
    });

    it('evaluates rules loaded from the JDM file on disk', async () => {
      const results = await engine.evaluateRules('bus_quote_line_item', {}, 'create');
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('Contract (bus_contract)', () => {
    const jdmContent = readFileSync(join(JDM_DIR, 'bus_contract.jdm.json'), 'utf-8');

    it('has a valid JDM decision model', () => {
      const parsed = JSON.parse(jdmContent);
      expect(Array.isArray(parsed.nodes)).toBe(true);
      expect(Array.isArray(parsed.edges)).toBe(true);
    });

    // Every entity table also carries unconditional post-create/post-update
    // trigger-workflow rows, so these assertions look at the 'prevent' actions
    // specifically rather than at every matched row.
    it('reports required-field violations for an empty payload', async () => {
      const results = await engine.evaluateRulesWithJDM('bus_contract', jdmContent, {}, 'create');

      const preventions = results.filter((r) => r.actions[0]?.type === 'prevent');
      expect(preventions.length).toBeGreaterThan(0);
      for (const result of preventions) {
        expect(result.matched).toBe(true);
        expect(result.errors).toBeUndefined();
        expect(typeof result.actions[0].config.message).toBe('string');
        expect((result.actions[0].config.message as string).length).toBeGreaterThan(0);
      }
    });

    it('passes a fully populated payload without violations', async () => {
      const data = TestDataFactory.createContract();
      const results = await engine.evaluateRulesWithJDM('bus_contract', jdmContent, data, 'create');

      const violations = results.filter((r) => r.matched && r.actions[0]?.type === 'prevent');
      expect(violations).toEqual([]);
    });

    // The generated validation table used to carry a trigger-workflow row per
    // operation, naming a definition nothing created. Once definitions were
    // seeded, those rows fired the same workflow a second and third time for a
    // single write. Workflows are now reached declaratively — matched by entity
    // and operation — and `trigger-workflow` is reserved for rules an author
    // writes, where naming a workflow is the point.
    it('leaves workflow triggering to the definitions, not the validation table', async () => {
      const data = TestDataFactory.createContract();
      const results = await engine.evaluateRulesWithJDM('bus_contract', jdmContent, data, 'create');

      const triggers = results.filter((r) => r.actions[0]?.type === 'trigger-workflow');
      expect(triggers).toEqual([]);
    });

    it('evaluates rules loaded from the JDM file on disk', async () => {
      const results = await engine.evaluateRules('bus_contract', {}, 'create');
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('Support Case (bus_support_case)', () => {
    const jdmContent = readFileSync(join(JDM_DIR, 'bus_support_case.jdm.json'), 'utf-8');

    it('has a valid JDM decision model', () => {
      const parsed = JSON.parse(jdmContent);
      expect(Array.isArray(parsed.nodes)).toBe(true);
      expect(Array.isArray(parsed.edges)).toBe(true);
    });

    // Every entity table also carries unconditional post-create/post-update
    // trigger-workflow rows, so these assertions look at the 'prevent' actions
    // specifically rather than at every matched row.
    it('reports required-field violations for an empty payload', async () => {
      const results = await engine.evaluateRulesWithJDM('bus_support_case', jdmContent, {}, 'create');

      const preventions = results.filter((r) => r.actions[0]?.type === 'prevent');
      expect(preventions.length).toBeGreaterThan(0);
      for (const result of preventions) {
        expect(result.matched).toBe(true);
        expect(result.errors).toBeUndefined();
        expect(typeof result.actions[0].config.message).toBe('string');
        expect((result.actions[0].config.message as string).length).toBeGreaterThan(0);
      }
    });

    it('passes a fully populated payload without violations', async () => {
      const data = TestDataFactory.createSupportCase();
      const results = await engine.evaluateRulesWithJDM('bus_support_case', jdmContent, data, 'create');

      const violations = results.filter((r) => r.matched && r.actions[0]?.type === 'prevent');
      expect(violations).toEqual([]);
    });

    // The generated validation table used to carry a trigger-workflow row per
    // operation, naming a definition nothing created. Once definitions were
    // seeded, those rows fired the same workflow a second and third time for a
    // single write. Workflows are now reached declaratively — matched by entity
    // and operation — and `trigger-workflow` is reserved for rules an author
    // writes, where naming a workflow is the point.
    it('leaves workflow triggering to the definitions, not the validation table', async () => {
      const data = TestDataFactory.createSupportCase();
      const results = await engine.evaluateRulesWithJDM('bus_support_case', jdmContent, data, 'create');

      const triggers = results.filter((r) => r.actions[0]?.type === 'trigger-workflow');
      expect(triggers).toEqual([]);
    });

    it('evaluates rules loaded from the JDM file on disk', async () => {
      const results = await engine.evaluateRules('bus_support_case', {}, 'create');
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('Sla Policy (bus_sla_policy)', () => {
    const jdmContent = readFileSync(join(JDM_DIR, 'bus_sla_policy.jdm.json'), 'utf-8');

    it('has a valid JDM decision model', () => {
      const parsed = JSON.parse(jdmContent);
      expect(Array.isArray(parsed.nodes)).toBe(true);
      expect(Array.isArray(parsed.edges)).toBe(true);
    });

    // Every entity table also carries unconditional post-create/post-update
    // trigger-workflow rows, so these assertions look at the 'prevent' actions
    // specifically rather than at every matched row.
    it('reports required-field violations for an empty payload', async () => {
      const results = await engine.evaluateRulesWithJDM('bus_sla_policy', jdmContent, {}, 'create');

      const preventions = results.filter((r) => r.actions[0]?.type === 'prevent');
      expect(preventions.length).toBeGreaterThan(0);
      for (const result of preventions) {
        expect(result.matched).toBe(true);
        expect(result.errors).toBeUndefined();
        expect(typeof result.actions[0].config.message).toBe('string');
        expect((result.actions[0].config.message as string).length).toBeGreaterThan(0);
      }
    });

    it('passes a fully populated payload without violations', async () => {
      const data = TestDataFactory.createSlaPolicy();
      const results = await engine.evaluateRulesWithJDM('bus_sla_policy', jdmContent, data, 'create');

      const violations = results.filter((r) => r.matched && r.actions[0]?.type === 'prevent');
      expect(violations).toEqual([]);
    });

    // The generated validation table used to carry a trigger-workflow row per
    // operation, naming a definition nothing created. Once definitions were
    // seeded, those rows fired the same workflow a second and third time for a
    // single write. Workflows are now reached declaratively — matched by entity
    // and operation — and `trigger-workflow` is reserved for rules an author
    // writes, where naming a workflow is the point.
    it('leaves workflow triggering to the definitions, not the validation table', async () => {
      const data = TestDataFactory.createSlaPolicy();
      const results = await engine.evaluateRulesWithJDM('bus_sla_policy', jdmContent, data, 'create');

      const triggers = results.filter((r) => r.actions[0]?.type === 'trigger-workflow');
      expect(triggers).toEqual([]);
    });

    it('evaluates rules loaded from the JDM file on disk', async () => {
      const results = await engine.evaluateRules('bus_sla_policy', {}, 'create');
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('Activity (bus_activity)', () => {
    const jdmContent = readFileSync(join(JDM_DIR, 'bus_activity.jdm.json'), 'utf-8');

    it('has a valid JDM decision model', () => {
      const parsed = JSON.parse(jdmContent);
      expect(Array.isArray(parsed.nodes)).toBe(true);
      expect(Array.isArray(parsed.edges)).toBe(true);
    });

    // Every entity table also carries unconditional post-create/post-update
    // trigger-workflow rows, so these assertions look at the 'prevent' actions
    // specifically rather than at every matched row.
    it('reports required-field violations for an empty payload', async () => {
      const results = await engine.evaluateRulesWithJDM('bus_activity', jdmContent, {}, 'create');

      const preventions = results.filter((r) => r.actions[0]?.type === 'prevent');
      expect(preventions.length).toBeGreaterThan(0);
      for (const result of preventions) {
        expect(result.matched).toBe(true);
        expect(result.errors).toBeUndefined();
        expect(typeof result.actions[0].config.message).toBe('string');
        expect((result.actions[0].config.message as string).length).toBeGreaterThan(0);
      }
    });

    it('passes a fully populated payload without violations', async () => {
      const data = TestDataFactory.createActivity();
      const results = await engine.evaluateRulesWithJDM('bus_activity', jdmContent, data, 'create');

      const violations = results.filter((r) => r.matched && r.actions[0]?.type === 'prevent');
      expect(violations).toEqual([]);
    });

    // The generated validation table used to carry a trigger-workflow row per
    // operation, naming a definition nothing created. Once definitions were
    // seeded, those rows fired the same workflow a second and third time for a
    // single write. Workflows are now reached declaratively — matched by entity
    // and operation — and `trigger-workflow` is reserved for rules an author
    // writes, where naming a workflow is the point.
    it('leaves workflow triggering to the definitions, not the validation table', async () => {
      const data = TestDataFactory.createActivity();
      const results = await engine.evaluateRulesWithJDM('bus_activity', jdmContent, data, 'create');

      const triggers = results.filter((r) => r.actions[0]?.type === 'trigger-workflow');
      expect(triggers).toEqual([]);
    });

    it('evaluates rules loaded from the JDM file on disk', async () => {
      const results = await engine.evaluateRules('bus_activity', {}, 'create');
      expect(results.length).toBeGreaterThan(0);
    });
  });

});
