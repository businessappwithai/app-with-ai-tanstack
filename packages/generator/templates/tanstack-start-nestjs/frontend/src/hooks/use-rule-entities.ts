/**
 * This application's own record types and their columns, for the rule editor.
 *
 * The Create Business Rule screen used to carry a hard-coded list — Patient,
 * Appointment, Claim, Account, Opportunity — left over from the models it was
 * first written against, so an application generated from any other model
 * could not pick one of its own entities for a rule at all. The dictionary
 * knows which tables this application has; ask it.
 *
 * Rules are stored against the table name (`bus_fee_invoice`), which is what
 * `value` is. `tableId` is the parameter `GET /sys/columns` reads; `table_id`
 * is silently ignored and returns every table's columns.
 */

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

interface SysTableRow {
  sys_table_id: string;
  table_name: string;
  name: string;
}

interface SysColumnRow {
  column_name: string;
}

export interface RuleEntity {
  /** The table name rules are stored against. */
  value: string;
  label: string;
  tableId: string;
}

export function useRuleEntities() {
  return useQuery({
    queryKey: ["rule-editor", "entities"],
    queryFn: async (): Promise<RuleEntity[]> => {
      const res = await apiClient.get<{ data?: SysTableRow[] }>("/sys/tables?limit=500");
      return (res.data ?? [])
        .filter((table) => table.table_name.startsWith("bus_"))
        .map((table) => ({
          value: table.table_name,
          label: table.name || table.table_name,
          tableId: table.sys_table_id,
        }))
        .sort((a, b) => a.label.localeCompare(b.label));
    },
    staleTime: 5 * 60 * 1000,
  });
}

/** Column names of one table, for the rule table's input pickers. */
export function useRuleEntityFields(tableId: string | undefined) {
  return useQuery({
    queryKey: ["rule-editor", "fields", tableId],
    queryFn: async (): Promise<string[]> => {
      const res = await apiClient.get<{ data?: SysColumnRow[] }>(
        `/sys/columns?tableId=${encodeURIComponent(tableId ?? "")}&limit=500`
      );
      return (res.data ?? []).map((column) => column.column_name);
    },
    enabled: !!tableId,
    staleTime: 5 * 60 * 1000,
  });
}
