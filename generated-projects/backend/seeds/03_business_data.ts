/**
 * Business Data Seed
 * Populates business tables with sample data for E2E testing
 *
 * Generated: 2026-05-07T09:31:28.624Z
 *
 * This seed creates sample records for each business entity to enable
 * proper E2E testing of CRUD operations.
 */

import type { Knex } from "knex";
import { v4 as uuidv4 } from "uuid";

export async function seed(knex: Knex): Promise<void> {
  const now = new Date();

  // ==========================================================================
  // Company (bus_company)
  // ==========================================================================

  await knex("bus_company").del();

  const companyData = [
    // Record 1
    {
      id: uuidv4(),
      name: "Test  1",
      industry: "Sample industry 1",
      website: "Sample website 1",
      phone: "Sample phone 1",
      email: "test1@example.com",
      employee_count: 1,
      annual_revenue: 1.5,
      status: "Sample status 1",
      owner_id: "Sample owner_id 1",
      created_at: now,
      updated_at: now,
    },
    // Record 2
    {
      id: uuidv4(),
      name: "Test  2",
      industry: "Sample industry 2",
      website: "Sample website 2",
      phone: "Sample phone 2",
      email: "test2@example.com",
      employee_count: 2,
      annual_revenue: 2.5,
      status: "Sample status 2",
      owner_id: "Sample owner_id 2",
      created_at: now,
      updated_at: now,
    },
    // Record 3
    {
      id: uuidv4(),
      name: "Test  3",
      industry: "Sample industry 3",
      website: "Sample website 3",
      phone: "Sample phone 3",
      email: "test3@example.com",
      employee_count: 3,
      annual_revenue: 3.5,
      status: "Sample status 3",
      owner_id: "Sample owner_id 3",
      created_at: now,
      updated_at: now,
    },
  ];

  await knex("bus_company").insert(companyData);

  // ==========================================================================
  // Contact (bus_contact)
  // ==========================================================================

  await knex("bus_contact").del();

  const contactData = [
    // Record 1
    {
      id: uuidv4(),
      company_id: "Sample company_id 1",
      first_name: "Sample first_name 1",
      last_name: "Sample last_name 1",
      email: "test1@example.com",
      phone: "Sample phone 1",
      mobile: "Sample mobile 1",
      job_title: "Sample job_title 1",
      department: "Sample department 1",
      status: "Sample status 1",
      lead_source: "Sample lead_source 1",
      owner_id: "Sample owner_id 1",
      created_at: now,
      updated_at: now,
    },
    // Record 2
    {
      id: uuidv4(),
      company_id: "Sample company_id 2",
      first_name: "Sample first_name 2",
      last_name: "Sample last_name 2",
      email: "test2@example.com",
      phone: "Sample phone 2",
      mobile: "Sample mobile 2",
      job_title: "Sample job_title 2",
      department: "Sample department 2",
      status: "Sample status 2",
      lead_source: "Sample lead_source 2",
      owner_id: "Sample owner_id 2",
      created_at: now,
      updated_at: now,
    },
    // Record 3
    {
      id: uuidv4(),
      company_id: "Sample company_id 3",
      first_name: "Sample first_name 3",
      last_name: "Sample last_name 3",
      email: "test3@example.com",
      phone: "Sample phone 3",
      mobile: "Sample mobile 3",
      job_title: "Sample job_title 3",
      department: "Sample department 3",
      status: "Sample status 3",
      lead_source: "Sample lead_source 3",
      owner_id: "Sample owner_id 3",
      created_at: now,
      updated_at: now,
    },
  ];

  await knex("bus_contact").insert(contactData);

  // ==========================================================================
  // Deal (bus_deal)
  // ==========================================================================

  await knex("bus_deal").del();

  const dealData = [
    // Record 1
    {
      id: uuidv4(),
      company_id: "Sample company_id 1",
      contact_id: "Sample contact_id 1",
      name: "Test  1",
      amount: 1.5,
      currency: "Sample currency 1",
      stage: "Sample stage 1",
      probability: 1,
      expected_close_date: new Date("2024-01-15"),
      actual_close_date: new Date("2024-01-15"),
      status: "Sample status 1",
      description: "Sample description 1",
      owner_id: "Sample owner_id 1",
      created_at: now,
      updated_at: now,
    },
    // Record 2
    {
      id: uuidv4(),
      company_id: "Sample company_id 2",
      contact_id: "Sample contact_id 2",
      name: "Test  2",
      amount: 2.5,
      currency: "Sample currency 2",
      stage: "Sample stage 2",
      probability: 2,
      expected_close_date: new Date("2024-02-15"),
      actual_close_date: new Date("2024-02-15"),
      status: "Sample status 2",
      description: "Sample description 2",
      owner_id: "Sample owner_id 2",
      created_at: now,
      updated_at: now,
    },
    // Record 3
    {
      id: uuidv4(),
      company_id: "Sample company_id 3",
      contact_id: "Sample contact_id 3",
      name: "Test  3",
      amount: 3.5,
      currency: "Sample currency 3",
      stage: "Sample stage 3",
      probability: 3,
      expected_close_date: new Date("2024-03-15"),
      actual_close_date: new Date("2024-03-15"),
      status: "Sample status 3",
      description: "Sample description 3",
      owner_id: "Sample owner_id 3",
      created_at: now,
      updated_at: now,
    },
  ];

  await knex("bus_deal").insert(dealData);

  // ==========================================================================
  // Deal Stage (bus_deal_stage)
  // ==========================================================================

  await knex("bus_deal_stage").del();

  const dealStageData = [
    // Record 1
    {
      id: uuidv4(),
      pipeline_id: "Sample pipeline_id 1",
      name: "Test  1",
      sort_order: 1,
      default_probability: 1,
      is_won: true,
      is_lost: true,
      created_at: now,
      updated_at: now,
    },
    // Record 2
    {
      id: uuidv4(),
      pipeline_id: "Sample pipeline_id 2",
      name: "Test  2",
      sort_order: 2,
      default_probability: 2,
      is_won: false,
      is_lost: false,
      created_at: now,
      updated_at: now,
    },
    // Record 3
    {
      id: uuidv4(),
      pipeline_id: "Sample pipeline_id 3",
      name: "Test  3",
      sort_order: 3,
      default_probability: 3,
      is_won: true,
      is_lost: true,
      created_at: now,
      updated_at: now,
    },
  ];

  await knex("bus_deal_stage").insert(dealStageData);

  // ==========================================================================
  // Pipeline (bus_pipeline)
  // ==========================================================================

  await knex("bus_pipeline").del();

  const pipelineData = [
    // Record 1
    {
      id: uuidv4(),
      name: "Test  1",
      is_default: true,
      is_active: true,
      created_at: now,
      updated_at: now,
    },
    // Record 2
    {
      id: uuidv4(),
      name: "Test  2",
      is_default: false,
      is_active: false,
      created_at: now,
      updated_at: now,
    },
    // Record 3
    {
      id: uuidv4(),
      name: "Test  3",
      is_default: true,
      is_active: true,
      created_at: now,
      updated_at: now,
    },
  ];

  await knex("bus_pipeline").insert(pipelineData);

  // ==========================================================================
  // Activity (bus_activity)
  // ==========================================================================

  await knex("bus_activity").del();

  const activityData = [
    // Record 1
    {
      id: uuidv4(),
      contact_id: "Sample contact_id 1",
      company_id: "Sample company_id 1",
      deal_id: "Sample deal_id 1",
      activity_type: "Sample activity_type 1",
      subject: "Sample subject 1",
      description: "Sample description 1",
      scheduled_at: now,
      completed_at: now,
      duration_minutes: 1,
      status: "Sample status 1",
      owner_id: "Sample owner_id 1",
      created_at: now,
      updated_at: now,
    },
    // Record 2
    {
      id: uuidv4(),
      contact_id: "Sample contact_id 2",
      company_id: "Sample company_id 2",
      deal_id: "Sample deal_id 2",
      activity_type: "Sample activity_type 2",
      subject: "Sample subject 2",
      description: "Sample description 2",
      scheduled_at: now,
      completed_at: now,
      duration_minutes: 2,
      status: "Sample status 2",
      owner_id: "Sample owner_id 2",
      created_at: now,
      updated_at: now,
    },
    // Record 3
    {
      id: uuidv4(),
      contact_id: "Sample contact_id 3",
      company_id: "Sample company_id 3",
      deal_id: "Sample deal_id 3",
      activity_type: "Sample activity_type 3",
      subject: "Sample subject 3",
      description: "Sample description 3",
      scheduled_at: now,
      completed_at: now,
      duration_minutes: 3,
      status: "Sample status 3",
      owner_id: "Sample owner_id 3",
      created_at: now,
      updated_at: now,
    },
  ];

  await knex("bus_activity").insert(activityData);

  // ==========================================================================
  // Note (bus_note)
  // ==========================================================================

  await knex("bus_note").del();

  const noteData = [
    // Record 1
    {
      id: uuidv4(),
      contact_id: "Sample contact_id 1",
      company_id: "Sample company_id 1",
      deal_id: "Sample deal_id 1",
      content: "Sample content 1",
      is_pinned: true,
      author_id: "Sample author_id 1",
      created_at: now,
      updated_at: now,
    },
    // Record 2
    {
      id: uuidv4(),
      contact_id: "Sample contact_id 2",
      company_id: "Sample company_id 2",
      deal_id: "Sample deal_id 2",
      content: "Sample content 2",
      is_pinned: false,
      author_id: "Sample author_id 2",
      created_at: now,
      updated_at: now,
    },
    // Record 3
    {
      id: uuidv4(),
      contact_id: "Sample contact_id 3",
      company_id: "Sample company_id 3",
      deal_id: "Sample deal_id 3",
      content: "Sample content 3",
      is_pinned: true,
      author_id: "Sample author_id 3",
      created_at: now,
      updated_at: now,
    },
  ];

  await knex("bus_note").insert(noteData);

  // ==========================================================================
  // Task (bus_task)
  // ==========================================================================

  await knex("bus_task").del();

  const taskData = [
    // Record 1
    {
      id: uuidv4(),
      contact_id: "Sample contact_id 1",
      company_id: "Sample company_id 1",
      deal_id: "Sample deal_id 1",
      title: "Sample title 1",
      description: "Sample description 1",
      priority: "Sample priority 1",
      status: "Sample status 1",
      due_date: new Date("2024-01-15"),
      completed_at: now,
      assigned_to: "Sample assigned_to 1",
      created_by: "Sample created_by 1",
      created_at: now,
      updated_at: now,
    },
    // Record 2
    {
      id: uuidv4(),
      contact_id: "Sample contact_id 2",
      company_id: "Sample company_id 2",
      deal_id: "Sample deal_id 2",
      title: "Sample title 2",
      description: "Sample description 2",
      priority: "Sample priority 2",
      status: "Sample status 2",
      due_date: new Date("2024-02-15"),
      completed_at: now,
      assigned_to: "Sample assigned_to 2",
      created_by: "Sample created_by 2",
      created_at: now,
      updated_at: now,
    },
    // Record 3
    {
      id: uuidv4(),
      contact_id: "Sample contact_id 3",
      company_id: "Sample company_id 3",
      deal_id: "Sample deal_id 3",
      title: "Sample title 3",
      description: "Sample description 3",
      priority: "Sample priority 3",
      status: "Sample status 3",
      due_date: new Date("2024-03-15"),
      completed_at: now,
      assigned_to: "Sample assigned_to 3",
      created_by: "Sample created_by 3",
      created_at: now,
      updated_at: now,
    },
  ];

  await knex("bus_task").insert(taskData);

  // ==========================================================================
  // Email Message (bus_email_message)
  // ==========================================================================

  await knex("bus_email_message").del();

  const emailMessageData = [
    // Record 1
    {
      id: uuidv4(),
      contact_id: "Sample contact_id 1",
      deal_id: "Sample deal_id 1",
      thread_id: "Sample thread_id 1",
      subject: "Sample subject 1",
      body_text: "Sample body_text 1",
      body_html: "Sample body_html 1",
      direction: "Sample direction 1",
      sent_at: now,
      received_at: now,
      opened_at: now,
      open_count: 1,
      created_at: now,
      updated_at: now,
    },
    // Record 2
    {
      id: uuidv4(),
      contact_id: "Sample contact_id 2",
      deal_id: "Sample deal_id 2",
      thread_id: "Sample thread_id 2",
      subject: "Sample subject 2",
      body_text: "Sample body_text 2",
      body_html: "Sample body_html 2",
      direction: "Sample direction 2",
      sent_at: now,
      received_at: now,
      opened_at: now,
      open_count: 2,
      created_at: now,
      updated_at: now,
    },
    // Record 3
    {
      id: uuidv4(),
      contact_id: "Sample contact_id 3",
      deal_id: "Sample deal_id 3",
      thread_id: "Sample thread_id 3",
      subject: "Sample subject 3",
      body_text: "Sample body_text 3",
      body_html: "Sample body_html 3",
      direction: "Sample direction 3",
      sent_at: now,
      received_at: now,
      opened_at: now,
      open_count: 3,
      created_at: now,
      updated_at: now,
    },
  ];

  await knex("bus_email_message").insert(emailMessageData);

  // ==========================================================================
  // Email Template (bus_email_template)
  // ==========================================================================

  await knex("bus_email_template").del();

  const emailTemplateData = [
    // Record 1
    {
      id: uuidv4(),
      name: "Test  1",
      subject: "Sample subject 1",
      body_html: "Sample body_html 1",
      body_text: "Sample body_text 1",
      category: "Sample category 1",
      is_active: true,
      created_at: now,
      updated_at: now,
    },
    // Record 2
    {
      id: uuidv4(),
      name: "Test  2",
      subject: "Sample subject 2",
      body_html: "Sample body_html 2",
      body_text: "Sample body_text 2",
      category: "Sample category 2",
      is_active: false,
      created_at: now,
      updated_at: now,
    },
    // Record 3
    {
      id: uuidv4(),
      name: "Test  3",
      subject: "Sample subject 3",
      body_html: "Sample body_html 3",
      body_text: "Sample body_text 3",
      category: "Sample category 3",
      is_active: true,
      created_at: now,
      updated_at: now,
    },
  ];

  await knex("bus_email_template").insert(emailTemplateData);

  // ==========================================================================
  // Product (bus_product)
  // ==========================================================================

  await knex("bus_product").del();

  const productData = [
    // Record 1
    {
      id: uuidv4(),
      name: "Test  1",
      sku: "Sample sku 1",
      description: "Sample description 1",
      unit_price: 1.5,
      currency: "Sample currency 1",
      is_active: true,
      created_at: now,
      updated_at: now,
    },
    // Record 2
    {
      id: uuidv4(),
      name: "Test  2",
      sku: "Sample sku 2",
      description: "Sample description 2",
      unit_price: 2.5,
      currency: "Sample currency 2",
      is_active: false,
      created_at: now,
      updated_at: now,
    },
    // Record 3
    {
      id: uuidv4(),
      name: "Test  3",
      sku: "Sample sku 3",
      description: "Sample description 3",
      unit_price: 3.5,
      currency: "Sample currency 3",
      is_active: true,
      created_at: now,
      updated_at: now,
    },
  ];

  await knex("bus_product").insert(productData);

  // ==========================================================================
  // Quote (bus_quote)
  // ==========================================================================

  await knex("bus_quote").del();

  const quoteData = [
    // Record 1
    {
      id: uuidv4(),
      deal_id: "Sample deal_id 1",
      quote_number: "Sample quote_number 1",
      status: "Sample status 1",
      valid_until: new Date("2024-01-15"),
      subtotal: 1.5,
      discount_amount: 1.5,
      tax_amount: 1.5,
      total_amount: 1.5,
      terms: "Sample terms 1",
      notes: "Sample notes 1",
      created_at: now,
      updated_at: now,
    },
    // Record 2
    {
      id: uuidv4(),
      deal_id: "Sample deal_id 2",
      quote_number: "Sample quote_number 2",
      status: "Sample status 2",
      valid_until: new Date("2024-02-15"),
      subtotal: 2.5,
      discount_amount: 2.5,
      tax_amount: 2.5,
      total_amount: 2.5,
      terms: "Sample terms 2",
      notes: "Sample notes 2",
      created_at: now,
      updated_at: now,
    },
    // Record 3
    {
      id: uuidv4(),
      deal_id: "Sample deal_id 3",
      quote_number: "Sample quote_number 3",
      status: "Sample status 3",
      valid_until: new Date("2024-03-15"),
      subtotal: 3.5,
      discount_amount: 3.5,
      tax_amount: 3.5,
      total_amount: 3.5,
      terms: "Sample terms 3",
      notes: "Sample notes 3",
      created_at: now,
      updated_at: now,
    },
  ];

  await knex("bus_quote").insert(quoteData);

  // ==========================================================================
  // Quote Item (bus_quote_item)
  // ==========================================================================

  await knex("bus_quote_item").del();

  const quoteItemData = [
    // Record 1
    {
      id: uuidv4(),
      quote_id: "Sample quote_id 1",
      product_id: "Sample product_id 1",
      description: "Sample description 1",
      quantity: 1,
      unit_price: 1.5,
      discount_percent: 1.5,
      total_price: 1.5,
      created_at: now,
      updated_at: now,
    },
    // Record 2
    {
      id: uuidv4(),
      quote_id: "Sample quote_id 2",
      product_id: "Sample product_id 2",
      description: "Sample description 2",
      quantity: 2,
      unit_price: 2.5,
      discount_percent: 2.5,
      total_price: 2.5,
      created_at: now,
      updated_at: now,
    },
    // Record 3
    {
      id: uuidv4(),
      quote_id: "Sample quote_id 3",
      product_id: "Sample product_id 3",
      description: "Sample description 3",
      quantity: 3,
      unit_price: 3.5,
      discount_percent: 3.5,
      total_price: 3.5,
      created_at: now,
      updated_at: now,
    },
  ];

  await knex("bus_quote_item").insert(quoteItemData);

  // ==========================================================================
  // User (bus_user)
  // ==========================================================================

  await knex("bus_user").del();

  const userData = [
    // Record 1
    {
      id: uuidv4(),
      email: "test1@example.com",
      first_name: "Sample first_name 1",
      last_name: "Sample last_name 1",
      role: "Sample role 1",
      team_id: "Sample team_id 1",
      is_active: true,
      last_login: now,
      created_at: now,
      updated_at: now,
    },
    // Record 2
    {
      id: uuidv4(),
      email: "test2@example.com",
      first_name: "Sample first_name 2",
      last_name: "Sample last_name 2",
      role: "Sample role 2",
      team_id: "Sample team_id 2",
      is_active: false,
      last_login: now,
      created_at: now,
      updated_at: now,
    },
    // Record 3
    {
      id: uuidv4(),
      email: "test3@example.com",
      first_name: "Sample first_name 3",
      last_name: "Sample last_name 3",
      role: "Sample role 3",
      team_id: "Sample team_id 3",
      is_active: true,
      last_login: now,
      created_at: now,
      updated_at: now,
    },
  ];

  await knex("bus_user").insert(userData);

  // ==========================================================================
  // Team (bus_team)
  // ==========================================================================

  await knex("bus_team").del();

  const teamData = [
    // Record 1
    {
      id: uuidv4(),
      name: "Test  1",
      manager_id: "Sample manager_id 1",
      created_at: now,
      updated_at: now,
    },
    // Record 2
    {
      id: uuidv4(),
      name: "Test  2",
      manager_id: "Sample manager_id 2",
      created_at: now,
      updated_at: now,
    },
    // Record 3
    {
      id: uuidv4(),
      name: "Test  3",
      manager_id: "Sample manager_id 3",
      created_at: now,
      updated_at: now,
    },
  ];

  await knex("bus_team").insert(teamData);

  // ==========================================================================
  // Field Groups - For demo/testing field grouping features
  // ==========================================================================

  // Insert sample field groups for each entity
  // Get the sys_tab_id for bus_company
  const companyTab = await knex("sys_tab")
    .where("sys_table_id", function (this: any) {
      this.select("sys_table_id").from("sys_table").where("table_name", "bus_company");
    })
    .first();

  if (companyTab) {
    // Insert field groups with UUIDs
    const companyPersonalGroupId = uuidv4();
    const companySystemGroupId = uuidv4();

    await knex("sys_field_group").insert([
      {
        sys_field_group_id: companyPersonalGroupId,
        sys_tab_id: companyTab.sys_tab_id,
        name: "Personal Information",
        description: "Company personal details",
        seq_no: 10,
        columns: 2,
        layout_type: "two-column",
        created_by: "system",
        updated_by: "system",
      },
      {
        sys_field_group_id: companySystemGroupId,
        sys_tab_id: companyTab.sys_tab_id,
        name: "System Information",
        description: "System maintained fields",
        seq_no: 20,
        columns: 1,
        layout_type: "single",
        created_by: "system",
        updated_by: "system",
      },
    ]);

    // Assign some fields to groups (example - using first few fields)
    const companyFields = await knex("sys_column as sc")
      .innerJoin("sys_tab as st", "st.sys_table_id", "sc.sys_table_id")
      .innerJoin("sys_field as sf", function (this: any) {
        this.on("sf.sys_column_id", "=", "sc.sys_column_id").andOn(
          "sf.sys_tab_id",
          "=",
          "st.sys_tab_id"
        );
      })
      .where("st.sys_tab_id", companyTab.sys_tab_id)
      .limit(6)
      .select("sf.sys_field_id", "sc.column_name")
      .orderBy("sf.seq_no");

    if (companyFields.length > 0) {
      // First 4 fields to Personal Information
      for (let i = 0; i < Math.min(4, companyFields.length); i++) {
        await knex("sys_field")
          .where("sys_field_id", companyFields[i].sys_field_id)
          .update({
            sys_field_group_id: companyPersonalGroupId,
            column_span: i < 2 ? 6 : 12, // First 2 fields half width, rest full width
            updated_at: now,
          });
      }

      // Remaining fields to System Information
      for (let i = 4; i < companyFields.length; i++) {
        await knex("sys_field").where("sys_field_id", companyFields[i].sys_field_id).update({
          sys_field_group_id: companySystemGroupId,
          column_span: 6,
          updated_at: now,
        });
      }
    }
  }
  // Get the sys_tab_id for bus_contact
  const contactTab = await knex("sys_tab")
    .where("sys_table_id", function (this: any) {
      this.select("sys_table_id").from("sys_table").where("table_name", "bus_contact");
    })
    .first();

  if (contactTab) {
    // Insert field groups with UUIDs
    const contactPersonalGroupId = uuidv4();
    const contactSystemGroupId = uuidv4();

    await knex("sys_field_group").insert([
      {
        sys_field_group_id: contactPersonalGroupId,
        sys_tab_id: contactTab.sys_tab_id,
        name: "Personal Information",
        description: "Contact personal details",
        seq_no: 10,
        columns: 2,
        layout_type: "two-column",
        created_by: "system",
        updated_by: "system",
      },
      {
        sys_field_group_id: contactSystemGroupId,
        sys_tab_id: contactTab.sys_tab_id,
        name: "System Information",
        description: "System maintained fields",
        seq_no: 20,
        columns: 1,
        layout_type: "single",
        created_by: "system",
        updated_by: "system",
      },
    ]);

    // Assign some fields to groups (example - using first few fields)
    const contactFields = await knex("sys_column as sc")
      .innerJoin("sys_tab as st", "st.sys_table_id", "sc.sys_table_id")
      .innerJoin("sys_field as sf", function (this: any) {
        this.on("sf.sys_column_id", "=", "sc.sys_column_id").andOn(
          "sf.sys_tab_id",
          "=",
          "st.sys_tab_id"
        );
      })
      .where("st.sys_tab_id", contactTab.sys_tab_id)
      .limit(6)
      .select("sf.sys_field_id", "sc.column_name")
      .orderBy("sf.seq_no");

    if (contactFields.length > 0) {
      // First 4 fields to Personal Information
      for (let i = 0; i < Math.min(4, contactFields.length); i++) {
        await knex("sys_field")
          .where("sys_field_id", contactFields[i].sys_field_id)
          .update({
            sys_field_group_id: contactPersonalGroupId,
            column_span: i < 2 ? 6 : 12, // First 2 fields half width, rest full width
            updated_at: now,
          });
      }

      // Remaining fields to System Information
      for (let i = 4; i < contactFields.length; i++) {
        await knex("sys_field").where("sys_field_id", contactFields[i].sys_field_id).update({
          sys_field_group_id: contactSystemGroupId,
          column_span: 6,
          updated_at: now,
        });
      }
    }
  }
  // Get the sys_tab_id for bus_deal
  const dealTab = await knex("sys_tab")
    .where("sys_table_id", function (this: any) {
      this.select("sys_table_id").from("sys_table").where("table_name", "bus_deal");
    })
    .first();

  if (dealTab) {
    // Insert field groups with UUIDs
    const dealPersonalGroupId = uuidv4();
    const dealSystemGroupId = uuidv4();

    await knex("sys_field_group").insert([
      {
        sys_field_group_id: dealPersonalGroupId,
        sys_tab_id: dealTab.sys_tab_id,
        name: "Personal Information",
        description: "Deal personal details",
        seq_no: 10,
        columns: 2,
        layout_type: "two-column",
        created_by: "system",
        updated_by: "system",
      },
      {
        sys_field_group_id: dealSystemGroupId,
        sys_tab_id: dealTab.sys_tab_id,
        name: "System Information",
        description: "System maintained fields",
        seq_no: 20,
        columns: 1,
        layout_type: "single",
        created_by: "system",
        updated_by: "system",
      },
    ]);

    // Assign some fields to groups (example - using first few fields)
    const dealFields = await knex("sys_column as sc")
      .innerJoin("sys_tab as st", "st.sys_table_id", "sc.sys_table_id")
      .innerJoin("sys_field as sf", function (this: any) {
        this.on("sf.sys_column_id", "=", "sc.sys_column_id").andOn(
          "sf.sys_tab_id",
          "=",
          "st.sys_tab_id"
        );
      })
      .where("st.sys_tab_id", dealTab.sys_tab_id)
      .limit(6)
      .select("sf.sys_field_id", "sc.column_name")
      .orderBy("sf.seq_no");

    if (dealFields.length > 0) {
      // First 4 fields to Personal Information
      for (let i = 0; i < Math.min(4, dealFields.length); i++) {
        await knex("sys_field")
          .where("sys_field_id", dealFields[i].sys_field_id)
          .update({
            sys_field_group_id: dealPersonalGroupId,
            column_span: i < 2 ? 6 : 12, // First 2 fields half width, rest full width
            updated_at: now,
          });
      }

      // Remaining fields to System Information
      for (let i = 4; i < dealFields.length; i++) {
        await knex("sys_field").where("sys_field_id", dealFields[i].sys_field_id).update({
          sys_field_group_id: dealSystemGroupId,
          column_span: 6,
          updated_at: now,
        });
      }
    }
  }
  // Get the sys_tab_id for bus_deal_stage
  const dealStageTab = await knex("sys_tab")
    .where("sys_table_id", function (this: any) {
      this.select("sys_table_id").from("sys_table").where("table_name", "bus_deal_stage");
    })
    .first();

  if (dealStageTab) {
    // Insert field groups with UUIDs
    const dealStagePersonalGroupId = uuidv4();
    const dealStageSystemGroupId = uuidv4();

    await knex("sys_field_group").insert([
      {
        sys_field_group_id: dealStagePersonalGroupId,
        sys_tab_id: dealStageTab.sys_tab_id,
        name: "Personal Information",
        description: "Deal Stage personal details",
        seq_no: 10,
        columns: 2,
        layout_type: "two-column",
        created_by: "system",
        updated_by: "system",
      },
      {
        sys_field_group_id: dealStageSystemGroupId,
        sys_tab_id: dealStageTab.sys_tab_id,
        name: "System Information",
        description: "System maintained fields",
        seq_no: 20,
        columns: 1,
        layout_type: "single",
        created_by: "system",
        updated_by: "system",
      },
    ]);

    // Assign some fields to groups (example - using first few fields)
    const dealStageFields = await knex("sys_column as sc")
      .innerJoin("sys_tab as st", "st.sys_table_id", "sc.sys_table_id")
      .innerJoin("sys_field as sf", function (this: any) {
        this.on("sf.sys_column_id", "=", "sc.sys_column_id").andOn(
          "sf.sys_tab_id",
          "=",
          "st.sys_tab_id"
        );
      })
      .where("st.sys_tab_id", dealStageTab.sys_tab_id)
      .limit(6)
      .select("sf.sys_field_id", "sc.column_name")
      .orderBy("sf.seq_no");

    if (dealStageFields.length > 0) {
      // First 4 fields to Personal Information
      for (let i = 0; i < Math.min(4, dealStageFields.length); i++) {
        await knex("sys_field")
          .where("sys_field_id", dealStageFields[i].sys_field_id)
          .update({
            sys_field_group_id: dealStagePersonalGroupId,
            column_span: i < 2 ? 6 : 12, // First 2 fields half width, rest full width
            updated_at: now,
          });
      }

      // Remaining fields to System Information
      for (let i = 4; i < dealStageFields.length; i++) {
        await knex("sys_field").where("sys_field_id", dealStageFields[i].sys_field_id).update({
          sys_field_group_id: dealStageSystemGroupId,
          column_span: 6,
          updated_at: now,
        });
      }
    }
  }
  // Get the sys_tab_id for bus_pipeline
  const pipelineTab = await knex("sys_tab")
    .where("sys_table_id", function (this: any) {
      this.select("sys_table_id").from("sys_table").where("table_name", "bus_pipeline");
    })
    .first();

  if (pipelineTab) {
    // Insert field groups with UUIDs
    const pipelinePersonalGroupId = uuidv4();
    const pipelineSystemGroupId = uuidv4();

    await knex("sys_field_group").insert([
      {
        sys_field_group_id: pipelinePersonalGroupId,
        sys_tab_id: pipelineTab.sys_tab_id,
        name: "Personal Information",
        description: "Pipeline personal details",
        seq_no: 10,
        columns: 2,
        layout_type: "two-column",
        created_by: "system",
        updated_by: "system",
      },
      {
        sys_field_group_id: pipelineSystemGroupId,
        sys_tab_id: pipelineTab.sys_tab_id,
        name: "System Information",
        description: "System maintained fields",
        seq_no: 20,
        columns: 1,
        layout_type: "single",
        created_by: "system",
        updated_by: "system",
      },
    ]);

    // Assign some fields to groups (example - using first few fields)
    const pipelineFields = await knex("sys_column as sc")
      .innerJoin("sys_tab as st", "st.sys_table_id", "sc.sys_table_id")
      .innerJoin("sys_field as sf", function (this: any) {
        this.on("sf.sys_column_id", "=", "sc.sys_column_id").andOn(
          "sf.sys_tab_id",
          "=",
          "st.sys_tab_id"
        );
      })
      .where("st.sys_tab_id", pipelineTab.sys_tab_id)
      .limit(6)
      .select("sf.sys_field_id", "sc.column_name")
      .orderBy("sf.seq_no");

    if (pipelineFields.length > 0) {
      // First 4 fields to Personal Information
      for (let i = 0; i < Math.min(4, pipelineFields.length); i++) {
        await knex("sys_field")
          .where("sys_field_id", pipelineFields[i].sys_field_id)
          .update({
            sys_field_group_id: pipelinePersonalGroupId,
            column_span: i < 2 ? 6 : 12, // First 2 fields half width, rest full width
            updated_at: now,
          });
      }

      // Remaining fields to System Information
      for (let i = 4; i < pipelineFields.length; i++) {
        await knex("sys_field").where("sys_field_id", pipelineFields[i].sys_field_id).update({
          sys_field_group_id: pipelineSystemGroupId,
          column_span: 6,
          updated_at: now,
        });
      }
    }
  }
  // Get the sys_tab_id for bus_activity
  const activityTab = await knex("sys_tab")
    .where("sys_table_id", function (this: any) {
      this.select("sys_table_id").from("sys_table").where("table_name", "bus_activity");
    })
    .first();

  if (activityTab) {
    // Insert field groups with UUIDs
    const activityPersonalGroupId = uuidv4();
    const activitySystemGroupId = uuidv4();

    await knex("sys_field_group").insert([
      {
        sys_field_group_id: activityPersonalGroupId,
        sys_tab_id: activityTab.sys_tab_id,
        name: "Personal Information",
        description: "Activity personal details",
        seq_no: 10,
        columns: 2,
        layout_type: "two-column",
        created_by: "system",
        updated_by: "system",
      },
      {
        sys_field_group_id: activitySystemGroupId,
        sys_tab_id: activityTab.sys_tab_id,
        name: "System Information",
        description: "System maintained fields",
        seq_no: 20,
        columns: 1,
        layout_type: "single",
        created_by: "system",
        updated_by: "system",
      },
    ]);

    // Assign some fields to groups (example - using first few fields)
    const activityFields = await knex("sys_column as sc")
      .innerJoin("sys_tab as st", "st.sys_table_id", "sc.sys_table_id")
      .innerJoin("sys_field as sf", function (this: any) {
        this.on("sf.sys_column_id", "=", "sc.sys_column_id").andOn(
          "sf.sys_tab_id",
          "=",
          "st.sys_tab_id"
        );
      })
      .where("st.sys_tab_id", activityTab.sys_tab_id)
      .limit(6)
      .select("sf.sys_field_id", "sc.column_name")
      .orderBy("sf.seq_no");

    if (activityFields.length > 0) {
      // First 4 fields to Personal Information
      for (let i = 0; i < Math.min(4, activityFields.length); i++) {
        await knex("sys_field")
          .where("sys_field_id", activityFields[i].sys_field_id)
          .update({
            sys_field_group_id: activityPersonalGroupId,
            column_span: i < 2 ? 6 : 12, // First 2 fields half width, rest full width
            updated_at: now,
          });
      }

      // Remaining fields to System Information
      for (let i = 4; i < activityFields.length; i++) {
        await knex("sys_field").where("sys_field_id", activityFields[i].sys_field_id).update({
          sys_field_group_id: activitySystemGroupId,
          column_span: 6,
          updated_at: now,
        });
      }
    }
  }
  // Get the sys_tab_id for bus_note
  const noteTab = await knex("sys_tab")
    .where("sys_table_id", function (this: any) {
      this.select("sys_table_id").from("sys_table").where("table_name", "bus_note");
    })
    .first();

  if (noteTab) {
    // Insert field groups with UUIDs
    const notePersonalGroupId = uuidv4();
    const noteSystemGroupId = uuidv4();

    await knex("sys_field_group").insert([
      {
        sys_field_group_id: notePersonalGroupId,
        sys_tab_id: noteTab.sys_tab_id,
        name: "Personal Information",
        description: "Note personal details",
        seq_no: 10,
        columns: 2,
        layout_type: "two-column",
        created_by: "system",
        updated_by: "system",
      },
      {
        sys_field_group_id: noteSystemGroupId,
        sys_tab_id: noteTab.sys_tab_id,
        name: "System Information",
        description: "System maintained fields",
        seq_no: 20,
        columns: 1,
        layout_type: "single",
        created_by: "system",
        updated_by: "system",
      },
    ]);

    // Assign some fields to groups (example - using first few fields)
    const noteFields = await knex("sys_column as sc")
      .innerJoin("sys_tab as st", "st.sys_table_id", "sc.sys_table_id")
      .innerJoin("sys_field as sf", function (this: any) {
        this.on("sf.sys_column_id", "=", "sc.sys_column_id").andOn(
          "sf.sys_tab_id",
          "=",
          "st.sys_tab_id"
        );
      })
      .where("st.sys_tab_id", noteTab.sys_tab_id)
      .limit(6)
      .select("sf.sys_field_id", "sc.column_name")
      .orderBy("sf.seq_no");

    if (noteFields.length > 0) {
      // First 4 fields to Personal Information
      for (let i = 0; i < Math.min(4, noteFields.length); i++) {
        await knex("sys_field")
          .where("sys_field_id", noteFields[i].sys_field_id)
          .update({
            sys_field_group_id: notePersonalGroupId,
            column_span: i < 2 ? 6 : 12, // First 2 fields half width, rest full width
            updated_at: now,
          });
      }

      // Remaining fields to System Information
      for (let i = 4; i < noteFields.length; i++) {
        await knex("sys_field").where("sys_field_id", noteFields[i].sys_field_id).update({
          sys_field_group_id: noteSystemGroupId,
          column_span: 6,
          updated_at: now,
        });
      }
    }
  }
  // Get the sys_tab_id for bus_task
  const taskTab = await knex("sys_tab")
    .where("sys_table_id", function (this: any) {
      this.select("sys_table_id").from("sys_table").where("table_name", "bus_task");
    })
    .first();

  if (taskTab) {
    // Insert field groups with UUIDs
    const taskPersonalGroupId = uuidv4();
    const taskSystemGroupId = uuidv4();

    await knex("sys_field_group").insert([
      {
        sys_field_group_id: taskPersonalGroupId,
        sys_tab_id: taskTab.sys_tab_id,
        name: "Personal Information",
        description: "Task personal details",
        seq_no: 10,
        columns: 2,
        layout_type: "two-column",
        created_by: "system",
        updated_by: "system",
      },
      {
        sys_field_group_id: taskSystemGroupId,
        sys_tab_id: taskTab.sys_tab_id,
        name: "System Information",
        description: "System maintained fields",
        seq_no: 20,
        columns: 1,
        layout_type: "single",
        created_by: "system",
        updated_by: "system",
      },
    ]);

    // Assign some fields to groups (example - using first few fields)
    const taskFields = await knex("sys_column as sc")
      .innerJoin("sys_tab as st", "st.sys_table_id", "sc.sys_table_id")
      .innerJoin("sys_field as sf", function (this: any) {
        this.on("sf.sys_column_id", "=", "sc.sys_column_id").andOn(
          "sf.sys_tab_id",
          "=",
          "st.sys_tab_id"
        );
      })
      .where("st.sys_tab_id", taskTab.sys_tab_id)
      .limit(6)
      .select("sf.sys_field_id", "sc.column_name")
      .orderBy("sf.seq_no");

    if (taskFields.length > 0) {
      // First 4 fields to Personal Information
      for (let i = 0; i < Math.min(4, taskFields.length); i++) {
        await knex("sys_field")
          .where("sys_field_id", taskFields[i].sys_field_id)
          .update({
            sys_field_group_id: taskPersonalGroupId,
            column_span: i < 2 ? 6 : 12, // First 2 fields half width, rest full width
            updated_at: now,
          });
      }

      // Remaining fields to System Information
      for (let i = 4; i < taskFields.length; i++) {
        await knex("sys_field").where("sys_field_id", taskFields[i].sys_field_id).update({
          sys_field_group_id: taskSystemGroupId,
          column_span: 6,
          updated_at: now,
        });
      }
    }
  }
  // Get the sys_tab_id for bus_email_message
  const emailMessageTab = await knex("sys_tab")
    .where("sys_table_id", function (this: any) {
      this.select("sys_table_id").from("sys_table").where("table_name", "bus_email_message");
    })
    .first();

  if (emailMessageTab) {
    // Insert field groups with UUIDs
    const emailMessagePersonalGroupId = uuidv4();
    const emailMessageSystemGroupId = uuidv4();

    await knex("sys_field_group").insert([
      {
        sys_field_group_id: emailMessagePersonalGroupId,
        sys_tab_id: emailMessageTab.sys_tab_id,
        name: "Personal Information",
        description: "Email Message personal details",
        seq_no: 10,
        columns: 2,
        layout_type: "two-column",
        created_by: "system",
        updated_by: "system",
      },
      {
        sys_field_group_id: emailMessageSystemGroupId,
        sys_tab_id: emailMessageTab.sys_tab_id,
        name: "System Information",
        description: "System maintained fields",
        seq_no: 20,
        columns: 1,
        layout_type: "single",
        created_by: "system",
        updated_by: "system",
      },
    ]);

    // Assign some fields to groups (example - using first few fields)
    const emailMessageFields = await knex("sys_column as sc")
      .innerJoin("sys_tab as st", "st.sys_table_id", "sc.sys_table_id")
      .innerJoin("sys_field as sf", function (this: any) {
        this.on("sf.sys_column_id", "=", "sc.sys_column_id").andOn(
          "sf.sys_tab_id",
          "=",
          "st.sys_tab_id"
        );
      })
      .where("st.sys_tab_id", emailMessageTab.sys_tab_id)
      .limit(6)
      .select("sf.sys_field_id", "sc.column_name")
      .orderBy("sf.seq_no");

    if (emailMessageFields.length > 0) {
      // First 4 fields to Personal Information
      for (let i = 0; i < Math.min(4, emailMessageFields.length); i++) {
        await knex("sys_field")
          .where("sys_field_id", emailMessageFields[i].sys_field_id)
          .update({
            sys_field_group_id: emailMessagePersonalGroupId,
            column_span: i < 2 ? 6 : 12, // First 2 fields half width, rest full width
            updated_at: now,
          });
      }

      // Remaining fields to System Information
      for (let i = 4; i < emailMessageFields.length; i++) {
        await knex("sys_field").where("sys_field_id", emailMessageFields[i].sys_field_id).update({
          sys_field_group_id: emailMessageSystemGroupId,
          column_span: 6,
          updated_at: now,
        });
      }
    }
  }
  // Get the sys_tab_id for bus_email_template
  const emailTemplateTab = await knex("sys_tab")
    .where("sys_table_id", function (this: any) {
      this.select("sys_table_id").from("sys_table").where("table_name", "bus_email_template");
    })
    .first();

  if (emailTemplateTab) {
    // Insert field groups with UUIDs
    const emailTemplatePersonalGroupId = uuidv4();
    const emailTemplateSystemGroupId = uuidv4();

    await knex("sys_field_group").insert([
      {
        sys_field_group_id: emailTemplatePersonalGroupId,
        sys_tab_id: emailTemplateTab.sys_tab_id,
        name: "Personal Information",
        description: "Email Template personal details",
        seq_no: 10,
        columns: 2,
        layout_type: "two-column",
        created_by: "system",
        updated_by: "system",
      },
      {
        sys_field_group_id: emailTemplateSystemGroupId,
        sys_tab_id: emailTemplateTab.sys_tab_id,
        name: "System Information",
        description: "System maintained fields",
        seq_no: 20,
        columns: 1,
        layout_type: "single",
        created_by: "system",
        updated_by: "system",
      },
    ]);

    // Assign some fields to groups (example - using first few fields)
    const emailTemplateFields = await knex("sys_column as sc")
      .innerJoin("sys_tab as st", "st.sys_table_id", "sc.sys_table_id")
      .innerJoin("sys_field as sf", function (this: any) {
        this.on("sf.sys_column_id", "=", "sc.sys_column_id").andOn(
          "sf.sys_tab_id",
          "=",
          "st.sys_tab_id"
        );
      })
      .where("st.sys_tab_id", emailTemplateTab.sys_tab_id)
      .limit(6)
      .select("sf.sys_field_id", "sc.column_name")
      .orderBy("sf.seq_no");

    if (emailTemplateFields.length > 0) {
      // First 4 fields to Personal Information
      for (let i = 0; i < Math.min(4, emailTemplateFields.length); i++) {
        await knex("sys_field")
          .where("sys_field_id", emailTemplateFields[i].sys_field_id)
          .update({
            sys_field_group_id: emailTemplatePersonalGroupId,
            column_span: i < 2 ? 6 : 12, // First 2 fields half width, rest full width
            updated_at: now,
          });
      }

      // Remaining fields to System Information
      for (let i = 4; i < emailTemplateFields.length; i++) {
        await knex("sys_field").where("sys_field_id", emailTemplateFields[i].sys_field_id).update({
          sys_field_group_id: emailTemplateSystemGroupId,
          column_span: 6,
          updated_at: now,
        });
      }
    }
  }
  // Get the sys_tab_id for bus_product
  const productTab = await knex("sys_tab")
    .where("sys_table_id", function (this: any) {
      this.select("sys_table_id").from("sys_table").where("table_name", "bus_product");
    })
    .first();

  if (productTab) {
    // Insert field groups with UUIDs
    const productPersonalGroupId = uuidv4();
    const productSystemGroupId = uuidv4();

    await knex("sys_field_group").insert([
      {
        sys_field_group_id: productPersonalGroupId,
        sys_tab_id: productTab.sys_tab_id,
        name: "Personal Information",
        description: "Product personal details",
        seq_no: 10,
        columns: 2,
        layout_type: "two-column",
        created_by: "system",
        updated_by: "system",
      },
      {
        sys_field_group_id: productSystemGroupId,
        sys_tab_id: productTab.sys_tab_id,
        name: "System Information",
        description: "System maintained fields",
        seq_no: 20,
        columns: 1,
        layout_type: "single",
        created_by: "system",
        updated_by: "system",
      },
    ]);

    // Assign some fields to groups (example - using first few fields)
    const productFields = await knex("sys_column as sc")
      .innerJoin("sys_tab as st", "st.sys_table_id", "sc.sys_table_id")
      .innerJoin("sys_field as sf", function (this: any) {
        this.on("sf.sys_column_id", "=", "sc.sys_column_id").andOn(
          "sf.sys_tab_id",
          "=",
          "st.sys_tab_id"
        );
      })
      .where("st.sys_tab_id", productTab.sys_tab_id)
      .limit(6)
      .select("sf.sys_field_id", "sc.column_name")
      .orderBy("sf.seq_no");

    if (productFields.length > 0) {
      // First 4 fields to Personal Information
      for (let i = 0; i < Math.min(4, productFields.length); i++) {
        await knex("sys_field")
          .where("sys_field_id", productFields[i].sys_field_id)
          .update({
            sys_field_group_id: productPersonalGroupId,
            column_span: i < 2 ? 6 : 12, // First 2 fields half width, rest full width
            updated_at: now,
          });
      }

      // Remaining fields to System Information
      for (let i = 4; i < productFields.length; i++) {
        await knex("sys_field").where("sys_field_id", productFields[i].sys_field_id).update({
          sys_field_group_id: productSystemGroupId,
          column_span: 6,
          updated_at: now,
        });
      }
    }
  }
  // Get the sys_tab_id for bus_quote
  const quoteTab = await knex("sys_tab")
    .where("sys_table_id", function (this: any) {
      this.select("sys_table_id").from("sys_table").where("table_name", "bus_quote");
    })
    .first();

  if (quoteTab) {
    // Insert field groups with UUIDs
    const quotePersonalGroupId = uuidv4();
    const quoteSystemGroupId = uuidv4();

    await knex("sys_field_group").insert([
      {
        sys_field_group_id: quotePersonalGroupId,
        sys_tab_id: quoteTab.sys_tab_id,
        name: "Personal Information",
        description: "Quote personal details",
        seq_no: 10,
        columns: 2,
        layout_type: "two-column",
        created_by: "system",
        updated_by: "system",
      },
      {
        sys_field_group_id: quoteSystemGroupId,
        sys_tab_id: quoteTab.sys_tab_id,
        name: "System Information",
        description: "System maintained fields",
        seq_no: 20,
        columns: 1,
        layout_type: "single",
        created_by: "system",
        updated_by: "system",
      },
    ]);

    // Assign some fields to groups (example - using first few fields)
    const quoteFields = await knex("sys_column as sc")
      .innerJoin("sys_tab as st", "st.sys_table_id", "sc.sys_table_id")
      .innerJoin("sys_field as sf", function (this: any) {
        this.on("sf.sys_column_id", "=", "sc.sys_column_id").andOn(
          "sf.sys_tab_id",
          "=",
          "st.sys_tab_id"
        );
      })
      .where("st.sys_tab_id", quoteTab.sys_tab_id)
      .limit(6)
      .select("sf.sys_field_id", "sc.column_name")
      .orderBy("sf.seq_no");

    if (quoteFields.length > 0) {
      // First 4 fields to Personal Information
      for (let i = 0; i < Math.min(4, quoteFields.length); i++) {
        await knex("sys_field")
          .where("sys_field_id", quoteFields[i].sys_field_id)
          .update({
            sys_field_group_id: quotePersonalGroupId,
            column_span: i < 2 ? 6 : 12, // First 2 fields half width, rest full width
            updated_at: now,
          });
      }

      // Remaining fields to System Information
      for (let i = 4; i < quoteFields.length; i++) {
        await knex("sys_field").where("sys_field_id", quoteFields[i].sys_field_id).update({
          sys_field_group_id: quoteSystemGroupId,
          column_span: 6,
          updated_at: now,
        });
      }
    }
  }
  // Get the sys_tab_id for bus_quote_item
  const quoteItemTab = await knex("sys_tab")
    .where("sys_table_id", function (this: any) {
      this.select("sys_table_id").from("sys_table").where("table_name", "bus_quote_item");
    })
    .first();

  if (quoteItemTab) {
    // Insert field groups with UUIDs
    const quoteItemPersonalGroupId = uuidv4();
    const quoteItemSystemGroupId = uuidv4();

    await knex("sys_field_group").insert([
      {
        sys_field_group_id: quoteItemPersonalGroupId,
        sys_tab_id: quoteItemTab.sys_tab_id,
        name: "Personal Information",
        description: "Quote Item personal details",
        seq_no: 10,
        columns: 2,
        layout_type: "two-column",
        created_by: "system",
        updated_by: "system",
      },
      {
        sys_field_group_id: quoteItemSystemGroupId,
        sys_tab_id: quoteItemTab.sys_tab_id,
        name: "System Information",
        description: "System maintained fields",
        seq_no: 20,
        columns: 1,
        layout_type: "single",
        created_by: "system",
        updated_by: "system",
      },
    ]);

    // Assign some fields to groups (example - using first few fields)
    const quoteItemFields = await knex("sys_column as sc")
      .innerJoin("sys_tab as st", "st.sys_table_id", "sc.sys_table_id")
      .innerJoin("sys_field as sf", function (this: any) {
        this.on("sf.sys_column_id", "=", "sc.sys_column_id").andOn(
          "sf.sys_tab_id",
          "=",
          "st.sys_tab_id"
        );
      })
      .where("st.sys_tab_id", quoteItemTab.sys_tab_id)
      .limit(6)
      .select("sf.sys_field_id", "sc.column_name")
      .orderBy("sf.seq_no");

    if (quoteItemFields.length > 0) {
      // First 4 fields to Personal Information
      for (let i = 0; i < Math.min(4, quoteItemFields.length); i++) {
        await knex("sys_field")
          .where("sys_field_id", quoteItemFields[i].sys_field_id)
          .update({
            sys_field_group_id: quoteItemPersonalGroupId,
            column_span: i < 2 ? 6 : 12, // First 2 fields half width, rest full width
            updated_at: now,
          });
      }

      // Remaining fields to System Information
      for (let i = 4; i < quoteItemFields.length; i++) {
        await knex("sys_field").where("sys_field_id", quoteItemFields[i].sys_field_id).update({
          sys_field_group_id: quoteItemSystemGroupId,
          column_span: 6,
          updated_at: now,
        });
      }
    }
  }
  // Get the sys_tab_id for bus_user
  const userTab = await knex("sys_tab")
    .where("sys_table_id", function (this: any) {
      this.select("sys_table_id").from("sys_table").where("table_name", "bus_user");
    })
    .first();

  if (userTab) {
    // Insert field groups with UUIDs
    const userPersonalGroupId = uuidv4();
    const userSystemGroupId = uuidv4();

    await knex("sys_field_group").insert([
      {
        sys_field_group_id: userPersonalGroupId,
        sys_tab_id: userTab.sys_tab_id,
        name: "Personal Information",
        description: "User personal details",
        seq_no: 10,
        columns: 2,
        layout_type: "two-column",
        created_by: "system",
        updated_by: "system",
      },
      {
        sys_field_group_id: userSystemGroupId,
        sys_tab_id: userTab.sys_tab_id,
        name: "System Information",
        description: "System maintained fields",
        seq_no: 20,
        columns: 1,
        layout_type: "single",
        created_by: "system",
        updated_by: "system",
      },
    ]);

    // Assign some fields to groups (example - using first few fields)
    const userFields = await knex("sys_column as sc")
      .innerJoin("sys_tab as st", "st.sys_table_id", "sc.sys_table_id")
      .innerJoin("sys_field as sf", function (this: any) {
        this.on("sf.sys_column_id", "=", "sc.sys_column_id").andOn(
          "sf.sys_tab_id",
          "=",
          "st.sys_tab_id"
        );
      })
      .where("st.sys_tab_id", userTab.sys_tab_id)
      .limit(6)
      .select("sf.sys_field_id", "sc.column_name")
      .orderBy("sf.seq_no");

    if (userFields.length > 0) {
      // First 4 fields to Personal Information
      for (let i = 0; i < Math.min(4, userFields.length); i++) {
        await knex("sys_field")
          .where("sys_field_id", userFields[i].sys_field_id)
          .update({
            sys_field_group_id: userPersonalGroupId,
            column_span: i < 2 ? 6 : 12, // First 2 fields half width, rest full width
            updated_at: now,
          });
      }

      // Remaining fields to System Information
      for (let i = 4; i < userFields.length; i++) {
        await knex("sys_field").where("sys_field_id", userFields[i].sys_field_id).update({
          sys_field_group_id: userSystemGroupId,
          column_span: 6,
          updated_at: now,
        });
      }
    }
  }
  // Get the sys_tab_id for bus_team
  const teamTab = await knex("sys_tab")
    .where("sys_table_id", function (this: any) {
      this.select("sys_table_id").from("sys_table").where("table_name", "bus_team");
    })
    .first();

  if (teamTab) {
    // Insert field groups with UUIDs
    const teamPersonalGroupId = uuidv4();
    const teamSystemGroupId = uuidv4();

    await knex("sys_field_group").insert([
      {
        sys_field_group_id: teamPersonalGroupId,
        sys_tab_id: teamTab.sys_tab_id,
        name: "Personal Information",
        description: "Team personal details",
        seq_no: 10,
        columns: 2,
        layout_type: "two-column",
        created_by: "system",
        updated_by: "system",
      },
      {
        sys_field_group_id: teamSystemGroupId,
        sys_tab_id: teamTab.sys_tab_id,
        name: "System Information",
        description: "System maintained fields",
        seq_no: 20,
        columns: 1,
        layout_type: "single",
        created_by: "system",
        updated_by: "system",
      },
    ]);

    // Assign some fields to groups (example - using first few fields)
    const teamFields = await knex("sys_column as sc")
      .innerJoin("sys_tab as st", "st.sys_table_id", "sc.sys_table_id")
      .innerJoin("sys_field as sf", function (this: any) {
        this.on("sf.sys_column_id", "=", "sc.sys_column_id").andOn(
          "sf.sys_tab_id",
          "=",
          "st.sys_tab_id"
        );
      })
      .where("st.sys_tab_id", teamTab.sys_tab_id)
      .limit(6)
      .select("sf.sys_field_id", "sc.column_name")
      .orderBy("sf.seq_no");

    if (teamFields.length > 0) {
      // First 4 fields to Personal Information
      for (let i = 0; i < Math.min(4, teamFields.length); i++) {
        await knex("sys_field")
          .where("sys_field_id", teamFields[i].sys_field_id)
          .update({
            sys_field_group_id: teamPersonalGroupId,
            column_span: i < 2 ? 6 : 12, // First 2 fields half width, rest full width
            updated_at: now,
          });
      }

      // Remaining fields to System Information
      for (let i = 4; i < teamFields.length; i++) {
        await knex("sys_field").where("sys_field_id", teamFields[i].sys_field_id).update({
          sys_field_group_id: teamSystemGroupId,
          column_span: 6,
          updated_at: now,
        });
      }
    }
  }
}
