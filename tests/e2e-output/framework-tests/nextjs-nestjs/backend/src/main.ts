/**
 * NestJS Application Entry Point with Fastify Adapter
 *
 * Generated: 2026-03-20T16:41:26.572Z
 * Project: nextjs-nestjs-test-app
 */

import { Logger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";

async function bootstrap() {
  const logger = new Logger("Bootstrap");

  // Create NestJS app with Fastify adapter for high performance
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: process.env.NODE_ENV === "development",
    })
  );

  // Global prefix for API routes
  app.setGlobalPrefix("api");

  // Enable CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3001",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "If-Match", "If-None-Match"],
    exposedHeaders: ["ETag", "X-Total-Count"],
    credentials: true,
  });

  // Global validation pipe with Zod-style validation
  // Note: forbidNonWhitelisted is disabled to support dynamic business entity endpoints
  // that use Record<string, any>. The business service handles proper validation.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false, // Disabled for dynamic entities
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    })
  );

  // Swagger API documentation
  if (process.env.NODE_ENV !== "production") {
    const config = new DocumentBuilder()
      .setTitle("nextjs-nestjs-test-app API")
      .setDescription("Generated application")
      .setVersion("1.0.0")
      .addBearerAuth()
      .addTag("sys", "System/Dictionary endpoints")
      .addTag("bus", "Business entity endpoints")
      .addTag("auth", "Authentication endpoints")
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup("api/docs", app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });

    logger.log("Swagger documentation available at /api/docs");
  }

  // Start server
  const port = process.env.PORT || 3010;
  const host = process.env.HOST || "0.0.0.0";

  await app.listen(port, host);

  logger.log(`Application running on: ${await app.getUrl()}`);
  logger.log(`Environment: ${process.env.NODE_ENV || "development"}`);
}

bootstrap().catch((err) => {
  console.error("Failed to start application:", err);
  process.exit(1);
});
