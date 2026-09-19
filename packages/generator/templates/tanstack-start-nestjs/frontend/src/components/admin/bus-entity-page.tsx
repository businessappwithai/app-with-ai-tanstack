import { Link } from "@tanstack/react-router";
import { FileQuestion } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { buttonVariants } from "@/components/ui/button";
import { useBusEntityLevel } from "@/hooks/use-bus-entity-level";
import { ADListShell } from "./ad-list-shell";

interface BusEntityPageProps {
  entityName: string;
}

/**
 * Metadata-driven list page for any bus_ entity.
 * Reads the ADLevel (fields, labels, endpoint) entirely from the Application Dictionary.
 *
 * Generated route files import this and pass entityName — if you need a fully
 * custom window for a specific entity, replace the component body in the route
 * file instead of modifying this shared component.
 */
export function BusEntityPage({ entityName }: BusEntityPageProps) {
  const { level, isLoading, isUnknownEntity } = useBusEntityLevel(entityName);

  /*
   * An address that names no entity.
   *
   * `/$entity` catches every unmatched path, so this component is what answers
   * a typo — and it used to answer with a grid. The dictionary had no such
   * table, the field endpoints 404ed, and `formFields` fell back to `[]`, which
   * renders as a titled table with no columns and no rows: indistinguishable
   * from an entity nobody has created a record in yet. `/login` is the case
   * that made it worth fixing, because the sign-in screen is at `/auth/login`
   * and the shorter path is the one people type.
   */
  if (isUnknownEntity) {
    return (
      <div className="p-6">
        <div className="swiss-card mx-auto max-w-md p-8 text-center">
          <FileQuestion className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
          <h1 className="text-lg font-semibold text-foreground">No screen at this address</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This application has no entity called{" "}
            <span className="font-mono-display text-foreground">{entityName}</span>. It may have
            been renamed, or the address may be mistyped.
          </p>
          <Link to="/dashboard" className={`${buttonVariants({ size: "sm" })} mt-6`}>
            Back to the dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading || !level) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-3/4" />
      </div>
    );
  }

  return <ADListShell level={level} parentContext={[]} />;
}
