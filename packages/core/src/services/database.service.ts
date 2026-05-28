/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Database service for ERDwithAI
 * Handles all database operations using Kysely + PGLite
 * ALL project data stored in file-based PGLite at database/erdwithai.db
 */

import { PGlite } from "@electric-sql/pglite";
import { Kysely, sql } from "kysely";
import { PGliteDialect } from "kysely-pglite-dialect";
import { mkdirSync } from "fs";
import { resolve } from "path";

// Database schema types
interface ProjectsTable {
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
  created_at: string;
  updated_at: string;
}

interface ErdVersionsTable {
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

interface WorkflowsTable {
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

interface GenerationHistoryTable {
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

interface DeploymentsTable {
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

interface EntitiesTable {
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

interface SettingsTable {
  key: string;
  value: string | null;
  type: string;
  description: string | null;
  updated_at: string;
}

interface AuthUsersTable {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AuthSessionsTable {
  id: string;
  userId: string;
  token: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

interface AuthAccountsTable {
  id: string;
  userId: string;
  provider: string;
  providerAccountId: string;
  refreshToken: string | null;
  accessToken: string | null;
  expiresAt: number | null;
  createdAt: string;
}

interface AuthVerificationTokensTable {
  token: string;
  email: string;
  expires: string;
  createdAt: string;
}

interface Database {
  projects: ProjectsTable;
  erd_versions: ErdVersionsTable;
  workflows: WorkflowsTable;
  generation_history: GenerationHistoryTable;
  deployments: DeploymentsTable;
  entities: EntitiesTable;
  settings: SettingsTable;
  auth_users: AuthUsersTable;
  auth_sessions: AuthSessionsTable;
  auth_accounts: AuthAccountsTable;
  auth_verification_tokens: AuthVerificationTokensTable;
}

// Create a safe wrapper around Kysely to handle async PGLite initialization
class SafeDatabase {
  private db: Kysely<Database> | null = null;
  private error: Error | null = null;
  private initPromise: Promise<void> | null = null;

  private async doInit(): Promise<void> {
    try {
      const dbDir = resolve(process.cwd(), "database/erdwithai.db");
      mkdirSync(dbDir, { recursive: true });
      const pglite = new PGlite(dbDir);
      await pglite.waitReady;
      this.db = new Kysely<Database>({
        dialect: new PGliteDialect(pglite),
      });
      // Auto-run migrations so tables exist on first start
      await runMigrationsOn(this.db);
    } catch (err) {
      this.error = err instanceof Error ? err : new Error(String(err));
      console.error("Database initialization failed:", this.error.message);
      this.db = null;
    }
  }

  async getDb(): Promise<Kysely<Database> | null> {
    if (!this.initPromise) {
      this.initPromise = this.doInit();
    }
    await this.initPromise;
    return this.db;
  }

  getError(): Error | null {
    return this.error;
  }

