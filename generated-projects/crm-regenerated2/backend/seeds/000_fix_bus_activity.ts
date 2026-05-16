/**
 * Fix seed: remove wrong bus_activity columns so 001 seed can re-insert correctly.
 * The original seed had wrong column names (entity_name, entity_id, title, scheduled_date,
 * completed_date) that don't exist in the actual bus_activity DB table.
 */

import { Kysely } from 'kysely';

export async function seed(db: Kysely<any>): Promise<void> {
  const activityTable = await db
    .selectFrom('sys_table' as any)
    .where('table_name' as any, '=', 'bus_activity')
    .selectAll()
    .executeTakeFirst();

  if (!activityTable) {
    console.log('bus_activity not in sys_table yet — nothing to fix');
    return;
  }

  const tableId = (activityTable as any).sys_table_id;

  // Delete existing sys_field rows first (FK to sys_column)
  await db
    .deleteFrom('sys_field' as any)
    .where(
      'sys_column_id' as any,
      'in',
      db
        .selectFrom('sys_column' as any)
        .select('sys_column_id' as any)
        .where('sys_table_id' as any, '=', tableId),
    )
    .execute()
    .catch(() => {
      // sys_field may not have rows — ignore
    });

  // Delete wrong sys_column entries
  const deleted = await db
    .deleteFrom('sys_column' as any)
    .where('sys_table_id' as any, '=', tableId)
    .executeTakeFirst();

  console.log(`✓ Deleted ${(deleted as any)?.numDeletedRows ?? '?'} wrong sys_column rows for bus_activity`);

  // Delete the sys_table entry so 001 seed re-creates it
  await db
    .deleteFrom('sys_table' as any)
    .where('sys_table_id' as any, '=', tableId)
    .execute();

  console.log('✓ Removed bus_activity from sys_table — will be re-seeded by 001 seed');
}
