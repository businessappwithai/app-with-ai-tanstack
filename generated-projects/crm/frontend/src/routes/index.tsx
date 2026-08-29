/**
 * Home Page - Redirect to Dashboard
 *
 * Automatically redirects to the main dashboard page.
 *
 * Generated: 2026-08-29T04:45:22.025Z
 */

import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    throw redirect({ to: '/dashboard' });
  },
  component: () => (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
    </div>
  ),
});
