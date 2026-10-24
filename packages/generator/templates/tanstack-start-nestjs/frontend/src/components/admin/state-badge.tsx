import { Workflow } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { FieldMetadata } from "@/hooks/use-entities";

interface StateBadgeProps {
  /** The entity's fields; the one marked `is_state_field` is shown. */
  fields: FieldMetadata[];
  record?: Record<string, unknown> | null;
  className?: string;
}

/**
 * The record's state, read-only, in the header of its form.
 *
 * A state field is system-managed: the application's workflows change it and a
 * person never does, so it is not an input in the form body — it is shown here,
 * beside the record's title, with its label from the model's enum. The list
 * grid shows the same column. Renders nothing for an entity with no state
 * machine.
 */
export function StateBadge({ fields, record, className = "" }: StateBadgeProps) {
  const field = fields.find((candidate) => candidate.is_state_field);
  if (!field || !record) return null;
  const value = record[field.column_name];
  if (value === undefined || value === null || value === "") return null;
  const label =
    field.options?.find((option) => option.value === String(value))?.label ?? String(value);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            data-testid="record-state"
            aria-label={`${field.name}: ${label}`}
            className={`gap-1 border-primary/40 bg-primary/10 text-primary ${className}`}
          >
            <Workflow className="h-3 w-3" aria-hidden="true" />
            {label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          {field.name} — changed only by the application's workflows, never by hand.
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
