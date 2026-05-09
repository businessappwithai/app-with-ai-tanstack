/**
 * Business Data Seed
 * Populates business tables with sample data for E2E testing
 *
 * Generated: 2026-05-06T11:42:08.746Z
 *
 * This seed creates sample records for each business entity to enable
 * proper E2E testing of CRUD operations.
 */

import type { Knex } from "knex";
import { v4 as uuidv4 } from "uuid";

export async function seed(knex: Knex): Promise<void> {
  const now = new Date();

  // ==========================================================================
  // Users (bus_users)
  // ==========================================================================

  await knex("bus_users").del();

  const uSERSData = [
    // Record 1
    {
      id: uuidv4(),
      username: "Sample username 1",
      email: "test1@example.com",
      password_hash: "Sample password_hash 1",
      created_at: now,
      updated_at: now,
    },
    // Record 2
    {
      id: uuidv4(),
      username: "Sample username 2",
      email: "test2@example.com",
      password_hash: "Sample password_hash 2",
      created_at: now,
      updated_at: now,
    },
    // Record 3
    {
      id: uuidv4(),
      username: "Sample username 3",
      email: "test3@example.com",
      password_hash: "Sample password_hash 3",
      created_at: now,
      updated_at: now,
    },
  ];

  await knex("bus_users").insert(uSERSData);

  // ==========================================================================
  // Posts (bus_posts)
  // ==========================================================================

  await knex("bus_posts").del();

  const pOSTSData = [
    // Record 1
    {
      id: uuidv4(),
      title: "Sample title 1",
      content: "Sample content 1",
      user_id: 1,
      created_at: now,
      updated_at: now,
    },
    // Record 2
    {
      id: uuidv4(),
      title: "Sample title 2",
      content: "Sample content 2",
      user_id: 2,
      created_at: now,
      updated_at: now,
    },
    // Record 3
    {
      id: uuidv4(),
      title: "Sample title 3",
      content: "Sample content 3",
      user_id: 3,
      created_at: now,
      updated_at: now,
    },
  ];

  await knex("bus_posts").insert(pOSTSData);

  // ==========================================================================
  // Comments (bus_comments)
  // ==========================================================================

  await knex("bus_comments").del();

  const cOMMENTSData = [
    // Record 1
    {
      id: uuidv4(),
      content: "Sample content 1",
      user_id: 1,
      post_id: 1,
      created_at: now,
      updated_at: now,
    },
    // Record 2
    {
      id: uuidv4(),
      content: "Sample content 2",
      user_id: 2,
      post_id: 2,
      created_at: now,
      updated_at: now,
    },
    // Record 3
    {
      id: uuidv4(),
      content: "Sample content 3",
      user_id: 3,
      post_id: 3,
      created_at: now,
      updated_at: now,
    },
  ];

  await knex("bus_comments").insert(cOMMENTSData);

  // ==========================================================================
  // Tags (bus_tags)
  // ==========================================================================

  await knex("bus_tags").del();

  const tAGSData = [
    // Record 1
    {
      id: uuidv4(),
      name: "Test  1",
      created_at: now,
      updated_at: now,
    },
    // Record 2
    {
      id: uuidv4(),
      name: "Test  2",
      created_at: now,
      updated_at: now,
    },
    // Record 3
    {
      id: uuidv4(),
      name: "Test  3",
      created_at: now,
      updated_at: now,
    },
  ];

  await knex("bus_tags").insert(tAGSData);

  // ==========================================================================
  // Post Tags (bus_post_tags)
  // ==========================================================================

  await knex("bus_post_tags").del();

  const pOSTTAGSData = [
    // Record 1
    {
      id: uuidv4(),
      post_id: 1,
      tag_id: 1,
      created_at: now,
      updated_at: now,
    },
    // Record 2
    {
      id: uuidv4(),
      post_id: 2,
      tag_id: 2,
      created_at: now,
      updated_at: now,
    },
    // Record 3
    {
      id: uuidv4(),
      post_id: 3,
      tag_id: 3,
      created_at: now,
      updated_at: now,
    },
  ];

  await knex("bus_post_tags").insert(pOSTTAGSData);

  // ==========================================================================
  // Field Groups - For demo/testing field grouping features
  // ==========================================================================

  // Insert sample field groups for each entity
  // Get the sys_tab_id for bus_users
  const uSERSTab = await knex("sys_tab")
    .where("sys_table_id", function (this: any) {
      this.select("sys_table_id").from("sys_table").where("table_name", "bus_users");
    })
    .first();

  if (uSERSTab) {
    // Insert field groups with UUIDs
    const uSERSPersonalGroupId = uuidv4();
    const uSERSSystemGroupId = uuidv4();

    await knex("sys_field_group").insert([
      {
        sys_field_group_id: uSERSPersonalGroupId,
        sys_tab_id: uSERSTab.sys_tab_id,
        name: "Personal Information",
        description: "Users personal details",
        seq_no: 10,
        columns: 2,
        layout_type: "two-column",
        created_by: "system",
        updated_by: "system",
      },
      {
        sys_field_group_id: uSERSSystemGroupId,
        sys_tab_id: uSERSTab.sys_tab_id,
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
    const uSERSFields = await knex("sys_column as sc")
      .innerJoin("sys_tab as st", "st.sys_table_id", "sc.sys_table_id")
      .innerJoin("sys_field as sf", function (this: any) {
        this.on("sf.sys_column_id", "=", "sc.sys_column_id").andOn(
          "sf.sys_tab_id",
          "=",
          "st.sys_tab_id"
        );
      })
      .where("st.sys_tab_id", uSERSTab.sys_tab_id)
      .limit(6)
      .select("sf.sys_field_id", "sc.column_name")
      .orderBy("sf.seq_no");

    if (uSERSFields.length > 0) {
      // First 4 fields to Personal Information
      for (let i = 0; i < Math.min(4, uSERSFields.length); i++) {
        await knex("sys_field")
          .where("sys_field_id", uSERSFields[i].sys_field_id)
          .update({
            sys_field_group_id: uSERSPersonalGroupId,
            column_span: i < 2 ? 6 : 12, // First 2 fields half width, rest full width
            updated_at: now,
          });
      }

      // Remaining fields to System Information
      for (let i = 4; i < uSERSFields.length; i++) {
        await knex("sys_field").where("sys_field_id", uSERSFields[i].sys_field_id).update({
          sys_field_group_id: uSERSSystemGroupId,
          column_span: 6,
          updated_at: now,
        });
      }
    }
  }
  // Get the sys_tab_id for bus_posts
  const pOSTSTab = await knex("sys_tab")
    .where("sys_table_id", function (this: any) {
      this.select("sys_table_id").from("sys_table").where("table_name", "bus_posts");
    })
    .first();

  if (pOSTSTab) {
    // Insert field groups with UUIDs
    const pOSTSPersonalGroupId = uuidv4();
    const pOSTSSystemGroupId = uuidv4();

    await knex("sys_field_group").insert([
      {
        sys_field_group_id: pOSTSPersonalGroupId,
        sys_tab_id: pOSTSTab.sys_tab_id,
        name: "Personal Information",
        description: "Posts personal details",
        seq_no: 10,
        columns: 2,
        layout_type: "two-column",
        created_by: "system",
        updated_by: "system",
      },
      {
        sys_field_group_id: pOSTSSystemGroupId,
        sys_tab_id: pOSTSTab.sys_tab_id,
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
    const pOSTSFields = await knex("sys_column as sc")
      .innerJoin("sys_tab as st", "st.sys_table_id", "sc.sys_table_id")
      .innerJoin("sys_field as sf", function (this: any) {
        this.on("sf.sys_column_id", "=", "sc.sys_column_id").andOn(
          "sf.sys_tab_id",
          "=",
          "st.sys_tab_id"
        );
      })
      .where("st.sys_tab_id", pOSTSTab.sys_tab_id)
      .limit(6)
      .select("sf.sys_field_id", "sc.column_name")
      .orderBy("sf.seq_no");

    if (pOSTSFields.length > 0) {
      // First 4 fields to Personal Information
      for (let i = 0; i < Math.min(4, pOSTSFields.length); i++) {
        await knex("sys_field")
          .where("sys_field_id", pOSTSFields[i].sys_field_id)
          .update({
            sys_field_group_id: pOSTSPersonalGroupId,
            column_span: i < 2 ? 6 : 12, // First 2 fields half width, rest full width
            updated_at: now,
          });
      }

      // Remaining fields to System Information
      for (let i = 4; i < pOSTSFields.length; i++) {
        await knex("sys_field").where("sys_field_id", pOSTSFields[i].sys_field_id).update({
          sys_field_group_id: pOSTSSystemGroupId,
          column_span: 6,
          updated_at: now,
        });
      }
    }
  }
  // Get the sys_tab_id for bus_comments
  const cOMMENTSTab = await knex("sys_tab")
    .where("sys_table_id", function (this: any) {
      this.select("sys_table_id").from("sys_table").where("table_name", "bus_comments");
    })
    .first();

  if (cOMMENTSTab) {
    // Insert field groups with UUIDs
    const cOMMENTSPersonalGroupId = uuidv4();
    const cOMMENTSSystemGroupId = uuidv4();

    await knex("sys_field_group").insert([
      {
        sys_field_group_id: cOMMENTSPersonalGroupId,
        sys_tab_id: cOMMENTSTab.sys_tab_id,
        name: "Personal Information",
        description: "Comments personal details",
        seq_no: 10,
        columns: 2,
        layout_type: "two-column",
        created_by: "system",
        updated_by: "system",
      },
      {
        sys_field_group_id: cOMMENTSSystemGroupId,
        sys_tab_id: cOMMENTSTab.sys_tab_id,
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
    const cOMMENTSFields = await knex("sys_column as sc")
      .innerJoin("sys_tab as st", "st.sys_table_id", "sc.sys_table_id")
      .innerJoin("sys_field as sf", function (this: any) {
        this.on("sf.sys_column_id", "=", "sc.sys_column_id").andOn(
          "sf.sys_tab_id",
          "=",
          "st.sys_tab_id"
        );
      })
      .where("st.sys_tab_id", cOMMENTSTab.sys_tab_id)
      .limit(6)
      .select("sf.sys_field_id", "sc.column_name")
      .orderBy("sf.seq_no");

    if (cOMMENTSFields.length > 0) {
      // First 4 fields to Personal Information
      for (let i = 0; i < Math.min(4, cOMMENTSFields.length); i++) {
        await knex("sys_field")
          .where("sys_field_id", cOMMENTSFields[i].sys_field_id)
          .update({
            sys_field_group_id: cOMMENTSPersonalGroupId,
            column_span: i < 2 ? 6 : 12, // First 2 fields half width, rest full width
            updated_at: now,
          });
      }

      // Remaining fields to System Information
      for (let i = 4; i < cOMMENTSFields.length; i++) {
        await knex("sys_field").where("sys_field_id", cOMMENTSFields[i].sys_field_id).update({
          sys_field_group_id: cOMMENTSSystemGroupId,
          column_span: 6,
          updated_at: now,
        });
      }
    }
  }
  // Get the sys_tab_id for bus_tags
  const tAGSTab = await knex("sys_tab")
    .where("sys_table_id", function (this: any) {
      this.select("sys_table_id").from("sys_table").where("table_name", "bus_tags");
    })
    .first();

  if (tAGSTab) {
    // Insert field groups with UUIDs
    const tAGSPersonalGroupId = uuidv4();
    const tAGSSystemGroupId = uuidv4();

    await knex("sys_field_group").insert([
      {
        sys_field_group_id: tAGSPersonalGroupId,
        sys_tab_id: tAGSTab.sys_tab_id,
        name: "Personal Information",
        description: "Tags personal details",
        seq_no: 10,
        columns: 2,
        layout_type: "two-column",
        created_by: "system",
        updated_by: "system",
      },
      {
        sys_field_group_id: tAGSSystemGroupId,
        sys_tab_id: tAGSTab.sys_tab_id,
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
    const tAGSFields = await knex("sys_column as sc")
      .innerJoin("sys_tab as st", "st.sys_table_id", "sc.sys_table_id")
      .innerJoin("sys_field as sf", function (this: any) {
        this.on("sf.sys_column_id", "=", "sc.sys_column_id").andOn(
          "sf.sys_tab_id",
          "=",
          "st.sys_tab_id"
        );
      })
      .where("st.sys_tab_id", tAGSTab.sys_tab_id)
      .limit(6)
      .select("sf.sys_field_id", "sc.column_name")
      .orderBy("sf.seq_no");

    if (tAGSFields.length > 0) {
      // First 4 fields to Personal Information
      for (let i = 0; i < Math.min(4, tAGSFields.length); i++) {
        await knex("sys_field")
          .where("sys_field_id", tAGSFields[i].sys_field_id)
          .update({
            sys_field_group_id: tAGSPersonalGroupId,
            column_span: i < 2 ? 6 : 12, // First 2 fields half width, rest full width
            updated_at: now,
          });
      }

      // Remaining fields to System Information
      for (let i = 4; i < tAGSFields.length; i++) {
        await knex("sys_field").where("sys_field_id", tAGSFields[i].sys_field_id).update({
          sys_field_group_id: tAGSSystemGroupId,
          column_span: 6,
          updated_at: now,
        });
      }
    }
  }
  // Get the sys_tab_id for bus_post_tags
  const pOSTTAGSTab = await knex("sys_tab")
    .where("sys_table_id", function (this: any) {
      this.select("sys_table_id").from("sys_table").where("table_name", "bus_post_tags");
    })
    .first();

  if (pOSTTAGSTab) {
    // Insert field groups with UUIDs
    const pOSTTAGSPersonalGroupId = uuidv4();
    const pOSTTAGSSystemGroupId = uuidv4();

    await knex("sys_field_group").insert([
      {
        sys_field_group_id: pOSTTAGSPersonalGroupId,
        sys_tab_id: pOSTTAGSTab.sys_tab_id,
        name: "Personal Information",
        description: "Post Tags personal details",
        seq_no: 10,
        columns: 2,
        layout_type: "two-column",
        created_by: "system",
        updated_by: "system",
      },
      {
        sys_field_group_id: pOSTTAGSSystemGroupId,
        sys_tab_id: pOSTTAGSTab.sys_tab_id,
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
    const pOSTTAGSFields = await knex("sys_column as sc")
      .innerJoin("sys_tab as st", "st.sys_table_id", "sc.sys_table_id")
      .innerJoin("sys_field as sf", function (this: any) {
        this.on("sf.sys_column_id", "=", "sc.sys_column_id").andOn(
          "sf.sys_tab_id",
          "=",
          "st.sys_tab_id"
        );
      })
      .where("st.sys_tab_id", pOSTTAGSTab.sys_tab_id)
      .limit(6)
      .select("sf.sys_field_id", "sc.column_name")
      .orderBy("sf.seq_no");

    if (pOSTTAGSFields.length > 0) {
      // First 4 fields to Personal Information
      for (let i = 0; i < Math.min(4, pOSTTAGSFields.length); i++) {
        await knex("sys_field")
          .where("sys_field_id", pOSTTAGSFields[i].sys_field_id)
          .update({
            sys_field_group_id: pOSTTAGSPersonalGroupId,
            column_span: i < 2 ? 6 : 12, // First 2 fields half width, rest full width
            updated_at: now,
          });
      }

      // Remaining fields to System Information
      for (let i = 4; i < pOSTTAGSFields.length; i++) {
        await knex("sys_field").where("sys_field_id", pOSTTAGSFields[i].sys_field_id).update({
          sys_field_group_id: pOSTTAGSSystemGroupId,
          column_span: 6,
          updated_at: now,
        });
      }
    }
  }
}
