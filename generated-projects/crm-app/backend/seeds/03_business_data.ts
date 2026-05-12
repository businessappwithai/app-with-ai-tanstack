/**
 * Business Data Seed
 * Sample records for each business entity for E2E testing
 *
 * Generated: 2026-05-12T11:38:40.042Z
 */

import { Kysely } from 'kysely';
import { v4 as uuidv4 } from 'uuid';

export async function seed(db: Kysely<any>): Promise<void> {
  const now = new Date();

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
        
        
        
        
        owner_id: 'Sample owner_id 0',
        
        
        
        
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
        
        
        
        
        owner_id: 'Sample owner_id 1',
        
        
        
        
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
        
        
        
        
        owner_id: 'Sample owner_id 2',
        
        
        
        
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
        
        
        
        
        owner_id: 'Sample owner_id 3',
        
        
        
        
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
        company_id: 'Sample company_id 0',
        
        
        
        
        first_name: 'Sample first_name 0',
        
        
        
        
        last_name: 'Sample last_name 0',
        
        
        
        
        email: 'test0@example.com',
        
        
        
        
        phone: 'Sample phone 0',
        
        
        
        
        mobile: 'Sample mobile 0',
        
        
        
        
        job_title: 'Sample job_title 0',
        
        
        
        
        department: 'Sample department 0',
        
        
        
        
        status: 'Sample status 0',
        
        
        
        
        lead_source: 'Sample lead_source 0',
        
        
        
        
        owner_id: 'Sample owner_id 0',
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: uuidv4(),
        company_id: 'Sample company_id 1',
        
        
        
        
        first_name: 'Sample first_name 1',
        
        
        
        
        last_name: 'Sample last_name 1',
        
        
        
        
        email: 'test1@example.com',
        
        
        
        
        phone: 'Sample phone 1',
        
        
        
        
        mobile: 'Sample mobile 1',
        
        
        
        
        job_title: 'Sample job_title 1',
        
        
        
        
        department: 'Sample department 1',
        
        
        
        
        status: 'Sample status 1',
        
        
        
        
        lead_source: 'Sample lead_source 1',
        
        
        
        
        owner_id: 'Sample owner_id 1',
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: uuidv4(),
        company_id: 'Sample company_id 2',
        
        
        
        
        first_name: 'Sample first_name 2',
        
        
        
        
        last_name: 'Sample last_name 2',
        
        
        
        
        email: 'test2@example.com',
        
        
        
        
        phone: 'Sample phone 2',
        
        
        
        
        mobile: 'Sample mobile 2',
        
        
        
        
        job_title: 'Sample job_title 2',
        
        
        
        
        department: 'Sample department 2',
        
        
        
        
        status: 'Sample status 2',
        
        
        
        
        lead_source: 'Sample lead_source 2',
        
        
        
        
        owner_id: 'Sample owner_id 2',
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: uuidv4(),
        company_id: 'Sample company_id 3',
        
        
        
        
        first_name: 'Sample first_name 3',
        
        
        
        
        last_name: 'Sample last_name 3',
        
        
        
        
        email: 'test3@example.com',
        
        
        
        
        phone: 'Sample phone 3',
        
        
        
        
        mobile: 'Sample mobile 3',
        
        
        
        
        job_title: 'Sample job_title 3',
        
        
        
        
        department: 'Sample department 3',
        
        
        
        
        status: 'Sample status 3',
        
        
        
        
        lead_source: 'Sample lead_source 3',
        
        
        
        
        owner_id: 'Sample owner_id 3',
        
        
        
        
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
        company_id: 'Sample company_id 0',
        
        
        
        
        contact_id: 'Sample contact_id 0',
        
        
        
        
        name: 'Test Deal 0',
        
        
        
        
        
        
        amount: 0.50,
        
        
        currency: 'Sample currency 0',
        
        
        
        
        stage: 'Sample stage 0',
        
        
        
        
        
        probability: 0,
        
        
        
        
        
        
        
        expected_close_date: 'value-0',
        
        
        
        
        actual_close_date: 'value-0',
        status: 'Sample status 0',
        
        
        
        
        
        
        
        
        description: 'value-0',
        owner_id: 'Sample owner_id 0',
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: uuidv4(),
        company_id: 'Sample company_id 1',
        
        
        
        
        contact_id: 'Sample contact_id 1',
        
        
        
        
        name: 'Test Deal 1',
        
        
        
        
        
        
        amount: 1.50,
        
        
        currency: 'Sample currency 1',
        
        
        
        
        stage: 'Sample stage 1',
        
        
        
        
        
        probability: 1,
        
        
        
        
        
        
        
        expected_close_date: 'value-1',
        
        
        
        
        actual_close_date: 'value-1',
        status: 'Sample status 1',
        
        
        
        
        
        
        
        
        description: 'value-1',
        owner_id: 'Sample owner_id 1',
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: uuidv4(),
        company_id: 'Sample company_id 2',
        
        
        
        
        contact_id: 'Sample contact_id 2',
        
        
        
        
        name: 'Test Deal 2',
        
        
        
        
        
        
        amount: 2.50,
        
        
        currency: 'Sample currency 2',
        
        
        
        
        stage: 'Sample stage 2',
        
        
        
        
        
        probability: 2,
        
        
        
        
        
        
        
        expected_close_date: 'value-2',
        
        
        
        
        actual_close_date: 'value-2',
        status: 'Sample status 2',
        
        
        
        
        
        
        
        
        description: 'value-2',
        owner_id: 'Sample owner_id 2',
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: uuidv4(),
        company_id: 'Sample company_id 3',
        
        
        
        
        contact_id: 'Sample contact_id 3',
        
        
        
        
        name: 'Test Deal 3',
        
        
        
        
        
        
        amount: 3.50,
        
        
        currency: 'Sample currency 3',
        
        
        
        
        stage: 'Sample stage 3',
        
        
        
        
        
        probability: 3,
        
        
        
        
        
        
        
        expected_close_date: 'value-3',
        
        
        
        
        actual_close_date: 'value-3',
        status: 'Sample status 3',
        
        
        
        
        
        
        
        
        description: 'value-3',
        owner_id: 'Sample owner_id 3',
        
        
        
        
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
        pipeline_id: 'Sample pipeline_id 0',
        
        
        
        
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
        pipeline_id: 'Sample pipeline_id 1',
        
        
        
        
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
        pipeline_id: 'Sample pipeline_id 2',
        
        
        
        
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
        pipeline_id: 'Sample pipeline_id 3',
        
        
        
        
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
        contact_id: 'Sample contact_id 0',
        
        
        
        
        company_id: 'Sample company_id 0',
        
        
        
        
        deal_id: 'Sample deal_id 0',
        
        
        
        
        activity_type: 'Sample activity_type 0',
        
        
        
        
        subject: 'Sample subject 0',
        
        
        
        
        
        
        
        
        description: 'value-0',
        
        
        
        
        scheduled_at: 'value-0',
        
        
        
        
        completed_at: 'value-0',
        
        duration_minutes: 0,
        
        
        
        status: 'Sample status 0',
        
        
        
        
        owner_id: 'Sample owner_id 0',
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: uuidv4(),
        contact_id: 'Sample contact_id 1',
        
        
        
        
        company_id: 'Sample company_id 1',
        
        
        
        
        deal_id: 'Sample deal_id 1',
        
        
        
        
        activity_type: 'Sample activity_type 1',
        
        
        
        
        subject: 'Sample subject 1',
        
        
        
        
        
        
        
        
        description: 'value-1',
        
        
        
        
        scheduled_at: 'value-1',
        
        
        
        
        completed_at: 'value-1',
        
        duration_minutes: 1,
        
        
        
        status: 'Sample status 1',
        
        
        
        
        owner_id: 'Sample owner_id 1',
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: uuidv4(),
        contact_id: 'Sample contact_id 2',
        
        
        
        
        company_id: 'Sample company_id 2',
        
        
        
        
        deal_id: 'Sample deal_id 2',
        
        
        
        
        activity_type: 'Sample activity_type 2',
        
        
        
        
        subject: 'Sample subject 2',
        
        
        
        
        
        
        
        
        description: 'value-2',
        
        
        
        
        scheduled_at: 'value-2',
        
        
        
        
        completed_at: 'value-2',
        
        duration_minutes: 2,
        
        
        
        status: 'Sample status 2',
        
        
        
        
        owner_id: 'Sample owner_id 2',
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: uuidv4(),
        contact_id: 'Sample contact_id 3',
        
        
        
        
        company_id: 'Sample company_id 3',
        
        
        
        
        deal_id: 'Sample deal_id 3',
        
        
        
        
        activity_type: 'Sample activity_type 3',
        
        
        
        
        subject: 'Sample subject 3',
        
        
        
        
        
        
        
        
        description: 'value-3',
        
        
        
        
        scheduled_at: 'value-3',
        
        
        
        
        completed_at: 'value-3',
        
        duration_minutes: 3,
        
        
        
        status: 'Sample status 3',
        
        
        
        
        owner_id: 'Sample owner_id 3',
        
        
        
        
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
        contact_id: 'Sample contact_id 0',
        
        
        
        
        company_id: 'Sample company_id 0',
        
        
        
        
        deal_id: 'Sample deal_id 0',
        
        
        
        
        
        
        
        
        content: 'value-0',
        
        
        
        is_pinned: true,
        
        author_id: 'Sample author_id 0',
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: uuidv4(),
        contact_id: 'Sample contact_id 1',
        
        
        
        
        company_id: 'Sample company_id 1',
        
        
        
        
        deal_id: 'Sample deal_id 1',
        
        
        
        
        
        
        
        
        content: 'value-1',
        
        
        
        is_pinned: true,
        
        author_id: 'Sample author_id 1',
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: uuidv4(),
        contact_id: 'Sample contact_id 2',
        
        
        
        
        company_id: 'Sample company_id 2',
        
        
        
        
        deal_id: 'Sample deal_id 2',
        
        
        
        
        
        
        
        
        content: 'value-2',
        
        
        
        is_pinned: false,
        
        author_id: 'Sample author_id 2',
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: uuidv4(),
        contact_id: 'Sample contact_id 3',
        
        
        
        
        company_id: 'Sample company_id 3',
        
        
        
        
        deal_id: 'Sample deal_id 3',
        
        
        
        
        
        
        
        
        content: 'value-3',
        
        
        
        is_pinned: true,
        
        author_id: 'Sample author_id 3',
        
        
        
        
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
        contact_id: 'Sample contact_id 0',
        
        
        
        
        company_id: 'Sample company_id 0',
        
        
        
        
        deal_id: 'Sample deal_id 0',
        
        
        
        
        title: 'Sample title 0',
        
        
        
        
        
        
        
        
        description: 'value-0',
        priority: 'Sample priority 0',
        
        
        
        
        status: 'Sample status 0',
        
        
        
        
        
        
        
        
        due_date: 'value-0',
        
        
        
        
        completed_at: 'value-0',
        assigned_to: 'Sample assigned_to 0',
        
        
        
        
        created_by: 'Sample created_by 0',
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: uuidv4(),
        contact_id: 'Sample contact_id 1',
        
        
        
        
        company_id: 'Sample company_id 1',
        
        
        
        
        deal_id: 'Sample deal_id 1',
        
        
        
        
        title: 'Sample title 1',
        
        
        
        
        
        
        
        
        description: 'value-1',
        priority: 'Sample priority 1',
        
        
        
        
        status: 'Sample status 1',
        
        
        
        
        
        
        
        
        due_date: 'value-1',
        
        
        
        
        completed_at: 'value-1',
        assigned_to: 'Sample assigned_to 1',
        
        
        
        
        created_by: 'Sample created_by 1',
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: uuidv4(),
        contact_id: 'Sample contact_id 2',
        
        
        
        
        company_id: 'Sample company_id 2',
        
        
        
        
        deal_id: 'Sample deal_id 2',
        
        
        
        
        title: 'Sample title 2',
        
        
        
        
        
        
        
        
        description: 'value-2',
        priority: 'Sample priority 2',
        
        
        
        
        status: 'Sample status 2',
        
        
        
        
        
        
        
        
        due_date: 'value-2',
        
        
        
        
        completed_at: 'value-2',
        assigned_to: 'Sample assigned_to 2',
        
        
        
        
        created_by: 'Sample created_by 2',
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: uuidv4(),
        contact_id: 'Sample contact_id 3',
        
        
        
        
        company_id: 'Sample company_id 3',
        
        
        
        
        deal_id: 'Sample deal_id 3',
        
        
        
        
        title: 'Sample title 3',
        
        
        
        
        
        
        
        
        description: 'value-3',
        priority: 'Sample priority 3',
        
        
        
        
        status: 'Sample status 3',
        
        
        
        
        
        
        
        
        due_date: 'value-3',
        
        
        
        
        completed_at: 'value-3',
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
        contact_id: 'Sample contact_id 0',
        
        
        
        
        deal_id: 'Sample deal_id 0',
        
        
        
        
        thread_id: 'Sample thread_id 0',
        
        
        
        
        subject: 'Sample subject 0',
        
        
        
        
        
        
        
        
        body_text: 'value-0',
        
        
        
        
        body_html: 'value-0',
        direction: 'Sample direction 0',
        
        
        
        
        
        
        
        
        sent_at: 'value-0',
        
        
        
        
        received_at: 'value-0',
        
        
        
        
        opened_at: 'value-0',
        
        open_count: 0,
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: uuidv4(),
        contact_id: 'Sample contact_id 1',
        
        
        
        
        deal_id: 'Sample deal_id 1',
        
        
        
        
        thread_id: 'Sample thread_id 1',
        
        
        
        
        subject: 'Sample subject 1',
        
        
        
        
        
        
        
        
        body_text: 'value-1',
        
        
        
        
        body_html: 'value-1',
        direction: 'Sample direction 1',
        
        
        
        
        
        
        
        
        sent_at: 'value-1',
        
        
        
        
        received_at: 'value-1',
        
        
        
        
        opened_at: 'value-1',
        
        open_count: 1,
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: uuidv4(),
        contact_id: 'Sample contact_id 2',
        
        
        
        
        deal_id: 'Sample deal_id 2',
        
        
        
        
        thread_id: 'Sample thread_id 2',
        
        
        
        
        subject: 'Sample subject 2',
        
        
        
        
        
        
        
        
        body_text: 'value-2',
        
        
        
        
        body_html: 'value-2',
        direction: 'Sample direction 2',
        
        
        
        
        
        
        
        
        sent_at: 'value-2',
        
        
        
        
        received_at: 'value-2',
        
        
        
        
        opened_at: 'value-2',
        
        open_count: 2,
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: uuidv4(),
        contact_id: 'Sample contact_id 3',
        
        
        
        
        deal_id: 'Sample deal_id 3',
        
        
        
        
        thread_id: 'Sample thread_id 3',
        
        
        
        
        subject: 'Sample subject 3',
        
        
        
        
        
        
        
        
        body_text: 'value-3',
        
        
        
        
        body_html: 'value-3',
        direction: 'Sample direction 3',
        
        
        
        
        
        
        
        
        sent_at: 'value-3',
        
        
        
        
        received_at: 'value-3',
        
        
        
        
        opened_at: 'value-3',
        
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
        
        
        
        
        
        
        
        
        body_html: 'value-0',
        
        
        
        
        body_text: 'value-0',
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
        
        
        
        
        
        
        
        
        body_html: 'value-1',
        
        
        
        
        body_text: 'value-1',
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
        
        
        
        
        
        
        
        
        body_html: 'value-2',
        
        
        
        
        body_text: 'value-2',
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
        
        
        
        
        
        
        
        
        body_html: 'value-3',
        
        
        
        
        body_text: 'value-3',
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
        
        
        
        
        
        
        
        
        description: 'value-0',
        
        
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
        
        
        
        
        
        
        
        
        description: 'value-1',
        
        
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
        
        
        
        
        
        
        
        
        description: 'value-2',
        
        
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
        
        
        
        
        
        
        
        
        description: 'value-3',
        
        
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
        deal_id: 'Sample deal_id 0',
        
        
        
        
        quote_number: 'Sample quote_number 0',
        
        
        
        
        status: 'Sample status 0',
        
        
        
        
        
        
        
        
        valid_until: 'value-0',
        
        
        subtotal: 0.50,
        
        
        
        
        discount_amount: 0.50,
        
        
        
        
        tax_amount: 0.50,
        
        
        
        
        total_amount: 0.50,
        
        
        
        
        
        
        terms: 'value-0',
        
        
        
        
        notes: 'value-0',
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: uuidv4(),
        deal_id: 'Sample deal_id 1',
        
        
        
        
        quote_number: 'Sample quote_number 1',
        
        
        
        
        status: 'Sample status 1',
        
        
        
        
        
        
        
        
        valid_until: 'value-1',
        
        
        subtotal: 1.50,
        
        
        
        
        discount_amount: 1.50,
        
        
        
        
        tax_amount: 1.50,
        
        
        
        
        total_amount: 1.50,
        
        
        
        
        
        
        terms: 'value-1',
        
        
        
        
        notes: 'value-1',
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: uuidv4(),
        deal_id: 'Sample deal_id 2',
        
        
        
        
        quote_number: 'Sample quote_number 2',
        
        
        
        
        status: 'Sample status 2',
        
        
        
        
        
        
        
        
        valid_until: 'value-2',
        
        
        subtotal: 2.50,
        
        
        
        
        discount_amount: 2.50,
        
        
        
        
        tax_amount: 2.50,
        
        
        
        
        total_amount: 2.50,
        
        
        
        
        
        
        terms: 'value-2',
        
        
        
        
        notes: 'value-2',
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: uuidv4(),
        deal_id: 'Sample deal_id 3',
        
        
        
        
        quote_number: 'Sample quote_number 3',
        
        
        
        
        status: 'Sample status 3',
        
        
        
        
        
        
        
        
        valid_until: 'value-3',
        
        
        subtotal: 3.50,
        
        
        
        
        discount_amount: 3.50,
        
        
        
        
        tax_amount: 3.50,
        
        
        
        
        total_amount: 3.50,
        
        
        
        
        
        
        terms: 'value-3',
        
        
        
        
        notes: 'value-3',
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
        quote_id: 'Sample quote_id 0',
        
        
        
        
        product_id: 'Sample product_id 0',
        
        
        
        
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
        quote_id: 'Sample quote_id 1',
        
        
        
        
        product_id: 'Sample product_id 1',
        
        
        
        
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
        quote_id: 'Sample quote_id 2',
        
        
        
        
        product_id: 'Sample product_id 2',
        
        
        
        
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
        quote_id: 'Sample quote_id 3',
        
        
        
        
        product_id: 'Sample product_id 3',
        
        
        
        
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
        
        
        
        
        team_id: 'Sample team_id 0',
        
        
        
        
        
        
        
        is_active: true,
        
        
        
        
        
        last_login: 'value-0',
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
        
        
        
        
        team_id: 'Sample team_id 1',
        
        
        
        
        
        
        
        is_active: true,
        
        
        
        
        
        last_login: 'value-1',
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
        
        
        
        
        team_id: 'Sample team_id 2',
        
        
        
        
        
        
        
        is_active: false,
        
        
        
        
        
        last_login: 'value-2',
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
        
        
        
        
        team_id: 'Sample team_id 3',
        
        
        
        
        
        
        
        is_active: true,
        
        
        
        
        
        last_login: 'value-3',
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
        
        
        
        
        manager_id: 'Sample manager_id 0',
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: uuidv4(),
        name: 'Test Team 1',
        
        
        
        
        manager_id: 'Sample manager_id 1',
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: uuidv4(),
        name: 'Test Team 2',
        
        
        
        
        manager_id: 'Sample manager_id 2',
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: uuidv4(),
        name: 'Test Team 3',
        
        
        
        
        manager_id: 'Sample manager_id 3',
        
        
        
        
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  ];

  await db.insertInto('bus_team').values(teamRecords).execute();


  console.log('✓ Business sample data seeded');
}
