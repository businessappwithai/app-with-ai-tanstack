/**
 * Business Data Seed
 * Sample records for each business entity for E2E testing
 *
 * Generated: 2026-05-31T11:58:03.804Z
 */

import { Kysely, sql } from 'kysely';
import { v4 as uuidv4 } from 'uuid';

export async function seed(db: Kysely<any>): Promise<void> {
  const now = new Date();

  // Disable FK constraint checking during bulk seed to allow any insertion order
  await sql`SET session_replication_role = replica`.execute(db);

  // Company (bus_company)
  await db.deleteFrom('bus_company').execute();

  const companyRecords = [
    {
      id: uuidv4(),
        name: 'Test Company 0',
        
        
        
        
        
        
        
        
        industry: 'Sample industry 0',
        
        
        
        
        
        
        
        
        website: 'Sample website 0',
        
        
        
        
        
        
        
        
        phone: 'Sample phone 0',
        
        
        
        
        
        
        
        
        email: 'test0@example.com',
        
        
        
        
        
        
        
        
        
        employee_count: 0,
        
        
        
        
        
        
        
        
        
        annual_revenue: 0.50,
        
        
        
        
        
        
        status: 'Sample status 0',
        
        
        
        
        
        
        
        
        owner_id: uuidv4(),
        
        
        
        
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: uuidv4(),
        name: 'Test Company 1',
        
        
        
        
        
        
        
        
        industry: 'Sample industry 1',
        
        
        
        
        
        
        
        
        website: 'Sample website 1',
        
        
        
        
        
        
        
        
        phone: 'Sample phone 1',
        
        
        
        
        
        
        
        
        email: 'test1@example.com',
        
        
        
        
        
        
        
        
        
        employee_count: 1,
        
        
        
        
        
        
        
        
        
        annual_revenue: 1.50,
        
        
        
        
        
        
        status: 'Sample status 1',
        
        
        
        
        
        
        
        
        owner_id: uuidv4(),
        
        
        
        
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: uuidv4(),
        name: 'Test Company 2',
        
        
        
        
        
        
        
        
        industry: 'Sample industry 2',
        
        
        
        
        
        
        
        
        website: 'Sample website 2',
        
        
        
        
        
        
        
        
        phone: 'Sample phone 2',
        
        
        
        
        
        
        
        
        email: 'test2@example.com',
        
        
        
        
        
        
        
        
        
        employee_count: 2,
        
        
        
        
        
        
        
        
        
        annual_revenue: 2.50,
        
        
        
        
        
        
        status: 'Sample status 2',
        
        
        
        
        
        
        
        
        owner_id: uuidv4(),
        
        
        
        
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: uuidv4(),
        name: 'Test Company 3',
        
        
        
        
        
        
        
        
        industry: 'Sample industry 3',
        
        
        
        
        
        
        
        
        website: 'Sample website 3',
        
        
        
        
        
        
        
        
        phone: 'Sample phone 3',
        
        
        
        
        
        
        
        
        email: 'test3@example.com',
        
        
        
        
        
        
        
        
        
        employee_count: 3,
        
        
        
        
        
        
        
        
        
        annual_revenue: 3.50,
        
        
        
        
        
        
        status: 'Sample status 3',
        
        
        
        
        
        
        
        
        owner_id: uuidv4(),
        
        
        
        
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  ];

  await db.insertInto('bus_company').values(companyRecords).execute();

  // Contact (bus_contact)
  await db.deleteFrom('bus_contact').execute();

  const contactRecords = [
    {
      id: uuidv4(),
        company_id: uuidv4(),
        
        
        
        
        
        
        
        
        first_name: 'Sample first_name 0',
        
        
        
        
        
        
        
        
        last_name: 'Sample last_name 0',
        
        
        
        
        
        
        
        
        email: 'test0@example.com',
        
        
        
        
        
        
        
        
        phone: 'Sample phone 0',
        
        
        
        
        
        
        
        
        mobile: 'Sample mobile 0',
        
        
        
        
        
        
        
        
        job_title: 'Sample job_title 0',
        
        
        
        
        
        
        
        
        department: 'Sample department 0',
        
        
        
        
        
        
        
        
        status: 'Sample status 0',
        
        
        
        
        
        
        
        
        lead_source: 'Sample lead_source 0',
        
        
        
        
        
        
        
        
        owner_id: uuidv4(),
        
        
        
        
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: uuidv4(),
        company_id: uuidv4(),
        
        
        
        
        
        
        
        
        first_name: 'Sample first_name 1',
        
        
        
        
        
        
        
        
        last_name: 'Sample last_name 1',
        
        
        
        
        
        
        
        
        email: 'test1@example.com',
        
        
        
        
        
        
        
        
        phone: 'Sample phone 1',
        
        
        
        
        
        
        
        
        mobile: 'Sample mobile 1',
        
        
        
        
        
        
        
        
        job_title: 'Sample job_title 1',
        
        
        
        
        
        
        
        
        department: 'Sample department 1',
        
        
        
        
        
        
        
        
        status: 'Sample status 1',
        
        
        
        
        
        
        
        
        lead_source: 'Sample lead_source 1',
        
        
        
        
        
        
        
        
        owner_id: uuidv4(),
        
        
        
        
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: uuidv4(),
        company_id: uuidv4(),
        
        
        
        
        
        
        
        
        first_name: 'Sample first_name 2',
        
        
        
        
        
        
        
        
        last_name: 'Sample last_name 2',
        
        
        
        
        
        
        
        
        email: 'test2@example.com',
        
        
        
        
        
        
        
        
        phone: 'Sample phone 2',
        
        
        
        
        
        
        
        
        mobile: 'Sample mobile 2',
        
        
        
        
        
        
        
        
        job_title: 'Sample job_title 2',
        
        
        
        
        
        
        
        
        department: 'Sample department 2',
        
        
        
        
        
        
        
        
        status: 'Sample status 2',
        
        
        
        
        
        
        
        
        lead_source: 'Sample lead_source 2',
        
        
        
        
        
        
        
        
        owner_id: uuidv4(),
        
        
        
        
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: uuidv4(),
        company_id: uuidv4(),
        
        
        
        
        
        
        
        
        first_name: 'Sample first_name 3',
        
        
        
        
        
        
        
        
        last_name: 'Sample last_name 3',
        
        
        
        
        
        
        
        
        email: 'test3@example.com',
        
        
        
        
        
        
        
        
        phone: 'Sample phone 3',
        
        
        
        
        
        
        
        
        mobile: 'Sample mobile 3',
        
        
        
        
        
        
        
        
        job_title: 'Sample job_title 3',
        
        
        
        
        
        
        
        
        department: 'Sample department 3',
        
        
        
        
        
        
        
        
        status: 'Sample status 3',
        
        
        
        
        
        
        
        
        lead_source: 'Sample lead_source 3',
        
        
        
        
        
        
        
        
        owner_id: uuidv4(),
        
        
        
        
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  ];

  await db.insertInto('bus_contact').values(contactRecords).execute();

  // Deal (bus_deal)
  await db.deleteFrom('bus_deal').execute();

  const dealRecords = [
    {
      id: uuidv4(),
        company_id: uuidv4(),
        
        
        
        
        
        
        
        
        contact_id: uuidv4(),
        
        
        
        
        
        
        
        
        name: 'Test Deal 0',
        
        
        
        
        
        
        
        
        
        
        amount: 0.50,
        
        
        
        
        
        
        currency: 'Sample currency 0',
        
        
        
        
        
        
        
        
        stage: 'Sample stage 0',
        
        
        
        
        
        
        
        
        
        probability: 0,
        
        
        
        
        
        
        
        
        
        
        expected_close_date: new Date(Date.now() + 0 * 86400000),
        
        
        
        
        
        
        
        
        actual_close_date: new Date(Date.now() + 0 * 86400000),
        
        
        
        
        
        status: 'Sample status 0',
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        description: 'Sample description text 0',
        
        owner_id: uuidv4(),
        
        
        
        
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: uuidv4(),
        company_id: uuidv4(),
        
        
        
        
        
        
        
        
        contact_id: uuidv4(),
        
        
        
        
        
        
        
        
        name: 'Test Deal 1',
        
        
        
        
        
        
        
        
        
        
        amount: 1.50,
        
        
        
        
        
        
        currency: 'Sample currency 1',
        
        
        
        
        
        
        
        
        stage: 'Sample stage 1',
        
        
        
        
        
        
        
        
        
        probability: 1,
        
        
        
        
        
        
        
        
        
        
        expected_close_date: new Date(Date.now() + 1 * 86400000),
        
        
        
        
        
        
        
        
        actual_close_date: new Date(Date.now() + 1 * 86400000),
        
        
        
        
        
        status: 'Sample status 1',
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        description: 'Sample description text 1',
        
        owner_id: uuidv4(),
        
        
        
        
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: uuidv4(),
        company_id: uuidv4(),
        
        
        
        
        
        
        
        
        contact_id: uuidv4(),
        
        
        
        
        
        
        
        
        name: 'Test Deal 2',
        
        
        
        
        
        
        
        
        
        
        amount: 2.50,
        
        
        
        
        
        
        currency: 'Sample currency 2',
        
        
        
        
        
        
        
        
        stage: 'Sample stage 2',
        
        
        
        
        
        
        
        
        
        probability: 2,
        
        
        
        
        
        
        
        
        
        
        expected_close_date: new Date(Date.now() + 2 * 86400000),
        
        
        
        
        
        
        
        
        actual_close_date: new Date(Date.now() + 2 * 86400000),
        
        
        
        
        
        status: 'Sample status 2',
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        description: 'Sample description text 2',
        
        owner_id: uuidv4(),
        
        
        
        
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: uuidv4(),
        company_id: uuidv4(),
        
        
        
        
        
        
        
        
        contact_id: uuidv4(),
        
        
        
        
        
        
        
        
        name: 'Test Deal 3',
        
        
        
        
        
        
        
        
        
        
        amount: 3.50,
        
        
        
        
        
        
        currency: 'Sample currency 3',
        
        
        
        
        
        
        
        
        stage: 'Sample stage 3',
        
        
        
        
        
        
        
        
        
        probability: 3,
        
        
        
        
        
        
        
        
        
        
        expected_close_date: new Date(Date.now() + 3 * 86400000),
        
        
        
        
        
        
        
        
        actual_close_date: new Date(Date.now() + 3 * 86400000),
        
        
        
        
        
        status: 'Sample status 3',
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        description: 'Sample description text 3',
        
        owner_id: uuidv4(),
        
        
        
        
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  ];

  await db.insertInto('bus_deal').values(dealRecords).execute();

  // Deal Stage (bus_deal_stage)
  await db.deleteFrom('bus_deal_stage').execute();

  const dealStageRecords = [
    {
      id: uuidv4(),
        pipeline_id: uuidv4(),
        
        
        
        
        
        
        
        
        name: 'Test Deal Stage 0',
        
        
        
        
        
        
        
        
        
        sort_order: 0,
        
        
        
        
        
        
        
        
        default_probability: 0,
        
        
        
        
        
        
        
        
        
        
        
        
        is_won: true,
        
        
        
        
        
        
        
        
        is_lost: true,
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: uuidv4(),
        pipeline_id: uuidv4(),
        
        
        
        
        
        
        
        
        name: 'Test Deal Stage 1',
        
        
        
        
        
        
        
        
        
        sort_order: 1,
        
        
        
        
        
        
        
        
        default_probability: 1,
        
        
        
        
        
        
        
        
        
        
        
        
        is_won: true,
        
        
        
        
        
        
        
        
        is_lost: true,
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: uuidv4(),
        pipeline_id: uuidv4(),
        
        
        
        
        
        
        
        
        name: 'Test Deal Stage 2',
        
        
        
        
        
        
        
        
        
        sort_order: 2,
        
        
        
        
        
        
        
        
        default_probability: 2,
        
        
        
        
        
        
        
        
        
        
        
        
        is_won: false,
        
        
        
        
        
        
        
        
        is_lost: false,
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: uuidv4(),
        pipeline_id: uuidv4(),
        
        
        
        
        
        
        
        
        name: 'Test Deal Stage 3',
        
        
        
        
        
        
        
        
        
        sort_order: 3,
        
        
        
        
        
        
        
        
        default_probability: 3,
        
        
        
        
        
        
        
        
        
        
        
        
        is_won: true,
        
        
        
        
        
        
        
        
        is_lost: true,
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  ];

  await db.insertInto('bus_deal_stage').values(dealStageRecords).execute();

  // Pipeline (bus_pipeline)
  await db.deleteFrom('bus_pipeline').execute();

  const pipelineRecords = [
    {
      id: uuidv4(),
        name: 'Test Pipeline 0',
        
        
        
        
        
        
        
        
        
        
        
        
        
        is_default: true,
        
        
        
        
        
        
        
        
        is_active: true,
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: uuidv4(),
        name: 'Test Pipeline 1',
        
        
        
        
        
        
        
        
        
        
        
        
        
        is_default: true,
        
        
        
        
        
        
        
        
        is_active: true,
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: uuidv4(),
        name: 'Test Pipeline 2',
        
        
        
        
        
        
        
        
        
        
        
        
        
        is_default: false,
        
        
        
        
        
        
        
        
        is_active: false,
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: uuidv4(),
        name: 'Test Pipeline 3',
        
        
        
        
        
        
        
        
        
        
        
        
        
        is_default: true,
        
        
        
        
        
        
        
        
        is_active: true,
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  ];

  await db.insertInto('bus_pipeline').values(pipelineRecords).execute();

  // Activity (bus_activity)
  await db.deleteFrom('bus_activity').execute();

  const activityRecords = [
    {
      id: uuidv4(),
        contact_id: uuidv4(),
        
        
        
        
        
        
        
        
        company_id: uuidv4(),
        
        
        
        
        
        
        
        
        deal_id: uuidv4(),
        
        
        
        
        
        
        
        
        activity_type: 'Sample activity_type 0',
        
        
        
        
        
        
        
        
        subject: 'Sample subject 0',
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        description: 'Sample description text 0',
        
        
        
        
        
        scheduled_at: new Date(Date.now() + 0 * 3600000),
        
        
        
        
        
        
        
        
        completed_at: new Date(Date.now() + 0 * 3600000),
        
        
        
        
        
        duration_minutes: 0,
        
        
        
        
        
        
        
        status: 'Sample status 0',
        
        
        
        
        
        
        
        
        owner_id: uuidv4(),
        
        
        
        
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: uuidv4(),
        contact_id: uuidv4(),
        
        
        
        
        
        
        
        
        company_id: uuidv4(),
        
        
        
        
        
        
        
        
        deal_id: uuidv4(),
        
        
        
        
        
        
        
        
        activity_type: 'Sample activity_type 1',
        
        
        
        
        
        
        
        
        subject: 'Sample subject 1',
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        description: 'Sample description text 1',
        
        
        
        
        
        scheduled_at: new Date(Date.now() + 1 * 3600000),
        
        
        
        
        
        
        
        
        completed_at: new Date(Date.now() + 1 * 3600000),
        
        
        
        
        
        duration_minutes: 1,
        
        
        
        
        
        
        
        status: 'Sample status 1',
        
        
        
        
        
        
        
        
        owner_id: uuidv4(),
        
        
        
        
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: uuidv4(),
        contact_id: uuidv4(),
        
        
        
        
        
        
        
        
        company_id: uuidv4(),
        
        
        
        
        
        
        
        
        deal_id: uuidv4(),
        
        
        
        
        
        
        
        
        activity_type: 'Sample activity_type 2',
        
        
        
        
        
        
        
        
        subject: 'Sample subject 2',
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        description: 'Sample description text 2',
        
        
        
        
        
        scheduled_at: new Date(Date.now() + 2 * 3600000),
        
        
        
        
        
        
        
        
        completed_at: new Date(Date.now() + 2 * 3600000),
        
        
        
        
        
        duration_minutes: 2,
        
        
        
        
        
        
        
        status: 'Sample status 2',
        
        
        
        
        
        
        
        
        owner_id: uuidv4(),
        
        
        
        
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: uuidv4(),
        contact_id: uuidv4(),
        
        
        
        
        
        
        
        
        company_id: uuidv4(),
        
        
        
        
        
        
        
        
        deal_id: uuidv4(),
        
        
        
        
        
        
        
        
        activity_type: 'Sample activity_type 3',
        
        
        
        
        
        
        
        
        subject: 'Sample subject 3',
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        description: 'Sample description text 3',
        
        
        
        
        
        scheduled_at: new Date(Date.now() + 3 * 3600000),
        
        
        
        
        
        
        
        
        completed_at: new Date(Date.now() + 3 * 3600000),
        
        
        
        
        
        duration_minutes: 3,
        
        
        
        
        
        
        
        status: 'Sample status 3',
        
        
        
        
        
        
        
        
        owner_id: uuidv4(),
        
        
        
        
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  ];

  await db.insertInto('bus_activity').values(activityRecords).execute();

  // Note (bus_note)
  await db.deleteFrom('bus_note').execute();

  const noteRecords = [
    {
      id: uuidv4(),
        contact_id: uuidv4(),
        
        
        
        
        
        
        
        
        company_id: uuidv4(),
        
        
        
        
        
        
        
        
        deal_id: uuidv4(),
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        content: 'Sample content text 0',
        
        
        
        
        
        
        is_pinned: true,
        
        
        
        author_id: uuidv4(),
        
        
        
        
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: uuidv4(),
        contact_id: uuidv4(),
        
        
        
        
        
        
        
        
        company_id: uuidv4(),
        
        
        
        
        
        
        
        
        deal_id: uuidv4(),
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        content: 'Sample content text 1',
        
        
        
        
        
        
        is_pinned: true,
        
        
        
        author_id: uuidv4(),
        
        
        
        
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: uuidv4(),
        contact_id: uuidv4(),
        
        
        
        
        
        
        
        
        company_id: uuidv4(),
        
        
        
        
        
        
        
        
        deal_id: uuidv4(),
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        content: 'Sample content text 2',
        
        
        
        
        
        
        is_pinned: false,
        
        
        
        author_id: uuidv4(),
        
        
        
        
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: uuidv4(),
        contact_id: uuidv4(),
        
        
        
        
        
        
        
        
        company_id: uuidv4(),
        
        
        
        
        
        
        
        
        deal_id: uuidv4(),
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        content: 'Sample content text 3',
        
        
        
        
        
        
        is_pinned: true,
        
        
        
        author_id: uuidv4(),
        
        
        
        
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  ];

  await db.insertInto('bus_note').values(noteRecords).execute();

  // Task (bus_task)
  await db.deleteFrom('bus_task').execute();

  const taskRecords = [
    {
      id: uuidv4(),
        contact_id: uuidv4(),
        
        
        
        
        
        
        
        
        company_id: uuidv4(),
        
        
        
        
        
        
        
        
        deal_id: uuidv4(),
        
        
        
        
        
        
        
        
        title: 'Sample title 0',
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        description: 'Sample description text 0',
        
        priority: 'Sample priority 0',
        
        
        
        
        
        
        
        
        status: 'Sample status 0',
        
        
        
        
        
        
        
        
        
        
        
        due_date: new Date(Date.now() + 0 * 86400000),
        
        
        
        
        
        
        
        
        
        completed_at: new Date(Date.now() + 0 * 3600000),
        
        
        
        
        assigned_to: 'Sample assigned_to 0',
        
        
        
        
        
        
        
        
        created_by: 'Sample created_by 0',
        
        
        
        
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: uuidv4(),
        contact_id: uuidv4(),
        
        
        
        
        
        
        
        
        company_id: uuidv4(),
        
        
        
        
        
        
        
        
        deal_id: uuidv4(),
        
        
        
        
        
        
        
        
        title: 'Sample title 1',
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        description: 'Sample description text 1',
        
        priority: 'Sample priority 1',
        
        
        
        
        
        
        
        
        status: 'Sample status 1',
        
        
        
        
        
        
        
        
        
        
        
        due_date: new Date(Date.now() + 1 * 86400000),
        
        
        
        
        
        
        
        
        
        completed_at: new Date(Date.now() + 1 * 3600000),
        
        
        
        
        assigned_to: 'Sample assigned_to 1',
        
        
        
        
        
        
        
        
        created_by: 'Sample created_by 1',
        
        
        
        
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: uuidv4(),
        contact_id: uuidv4(),
        
        
        
        
        
        
        
        
        company_id: uuidv4(),
        
        
        
        
        
        
        
        
        deal_id: uuidv4(),
        
        
        
        
        
        
        
        
        title: 'Sample title 2',
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        description: 'Sample description text 2',
        
        priority: 'Sample priority 2',
        
        
        
        
        
        
        
        
        status: 'Sample status 2',
        
        
        
        
        
        
        
        
        
        
        
        due_date: new Date(Date.now() + 2 * 86400000),
        
        
        
        
        
        
        
        
        
        completed_at: new Date(Date.now() + 2 * 3600000),
        
        
        
        
        assigned_to: 'Sample assigned_to 2',
        
        
        
        
        
        
        
        
        created_by: 'Sample created_by 2',
        
        
        
        
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: uuidv4(),
        contact_id: uuidv4(),
        
        
        
        
        
        
        
        
        company_id: uuidv4(),
        
        
        
        
        
        
        
        
        deal_id: uuidv4(),
        
        
        
        
        
        
        
        
        title: 'Sample title 3',
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        description: 'Sample description text 3',
        
        priority: 'Sample priority 3',
        
        
        
        
        
        
        
        
        status: 'Sample status 3',
        
        
        
        
        
        
        
        
        
        
        
        due_date: new Date(Date.now() + 3 * 86400000),
        
        
        
        
        
        
        
        
        
        completed_at: new Date(Date.now() + 3 * 3600000),
        
        
        
        
        assigned_to: 'Sample assigned_to 3',
        
        
        
        
        
        
        
        
        created_by: 'Sample created_by 3',
        
        
        
        
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  ];

  await db.insertInto('bus_task').values(taskRecords).execute();

  // Email Message (bus_email_message)
  await db.deleteFrom('bus_email_message').execute();

  const emailMessageRecords = [
    {
      id: uuidv4(),
        contact_id: uuidv4(),
        
        
        
        
        
        
        
        
        deal_id: uuidv4(),
        
        
        
        
        
        
        
        
        thread_id: uuidv4(),
        
        
        
        
        
        
        
        
        subject: 'Sample subject 0',
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        body_text: 'Sample body_text text 0',
        
        
        
        
        
        
        
        
        body_html: 'Sample body_html text 0',
        
        direction: 'Sample direction 0',
        
        
        
        
        
        
        
        
        
        
        
        
        sent_at: new Date(Date.now() + 0 * 3600000),
        
        
        
        
        
        
        
        
        received_at: new Date(Date.now() + 0 * 3600000),
        
        
        
        
        
        
        
        
        opened_at: new Date(Date.now() + 0 * 3600000),
        
        
        
        
        
        open_count: 0,
        
        
        
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: uuidv4(),
        contact_id: uuidv4(),
        
        
        
        
        
        
        
        
        deal_id: uuidv4(),
        
        
        
        
        
        
        
        
        thread_id: uuidv4(),
        
        
        
        
        
        
        
        
        subject: 'Sample subject 1',
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        body_text: 'Sample body_text text 1',
        
        
        
        
        
        
        
        
        body_html: 'Sample body_html text 1',
        
        direction: 'Sample direction 1',
        
        
        
        
        
        
        
        
        
        
        
        
        sent_at: new Date(Date.now() + 1 * 3600000),
        
        
        
        
        
        
        
        
        received_at: new Date(Date.now() + 1 * 3600000),
        
        
        
        
        
        
        
        
        opened_at: new Date(Date.now() + 1 * 3600000),
        
        
        
        
        
        open_count: 1,
        
        
        
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: uuidv4(),
        contact_id: uuidv4(),
        
        
        
        
        
        
        
        
        deal_id: uuidv4(),
        
        
        
        
        
        
        
        
        thread_id: uuidv4(),
        
        
        
        
        
        
        
        
        subject: 'Sample subject 2',
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        body_text: 'Sample body_text text 2',
        
        
        
        
        
        
        
        
        body_html: 'Sample body_html text 2',
        
        direction: 'Sample direction 2',
        
        
        
        
        
        
        
        
        
        
        
        
        sent_at: new Date(Date.now() + 2 * 3600000),
        
        
        
        
        
        
        
        
        received_at: new Date(Date.now() + 2 * 3600000),
        
        
        
        
        
        
        
        
        opened_at: new Date(Date.now() + 2 * 3600000),
        
        
        
        
        
        open_count: 2,
        
        
        
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: uuidv4(),
        contact_id: uuidv4(),
        
        
        
        
        
        
        
        
        deal_id: uuidv4(),
        
        
        
        
        
        
        
        
        thread_id: uuidv4(),
        
        
        
        
        
        
        
        
        subject: 'Sample subject 3',
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        body_text: 'Sample body_text text 3',
        
        
        
        
        
        
        
        
        body_html: 'Sample body_html text 3',
        
        direction: 'Sample direction 3',
        
        
        
        
        
        
        
        
        
        
        
        
        sent_at: new Date(Date.now() + 3 * 3600000),
        
        
        
        
        
        
        
        
        received_at: new Date(Date.now() + 3 * 3600000),
        
        
        
        
        
        
        
        
        opened_at: new Date(Date.now() + 3 * 3600000),
        
        
        
        
        
        open_count: 3,
        
        
        
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  ];

  await db.insertInto('bus_email_message').values(emailMessageRecords).execute();

  // Email Template (bus_email_template)
  await db.deleteFrom('bus_email_template').execute();

  const emailTemplateRecords = [
    {
      id: uuidv4(),
        name: 'Test Email Template 0',
        
        
        
        
        
        
        
        
        subject: 'Sample subject 0',
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        body_html: 'Sample body_html text 0',
        
        
        
        
        
        
        
        
        body_text: 'Sample body_text text 0',
        
        category: 'Sample category 0',
        
        
        
        
        
        
        
        
        
        
        
        
        
        is_active: true,
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: uuidv4(),
        name: 'Test Email Template 1',
        
        
        
        
        
        
        
        
        subject: 'Sample subject 1',
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        body_html: 'Sample body_html text 1',
        
        
        
        
        
        
        
        
        body_text: 'Sample body_text text 1',
        
        category: 'Sample category 1',
        
        
        
        
        
        
        
        
        
        
        
        
        
        is_active: true,
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: uuidv4(),
        name: 'Test Email Template 2',
        
        
        
        
        
        
        
        
        subject: 'Sample subject 2',
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        body_html: 'Sample body_html text 2',
        
        
        
        
        
        
        
        
        body_text: 'Sample body_text text 2',
        
        category: 'Sample category 2',
        
        
        
        
        
        
        
        
        
        
        
        
        
        is_active: false,
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: uuidv4(),
        name: 'Test Email Template 3',
        
        
        
        
        
        
        
        
        subject: 'Sample subject 3',
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        body_html: 'Sample body_html text 3',
        
        
        
        
        
        
        
        
        body_text: 'Sample body_text text 3',
        
        category: 'Sample category 3',
        
        
        
        
        
        
        
        
        
        
        
        
        
        is_active: true,
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  ];

  await db.insertInto('bus_email_template').values(emailTemplateRecords).execute();

  // Product (bus_product)
  await db.deleteFrom('bus_product').execute();

  const productRecords = [
    {
      id: uuidv4(),
        name: 'Test Product 0',
        
        
        
        
        
        
        
        
        sku: 'Sample sku 0',
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        description: 'Sample description text 0',
        
        
        
        unit_price: 0.50,
        
        
        
        
        
        
        currency: 'Sample currency 0',
        
        
        
        
        
        
        
        
        
        
        
        
        
        is_active: true,
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: uuidv4(),
        name: 'Test Product 1',
        
        
        
        
        
        
        
        
        sku: 'Sample sku 1',
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        description: 'Sample description text 1',
        
        
        
        unit_price: 1.50,
        
        
        
        
        
        
        currency: 'Sample currency 1',
        
        
        
        
        
        
        
        
        
        
        
        
        
        is_active: true,
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: uuidv4(),
        name: 'Test Product 2',
        
        
        
        
        
        
        
        
        sku: 'Sample sku 2',
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        description: 'Sample description text 2',
        
        
        
        unit_price: 2.50,
        
        
        
        
        
        
        currency: 'Sample currency 2',
        
        
        
        
        
        
        
        
        
        
        
        
        
        is_active: false,
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: uuidv4(),
        name: 'Test Product 3',
        
        
        
        
        
        
        
        
        sku: 'Sample sku 3',
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        description: 'Sample description text 3',
        
        
        
        unit_price: 3.50,
        
        
        
        
        
        
        currency: 'Sample currency 3',
        
        
        
        
        
        
        
        
        
        
        
        
        
        is_active: true,
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  ];

  await db.insertInto('bus_product').values(productRecords).execute();

  // Quote (bus_quote)
  await db.deleteFrom('bus_quote').execute();

  const quoteRecords = [
    {
      id: uuidv4(),
        deal_id: uuidv4(),
        
        
        
        
        
        
        
        
        quote_number: 'Sample quote_number 0',
        
        
        
        
        
        
        
        
        status: 'Sample status 0',
        
        
        
        
        
        
        
        
        
        
        
        valid_until: new Date(Date.now() + 0 * 86400000),
        
        
        
        
        
        
        
        subtotal: 0.50,
        
        
        
        
        
        
        
        
        discount_amount: 0.50,
        
        
        
        
        
        
        
        
        tax_amount: 0.50,
        
        
        
        
        
        
        
        
        total_amount: 0.50,
        
        
        
        
        
        
        
        
        
        
        
        
        
        terms: 'Sample terms text 0',
        
        
        
        
        
        
        
        
        notes: 'Sample notes text 0',
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: uuidv4(),
        deal_id: uuidv4(),
        
        
        
        
        
        
        
        
        quote_number: 'Sample quote_number 1',
        
        
        
        
        
        
        
        
        status: 'Sample status 1',
        
        
        
        
        
        
        
        
        
        
        
        valid_until: new Date(Date.now() + 1 * 86400000),
        
        
        
        
        
        
        
        subtotal: 1.50,
        
        
        
        
        
        
        
        
        discount_amount: 1.50,
        
        
        
        
        
        
        
        
        tax_amount: 1.50,
        
        
        
        
        
        
        
        
        total_amount: 1.50,
        
        
        
        
        
        
        
        
        
        
        
        
        
        terms: 'Sample terms text 1',
        
        
        
        
        
        
        
        
        notes: 'Sample notes text 1',
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: uuidv4(),
        deal_id: uuidv4(),
        
        
        
        
        
        
        
        
        quote_number: 'Sample quote_number 2',
        
        
        
        
        
        
        
        
        status: 'Sample status 2',
        
        
        
        
        
        
        
        
        
        
        
        valid_until: new Date(Date.now() + 2 * 86400000),
        
        
        
        
        
        
        
        subtotal: 2.50,
        
        
        
        
        
        
        
        
        discount_amount: 2.50,
        
        
        
        
        
        
        
        
        tax_amount: 2.50,
        
        
        
        
        
        
        
        
        total_amount: 2.50,
        
        
        
        
        
        
        
        
        
        
        
        
        
        terms: 'Sample terms text 2',
        
        
        
        
        
        
        
        
        notes: 'Sample notes text 2',
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: uuidv4(),
        deal_id: uuidv4(),
        
        
        
        
        
        
        
        
        quote_number: 'Sample quote_number 3',
        
        
        
        
        
        
        
        
        status: 'Sample status 3',
        
        
        
        
        
        
        
        
        
        
        
        valid_until: new Date(Date.now() + 3 * 86400000),
        
        
        
        
        
        
        
        subtotal: 3.50,
        
        
        
        
        
        
        
        
        discount_amount: 3.50,
        
        
        
        
        
        
        
        
        tax_amount: 3.50,
        
        
        
        
        
        
        
        
        total_amount: 3.50,
        
        
        
        
        
        
        
        
        
        
        
        
        
        terms: 'Sample terms text 3',
        
        
        
        
        
        
        
        
        notes: 'Sample notes text 3',
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  ];

  await db.insertInto('bus_quote').values(quoteRecords).execute();

  // Quote Item (bus_quote_item)
  await db.deleteFrom('bus_quote_item').execute();

  const quoteItemRecords = [
    {
      id: uuidv4(),
        quote_id: uuidv4(),
        
        
        
        
        
        
        
        
        product_id: uuidv4(),
        
        
        
        
        
        
        
        
        description: 'Sample description 0',
        
        
        
        
        
        
        
        
        
        quantity: 0,
        
        
        
        
        
        
        
        
        
        unit_price: 0.50,
        
        
        
        
        
        
        
        
        discount_percent: 0.50,
        
        
        
        
        
        
        
        
        total_price: 0.50,
        
        
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: uuidv4(),
        quote_id: uuidv4(),
        
        
        
        
        
        
        
        
        product_id: uuidv4(),
        
        
        
        
        
        
        
        
        description: 'Sample description 1',
        
        
        
        
        
        
        
        
        
        quantity: 1,
        
        
        
        
        
        
        
        
        
        unit_price: 1.50,
        
        
        
        
        
        
        
        
        discount_percent: 1.50,
        
        
        
        
        
        
        
        
        total_price: 1.50,
        
        
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: uuidv4(),
        quote_id: uuidv4(),
        
        
        
        
        
        
        
        
        product_id: uuidv4(),
        
        
        
        
        
        
        
        
        description: 'Sample description 2',
        
        
        
        
        
        
        
        
        
        quantity: 2,
        
        
        
        
        
        
        
        
        
        unit_price: 2.50,
        
        
        
        
        
        
        
        
        discount_percent: 2.50,
        
        
        
        
        
        
        
        
        total_price: 2.50,
        
        
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: uuidv4(),
        quote_id: uuidv4(),
        
        
        
        
        
        
        
        
        product_id: uuidv4(),
        
        
        
        
        
        
        
        
        description: 'Sample description 3',
        
        
        
        
        
        
        
        
        
        quantity: 3,
        
        
        
        
        
        
        
        
        
        unit_price: 3.50,
        
        
        
        
        
        
        
        
        discount_percent: 3.50,
        
        
        
        
        
        
        
        
        total_price: 3.50,
        
        
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  ];

  await db.insertInto('bus_quote_item').values(quoteItemRecords).execute();

  // User (bus_user)
  await db.deleteFrom('bus_user').execute();

  const userRecords = [
    {
      id: uuidv4(),
        email: 'test0@example.com',
        
        
        
        
        
        
        
        
        first_name: 'Sample first_name 0',
        
        
        
        
        
        
        
        
        last_name: 'Sample last_name 0',
        
        
        
        
        
        
        
        
        role: 'Sample role 0',
        
        
        
        
        
        
        
        
        team_id: uuidv4(),
        
        
        
        
        
        
        
        
        
        
        
        
        
        is_active: true,
        
        
        
        
        
        
        
        last_login: new Date(Date.now() + 0 * 3600000),
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: uuidv4(),
        email: 'test1@example.com',
        
        
        
        
        
        
        
        
        first_name: 'Sample first_name 1',
        
        
        
        
        
        
        
        
        last_name: 'Sample last_name 1',
        
        
        
        
        
        
        
        
        role: 'Sample role 1',
        
        
        
        
        
        
        
        
        team_id: uuidv4(),
        
        
        
        
        
        
        
        
        
        
        
        
        
        is_active: true,
        
        
        
        
        
        
        
        last_login: new Date(Date.now() + 1 * 3600000),
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: uuidv4(),
        email: 'test2@example.com',
        
        
        
        
        
        
        
        
        first_name: 'Sample first_name 2',
        
        
        
        
        
        
        
        
        last_name: 'Sample last_name 2',
        
        
        
        
        
        
        
        
        role: 'Sample role 2',
        
        
        
        
        
        
        
        
        team_id: uuidv4(),
        
        
        
        
        
        
        
        
        
        
        
        
        
        is_active: false,
        
        
        
        
        
        
        
        last_login: new Date(Date.now() + 2 * 3600000),
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: uuidv4(),
        email: 'test3@example.com',
        
        
        
        
        
        
        
        
        first_name: 'Sample first_name 3',
        
        
        
        
        
        
        
        
        last_name: 'Sample last_name 3',
        
        
        
        
        
        
        
        
        role: 'Sample role 3',
        
        
        
        
        
        
        
        
        team_id: uuidv4(),
        
        
        
        
        
        
        
        
        
        
        
        
        
        is_active: true,
        
        
        
        
        
        
        
        last_login: new Date(Date.now() + 3 * 3600000),
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  ];

  await db.insertInto('bus_user').values(userRecords).execute();

  // Team (bus_team)
  await db.deleteFrom('bus_team').execute();

  const teamRecords = [
    {
      id: uuidv4(),
        name: 'Test Team 0',
        
        
        
        
        
        
        
        
        manager_id: uuidv4(),
        
        
        
        
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: uuidv4(),
        name: 'Test Team 1',
        
        
        
        
        
        
        
        
        manager_id: uuidv4(),
        
        
        
        
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: uuidv4(),
        name: 'Test Team 2',
        
        
        
        
        
        
        
        
        manager_id: uuidv4(),
        
        
        
        
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: uuidv4(),
        name: 'Test Team 3',
        
        
        
        
        
        
        
        
        manager_id: uuidv4(),
        
        
        
        
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  ];

  await db.insertInto('bus_team').values(teamRecords).execute();


  // Re-enable FK constraint checking
  await sql`SET session_replication_role = DEFAULT`.execute(db);

  console.log('✓ Business sample data seeded');
}
