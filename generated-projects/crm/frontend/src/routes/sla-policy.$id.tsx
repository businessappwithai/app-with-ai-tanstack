import { createFileRoute } from '@tanstack/react-router';
import { BusEntityDetailPage } from '@/components/admin/bus-entity-detail-page';

export const Route = createFileRoute('/sla-policy/$id')({
  component: SlaPolicyDetailPage,
});

// Generated thin wrapper — replace the component body below to build a fully
// custom detail window for this entity without touching the shared infrastructure.
function SlaPolicyDetailPage() {
  const { id } = Route.useParams();
  return <BusEntityDetailPage entityName="sla_policy" recordId={id} />;
}
