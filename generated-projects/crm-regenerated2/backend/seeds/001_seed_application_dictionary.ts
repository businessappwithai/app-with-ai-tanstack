/**
 * Application Dictionary Seed
 * Registers business entity metadata
 *
 * Generated: 2026-05-16T05:41:32.600Z
 */

import { Kysely } from 'kysely';
import { randomUUID } from 'crypto';

export async function seed(db: Kysely<any>): Promise<void> {
  // Register String reference type (if not exists)
  const stringRef = await db
    .selectFrom('sys_reference' as any)
    .where('name' as any, '=', 'String')
    .selectAll()
    .executeTakeFirst();

  const stringRefId = stringRef ? (stringRef as any).sys_reference_id : 1;

  if (!stringRef) {
    await db
      .insertInto('sys_reference' as any)
      .values({
        sys_reference_id: stringRefId,
        name: 'String',
        validation_type: 'S',
        entity_type: 'U',
        is_active: true,
        created_by: 'system',
        updated_by: 'system',
      } as any)
      .execute();
  }

  // Register UUID reference type
  const uuidRef = await db
    .selectFrom('sys_reference' as any)
    .where('name' as any, '=', 'UUID')
    .selectAll()
    .executeTakeFirst();

  const uuidRefId = uuidRef ? (uuidRef as any).sys_reference_id : 2;

  if (!uuidRef) {
    await db
      .insertInto('sys_reference' as any)
      .values({
        sys_reference_id: uuidRefId,
        name: 'UUID',
        validation_type: 'S',
        entity_type: 'U',
        is_active: true,
        created_by: 'system',
        updated_by: 'system',
      } as any)
      .execute();
  }

  // Register Integer reference type
  const intRef = await db
    .selectFrom('sys_reference' as any)
    .where('name' as any, '=', 'Integer')
    .selectAll()
    .executeTakeFirst();

  const intRefId = intRef ? (intRef as any).sys_reference_id : 3;

  if (!intRef) {
    await db
      .insertInto('sys_reference' as any)
      .values({
        sys_reference_id: intRefId,
        name: 'Integer',
        validation_type: 'S',
        entity_type: 'U',
        is_active: true,
        created_by: 'system',
        updated_by: 'system',
      } as any)
      .execute();
  }

  // Register Decimal reference type
  const decimalRef = await db
    .selectFrom('sys_reference' as any)
    .where('name' as any, '=', 'Decimal')
    .selectAll()
    .executeTakeFirst();

  const decimalRefId = decimalRef ? (decimalRef as any).sys_reference_id : 4;

  if (!decimalRef) {
    await db
      .insertInto('sys_reference' as any)
      .values({
        sys_reference_id: decimalRefId,
        name: 'Decimal',
        validation_type: 'S',
        entity_type: 'U',
        is_active: true,
        created_by: 'system',
        updated_by: 'system',
      } as any)
      .execute();
  }

  // Entity definitions
  const entities = [
    {
      table_name: 'bus_contact',
      name: 'Contact',
      description: 'CRM Contact entity',
      columns: [
        { column_name: 'id', name: 'ID', ref_id: uuidRefId, is_key: true, is_mandatory: true },
        { column_name: 'company_id', name: 'Company ID', ref_id: stringRefId },
        { column_name: 'first_name', name: 'First Name', ref_id: stringRefId, is_mandatory: true },
        { column_name: 'last_name', name: 'Last Name', ref_id: stringRefId, is_mandatory: true },
        { column_name: 'email', name: 'Email', ref_id: stringRefId, is_mandatory: true },
        { column_name: 'phone', name: 'Phone', ref_id: stringRefId },
        { column_name: 'mobile', name: 'Mobile', ref_id: stringRefId },
        { column_name: 'job_title', name: 'Job Title', ref_id: stringRefId },
        { column_name: 'department', name: 'Department', ref_id: stringRefId },
        { column_name: 'status', name: 'Status', ref_id: stringRefId, is_mandatory: true },
        { column_name: 'lead_source', name: 'Lead Source', ref_id: stringRefId },
        { column_name: 'owner_id', name: 'Owner ID', ref_id: stringRefId, is_mandatory: true },
        { column_name: 'created_at', name: 'Created At', ref_id: stringRefId },
        { column_name: 'updated_at', name: 'Updated At', ref_id: stringRefId },
        { column_name: 'deleted_at', name: 'Deleted At', ref_id: stringRefId },
        { column_name: 'version', name: 'Version', ref_id: intRefId },
      ],
    },
    {
      table_name: 'bus_company',
      name: 'Company',
      description: 'CRM Company entity',
      columns: [
        { column_name: 'id', name: 'ID', ref_id: uuidRefId, is_key: true, is_mandatory: true },
        { column_name: 'name', name: 'Name', ref_id: stringRefId, is_mandatory: true },
        { column_name: 'industry', name: 'Industry', ref_id: stringRefId },
        { column_name: 'website', name: 'Website', ref_id: stringRefId },
        { column_name: 'phone', name: 'Phone', ref_id: stringRefId },
        { column_name: 'email', name: 'Email', ref_id: stringRefId },
        { column_name: 'employee_count', name: 'Employee Count', ref_id: intRefId },
        { column_name: 'annual_revenue', name: 'Annual Revenue', ref_id: decimalRefId },
        { column_name: 'status', name: 'Status', ref_id: stringRefId, is_mandatory: true },
        { column_name: 'owner_id', name: 'Owner ID', ref_id: stringRefId, is_mandatory: true },
        { column_name: 'created_at', name: 'Created At', ref_id: stringRefId },
        { column_name: 'updated_at', name: 'Updated At', ref_id: stringRefId },
        { column_name: 'deleted_at', name: 'Deleted At', ref_id: stringRefId },
        { column_name: 'version', name: 'Version', ref_id: intRefId },
      ],
    },
    {
      table_name: 'bus_deal',
      name: 'Deal',
      description: 'CRM Deal entity',
      columns: [
        { column_name: 'id', name: 'ID', ref_id: uuidRefId, is_key: true, is_mandatory: true },
        { column_name: 'company_id', name: 'Company ID', ref_id: stringRefId },
        { column_name: 'contact_id', name: 'Contact ID', ref_id: stringRefId },
        { column_name: 'name', name: 'Name', ref_id: stringRefId, is_mandatory: true },
        { column_name: 'amount', name: 'Amount', ref_id: decimalRefId },
        { column_name: 'currency', name: 'Currency', ref_id: stringRefId, is_mandatory: true },
        { column_name: 'stage', name: 'Stage', ref_id: stringRefId, is_mandatory: true },
        { column_name: 'probability', name: 'Probability', ref_id: intRefId },
        { column_name: 'expected_close_date', name: 'Expected Close Date', ref_id: stringRefId },
        { column_name: 'actual_close_date', name: 'Actual Close Date', ref_id: stringRefId },
        { column_name: 'status', name: 'Status', ref_id: stringRefId, is_mandatory: true },
        { column_name: 'description', name: 'Description', ref_id: stringRefId },
        { column_name: 'owner_id', name: 'Owner ID', ref_id: stringRefId, is_mandatory: true },
        { column_name: 'created_at', name: 'Created At', ref_id: stringRefId },
        { column_name: 'updated_at', name: 'Updated At', ref_id: stringRefId },
        { column_name: 'deleted_at', name: 'Deleted At', ref_id: stringRefId },
        { column_name: 'version', name: 'Version', ref_id: intRefId },
      ],
    },
    {
      table_name: 'bus_activity',
      name: 'Activity',
      description: 'CRM Activity entity',
      columns: [
        { column_name: 'id', name: 'ID', ref_id: uuidRefId, is_key: true, is_mandatory: true },
        { column_name: 'contact_id', name: 'Contact ID', ref_id: stringRefId },
        { column_name: 'company_id', name: 'Company ID', ref_id: stringRefId },
        { column_name: 'deal_id', name: 'Deal ID', ref_id: stringRefId },
        { column_name: 'activity_type', name: 'Activity Type', ref_id: stringRefId, is_mandatory: true },
        { column_name: 'subject', name: 'Subject', ref_id: stringRefId, is_mandatory: true },
        { column_name: 'description', name: 'Description', ref_id: stringRefId },
        { column_name: 'scheduled_at', name: 'Scheduled At', ref_id: stringRefId },
        { column_name: 'completed_at', name: 'Completed At', ref_id: stringRefId },
        { column_name: 'duration_minutes', name: 'Duration (minutes)', ref_id: intRefId },
        { column_name: 'status', name: 'Status', ref_id: stringRefId, is_mandatory: true },
        { column_name: 'owner_id', name: 'Owner ID', ref_id: stringRefId, is_mandatory: true },
        { column_name: 'created_at', name: 'Created At', ref_id: stringRefId },
        { column_name: 'updated_at', name: 'Updated At', ref_id: stringRefId },
        { column_name: 'deleted_at', name: 'Deleted At', ref_id: stringRefId },
        { column_name: 'version', name: 'Version', ref_id: intRefId },
      ],
    },
  ];

  // Seed entities
  for (const entityDef of entities) {
    const tableId = randomUUID();

    try {
      // Check if table already exists
      const existingTable = await db
        .selectFrom('sys_table' as any)
        .where('table_name' as any, '=', entityDef.table_name)
        .selectAll()
        .executeTakeFirst();

      if (existingTable) {
        console.log(`Table ${entityDef.table_name} already exists in Application Dictionary, skipping...`);
        continue;
      }

      // Create table entry
      await db
        .insertInto('sys_table' as any)
        .values({
          sys_table_id: tableId,
          table_name: entityDef.table_name,
          name: entityDef.name,
          description: entityDef.description,
          icon: 'Table',
          access_level: 'A',
          is_view: false,
          is_document: false,
          is_high_volume: false,
          is_changelog: true,
          entity_type: 'U',
          is_active: true,
          created_by: 'system',
          updated_by: 'system',
        } as any)
        .execute();

      console.log(`✓ Created sys_table entry for ${entityDef.table_name}`);

      // Create column entries
      let seqNo = 10;
      for (const col of entityDef.columns) {
        try {
          await db
            .insertInto('sys_column' as any)
            .values({
              sys_column_id: randomUUID(),
              sys_table_id: tableId,
              column_name: col.column_name,
              name: col.name,
              sys_reference_id: col.ref_id,
              is_key: col.is_key ?? false,
              is_mandatory: col.is_mandatory ?? false,
              is_updateable: true,
              is_identifier: col.column_name === 'name' || col.column_name === 'id',
              is_selection_column: false,
              is_translated: false,
              is_encrypted: false,
              is_allow_logging: true,
              is_allow_copy: true,
              seq_no: seqNo,
              entity_type: 'U',
              is_active: true,
              created_by: 'system',
              updated_by: 'system',
            } as any)
            .execute();
        } catch (colError) {
          console.error(`✗ Failed to seed column ${col.column_name} for ${entityDef.table_name}:`, colError);
        }

        seqNo += 10;
      }

      console.log(`✓ Seeded entity: ${entityDef.table_name}`);
    } catch (error) {
      console.error(`✗ Failed to seed entity ${entityDef.table_name}:`, error);
    }
  }
}
