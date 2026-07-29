/** Kysely table interfaces — shared by db.config and database.service */

export interface ProjectsTable {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  icon_color: string;
  status: string;
  is_deleted: boolean;
  stack_type: string;
  stack_version: string;
  port: number;
  base_url: string | null;
  database_url: string | null;
  database_type: string;
  database_schema: string | null;
  environment_variables: string | null;
  secrets: string | null;
  generated_path: string | null;
  output_directory: string | null;
  build_config: string | null;
  is_typescript: boolean;
  is_tailwind: boolean;
  deployment_status: string | null;
  deployment_url: string | null;
  uptime: string | null;
  owner_user_id: string | null;
  target_db_connection: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectMembersTable {
  id: string;
  project_id: string;
  user_id: string;
  permission: string;
  created_at: string;
}

export interface ErdVersionsTable {
  id: string;
  project_id: string;
  version_number: number;
  mermaid_code: string;
  description: string | null;
  is_current: boolean;
  validation_errors: string | null;
  parsed_schema: string | null;
  entity_count: number;
  relationship_count: number;
  ai_suggestions: string | null;
  ai_enhanced: boolean;
  import_source: string | null;
  import_metadata: string | null;
  created_by: string | null;
  commit_message: string | null;
  change_summary: string | null;
  created_at: string;
}

export interface WorkflowsTable {
  id: string;
  project_id: string;
  name: string;
  service_name: string;
  workflow_type: string;
  mermaid_code: string;
  description: string | null;
  extension_points: string | null;
  config: string | null;
  triggers: string | null;
  conditions: string | null;
  generated_code: string | null;
  code_language: string;
  status: string;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
  last_executed_at: string | null;
  hook_definitions: string | null;
  flowchart_code: string | null;
  generated_hook_code: string | null;
  is_draft: boolean;
}

export interface GenerationHistoryTable {
  id: string;
  project_id: string;
  stack_type: string;
  stack_version: string | null;
  generation_options: string | null;
  status: string;
  progress: number;
  current_step: string | null;
  generated_path: string | null;
  output_structure: string | null;
  port: number | null;
  file_manifest: string | null;
  entry_points: string | null;
  build_command: string | null;
  start_command: string | null;
  install_command: string | null;
  dependencies: string | null;
  dev_dependencies: string | null;
  environment_config: string | null;
  docker_config: string | null;
  logs: string | null;
  error_message: string | null;
  warnings: string | null;
  files_generated: number;
  total_size_bytes: number;
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
}

export interface DeploymentsTable {
  id: string;
  project_id: string;
  status: string;
  environment: string;
  deployment_url: string | null;
  port: number;
  host: string;
  process_id: string | null;
  process_command: string | null;
  uptime: string | null;
  uptime_seconds: number | null;
  last_health_check: string | null;
  health_status: string | null;
  resource_usage: string | null;
  deployment_config: string | null;
  auto_restart: boolean;
  restart_count: number;
  stdout_log: string | null;
  stderr_log: string | null;
  started_at: string | null;
  stopped_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface EntitiesTable {
  id: string;
  project_id: string;
  erd_version_id: string | null;
  name: string;
  display_name: string | null;
  type: string;
  description: string | null;
  schema: string | null;
  fields: string | null;
  relationships: string | null;
  generate_api: boolean;
  generate_ui: boolean;
  generate_crud: boolean;
  created_at: string;
  updated_at: string;
}

export interface SettingsTable {
  key: string;
  value: string | null;
  type: string;
  description: string | null;
  updated_at: string;
}

export interface AuthUsersTable {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  emailVerified: boolean;
  status: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthSessionsTable {
  id: string;
  userId: string;
  token: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthAccountsTable {
  id: string;
  userId: string;
  provider: string;
  providerAccountId: string;
  refreshToken: string | null;
  accessToken: string | null;
  expiresAt: number | null;
  createdAt: string;
}

export interface AuthVerificationTokensTable {
  token: string;
  email: string;
  expires: string;
  createdAt: string;
}

export interface RulesTable {
  id: string;
  entity_name: string;
  rule_name: string;
  operation: string;
  jdm_content: string;
  created_at: string;
  updated_at: string;
}

export interface Database {
  projects: ProjectsTable;
  project_members: ProjectMembersTable;
  erd_versions: ErdVersionsTable;
  workflows: WorkflowsTable;
  generation_history: GenerationHistoryTable;
  deployments: DeploymentsTable;
  entities: EntitiesTable;
  settings: SettingsTable;
  rules: RulesTable;
  auth_users: AuthUsersTable;
  auth_sessions: AuthSessionsTable;
  auth_accounts: AuthAccountsTable;
  auth_verification_tokens: AuthVerificationTokensTable;
}
