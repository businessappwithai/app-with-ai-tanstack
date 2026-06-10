import { createFileRoute } from '@tanstack/react-router';
import { ADDetailShell } from '@/components/admin/ad-detail-shell';
import { TABLE_LEVEL } from '@/components/admin/ad-window-configs';

export const Route = createFileRoute('/admin/table/$tableId/')({
  component: TableDetailPage,
});

function TableDetailPage() {
  const { tableId } = Route.useParams();
  return <ADDetailShell level={TABLE_LEVEL} recordId={tableId} parentContext={[]} />;
}
