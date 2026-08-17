import { createFileRoute } from '@tanstack/react-router';
import { BusEntityDetailPage } from '@/components/admin/bus-entity-detail-page';

export const Route = createFileRoute('/quote-line-item/$id')({
  component: QuoteLineItemDetailPage,
});

// Generated thin wrapper — replace the component body below to build a fully
// custom detail window for this entity without touching the shared infrastructure.
function QuoteLineItemDetailPage() {
  const { id } = Route.useParams();
  return <BusEntityDetailPage entityName="quote_line_item" recordId={id} />;
}
