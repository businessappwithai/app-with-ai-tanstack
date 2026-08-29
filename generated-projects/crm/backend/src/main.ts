/**
 * NestJS Application Entry Point with Fastify Adapter
 *
 * Generated: 2026-08-29T04:45:21.646Z
 * Project: my-app
 */

// Loaded before anything else is imported. Nest's ConfigModule only runs once
// AppModule is being constructed, and modules imported below read
// `process.env` at their own load time — so without this, whether a variable
// is visible depends on import order rather than on being present in .env.
//
// The file is found by walking up rather than by a fixed `../`. This module
// runs from `src/` under `bun run src/main.ts` but from `dist/src/` after a
// Nest build, so any fixed depth is wrong in one of the two — which is how
// ELECTRIC_URL could sit in .env and still read as unset in a built server.
import { config as loadEnv } from 'dotenv';
import * as nodeFs from 'fs';
import * as nodePath from 'path';

function loadEnvFiles(): void {
  let dir = __dirname;
  for (let depth = 0; depth < 5; depth++) {
    if (nodeFs.existsSync(nodePath.join(dir, '.env'))) {
      loadEnv({ path: nodePath.join(dir, '.env') });
      loadEnv({ path: nodePath.join(dir, '.env.local'), override: true });
      return;
    }
    const parent = nodePath.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
}

loadEnvFiles();

import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe, Logger } from '@nestjs/common';
import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import { AppModule } from './app.module';
import { initAuth, getAuth } from './lib/better-auth';
import { AuditService } from './modules/audit/audit.service';

async function ensureAdminUser(logger: Logger) {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@admin.com';
  // Must satisfy the `minPasswordLength` in src/lib/better-auth.ts. A shorter
  // default is rejected at sign-in with "Invalid email or password", which
  // reads as a wrong password rather than a password the server never allowed.
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

  const pool = process.env.DATABASE_URL
    ? new Pool({ connectionString: process.env.DATABASE_URL })
    : new Pool({
        host: process.env.DB_HOST ?? '127.0.0.1',
        port: Number(process.env.DB_PORT ?? 5432),
        user: process.env.DB_USER ?? process.env.USER ?? 'my_app',
        password: process.env.DB_PASSWORD ?? '',
        database: process.env.DB_NAME ?? 'my_app',
      });

  const db = new Kysely<any>({ dialect: new PostgresDialect({ pool }) });

  try {
    const auth = getAuth();

    // 1. Ensure Better Auth user exists with admin role
    let baUser = await db.selectFrom('user').select(['id', 'role', 'sysUserId']).where('email', '=', adminEmail).executeTakeFirst();

    if (!baUser) {
      await auth.api.signUpEmail({ body: { email: adminEmail, password: adminPassword, name: 'Admin User' } });
      baUser = await db.selectFrom('user').select(['id', 'role', 'sysUserId']).where('email', '=', adminEmail).executeTakeFirst();
      logger.log(`Admin user created: ${adminEmail} (password: ${adminPassword})`);
    }

    if (!baUser) throw new Error('Could not find or create admin Better Auth user');

    if (baUser.role !== 'admin') {
      await db.updateTable('user').set({ role: 'admin' }).where('email', '=', adminEmail).execute();
    }

    // 2. Ensure sys_user record exists for admin
    let sysUser = await db.selectFrom('sys_user').select(['sys_user_id']).where('email', '=', adminEmail).executeTakeFirst();

    if (!sysUser) {
      const { randomUUID } = await import('crypto');
      const newSysUserId = randomUUID();
      await db.insertInto('sys_user').values({
        sys_user_id: newSysUserId,
        name: 'Admin User',
        email: adminEmail,
        password_hash: 'managed-by-better-auth',
        is_system_user: true,
        is_active: true,
        created_by: 'system',
        updated_by: 'system',
      }).execute();
      sysUser = { sys_user_id: newSysUserId };
      logger.log(`sys_user created for ${adminEmail}`);
    }

    // 3. Link sysUserId on the Better Auth user if not already set
    if (!baUser.sysUserId) {
      await db.updateTable('user').set({ sysUserId: sysUser.sys_user_id }).where('email', '=', adminEmail).execute();
    }

    // 4. Ensure Administrator role assignment (look up by name)
    const adminRole = await db.selectFrom('sys_role').select(['sys_role_id']).where('name', '=', 'Administrator').executeTakeFirst();

    if (adminRole) {
      const existing = await db.selectFrom('sys_user_roles')
        .select('sys_user_roles_id')
        .where('sys_user_id', '=', sysUser.sys_user_id)
        .where('sys_role_id', '=', adminRole.sys_role_id)
        .executeTakeFirst();

      if (!existing) {
        const { randomUUID } = await import('crypto');
        await db.insertInto('sys_user_roles').values({
          sys_user_roles_id: randomUUID(),
          sys_user_id: sysUser.sys_user_id,
          sys_role_id: adminRole.sys_role_id,
          entity_type: 'S',
          is_active: true,
          created_by: 'system',
          updated_by: 'system',
        }).execute();
        logger.log(`Administrator role assigned to sys_user ${adminEmail}`);
      }
    }

    logger.log(`Admin user ready: ${adminEmail} → sys_user ${sysUser.sys_user_id}`);
  } catch (err: any) {
    logger.warn(`Could not ensure admin user: ${err?.message ?? err}`);
  } finally {
    await db.destroy();
  }
}