  async destroy() {
    if (this.db) {
      await this.db.destroy();
      this.db = null;
    }
    this.initPromise = null;
  }
}

// Create singleton instance
let safeDb: SafeDatabase | null = null;

/**
 * Get or create the database connection (async - PGLite requires async init)
 */
export async function getDatabase(): Promise<Kysely<Database>> {
  if (!safeDb) {
    safeDb = new SafeDatabase();
  }

  const actualDb = await safeDb.getDb();
  const dbError = safeDb.getError();

  if (dbError) {
    console.warn("Database error during initialization:", dbError.message);
  }

  if (!actualDb) {
    throw new Error("Database failed to initialize");
  }

  return actualDb;
}

/**
 * Close the database connection
 */
export async function closeDatabase(): Promise<void> {
  if (safeDb) {
    await safeDb.destroy();
    safeDb = null;
  }
}

/**
 * Run database migrations
 * Creates comprehensive schema for ALL project data
 */
async function runMigrationsOn(database: Kysely<Database>): Promise<void> {
  await _runMigrationsImpl(database);
}

export async function runMigrations(): Promise<void> {
  const database = await getDatabase();
  await _runMigrationsImpl(database);
}

async function _runMigrationsImpl(database: Kysely<Database>): Promise<void> {

  // ============================================
  // PROJECTS TABLE - Core project particulars
  // ============================================
  try {
    await database.schema
      .createTable("projects")
      .ifNotExists()
      .addColumn("id", "text", (col) => col.primaryKey())
      .addColumn("name", "text", (col) => col.notNull())
      .addColumn("description", "text")
      .addColumn("icon", "text", (col) => col.defaultTo("📊"))
      .addColumn("icon_color", "text", (col) => col.defaultTo("#3b82f6"))
      .addColumn("status", "text", (col) => col.defaultTo("draft"))
      .addColumn("is_deleted", "boolean", (col) => col.defaultTo(false))
      .addColumn("stack_type", "text", (col) => col.defaultTo("nestjs"))
      .addColumn("stack_version", "text", (col) => col.defaultTo("latest"))
      .addColumn("port", "integer", (col) => col.defaultTo(4001))
      .addColumn("base_url", "text")
      .addColumn("database_url", "text")
      .addColumn("database_type", "text", (col) => col.defaultTo("sqlite"))
      .addColumn("database_schema", "text")
      .addColumn("environment_variables", "text")
      .addColumn("secrets", "text")
      .addColumn("generated_path", "text")
      .addColumn("output_directory", "text")
      .addColumn("build_config", "text")
      .addColumn("is_typescript", "boolean", (col) => col.defaultTo(true))
      .addColumn("is_tailwind", "boolean", (col) => col.defaultTo(true))
      .addColumn("deployment_status", "text")
      .addColumn("deployment_url", "text")
      .addColumn("uptime", "text")
      .addColumn("created_at", "text", (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`))
      .addColumn("updated_at", "text", (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`))
      .execute();
  } catch {
    // Table already exists, ignore
  }

  // ============================================
  // ERD VERSIONS TABLE - Complete history/versions
  // ============================================
  try {
    await database.schema
      .createTable("erd_versions")
      .ifNotExists()
      .addColumn("id", "text", (col) => col.primaryKey())
      .addColumn("project_id", "text", (col) => col.notNull())
      .addColumn("version_number", "integer", (col) => col.notNull())
      .addColumn("mermaid_code", "text", (col) => col.notNull())
      .addColumn("description", "text")
      .addColumn("is_current", "boolean", (col) => col.defaultTo(false))
      .addColumn("validation_errors", "text")
      .addColumn("parsed_schema", "text")
      .addColumn("entity_count", "integer", (col) => col.defaultTo(0))
      .addColumn("relationship_count", "integer", (col) => col.defaultTo(0))
      .addColumn("ai_suggestions", "text")
      .addColumn("ai_enhanced", "boolean", (col) => col.defaultTo(false))
      .addColumn("import_source", "text")
      .addColumn("import_metadata", "text")
      .addColumn("created_by", "text")
      .addColumn("commit_message", "text")
      .addColumn("change_summary", "text")
      .addColumn("created_at", "text", (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`))
      .execute();
  } catch {
    // Table already exists, ignore
  }

  // ============================================
  // WORKFLOWS TABLE - All workflow particulars
  // ============================================
  try {
    await database.schema
      .createTable("workflows")
      .ifNotExists()
      .addColumn("id", "text", (col) => col.primaryKey())
      .addColumn("project_id", "text", (col) => col.notNull())
      .addColumn("name", "text", (col) => col.notNull())
      .addColumn("service_name", "text", (col) => col.notNull())
      .addColumn("workflow_type", "text", (col) => col.defaultTo("crud"))
      .addColumn("mermaid_code", "text", (col) => col.notNull())
      .addColumn("description", "text")
      .addColumn("extension_points", "text")
      .addColumn("config", "text")
      .addColumn("triggers", "text")
      .addColumn("conditions", "text")
      .addColumn("generated_code", "text")
      .addColumn("code_language", "text", (col) => col.defaultTo("typescript"))
      .addColumn("status", "text", (col) => col.defaultTo("draft"))
      .addColumn("is_enabled", "boolean", (col) => col.defaultTo(true))
      .addColumn("hook_definitions", "text")
      .addColumn("flowchart_code", "text")
      .addColumn("generated_hook_code", "text")
      .addColumn("is_draft", "boolean", (col) => col.defaultTo(false))
      .addColumn("created_at", "text", (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`))
      .addColumn("updated_at", "text", (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`))
      .addColumn("last_executed_at", "text")
      .execute();
  } catch {
    // Table already exists, ignore
  }

  // ============================================
  // GENERATION HISTORY TABLE - Track all generations
  // ============================================
  try {
    await database.schema
      .createTable("generation_history")
      .ifNotExists()
      .addColumn("id", "text", (col) => col.primaryKey())
      .addColumn("project_id", "text", (col) => col.notNull())
      .addColumn("stack_type", "text", (col) => col.notNull())
      .addColumn("stack_version", "text")
      .addColumn("generation_options", "text")
      .addColumn("status", "text", (col) => col.notNull())
      .addColumn("progress", "integer", (col) => col.defaultTo(0))
      .addColumn("current_step", "text")
      .addColumn("generated_path", "text")
      .addColumn("output_structure", "text")
      .addColumn("port", "integer")
      .addColumn("file_manifest", "text")
      .addColumn("entry_points", "text")
      .addColumn("build_command", "text")
      .addColumn("start_command", "text")
      .addColumn("install_command", "text")
      .addColumn("dependencies", "text")
      .addColumn("dev_dependencies", "text")
      .addColumn("environment_config", "text")
      .addColumn("docker_config", "text")
      .addColumn("logs", "text")
      .addColumn("error_message", "text")
      .addColumn("warnings", "text")
      .addColumn("files_generated", "integer", (col) => col.defaultTo(0))
      .addColumn("total_size_bytes", "integer", (col) => col.defaultTo(0))
      .addColumn("started_at", "text", (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`))
      .addColumn("completed_at", "text")
      .addColumn("duration_ms", "integer")
      .execute();
  } catch {
    // Table already exists, ignore
  }

  // ============================================
  // DEPLOYMENTS TABLE - Deployment particulars
  // ============================================
  try {
    await database.schema
      .createTable("deployments")
      .ifNotExists()
      .addColumn("id", "text", (col) => col.primaryKey())
      .addColumn("project_id", "text", (col) => col.notNull())
      .addColumn("status", "text", (col) => col.defaultTo("stopped"))
      .addColumn("environment", "text", (col) => col.defaultTo("development"))
      .addColumn("deployment_url", "text")
      .addColumn("port", "integer", (col) => col.defaultTo(4001))
      .addColumn("host", "text", (col) => col.defaultTo("localhost"))
      .addColumn("process_id", "text")
      .addColumn("process_command", "text")
      .addColumn("uptime", "text")
      .addColumn("uptime_seconds", "integer")
      .addColumn("last_health_check", "text")
      .addColumn("health_status", "text")
      .addColumn("resource_usage", "text")
      .addColumn("deployment_config", "text")
      .addColumn("auto_restart", "boolean", (col) => col.defaultTo(false))
      .addColumn("restart_count", "integer", (col) => col.defaultTo(0))
      .addColumn("stdout_log", "text")
      .addColumn("stderr_log", "text")
      .addColumn("started_at", "text")
      .addColumn("stopped_at", "text")
      .addColumn("created_at", "text", (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`))
      .addColumn("updated_at", "text", (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`))
      .execute();
  } catch {
    // Table already exists, ignore
  }

  // ============================================
  // ENTITIES TABLE - Parsed schema entities
  // ============================================
  try {
    await database.schema
      .createTable("entities")
      .ifNotExists()
      .addColumn("id", "text", (col) => col.primaryKey())
      .addColumn("project_id", "text", (col) => col.notNull())
      .addColumn("erd_version_id", "text")
      .addColumn("name", "text", (col) => col.notNull())
      .addColumn("display_name", "text")
      .addColumn("type", "text", (col) => col.defaultTo("entity"))
      .addColumn("description", "text")
      .addColumn("schema", "text")
      .addColumn("fields", "text")
      .addColumn("relationships", "text")
      .addColumn("generate_api", "boolean", (col) => col.defaultTo(true))
      .addColumn("generate_ui", "boolean", (col) => col.defaultTo(true))
      .addColumn("generate_crud", "boolean", (col) => col.defaultTo(true))
      .addColumn("created_at", "text", (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`))
      .addColumn("updated_at", "text", (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`))
      .execute();
  } catch {
    // Table already exists, ignore
  }

  // ============================================
  // SETTINGS TABLE - Application settings
  // ============================================
  try {
    await database.schema
      .createTable("settings")
      .ifNotExists()
      .addColumn("key", "text", (col) => col.primaryKey())
      .addColumn("value", "text")
      .addColumn("type", "text", (col) => col.defaultTo("string"))
      .addColumn("description", "text")
      .addColumn("updated_at", "text", (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`))
      .execute();
  } catch {
    // Table already exists, ignore
  }

  // ============================================
  // BETTER AUTH TABLES - Authentication
  // ============================================

  // Auth Users Table
  try {
    await database.schema
      .createTable("auth_users")
      .ifNotExists()
      .addColumn("id", "text", (col) => col.primaryKey())
      .addColumn("email", "text", (col) => col.notNull().unique())
      .addColumn("name", "text")
      .addColumn("image", "text")
      .addColumn("emailVerified", "boolean", (col) => col.defaultTo(false))
      .addColumn("createdAt", "text", (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`))
      .addColumn("updatedAt", "text", (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`))
      .execute();
  } catch {
    // Table already exists, ignore
  }

  // Auth Sessions Table
  try {
    await database.schema
      .createTable("auth_sessions")
      .ifNotExists()
      .addColumn("id", "text", (col) => col.primaryKey())
      .addColumn("userId", "text", (col) => col.notNull())
      .addColumn("token", "text", (col) => col.notNull().unique())
      .addColumn("expiresAt", "text", (col) => col.notNull())
      .addColumn("createdAt", "text", (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`))
      .addColumn("updatedAt", "text", (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`))
      .execute();
  } catch {
    // Table already exists, ignore
  }

  // Auth Accounts Table (for OAuth)
  try {
    await database.schema
      .createTable("auth_accounts")
      .ifNotExists()
      .addColumn("id", "text", (col) => col.primaryKey())
      .addColumn("userId", "text", (col) => col.notNull())
      .addColumn("provider", "text", (col) => col.notNull())
      .addColumn("providerAccountId", "text", (col) => col.notNull())
      .addColumn("refreshToken", "text")
      .addColumn("accessToken", "text")
      .addColumn("expiresAt", "integer")
      .addColumn("createdAt", "text", (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`))
      .execute();
  } catch {
    // Table already exists, ignore
  }

  // Auth Verification Tokens Table
  try {
    await database.schema
      .createTable("auth_verification_tokens")
      .ifNotExists()
      .addColumn("token", "text", (col) => col.primaryKey())
      .addColumn("email", "text", (col) => col.notNull())
      .addColumn("expires", "text", (col) => col.notNull())
      .addColumn("createdAt", "text", (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`))
      .execute();
  } catch {
    // Table already exists, ignore
  }
}

/**
 * Transform database row to camelCase format
 */
function transformProject(dbProject: any): any {
  if (!dbProject) return null;

  return {
    id: dbProject.id,
    name: dbProject.name,
    description: dbProject.description,
    icon: dbProject.icon,
    iconColor: dbProject.icon_color,
    createdAt: dbProject.created_at,
    updatedAt: dbProject.updated_at,
    status: dbProject.status,
    isDeleted: dbProject.is_deleted,
    stackType: dbProject.stack_type,
    port: dbProject.port,
    databaseUrl: dbProject.database_url,
    generatedPath: dbProject.generated_path,
    deploymentStatus: dbProject.deployment_status,
    deploymentUrl: dbProject.deployment_url,
    uptime: dbProject.uptime,
  };
}

/**
 * Project database operations
 */
export const projectDb = {
  /**
   * Get all projects (excluding soft deleted)
   */
  async findAll(options?: { status?: string; includeDeleted?: boolean }) {
    try {
      const database = await getDatabase();
      let query = database.selectFrom("projects").selectAll();

      if (!options?.includeDeleted) {
        query = query.where("is_deleted", "=", false);
      }

      if (options?.status) {
        query = query.where("status", "=", options.status);
      }

      const dbProjects = await query.orderBy("updated_at", "desc").execute();

      return (dbProjects as any[]).map(transformProject);
    } catch (error) {
      console.warn(
        "Database unavailable, returning empty projects list:",
        error instanceof Error ? error.message : String(error)
      );
      return [];
    }
  },

  /**
   * Search projects by name or description
   */
  async search(searchTerm: string) {
    try {
      const database = await getDatabase();
      const dbProjects = await database
        .selectFrom("projects")
        .selectAll()
        .where("is_deleted", "=", false)
        .where((eb) =>
          eb(sql`lower(${eb.ref("name")})`, "like", `%${searchTerm.toLowerCase()}%`).or(
            sql`lower(${eb.ref("description")})`,
            "like",
            `%${searchTerm.toLowerCase()}%`
          )
        )
        .orderBy("updated_at", "desc")
        .execute();

      return (dbProjects as any[]).map(transformProject);
    } catch (error) {
      console.warn(
        "Database unavailable, returning empty search results:",
        error instanceof Error ? error.message : String(error)
      );
      return [];
    }
  },

  /**
   * Get a project by ID with ALL related data
   */
  async findById(id: string) {
    const database = await getDatabase();
    const dbProject = await database
      .selectFrom("projects")
      .selectAll()
      .where("id", "=", id)
      .where("is_deleted", "=", false)
      .executeTakeFirst();

    if (!dbProject) return null;

    const project = transformProject(dbProject);

    const [currentErdVersion, erdVersions, workflows, entities, latestGeneration, deployment] =
      await Promise.all([
        erdVersionDb.getCurrentErdVersion(id),
        erdVersionDb.getVersions(id),
        workflowDb.getWorkflows(id),
        entityDb.getByProject(id),
        generationHistoryDb.getLatest(id),
        deploymentDb.getDeployment(id),
      ]);

    return {
      ...project,
      erdCode: (currentErdVersion as any)?.mermaid_code,
      erdVersions,
      parsedSchema: (currentErdVersion as any)?.parsed_schema
        ? JSON.parse((currentErdVersion as any).parsed_schema)
        : undefined,
      workflows,
      entities,
      generatedPath: (latestGeneration as any)?.generated_path,
      fileManifest: (latestGeneration as any)?.file_manifest
        ? JSON.parse((latestGeneration as any).file_manifest)
        : undefined,
      generationStatus: (latestGeneration as any)?.status,
      generationOptions: (latestGeneration as any)?.generation_options
        ? JSON.parse((latestGeneration as any).generation_options)
        : undefined,
      deploymentStatus: (deployment as any)?.status,
      deploymentUrl: (deployment as any)?.deployment_url,
      uptime: (deployment as any)?.uptime,
      deploymentEnvironment: (deployment as any)?.environment,
      environmentVariables: (dbProject as any).environment_variables
        ? JSON.parse((dbProject as any).environment_variables)
        : {},
      buildConfig: (dbProject as any).build_config
        ? JSON.parse((dbProject as any).build_config)
        : {},
    };
  },

  /**
   * Create a new project
   */
  async create(data: {
    id: string;
    name: string;
    description?: string;
    icon?: string;
    icon_color?: string;
    stack_type?: string;
    stack_version?: string;
    port?: number;
    base_url?: string;
    database_url?: string;
    database_type?: string;
    environment_variables?: Record<string, any>;
    secrets?: Record<string, any>;
    generated_path?: string;
    output_directory?: string;
    build_config?: Record<string, any>;
    is_typescript?: boolean;
    is_tailwind?: boolean;
  }) {
    const database = await getDatabase();
    const [project] = await database
      .insertInto("projects")
      .values({
        id: data.id,
        name: data.name,
        description: data.description || null,
        icon: data.icon || "📊",
        icon_color: data.icon_color || "#3b82f6",
        stack_type: data.stack_type || "nestjs",
        stack_version: data.stack_version || "latest",
        port: data.port || 4001,
        base_url: data.base_url || `http://localhost:${data.port || 4001}`,
        database_url: data.database_url || null,
        database_type: data.database_type || "sqlite",
        environment_variables: JSON.stringify(data.environment_variables || {}),
        secrets: JSON.stringify(data.secrets || {}),
        generated_path: data.generated_path || null,
        output_directory: data.output_directory || null,
        build_config: JSON.stringify(data.build_config || {}),
        is_typescript: data.is_typescript !== false,
        is_tailwind: data.is_tailwind !== false,
        is_deleted: false,
        status: "draft",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any)
      .returningAll()
      .execute();

    return project;
  },

  /**
   * Update a project
   */
  async update(
    id: string,
    data: {
      name?: string;
      description?: string;
      icon?: string;
      icon_color?: string;
      status?: string;
      stack_type?: string;
      stack_version?: string;
      port?: number;
      base_url?: string;
      database_url?: string;
      database_type?: string;
      database_schema?: string;
      environment_variables?: Record<string, any>;
      secrets?: Record<string, any>;
      generated_path?: string;
      generatedPath?: string;
      output_directory?: string;
      build_config?: Record<string, any>;
      deployment_url?: string;
      deploymentStatus?: string;
      uptime?: string;
    }
  ) {
    const database = await getDatabase();
    const updateData: any = { updated_at: new Date().toISOString() };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.icon !== undefined) updateData.icon = data.icon;
    if (data.icon_color !== undefined) updateData.icon_color = data.icon_color;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.stack_type !== undefined) updateData.stack_type = data.stack_type;
    if (data.stack_version !== undefined) updateData.stack_version = data.stack_version;
    if (data.port !== undefined) updateData.port = data.port;
    if (data.base_url !== undefined) updateData.base_url = data.base_url;
    if (data.database_url !== undefined) updateData.database_url = data.database_url;
    if (data.database_type !== undefined) updateData.database_type = data.database_type;
    if (data.database_schema !== undefined) updateData.database_schema = data.database_schema;
    if (data.environment_variables !== undefined)
      updateData.environment_variables = JSON.stringify(data.environment_variables);
    if (data.secrets !== undefined) updateData.secrets = JSON.stringify(data.secrets);
    if (data.generated_path !== undefined) updateData.generated_path = data.generated_path;
    if (data.generatedPath !== undefined) updateData.generated_path = data.generatedPath;
    if (data.output_directory !== undefined) updateData.output_directory = data.output_directory;
    if (data.build_config !== undefined)
      updateData.build_config = JSON.stringify(data.build_config);
    if (data.deployment_url !== undefined) updateData.deployment_url = data.deployment_url;
    if (data.uptime !== undefined) updateData.uptime = data.uptime;
    if (data.deploymentStatus !== undefined) updateData.deployment_status = data.deploymentStatus;

    const [project] = await database
      .updateTable("projects")
      .set(updateData)
      .where("id", "=", id)
      .returningAll()
      .execute();

    return project;
  },

