/**
 * Entity registry — generated from the ERD.
 *
 * This is the single source of truth the suites iterate over. Every entity in
 * the model appears here with the field metadata the factory needs to invent
 * realistic values and the relationship metadata the workflow suite needs to
 * wire records together.
 *
 * Generated: 2026-08-17T17:20:18.807Z
 * Project: crm
 */

export type FieldType =
  | "string"
  | "integer"
  | "decimal"
  | "boolean"
  | "date"
  | "datetime"
  | "text"
  | "json";

export interface FieldMeta {
  /** Physical column name — what the API expects in a payload. */
  name: string;
  /** Human-readable label from the Application Dictionary. */
  displayName: string;
  type: FieldType;
  required: boolean;
  unique: boolean;
  /** True for *_id columns that point at another bus_ table. */
  isForeignKey: boolean;
  maxLength?: number;
}

export interface EntityMeta {
  /** ERD entity name, e.g. "Customer". */
  name: string;
  /** Physical table, e.g. "bus_customer" — the identifier the rules API uses. */
  tableName: string;
  /** Path segment for /api/bus/:entity. */
  route: string;
  displayName: string;
  primaryKey: string;
  fields: FieldMeta[];
}

export interface RelationshipMeta {
  name: string;
  sourceEntity: string;
  targetEntity: string;
  cardinality: "oneToOne" | "oneToMany" | "manyToOne" | "manyToMany";
  foreignKey?: string;
}

/**
 * Columns the server owns — never sent in a create/update payload.
 *
 * `is_active` is deliberately NOT here. The generator does not add it: when a
 * bus table has one it is because the model declared it, often as a required
 * field. Excluding it meant the harness could never build a valid payload for
 * those entities, and every create in the suite failed on a missing field the
 * factory was forbidden from supplying.
 */
export const SERVER_MANAGED_FIELDS = new Set([
  "id",
  "created_at",
  "updated_at",
  "deleted_at",
  "created_by",
  "updated_by",
  "version",
  "doc_status",
]);

