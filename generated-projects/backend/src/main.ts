/**
 * NestJS Application Entry Point with Fastify Adapter
 *
 * Generated: 2026-05-31T11:58:03.706Z
 * Project: crm-app
 */

import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { initAuth, getAuth } from './lib/better-auth';

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

  // Global prefix for API routes
  app.setGlobalPrefix('api');

  // Mount better-auth HTTP handler at /api/auth/*
  // This handles all auth routes (sign-in, sign-up, sign-out, session, etc.)
  // and manages cookies/sessions correctly through better-auth's built-in handler.
  const port = process.env.PORT || 3000;
  const fastifyInstance = app.getHttpAdapter().getInstance();
  const auth = getAuth();

  fastifyInstance.all('/api/auth/*', async (request, reply) => {
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

  // Enable CORS - allow frontend origin (localhost:3000 for dev, configurable via env)
  const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';
  const allowedOrigins = corsOrigin.split(',').concat([
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3050',
    'http://localhost:5173',
  ]);
  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Origin not allowed by CORS'), false);
      }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'If-Match', 'If-None-Match'],
    exposedHeaders: ['ETag', 'X-Total-Count'],
    credentials: true,
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
}

bootstrap().catch((err) => {
  console.error('Failed to start application:', err);
  process.exit(1);
});