  /**
   * Soft delete a project
   */
  async softDelete(id: string) {
    const database = await getDatabase();
    await database
      .updateTable("projects")
      .set({ is_deleted: true })
      .where("id", "=", id)
      .execute();
  },

  /**
   * Permanently delete a project
   */
  async delete(id: string) {
    const database = await getDatabase();
    await database.deleteFrom("projects").where("id", "=", id).execute();
  },
};

/**
 * ERD Version database operations
 */
export const erdVersionDb = {
  /**
   * Get all versions for a project
   */
  async getVersions(projectId: string) {
    const database = await getDatabase();
    return await database
      .selectFrom("erd_versions")
      .selectAll()
      .where("project_id", "=", projectId)
      .orderBy("version_number", "desc")
      .execute();
  },

  /**
   * Get the current ERD version for a project
   */
  async getCurrentErdVersion(projectId: string) {
    const database = await getDatabase();
    return await database
      .selectFrom("erd_versions")
      .selectAll()
      .where("project_id", "=", projectId)
      .where("is_current", "=", true as any)
      .executeTakeFirst();
  },

  /**
   * Create a new ERD version
   */
  async createVersion(data: {
    project_id: string;
    mermaid_code: string;
    description?: string;
    is_current?: boolean;
    created_by?: string;
    validation_errors?: any[];
    parsed_schema?: any;
    entity_count?: number;
    relationship_count?: number;
    ai_suggestions?: any;
    ai_enhanced?: boolean;
    import_source?: string;
    import_metadata?: any;
    commit_message?: string;
    change_summary?: any;
  }) {
    const database = await getDatabase();

    const lastVersion = await database
      .selectFrom("erd_versions")
      .select("version_number")
      .where("project_id", "=", data.project_id)
      .orderBy("version_number", "desc")
      .executeTakeFirst();

    const versionNumber = ((lastVersion as any)?.version_number || 0) + 1;

    if (data.is_current) {
      await database
        .updateTable("erd_versions")
        .set({ is_current: false as any })
        .where("project_id", "=", data.project_id)
        .execute();
    }

    const [version] = await database
      .insertInto("erd_versions")
      .values({
        id: `erd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        project_id: data.project_id,
        version_number: versionNumber,
        mermaid_code: data.mermaid_code,
        description: data.description || null,
        is_current: data.is_current ?? true,
        created_by: data.created_by || null,
        validation_errors: JSON.stringify(data.validation_errors || []),
        parsed_schema: JSON.stringify(data.parsed_schema || {}),
        entity_count: data.entity_count || 0,
        relationship_count: data.relationship_count || 0,
        ai_suggestions: JSON.stringify(data.ai_suggestions || {}),
        ai_enhanced: data.ai_enhanced || false,
        import_source: data.import_source || null,
        import_metadata: JSON.stringify(data.import_metadata || {}),
        commit_message: data.commit_message || null,
        change_summary: JSON.stringify(data.change_summary || {}),
        created_at: new Date().toISOString(),
      } as any)
      .returningAll()
      .execute();

    return version;
  },

  /**
   * Update the current version for a project
   */
  async setCurrentVersion(versionId: string) {
    const database = await getDatabase();

    const version = await database
      .selectFrom("erd_versions")
      .selectAll()
      .where("id", "=", versionId)
      .executeTakeFirst();

    if (!version) return null;

    await database
      .updateTable("erd_versions")
      .set({ is_current: false as any })
      .where("project_id", "=", (version as any).project_id)
      .execute();

    await database
      .updateTable("erd_versions")
      .set({ is_current: true as any })
      .where("id", "=", versionId)
      .execute();

    return await database
      .selectFrom("erd_versions")
      .selectAll()
      .where("id", "=", versionId)
      .executeTakeFirst();
  },

  /**
   * Delete a version
   */
  async delete(versionId: string) {
    const database = await getDatabase();
    await database.deleteFrom("erd_versions").where("id", "=", versionId).execute();
  },
};

/**
 * Workflow database operations
 */
export const workflowDb = {
  /**
   * Get all workflows for a project
   */
  async getWorkflows(projectId: string) {
    const database = await getDatabase();
    return await database
      .selectFrom("workflows")
      .selectAll()
      .where("project_id", "=", projectId)
      .orderBy("created_at", "desc")
      .execute();
  },

  /**
   * Get a workflow by ID
   */
  async findById(id: string) {
    const database = await getDatabase();
    return await database
      .selectFrom("workflows")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();
  },

  /**
   * Create a workflow
   */
  async create(data: {
    project_id: string;
    name: string;
    service_name: string;
    workflow_type?: string;
    mermaid_code: string;
    description?: string;
    extension_points?: any;
    config?: any;
    triggers?: any;
    conditions?: any;
    generated_code?: string;
    code_language?: string;
  }) {
    const database = await getDatabase();
    const [workflow] = await database
      .insertInto("workflows")
      .values({
        id: `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        project_id: data.project_id,
        name: data.name,
        service_name: data.service_name,
        workflow_type: data.workflow_type || "crud",
        mermaid_code: data.mermaid_code,
        description: data.description || null,
        extension_points: JSON.stringify(data.extension_points || {}),
        config: JSON.stringify(data.config || {}),
        triggers: JSON.stringify(data.triggers || []),
        conditions: JSON.stringify(data.conditions || []),
        generated_code: data.generated_code || null,
        code_language: data.code_language || "typescript",
        status: "draft",
        is_enabled: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any)
      .returningAll()
      .execute();

    return workflow;
  },

  /**
   * Update a workflow
   */
  async update(
    id: string,
    data: {
      name?: string;
      service_name?: string;
      mermaid_code?: string;
      description?: string;
      status?: string;
      extension_points?: any;
      config?: any;
      triggers?: any;
      conditions?: any;
      generated_code?: string;
    }
  ) {
    const database = await getDatabase();
    const updateData: any = { updated_at: new Date().toISOString() };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.service_name !== undefined) updateData.service_name = data.service_name;
    if (data.mermaid_code !== undefined) updateData.mermaid_code = data.mermaid_code;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.extension_points !== undefined)
      updateData.extension_points = JSON.stringify(data.extension_points);
    if (data.config !== undefined) updateData.config = JSON.stringify(data.config);
    if (data.triggers !== undefined) updateData.triggers = JSON.stringify(data.triggers);
    if (data.conditions !== undefined) updateData.conditions = JSON.stringify(data.conditions);
    if (data.generated_code !== undefined) updateData.generated_code = data.generated_code;

    const [workflow] = await database
      .updateTable("workflows")
      .set(updateData)
      .where("id", "=", id)
      .returningAll()
      .execute();

    return workflow;
  },

