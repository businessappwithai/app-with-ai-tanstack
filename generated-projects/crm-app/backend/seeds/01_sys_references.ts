/**
 * System Reference Types Seed
 *
 * Generated: 2026-05-12T11:38:40.033Z
 */

import { Kysely } from 'kysely';
import { v4 as uuidv4 } from 'uuid';

export async function seed(db: Kysely<any>): Promise<void> {
  const now = new Date();

  const references = [
    { sys_reference_id: 10, name: 'String', description: 'Variable length string', reference_type: 'S' },
    { sys_reference_id: 11, name: 'Integer', description: 'Whole number', reference_type: 'S' },
    { sys_reference_id: 12, name: 'Amount', description: 'Decimal number for amounts', reference_type: 'S' },
    { sys_reference_id: 13, name: 'ID', description: 'Unique identifier (UUID)', reference_type: 'S' },
    { sys_reference_id: 14, name: 'Text', description: 'Long text/memo field', reference_type: 'S' },
    { sys_reference_id: 15, name: 'Date', description: 'Date only', reference_type: 'S' },
    { sys_reference_id: 16, name: 'DateTime', description: 'Date and time', reference_type: 'S' },
    { sys_reference_id: 17, name: 'List', description: 'Dropdown list from sys_ref_list', reference_type: 'L' },
    { sys_reference_id: 18, name: 'Table', description: 'Reference to another table', reference_type: 'T' },
    { sys_reference_id: 19, name: 'Table Direct', description: 'Direct reference using column name', reference_type: 'T' },
    { sys_reference_id: 20, name: 'Yes-No', description: 'Boolean yes/no', reference_type: 'S' },
    { sys_reference_id: 24, name: 'URL', description: 'Web URL', reference_type: 'S' },
    { sys_reference_id: 28, name: 'JSON', description: 'JSON data', reference_type: 'S' },
    { sys_reference_id: 30, name: 'Email', description: 'Email address', reference_type: 'S' },
    { sys_reference_id: 31, name: 'Phone', description: 'Phone number', reference_type: 'S' },
  ];

  for (const ref of references) {
    await db.insertInto('sys_reference')
      .values({ ...ref, is_active: true, created_at: now, updated_at: now })
      .onConflict((oc) => oc.column('sys_reference_id').doNothing())
      .execute();
  }

  const refLists = [
    { sys_reference_id: 100, value: 'S', name: 'System Only' },
    { sys_reference_id: 100, value: 'C', name: 'Client' },
    { sys_reference_id: 100, value: 'O', name: 'Organization' },
    { sys_reference_id: 101, value: 'M', name: 'Maintain' },
    { sys_reference_id: 101, value: 'T', name: 'Transaction' },
    { sys_reference_id: 101, value: 'Q', name: 'Query' },
  ];

  for (const ref of refLists) {
    await db.insertInto('sys_ref_list')
      .values({ sys_ref_list_id: uuidv4(), ...ref, is_active: true, created_at: now, updated_at: now })
      .onConflict((oc) => oc.doNothing())
      .execute();
  }

  console.log(`✓ Seeded ${references.length} sys_reference types`);
}
