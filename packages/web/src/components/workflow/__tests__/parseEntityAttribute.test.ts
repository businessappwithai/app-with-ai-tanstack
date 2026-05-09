import { describe, expect, it } from "vitest";
import { parseEntityAttribute } from "../parseEntityAttribute";

describe("parseEntityAttribute", () => {
  it("should parse colon-separated format (fieldName:type)", () => {
    const result = parseEntityAttribute("email:string", "User");
    expect(result).toEqual({
      name: "User.email",
      type: "string",
      entity: "User",
    });
  });

  it("should parse space-separated format (fieldName type)", () => {
    const result = parseEntityAttribute("age number", "User");
    expect(result).toEqual({
      name: "User.age",
      type: "number",
      entity: "User",
    });
  });

  it("should default to string type for single-field format", () => {
    const result = parseEntityAttribute("username", "User");
    expect(result).toEqual({
      name: "User.username",
      type: "string",
      entity: "User",
    });
  });

  it("should handle extra spaces in colon format", () => {
    const result = parseEntityAttribute("  email  :  string  ", "User");
    expect(result).toEqual({
      name: "User.email",
      type: "string",
      entity: "User",
    });
  });

  it("should handle complex type names", () => {
    const result = parseEntityAttribute("id:uuid", "Post");
    expect(result).toEqual({
      name: "Post.id",
      type: "uuid",
      entity: "Post",
    });
  });

  it("should handle nested type names", () => {
    const result = parseEntityAttribute("metadata:jsonb", "Post");
    expect(result).toEqual({
      name: "Post.metadata",
      type: "jsonb",
      entity: "Post",
    });
  });

  it("should handle attributes with underscores", () => {
    const result = parseEntityAttribute("first_name:string", "User");
    expect(result).toEqual({
      name: "User.first_name",
      type: "string",
      entity: "User",
    });
  });

  it("should prioritize colon format over space format", () => {
    const result = parseEntityAttribute("field:type with:spaces", "Entity");
    expect(result).toEqual({
      name: "Entity.field",
      type: "type with:spaces",
      entity: "Entity",
    });
  });
});
