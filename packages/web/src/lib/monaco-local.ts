/**
 * Monaco, served by this application.
 *
 * The GoRules editor draws its code boxes — the Record schema, a function
 * node's source, the Simulator's request — with Monaco, and Monaco's loader
 * fetches itself from a public CDN unless an instance is already on `window`.
 * That put a third-party host between a person and their own rules: the boxes
 * sat on a spinner behind a firewall or offline. Importing it here makes Vite
 * bundle it and its workers beside the application, and handing the loader the
 * instance it asks for first means it never reaches for the network.
 *
 * Browser only. Import it from the same lazy chunk as the editor, never from a
 * module the server renders.
 */

import * as monaco from "monaco-editor";
import EditorWorker from "monaco-editor/editor/editor.worker?worker";
import JsonWorker from "monaco-editor/language/json/json.worker?worker";
import TypeScriptWorker from "monaco-editor/language/typescript/ts.worker?worker";

declare global {
  interface Window {
    monaco?: typeof monaco;
    MonacoEnvironment?: { getWorker: (moduleId: string, label: string) => Worker };
  }
}

if (typeof window !== "undefined" && !window.monaco) {
  window.MonacoEnvironment = {
    getWorker(_moduleId, label) {
      if (label === "json") return new JsonWorker();
      if (label === "typescript" || label === "javascript") return new TypeScriptWorker();
      return new EditorWorker();
    },
  };
  window.monaco = monaco;
}

export { monaco };
