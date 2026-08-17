import { createFileRoute } from '@tanstack/react-router';
import { BusEntityDetailPage } from '@/components/admin/bus-entity-detail-page';

export const Route = createFileRoute('/territory/$id')({
  component: TerritoryDetailPage,
});

// Generated thin wrapper — replace the component body below to build a fully
// custom detail window for this entity without touching the shared infrastructure.
function TerritoryDetailPage() {
  const { id } = Route.useParams();
  return <BusEntityDetailPage entityName="territory" recordId={id} />;
}
