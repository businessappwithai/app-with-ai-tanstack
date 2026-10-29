import { useMutation, useQuery } from "@tanstack/react-query";
import { ChevronDown, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { apiClient } from "@/lib/api-client";
import { lifecycleOf } from "@/lib/lifecycle";
import { useLifecycles } from "@/lib/use-lifecycles";
import { ifMatchHeader } from "@/lib/version-conflict";

/** One move the server offers this caller from where the record is. */
interface AvailableAction {
  event: string;
  to: string;
  label: string;
  kind: "move" | "reopen";
  restricted: boolean;
  roles: string[];
}

interface RecordActionsProps {
  /** The record's endpoint, e.g. `/bus/opportunity`. */
  endpoint: string;
  /** The record's table, e.g. `bus_opportunity`. */
  tableName: string;
  record?: Record<string, unknown> | null;
  /** While a form is being edited, a move would discard it: the buttons wait. */
  disabled?: boolean;
  /** Called after a move — or after a refusal, so the record is read afresh. */
  onMoved: (record?: Record<string, unknown>) => void;
}

/**
 * The record's action buttons — the only way its status changes.
 *
 * The server says which moves this person may make from where the record is
 * (`GET …/:id/actions`): a move only some roles may make is offered only to
 * them. One move is a button; several are a menu to choose from; Reopen, on a
 * record at the end of its flow, sits apart. A press names the version the
 * record was read at, so a move against a record someone else has just moved is
 * refused rather than made twice.
 */
export function RecordActions({ endpoint, tableName, record, disabled, onMoved }: RecordActionsProps) {
  useLifecycles();
  const lifecycle = lifecycleOf(tableName);
  const id = record?.id ? String(record.id) : "";
  const at = lifecycle && record ? String(record[lifecycle.column] ?? "") : "";

  const { data: actions = [], isLoading } = useQuery({
    queryKey: ["record-actions", endpoint, id, at, record?.version],
    queryFn: () => apiClient.get<AvailableAction[]>(`${endpoint}/${id}/actions`),
    enabled: !!id && !!lifecycle,
    retry: false,
  });

  const press = useMutation({
    mutationFn: (action: AvailableAction) =>
      apiClient.post<Record<string, unknown>>(
        `${endpoint}/${id}/transition`,
        { event: action.event || undefined, to: action.to },
        { headers: ifMatchHeader(record?.version) }
      ),
    onSuccess: (moved, action) => {
      toast.success(action.kind === "reopen" ? "Reopened — the record is a draft again." : `${action.label} — done.`);
      onMoved(moved);
    },
    onError: (err: any) => {
      // A refusal says why — a rule, a role, someone else's move — and the
      // record is read again so the buttons match where it really is.
      toast.error(err?.message ?? "The move was refused.");
      onMoved();
    },
  });

  if (!lifecycle || !id || isLoading) return null;
  const moves = actions.filter((action) => action.kind === "move");
  const reopen = actions.find((action) => action.kind === "reopen");
  if (moves.length === 0 && !reopen) return null;
  const busy = press.isPending || disabled;

  return (
    <div className="flex items-center gap-2" data-testid="record-actions">
      {moves.length === 1 && (
        <Button
          size="sm"
          disabled={busy}
          onClick={() => press.mutate(moves[0]!)}
          data-testid={`record-action-${moves[0]!.event || moves[0]!.to}`}
        >
          {press.isPending && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
          {moves[0]!.label}
        </Button>
      )}
      {moves.length > 1 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" disabled={busy} data-testid="record-actions-menu">
              {press.isPending && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
              Move to…
              <ChevronDown className="ml-1 h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Choose where this record goes next
            </DropdownMenuLabel>
            {moves.map((move) => (
              <DropdownMenuItem
                key={`${move.event}:${move.to}`}
                onSelect={() => press.mutate(move)}
                data-testid={`record-action-${move.event || move.to}`}
              >
                {move.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      {reopen && (
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => press.mutate(reopen)}
          data-testid="record-action-reopen"
        >
          <RotateCcw className="mr-1 h-3 w-3" />
          Reopen
        </Button>
      )}
    </div>
  );
}
