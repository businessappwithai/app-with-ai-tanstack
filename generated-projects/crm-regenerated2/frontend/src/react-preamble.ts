// React Refresh preamble for dev mode.
// Must run before any React component module is loaded.
// Mirrors what @vitejs/plugin-react normally injects into HTML.
import RefreshRuntime from '/@react-refresh';
RefreshRuntime.injectIntoGlobalHook(window);
(window as any).$RefreshReg$ = () => {};
(window as any).$RefreshSig$ = () => (type: unknown) => type;
(window as any).__vite_plugin_react_preamble_installed__ = true;