  /**
   * Delete a workflow
   */
  async delete(id: string) {
    const database = await getDatabase();
    await database.deleteFrom("workflows").where("id", "=", id).execute();
  },
};

/**
 * Hook Workflow database operations
 */
export const hookWorkflowDb = {
  /**
   * Get hook workflow by service name
   */
  async getByService(projectId: string, serviceName: string) {
    const database = await getDatabase();
    const workflow = await database
      .selectFrom("workflows")
      .selectAll()
      .where("project_id", "=", projectId)
      .where("service_name", "=", serviceName)
      .where("workflow_type", "=", "hooks")
      .executeTakeFirst();

    if (!workflow) return null;

    return {
      ...workflow,
      hook_definitions: (workflow as any).hook_definitions
        ? JSON.parse((workflow as any).hook_definitions)
        : [],
      is_draft: (workflow as any).is_draft,
    };
  },

  /**
   * Get all hook workflows for a project
   */
  async getAllHookWorkflows(projectId: string) {
    const database = await getDatabase();
    const workflows = await database
      .selectFrom("workflows")
      .selectAll()
      .where("project_id", "=", projectId)
      .where("workflow_type", "=", "hooks")
      .orderBy("updated_at", "desc")
      .execute();

    return (workflows as any[]).map((workflow) => ({
      ...workflow,
      hook_definitions: workflow.hook_definitions ? JSON.parse(workflow.hook_definitions) : [],
      is_draft: Boolean(workflow.is_draft),
    }));
  },

  /**
   * Create or update hook workflow
   */
  async upsert(data: {
    projectId: string;
    serviceName: string;
    hooks: any[];
    flowchartCode: string;
    generatedHookCode?: string;
    isDraft: boolean;
    description?: string;
  }) {
    const database = await getDatabase();
    const existing = await this.getByService(data.projectId, data.serviceName);

    const workflowData = {
      project_id: data.projectId,
      name: `${data.serviceName} Hooks`,
      service_name: data.serviceName,
      workflow_type: "hooks",
      hook_definitions: JSON.stringify(data.hooks),
      flowchart_code: data.flowchartCode,
      generated_hook_code: data.generatedHookCode || null,
      is_draft: data.isDraft,
      description: data.description || null,
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      const [workflow] = await database
        .updateTable("workflows")
        .set(workflowData as any)
        .where("id", "=", (existing as any).id)
        .returningAll()
        .execute();

      return {
        ...workflow,
        hook_definitions: data.hooks,
        is_draft: data.isDraft,
      };
    } else {
      const [workflow] = await database
        .insertInto("workflows")
        .values({
          id: `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          ...workflowData,
          status: data.isDraft ? "draft" : "active",
          is_enabled: true,
          created_at: new Date().toISOString(),
        } as any)
        .returningAll()
        .execute();

      return {
        ...workflow,
        hook_definitions: data.hooks,
        is_draft: data.isDraft,
      };
    }
  },

  /**
   * Save draft workflow
   */
  async saveDraft(data: {
    projectId: string;
    serviceName: string;
    hooks: any[];
    flowchartCode: string;
  }) {
    return await this.upsert({
      ...data,
      isDraft: true,
    });
  },

  /**
   * Apply workflow (full save with validation)
   */
  async apply(data: {
    projectId: string;
    serviceName: string;
    hooks: any[];
    flowchartCode: string;
    generatedHookCode?: string;
    description?: string;
  }) {
    return await this.upsert({
      ...data,
      isDraft: false,
    });
  },

  /**
   * Delete hook workflow by service
   */
  async deleteByService(projectId: string, serviceName: string) {
    const database = await getDatabase();
    await database
      .deleteFrom("workflows")
      .where("project_id", "=", projectId)
      .where("service_name", "=", serviceName)
      .where("workflow_type", "=", "hooks")
      .execute();
  },

  /**
   * Save GoRules configuration for a specific workflow step
   */
  async saveGoRules(data: {
    projectId: string;
    serviceName: string;
    workflowId: string;
    hookType: string;
    rules: string;
  }) {
    const database = await getDatabase();
    const workflow = await this.getByService(data.projectId, data.serviceName);
    if (!workflow) {
      throw new Error(`Workflow not found for service ${data.serviceName}`);
    }

    const hookDefinitions = (workflow as any).hook_definitions || [];
    const hookIndex = hookDefinitions.findIndex((h: any) => h.type === data.hookType);
    if (hookIndex === -1) {
      throw new Error(`Hook of type ${data.hookType} not found in workflow`);
    }

    hookDefinitions[hookIndex].goRules = data.rules;

    const [updatedWorkflow] = await database
      .updateTable("workflows")
      .set({
        hook_definitions: JSON.stringify(hookDefinitions),
        updated_at: new Date().toISOString(),
      })
      .where("id", "=", (workflow as any).id)
      .returningAll()
      .execute();

    return {
      ...updatedWorkflow,
      hook_definitions: hookDefinitions,
      is_draft: (updatedWorkflow as any).is_draft,
    };
  },

  /**
   * Get GoRules configuration for a specific workflow step
   */
  async getGoRules(data: {
    projectId: string;
    serviceName: string;
    workflowId: string;
    hookType: string;
  }) {
    const workflow = await this.getByService(data.projectId, data.serviceName);
    if (!workflow) {
      return null;
    }

    const hookDefinitions = (workflow as any).hook_definitions || [];
    const hook = hookDefinitions.find((h: any) => h.type === data.hookType);
    if (!hook) {
      return null;
    }

    return {
      workflowId: data.workflowId,
      hookType: data.hookType,
      rules: hook.goRules || null,
      updatedAt: (workflow as any).updated_at,
    };
  },
};

/**
 * Generation History database operations
 */
export const generationHistoryDb = {
  /**
   * Get all generation history for a project
   */
  async getAll(projectId: string) {
    const database = await getDatabase();
    return await database
      .selectFrom("generation_history")
      .selectAll()
      .where("project_id", "=", projectId)
      .orderBy("started_at", "desc")
      .execute();
  },

  /**
   * Get the latest generation for a project
   */
  async getLatest(projectId: string) {
    const database = await getDatabase();
    return await database
      .selectFrom("generation_history")
      .selectAll()
      .where("project_id", "=", projectId)
      .orderBy("started_at", "desc")
      .executeTakeFirst();
  },

  /**
   * Get by status
   */
  async getByStatus(projectId: string, status: string) {
    const database = await getDatabase();
    return await database
      .selectFrom("generation_history")
      .selectAll()
      .where("project_id", "=", projectId)
      .where("status", "=", status)
      .orderBy("started_at", "desc")
      .execute();
  },

  /**
   * Create a generation record
   */
  async create(data: {
    project_id: string;
    stack_type: string;
    stack_version?: string;
    generation_options?: any;
    status: string;
  }) {
    const database = await getDatabase();
    const [generation] = await database
      .insertInto("generation_history")
      .values({
        id: `gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        project_id: data.project_id,
        stack_type: data.stack_type,
        stack_version: data.stack_version || null,
        generation_options: JSON.stringify(data.generation_options || {}),
        status: data.status,
        progress: 0,
        started_at: new Date().toISOString(),
      } as any)
      .returningAll()
      .execute();

    return generation;
  },

  /**
   * Update generation progress
   */
  async updateProgress(
    id: string,
    data: {
      progress?: number;
      current_step?: string;
      status?: string;
      logs?: string;
      error_message?: string;
      warnings?: any;
      files_generated?: number;
      total_size_bytes?: number;
    }
  ) {
    const database = await getDatabase();
    const updateData: any = {};

    if (data.progress !== undefined) updateData.progress = data.progress;
    if (data.current_step !== undefined) updateData.current_step = data.current_step;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.logs !== undefined) updateData.logs = data.logs;
    if (data.error_message !== undefined) updateData.error_message = data.error_message;
    if (data.warnings !== undefined) updateData.warnings = JSON.stringify(data.warnings);
    if (data.files_generated !== undefined) updateData.files_generated = data.files_generated;
    if (data.total_size_bytes !== undefined) updateData.total_size_bytes = data.total_size_bytes;

    const [generation] = await database
      .updateTable("generation_history")
      .set(updateData)
      .where("id", "=", id)
      .returningAll()
      .execute();

    return generation;
  },

  /**
   * Complete generation with output details
   */
  async complete(
    id: string,
    data: {
      generated_path: string;
      output_structure?: any;
      port?: number;
      file_manifest?: any;
      entry_points?: any;
      build_command?: string;
      start_command?: string;
      install_command?: string;
      dependencies?: any;
      dev_dependencies?: any;
      environment_config?: any;
      docker_config?: any;
      duration_ms?: number;
      files_generated?: number;
      total_size_bytes?: number;
    }
  ) {
    const database = await getDatabase();
    const updateData: any = {
      status: "completed",
      progress: 100,
      completed_at: new Date().toISOString(),
      ...data,
    };

    if (data.output_structure !== undefined)
      updateData.output_structure = JSON.stringify(data.output_structure);
    if (data.file_manifest !== undefined)
      updateData.file_manifest = JSON.stringify(data.file_manifest);
    if (data.entry_points !== undefined)
      updateData.entry_points = JSON.stringify(data.entry_points);
    if (data.dependencies !== undefined)
      updateData.dependencies = JSON.stringify(data.dependencies);
    if (data.dev_dependencies !== undefined)
      updateData.dev_dependencies = JSON.stringify(data.dev_dependencies);
    if (data.environment_config !== undefined)
      updateData.environment_config = JSON.stringify(data.environment_config);
    if (data.docker_config !== undefined)
      updateData.docker_config = JSON.stringify(data.docker_config);

    const [generation] = await database
      .updateTable("generation_history")
      .set(updateData)
      .where("id", "=", id)
      .returningAll()
      .execute();

    return generation;
  },

  /**
   * Mark generation as failed
   */
  async fail(id: string, errorMessage: string, logs?: string) {
    const database = await getDatabase();
    const [generation] = await database
      .updateTable("generation_history")
      .set({
        status: "failed",
        error_message: errorMessage,
        logs: logs || null,
        completed_at: new Date().toISOString(),
      })
      .where("id", "=", id)
      .returningAll()
      .execute();

    return generation;
  },
};

/**
 * Deployment database operations
 */
export const deploymentDb = {
  /**
   * Get deployment for a project
   */
  async getDeployment(projectId: string, environment: string = "development") {
    const database = await getDatabase();
    return await database
      .selectFrom("deployments")
      .selectAll()
      .where("project_id", "=", projectId)
      .where("environment", "=", environment)
      .executeTakeFirst();
  },

  /**
   * Get all deployments for a project
   */
  async getAllDeployments(projectId: string) {
    const database = await getDatabase();
    return await database
      .selectFrom("deployments")
      .selectAll()
      .where("project_id", "=", projectId)
      .orderBy("created_at", "desc")
      .execute();
  },

  /**
   * Create or update deployment
   */
  async upsert(data: {
    project_id: string;
    status: string;
    environment?: string;
    deployment_url?: string;
    port?: number;
    host?: string;
    process_id?: string;
    process_command?: string;
    uptime?: string;
    uptime_seconds?: number;
    deployment_config?: any;
    stdout_log?: string;
    stderr_log?: string;
  }) {
    const database = await getDatabase();
    const existing = await this.getDeployment(data.project_id, data.environment || "development");

    const updateData: any = {
      ...data,
      updated_at: new Date().toISOString(),
    };

    if (data.deployment_config !== undefined)
      updateData.deployment_config = JSON.stringify(data.deployment_config);

    if (existing) {
      if (data.status === "running" && (existing as any).status !== "running") {
        updateData.started_at = new Date().toISOString();
        updateData.restart_count = ((existing as any).restart_count || 0) + 1;
      } else if (data.status === "stopped" && (existing as any).status === "running") {
        updateData.stopped_at = new Date().toISOString();
        if ((existing as any).started_at) {
          const started = new Date((existing as any).started_at).getTime();
          const now = Date.now();
          updateData.uptime_seconds = Math.floor((now - started) / 1000);
        }
      }

      const [deployment] = await database
        .updateTable("deployments")
        .set(updateData)
        .where("id", "=", (existing as any).id)
        .returningAll()
        .execute();
      return deployment;
    } else {
      if (data.status === "running") {
        updateData.started_at = new Date().toISOString();
      }

      const [deployment] = await database
        .insertInto("deployments")
        .values({
          id: `dep_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          ...updateData,
          created_at: new Date().toISOString(),
        } as any)
        .returningAll()
        .execute();
      return deployment;
    }
  },

  /**
   * Update deployment health
   */
  async updateHealth(
    id: string,
    healthData: {
      health_status?: any;
      resource_usage?: any;
      last_health_check?: Date;
      stdout_log?: string;
      stderr_log?: string;
      uptime?: string;
      uptime_seconds?: number;
    }
  ) {
    const database = await getDatabase();
    const updateData: any = { ...healthData };

    if (healthData.health_status !== undefined)
      updateData.health_status = JSON.stringify(healthData.health_status);
    if (healthData.resource_usage !== undefined)
      updateData.resource_usage = JSON.stringify(healthData.resource_usage);

    const [deployment] = await database
      .updateTable("deployments")
      .set(updateData)
      .where("id", "=", id)
      .returningAll()
      .execute();

    return deployment;
  },

  /**
   * Stop and delete deployment
   */
  async delete(projectId: string, environment: string = "development") {
    const database = await getDatabase();

    await database
      .updateTable("deployments")
      .set({
        status: "stopped",
        stopped_at: new Date().toISOString(),
      })
      .where("project_id", "=", projectId)
      .where("environment", "=", environment)
      .execute();

    await database
      .deleteFrom("deployments")
      .where("project_id", "=", projectId)
      .where("environment", "=", environment)
      .execute();
  },
};

/**
 * Entity database operations
 */
export const entityDb = {
  /**
   * Get all entities for a project
   */
  async getByProject(projectId: string) {
    const database = await getDatabase();
    return await database
      .selectFrom("entities")
      .selectAll()
      .where("project_id", "=", projectId)
      .orderBy("name")
      .execute();
  },

  /**
   * Get entities for an ERD version
   */
  async getByErdVersion(erdVersionId: string) {
    const database = await getDatabase();
    return await database
      .selectFrom("entities")
      .selectAll()
      .where("erd_version_id", "=", erdVersionId)
      .orderBy("name")
      .execute();
  },

  /**
   * Create or update entities from schema
   */
  async upsert(data: {
    project_id: string;
    erd_version_id?: string;
    name: string;
    display_name?: string;
    type?: string;
    description?: string;
    schema?: any;
    fields?: any[];
    relationships?: any[];
    generate_api?: boolean;
    generate_ui?: boolean;
    generate_crud?: boolean;
  }) {
    const database = await getDatabase();

    const existing = await database
      .selectFrom("entities")
      .selectAll()
      .where("project_id", "=", data.project_id)
      .where("name", "=", data.name)
      .executeTakeFirst();

    if (existing) {
      const [entity] = await database
        .updateTable("entities")
        .set({
          ...data,
          schema: JSON.stringify(data.schema || {}),
          fields: JSON.stringify(data.fields || []),
          relationships: JSON.stringify(data.relationships || []),
          updated_at: new Date().toISOString(),
        } as any)
        .where("id", "=", (existing as any).id)
        .returningAll()
        .execute();
      return entity;
    } else {
      const [entity] = await database
        .insertInto("entities")
        .values({
          id: `ent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          ...data,
          schema: JSON.stringify(data.schema || {}),
          fields: JSON.stringify(data.fields || []),
          relationships: JSON.stringify(data.relationships || []),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as any)
        .returningAll()
        .execute();
      return entity;
    }
  },

  /**
   * Delete entities for a project
   */
  async deleteByProject(projectId: string) {
    const database = await getDatabase();
    await database.deleteFrom("entities").where("project_id", "=", projectId).execute();
  },
};

/**
 * Settings database operations
 */
export const settingsDb = {
  /**
   * Get a setting value
   */
  async get(key: string) {
    const database = await getDatabase();
    const setting = await database
      .selectFrom("settings")
      .selectAll()
      .where("key", "=", key)
      .executeTakeFirst();

    if (!setting) return null;

    switch ((setting as any).type) {
      case "number":
        return Number((setting as any).value);
      case "boolean":
        return (setting as any).value === "true";
      case "json":
        return JSON.parse((setting as any).value || "{}");
      default:
        return (setting as any).value;
    }
  },

  /**
   * Set a setting value
   */
  async set(key: string, value: any, type: string = "string", description?: string) {
    const database = await getDatabase();

    let stringValue: string;
    switch (type) {
      case "json":
        stringValue = JSON.stringify(value);
        break;
      case "boolean":
        stringValue = String(value);
        break;
      default:
        stringValue = String(value);
    }

    const existing = await database
      .selectFrom("settings")
      .selectAll()
      .where("key", "=", key)
      .executeTakeFirst();

    if (existing) {
      await database
        .updateTable("settings")
        .set({
          value: stringValue,
          type,
          description,
          updated_at: new Date().toISOString(),
        })
        .where("key", "=", key)
        .execute();
    } else {
      await database
        .insertInto("settings")
        .values({
          key,
          value: stringValue,
          type,
          description,
          updated_at: new Date().toISOString(),
        } as any)
        .execute();
    }
  },
};

export const dbOperations = {
  projects: projectDb,
  erdVersions: erdVersionDb,
  workflows: workflowDb,
  generationHistory: generationHistoryDb,
  deployments: deploymentDb,
  entities: entityDb,
  settings: settingsDb,
};
