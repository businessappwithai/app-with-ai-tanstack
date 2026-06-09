import { createFileRoute } from '@tanstack/react-router';
import { ADWindowShell } from '@/components/admin/ad-window-shell';
import { WINDOW_TAB_FIELD_CONFIG } from '@/components/admin/ad-window-configs';

export const Route = createFileRoute('/admin/windows')({
  component: WindowTabFieldPage,
});

function WindowTabFieldPage() {
  return <ADWindowShell config={WINDOW_TAB_FIELD_CONFIG} />;
}
