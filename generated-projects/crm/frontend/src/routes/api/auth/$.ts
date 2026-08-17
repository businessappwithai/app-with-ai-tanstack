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
 * Generated: 2026-08-17T16:41:43.708Z
 * Project: crm
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

const route = createAPIFileRoute('/api/auth/$')({
  GET: async ({ request, params }: { request: Request; params: Record<string, string> }) => {
    const path = params['_splat'] ?? ''
    try {
      return await proxyToBackend(request, `auth/${path}`)
    } catch {
      return noSession()
    }
  },
  POST: async ({ request, params }: { request: Request; params: Record<string, string> }) => {
    const path = params['_splat'] ?? ''
    try {
      return await proxyToBackend(request, `auth/${path}`)
    } catch (error) {
      return apiUnavailable(error, 'POST', `auth/${path}`)
    }
  },
})

// Both names, on purpose — see the note in ../$.ts.
export const APIRoute = route
export const Route = route
