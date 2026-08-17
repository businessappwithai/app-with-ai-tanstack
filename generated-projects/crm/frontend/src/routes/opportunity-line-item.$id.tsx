import { createFileRoute } from '@tanstack/react-router';
import { BusEntityDetailPage } from '@/components/admin/bus-entity-detail-page';

export const Route = createFileRoute('/opportunity-line-item/$id')({
  component: OpportunityLineItemDetailPage,
});

// Generated thin wrapper — replace the component body below to build a fully
// custom detail window for this entity without touching the shared infrastructure.
function OpportunityLineItemDetailPage() {
  const { id } = Route.useParams();
  return <BusEntityDetailPage entityName="opportunity_line_item" recordId={id} />;
}
