/**
 * System Reference Types Seed
 *
 * Generated: 2026-05-31T11:58:03.783Z
 */

import { Kysely } from 'kysely';
import { v4 as uuidv4 } from 'uuid';

export async function seed(db: Kysely<any>): Promise<void> {
  const now = new Date();
  const createdBy = 'system';

  const references = [
    { sys_reference_id: 10, name: 'String', description: 'Variable length string', validation_type: 'S' },
    { sys_reference_id: 11, name: 'Integer', description: 'Whole number', validation_type: 'S' },
    { sys_reference_id: 12, name: 'Amount', description: 'Decimal number for amounts', validation_type: 'S' },
    { sys_reference_id: 13, name: 'ID', description: 'Unique identifier (UUID)', validation_type: 'S' },
    { sys_reference_id: 14, name: 'Text', description: 'Long text/memo field', validation_type: 'S' },
    { sys_reference_id: 15, name: 'Date', description: 'Date only', validation_type: 'S' },
    { sys_reference_id: 16, name: 'DateTime', description: 'Date and time', validation_type: 'S' },
    { sys_reference_id: 17, name: 'List', description: 'Dropdown list from sys_ref_list', validation_type: 'L' },
    { sys_reference_id: 18, name: 'Table', description: 'Reference to another table', validation_type: 'T' },
    { sys_reference_id: 19, name: 'Table Direct', description: 'Direct reference using column name', validation_type: 'T' },
    { sys_reference_id: 20, name: 'Yes-No', description: 'Boolean yes/no', validation_type: 'S' },
    { sys_reference_id: 24, name: 'URL', description: 'Web URL', validation_type: 'S' },
    { sys_reference_id: 28, name: 'JSON', description: 'JSON data', validation_type: 'S' },
    { sys_reference_id: 30, name: 'Email', description: 'Email address', validation_type: 'S' },
    { sys_reference_id: 31, name: 'Phone', description: 'Phone number', validation_type: 'S' },
    { sys_reference_id: 100, name: 'EntityType', description: 'Entity type classification', validation_type: 'L' },
    { sys_reference_id: 101, name: 'AccessLevel', description: 'Access level for windows and tables', validation_type: 'L' },
  ];

  for (const ref of references) {
    await db.insertInto('sys_reference')
      .values({ ...ref, entity_type: 'S', is_active: true, created_by: createdBy, updated_by: createdBy, created_at: now, updated_at: now })
      .onConflict((oc) => oc.column('sys_reference_id').doNothing())
      .execute();
  }

  const refLists = [
    { sys_reference_id: 100, value: 'S', name: 'System Only' },
    { sys_reference_id: 100, value: 'C', name: 'Client' },
    { sys_reference_id: 100, value: 'O', name: 'Organization' },
    { sys_reference_id: 100, value: 'U', name: 'User Maintained' },
    { sys_reference_id: 101, value: 'M', name: 'Maintain' },
    { sys_reference_id: 101, value: 'T', name: 'Transaction' },
    { sys_reference_id: 101, value: 'Q', name: 'Query' },
    { sys_reference_id: 101, value: 'A', name: 'Admin Only' },
  ];

  for (const ref of refLists) {
    await db.insertInto('sys_ref_list')
      .values({ sys_ref_list_id: uuidv4(), ...ref, entity_type: 'S', is_active: true, created_by: createdBy, updated_by: createdBy, created_at: now, updated_at: now })
      .onConflict((oc) => oc.doNothing())
      .execute();
  }

  console.log(`✓ Seeded ${references.length} sys_reference types`);
}
