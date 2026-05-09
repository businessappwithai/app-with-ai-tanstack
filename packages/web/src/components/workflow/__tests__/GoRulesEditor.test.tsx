import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GoRulesEditor } from "../GoRulesEditor";

// Mock the GoRules library
vi.mock("@gorules/jdm-editor", () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mock component doesn't need strict types
  DecisionGraph: ({
    value,
    onChange,
    disabled,
  }: {
    value?: any;
    onChange?: (v: any) => void;
    disabled?: boolean;
  }) => (
    <div data-testid="decision-graph">
      <div data-testid="disabled">{String(disabled)}</div>
      <div data-testid="value">{JSON.stringify(value)}</div>
      <button
        onClick={() =>
          onChange?.({
            name: "Test Graph",
            nodes: [],
            edges: [],
          })
        }
      >
        Change
      </button>
    </div>
  ),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mock component
  JdmConfigProvider: ({ children }: any) => <div>{children}</div>,
}));

describe("GoRulesEditor", () => {
  const mockEntities = [
    {
      name: "User",
      attributes: ["email:string", "age:number", "name:string"],
    },
    {
      name: "Post",
      attributes: ["title:string", "content:text", "authorId:string"],
    },
  ];

  it("should render the decision graph", () => {
    render(<GoRulesEditor entityContext={mockEntities} />);

    expect(screen.getByTestId("decision-graph")).toBeInTheDocument();
  });

  it("should create default model with entity attributes", () => {
    render(<GoRulesEditor entityContext={mockEntities} />);

    const valueDiv = screen.getByTestId("value");
    const value = JSON.parse(valueDiv.textContent || "{}");

    expect(value.name).toBe("Business Rules");
    expect(value.nodes).toHaveLength(3); // input, decision, output
    expect(value.edges).toHaveLength(2); // input->decision, decision->output
  });

  it("should parse entity attributes correctly", () => {
    render(<GoRulesEditor entityContext={mockEntities} />);

    const valueDiv = screen.getByTestId("value");
    const value = JSON.parse(valueDiv.textContent || "{}");

    const inputNode = value.nodes.find((n: { id: string }) => n.id === "input");
    expect(inputNode).toBeDefined();

    const fields = inputNode.data.fields;
    expect(fields).toContainEqual({
      name: "User.email",
      type: "string",
      entity: "User",
    });
    expect(fields).toContainEqual({
      name: "User.age",
      type: "number",
      entity: "User",
    });
  });

  it("should handle space-separated attribute format", () => {
    const spaceFormatEntities = [
      {
        name: "Test",
        attributes: ["field1 string", "field2 number"],
      },
    ];

    render(<GoRulesEditor entityContext={spaceFormatEntities} />);

    const valueDiv = screen.getByTestId("value");
    const value = JSON.parse(valueDiv.textContent || "{}");

    const inputNode = value.nodes.find((n: { id: string }) => n.id === "input");
    expect(inputNode.data.fields).toContainEqual({
      name: "Test.field1",
      type: "string",
      entity: "Test",
    });
  });

  it("should handle single-field attribute format (default type)", () => {
    const singleFieldEntities = [
      {
        name: "Test",
        attributes: ["field1", "field2"],
      },
    ];

    render(<GoRulesEditor entityContext={singleFieldEntities} />);

    const valueDiv = screen.getByTestId("value");
    const value = JSON.parse(valueDiv.textContent || "{}");

    const inputNode = value.nodes.find((n: { id: string }) => n.id === "input");
    expect(inputNode.data.fields).toContainEqual({
      name: "Test.field1",
      type: "string", // defaults to string
      entity: "Test",
    });
  });

  it("should call onChange when graph changes", () => {
    const handleChange = vi.fn();

    render(<GoRulesEditor entityContext={mockEntities} onChange={handleChange} />);

    const changeButton = screen.getByText("Change");
    changeButton.click();

    expect(handleChange).toHaveBeenCalledOnce();
  });

  it("should pass disabled prop when readOnly=true", () => {
    render(<GoRulesEditor entityContext={mockEntities} readOnly={true} />);

    expect(screen.getByTestId("disabled")).toHaveTextContent("true");
  });

  it("should include modified fields in output node", () => {
    render(<GoRulesEditor entityContext={mockEntities} />);

    const valueDiv = screen.getByTestId("value");
    const value = JSON.parse(valueDiv.textContent || "{}");

    const outputNode = value.nodes.find((n: { id: string }) => n.id === "output");
    expect(outputNode).toBeDefined();

    // Should have standard fields plus modified versions of input fields
    expect(outputNode.data.fields).toContainEqual({ name: "success", type: "boolean" });
    expect(outputNode.data.fields).toContainEqual({
      name: "message",
      type: "string",
    });
    expect(outputNode.data.fields).toContainEqual({
      name: "User.email_modified",
      type: "string",
      entity: "User",
    });
  });
});
