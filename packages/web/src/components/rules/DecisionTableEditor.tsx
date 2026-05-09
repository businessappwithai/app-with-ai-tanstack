"use client";

import { ArrowDownIcon, ArrowUpIcon, PlusIcon, TrashIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface DecisionTableRule {
  id: string;
  condition: string;
  output: Record<string, string>;
}

export interface DecisionTableData {
  inputs: string[];
  outputs: string[];
  rules: DecisionTableRule[];
}

interface DecisionTableEditorProps {
  data: DecisionTableData;
  onChange: (data: DecisionTableData) => void;
}

export function DecisionTableEditor({ data, onChange }: DecisionTableEditorProps) {
  const [rules, setRules] = useState<DecisionTableRule[]>(data.rules || []);

  useEffect(() => {
    onChange({ ...data, rules });
  }, [rules]);

  const addRule = () => {
    const newRule: DecisionTableRule = {
      id: `rule-${Date.now()}`,
      condition: "true",
      output: data.outputs.reduce(
        (acc, output) => {
          acc[output] = "default";
          return acc;
        },
        {} as Record<string, string>
      ),
    };
    setRules([...rules, newRule]);
  };

  const removeRule = (ruleId: string) => {
    setRules(rules.filter((r) => r.id !== ruleId));
  };

  const updateRuleCondition = (ruleId: string, condition: string) => {
    setRules(rules.map((r) => (r.id === ruleId ? { ...r, condition } : r)));
  };

  const updateRuleOutput = (ruleId: string, outputKey: string, value: string) => {
    setRules(
      rules.map((r) =>
        r.id === ruleId ? { ...r, output: { ...r.output, [outputKey]: value } } : r
      )
    );
  };

  const moveRule = (index: number, direction: "up" | "down") => {
    const newRules = [...rules];
    const targetIndex = direction === "up" ? index - 1 : index + 1;

    if (targetIndex >= 0 && targetIndex < rules.length) {
      const a = newRules[index];
      const b = newRules[targetIndex];
      if (a !== undefined && b !== undefined) {
        newRules[index] = b;
        newRules[targetIndex] = a;
        setRules(newRules);
      }
    }
  };

  const addOutput = () => {
    const outputName = `output${data.outputs.length + 1}`;
    onChange({
      ...data,
      outputs: [...data.outputs, outputName],
    });
  };

  const removeOutput = (outputName: string) => {
    onChange({
      ...data,
      outputs: data.outputs.filter((o) => o !== outputName),
    });
  };

  return (
    <div className="space-y-6">
      {/* Inputs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Inputs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {data.inputs.map((input) => (
              <Badge key={input} variant="outline">
                {input}
              </Badge>
            ))}
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Inputs are automatically inferred from the entity context
          </p>
        </CardContent>
      </Card>

      {/* Outputs */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">Outputs</CardTitle>
            <Button onClick={addOutput} size="sm" variant="outline">
              <PlusIcon className="h-4 w-4 mr-1" />
              Add Output
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data.outputs.map((output) => (
              <div key={output} className="flex items-center gap-2">
                <Input value={output} disabled className="flex-1" />
                <Button onClick={() => removeOutput(output)} size="sm" variant="ghost">
                  <TrashIcon className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Rules */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">Rules</CardTitle>
            <Button onClick={addRule} size="sm">
              <PlusIcon className="h-4 w-4 mr-1" />
              Add Rule
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {rules.map((rule, index) => (
              <div key={rule.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <Label htmlFor={`condition-${rule.id}`}>Rule {index + 1} Condition</Label>
                    <Input
                      id={`condition-${rule.id}`}
                      value={rule.condition}
                      onChange={(e) => updateRuleCondition(rule.id, e.target.value)}
                      placeholder="e.g., entity.age > 65"
                      className="font-mono text-sm mt-1"
                    />
                  </div>
                  <div className="flex gap-1 ml-2">
                    <Button
                      onClick={() => moveRule(index, "up")}
                      size="sm"
                      variant="ghost"
                      disabled={index === 0}
                    >
                      <ArrowUpIcon className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={() => moveRule(index, "down")}
                      size="sm"
                      variant="ghost"
                      disabled={index === rules.length - 1}
                    >
                      <ArrowDownIcon className="h-4 w-4" />
                    </Button>
                    <Button onClick={() => removeRule(rule.id)} size="sm" variant="ghost">
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <Label>Outputs</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                    {data.outputs.map((output) => (
                      <div key={output} className="flex items-center gap-2">
                        <Label htmlFor={`output-${rule.id}-${output}`} className="text-sm w-24">
                          {output}:
                        </Label>
                        <Input
                          id={`output-${rule.id}-${output}`}
                          value={rule.output[output] || ""}
                          onChange={(e) => updateRuleOutput(rule.id, output, e.target.value)}
                          placeholder="value"
                          className="flex-1"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}

            {rules.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No rules yet. Click "Add Rule" to create your first rule.
              </div>
            )}
          </div>

          {rules.length > 0 && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
              <strong>Rule Execution Order:</strong> Rules are evaluated from top to bottom. The
              first rule that matches will be executed and subsequent rules will be skipped. Use the
              arrow buttons to reorder rules.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