export const entities: EntityMeta[] = [
  {
    name: "User",
    tableName: "bus_user",
    route: "bus_user",
    displayName: "User",
    primaryKey: "id",
    fields: [
      {
        name: "id",
        displayName: "Id",
        type: "string",
        required: false,
        unique: true,
        isForeignKey: false,
      },
      {
        name: "email",
        displayName: "Email",
        type: "string",
        required: true,
        unique: true,
        isForeignKey: false,
      },
      {
        name: "first_name",
        displayName: "First Name",
        type: "string",
        required: true,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "last_name",
        displayName: "Last Name",
        type: "string",
        required: true,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "role",
        displayName: "Role",
        type: "string",
        required: true,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "job_title",
        displayName: "Job Title",
        type: "string",
        required: false,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "phone",
        displayName: "Phone",
        type: "string",
        required: false,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "team_id",
        displayName: "Team Id",
        type: "string",
        required: false,
        unique: false,
        isForeignKey: true,
      },
      {
        name: "quota_annual",
        displayName: "Quota Annual",
        type: "decimal",
        required: false,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "is_active",
        displayName: "Is Active",
        type: "boolean",
        required: true,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "last_login",
        displayName: "Last Login",
        type: "datetime",
        required: false,
        unique: false,
        isForeignKey: false,
      },
    ],
  },
  {
    name: "Team",
    tableName: "bus_team",
    route: "bus_team",
    displayName: "Team",
    primaryKey: "id",
    fields: [
      {
        name: "id",
        displayName: "Id",
        type: "string",
        required: false,
        unique: true,
        isForeignKey: false,
      },
      {
        name: "name",
        displayName: "Name",
        type: "string",
        required: true,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "manager_id",
        displayName: "Manager Id",
        type: "string",
        required: false,
        unique: false,
        isForeignKey: true,
      },
      {
        name: "region",
        displayName: "Region",
        type: "string",
        required: false,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "quota_annual",
        displayName: "Quota Annual",
        type: "decimal",
        required: false,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "is_active",
        displayName: "Is Active",
        type: "boolean",
        required: true,
        unique: false,
        isForeignKey: false,
      },
    ],
  },
  {
    name: "Territory",
    tableName: "bus_territory",
    route: "bus_territory",
    displayName: "Territory",
    primaryKey: "id",
    fields: [
      {
        name: "id",
        displayName: "Id",
        type: "string",
        required: false,
        unique: true,
        isForeignKey: false,
      },
      {
        name: "name",
        displayName: "Name",
        type: "string",
        required: true,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "region",
        displayName: "Region",
        type: "string",
        required: true,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "country_code",
        displayName: "Country Code",
        type: "string",
        required: false,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "manager_id",
        displayName: "Manager Id",
        type: "string",
        required: false,
        unique: false,
        isForeignKey: true,
      },
      {
        name: "employee_count_floor",
        displayName: "Employee Count Floor",
        type: "integer",
        required: false,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "employee_count_ceiling",
        displayName: "Employee Count Ceiling",
        type: "integer",
        required: false,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "is_active",
        displayName: "Is Active",
        type: "boolean",
        required: true,
        unique: false,
        isForeignKey: false,
      },
    ],
  },
  {
    name: "Account",
    tableName: "bus_account",
    route: "bus_account",
    displayName: "Account",
    primaryKey: "id",
    fields: [
      {
        name: "id",
        displayName: "Id",
        type: "string",
        required: false,
        unique: true,
        isForeignKey: false,
      },
      {
        name: "name",
        displayName: "Name",
        type: "string",
        required: true,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "account_number",
        displayName: "Account Number",
        type: "string",
        required: false,
        unique: true,
        isForeignKey: false,
      },
      {
        name: "account_type",
        displayName: "Account Type",
        type: "string",
        required: true,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "tier",
        displayName: "Tier",
        type: "string",
        required: false,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "industry",
        displayName: "Industry",
        type: "string",
        required: false,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "website",
        displayName: "Website",
        type: "string",
        required: false,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "phone",
        displayName: "Phone",
        type: "string",
        required: false,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "billing_street",
        displayName: "Billing Street",
        type: "string",
        required: false,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "billing_city",
        displayName: "Billing City",
        type: "string",
        required: false,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "billing_postal_code",
        displayName: "Billing Postal Code",
        type: "string",
        required: false,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "billing_country",
        displayName: "Billing Country",
        type: "string",
        required: false,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "employee_count",
        displayName: "Employee Count",
        type: "integer",
        required: false,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "annual_revenue",
        displayName: "Annual Revenue",
        type: "decimal",
        required: false,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "health_score",
        displayName: "Health Score",
        type: "integer",
        required: false,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "territory_id",
        displayName: "Territory Id",
        type: "string",
        required: false,
        unique: false,
        isForeignKey: true,
      },
      {
        name: "sla_policy_id",
        displayName: "Sla Policy Id",
        type: "string",
        required: false,
        unique: false,
        isForeignKey: true,
      },
      {
        name: "status",
        displayName: "Status",
        type: "string",
        required: true,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "owner_id",
        displayName: "Owner Id",
        type: "string",
        required: true,
        unique: false,
        isForeignKey: true,
      },
    ],
  },
  {
    name: "Contact",
    tableName: "bus_contact",
    route: "bus_contact",
    displayName: "Contact",
    primaryKey: "id",
    fields: [
      {
        name: "id",
        displayName: "Id",
        type: "string",
        required: false,
        unique: true,
        isForeignKey: false,
      },
      {
        name: "account_id",
        displayName: "Account Id",
        type: "string",
        required: false,
        unique: false,
        isForeignKey: true,
      },
      {
        name: "first_name",
        displayName: "First Name",
        type: "string",
        required: true,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "last_name",
        displayName: "Last Name",
        type: "string",
        required: true,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "email",
        displayName: "Email",
        type: "string",
        required: true,
        unique: true,
        isForeignKey: false,
      },
      {
        name: "phone",
        displayName: "Phone",
        type: "string",
        required: false,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "mobile",
        displayName: "Mobile",
        type: "string",
        required: false,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "job_title",
        displayName: "Job Title",
        type: "string",
        required: false,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "department",
        displayName: "Department",
        type: "string",
        required: false,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "lead_source",
        displayName: "Lead Source",
        type: "string",
        required: false,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "is_primary",
        displayName: "Is Primary",
        type: "boolean",
        required: true,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "email_opt_out",
        displayName: "Email Opt Out",
        type: "boolean",
        required: true,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "do_not_call",
        displayName: "Do Not Call",
        type: "boolean",
        required: true,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "status",
        displayName: "Status",
        type: "string",
        required: true,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "owner_id",
        displayName: "Owner Id",
        type: "string",
        required: true,
        unique: false,
        isForeignKey: true,
      },
    ],
  },
  {
    name: "Lead",
    tableName: "bus_lead",
    route: "bus_lead",
    displayName: "Lead",
    primaryKey: "id",
    fields: [
      {
        name: "id",
        displayName: "Id",
        type: "string",
        required: false,
        unique: true,
        isForeignKey: false,
      },
      {
        name: "first_name",
        displayName: "First Name",
        type: "string",
        required: true,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "last_name",
        displayName: "Last Name",
        type: "string",
        required: true,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "company_name",
        displayName: "Company Name",
        type: "string",
        required: true,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "email",
        displayName: "Email",
        type: "string",
        required: true,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "phone",
        displayName: "Phone",
        type: "string",
        required: false,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "job_title",
        displayName: "Job Title",
        type: "string",
        required: false,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "industry",
        displayName: "Industry",
        type: "string",
        required: false,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "employee_count",
        displayName: "Employee Count",
        type: "integer",
        required: false,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "annual_revenue",
        displayName: "Annual Revenue",
        type: "decimal",
        required: false,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "lead_source",
        displayName: "Lead Source",
        type: "string",
        required: true,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "rating",
        displayName: "Rating",
        type: "string",
        required: false,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "score",
        displayName: "Score",
        type: "integer",
        required: false,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "campaign_id",
        displayName: "Campaign Id",
        type: "string",
        required: false,
        unique: false,
        isForeignKey: true,
      },
      {
        name: "status",
        displayName: "Status",
        type: "string",
        required: true,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "owner_id",
        displayName: "Owner Id",
        type: "string",
        required: true,
        unique: false,
        isForeignKey: true,
      },
      {
        name: "converted_at",
        displayName: "Converted At",
        type: "datetime",
        required: false,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "disqualification_reason",
        displayName: "Disqualification Reason",
        type: "string",
        required: false,
        unique: false,
        isForeignKey: false,
      },
    ],
  },
  {
    name: "Campaign",
    tableName: "bus_campaign",
    route: "bus_campaign",
    displayName: "Campaign",
    primaryKey: "id",
    fields: [
      {
        name: "id",
        displayName: "Id",
        type: "string",
        required: false,
        unique: true,
        isForeignKey: false,
      },
      {
        name: "name",
        displayName: "Name",
        type: "string",
        required: true,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "campaign_type",
        displayName: "Campaign Type",
        type: "string",
        required: true,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "status",
        displayName: "Status",
        type: "string",
        required: true,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "start_date",
        displayName: "Start Date",
        type: "date",
        required: true,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "end_date",
        displayName: "End Date",
        type: "date",
        required: false,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "budgeted_cost",
        displayName: "Budgeted Cost",
        type: "decimal",
        required: false,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "actual_cost",
        displayName: "Actual Cost",
        type: "decimal",
        required: false,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "expected_revenue",
        displayName: "Expected Revenue",
        type: "decimal",
        required: false,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "expected_response_count",
        displayName: "Expected Response Count",
        type: "integer",
        required: false,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "target_audience",
        displayName: "Target Audience",
        type: "string",
        required: false,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "owner_id",
        displayName: "Owner Id",
        type: "string",
        required: true,
        unique: false,
        isForeignKey: true,
      },
    ],
  },
  {
    name: "CampaignMember",
    tableName: "bus_campaign_member",
    route: "bus_campaign_member",
    displayName: "Campaign Member",
    primaryKey: "id",
    fields: [
      {
        name: "id",
        displayName: "Id",
        type: "string",
        required: false,
        unique: true,
        isForeignKey: false,
      },
      {
        name: "campaign_id",
        displayName: "Campaign Id",
        type: "string",
        required: true,
        unique: false,
        isForeignKey: true,
      },
      {
        name: "lead_id",
        displayName: "Lead Id",
        type: "string",
        required: false,
        unique: false,
        isForeignKey: true,
      },
      {
        name: "contact_id",
        displayName: "Contact Id",
        type: "string",
        required: false,
        unique: false,
        isForeignKey: true,
      },
      {
        name: "member_status",
        displayName: "Member Status",
        type: "string",
        required: true,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "responded_at",
        displayName: "Responded At",
        type: "datetime",
        required: false,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "has_responded",
        displayName: "Has Responded",
        type: "boolean",
        required: true,
        unique: false,
        isForeignKey: false,
      },
    ],
  },
  {
    name: "Opportunity",
    tableName: "bus_opportunity",
    route: "bus_opportunity",
    displayName: "Opportunity",
    primaryKey: "id",
    fields: [
      {
        name: "id",
        displayName: "Id",
        type: "string",
        required: false,
        unique: true,
        isForeignKey: false,
      },
      {
        name: "account_id",
        displayName: "Account Id",
        type: "string",
        required: true,
        unique: false,
        isForeignKey: true,
      },
      {
        name: "contact_id",
        displayName: "Contact Id",
        type: "string",
        required: false,
        unique: false,
        isForeignKey: true,
      },
      {
        name: "campaign_id",
        displayName: "Campaign Id",
        type: "string",
        required: false,
        unique: false,
        isForeignKey: true,
      },
      {
        name: "name",
        displayName: "Name",
        type: "string",
        required: true,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "description",
        displayName: "Description",
        type: "text",
        required: false,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "amount",
        displayName: "Amount",
        type: "decimal",
        required: false,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "currency_code",
        displayName: "Currency Code",
        type: "string",
        required: true,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "stage",
        displayName: "Stage",
        type: "string",
        required: true,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "probability",
        displayName: "Probability",
        type: "integer",
        required: false,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "forecast_category",
        displayName: "Forecast Category",
        type: "string",
        required: false,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "expected_close_date",
        displayName: "Expected Close Date",
        type: "date",
        required: false,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "actual_close_date",
        displayName: "Actual Close Date",
        type: "date",
        required: false,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "lead_source",
        displayName: "Lead Source",
        type: "string",
        required: false,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "next_step",
        displayName: "Next Step",
        type: "string",
        required: false,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "loss_reason",
        displayName: "Loss Reason",
        type: "string",
        required: false,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "owner_id",
        displayName: "Owner Id",
        type: "string",
        required: true,
        unique: false,
        isForeignKey: true,
      },
    ],
  },
  {
    name: "OpportunityLineItem",
    tableName: "bus_opportunity_line_item",
    route: "bus_opportunity_line_item",
    displayName: "Opportunity Line Item",
    primaryKey: "id",
    fields: [
      {
        name: "id",
        displayName: "Id",
        type: "string",
        required: false,
        unique: true,
        isForeignKey: false,
      },
      {
        name: "opportunity_id",
        displayName: "Opportunity Id",
        type: "string",
        required: true,
        unique: false,
        isForeignKey: true,
      },
      {
        name: "product_id",
        displayName: "Product Id",
        type: "string",
        required: true,
        unique: false,
        isForeignKey: true,
      },
      {
        name: "quantity",
        displayName: "Quantity",
        type: "decimal",
        required: true,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "unit_price",
        displayName: "Unit Price",
        type: "decimal",
        required: true,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "discount_percent",
        displayName: "Discount Percent",
        type: "decimal",
        required: false,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "line_total",
        displayName: "Line Total",
        type: "decimal",
        required: true,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "line_description",
        displayName: "Line Description",
        type: "string",
        required: false,
        unique: false,
        isForeignKey: false,
      },
    ],
  },
  {
    name: "Product",
    tableName: "bus_product",
    route: "bus_product",
    displayName: "Product",
    primaryKey: "id",
    fields: [
      {
        name: "id",
        displayName: "Id",
        type: "string",
        required: false,
        unique: true,
        isForeignKey: false,
      },
      {
        name: "product_code",
        displayName: "Product Code",
        type: "string",
        required: true,
        unique: true,
        isForeignKey: false,
      },
      {
        name: "name",
        displayName: "Name",
        type: "string",
        required: true,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "description",
        displayName: "Description",
        type: "text",
        required: false,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "family",
        displayName: "Family",
        type: "string",
        required: true,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "list_price",
        displayName: "List Price",
        type: "decimal",
        required: true,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "unit_cost",
        displayName: "Unit Cost",
        type: "decimal",
        required: false,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "billing_frequency",
        displayName: "Billing Frequency",
        type: "string",
        required: false,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "is_active",
        displayName: "Is Active",
        type: "boolean",
        required: true,
        unique: false,
        isForeignKey: false,
      },
    ],
  },
  {
    name: "Quote",
    tableName: "bus_quote",
    route: "bus_quote",
    displayName: "Quote",
    primaryKey: "id",
    fields: [
      {
        name: "id",
        displayName: "Id",
        type: "string",
        required: false,
        unique: true,
        isForeignKey: false,
      },
      {
        name: "quote_number",
        displayName: "Quote Number",
        type: "string",
        required: false,
        unique: true,
        isForeignKey: false,
      },
      {
        name: "opportunity_id",
        displayName: "Opportunity Id",
        type: "string",
        required: true,
        unique: false,
        isForeignKey: true,
      },
      {
        name: "account_id",
        displayName: "Account Id",
        type: "string",
        required: true,
        unique: false,
        isForeignKey: true,
      },
      {
        name: "name",
        displayName: "Name",
        type: "string",
        required: true,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "status",
        displayName: "Status",
        type: "string",
        required: true,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "version_number",
        displayName: "Version Number",
        type: "integer",
        required: true,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "valid_until",
        displayName: "Valid Until",
        type: "date",
        required: false,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "subtotal",
        displayName: "Subtotal",
        type: "decimal",
        required: true,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "discount_percent",
        displayName: "Discount Percent",
        type: "decimal",
        required: false,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "discount_amount",
        displayName: "Discount Amount",
        type: "decimal",
        required: false,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "tax_amount",
        displayName: "Tax Amount",
        type: "decimal",
        required: false,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "grand_total",
        displayName: "Grand Total",
        type: "decimal",
        required: true,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "approved_by_id",
        displayName: "Approved By Id",
        type: "string",
        required: false,
        unique: false,
        isForeignKey: true,
      },
      {
        name: "approved_at",
        displayName: "Approved At",
        type: "datetime",
        required: false,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "approval_notes",
        displayName: "Approval Notes",
        type: "text",
        required: false,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "owner_id",
        displayName: "Owner Id",
        type: "string",
        required: true,
        unique: false,
        isForeignKey: true,
      },
    ],
  },
  {
    name: "QuoteLineItem",
    tableName: "bus_quote_line_item",
    route: "bus_quote_line_item",
    displayName: "Quote Line Item",
    primaryKey: "id",
    fields: [
      {
        name: "id",
        displayName: "Id",
        type: "string",
        required: false,
        unique: true,
        isForeignKey: false,
      },
      {
        name: "quote_id",
        displayName: "Quote Id",
        type: "string",
        required: true,
        unique: false,
        isForeignKey: true,
      },
      {
        name: "product_id",
        displayName: "Product Id",
        type: "string",
        required: true,
        unique: false,
        isForeignKey: true,
      },
      {
        name: "quantity",
        displayName: "Quantity",
        type: "decimal",
        required: true,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "unit_price",
        displayName: "Unit Price",
        type: "decimal",
        required: true,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "discount_percent",
        displayName: "Discount Percent",
        type: "decimal",
        required: false,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "line_total",
        displayName: "Line Total",
        type: "decimal",
        required: true,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "sort_order",
        displayName: "Sort Order",
        type: "integer",
        required: false,
        unique: false,
        isForeignKey: false,
      },
    ],
  },
  {
    name: "Contract",
    tableName: "bus_contract",
    route: "bus_contract",
    displayName: "Contract",
    primaryKey: "id",
    fields: [
      {
        name: "id",
        displayName: "Id",
        type: "string",
        required: false,
        unique: true,
        isForeignKey: false,
      },
      {
        name: "contract_number",
        displayName: "Contract Number",
        type: "string",
        required: false,
        unique: true,
        isForeignKey: false,
      },
      {
        name: "account_id",
        displayName: "Account Id",
        type: "string",
        required: true,
        unique: false,
        isForeignKey: true,
      },
      {
        name: "quote_id",
        displayName: "Quote Id",
        type: "string",
        required: false,
        unique: false,
        isForeignKey: true,
      },
      {
        name: "status",
        displayName: "Status",
        type: "string",
        required: true,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "start_date",
        displayName: "Start Date",
        type: "date",
        required: false,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "end_date",
        displayName: "End Date",
        type: "date",
        required: false,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "term_months",
        displayName: "Term Months",
        type: "integer",
        required: true,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "annual_value",
        displayName: "Annual Value",
        type: "decimal",
        required: true,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "auto_renew",
        displayName: "Auto Renew",
        type: "boolean",
        required: true,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "renewal_notice_days",
        displayName: "Renewal Notice Days",
        type: "integer",
        required: false,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "signed_by_id",
        displayName: "Signed By Id",
        type: "string",
        required: false,
        unique: false,
        isForeignKey: true,
      },
      {
        name: "signed_at",
        displayName: "Signed At",
        type: "datetime",
        required: false,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "owner_id",
        displayName: "Owner Id",
        type: "string",
        required: true,
        unique: false,
        isForeignKey: true,
      },
    ],
  },
  {
    name: "SupportCase",
    tableName: "bus_support_case",
    route: "bus_support_case",
    displayName: "Support Case",
    primaryKey: "id",
    fields: [
      {
        name: "id",
        displayName: "Id",
        type: "string",
        required: false,
        unique: true,
        isForeignKey: false,
      },
      {
        name: "case_number",
        displayName: "Case Number",
        type: "string",
        required: false,
        unique: true,
        isForeignKey: false,
      },
      {
        name: "account_id",
        displayName: "Account Id",
        type: "string",
        required: true,
        unique: false,
        isForeignKey: true,
      },
      {
        name: "contact_id",
        displayName: "Contact Id",
        type: "string",
        required: false,
        unique: false,
        isForeignKey: true,
      },
      {
        name: "sla_policy_id",
        displayName: "Sla Policy Id",
        type: "string",
        required: false,
        unique: false,
        isForeignKey: true,
      },
      {
        name: "subject",
        displayName: "Subject",
        type: "string",
        required: true,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "description",
        displayName: "Description",
        type: "text",
        required: false,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "case_type",
        displayName: "Case Type",
        type: "string",
        required: true,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "priority",
        displayName: "Priority",
        type: "string",
        required: true,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "origin",
        displayName: "Origin",
        type: "string",
        required: true,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "status",
        displayName: "Status",
        type: "string",
        required: true,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "first_response_due_at",
        displayName: "First Response Due At",
        type: "datetime",
        required: false,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "first_response_at",
        displayName: "First Response At",
        type: "datetime",
        required: false,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "resolution_due_at",
        displayName: "Resolution Due At",
        type: "datetime",
        required: false,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "resolved_at",
        displayName: "Resolved At",
        type: "datetime",
        required: false,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "is_sla_breached",
        displayName: "Is Sla Breached",
        type: "boolean",
        required: true,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "resolution_notes",
        displayName: "Resolution Notes",
        type: "text",
        required: false,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "satisfaction_score",
        displayName: "Satisfaction Score",
        type: "integer",
        required: false,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "escalated_by_id",
        displayName: "Escalated By Id",
        type: "string",
        required: false,
        unique: false,
        isForeignKey: true,
      },
      {
        name: "owner_id",
        displayName: "Owner Id",
        type: "string",
        required: true,
        unique: false,
        isForeignKey: true,
      },
    ],
  },
  {
    name: "SlaPolicy",
    tableName: "bus_sla_policy",
    route: "bus_sla_policy",
    displayName: "Sla Policy",
    primaryKey: "id",
    fields: [
      {
        name: "id",
        displayName: "Id",
        type: "string",
        required: false,
        unique: true,
        isForeignKey: false,
      },
      {
        name: "name",
        displayName: "Name",
        type: "string",
        required: true,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "tier",
        displayName: "Tier",
        type: "string",
        required: true,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "first_response_minutes",
        displayName: "First Response Minutes",
        type: "integer",
        required: true,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "resolution_hours",
        displayName: "Resolution Hours",
        type: "integer",
        required: true,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "business_hours_only",
        displayName: "Business Hours Only",
        type: "boolean",
        required: true,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "is_active",
        displayName: "Is Active",
        type: "boolean",
        required: true,
        unique: false,
        isForeignKey: false,
      },
    ],
  },
  {
    name: "Activity",
    tableName: "bus_activity",
    route: "bus_activity",
    displayName: "Activity",
    primaryKey: "id",
    fields: [
      {
        name: "id",
        displayName: "Id",
        type: "string",
        required: false,
        unique: true,
        isForeignKey: false,
      },
      {
        name: "activity_type",
        displayName: "Activity Type",
        type: "string",
        required: true,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "subject",
        displayName: "Subject",
        type: "string",
        required: true,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "description",
        displayName: "Description",
        type: "text",
        required: false,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "status",
        displayName: "Status",
        type: "string",
        required: true,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "priority",
        displayName: "Priority",
        type: "string",
        required: true,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "due_at",
        displayName: "Due At",
        type: "datetime",
        required: false,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "completed_at",
        displayName: "Completed At",
        type: "datetime",
        required: false,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "duration_minutes",
        displayName: "Duration Minutes",
        type: "integer",
        required: false,
        unique: false,
        isForeignKey: false,
      },
      {
        name: "account_id",
        displayName: "Account Id",
        type: "string",
        required: false,
        unique: false,
        isForeignKey: true,
      },
      {
        name: "contact_id",
        displayName: "Contact Id",
        type: "string",
        required: false,
        unique: false,
        isForeignKey: true,
      },
      {
        name: "lead_id",
        displayName: "Lead Id",
        type: "string",
        required: false,
        unique: false,
        isForeignKey: true,
      },
      {
        name: "opportunity_id",
        displayName: "Opportunity Id",
        type: "string",
        required: false,
        unique: false,
        isForeignKey: true,
      },
      {
        name: "support_case_id",
        displayName: "Support Case Id",
        type: "string",
        required: false,
        unique: false,
        isForeignKey: true,
      },
      {
        name: "contract_id",
        displayName: "Contract Id",
        type: "string",
        required: false,
        unique: false,
        isForeignKey: true,
      },
      {
        name: "owner_id",
        displayName: "Owner Id",
        type: "string",
        required: true,
        unique: false,
        isForeignKey: true,
      },
    ],
  },
];

