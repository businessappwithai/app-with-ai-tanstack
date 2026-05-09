/**
 * OData Server Configuration
 *
 * Generated: 2026-02-09T13:00:26.928Z
 */

export const config = {
  project: {
    name: "openui5-odatav4-test-app",
    version: "1.0.0",
    description: "Generated application",
  },
  server: {
    port: parseInt(process.env.PORT || "3020", 10),
    odataPath: "/odata",
  },
  database: {
    type: "sqlite" as "sqlite" | "postgresql",
  },
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:8080",
    credentials: true,
  },
};

export default config;
