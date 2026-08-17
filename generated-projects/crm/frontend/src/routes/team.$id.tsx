import { createFileRoute } from '@tanstack/react-router';
import { BusEntityDetailPage } from '@/components/admin/bus-entity-detail-page';

export const Route = createFileRoute('/team/$id')({
  component: TeamDetailPage,
});

// Generated thin wrapper — replace the component body below to build a fully
// custom detail window for this entity without touching the shared infrastructure.
function TeamDetailPage() {
  const { id } = Route.useParams();
  return <BusEntityDetailPage entityName="team" recordId={id} />;
}
