import { createFileRoute, Outlet, useChildMatches } from '@tanstack/react-router';
import { BusEntityPage } from '@/components/admin/bus-entity-page';

export const Route = createFileRoute('/$entity')({
  component: DynamicEntityListPage,
});

function DynamicEntityListPage() {
  const { entity } = Route.useParams();
  const childMatches = useChildMatches();
  if (childMatches.length > 0) return <Outlet />;
  const entityName = entity.startsWith('bus_') ? entity.slice(4) : entity;
  return <BusEntityPage entityName={entityName} />;
}
