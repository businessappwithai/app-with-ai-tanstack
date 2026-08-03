/**
 * Between the model and the canvas.
 *
 * The generator app persists a saga as EML — a flowchart plus `%%step`
 * directives — because the model is the artifact that survives regeneration.
 * The editor works in BPMN, because that is what the generated executor runs.
 * These two functions are the join, and they are deliberately lossless in the
 * direction that matters: every property a step carries survives the round
 * trip, whichever end it was written at.
 *
 * Layout is *not* preserved, and cannot be: `%%step` has nowhere to put
 * coordinates. Steps are laid out left to right in run order, which is both
 * deterministic and the arrangement someone would have drawn anyway.
 */

import type { SagaFlow, SagaStep, SagaStepType } from "@/lib/eml/workflow-flow";
import type { WorkflowStep } from "./bpmn-model";

const TASK_WIDTH = 110;
const TASK_HEIGHT = 80;
const GAP = 50;
const EVENT_SIZE = 36;
const ROW_Y = 140;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Build a diagram from the ordered steps the model declares. */
export function sagaFlowToBpmn(flow: SagaFlow, processName = "Workflow"): string {
  const ids = flow.steps.map((_step, index) => `Step_${index + 1}`);
  const chain = ["StartEvent_1", ...ids, "EndEvent_1"];

  const tasks = flow.steps
    .map((step, index) => {
      const properties = Object.entries<string | undefined>({
        nodeType: step.type,
        ...step.props,
      })
        .filter(([, value]) => value !== undefined && value !== "")
        .map(
          ([key, value]) =>
            `        <erdwithai:property name="${escapeXml(key)}" value="${escapeXml(String(value))}"/>`
        )
        .join("\n");
      return `    <bpmn:serviceTask id="${ids[index]}" name="${escapeXml(step.label || step.type)}">
      <bpmn:extensionElements>
        <erdwithai:properties>
${properties}
        </erdwithai:properties>
      </bpmn:extensionElements>
    </bpmn:serviceTask>`;
    })
    .join("\n");

  const flows = chain
    .slice(0, -1)
    .map(
      (source, index) =>
        `    <bpmn:sequenceFlow id="Flow_${index}" sourceRef="${source}" targetRef="${chain[index + 1]}"/>`
    )
    .join("\n");

  // Left to right, start event first, so the diagram reads in run order.
  const xOf = (index: number) => 150 + index * (TASK_WIDTH + GAP);
  const shapes = [
    `      <bpmndi:BPMNShape id="StartEvent_1_di" bpmnElement="StartEvent_1">
        <dc:Bounds x="${xOf(0)}" y="${ROW_Y + (TASK_HEIGHT - EVENT_SIZE) / 2}" width="${EVENT_SIZE}" height="${EVENT_SIZE}"/>
      </bpmndi:BPMNShape>`,
    ...ids.map(
      (id, index) => `      <bpmndi:BPMNShape id="${id}_di" bpmnElement="${id}">
        <dc:Bounds x="${xOf(index + 1)}" y="${ROW_Y}" width="${TASK_WIDTH}" height="${TASK_HEIGHT}"/>
      </bpmndi:BPMNShape>`
    ),
    `      <bpmndi:BPMNShape id="EndEvent_1_di" bpmnElement="EndEvent_1">
        <dc:Bounds x="${xOf(ids.length + 1)}" y="${ROW_Y + (TASK_HEIGHT - EVENT_SIZE) / 2}" width="${EVENT_SIZE}" height="${EVENT_SIZE}"/>
      </bpmndi:BPMNShape>`,
  ].join("\n");

  const centreY = ROW_Y + TASK_HEIGHT / 2;
  const edges = chain
    .slice(0, -1)
    .map((_source, index) => {
      const from = index === 0 ? xOf(0) + EVENT_SIZE : xOf(index) + TASK_WIDTH;
      const to = xOf(index + 1);
      return `      <bpmndi:BPMNEdge id="Flow_${index}_di" bpmnElement="Flow_${index}">
        <di:waypoint x="${from}" y="${centreY}"/>
        <di:waypoint x="${to}" y="${centreY}"/>
      </bpmndi:BPMNEdge>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
  xmlns:erdwithai="http://erdwithai.io/schema/1.0"
  id="Definitions_${escapeXml(processName)}"
  targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_1" isExecutable="true">
    <bpmn:startEvent id="StartEvent_1" name="Start"/>
${tasks}
    <bpmn:endEvent id="EndEvent_1" name="Done"/>
${flows}
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
${shapes}
${edges}
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;
}

let bridgeCounter = 0;
const nextStepId = () => `bs${(bridgeCounter++).toString(36)}${Date.now().toString(36)}`;

/**
 * Read the editor's steps back into the model's shape.
 *
 * Ids are regenerated rather than carried across: EML numbers its nodes
 * positionally, so a bpmn element id would only ever be noise in the emitted
 * document.
 */
export function stepsToSagaSteps(steps: WorkflowStep[]): SagaStep[] {
  return steps.map((step) => ({
    id: nextStepId(),
    type: step.type as SagaStepType,
    label: step.name,
    props: { ...step.props },
  }));
}
