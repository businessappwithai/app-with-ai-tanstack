// app.config.ts
import { defineConfig } from "@tanstack/start/config";
var app_config_default = defineConfig({
  tsr: {
    appDirectory: "src",
    routesDirectory: "src/routes",
    generatedRouteTree: "src/routeTree.gen.ts",
    quoteStyle: "single",
    semicolons: false
  },
  server: {
    preset: "node-server"
  }
});
export {
  app_config_default as default
};
