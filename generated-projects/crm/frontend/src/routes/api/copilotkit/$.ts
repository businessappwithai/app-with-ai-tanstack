import { createFileRoute } from '@tanstack/react-router'
/**
 * The assistant's sub-paths.
 *
 * The runtime itself lives in src/lib/copilot-runtime.ts, and the address the
 * client actually posts to — /api/copilotkit, with nothing after it — is served
 * by ../$.ts, because a splat route cannot match an empty tail. This file
 * exists for the sub-paths, which the router matches here first by virtue of
 * having more segments; it hands them to the same runtime.
 *
 * Generated: 2026-08-29T04:45:22.030Z
 * Project: my-app
 */

import { createAPIFileRoute } from '@tanstack/start/api'
// Relative rather than the `@/` alias — see the note in ../$.ts.
import { handleCopilotRequest } from '../../../lib/copilot-runtime'

export const Route = createAPIFileRoute('/api/copilotkit/$')({
  GET: async ({ request }: { request: Request }) => handleCopilotRequest(request),
  POST: async ({ request }: { request: Request }) => handleCopilotRequest(request),
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
