import { createFileRoute } from '@tanstack/react-router'
/**
 * Better Auth, on the front end's own origin.
 *
 * Same forwarding as the sibling /api/$ route — the reasoning is in
 * src/lib/api-proxy.ts — with one addition: when the API cannot be reached, a
 * session lookup answers "nobody is signed in" rather than an error. The login
 * page asks for the session before it renders, and an application that shows a
 * blank screen because the API is still starting is worse than one that shows
 * the login form.
 *
 * Better Auth checks the browser's Origin against its own trustedOrigins list
 * and rejects anything else, so the header is passed through untouched. On a
 * host other than localhost that means naming it: CORS_ORIGIN=http://your-host:4000.
 *
 * Generated: 2026-08-29T04:45:22.029Z
 * Project: my-app
 */

import { createAPIFileRoute } from '@tanstack/start/api'
// Relative rather than the `@/` alias — see the note in ../$.ts.
import { apiUnavailable, proxyToBackend } from '../../../lib/api-proxy'

/** No session, as a successful answer. What the login page needs to render. */
function noSession(): Response {
  return new Response(JSON.stringify({ user: null, session: null }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}

// The parameter types are left to inference on purpose. These handlers are
// written inline into the route, so TypeScript types them from the route's own
// signature — which is exact, and which an explicit `Record<string, string>`
// contradicted.
export const Route = createAPIFileRoute('/api/auth/$')({
  GET: async ({ request, params }) => {
    const path = params._splat ?? ''
    try {
      return await proxyToBackend(request, `auth/${path}`)
    } catch {
      return noSession()
    }
  },
  POST: async ({ request, params }) => {
    const path = params._splat ?? ''
    try {
      return await proxyToBackend(request, `auth/${path}`)
    } catch (error) {
      return apiUnavailable(error, 'POST', `auth/${path}`)
    }
  },
})

// Both names, on purpose, and `Route` is the one holding the call.
//
// The router registers an API route file by its `APIRoute` export and ignores
// anything else, so a file exporting only `Route` is silently absent — and an
// absent API route answers with the HTML of a missing page rather than a 404
// anyone would recognise as a routing problem. That is why both exist.
//
// Which of the two is the alias is not a style choice. The route generator
// parses these files and requires the `Route` export to be initialised by a
// call expression directly; assigning it from a local const failed that check
// with `expected "Route" export to be initialized by a CallExpression`, and
// a failed generate leaves no src/routeTree.gen.ts — which every route file
// imports, so a freshly generated frontend did not typecheck at all.
export const APIRoute = Route
