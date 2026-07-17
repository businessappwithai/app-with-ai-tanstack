import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Kysely, sql } from 'kysely';
import { InjectDatabase } from '../../database/database.service.decorator';

export type WorkflowDefinitionDto = {
  name: string;
  entityName: string;
  operation: 'CREATE' | 'UPDATE' | 'DELETE' | 'ALL';
  bpmnXml: string;
  description?: string;
  isActive?: boolean;
};

@Injectable()
export class WorkflowDefinitionsService {
  constructor(@InjectDatabase() private readonly db: Kysely<any>) {}

  async findAll(filters?: { entityName?: string; operation?: string; isActive?: boolean }) {
    let query = this.db.selectFrom('sys_workflow_definitions').selectAll();
    if (filters?.entityName) query = query.where('entity_name', '=', filters.entityName);
    if (filters?.operation) query = query.where('operation', '=', filters.operation);
    if (filters?.isActive !== undefined) query = query.where('is_active', '=', filters.isActive);
    return query.orderBy('created_at', 'desc').execute();
  }

  async findOne(id: string) {
    const def = await this.db
      .selectFrom('sys_workflow_definitions')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
    if (!def) throw new NotFoundException(`Workflow definition ${id} not found`);
    return def;
  }

  async findActiveForEntity(entityName: string, operation: string) {
    // Match definitions stored under either the singular base name (e.g. 'account')
    // or the full bus_ table name (e.g. 'bus_account').
    const candidates = Array.from(new Set([entityName, `bus_${entityName}`]))
      .map((n) => n.toLowerCase());
    return this.db
      .selectFrom('sys_workflow_definitions')
      .selectAll()
      .where((eb) =>
        eb.or(candidates.map((c) => eb(sql<string>`lower(entity_name)`, '=', c))),
      )
      .where((eb) =>
        eb.or([
          eb('operation', '=', operation.toUpperCase()),
          eb('operation', '=', 'ALL'),
        ]),
      )
      .where('is_active', '=', true)
      .orderBy('created_at', 'asc')
      .execute();
  }

  async create(dto: WorkflowDefinitionDto, userId?: string) {
    if (!dto.bpmnXml?.trim()) throw new BadRequestException('bpmnXml is required');
    if (!dto.bpmnXml.includes('<bpmn:')) throw new BadRequestException('Invalid BPMN XML');

    const [result] = await this.db
      .insertInto('sys_workflow_definitions')
      .values({
        name: dto.name,
        entity_name: dto.entityName,
        operation: dto.operation ?? 'ALL',
        bpmn_xml: dto.bpmnXml,
        description: dto.description ?? null,
        is_active: dto.isActive ?? true,
        created_by: userId ?? null,
      } as any)
      .returningAll()
      .execute();
    return result;
  }

  async update(id: string, dto: Partial<WorkflowDefinitionDto>) {
    await this.findOne(id);
    const updates: Record<string, unknown> = { updated_at: new Date() };
    if (dto.name !== undefined) updates.name = dto.name;
    if (dto.entityName !== undefined) updates.entity_name = dto.entityName;
    if (dto.operation !== undefined) updates.operation = dto.operation;
    if (dto.bpmnXml !== undefined) updates.bpmn_xml = dto.bpmnXml;
    if (dto.description !== undefined) updates.description = dto.description;
    if (dto.isActive !== undefined) updates.is_active = dto.isActive;

    const [result] = await this.db
      .updateTable('sys_workflow_definitions')
      .set(updates as any)
      .where('id', '=', id)
      .returningAll()
      .execute();
    return result;
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.db
      .deleteFrom('sys_workflow_definitions')
      .where('id', '=', id)
      .execute();
    return { deleted: true };
  }
}
