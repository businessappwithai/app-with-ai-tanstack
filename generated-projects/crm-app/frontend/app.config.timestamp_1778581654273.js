// app.config.ts
import { defineConfig } from "@tanstack/start/config";
import path from "path";
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
  },
  react: {
    jsxRuntime: "automatic",
    jsxImportSource: "react"
  },
  vite: {
    esbuild: {
      jsx: "automatic",
      jsxImportSource: "react"
    },
    resolve: {
      alias: {
        "@": path.resolve("./src")
      }
    },
    ssr: {
      noExternal: true
    }
  }
});
export {
  app_config_default as default
};
