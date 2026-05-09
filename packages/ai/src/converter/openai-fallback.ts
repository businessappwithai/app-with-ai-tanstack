import OpenAI from "openai";

/** Attribute shape used in OpenAI-parsed entity responses */
interface ParsedAttribute {
  name: string;
  type: string;
  isPrimaryKey?: boolean;
  isUnique?: boolean;
  isForeignKey?: boolean;
  unique?: boolean;
  required?: boolean;
  confidence?: number;
}

/** Entity shape used in OpenAI-parsed domain responses */
interface ParsedEntity {
  name: string;
  suggestedAttributes?: ParsedAttribute[];
  attributes?: ParsedAttribute[];
  confidence?: number;
}

/** Relationship shape used in OpenAI-parsed domain responses */
interface ParsedRelationship {
  source: string;
  target: string;
  cardinality: string;
  name: string;
  confidence?: number;
}

/**
 * Validate Mermaid ERD syntax
 * Returns { valid: true } if valid, { valid: false, error: string } if invalid
 */
function validateMermaidSyntax(mermaidSyntax: string): { valid: boolean; error?: string } {
  const lines = mermaidSyntax.trim().split("\n");
  const errors: string[] = [];

  // Check for erDiagram opening
  if (!lines[0]?.trim().startsWith("erDiagram")) {
    errors.push('Must start with "erDiagram"');
  }

  const linesWithContent = lines.filter((line) => line.trim() && !line.trim().startsWith("%%"));

  for (let i = 0; i < linesWithContent.length; i++) {
    const line = (linesWithContent[i] ?? "").trim();

    // Skip entity blocks and empty lines
    if (line.includes("{") || line.includes("}") || line === "erDiagram") {
      continue;
    }

    // Check if it's a relationship line
    if (line.includes("--")) {
      // Validate relationship syntax
      const validCardinalities = [
        "||--||",
        "||--o{",
        "}o--||",
        "}o--o{",
        "||--|{",
        "}|--||",
        "||..||",
        "||..o{",
        "}o..||",
        "}o..o{",
      ];

      let hasValidCardinality = false;
      for (const cardinality of validCardinalities) {
        if (line.includes(cardinality)) {
          hasValidCardinality = true;
          break;
        }
      }

      if (!hasValidCardinality) {
        errors.push(`Invalid relationship syntax on line ${i + 1}: "${line}"`);
      }
    }

    // Check for attribute blocks
    if (line.match(/^\w+\s*\{$/)) {
      // Entity definition starts, ensure it has a closing brace
      let braceCount = 1;
      for (let j = i + 1; j < linesWithContent.length; j++) {
        if ((linesWithContent[j] ?? "").includes("{")) braceCount++;
        if ((linesWithContent[j] ?? "").includes("}")) braceCount--;
        if (braceCount === 0) break;
      }
      if (braceCount > 0) {
        errors.push(`Unclosed entity block starting at line ${i + 1}`);
      }
    }
  }

  if (errors.length > 0) {
    return { valid: false, error: errors.join("; ") };
  }

  return { valid: true };
}

/**
 * Generate Mermaid ERD from domain analysis with retry logic
 */
async function generateMermaidWithRetry(
  openai: OpenAI,
  entities: ParsedEntity[],
  relationships: ParsedRelationship[],
  maxRetries: number = 3
): Promise<{ mermaidSyntax: string; entityCount: number; relationshipCount: number }> {
  let retryCount = 0;
  let lastError: string | undefined;

  while (retryCount < maxRetries) {
    retryCount++;
    console.log(`[Mermaid Generation] Attempt ${retryCount}/${maxRetries}`);

    try {
      const prompt =
        retryCount === 1
          ? `Generate a valid Mermaid ERD diagram from these entities and relationships:

ENTITIES:
${JSON.stringify(entities, null, 2)}

RELATIONSHIPS:
${JSON.stringify(relationships, null, 2)}

Generate ONLY valid Mermaid ERD syntax. Start with "erDiagram" and use proper cardinality symbols.`
          : `Previous attempt failed validation. Error: ${lastError}

Please fix the Mermaid ERD syntax:

ENTITIES:
${JSON.stringify(entities, null, 2)}

RELATIONSHIPS:
${JSON.stringify(relationships, null, 2)}

Generate ONLY valid Mermaid ERD syntax. Follow these rules:
1. Start with "erDiagram"
2. Use valid cardinality: ||--||, ||--o{, }o--||, }o--o{
3. Entity blocks use { and }
4. Attributes: type name PK/FK/UK
5. Relationships: ENTITY_A ||--o{ ENTITY_B : "label"`;

      const response = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          {
            role: "system",
            content:
              "You are an expert at generating valid Mermaid ERD diagrams. Always respond with only the Mermaid code, no explanations.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      });

      let mermaidSyntax = response.choices[0]?.message?.content || "";

      // Extract code blocks if present
      const codeBlockMatch = mermaidSyntax.match(/```(?:mermaid)?\n([\s\S]*?)```/);
      if (codeBlockMatch) {
        mermaidSyntax = codeBlockMatch[1] ?? mermaidSyntax;
      }

      // Validate the generated syntax
      const validation = validateMermaidSyntax(mermaidSyntax);

      if (!validation.valid) {
        lastError = validation.error;
        console.warn(`[Mermaid Generation] Validation failed: ${validation.error}`);

        if (retryCount < maxRetries) {
          console.log(`[Mermaid Generation] Retrying...`);
          continue;
        }
      }

      // If valid or max retries reached, return the result
      return {
        mermaidSyntax,
        entityCount: entities.length,
        relationshipCount: relationships.length,
      };
    } catch (error) {
      console.error(`[Mermaid Generation] Error on attempt ${retryCount}:`, error);
      if (retryCount >= maxRetries) {
        throw error;
      }
    }
  }

  // Fallback: generate programmatically
  console.log("[Mermaid Generation] Using programmatic fallback");
  return generateMermaidProgrammatic(entities, relationships);
}

/**
 * Programmatic Mermaid generation (fallback)
 */
function generateMermaidProgrammatic(
  entities: ParsedEntity[],
  relationships: ParsedRelationship[]
): { mermaidSyntax: string; entityCount: number; relationshipCount: number } {
  let syntax = "erDiagram\n";

  // Relationships
  for (const rel of relationships) {
    const symbols: Record<string, string> = {
      oneToOne: "||--||",
      oneToMany: "||--o{",
      manyToOne: "}o--||",
      manyToMany: "}o--o{",
    };
    const symbol = symbols[rel.cardinality] || "||--o{";
    syntax += `    ${rel.source} ${symbol} ${rel.target} : "${rel.name}"\n`;
  }

  syntax += "\n";

  // Entities
  for (const entity of entities) {
    syntax += `    ${entity.name} {\n`;
    for (const attr of entity.suggestedAttributes || entity.attributes || []) {
      const modifiers = [];
      if (attr.name === "id" || attr.isPrimaryKey) modifiers.push("PK");
      if (attr.isUnique) modifiers.push("UK");
      if (attr.isForeignKey) modifiers.push("FK");
      syntax += `        ${attr.type} ${attr.name}${modifiers.length ? " " + modifiers.join(" ") : ""}\n`;
    }
    syntax += `    }\n\n`;
  }

  return {
    mermaidSyntax: syntax,
    entityCount: entities.length,
    relationshipCount: relationships.length,
  };
}

/**
 * Complete Mermaid ERD Syntax Documentation
 * From https://mermaid.ai/open-source/syntax/entityRelationshipDiagram.html
 */
const MERMAID_ERD_DOCUMENTATION = `
# Mermaid Entity Relationship Diagram Syntax

## Basic Structure
\`\`\`mermaid
erDiagram
  ENTITY_NAME {
    type attribute_name PK
    type attribute_name FK
    type attribute_name UK
  }

  ENTITY_ONE ||--o{ ENTITY_TWO : "relationship label"
\`\`\`

## Entity Names
- Use PascalCase (e.g., User, Order, Product)
- Use SINGULAR form (User, not Users)
- Supports unicode characters
- Spaces allowed with double quotes: "User Profile"

## Attribute Syntax
Inside entity blocks:
\`\`\`
ENTITY_NAME {
    string id PK
    string email UK
    string passwordHash
    boolean isActive
    datetime createdAt
    datetime updatedAt
}
\`\`\`

## Attribute Modifiers
- PK: Primary Key
- FK: Foreign Key
- UK: Unique Key
- Can combine: PK, FK

## Common Data Types
- string, text, varchar
- integer, number, bigint
- boolean
- datetime, timestamp, date
- decimal, float, double
- json, jsonb
- uuid

## Relationship Syntax
\`\`\`
SOURCE ||--o{ TARGET : "label"
\`\`\`

## Cardinality Notation (Crow's Foot)
| Syntax | Meaning |
|--------|---------|
| |o|   ... o||   | Zero or one to zero or one |
| ||    ... ||    | Exactly one to exactly one |
| }o|   ... o|{    | Zero or more to zero or more |
| }||   ... ||{   | One or more to one or more |
| ||    ... o|{    | Exactly one to zero or more |
| ||    ... ||{   | Exactly one to one or more |
| }o|   ... ||    | Zero or more to exactly one |

Common patterns:
- User ||--o{ Post : "creates" (one user, many posts)
- Order ||--o{ OrderItem : "contains" (one order, many items)
- Product }o--|| Category : "belongs to" (many products, one category)

## Identifying vs Non-Identifying Relationships
- Identifying (solid line): Uses --
- Non-identifying (dashed line): Uses ..

\`\`\`
PERSON }|..|{ CAR : "drives"  // non-identifying
CAR ||--|{ NAMED_DRIVER : "has"  // identifying
\`\`\`

## Complete Example
\`\`\`mermaid
erDiagram
    USER {
        string id PK
        string email UK
        string passwordHash
        string firstName
        string lastName
        boolean isActive
        datetime createdAt
        datetime updatedAt
    }

    POST {
        string id PK
        string title
        text content
        boolean isPublished
        string userId FK
        datetime createdAt
        datetime updatedAt
    }

    COMMENT {
        string id PK
        text content
        string postId FK
        string userId FK
        datetime createdAt
    }

    USER ||--o{ POST : creates
    POST ||--o{ COMMENT : has
    USER ||--o{ COMMENT : writes
\`\`\`

## Important Rules
1. Always start diagram with "erDiagram"
2. Entity blocks use { opening and } closing braces
3. Attributes: type name [PK|FK|UK]
4. Relationships must have valid cardinality symbols
5. Relationship labels are optional but recommended
6. No trailing commas or semicolons
`;

/**
 * Analyze domain and generate Mermaid ERD with retry logic
 */
export async function analyzeDomainWithOpenAI(description: string) {
  const apiKey = process.env.OPENAI_API_KEY;

  console.log("[OpenAI Analysis] Starting analysis, API key present:", !!apiKey);

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY environment variable is not set");
  }

  const openai = new OpenAI({ apiKey });

  const conversationHistory: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    {
      role: "system",
      content: `You are an expert data modeler specializing in Entity-Relationship Diagram analysis and Mermaid ERD syntax.

${MERMAID_ERD_DOCUMENTATION}

Your task:
1. Extract entities from the domain description
2. Identify attributes with proper types and constraints
3. Determine relationships with correct cardinality
4. Always respond with valid JSON

Response format:
{
  "entities": [
    {
      "name": "EntityName",
      "suggestedAttributes": [
        {"name": "id", "type": "string", "isPrimaryKey": true, "confidence": 1.0},
        {"name": "email", "type": "string", "isUnique": true, "confidence": 1.0}
      ],
      "confidence": 1.0
    }
  ],
  "relationships": [
    {
      "source": "User",
      "target": "Post",
      "cardinality": "oneToMany",
      "name": "creates",
      "confidence": 1.0
    }
  ],
  "summary": "Brief analysis summary"
}`,
    },
  ];

  console.log("[OpenAI Analysis] Calling OpenAI API...");

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        ...conversationHistory,
        {
          role: "user",
          content: `Analyze this domain description and extract entities and relationships:

${description}`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 4000,
    });

    console.log("[OpenAI Analysis] Got response, parsing...");

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Empty response from OpenAI");
    }

    const parsed = JSON.parse(content);

    console.log(
      `[OpenAI Analysis] Extracted ${parsed.entities?.length || 0} entities, ${parsed.relationships?.length || 0} relationships`
    );

    // Generate Mermaid with retry logic
    const entities = parsed.entities || [];
    const relationships = parsed.relationships || [];

    console.log("[OpenAI Analysis] Generating Mermaid syntax with validation...");
    const mermaidResult = await generateMermaidWithRetry(openai, entities, relationships, 3);

    console.log(
      `[OpenAI Analysis] Generated Mermaid with ${mermaidResult.entityCount} entities, ${mermaidResult.relationshipCount} relationships`
    );

    return {
      entities,
      relationships,
      summary: parsed.summary || "",
    };
  } catch (error) {
    console.error("[OpenAI Analysis] API error:", error);
    if (error instanceof Error) {
      console.error("[OpenAI Analysis] Error message:", error.message);
      console.error("[OpenAI Analysis] Error stack:", error.stack);
    }
    throw error;
  }
}

/**
 * Generate Mermaid with retry logic (standalone function)
 */
export async function generateMermaidWithValidation(
  entities: ParsedEntity[],
  relationships: ParsedRelationship[],
  openaiApiKey?: string
): Promise<{ mermaidSyntax: string; entityCount: number; relationshipCount: number }> {
  const apiKey = openaiApiKey || process.env.OPENAI_API_KEY;

  if (!apiKey) {
    // Fallback to programmatic generation
    return generateMermaidProgrammatic(entities, relationships);
  }

  const openai = new OpenAI({ apiKey });
  return generateMermaidWithRetry(openai, entities, relationships, 3);
}
