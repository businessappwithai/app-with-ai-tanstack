"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { type DecisionTableData, DecisionTableEditor } from "./DecisionTableEditor";

export interface JDMNode {
  id: string;
  type: "decisionTable" | "expression" | "function";
  name: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- content shape varies by node type (decisionTable/expression/function)
  content?: any;
}

export interface JDMContent {
  name: string;
  nodes: JDMNode[];
}

interface JDMEditorProps {
  value: JDMContent;
  onChange: (value: JDMContent) => void;
}

export function JDMEditor({ value, onChange }: JDMEditorProps) {
  const [activeTab, setActiveTab] = useState<"visual" | "json">("visual");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- content shape varies by node type
  const updateNodeContent = (nodeId: string, content: any) => {
    onChange({
      ...value,
      nodes: value.nodes.map((node) => (node.id === nodeId ? { ...node, content } : node)),
    });
  };

  const decisionTableNode = value.nodes.find((node) => node.type === "decisionTable");

  const decisionTableData: DecisionTableData = decisionTableNode?.content || {
    inputs: ["entity"],
    outputs: ["result"],
    rules: [],
  };

  const handleDecisionTableChange = (data: DecisionTableData) => {
    updateNodeContent(decisionTableNode?.id || "node-1", data);
  };

  const handleJsonChange = (jsonString: string) => {
    try {
      const parsed = JSON.parse(jsonString);
      onChange(parsed);
    } catch (error) {
      // Invalid JSON, don't update
    }
  };

  return (
    <div className="space-y-6">
      {/* Rule Name */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Rule Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <Label htmlFor="rule-name">Rule Name</Label>
            <Input
              id="rule-name"
              value={value.name}
              onChange={(e) => onChange({ ...value, name: e.target.value })}
              placeholder="My Rule"
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Editor Tabs */}
      <Tabs value={activeTab} onValueChange={(v: string) => setActiveTab(v as "visual" | "json")}>
        <TabsList>
          <TabsTrigger value="visual">Visual Editor</TabsTrigger>
          <TabsTrigger value="json">JSON Editor</TabsTrigger>
        </TabsList>

        <TabsContent value="visual">
          {decisionTableNode ? (
            <DecisionTableEditor data={decisionTableData} onChange={handleDecisionTableChange} />
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No decision table node found. Switch to JSON editor to create one.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="json">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">JSON Editor</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={JSON.stringify(value, null, 2)}
                onChange={(e) => handleJsonChange(e.target.value)}
                rows={20}
                className="font-mono text-sm"
                placeholder='{\n  "name": "My Rule",\n  "nodes": [...]\n}'
              />
              <p className="text-sm text-muted-foreground mt-2">
                Advanced users can edit the raw JDM JSON structure here.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-slate-950 text-slate-50 p-4 rounded text-xs overflow-auto">
            {JSON.stringify(value, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
