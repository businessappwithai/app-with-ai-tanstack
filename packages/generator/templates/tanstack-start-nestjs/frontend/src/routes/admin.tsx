/**
 * Admin layout.
 *
 * Also where the model assistant lives. Mounted here rather than on individual
 * admin pages so it is available across all of them, and behind the same role
 * check as the rest of this section: the model describes the whole
 * application's data design, including entities a given user may have no
 * access to.
 *
 * Available, not mounted. The assistant's dependency tree — CopilotKit, and
 * through it streamdown, mermaid and shiki's grammars — is several megabytes of
 * JavaScript, and importing it here put all of it on the critical path of every
 * administrator screen. It now lives in `../components/admin/model-assistant`,
 * which nothing imports statically; the button below is what fetches it. An
 * administrator who never opens the assistant never downloads it.
 */

import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { lazy, Suspense, useState } from 'react';
import { Sparkles } from 'lucide-react';

export const Route = createFileRoute('/admin')({
  // Redirect non-admin users before the component tree renders
  beforeLoad: ({ context }: any) => {
    const role = (context as any)?.user?.role;
    if (role && role !== 'admin') {
      throw redirect({ to: '/dashboard' });
    }
  },
  component: AdminLayout,
});

const ModelAssistant = lazy(() => import('../components/admin/model-assistant'));

/**
 * What stands in for the assistant until somebody wants it.
 *
 * Deliberately a plain button rather than a preloaded sidebar: the point of the
 * split is that nothing of CopilotKit is fetched until this is clicked.
 */
function AssistantLauncher({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label="Open the model assistant"
      data-testid="assistant-launcher"
      className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-primary-foreground shadow-lg transition-colors hover:bg-primary/90"
    >
      <Sparkles className="h-4 w-4" />
      <span className="text-sm font-medium">Assistant</span>
    </button>
  );
}

function AdminLayout() {
  // One-way: once the assistant has been asked for, it stays mounted for the
  // rest of the session. Unmounting it would throw away the conversation, and
  // the chunk is already in the browser's cache either way.
  const [assistantRequested, setAssistantRequested] = useState(false);

  return (
    <>
      <Outlet />
      {assistantRequested ? (
        // No fallback: the launcher has already been replaced, and a spinner
        // where a sidebar is about to appear reads as a fault rather than a
        // download.
        <Suspense fallback={null}>
          <ModelAssistant />
        </Suspense>
      ) : (
        <AssistantLauncher onOpen={() => setAssistantRequested(true)} />
      )}
    </>
  );
}
