import { createFileRoute } from '@tanstack/react-router';
import { ADWindowShell } from '@/components/admin/ad-window-shell';
import { ELEMENT_CONFIG } from '@/components/admin/ad-window-configs';

export const Route = createFileRoute('/admin/elements')({
  component: ElementPage,
});

function ElementPage() {
  return <ADWindowShell config={ELEMENT_CONFIG} />;
}
