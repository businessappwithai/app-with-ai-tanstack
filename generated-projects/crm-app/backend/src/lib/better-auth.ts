/**
 * BetterAuth Configuration
 *
 * Modern authentication for 
 * - Email/Password authentication
 * - Session management
 * - Role-based access control
 * - Integration with existing sys_user table
 */

import { betterAuth } from 'better-auth';
import { kyselyAdapter } from '@better-auth/kysely-adapter';
import { Kysely, PostgresDialect } from 'kysely';
import * as pg from 'pg';

// Create PostgreSQL connection using kysely
const authDb = new Kysely<unknown>({
  dialect: new PostgresDialect({
    pool: new pg.Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: '_auth',
      user: process.env.DB_USER || process.env.USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
    }),
  }),
});

export const auth = betterAuth({
  database: kyselyAdapter(authDb),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    sendResetPassword: async ({ user, url: _url }: { user: { email?: string; id: string; name: string }; url: string; token: string }) => {
      console.log('Password reset requested for:', user.email || user.id);
      // TODO: Integrate email service
    },
    sendVerificationEmail: async ({ user, url: _url }: { user: { email?: string; id: string; name: string }; url: string; token: string }) => {
      console.log('Verification email sent to:', user.email || user.id);
      // TODO: Integrate email service
    },
  },
  session: {
    expiresIn: 60 * 60 * 24, // 1 day
    updateAge: 60 * 60 * 12, // Update session every 12 hours
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes
    },
  },
  account: {
    accountLinking: {
      enabled: false,
    },
  },
  user: {
    additionalFields: {
      role: {
        type: 'string',
        required: false,
        defaultValue: 'user',
      },
      sysUserId: {
        type: 'string',
        required: false,
      },
    },
  },
  advanced: {
    cookiePrefix: '_app',
    crossSubDomainCookies: {
      enabled: false,
    },
  },
});

export type Session = typeof auth.$Infer.Session;
