import { createFileRoute } from '@tanstack/react-router';
import { BusEntityDetailPage } from '@/components/admin/bus-entity-detail-page';

export const Route = createFileRoute('/support-case/$id')({
  component: SupportCaseDetailPage,
});

// Generated thin wrapper — replace the component body below to build a fully
// custom detail window for this entity without touching the shared infrastructure.
function SupportCaseDetailPage() {
  const { id } = Route.useParams();
  return <BusEntityDetailPage entityName="support_case" recordId={id} />;
}
