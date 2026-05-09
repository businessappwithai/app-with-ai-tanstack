/**
 * Authentication Service
 * Wrapper around Better Auth providing business logic for auth operations
 */

import type { Kysely } from "kysely";
import type {
  AuthSession,
  EntityOperation,
  IAuthService,
  LoginCredentials,
  PermissionCheck,
  RegisterData,
  UserRole,
} from "./auth.types.js";
import { createBetterAuth, validateAuthOptions } from "./better-auth.config.js";
import { createKyselyAdapter } from "./better-auth-adapter.js";

/**
 * Auth service implementation
 */
export class AuthService implements IAuthService {
  private auth: ReturnType<typeof createBetterAuth>;

  constructor(config: {
    db: Kysely<any>;
    secret: string;
    baseURL: string;
    sessionMaxAge?: number;
  }) {
    validateAuthOptions({
      secret: config.secret,
      baseURL: config.baseURL,
      database: createKyselyAdapter(config.db),
      sessionMaxAge: config.sessionMaxAge,
    });

    this.auth = createBetterAuth({
      secret: config.secret,
      baseURL: config.baseURL,
      database: createKyselyAdapter(config.db),
      sessionMaxAge: config.sessionMaxAge ?? 60 * 60 * 24 * 7, // 7 days
    });
  }

  /**
   * Login with email and password
   */
  async login(credentials: LoginCredentials): Promise<AuthSession> {
    // Better Auth API returns a dynamic response object — cast to access data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = (await this.auth.api.signInEmail({
      body: credentials,
    })) as any; // eslint-disable-line @typescript-eslint/no-explicit-any

    if (!result) {
      throw new Error("INVALID_EMAIL_PASSWORD");
    }

    if (result.error) {
      throw new Error(result.error.message || "LOGIN_FAILED");
    }

    return result.data.session as AuthSession;
  }

  /**
   * Register new user
   */
  async register(data: RegisterData): Promise<AuthSession> {
    // Better Auth API returns a dynamic response object — cast to access data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = (await this.auth.api.signUpEmail({
      body: {
        email: data.email,
        password: data.password,
        name: data.name,
      },
    })) as any; // eslint-disable-line @typescript-eslint/no-explicit-any

    if (!result) {
      throw new Error("REGISTRATION_FAILED");
    }

    if (result.error) {
      throw new Error(result.error.message || "REGISTRATION_FAILED");
    }

    // Assign default role if provided
    if (data.role) {
      const userId = (result.data.user as { id: string }).id;
      await this.assignRole(userId, data.role);
    }

    return result.data.session as AuthSession;
  }

  /**
   * Logout user (invalidate session)
   */
  async logout(sessionToken: string): Promise<void> {
    const result = await this.auth.api.signOut({
      headers: {
        authorization: `Bearer ${sessionToken}`,
      },
    });

    if (!result) {
      throw new Error("LOGOUT_FAILED");
    }
  }

  /**
   * Get session by token
   */
  async getSession(sessionToken: string): Promise<AuthSession | null> {
    // Better Auth API returns a dynamic response object — cast to access data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = (await this.auth.api.getSession({
      headers: {
        authorization: `Bearer ${sessionToken}`,
      },
    })) as any; // eslint-disable-line @typescript-eslint/no-explicit-any

    if (!result || !result.data) {
      return null;
    }

    return result.data.session as AuthSession;
  }

  /**
   * Check if user has required role(s)
   * Note: This is a placeholder that returns true for admin context
   * Real implementation should use Better Auth's role system
   */
  async hasRole(_userId: string, _roles: UserRole | UserRole[]): Promise<boolean> {
    // TODO: Implement role checking via Better Auth
    // For now, return true to allow admin access
    return true;
  }

  /**
   * Check if user has permission for entity operation
   * Note: This is a placeholder implementation
   * Real implementation should use Better Auth's permission system
   */
  async hasPermission(
    _userId: string,
    _entityName: string,
    _operation: EntityOperation
  ): Promise<PermissionCheck> {
    // TODO: Implement permission checking via Better Auth
    // For now, allow all operations for authenticated users
    return { granted: true };
  }

  /**
   * Assign role to user
   */
  async assignRole(userId: string, role: UserRole): Promise<void> {
    // Get role ID
    const roleRecord = await this.db("ad_role").where("name", role).first();

    if (!roleRecord) {
      throw new Error(`ROLE_NOT_FOUND: ${role}`);
    }

    // Check if already assigned
    const existing = await this.db("ad_user_roles")
      .where({
        ad_user_id: userId,
        ad_role_id: roleRecord.ad_role_id,
      })
      .first();

    if (existing) {
      return; // Already assigned
    }

    // Assign role
    await this.db("ad_user_roles").insert({
      ad_user_id: userId,
      ad_role_id: roleRecord.ad_role_id,
      created_at: new Date(),
    });
  }

  /**
   * Remove role from user
   */
  async removeRole(userId: string, role: UserRole): Promise<void> {
    // Get role ID
    const roleRecord = await this.db("ad_role").where("name", role).first();

    if (!roleRecord) {
      throw new Error(`ROLE_NOT_FOUND: ${role}`);
    }

    // Remove role
    await this.db("ad_user_roles")
      .where({
        ad_user_id: userId,
        ad_role_id: roleRecord.ad_role_id,
      })
      .delete();
  }

  /**
   * Get user roles
   */
  async getUserRoles(userId: string): Promise<UserRole[]> {
    const roles = await this.db("ad_user_roles as ur")
      .join("ad_role as r", "ur.ad_role_id", "r.ad_role_id")
      .where("ur.ad_user_id", userId)
      .pluck("r.name");

    return roles as UserRole[];
  }

}

/**
 * Create auth service instance
 */
export function createAuthService(config: {
  db: Kysely<any>;
  secret: string;
  baseURL: string;
  sessionMaxAge?: number;
}): AuthService {
  return new AuthService(config);
}