/**
 * Record a sign-in, sign-out or sign-up on the audit trail.
 *
 * better-auth is mounted directly on Fastify to keep its cookie handling
 * intact, which puts it outside Nest's interceptor chain — so without this the
 * audit page showed every record change and not one login. Failures are
 * recorded too: a run of AUTH_LOGIN with success=false is what an attack looks
 * like from the trail.
 *
 * Never throws. An audit write must not be able to fail a login.
 */
async function recordAuthEvent(
  app: NestFastifyApplication,
  request: any,
  pathname: string,
  status: number,
): Promise<void> {
  const ACTIONS: Array<[RegExp, string]> = [
    [/sign-in/, 'AUTH_LOGIN'],
    [/sign-out/, 'AUTH_LOGOUT'],
    [/sign-up/, 'AUTH_REGISTER'],
    [/forget-password|reset-password/, 'AUTH_PASSWORD_RESET'],
    [/change-password/, 'AUTH_PASSWORD_CHANGE'],
    [/verify-email/, 'AUTH_EMAIL_VERIFY'],
  ];

  const matched = ACTIONS.find(([re]) => re.test(pathname));
  if (!matched) return;

  try {
    const audit = app.get(AuditService, { strict: false });
    if (!audit) return;

    const headers = request.headers ?? {};
    const body = typeof request.body === 'string' ? safeParse(request.body) : request.body;
    const success = status >= 200 && status < 400;

    await audit.log({
      user_id: null,
      user_name: null,
      // The only identifier available on a failed sign-in, and the one worth
      // having: it says which account was targeted.
      user_email: body?.email ?? null,
      session_id: null,
      action: matched[1],
      entity_type: 'auth',
      entity_id: null,
      before_value: null,
      after_value: null,
      changed_fields: [],
      ip_address:
        (headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
        request.socket?.remoteAddress ??
        null,
      user_agent: (headers['user-agent'] as string) ?? null,
      source: 'WEB_UI',
      request_id: (headers['x-request-id'] as string) ?? null,
      success,
      error_message: success ? null : `Authentication request failed with status ${status}`,
    } as any);
  } catch {
    // Swallowed on purpose — see the note above.
  }
}

function safeParse(value: string): any {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Initialize authentication system
  await initAuth();

  // Create NestJS app with Fastify adapter for high performance
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: process.env.NODE_ENV === 'development',
    }),
  );

  // Global prefix for every route, the Electric shape proxy included. It used
  // to be excluded so it sat at /v1/shape, which put it outside the front end's
  // /api forwarder — the browser could only reach it cross-origin, without the
  // session cookie the proxy needs to know which roles to scope a shape to.
  // Under the prefix it is same-origin and credentialed like every other call.
  app.setGlobalPrefix('api');

  const port = process.env.PORT || 4001;
  // Enable CORS BEFORE raw Fastify routes so all routes get CORS headers
  const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:4000';
  const allowedOrigins = [...new Set([
    ...corsOrigin.split(','),
    'http://localhost:4000',
    'http://localhost:4001',
    'http://localhost:3000',
    'http://localhost:5173',
  ])];
  app.enableCors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'If-Match', 'If-None-Match'],
    exposedHeaders: ['ETag', 'X-Total-Count'],
    credentials: true,
  });

  // Mount better-auth HTTP handler at /api/auth/*
  const fastifyInstance = app.getHttpAdapter().getInstance();
  const auth = getAuth();

  // Patch credentials header: @fastify/cors v9 with function-based origin does not reliably
  // emit Access-Control-Allow-Credentials: true. This onRequest hook fires after the CORS
  // plugin's own onRequest hook (since we add it after app.enableCors) and overwrites the header.
  fastifyInstance.addHook('onRequest', async (request, reply) => {
    const origin = request.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
      reply.header('Access-Control-Allow-Credentials', 'true');
    }
  });

  fastifyInstance.all('/api/auth/*', async (request, reply) => {
    // Let @fastify/cors handle OPTIONS preflight — forwarding to better-auth strips credentials header
    if (request.method === 'OPTIONS') {
      reply.status(204).send();
      return;
    }

    // No self-service accounts: an administrator creates them from the user
    // management screen. The block belongs here, on the public HTTP surface,
    // rather than on better-auth's `disableSignUp` — that flag also disables
    // `auth.api.signUpEmail`, which is how the admin endpoint writes the
    // credential, so setting it leaves no way to create anyone at all.
    if (request.url.includes('/sign-up')) {
      reply.status(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Accounts are created by an administrator, not by signing up.',
      });
      return;
    }
    try {
      const url = new URL(request.url, `http://localhost:${port}`);
      const headers = new Headers();
      for (const [key, value] of Object.entries(request.headers)) {
        if (value) {
          headers.set(key, Array.isArray(value) ? value.join(', ') : value);
        }
      }

      const init: RequestInit = { method: request.method, headers };
      if (request.body && !['GET', 'HEAD'].includes(request.method)) {
        init.body = typeof request.body === 'string'
          ? request.body
          : JSON.stringify(request.body);
      }

      const webResponse = await auth.handler(new Request(url.toString(), init));

      // Auth is mounted straight on Fastify, so Nest's audit interceptor never
      // sees it. Sign-in, sign-out and sign-up are the events an audit trail
      // exists for, so they are recorded here instead — including the failures,
      // which is where a break-in attempt shows up.
      void recordAuthEvent(app, request, url.pathname, webResponse.status);

      reply.status(webResponse.status);
      webResponse.headers.forEach((value, key) => {
        if (!['transfer-encoding', 'content-encoding'].includes(key.toLowerCase())) {
          reply.header(key, value);
        }
      });

      reply.send(await webResponse.text());
    } catch (error) {
      logger.error('Auth handler error:', error);
      reply.status(500).send({ error: 'Authentication service error' });
    }
  });

  // Global validation pipe for fallback validation
  // Primary validation approach: Zod schemas in sys, rules, and other structured modules
  // This pipe handles remaining class-validator decorators and dynamic entity validation.
  // Note: forbidNonWhitelisted is disabled to support dynamic business entity endpoints.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Start server
  const host = process.env.HOST || '0.0.0.0';

  await app.listen(port, host);

  logger.log(`Application running on: ${await app.getUrl()}`);
  logger.log(`Environment: ${process.env.NODE_ENV || 'development'}`);

  // Ensure the default admin user exists with the correct role
  await ensureAdminUser(logger);
}

bootstrap().catch((err) => {
  console.error('Failed to start application:', err);
  process.exit(1);
});