export const relationships: RelationshipMeta[] = [
  {
    name: "has_members",
    sourceEntity: "Team",
    targetEntity: "User",
    cardinality: "oneToMany",
    foreignKey: "user_id",
  },
  {
    name: "covers",
    sourceEntity: "Team",
    targetEntity: "Territory",
    cardinality: "oneToMany",
    foreignKey: "territory_id",
  },
  {
    name: "manages",
    sourceEntity: "User",
    targetEntity: "Territory",
    cardinality: "oneToMany",
    foreignKey: "territory_id",
  },
  {
    name: "covers",
    sourceEntity: "Territory",
    targetEntity: "Account",
    cardinality: "oneToMany",
    foreignKey: "account_id",
  },
  {
    name: "governs",
    sourceEntity: "SlaPolicy",
    targetEntity: "Account",
    cardinality: "oneToMany",
    foreignKey: "account_id",
  },
  {
    name: "applies_to",
    sourceEntity: "SlaPolicy",
    targetEntity: "SupportCase",
    cardinality: "oneToMany",
    foreignKey: "support_case_id",
  },
  {
    name: "employs",
    sourceEntity: "Account",
    targetEntity: "Contact",
    cardinality: "oneToMany",
    foreignKey: "contact_id",
  },
  {
    name: "has_pipeline",
    sourceEntity: "Account",
    targetEntity: "Opportunity",
    cardinality: "oneToMany",
    foreignKey: "opportunity_id",
  },
  {
    name: "receives",
    sourceEntity: "Account",
    targetEntity: "Quote",
    cardinality: "oneToMany",
    foreignKey: "quote_id",
  },
  {
    name: "signs",
    sourceEntity: "Account",
    targetEntity: "Contract",
    cardinality: "oneToMany",
    foreignKey: "contract_id",
  },
  {
    name: "raises",
    sourceEntity: "Account",
    targetEntity: "SupportCase",
    cardinality: "oneToMany",
    foreignKey: "support_case_id",
  },
  {
    name: "has_history",
    sourceEntity: "Account",
    targetEntity: "Activity",
    cardinality: "oneToMany",
    foreignKey: "activity_id",
  },
  {
    name: "champions",
    sourceEntity: "Contact",
    targetEntity: "Opportunity",
    cardinality: "oneToMany",
    foreignKey: "opportunity_id",
  },
  {
    name: "reports",
    sourceEntity: "Contact",
    targetEntity: "SupportCase",
    cardinality: "oneToMany",
    foreignKey: "support_case_id",
  },
  {
    name: "is_targeted_as",
    sourceEntity: "Contact",
    targetEntity: "CampaignMember",
    cardinality: "oneToMany",
    foreignKey: "campaign_member_id",
  },
  {
    name: "involves",
    sourceEntity: "Contact",
    targetEntity: "Activity",
    cardinality: "oneToMany",
    foreignKey: "activity_id",
  },
  {
    name: "is_targeted_as",
    sourceEntity: "Lead",
    targetEntity: "CampaignMember",
    cardinality: "oneToMany",
    foreignKey: "campaign_member_id",
  },
  {
    name: "involves",
    sourceEntity: "Lead",
    targetEntity: "Activity",
    cardinality: "oneToMany",
    foreignKey: "activity_id",
  },
  {
    name: "targets",
    sourceEntity: "Campaign",
    targetEntity: "CampaignMember",
    cardinality: "oneToMany",
    foreignKey: "campaign_member_id",
  },
  {
    name: "generates",
    sourceEntity: "Campaign",
    targetEntity: "Lead",
    cardinality: "oneToMany",
    foreignKey: "lead_id",
  },
  {
    name: "influences",
    sourceEntity: "Campaign",
    targetEntity: "Opportunity",
    cardinality: "oneToMany",
    foreignKey: "opportunity_id",
  },
  {
    name: "contains",
    sourceEntity: "Opportunity",
    targetEntity: "OpportunityLineItem",
    cardinality: "oneToMany",
    foreignKey: "opportunity_line_item_id",
  },
  {
    name: "is_priced_by",
    sourceEntity: "Opportunity",
    targetEntity: "Quote",
    cardinality: "oneToMany",
    foreignKey: "quote_id",
  },
  {
    name: "is_worked_through",
    sourceEntity: "Opportunity",
    targetEntity: "Activity",
    cardinality: "oneToMany",
    foreignKey: "activity_id",
  },
  {
    name: "is_sold_as",
    sourceEntity: "Product",
    targetEntity: "OpportunityLineItem",
    cardinality: "oneToMany",
    foreignKey: "opportunity_line_item_id",
  },
  {
    name: "is_quoted_as",
    sourceEntity: "Product",
    targetEntity: "QuoteLineItem",
    cardinality: "oneToMany",
    foreignKey: "quote_line_item_id",
  },
  {
    name: "contains",
    sourceEntity: "Quote",
    targetEntity: "QuoteLineItem",
    cardinality: "oneToMany",
    foreignKey: "quote_line_item_id",
  },
  {
    name: "becomes",
    sourceEntity: "Quote",
    targetEntity: "Contract",
    cardinality: "oneToMany",
    foreignKey: "contract_id",
  },
  {
    name: "is_serviced_by",
    sourceEntity: "Contract",
    targetEntity: "Activity",
    cardinality: "oneToMany",
    foreignKey: "activity_id",
  },
  {
    name: "is_handled_through",
    sourceEntity: "SupportCase",
    targetEntity: "Activity",
    cardinality: "oneToMany",
    foreignKey: "activity_id",
  },
  {
    name: "owns",
    sourceEntity: "User",
    targetEntity: "Account",
    cardinality: "oneToMany",
    foreignKey: "account_id",
  },
  {
    name: "owns",
    sourceEntity: "User",
    targetEntity: "Contact",
    cardinality: "oneToMany",
    foreignKey: "contact_id",
  },
  {
    name: "owns",
    sourceEntity: "User",
    targetEntity: "Lead",
    cardinality: "oneToMany",
    foreignKey: "lead_id",
  },
  {
    name: "owns",
    sourceEntity: "User",
    targetEntity: "Campaign",
    cardinality: "oneToMany",
    foreignKey: "campaign_id",
  },
  {
    name: "owns",
    sourceEntity: "User",
    targetEntity: "Opportunity",
    cardinality: "oneToMany",
    foreignKey: "opportunity_id",
  },
  {
    name: "owns",
    sourceEntity: "User",
    targetEntity: "Quote",
    cardinality: "oneToMany",
    foreignKey: "quote_id",
  },
  {
    name: "owns",
    sourceEntity: "User",
    targetEntity: "Contract",
    cardinality: "oneToMany",
    foreignKey: "contract_id",
  },
  {
    name: "owns",
    sourceEntity: "User",
    targetEntity: "SupportCase",
    cardinality: "oneToMany",
    foreignKey: "support_case_id",
  },
  {
    name: "owns",
    sourceEntity: "User",
    targetEntity: "Activity",
    cardinality: "oneToMany",
    foreignKey: "activity_id",
  },
];

