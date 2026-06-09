import { createFileRoute } from '@tanstack/react-router';
import { ADWindowShell } from '@/components/admin/ad-window-shell';
import { REFERENCE_CONFIG } from '@/components/admin/ad-window-configs';

export const Route = createFileRoute('/admin/references')({
  component: ReferencePage,
});

function ReferencePage() {
  return <ADWindowShell config={REFERENCE_CONFIG} />;
}
