import { useState, useCallback, useEffect } from 'react';
import {
  Plus,
  Trash2,
  HelpCircle,
  GripVertical,
  Copy,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';

// ---------- Types ----------

export interface ConditionColumn {
  id: string;
  field: string;
  operator: string;
}

export interface ActionColumn {
  id: string;
  field: string;
}

export interface DecisionRow {
  id: string;
  conditions: Record<string, string>;
  actions: Record<string, string>;
}

export interface DecisionTableData {
  conditionColumns: ConditionColumn[];
  actionColumns: ActionColumn[];
  rows: DecisionRow[];
  hitPolicy: 'first' | 'collect';
}

interface DecisionTableEditorProps {
  value: string;
  onChange: (jdmContent: string) => void;
  entityName?: string;
  entityFields?: string[];
  readOnly?: boolean;
}

// ---------- Constants ----------

const OPERATORS = [
  { value: '==', label: '= (equals)' },
  { value: '!=', label: '!= (not equals)' },
  { value: '>', label: '> (greater than)' },
  { value: '<', label: '< (less than)' },
  { value: '>=', label: '>= (greater or equal)' },
  { value: '<=', label: '<= (less or equal)' },
  { value: 'contains', label: 'contains' },
  { value: 'startsWith', label: 'starts with' },
  { value: 'endsWith', label: 'ends with' },
  { value: 'matches', label: 'matches (regex)' },
  { value: 'in', label: 'in (list)' },
  { value: 'notIn', label: 'not in (list)' },
  { value: 'isNull', label: 'is empty' },
  { value: 'isNotNull', label: 'is not empty' },
];

const ACTION_TYPES = [
  { value: 'validate', label: 'Show Warning', description: 'Display a warning message but allow the operation' },
  { value: 'prevent', label: 'Block Operation', description: 'Prevent the operation and show an error' },
  { value: 'transform', label: 'Set Value', description: 'Automatically set or modify a field value' },
  { value: 'notify', label: 'Send Notification', description: 'Trigger a notification (email, webhook, etc.)' },
];

const DEFAULT_ENTITY_FIELDS = [
  'name', 'email', 'phone', 'status', 'type', 'amount', 'description',
  'is_active', 'created_at', 'updated_at', 'owner_id', 'assigned_to',
];

// ---------- Helpers ----------

let idCounter = 0;
function genId(): string {
  return `dt_${Date.now()}_${++idCounter}`;
}

function parseJdmToTable(jdmContent: string): DecisionTableData | null {
  try {
    const jdm = JSON.parse(jdmContent);
    if (!jdm?.nodes) return null;

    const dtNode = jdm.nodes.find(
      (n: any) => n.type === 'decisionTableNode',
    );
    if (!dtNode?.content) return null;

    const { inputs = [], outputs = [], rules: rows = [], hitPolicy = 'collect' } = dtNode.content;

    const conditionColumns: ConditionColumn[] = inputs.map((inp: any, i: number) => ({
      id: inp.id || genId(),
      field: inp.field || inp.name || `condition_${i}`,
      operator: '==',
    }));

    const actionColumns: ActionColumn[] = outputs.map((out: any, i: number) => ({
      id: out.id || genId(),
      field: out.field || out.name || `action_${i}`,
    }));

    const tableRows: DecisionRow[] = (rows as any[][]).map((row: any) => {
      const conditions: Record<string, string> = {};
      const actions: Record<string, string> = {};

      if (typeof row === 'object' && !Array.isArray(row)) {
        for (const col of conditionColumns) {
          conditions[col.id] = row[col.id] ?? '';
        }
        for (const col of actionColumns) {
          actions[col.id] = row[col.id] ?? '';
        }
      }

      return { id: genId(), conditions, actions };
    });

    return {
      conditionColumns,
      actionColumns,
      rows: tableRows.length > 0 ? tableRows : [createEmptyRow(conditionColumns, actionColumns)],
      hitPolicy: hitPolicy === 'first' ? 'first' : 'collect',
    };
  } catch {
    return null;
  }
}

function createEmptyRow(conditions: ConditionColumn[], actions: ActionColumn[]): DecisionRow {
  const c: Record<string, string> = {};
  const a: Record<string, string> = {};
  conditions.forEach((col) => (c[col.id] = ''));
  actions.forEach((col) => (a[col.id] = ''));
  return { id: genId(), conditions: c, actions: a };
}

function tableToJdm(table: DecisionTableData): string {
  const inputNodeId = 'input-1';
  const outputNodeId = 'output-1';
  const dtNodeId = 'dt-1';

  const inputs = table.conditionColumns.map((col) => ({
    id: col.id,
    name: col.field,
    field: col.field,
    type: 'expression',
  }));

  const outputs = table.actionColumns.map((col) => ({
    id: col.id,
    name: col.field,
    field: col.field,
    type: 'expression',
  }));

  const rules = table.rows.map((row) => {
    const r: Record<string, string> = {};
    for (const col of table.conditionColumns) {
      r[col.id] = row.conditions[col.id] || '';
    }
    for (const col of table.actionColumns) {
      r[col.id] = row.actions[col.id] || '';
    }
    return r;
  });

  const jdm = {
    contentType: 'application/vnd.gorules.decision',
    nodes: [
      {
        id: inputNodeId,
        name: 'Request',
        type: 'inputNode',
        position: { x: 100, y: 200 },
      },
      {
        id: dtNodeId,
        name: 'Decision Table',
        type: 'decisionTableNode',
        position: { x: 350, y: 200 },
        content: {
          hitPolicy: table.hitPolicy,
          inputs,
          outputs,
          rules,
        },
      },
      {
        id: outputNodeId,
        name: 'Response',
        type: 'outputNode',
        position: { x: 600, y: 200 },
      },
    ],
    edges: [
      { id: 'e1', sourceId: inputNodeId, targetId: dtNodeId, type: 'edge' },
      { id: 'e2', sourceId: dtNodeId, targetId: outputNodeId, type: 'edge' },
    ],
  };

  return JSON.stringify(jdm, null, 2);
}

function getDefaultTable(): DecisionTableData {
  const condId = genId();
  const actActionId = genId();
  const actMsgId = genId();

  return {
    conditionColumns: [{ id: condId, field: 'email', operator: '==' }],
    actionColumns: [
      { id: actActionId, field: 'action' },
      { id: actMsgId, field: 'message' },
    ],
    rows: [
      {
        id: genId(),
        conditions: { [condId]: '' },
        actions: { [actActionId]: '"prevent"', [actMsgId]: '"Email is required"' },
      },
    ],
    hitPolicy: 'collect',
  };
}

// ---------- Component ----------

export function DecisionTableEditor({
  value,
  onChange,
  entityName,
  entityFields,
  readOnly = false,
}: DecisionTableEditorProps) {
  const fields = entityFields ?? DEFAULT_ENTITY_FIELDS;

  const [table, setTable] = useState<DecisionTableData>(() => {
    if (!value || value.trim() === '' || value === '{}') return getDefaultTable();
    return parseJdmToTable(value) ?? getDefaultTable();
  });

  const [showJson, setShowJson] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const emitChange = useCallback(
    (t: DecisionTableData) => {
      setTable(t);
      onChange(tableToJdm(t));
    },
    [onChange],
  );

  useEffect(() => {
    if (value && !initialized) {
      const parsed = parseJdmToTable(value);
      if (parsed) {
        setTable(parsed);
        setInitialized(true);
      }
    }
  }, [value, initialized]);

  // ----- Condition columns -----
  const addConditionColumn = () => {
    const id = genId();
    const newCol: ConditionColumn = { id, field: 'name', operator: '==' };
    const updated = {
      ...table,
      conditionColumns: [...table.conditionColumns, newCol],
      rows: table.rows.map((r) => ({
        ...r,
        conditions: { ...r.conditions, [id]: '' },
      })),
    };
    emitChange(updated);
  };

  const removeConditionColumn = (colId: string) => {
    if (table.conditionColumns.length <= 1) return;
    const updated = {
      ...table,
      conditionColumns: table.conditionColumns.filter((c) => c.id !== colId),
      rows: table.rows.map((r) => {
        const conds = { ...r.conditions };
        delete conds[colId];
        return { ...r, conditions: conds };
      }),
    };
    emitChange(updated);
  };

  const updateConditionColumn = (colId: string, field: string) => {
    const updated = {
      ...table,
      conditionColumns: table.conditionColumns.map((c) =>
        c.id === colId ? { ...c, field } : c,
      ),
    };
    emitChange(updated);
  };

  // ----- Action columns -----
  const addActionColumn = () => {
    const id = genId();
    const newCol: ActionColumn = { id, field: 'message' };
    const updated = {
      ...table,
      actionColumns: [...table.actionColumns, newCol],
      rows: table.rows.map((r) => ({
        ...r,
        actions: { ...r.actions, [id]: '' },
      })),
    };
    emitChange(updated);
  };

  const removeActionColumn = (colId: string) => {
    if (table.actionColumns.length <= 1) return;
    const updated = {
      ...table,
      actionColumns: table.actionColumns.filter((c) => c.id !== colId),
      rows: table.rows.map((r) => {
        const acts = { ...r.actions };
        delete acts[colId];
        return { ...r, actions: acts };
      }),
    };
    emitChange(updated);
  };

  const updateActionColumn = (colId: string, field: string) => {
    const updated = {
      ...table,
      actionColumns: table.actionColumns.map((c) =>
        c.id === colId ? { ...c, field } : c,
      ),
    };
    emitChange(updated);
  };

  // ----- Rows -----
  const addRow = () => {
    const newRow = createEmptyRow(table.conditionColumns, table.actionColumns);
    emitChange({ ...table, rows: [...table.rows, newRow] });
  };

  const removeRow = (rowId: string) => {
    if (table.rows.length <= 1) return;
    emitChange({ ...table, rows: table.rows.filter((r) => r.id !== rowId) });
  };

  const duplicateRow = (rowId: string) => {
    const src = table.rows.find((r) => r.id === rowId);
    if (!src) return;
    const dup = {
      ...src,
      id: genId(),
      conditions: { ...src.conditions },
      actions: { ...src.actions },
    };
    const idx = table.rows.findIndex((r) => r.id === rowId);
    const newRows = [...table.rows];
    newRows.splice(idx + 1, 0, dup);
    emitChange({ ...table, rows: newRows });
  };

  const updateCellValue = (
    rowId: string,
    section: 'conditions' | 'actions',
    colId: string,
    value: string,
  ) => {
    const updated = {
      ...table,
      rows: table.rows.map((r) =>
        r.id === rowId
          ? { ...r, [section]: { ...r[section], [colId]: value } }
          : r,
      ),
    };
    emitChange(updated);
  };

  return (
    <TooltipProvider>
      <div className="border border-gray-200 bg-white">
        {/* Header bar */}
        <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-2">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold text-gray-900">Decision Table</h3>
            <Badge variant="outline" className="text-xs">
              {table.hitPolicy === 'collect' ? 'All matching rows' : 'First match only'}
            </Badge>
            {entityName && (
              <Badge variant="secondary" className="text-xs">
                {entityName}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={table.hitPolicy}
              onValueChange={(v: 'first' | 'collect') =>
                emitChange({ ...table, hitPolicy: v })
              }
              disabled={readOnly}
            >
              <SelectTrigger className="h-7 w-36 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="collect">Collect All</SelectItem>
                <SelectItem value="first">First Match</SelectItem>
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setShowHelp(!showHelp)}
            >
              <HelpCircle className="h-3.5 w-3.5 mr-1" />
              Help
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setShowJson(!showJson)}
            >
              {showJson ? 'Table' : 'JSON'}
            </Button>
          </div>
        </div>

        {/* Help panel */}
        {showHelp && <HelpPanel onClose={() => setShowHelp(false)} />}

        {showJson ? (
          /* Raw JSON view */
          <div className="p-4">
            <Label className="text-xs font-medium text-gray-500 mb-2 block">
              JDM Content (Advanced)
            </Label>
            <textarea
              className="w-full h-64 font-mono text-xs border border-gray-200 p-3 bg-gray-50"
              value={tableToJdm(table)}
              readOnly={readOnly}
              onChange={(e) => {
                try {
                  const parsed = parseJdmToTable(e.target.value);
                  if (parsed) emitChange(parsed);
                } catch { /* ignore parse errors while typing */ }
              }}
            />
          </div>
        ) : (
          /* Visual table editor */
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              {/* Column headers - conditions + actions */}
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="w-8 bg-gray-50 border-r border-gray-200 px-1 py-1.5 text-center text-[10px] text-gray-400">
                    #
                  </th>
                  {table.conditionColumns.map((col) => (
                    <th
                      key={col.id}
                      className="bg-blue-50 border-r border-gray-200 px-2 py-1.5 min-w-[160px]"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1 flex-1">
                          <span className="text-[10px] font-semibold text-blue-700 uppercase tracking-wider">
                            IF
                          </span>
                          <Select
                            value={col.field}
                            onValueChange={(v) => updateConditionColumn(col.id, v)}
                            disabled={readOnly}
                          >
                            <SelectTrigger className="h-6 text-xs border-0 bg-transparent shadow-none px-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {fields.map((f) => (
                                <SelectItem key={f} value={f}>
                                  {f}
                                </SelectItem>
                              ))}
                              <SelectItem value="__custom">Custom...</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {!readOnly && table.conditionColumns.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeConditionColumn(col.id)}
                            className="text-gray-400 hover:text-red-500 p-0.5"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </th>
                  ))}
                  {table.actionColumns.map((col) => (
                    <th
                      key={col.id}
                      className="bg-green-50 border-r border-gray-200 px-2 py-1.5 min-w-[160px]"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1 flex-1">
                          <span className="text-[10px] font-semibold text-green-700 uppercase tracking-wider">
                            THEN
                          </span>
                          <Select
                            value={col.field}
                            onValueChange={(v) => updateActionColumn(col.id, v)}
                            disabled={readOnly}
                          >
                            <SelectTrigger className="h-6 text-xs border-0 bg-transparent shadow-none px-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="action">action</SelectItem>
                              <SelectItem value="message">message</SelectItem>
                              <SelectItem value="ruleId">ruleId</SelectItem>
                              <SelectItem value="severity">severity</SelectItem>
                              <SelectItem value="field">field</SelectItem>
                              <SelectItem value="value">value</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {!readOnly && table.actionColumns.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeActionColumn(col.id)}
                            className="text-gray-400 hover:text-red-500 p-0.5"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </th>
                  ))}
                  <th className="w-20 bg-gray-50 px-2 py-1.5">
                    {!readOnly && (
                      <div className="flex items-center gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              onClick={addConditionColumn}
                              className="text-blue-600 hover:text-blue-800 p-0.5 text-[10px] font-medium"
                            >
                              +IF
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>Add condition column</TooltipContent>
                        </Tooltip>
                        <span className="text-gray-300">|</span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              onClick={addActionColumn}
                              className="text-green-600 hover:text-green-800 p-0.5 text-[10px] font-medium"
                            >
                              +THEN
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>Add action column</TooltipContent>
                        </Tooltip>
                      </div>
                    )}
                  </th>
                </tr>
              </thead>
              <tbody>
                {table.rows.map((row, idx) => (
                  <tr
                    key={row.id}
                    className="border-b border-gray-100 hover:bg-gray-50 group"
                  >
                    <td className="bg-gray-50 border-r border-gray-200 px-1 py-1 text-center text-[10px] text-gray-400">
                      {idx + 1}
                    </td>
                    {table.conditionColumns.map((col) => (
                      <td
                        key={col.id}
                        className="border-r border-gray-200 px-1 py-0.5"
                      >
                        <Input
                          type="text"
                          value={row.conditions[col.id] || ''}
                          onChange={(e) =>
                            updateCellValue(row.id, 'conditions', col.id, e.target.value)
                          }
                          placeholder='e.g. == "active"'
                          className="h-7 text-xs border-0 bg-transparent shadow-none focus:bg-blue-50"
                          readOnly={readOnly}
                        />
                      </td>
                    ))}
                    {table.actionColumns.map((col) => (
                      <td
                        key={col.id}
                        className="border-r border-gray-200 px-1 py-0.5"
                      >
                        <Input
                          type="text"
                          value={row.actions[col.id] || ''}
                          onChange={(e) =>
                            updateCellValue(row.id, 'actions', col.id, e.target.value)
                          }
                          placeholder={
                            col.field === 'action'
                              ? '"prevent" or "validate"'
                              : col.field === 'message'
                                ? '"Error message"'
                                : ''
                          }
                          className="h-7 text-xs border-0 bg-transparent shadow-none focus:bg-green-50"
                          readOnly={readOnly}
                        />
                      </td>
                    ))}
                    <td className="px-1 py-0.5">
                      {!readOnly && (
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={() => duplicateRow(row.id)}
                                className="text-gray-400 hover:text-gray-600 p-0.5"
                              >
                                <Copy className="h-3 w-3" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>Duplicate row</TooltipContent>
                          </Tooltip>
                          {table.rows.length > 1 && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  onClick={() => removeRow(row.id)}
                                  className="text-gray-400 hover:text-red-500 p-0.5"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>Delete row</TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Add row button */}
            {!readOnly && (
              <div className="border-t border-gray-100 px-4 py-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-xs text-gray-500 hover:text-gray-700"
                  onClick={addRow}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Rule Row
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

// ---------- Help Panel ----------

function HelpPanel({ onClose }: { onClose: () => void }) {
  const [expanded, setExpanded] = useState<string | null>('basics');

  const sections = [
    {
      id: 'basics',
      title: 'How Decision Tables Work',
      icon: <Info className="h-4 w-4 text-blue-500" />,
      content: (
        <div className="space-y-2 text-xs text-gray-600">
          <p>
            A decision table evaluates entity data against a set of rules. Each <strong>row</strong> is
            a rule. When entity data matches the <strong>IF</strong> conditions in a row, the
            <strong> THEN</strong> actions are executed.
          </p>
          <div className="bg-blue-50 border border-blue-100 p-2 rounded">
            <p className="font-medium text-blue-800 mb-1">Example:</p>
            <p>IF email is empty → THEN action: "prevent", message: "Email is required"</p>
          </div>
        </div>
      ),
    },
    {
      id: 'conditions',
      title: 'Writing Conditions (IF)',
      icon: <AlertTriangle className="h-4 w-4 text-amber-500" />,
      content: (
        <div className="space-y-2 text-xs text-gray-600">
          <p>Conditions use GoRules expression syntax. Each cell is evaluated against the entity field.</p>
          <table className="w-full text-[11px] mt-2">
            <thead>
              <tr className="border-b">
                <th className="text-left py-1 pr-2 font-medium">Expression</th>
                <th className="text-left py-1 font-medium">Meaning</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              <tr className="border-b border-gray-100">
                <td className="py-1 pr-2">== "active"</td>
                <td className="py-1 font-sans">Field equals "active"</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-1 pr-2">!= null</td>
                <td className="py-1 font-sans">Field is not empty</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-1 pr-2">&gt; 0</td>
                <td className="py-1 font-sans">Field is greater than 0</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-1 pr-2">&gt;= 100</td>
                <td className="py-1 font-sans">Field is 100 or more</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-1 pr-2">(empty)</td>
                <td className="py-1 font-sans">Matches anything (always true)</td>
              </tr>
            </tbody>
          </table>
        </div>
      ),
    },
    {
      id: 'actions',
      title: 'Writing Actions (THEN)',
      icon: <CheckCircle className="h-4 w-4 text-green-500" />,
      content: (
        <div className="space-y-2 text-xs text-gray-600">
          <p>Actions define what happens when conditions match. Always wrap text values in quotes.</p>
          <table className="w-full text-[11px] mt-2">
            <thead>
              <tr className="border-b">
                <th className="text-left py-1 pr-2 font-medium">Action Column</th>
                <th className="text-left py-1 pr-2 font-medium">Value</th>
                <th className="text-left py-1 font-medium">Effect</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="py-1 pr-2 font-medium">action</td>
                <td className="py-1 pr-2 font-mono">"prevent"</td>
                <td className="py-1">Blocks the operation (create/update/delete)</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-1 pr-2 font-medium">action</td>
                <td className="py-1 pr-2 font-mono">"validate"</td>
                <td className="py-1">Shows a warning but allows the operation</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-1 pr-2 font-medium">message</td>
                <td className="py-1 pr-2 font-mono">"Email is required"</td>
                <td className="py-1">The message shown to the user</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-1 pr-2 font-medium">ruleId</td>
                <td className="py-1 pr-2 font-mono">"RULE_001"</td>
                <td className="py-1">Unique identifier for tracking</td>
              </tr>
            </tbody>
          </table>
        </div>
      ),
    },
    {
      id: 'hitpolicy',
      title: 'Hit Policy',
      icon: <Info className="h-4 w-4 text-purple-500" />,
      content: (
        <div className="space-y-2 text-xs text-gray-600">
          <p><strong>Collect All:</strong> All matching rows are evaluated and their actions are collected. Use this when you want to check multiple rules at once (e.g., validate email AND check phone format).</p>
          <p><strong>First Match:</strong> Only the first matching row is evaluated. Use this when rules are mutually exclusive (e.g., pricing tiers).</p>
        </div>
      ),
    },
    {
      id: 'examples',
      title: 'Common Rule Examples',
      icon: <Info className="h-4 w-4 text-indigo-500" />,
      content: (
        <div className="space-y-3 text-xs text-gray-600">
          <div className="bg-gray-50 p-2 rounded border border-gray-100">
            <p className="font-medium mb-1">Require email on Account creation:</p>
            <p className="font-mono text-[11px]">IF email == null → THEN action: "prevent", message: "Email is required"</p>
          </div>
          <div className="bg-gray-50 p-2 rounded border border-gray-100">
            <p className="font-medium mb-1">Warn about large deal amounts:</p>
            <p className="font-mono text-[11px]">IF amount &gt; 100000 → THEN action: "validate", message: "Deals over $100K need manager approval"</p>
          </div>
          <div className="bg-gray-50 p-2 rounded border border-gray-100">
            <p className="font-medium mb-1">Prevent deletion of active accounts:</p>
            <p className="font-mono text-[11px]">IF status == "active" → THEN action: "prevent", message: "Cannot delete active accounts"</p>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="border-b border-gray-200 bg-amber-50/50">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
            <HelpCircle className="h-4 w-4 text-amber-600" />
            Business Rules Help
          </h4>
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            Close
          </button>
        </div>
        <div className="space-y-1">
          {sections.map((section) => (
            <div key={section.id} className="border border-gray-200 rounded bg-white">
              <button
                type="button"
                onClick={() =>
                  setExpanded(expanded === section.id ? null : section.id)
                }
                className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50"
              >
                {expanded === section.id ? (
                  <ChevronDown className="h-3 w-3 text-gray-400" />
                ) : (
                  <ChevronRight className="h-3 w-3 text-gray-400" />
                )}
                {section.icon}
                <span className="text-xs font-medium text-gray-700">
                  {section.title}
                </span>
              </button>
              {expanded === section.id && (
                <div className="px-3 pb-3 pt-1 border-t border-gray-100">
                  {section.content}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