/** Fields a client is allowed to write. */
export function writableFields(entity: EntityMeta): FieldMeta[] {
  return entity.fields.filter((f) => !SERVER_MANAGED_FIELDS.has(f.name));
}

/** Writable fields excluding foreign keys — safe to populate without existing parents. */
export function scalarFields(entity: EntityMeta): FieldMeta[] {
  return writableFields(entity).filter((f) => !f.isForeignKey && !f.name.endsWith("_id"));
}

export function foreignKeyFields(entity: EntityMeta): FieldMeta[] {
  return writableFields(entity).filter((f) => f.isForeignKey || f.name.endsWith("_id"));
}

/**
 * Columns whose contents the model constrains to a shape. Tests write arbitrary
 * markers into a text field to assert round-tripping and search, so a column
 * with a format rule is the wrong one to pick — writing `e2e-1785…` into
 * `email` trips the email-format rule and the create is rejected.
 */
const FORMATTED_TEXT_COLUMNS = /email|url|website|link|phone|mobile|tel|slug|signature/i;

/** The first free-text field, used for search and update assertions. */
export function firstTextField(entity: EntityMeta): FieldMeta | undefined {
  const textish = scalarFields(entity).filter((f) => f.type === "string" || f.type === "text");
  return (
    textish.find((f) => !FORMATTED_TEXT_COLUMNS.test(f.name)) ??
    // Every text column is format-constrained — fall back rather than skip the
    // assertion entirely; the suite tolerates a create failure better than a
    // silent gap in coverage.
    textish[0]
  );
}

