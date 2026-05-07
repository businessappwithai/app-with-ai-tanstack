/**
 * System Reference Types Seed
 * Standard reference types following Compiere pattern
 *
 * Generated: 2026-05-07T08:59:26.527Z
 */

import type { Knex } from 'knex';
import { v4 as uuidv4 } from 'uuid';

export async function seed(knex: Knex): Promise<void> {
  const now = new Date();
  const createdBy = '';

  // ============================================================================
  // Standard Reference Types
  // ============================================================================
  const references = [
    // Basic Types
    { sys_reference_id: 10, name: 'String', description: 'Variable length string', validation_type: 'S' },
    { sys_reference_id: 11, name: 'Integer', description: 'Whole number', validation_type: 'S' },
    { sys_reference_id: 12, name: 'Amount', description: 'Decimal number for amounts', validation_type: 'S' },
    { sys_reference_id: 13, name: 'ID', description: 'Unique identifier (UUID)', validation_type: 'S' },
    { sys_reference_id: 14, name: 'Text', description: 'Long text/memo field', validation_type: 'S' },
    { sys_reference_id: 15, name: 'Date', description: 'Date only', validation_type: 'S' },
    { sys_reference_id: 16, name: 'DateTime', description: 'Date and time', validation_type: 'S' },

    // Reference Types
    { sys_reference_id: 17, name: 'List', description: 'Dropdown list from sys_ref_list', validation_type: 'L' },
    { sys_reference_id: 18, name: 'Table', description: 'Reference to another table', validation_type: 'T' },
    { sys_reference_id: 19, name: 'Table Direct', description: 'Direct reference using column name', validation_type: 'T' },

    // Boolean
    { sys_reference_id: 20, name: 'Yes-No', description: 'Boolean yes/no', validation_type: 'S' },

    // Special Types
    { sys_reference_id: 21, name: 'Location', description: 'Location/address reference', validation_type: 'T' },
    { sys_reference_id: 22, name: 'Locator', description: 'Warehouse locator', validation_type: 'T' },
    { sys_reference_id: 23, name: 'Account', description: 'Account reference', validation_type: 'T' },
    { sys_reference_id: 24, name: 'URL', description: 'Web URL', validation_type: 'S', vformat: 'url' },
    { sys_reference_id: 25, name: 'Image', description: 'Image file reference', validation_type: 'S' },
    { sys_reference_id: 26, name: 'File', description: 'File attachment', validation_type: 'S' },
    { sys_reference_id: 27, name: 'Color', description: 'Color picker', validation_type: 'S' },
    { sys_reference_id: 28, name: 'JSON', description: 'JSON data', validation_type: 'S' },
    { sys_reference_id: 29, name: 'Password', description: 'Password (masked)', validation_type: 'S' },
    { sys_reference_id: 30, name: 'Email', description: 'Email address', validation_type: 'S', vformat: 'email' },
    { sys_reference_id: 31, name: 'Phone', description: 'Phone number', validation_type: 'S', vformat: 'phone' },

    // System References
    { sys_reference_id: 100, name: 'Access Level', description: 'System access level', validation_type: 'L' },
    { sys_reference_id: 101, name: 'Window Type', description: 'Window type (M/T/Q)', validation_type: 'L' },
    { sys_reference_id: 102, name: 'Event Type', description: 'Change log event type', validation_type: 'L' },
    { sys_reference_id: 103, name: 'Field Group Type', description: 'Field group type', validation_type: 'L' },
    { sys_reference_id: 104, name: 'Access Type', description: 'Table access type', validation_type: 'L' },
  ];

  await knex('sys_reference')
    .insert(
      references.map(ref => ({
        ...ref,
        entity_type: 'D', // Dictionary entity
        is_active: true,
        created_by: createdBy,
        updated_by: createdBy,
        created_at: now,
        updated_at: now,
      }))
    )
    .onConflict('sys_reference_id')
    .ignore();

  // ============================================================================
  // Reference List Values
  // ============================================================================
  const refLists = [
    // Access Level (100)
    { sys_reference_id: 100, value: 'S', name: 'System Only' },
    { sys_reference_id: 100, value: 'C', name: 'Client' },
    { sys_reference_id: 100, value: 'O', name: 'Organization' },
    { sys_reference_id: 100, value: 'CO', name: 'Client + Organization' },
    { sys_reference_id: 100, value: 'A', name: 'All' },

    // Window Type (101)
    { sys_reference_id: 101, value: 'M', name: 'Maintain' },
    { sys_reference_id: 101, value: 'T', name: 'Transaction' },
    { sys_reference_id: 101, value: 'Q', name: 'Query' },

    // Event Type (102)
    { sys_reference_id: 102, value: 'I', name: 'Insert' },
    { sys_reference_id: 102, value: 'U', name: 'Update' },
    { sys_reference_id: 102, value: 'D', name: 'Delete' },

    // Field Group Type (103)
    { sys_reference_id: 103, value: 'C', name: 'Collapsible' },
    { sys_reference_id: 103, value: 'L', name: 'Label' },
    { sys_reference_id: 103, value: 'T', name: 'Tab' },

    // Access Type (104)
    { sys_reference_id: 104, value: 'R', name: 'Read' },
    { sys_reference_id: 104, value: 'W', name: 'Write' },
    { sys_reference_id: 104, value: 'N', name: 'None' },
  ];

  await knex('sys_ref_list')
    .insert(
      refLists.map(ref => ({
        sys_ref_list_id: uuidv4(),
        ...ref,
        entity_type: 'D',
        is_active: true,
        created_by: createdBy,
        updated_by: createdBy,
        created_at: now,
        updated_at: now,
      }))
    )
    .onConflict(['sys_reference_id', 'value'])
    .ignore();

  console.log('✓ Seeded sys_reference with', references.length, 'types');
  console.log('✓ Seeded sys_ref_list with', refLists.length, 'values');
}
