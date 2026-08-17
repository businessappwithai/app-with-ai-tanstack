/**
 * Hook registry.
 *
 * Binds each entity's handlers to the lifecycle events the model declares.
 * Generated from `%%hook` directives — edit the model, not this file.
 *
 * @generated
 */

import * as AccountHooks from './Account';
import * as ContactHooks from './Contact';
import * as ContractHooks from './Contract';
import * as LeadHooks from './Lead';
import * as OpportunityHooks from './Opportunity';
import * as QuoteHooks from './Quote';
import * as SupportCaseHooks from './SupportCase';

/** Canonical lookup key for an entity, however it was spelled. */
export function hookKey(entity: string): string {
  const flat = entity.toLowerCase().replace(/^bus_/, '').replace(/[_-]/g, '');
  return flat.endsWith('s') && !flat.endsWith('ss') ? flat.slice(0, -1) : flat;
}

export const ENTITY_HOOKS: Record<string, Record<string, Record<string, any>>> = {
  // Account
  [hookKey('Account')]: {
    beforeCreate: {
      normalizeAccountName: AccountHooks.normalizeAccountName,
      assignAccountNumber: AccountHooks.assignAccountNumber,
    },
    customValidate: {
      ensureAccountNumberUnique: AccountHooks.ensureAccountNumberUnique,
    },
    afterCreate: {
      seedAccountTeam: AccountHooks.seedAccountTeam,
    },
    beforeList: {
      scopeToTerritory: AccountHooks.scopeToTerritory,
    },
    afterList: {
      attachHealthScore: AccountHooks.attachHealthScore,
    },
    beforeDelete: {
      blockDeleteWithOpenBusiness: AccountHooks.blockDeleteWithOpenBusiness,
    },
  },
  // Contact
  [hookKey('Contact')]: {
    beforeCreate: {
      normalizeEmail: ContactHooks.normalizeEmail,
    },
    customValidate: {
      ensureUniqueEmail: ContactHooks.ensureUniqueEmail,
    },
    afterCreate: {
      enqueueWelcomeSequence: ContactHooks.enqueueWelcomeSequence,
    },
    afterUpdate: {
      syncToMarketingPlatform: ContactHooks.syncToMarketingPlatform,
    },
    beforeRead: {
      enforceFieldLevelSecurity: ContactHooks.enforceFieldLevelSecurity,
    },
    afterRead: {
      maskPersonalData: ContactHooks.maskPersonalData,
    },
    afterDelete: {
      purgeMarketingConsent: ContactHooks.purgeMarketingConsent,
    },
  },
  // Contract
  [hookKey('Contract')]: {
    beforeCreate: {
      generateContractNumber: ContractHooks.generateContractNumber,
    },
    customValidate: {
      ensureTermMatchesDates: ContractHooks.ensureTermMatchesDates,
    },
    afterCreate: {
      notifyFinanceOfNewContract: ContractHooks.notifyFinanceOfNewContract,
    },
    afterUpdate: {
      scheduleRenewalReminders: ContractHooks.scheduleRenewalReminders,
    },
  },
  // Lead
  [hookKey('Lead')]: {
    beforeCreate: {
      stampLeadSource: LeadHooks.stampLeadSource,
    },
    customValidate: {
      requireContactChannel: LeadHooks.requireContactChannel,
    },
    afterCreate: {
      notifyOwnerOfNewLead: LeadHooks.notifyOwnerOfNewLead,
    },
    beforeQuery: {
      scopeToOwnedLeads: LeadHooks.scopeToOwnedLeads,
    },
    afterQuery: {
      annotateDuplicateLeads: LeadHooks.annotateDuplicateLeads,
    },
  },
  // Opportunity
  [hookKey('Opportunity')]: {
    beforeUpdate: {
      snapshotStageChange: OpportunityHooks.snapshotStageChange,
    },
    customValidate: {
      requireLossReasonOnLoss: OpportunityHooks.requireLossReasonOnLoss,
    },
    afterCreate: {
      notifySellingTeam: OpportunityHooks.notifySellingTeam,
    },
    afterUpdate: {
      recalculateAccountPipeline: OpportunityHooks.recalculateAccountPipeline,
    },
  },
  // Quote
  [hookKey('Quote')]: {
    beforeCreate: {
      generateQuoteNumber: QuoteHooks.generateQuoteNumber,
    },
    beforeUpdate: {
      recalculateQuoteTotals: QuoteHooks.recalculateQuoteTotals,
    },
    customValidate: {
      enforceDiscountCeiling: QuoteHooks.enforceDiscountCeiling,
    },
    afterUpdate: {
      regenerateQuoteDocument: QuoteHooks.regenerateQuoteDocument,
    },
  },
  // SupportCase
  [hookKey('SupportCase')]: {
    beforeCreate: {
      assignCaseNumber: SupportCaseHooks.assignCaseNumber,
      stampSlaTargets: SupportCaseHooks.stampSlaTargets,
    },
    beforeUpdate: {
      captureFirstResponse: SupportCaseHooks.captureFirstResponse,
    },
    afterCreate: {
      acknowledgeCustomer: SupportCaseHooks.acknowledgeCustomer,
    },
    afterUpdate: {
      recomputeSlaBreach: SupportCaseHooks.recomputeSlaBreach,
    },
    beforeDelete: {
      blockDeleteOfOpenCase: SupportCaseHooks.blockDeleteOfOpenCase,
    },
    afterDelete: {
      archiveCaseTranscript: SupportCaseHooks.archiveCaseTranscript,
    },
  },
};