export function numericFields(entity: EntityMeta): FieldMeta[] {
  return scalarFields(entity).filter((f) => f.type === "integer" || f.type === "decimal");
}

export function getEntity(name: string): EntityMeta {
  const found = entities.find(
    (e) => e.name === name || e.tableName === name || e.route === name
  );
  if (!found) throw new Error(`Unknown entity "${name}"`);
  return found;
}

/**
 * FK columns naming a person by the role they played rather than by entity.
 * Mirrors `foreignKeys.personRoleColumns` in erdwithai-language.json and the
 * backend's own COLUMN_TABLE_ALIASES.
 */
const PERSON_ROLE_COLUMNS = new Set([
  "assigned_to",
  "author_id",
  "lab_manager_id",
  "manager_id",
  "owner_id",
  "pi_id",
  "remediation_owner_id",
  "user_id",
]);

/**
 * Map a foreign-key column (`customer_id`) to the entity it points at.
 *
 * A `_by` column points at a user, so it resolves to the user entity rather
 * than to an entity literally named after the column stem.
 */
export function parentEntityForColumn(columnName: string): EntityMeta | null {
  const findByStem = (stem: string): EntityMeta | null =>
    entities.find(
      (e) =>
        e.route === stem ||
        e.tableName === `bus_${stem}` ||
        e.name.toLowerCase() === stem.toLowerCase()
    ) ?? null;

  if (
    columnName.endsWith("_by_id") ||
    columnName.endsWith("_by") ||
    PERSON_ROLE_COLUMNS.has(columnName)
  ) {
    const user = findByStem("user");
    if (user) return user;
  }

  if (!columnName.endsWith("_id")) return null;
  return findByStem(columnName.slice(0, -3));
}

