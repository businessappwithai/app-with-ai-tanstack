import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/projects/$id/enhance/$serviceName")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/projects/$id/enhance/$serviceName"!</div>;
}
