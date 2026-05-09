/**
 * OData V4 Server Entry Point
 * Using jaystack/odata-v4-server
 *
 * Generated: 2026-02-09T13:00:26.923Z
 * Project: openui5-odatav4-test-app
 */

import "reflect-metadata";
import cors from "cors";
import express from "express";
import { createServer } from "http";
import { ODataServer, odata } from "odata-v4-server";

import { config } from "./config/odata.config";
// Import controllers to register them via decorators
import { CUSTOMERController } from "./controllers/bus/BuscustomerController.controller";
import { ORDERController } from "./controllers/bus/BusorderController.controller";
import { ORDERITEMController } from "./controllers/bus/BusorderitemController.controller";
import { PRODUCTController } from "./controllers/bus/BusproductController.controller";
import { SysFieldController } from "./controllers/sys/sys-field.controller";
import { SysTableController } from "./controllers/sys/sys-table.controller";
import { closeDatabase, initializeDatabase } from "./database/connection";

// Create OData Server class with controller decorators
@odata.cors
@odata.controller(CUSTOMERController, true)
@odata.controller(ORDERController, true)
@odata.controller(ORDERITEMController, true)
@odata.controller(PRODUCTController, true)
@odata.controller(SysTableController, true)
@odata.controller(SysFieldController, true)
class AppODataServer extends ODataServer {}

async function bootstrap() {
  console.log("Starting openui5-odatav4-test-app OData V4 Server...");

  // Initialize database connection
  await initializeDatabase();

  // Create Express app
  const app = express();

  // CORS configuration
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN || "http://localhost:8080",
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: [
        "Content-Type",
        "Authorization",
        "OData-Version",
        "OData-MaxVersion",
        "If-Match",
        "If-None-Match",
      ],
      exposedHeaders: ["OData-Version", "ETag", "Preference-Applied"],
      credentials: true,
    })
  );

  // Body parsing
  app.use(express.json());

  // Health check endpoint
  app.get("/health", (_req, res) => {
    res.json({ status: "healthy", timestamp: new Date().toISOString() });
  });

  // Create OData router using the server class
  // The create() method returns an Express router configured with OData endpoints
  const odataRouter = AppODataServer.create("/odata");

  // Mount OData router at the same path
  // Note: We mount at root '/' since the router already has the path configured
  app.use("/odata", odataRouter as unknown as express.RequestHandler);

  // Error handling middleware
  app.use(
    (
      err: Error & { statusCode?: number },
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction
    ) => {
      console.error("Server error:", err);
      const statusCode = err.statusCode || 500;
      res.status(statusCode).json({
        error: {
          code: statusCode === 500 ? "InternalServerError" : "BadRequest",
          message: err.message || "An unexpected error occurred",
        },
      });
    }
  );

  // Start server
  const port = config.server.port;
  const httpServer = createServer(app);

  httpServer.listen(port, () => {
    console.log(`OData V4 Server running at http://localhost:${port}`);
    console.log(`$metadata available at http://localhost:${port}/odata/$metadata`);
    console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  });

  // Graceful shutdown
  process.on("SIGTERM", async () => {
    console.log("SIGTERM received. Shutting down gracefully...");
    httpServer.close(async () => {
      console.log("HTTP server closed");
      await closeDatabase();
      process.exit(0);
    });
  });
}

bootstrap().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
