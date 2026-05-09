import { Mastra } from "@mastra/core/mastra";
import { LibSQLStore } from "@mastra/libsql";
import { PinoLogger } from "@mastra/loggers";
import { codeAgent } from "./agents/code-agent";

export const mastra = new Mastra({
  agents: { codeAgent },
  storage: new LibSQLStore({ id: "mastra-storage", url: "file:../../../../mastra.db" }),
  logger: new PinoLogger({
    name: "Mastra",
    level: process.env.NODE_ENV === "production" ? "info" : "debug",
  }),
});

// Export the code agent for direct access
export { codeAgent };
