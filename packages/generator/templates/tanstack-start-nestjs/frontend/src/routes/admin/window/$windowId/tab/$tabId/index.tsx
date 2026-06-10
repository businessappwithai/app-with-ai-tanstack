import { createFileRoute } from '@tanstack/react-router';
import { ADDetailShell } from '@/components/admin/ad-detail-shell';
import { WINDOW_LEVEL, TAB_LEVEL } from '@/components/admin/ad-window-configs';

export const Route = createFileRoute('/admin/window/$windowId/tab/$tabId/')({
  component: TabDetailPage,
});

function TabDetailPage() {
  const { windowId, tabId } = Route.useParams();
  return (
    <ADDetailShell
      level={TAB_LEVEL}
      recordId={tabId}
      parentContext={[{ level: WINDOW_LEVEL, id: windowId }]}
    />
  );
}