/**
 * Entities ordered so that a record's foreign-key targets are created first.
 * Falls back to declaration order for cycles.
 *
 * Edges come from the FK *columns*, not only from the ERD's declared
 * relationships: conventions like `registered_by_id → user` create a real
 * ordering constraint that no relationship line in the diagram records. Seeding
 * by the declared graph alone put the child first and every insert was rejected
 * for a missing required parent.
 */
export function topologicalEntities(): EntityMeta[] {
  const byName = new Map(entities.map((e) => [e.name, e]));
  const dependencies = new Map<string, Set<string>>();

  for (const entity of entities) {
    dependencies.set(entity.name, new Set());
  }
  for (const entity of entities) {
    for (const fk of foreignKeyFields(entity)) {
      const parent = parentEntityForColumn(fk.name);
      if (parent && parent.name !== entity.name) {
        dependencies.get(entity.name)?.add(parent.name);
      }
    }
  }
  for (const rel of relationships) {
    // manyToOne / oneToOne: the source holds the FK, so the target must exist first.
    if (rel.cardinality === "manyToOne" || rel.cardinality === "oneToOne") {
      dependencies.get(rel.sourceEntity)?.add(rel.targetEntity);
    } else if (rel.cardinality === "oneToMany") {
      dependencies.get(rel.targetEntity)?.add(rel.sourceEntity);
    }
  }

  const ordered: EntityMeta[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();

  const visit = (name: string): void => {
    if (visited.has(name) || visiting.has(name)) return;
    visiting.add(name);
    for (const dep of dependencies.get(name) ?? []) {
      if (dep !== name) visit(dep);
    }
    visiting.delete(name);
    visited.add(name);
    const entity = byName.get(name);
    if (entity) ordered.push(entity);
  };

  for (const entity of entities) visit(entity.name);
  return ordered;
}
