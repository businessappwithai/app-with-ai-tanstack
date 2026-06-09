import { createFileRoute } from '@tanstack/react-router';
import { ADWindowShell } from '@/components/admin/ad-window-shell';
import { TABLE_AND_COLUMN_CONFIG } from '@/components/admin/ad-window-configs';

export const Route = createFileRoute('/admin/tables')({
  component: TableAndColumnPage,
});

function TableAndColumnPage() {
  return <ADWindowShell config={TABLE_AND_COLUMN_CONFIG} />;
}
