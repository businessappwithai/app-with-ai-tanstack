import { z } from 'zod';

export const CreateRuleSchema = z.object({
  entityName: z.string().min(1),
  ruleName: z.string().min(1),
  operation: z.enum(['CREATE', 'READ', 'UPDATE', 'DELETE', 'ALL']),
  jdmContent: z.string(),
});

export type CreateRuleDto = z.infer<typeof CreateRuleSchema>;

export const UpdateRuleSchema = z.object({
  jdmContent: z.string().optional(),
  isActive: z.boolean().optional(),
});

export type UpdateRuleDto = z.infer<typeof UpdateRuleSchema>;

export const ValidateJdmSchema = z.object({
  jdmContent: z.string(),
});

export type ValidateJdmDto = z.infer<typeof ValidateJdmSchema>;

export const DryRunSchema = z.object({
  ruleId: z.string(),
  testData: z.record(z.string(), z.unknown()),
});

export type DryRunDto = z.infer<typeof DryRunSchema>;

export const EvaluateRulesSchema = z.object({
  entityName: z.string(),
  operation: z.enum(['CREATE', 'READ', 'UPDATE', 'DELETE']),
  data: z.record(z.string(), z.unknown()),
});

export type EvaluateRulesDto = z.infer<typeof EvaluateRulesSchema>;
