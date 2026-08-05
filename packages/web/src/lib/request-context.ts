/**
 * Reading the incoming request from code that runs on both sides.
 *
 * A route's `beforeLoad` runs on the server for the first paint and in the
 * browser for every navigation after it. On the server the session cookie has
 * to be forwarded by hand — there is no browser to attach it — and the fetch
 * needs an absolute URL. In the browser both are automatic.
 *
 * Importing `@tanstack/react-start/server` to get at that request is what the
 * bundler's import protection exists to stop: the specifier appears in a file
 * that is part of the client graph, and a production build fails on it even
 * when the call is guarded by a `typeof window` check. `createIsomorphicFn`
 * is the supported way to say "these are two different implementations", and it
 * leaves the server one out of the client bundle entirely.
 */

import { createIsomorphicFn } from "@tanstack/react-start";

export interface RequestContext {
  /** Origin to prefix API paths with. Empty in the browser, where relative works. */
  baseUrl: string;
  /** Fetch options carrying the caller's cookies. Empty in the browser. */
  fetchInit: RequestInit;
}

const EMPTY: RequestContext = { baseUrl: "", fetchInit: {} };

/**
 * What a same-origin API call from a loader needs in order to be authenticated.
 *
 * Falls back to `VITE_APP_URL` when there is no ambient request — prerendering
 * and tests both call loaders with nothing in flight, and returning a relative
 * URL there produces a fetch against the process's cwd.
 */
export const requestContext = createIsomorphicFn()
  .client((): RequestContext => EMPTY)
  .server((): RequestContext => {
    try {
      // Required lazily: this module is imported by client code too, and the
      // server entry should not be pulled in merely by importing the helper.
      const { getRequest } = require("@tanstack/react-start/server") as {
        getRequest: () => Request | undefined;
      };
      const request = getRequest();
      if (!request) return fallback();

      const cookie = request.headers.get("cookie") ?? "";
      return {
        baseUrl: new URL(request.url).origin,
        fetchInit: cookie ? { headers: { cookie } } : {},
      };
    } catch {
      return fallback();
    }
  });

function fallback(): RequestContext {
  return {
    baseUrl: process.env.VITE_APP_URL ?? "http://localhost:3000",
    fetchInit: {},
  };
}
