/**
 * Business Data Seed
 * Populates business tables with sample data for E2E testing
 *
 * Generated: 2026-02-09T13:00:26.967Z
 *
 * This seed creates sample records for each business entity to enable
 * proper E2E testing of CRUD operations.
 */

import type { Knex } from "knex";
import { v4 as uuidv4 } from "uuid";

export async function seed(knex: Knex): Promise<void> {
  const now = new Date();

  // ==========================================================================
  // C U S T O M E R (bus_customer)
  // ==========================================================================

  await knex("bus_customer").del();

  const cUSTOMERData = [
    // Record 1
    {
      id: uuidv4(),
      name: "Test  1",
      email: "test1@example.com",
      phone: "Sample phone 1",
      city: "Sample city 1",
      status: "Sample status 1",
      created_at: now,
      updated_at: now,
    },
    // Record 2
    {
      id: uuidv4(),
      name: "Test  2",
      email: "test2@example.com",
      phone: "Sample phone 2",
      city: "Sample city 2",
      status: "Sample status 2",
      created_at: now,
      updated_at: now,
    },
    // Record 3
    {
      id: uuidv4(),
      name: "Test  3",
      email: "test3@example.com",
      phone: "Sample phone 3",
      city: "Sample city 3",
      status: "Sample status 3",
      created_at: now,
      updated_at: now,
    },
  ];

  await knex("bus_customer").insert(cUSTOMERData);

  // ==========================================================================
  // O R D E R (bus_order)
  // ==========================================================================

  await knex("bus_order").del();

  const oRDERData = [
    // Record 1
    {
      id: uuidv4(),
      customer_id: "Sample customer_id 1",
      order_date: new Date("2024-01-15"),
      total_amount: 1.5,
      status: "Sample status 1",
      created_at: now,
      updated_at: now,
    },
    // Record 2
    {
      id: uuidv4(),
      customer_id: "Sample customer_id 2",
      order_date: new Date("2024-02-15"),
      total_amount: 2.5,
      status: "Sample status 2",
      created_at: now,
      updated_at: now,
    },
    // Record 3
    {
      id: uuidv4(),
      customer_id: "Sample customer_id 3",
      order_date: new Date("2024-03-15"),
      total_amount: 3.5,
      status: "Sample status 3",
      created_at: now,
      updated_at: now,
    },
  ];

  await knex("bus_order").insert(oRDERData);

  // ==========================================================================
  // O R D E R  I T E M (bus_order_item)
  // ==========================================================================

  await knex("bus_order_item").del();

  const oRDERITEMData = [
    // Record 1
    {
      id: uuidv4(),
      order_id: "Sample order_id 1",
      product_id: "Sample product_id 1",
      quantity: 1,
      unit_price: 1.5,
      line_total: 1.5,
      created_at: now,
      updated_at: now,
    },
    // Record 2
    {
      id: uuidv4(),
      order_id: "Sample order_id 2",
      product_id: "Sample product_id 2",
      quantity: 2,
      unit_price: 2.5,
      line_total: 2.5,
      created_at: now,
      updated_at: now,
    },
    // Record 3
    {
      id: uuidv4(),
      order_id: "Sample order_id 3",
      product_id: "Sample product_id 3",
      quantity: 3,
      unit_price: 3.5,
      line_total: 3.5,
      created_at: now,
      updated_at: now,
    },
  ];

  await knex("bus_order_item").insert(oRDERITEMData);

  // ==========================================================================
  // P R O D U C T (bus_product)
  // ==========================================================================

  await knex("bus_product").del();

  const pRODUCTData = [
    // Record 1
    {
      id: uuidv4(),
      name: "Test  1",
      description: "Sample description 1",
      price: 1.5,
      stock_quantity: 1,
      category: "Sample category 1",
      is_active: true,
      created_at: now,
      updated_at: now,
    },
    // Record 2
    {
      id: uuidv4(),
      name: "Test  2",
      description: "Sample description 2",
      price: 2.5,
      stock_quantity: 2,
      category: "Sample category 2",
      is_active: false,
      created_at: now,
      updated_at: now,
    },
    // Record 3
    {
      id: uuidv4(),
      name: "Test  3",
      description: "Sample description 3",
      price: 3.5,
      stock_quantity: 3,
      category: "Sample category 3",
      is_active: true,
      created_at: now,
      updated_at: now,
    },
  ];

  await knex("bus_product").insert(pRODUCTData);

  // ==========================================================================
  // Field Groups - For demo/testing field grouping features
  // ==========================================================================

  // Insert sample field groups for each entity
  // Get the sys_tab_id for bus_customer
  const cUSTOMERTab = await knex("sys_tab")
    .where("sys_table_id", function (this: any) {
      this.select("sys_table_id").from("sys_table").where("table_name", "bus_customer");
    })
    .first();

  if (cUSTOMERTab) {
    // Insert field groups
    await knex("sys_field_group").insert([
      {
        sys_field_group_id: "g-c_u_s_t_o_m_e_r-personal",
        sys_tab_id: cUSTOMERTab.sys_tab_id,
        name: "Personal Information",
        description: "C U S T O M E R personal details",
        seq_no: 10,
        columns: 2,
        layout_type: "two-column",
        created_by: "system",
        updated_by: "system",
      },
      {
        sys_field_group_id: "g-c_u_s_t_o_m_e_r-system",
        sys_tab_id: cUSTOMERTab.sys_tab_id,
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
    const cUSTOMERFields = await knex("sys_column as sc")
      .innerJoin("sys_tab as st", "st.sys_table_id", "sc.sys_table_id")
      .innerJoin("sys_field as sf", function (this: any) {
        this.on("sf.sys_column_id", "=", "sc.sys_column_id").andOn(
          "sf.sys_tab_id",
          "=",
          "st.sys_tab_id"
        );
      })
      .where("st.sys_tab_id", cUSTOMERTab.sys_tab_id)
      .limit(6)
      .select("sf.sys_field_id", "sc.column_name")
      .orderBy("sf.seq_no");

    if (cUSTOMERFields.length > 0) {
      // First 4 fields to Personal Information
      for (let i = 0; i < Math.min(4, cUSTOMERFields.length); i++) {
        await knex("sys_field")
          .where("sys_field_id", cUSTOMERFields[i].sys_field_id)
          .update({
            sys_field_group_id: "g-c_u_s_t_o_m_e_r-personal",
            column_span: i < 2 ? 6 : 12, // First 2 fields half width, rest full width
            updated_at: now,
          });
      }

      // Remaining fields to System Information
      for (let i = 4; i < cUSTOMERFields.length; i++) {
        await knex("sys_field").where("sys_field_id", cUSTOMERFields[i].sys_field_id).update({
          sys_field_group_id: "g-c_u_s_t_o_m_e_r-system",
          column_span: 6,
          updated_at: now,
        });
      }
    }
  }
  // Get the sys_tab_id for bus_order
  const oRDERTab = await knex("sys_tab")
    .where("sys_table_id", function (this: any) {
      this.select("sys_table_id").from("sys_table").where("table_name", "bus_order");
    })
    .first();

  if (oRDERTab) {
    // Insert field groups
    await knex("sys_field_group").insert([
      {
        sys_field_group_id: "g-o_r_d_e_r-personal",
        sys_tab_id: oRDERTab.sys_tab_id,
        name: "Personal Information",
        description: "O R D E R personal details",
        seq_no: 10,
        columns: 2,
        layout_type: "two-column",
        created_by: "system",
        updated_by: "system",
      },
      {
        sys_field_group_id: "g-o_r_d_e_r-system",
        sys_tab_id: oRDERTab.sys_tab_id,
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
    const oRDERFields = await knex("sys_column as sc")
      .innerJoin("sys_tab as st", "st.sys_table_id", "sc.sys_table_id")
      .innerJoin("sys_field as sf", function (this: any) {
        this.on("sf.sys_column_id", "=", "sc.sys_column_id").andOn(
          "sf.sys_tab_id",
          "=",
          "st.sys_tab_id"
        );
      })
      .where("st.sys_tab_id", oRDERTab.sys_tab_id)
      .limit(6)
      .select("sf.sys_field_id", "sc.column_name")
      .orderBy("sf.seq_no");

    if (oRDERFields.length > 0) {
      // First 4 fields to Personal Information
      for (let i = 0; i < Math.min(4, oRDERFields.length); i++) {
        await knex("sys_field")
          .where("sys_field_id", oRDERFields[i].sys_field_id)
          .update({
            sys_field_group_id: "g-o_r_d_e_r-personal",
            column_span: i < 2 ? 6 : 12, // First 2 fields half width, rest full width
            updated_at: now,
          });
      }

      // Remaining fields to System Information
      for (let i = 4; i < oRDERFields.length; i++) {
        await knex("sys_field").where("sys_field_id", oRDERFields[i].sys_field_id).update({
          sys_field_group_id: "g-o_r_d_e_r-system",
          column_span: 6,
          updated_at: now,
        });
      }
    }
  }
  // Get the sys_tab_id for bus_order_item
  const oRDERITEMTab = await knex("sys_tab")
    .where("sys_table_id", function (this: any) {
      this.select("sys_table_id").from("sys_table").where("table_name", "bus_order_item");
    })
    .first();

  if (oRDERITEMTab) {
    // Insert field groups
    await knex("sys_field_group").insert([
      {
        sys_field_group_id: "g-o_r_d_e_r__i_t_e_m-personal",
        sys_tab_id: oRDERITEMTab.sys_tab_id,
        name: "Personal Information",
        description: "O R D E R  I T E M personal details",
        seq_no: 10,
        columns: 2,
        layout_type: "two-column",
        created_by: "system",
        updated_by: "system",
      },
      {
        sys_field_group_id: "g-o_r_d_e_r__i_t_e_m-system",
        sys_tab_id: oRDERITEMTab.sys_tab_id,
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
    const oRDERITEMFields = await knex("sys_column as sc")
      .innerJoin("sys_tab as st", "st.sys_table_id", "sc.sys_table_id")
      .innerJoin("sys_field as sf", function (this: any) {
        this.on("sf.sys_column_id", "=", "sc.sys_column_id").andOn(
          "sf.sys_tab_id",
          "=",
          "st.sys_tab_id"
        );
      })
      .where("st.sys_tab_id", oRDERITEMTab.sys_tab_id)
      .limit(6)
      .select("sf.sys_field_id", "sc.column_name")
      .orderBy("sf.seq_no");

    if (oRDERITEMFields.length > 0) {
      // First 4 fields to Personal Information
      for (let i = 0; i < Math.min(4, oRDERITEMFields.length); i++) {
        await knex("sys_field")
          .where("sys_field_id", oRDERITEMFields[i].sys_field_id)
          .update({
            sys_field_group_id: "g-o_r_d_e_r__i_t_e_m-personal",
            column_span: i < 2 ? 6 : 12, // First 2 fields half width, rest full width
            updated_at: now,
          });
      }

      // Remaining fields to System Information
      for (let i = 4; i < oRDERITEMFields.length; i++) {
        await knex("sys_field").where("sys_field_id", oRDERITEMFields[i].sys_field_id).update({
          sys_field_group_id: "g-o_r_d_e_r__i_t_e_m-system",
          column_span: 6,
          updated_at: now,
        });
      }
    }
  }
  // Get the sys_tab_id for bus_product
  const pRODUCTTab = await knex("sys_tab")
    .where("sys_table_id", function (this: any) {
      this.select("sys_table_id").from("sys_table").where("table_name", "bus_product");
    })
    .first();

  if (pRODUCTTab) {
    // Insert field groups
    await knex("sys_field_group").insert([
      {
        sys_field_group_id: "g-p_r_o_d_u_c_t-personal",
        sys_tab_id: pRODUCTTab.sys_tab_id,
        name: "Personal Information",
        description: "P R O D U C T personal details",
        seq_no: 10,
        columns: 2,
        layout_type: "two-column",
        created_by: "system",
        updated_by: "system",
      },
      {
        sys_field_group_id: "g-p_r_o_d_u_c_t-system",
        sys_tab_id: pRODUCTTab.sys_tab_id,
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
    const pRODUCTFields = await knex("sys_column as sc")
      .innerJoin("sys_tab as st", "st.sys_table_id", "sc.sys_table_id")
      .innerJoin("sys_field as sf", function (this: any) {
        this.on("sf.sys_column_id", "=", "sc.sys_column_id").andOn(
          "sf.sys_tab_id",
          "=",
          "st.sys_tab_id"
        );
      })
      .where("st.sys_tab_id", pRODUCTTab.sys_tab_id)
      .limit(6)
      .select("sf.sys_field_id", "sc.column_name")
      .orderBy("sf.seq_no");

    if (pRODUCTFields.length > 0) {
      // First 4 fields to Personal Information
      for (let i = 0; i < Math.min(4, pRODUCTFields.length); i++) {
        await knex("sys_field")
          .where("sys_field_id", pRODUCTFields[i].sys_field_id)
          .update({
            sys_field_group_id: "g-p_r_o_d_u_c_t-personal",
            column_span: i < 2 ? 6 : 12, // First 2 fields half width, rest full width
            updated_at: now,
          });
      }

      // Remaining fields to System Information
      for (let i = 4; i < pRODUCTFields.length; i++) {
        await knex("sys_field").where("sys_field_id", pRODUCTFields[i].sys_field_id).update({
          sys_field_group_id: "g-p_r_o_d_u_c_t-system",
          column_span: 6,
          updated_at: now,
        });
      }
    }
  }
}
