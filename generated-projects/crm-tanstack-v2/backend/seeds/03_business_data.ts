/**
 * Business Data Seed
 * Sample records for each business entity for E2E testing
 *
 * Generated: 2026-05-15T16:06:25.864Z
 */

import { Kysely } from 'kysely';
import { v4 as uuidv4 } from 'uuid';

export async function seed(db: Kysely<any>): Promise<void> {
  const now = new Date();

  // Account (bus_account)
  await db.deleteFrom('bus_account').execute();

  const aCCOUNTRecords = [
    {
      id: uuidv4(),
        name: 'Test Account 0',
        
        
        
        
        email: 'test0@example.com',
        
        
        
        
        phone: 'Sample phone 0',
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: uuidv4(),
        name: 'Test Account 1',
        
        
        
        
        email: 'test1@example.com',
        
        
        
        
        phone: 'Sample phone 1',
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: uuidv4(),
        name: 'Test Account 2',
        
        
        
        
        email: 'test2@example.com',
        
        
        
        
        phone: 'Sample phone 2',
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: uuidv4(),
        name: 'Test Account 3',
        
        
        
        
        email: 'test3@example.com',
        
        
        
        
        phone: 'Sample phone 3',
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  ];

  await db.insertInto('bus_account').values(aCCOUNTRecords).execute();

  // Contact (bus_contact)
  await db.deleteFrom('bus_contact').execute();

  const cONTACTRecords = [
    {
      id: uuidv4(),
        first_name: 'Sample first_name 0',
        
        
        
        
        last_name: 'Sample last_name 0',
        
        
        
        
        email: 'test0@example.com',
        
        
        
        
        phone: 'Sample phone 0',
        
        
        
        
        
        account_id: 0,
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: uuidv4(),
        first_name: 'Sample first_name 1',
        
        
        
        
        last_name: 'Sample last_name 1',
        
        
        
        
        email: 'test1@example.com',
        
        
        
        
        phone: 'Sample phone 1',
        
        
        
        
        
        account_id: 1,
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: uuidv4(),
        first_name: 'Sample first_name 2',
        
        
        
        
        last_name: 'Sample last_name 2',
        
        
        
        
        email: 'test2@example.com',
        
        
        
        
        phone: 'Sample phone 2',
        
        
        
        
        
        account_id: 2,
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: uuidv4(),
        first_name: 'Sample first_name 3',
        
        
        
        
        last_name: 'Sample last_name 3',
        
        
        
        
        email: 'test3@example.com',
        
        
        
        
        phone: 'Sample phone 3',
        
        
        
        
        
        account_id: 3,
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  ];

  await db.insertInto('bus_contact').values(cONTACTRecords).execute();

  // Opportunity (bus_opportunity)
  await db.deleteFrom('bus_opportunity').execute();

  const oPPORTUNITYRecords = [
    {
      id: uuidv4(),
        name: 'Test Opportunity 0',
        
        
        
        
        
        
        amount: 0.50,
        
        
        stage: 'Sample stage 0',
        
        
        
        
        
        account_id: 0,
        
        
        
        
        
        
        
        close_date: 'value-0',
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: uuidv4(),
        name: 'Test Opportunity 1',
        
        
        
        
        
        
        amount: 1.50,
        
        
        stage: 'Sample stage 1',
        
        
        
        
        
        account_id: 1,
        
        
        
        
        
        
        
        close_date: 'value-1',
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: uuidv4(),
        name: 'Test Opportunity 2',
        
        
        
        
        
        
        amount: 2.50,
        
        
        stage: 'Sample stage 2',
        
        
        
        
        
        account_id: 2,
        
        
        
        
        
        
        
        close_date: 'value-2',
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: uuidv4(),
        name: 'Test Opportunity 3',
        
        
        
        
        
        
        amount: 3.50,
        
        
        stage: 'Sample stage 3',
        
        
        
        
        
        account_id: 3,
        
        
        
        
        
        
        
        close_date: 'value-3',
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  ];

  await db.insertInto('bus_opportunity').values(oPPORTUNITYRecords).execute();

  // Activity (bus_activity)
  await db.deleteFrom('bus_activity').execute();

  const aCTIVITYRecords = [
    {
      id: uuidv4(),
        type: 'Sample type 0',
        
        
        
        
        description: 'Sample description 0',
        
        
        
        
        
        contact_id: 0,
        
        
        
        
        opportunity_id: 0,
        
        
        
        
        
        
        
        activity_date: 'value-0',
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: uuidv4(),
        type: 'Sample type 1',
        
        
        
        
        description: 'Sample description 1',
        
        
        
        
        
        contact_id: 1,
        
        
        
        
        opportunity_id: 1,
        
        
        
        
        
        
        
        activity_date: 'value-1',
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: uuidv4(),
        type: 'Sample type 2',
        
        
        
        
        description: 'Sample description 2',
        
        
        
        
        
        contact_id: 2,
        
        
        
        
        opportunity_id: 2,
        
        
        
        
        
        
        
        activity_date: 'value-2',
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: uuidv4(),
        type: 'Sample type 3',
        
        
        
        
        description: 'Sample description 3',
        
        
        
        
        
        contact_id: 3,
        
        
        
        
        opportunity_id: 3,
        
        
        
        
        
        
        
        activity_date: 'value-3',
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  ];

  await db.insertInto('bus_activity').values(aCTIVITYRecords).execute();


  console.log('✓ Business sample data seeded');
}
