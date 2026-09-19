/**
 * `/login` — the address people type, sent to the one that exists.
 *
 * The sign-in screen is at `/auth/login`. Nothing served `/login`, and because
 * `$entity.tsx` is a catch-all, the shorter path did not 404: it was read as an
 * entity named "login" and rendered an empty grid for a table that does not
 * exist. A sign-in link shared with the host trimmed off, or a habit from any
 * other application, landed there.
 *
 * A route rather than a redirect inside the catch-all, so the router resolves
 * it before ever reaching `$entity` — a static segment beats a dynamic one —
 * and nothing about entity resolution has to know this address is special.
 */

import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/login')({
  beforeLoad: () => {
    throw redirect({ to: '/auth/login' });
  },
});
