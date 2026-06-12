import { createFileRoute } from '@tanstack/react-router';
import { BusEntityDetailPage } from '@/components/admin/bus-entity-detail-page';

export const Route = createFileRoute('/$entity/$id')({
  component: DynamicEntityDetailPage,
});

function DynamicEntityDetailPage() {
  const { entity, id } = Route.useParams();
  const entityName = entity.startsWith('bus_') ? entity.slice(4) : entity;
  return <BusEntityDetailPage entityName={entityName} recordId={id} />;
}
