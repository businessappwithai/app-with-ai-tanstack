import { FilesystemEventType, FileType, Sandbox } from "@e2b/code-interpreter";
import { Agent } from "@mastra/core/agent";
import { Mastra } from "@mastra/core/mastra";
import { createTool } from "@mastra/core/tools";
import { fastembed } from "@mastra/fastembed";
import { LibSQLStore, LibSQLVector } from "@mastra/libsql";
import { PinoLogger } from "@mastra/loggers";
import { Memory } from "@mastra/memory";
import z from "zod";

("use strict");
const AI_BASE_URL = process.env.LOCAL_AI_BASE_URL ?? "http://127.0.0.1:8000/v1";
const AI_MODEL = process.env.LOCAL_AI_MODEL ?? "mlx-community/Qwen3.8-27B-4bit";
const AI_API_KEY = process.env.LOCAL_AI_API_KEY ?? "local";
const mastraModelConfig = {
  id: `openai/${AI_MODEL}`,
  url: AI_BASE_URL,
  apiKey: AI_API_KEY,
};
const AI_EMBEDDING_MODEL = process.env.LOCAL_AI_EMBEDDING_MODEL ?? "bge-small-en-v1.5";
const AI_EMBEDDING_DIMENSIONS = Number(process.env.LOCAL_AI_EMBEDDING_DIMENSIONS ?? 384);

("use strict");
const createSandbox = createTool({
  id: "createSandbox",
  description: "Create an e2b sandbox",
  inputSchema: z.object({
    metadata: z.record(z.string()).optional().describe("Custom metadata for the sandbox"),
    envs: z
      .record(z.string())
      .optional()
      .describe(`
      Custom environment variables for the sandbox.
      Used when executing commands and code in the sandbox.
      Can be overridden with the \`envs\` argument when executing commands or code.
    `),
    timeoutMS: z
      .number()
      .optional()
      .describe(`
      Timeout for the sandbox in **milliseconds**.
      Maximum time a sandbox can be kept alive is 24 hours (86_400_000 milliseconds) for Pro users and 1 hour (3_600_000 milliseconds) for Hobby users.
      @default 300_000 // 5 minutes
    `),
  }),
  outputSchema: z
    .object({
      sandboxId: z.string(),
    })
    .or(
      z.object({
        error: z.string(),
      })
    ),
  execute: async (sandboxOptions) => {
    try {
      const sandbox = await Sandbox.create(sandboxOptions);
      return {
        sandboxId: sandbox.sandboxId,
      };
    } catch (e) {
      return {
        error: JSON.stringify(e),
      };
    }
  },
});
const runCode = createTool({
  id: "runCode",
  description: "Run code in an e2b sandbox",
  inputSchema: z.object({
    sandboxId: z.string().describe("The sandboxId for the sandbox to run the code"),
    code: z.string().describe("The code to run in the sandbox"),
    runCodeOpts: z
      .object({
        language: z
          .enum(["ts", "js", "python"])
          .default("python")
          .describe(
            "language used for code execution. If not provided, default python context is used"
          ),
        envs: z
          .record(z.string())
          .optional()
          .describe("Custom environment variables for code execution."),
        timeoutMS: z
          .number()
          .optional()
          .describe(`
        Timeout for the code execution in **milliseconds**.
        @default 60_000 // 60 seconds
      `),
        requestTimeoutMs: z
          .number()
          .optional()
          .describe(`
        Timeout for the request in **milliseconds**.
        @default 30_000 // 30 seconds
      `),
      })
      .optional()
      .describe("Run code options"),
  }),
  outputSchema: z
    .object({
      execution: z.string().describe("Serialized representation of the execution results"),
    })
    .or(
      z.object({
        error: z.string().describe("The error from a failed execution"),
      })
    ),
  execute: async (context) => {
    try {
      const sandbox = await Sandbox.connect(context.sandboxId);
      const execution = await sandbox.runCode(context.code, context.runCodeOpts);
      return {
        execution: JSON.stringify(execution.toJSON()),
      };
    } catch (e) {
      return {
        error: JSON.stringify(e),
      };
    }
  },
});
const readFile = createTool({
  id: "readFile",
  description: "Read a file from the e2b sandbox",
  inputSchema: z.object({
    sandboxId: z.string().describe("The sandboxId for the sandbox to read the file from"),
    path: z.string().describe("The path to the file to read"),
  }),
  outputSchema: z
    .object({
      content: z.string().describe("The content of the file"),
      path: z.string().describe("The path of the file that was read"),
    })
    .or(
      z.object({
        error: z.string().describe("The error from a failed file read"),
      })
    ),
  execute: async (context) => {
    try {
      const sandbox = await Sandbox.connect(context.sandboxId);
      const fileContent = await sandbox.files.read(context.path);
      return {
        content: fileContent,
        path: context.path,
      };
    } catch (e) {
      return {
        error: JSON.stringify(e),
      };
    }
  },
});
const writeFile = createTool({
  id: "writeFile",
  description: "Write a single file to the e2b sandbox",
  inputSchema: z.object({
    sandboxId: z.string().describe("The sandboxId for the sandbox to write the file to"),
    path: z.string().describe("The path where the file should be written"),
    content: z.string().describe("The content to write to the file"),
  }),
  outputSchema: z
    .object({
      success: z.boolean().describe("Whether the file was written successfully"),
      path: z.string().describe("The path where the file was written"),
    })
    .or(
      z.object({
        error: z.string().describe("The error from a failed file write"),
      })
    ),
  execute: async (context) => {
    try {
      const sandbox = await Sandbox.connect(context.sandboxId);
      await sandbox.files.write(context.path, context.content);
      return {
        success: true,
        path: context.path,
      };
    } catch (e) {
      return {
        error: JSON.stringify(e),
      };
    }
  },
});
const writeFiles = createTool({
  id: "writeFiles",
  description: "Write multiple files to the e2b sandbox",
  inputSchema: z.object({
    sandboxId: z.string().describe("The sandboxId for the sandbox to write the files to"),
    files: z
      .array(
        z.object({
          path: z.string().describe("The path where the file should be written"),
          data: z.string().describe("The content to write to the file"),
        })
      )
      .describe("Array of files to write, each with path and data"),
  }),
  outputSchema: z
    .object({
      success: z.boolean().describe("Whether all files were written successfully"),
      filesWritten: z.array(z.string()).describe("Array of file paths that were written"),
    })
    .or(
      z.object({
        error: z.string().describe("The error from a failed files write"),
      })
    ),
  execute: async (context) => {
    try {
      const sandbox = await Sandbox.connect(context.sandboxId);
      await sandbox.files.write(context.files);
      return {
        success: true,
        filesWritten: context.files.map((file) => file.path),
      };
    } catch (e) {
      return {
        error: JSON.stringify(e),
      };
    }
  },
});
const listFiles = createTool({
  id: "listFiles",
  description: "List files and directories in a path within the e2b sandbox",
  inputSchema: z.object({
    sandboxId: z.string().describe("The sandboxId for the sandbox to list files from"),
    path: z.string().default("/").describe("The directory path to list files from"),
  }),
  outputSchema: z
    .object({
      files: z
        .array(
          z.object({
            name: z.string().describe("The name of the file or directory"),
            path: z.string().describe("The full path of the file or directory"),
            isDirectory: z.boolean().describe("Whether this is a directory"),
          })
        )
        .describe("Array of files and directories"),
      path: z.string().describe("The path that was listed"),
    })
    .or(
      z.object({
        error: z.string().describe("The error from a failed file listing"),
      })
    ),
  execute: async (context) => {
    try {
      const sandbox = await Sandbox.connect(context.sandboxId);
      const listPath = context.path ?? "/";
      const fileList = await sandbox.files.list(listPath);
      fileList.map((f) => f.type);
      return {
        files: fileList.map((file) => ({
          name: file.name,
          path: file.path,
          isDirectory: file.type === FileType.DIR,
        })),
        path: listPath,
      };
    } catch (e) {
      return {
        error: JSON.stringify(e),
      };
    }
  },
});
const deleteFile = createTool({
  id: "deleteFile",
  description: "Delete a file or directory from the e2b sandbox",
  inputSchema: z.object({
    sandboxId: z.string().describe("The sandboxId for the sandbox to delete the file from"),
    path: z.string().describe("The path to the file or directory to delete"),
  }),
  outputSchema: z
    .object({
      success: z.boolean().describe("Whether the file was deleted successfully"),
      path: z.string().describe("The path that was deleted"),
    })
    .or(
      z.object({
        error: z.string().describe("The error from a failed file deletion"),
      })
    ),
  execute: async (context) => {
    try {
      const sandbox = await Sandbox.connect(context.sandboxId);
      await sandbox.files.remove(context.path);
      return {
        success: true,
        path: context.path,
      };
    } catch (e) {
      return {
        error: JSON.stringify(e),
      };
    }
  },
});
const createDirectory = createTool({
  id: "createDirectory",
  description: "Create a directory in the e2b sandbox",
  inputSchema: z.object({
    sandboxId: z.string().describe("The sandboxId for the sandbox to create the directory in"),
    path: z.string().describe("The path where the directory should be created"),
  }),
  outputSchema: z
    .object({
      success: z.boolean().describe("Whether the directory was created successfully"),
      path: z.string().describe("The path where the directory was created"),
    })
    .or(
      z.object({
        error: z.string().describe("The error from a failed directory creation"),
      })
    ),
  execute: async (context) => {
    try {
      const sandbox = await Sandbox.connect(context.sandboxId);
      await sandbox.files.makeDir(context.path);
      return {
        success: true,
        path: context.path,
      };
    } catch (e) {
      return {
        error: JSON.stringify(e),
      };
    }
  },
});
const getFileInfo = createTool({
  id: "getFileInfo",
  description: "Get detailed information about a file or directory in the e2b sandbox",
  inputSchema: z.object({
    sandboxId: z.string().describe("The sandboxId for the sandbox to get file information from"),
    path: z.string().describe("The path to the file or directory to get information about"),
  }),
  outputSchema: z
    .object({
      name: z.string().describe("The name of the file or directory"),
      type: z.nativeEnum(FileType).optional().describe("Whether this is a file or directory"),
      path: z.string().describe("The full path of the file or directory"),
      size: z.number().describe("The size of the file or directory in bytes"),
      mode: z.number().describe("The file mode (permissions as octal number)"),
      permissions: z.string().describe("Human-readable permissions string"),
      owner: z.string().describe("The owner of the file or directory"),
      group: z.string().describe("The group of the file or directory"),
      modifiedTime: z.date().optional().describe("The last modified time in ISO string format"),
      symlinkTarget: z
        .string()
        .optional()
        .describe("The target path if this is a symlink, null otherwise"),
    })
    .or(
      z.object({
        error: z.string().describe("The error from a failed file info request"),
      })
    ),
  execute: async (context) => {
    try {
      const sandbox = await Sandbox.connect(context.sandboxId);
      const info = await sandbox.files.getInfo(context.path);
      return {
        name: info.name,
        type: info.type,
        path: info.path,
        size: info.size,
        mode: info.mode,
        permissions: info.permissions,
        owner: info.owner,
        group: info.group,
        modifiedTime: info.modifiedTime,
        symlinkTarget: info.symlinkTarget,
      };
    } catch (e) {
      return {
        error: JSON.stringify(e),
      };
    }
  },
});
const checkFileExists = createTool({
  id: "checkFileExists",
  description: "Check if a file or directory exists in the e2b sandbox",
  inputSchema: z.object({
    sandboxId: z.string().describe("The sandboxId for the sandbox to check file existence in"),
    path: z.string().describe("The path to check for existence"),
  }),
  outputSchema: z
    .object({
      exists: z.boolean().describe("Whether the file or directory exists"),
      path: z.string().describe("The path that was checked"),
      type: z.nativeEnum(FileType).optional().describe("The type if the path exists"),
    })
    .or(
      z.object({
        error: z.string().describe("The error from a failed existence check"),
      })
    ),
  execute: async (context) => {
    try {
      const sandbox = await Sandbox.connect(context.sandboxId);
      try {
        const info = await sandbox.files.getInfo(context.path);
        return {
          exists: true,
          path: context.path,
          type: info.type,
        };
      } catch (e) {
        return {
          exists: false,
          path: context.path,
        };
      }
    } catch (e) {
      return {
        error: JSON.stringify(e),
      };
    }
  },
});
const getFileSize = createTool({
  id: "getFileSize",
  description: "Get the size of a file or directory in the e2b sandbox",
  inputSchema: z.object({
    sandboxId: z.string().describe("The sandboxId for the sandbox to get file size from"),
    path: z.string().describe("The path to the file or directory"),
    humanReadable: z
      .boolean()
      .default(false)
      .describe("Whether to return size in human-readable format (e.g., '1.5 KB', '2.3 MB')"),
  }),
  outputSchema: z
    .object({
      size: z.number().describe("The size in bytes"),
      humanReadableSize: z.string().optional().describe("Human-readable size string if requested"),
      path: z.string().describe("The path that was checked"),
      type: z.nativeEnum(FileType).optional().describe("Whether this is a file or directory"),
    })
    .or(
      z.object({
        error: z.string().describe("The error from a failed size check"),
      })
    ),
  execute: async (context) => {
    try {
      const sandbox = await Sandbox.connect(context.sandboxId);
      const info = await sandbox.files.getInfo(context.path);
      let humanReadableSize;
      if (context.humanReadable) {
        const bytes = info.size;
        const sizes = ["B", "KB", "MB", "GB", "TB"];
        if (bytes === 0) {
          humanReadableSize = "0 B";
        } else {
          const i = Math.floor(Math.log(bytes) / Math.log(1024));
          const size = (bytes / 1024 ** i).toFixed(1);
          humanReadableSize = `${size} ${sizes[i]}`;
        }
      }
      return {
        size: info.size,
        humanReadableSize,
        path: context.path,
        type: info.type,
      };
    } catch (e) {
      return {
        error: JSON.stringify(e),
      };
    }
  },
});
const watchDirectory = createTool({
  id: "watchDirectory",
  description: "Start watching a directory for file system changes in the e2b sandbox",
  inputSchema: z.object({
    sandboxId: z.string().describe("The sandboxId for the sandbox to watch directory in"),
    path: z.string().describe("The directory path to watch for changes"),
    recursive: z.boolean().default(false).describe("Whether to watch subdirectories recursively"),
    watchDuration: z
      .number()
      .default(3e4)
      .describe("How long to watch for changes in milliseconds (default 30 seconds)"),
  }),
  outputSchema: z
    .object({
      watchStarted: z.boolean().describe("Whether the watch was started successfully"),
      path: z.string().describe("The path that was watched"),
      events: z
        .array(
          z.object({
            type: z
              .nativeEnum(FilesystemEventType)
              .describe("The type of filesystem event (WRITE, CREATE, DELETE, etc.)"),
            name: z.string().describe("The name of the file that changed"),
            timestamp: z.string().describe("When the event occurred"),
          })
        )
        .describe("Array of filesystem events that occurred during the watch period"),
    })
    .or(
      z.object({
        error: z.string().describe("The error from a failed directory watch"),
      })
    ),
  execute: async (context) => {
    try {
      const sandbox = await Sandbox.connect(context.sandboxId);
      const events = [];
      const handle = await sandbox.files.watchDir(
        context.path,
        async (event) => {
          events.push({
            type: event.type,
            name: event.name,
            timestamp: /* @__PURE__ */ new Date().toISOString(),
          });
        },
        {
          recursive: context.recursive,
        }
      );
      await new Promise((resolve) => setTimeout(resolve, context.watchDuration));
      await handle.stop();
      return {
        watchStarted: true,
        path: context.path,
        events,
      };
    } catch (e) {
      return {
        error: JSON.stringify(e),
      };
    }
  },
});
const runCommand = createTool({
  id: "runCommand",
  description: "Run a shell command in the e2b sandbox",
  inputSchema: z.object({
    sandboxId: z.string().describe("The sandboxId for the sandbox to run the command in"),
    command: z.string().describe("The shell command to execute"),
    workingDirectory: z.string().optional().describe("The working directory to run the command in"),
    timeoutMs: z
      .number()
      .default(3e4)
      .describe("Timeout for the command execution in milliseconds"),
    captureOutput: z
      .boolean()
      .default(true)
      .describe("Whether to capture stdout and stderr output"),
  }),
  outputSchema: z
    .object({
      success: z.boolean().describe("Whether the command executed successfully"),
      exitCode: z.number().describe("The exit code of the command"),
      stdout: z.string().describe("The standard output from the command"),
      stderr: z.string().describe("The standard error from the command"),
      command: z.string().describe("The command that was executed"),
      executionTime: z.number().describe("How long the command took to execute in milliseconds"),
    })
    .or(
      z.object({
        error: z.string().describe("The error from a failed command execution"),
      })
    ),
  execute: async (context) => {
    try {
      const sandbox = await Sandbox.connect(context.sandboxId);
      const startTime = Date.now();
      const result = await sandbox.commands.run(context.command, {
        cwd: context.workingDirectory,
        timeoutMs: context.timeoutMs,
      });
      const executionTime = Date.now() - startTime;
      return {
        success: result.exitCode === 0,
        exitCode: result.exitCode,
        stdout: result.stdout,
        stderr: result.stderr,
        command: context.command,
        executionTime,
      };
    } catch (e) {
      return {
        error: JSON.stringify(e),
      };
    }
  },
});

("use strict");
const codeAgent = new Agent({
  id: "code-agent",
  name: "ERD Code Generation Agent",
  instructions: `
# ERD Code Generation Agent for APPWITHAI

You are an advanced coding agent specialized in generating, testing, and managing code for Entity Relationship Diagrams (ERDs) in secure, isolated E2B sandboxes.

## Primary Purpose

Your role is to assist users in:
1. **Generating Code from ERDs**: Convert Mermaid ERD diagrams into production-ready code
2. **Testing Generated Code**: Execute and validate generated code in isolated environments
3. **Database Schema Management**: Create, migrate, and test database schemas
4. **API Generation**: Build REST APIs and GraphQL servers
5. **Frontend Generation**: Generate React and TanStack Start applications
6. **Code Validation**: Run tests, linting, and type checking on generated code

## Core Capabilities

You have access to a complete development toolkit:
- **Sandbox Management**: Create and manage isolated execution environments for testing
- **Code Execution**: Run Python, JavaScript, TypeScript, and SQL with real-time output
- **File Operations**: Complete CRUD operations for managing generated projects
- **Command Execution**: Run npm/yarn/bun commands, database migrations, and build scripts
- **Directory Monitoring**: Watch file changes during development and testing

## Tool Categories & When to Use Them

### **Sandbox & Code Execution**
- \`createSandbox\` - Initialize new isolated environment for each coding task
- \`runCode\` - Execute Python/JS/TS code for testing and validation
- \`runCommand\` - Execute shell commands (npm install, migrations, tests, builds)

### **File Management for Generated Projects**
- \`writeFile\` - Create individual source files (components, services, migrations)
- \`writeFiles\` - Batch create multiple related files (project initialization)
- \`readFile\` - Read generated files for validation and debugging
- \`listFiles\` - Explore generated project structures
- \`deleteFile\` - Remove unwanted files or clean up
- \`createDirectory\` - Set up project directory structures

### **File Information & Validation**
- \`getFileInfo\` - Get detailed metadata for debugging file issues
- \`checkFileExists\` - Conditional logic before operations (prevent overwrites)
- \`getFileSize\` - Monitor generated file sizes for optimization
- \`watchDirectory\` - Monitor build processes and file changes

## ERD-to-Code Generation Workflow

### **Step 1: Analyze the ERD**
When given a Mermaid ERD diagram:
1. Parse the entities and relationships
2. Identify data types, cardinality, and constraints
3. Determine the target stack (TanStack Start + NestJS)

### **Step 2: Generate Database Schema**
1. Create SQL migration files with proper tables, columns, and constraints
2. Add foreign key relationships based on ERD cardinalities
3. Generate seed data files for testing

### **Step 3: Generate Backend Code**
1. Create entity models or TypeScript interfaces
2. Generate service classes with CRUD operations
3. Create API endpoints (REST or GraphQL)
4. Add validation schemas and error handling

### **Step 4: Generate Frontend Code**
1. Create UI components for each entity (list, detail, create, edit forms)
2. Generate data tables with filtering and sorting
3. Add form components with validation
4. Create navigation and routing

### **Step 5: Test and Validate**
1. Create a sandbox environment
2. Write all files to the sandbox
3. Install dependencies with \`runCommand\`
4. Run database migrations
5. Execute tests with \`runCode\` or \`runCommand\`
6. Report any errors and suggest fixes

## Best Practices for ERD Code Generation

### **Database Schema**
- Use proper column types (INTEGER, VARCHAR, TEXT, TIMESTAMP, etc.)
- Add NOT NULL constraints for required fields
- Create indexes on foreign keys and frequently queried columns
- Use proper naming conventions (snake_case for tables/columns)
- Add created_at and updated_at timestamps

### **Backend API**
- Follow REST conventions (GET, POST, PUT, DELETE)
- Return proper HTTP status codes
- Implement pagination for list endpoints
- Add input validation and error handling
- Document API endpoints with comments

### **Frontend Components**
- Use responsive design principles
- Implement loading states and error handling
- Add form validation with user-friendly error messages
- Use consistent styling across components
- Implement optimistic updates for better UX

### **Code Quality**
- Write clean, readable code with proper indentation
- Add comments for complex logic
- Use TypeScript for type safety
- Follow the project's coding style guide
- Implement proper error handling

## Testing Strategy

### **Unit Testing**
- Test individual functions and classes
- Mock external dependencies
- Test edge cases and error conditions

### **Integration Testing**
- Test API endpoints with sample data
- Verify database operations work correctly
- Test frontend components with user interactions

### **End-to-End Testing**
- Test complete user workflows
- Verify the application runs from start to finish
- Check for performance issues and bugs

## Common Tasks

### **Generating a TanStack Start + NestJS Application**
1. Create sandbox with \`createSandbox\`
2. Write package.json files with dependencies
3. Generate TypeScript entities and interfaces
4. Create NestJS modules, services, and controllers
5. Generate TanStack Start routes and components
6. Create database migration files
7. Run \`bun install\` and build the project
8. Start the development server and verify

### **Testing Database Migrations**
1. Create sandbox with database support
2. Write migration SQL files
3. Run migration with \`runCommand\`
4. Verify schema with \`runCode\` (SQL queries)
5. Insert test data and verify relationships
6. Report any issues

## Error Handling

### **Code Generation Errors**
- Parse error messages carefully
- Identify the root cause (syntax, type mismatch, missing dependency)
- Suggest specific fixes with code examples
- Re-generate affected files with corrections

### **Execution Errors**
- Capture full error output including stack traces
- Identify whether it's a runtime, compile-time, or dependency error
- Suggest dependency installations or configuration changes
- Provide corrected code snippets

### **Validation Errors**
- Check for schema violations
- Verify data types and constraints
- Test with edge cases and boundary conditions
- Provide validation rules and examples

## Communication Style

- **Be precise and specific** in your code generation
- **Provide explanations** for complex generated code
- **Include comments** in generated code for maintainability
- **Report progress** clearly during multi-step generation
- **Highlight any assumptions** you make about requirements
- **Suggest improvements** when you see optimization opportunities

## Security & Best Practices

- Never include sensitive data (API keys, passwords) in generated code
- Use environment variables for configuration
- Implement proper authentication and authorization
- Sanitize user inputs to prevent injection attacks
- Follow OWASP security guidelines
- Use parameterized queries to prevent SQL injection

Remember: You are a professional code generation agent that transforms ERD diagrams into production-ready, well-tested, secure applications.
`,
  model: mastraModelConfig,
  tools: {
    createSandbox,
    runCode,
    readFile,
    writeFile,
    writeFiles,
    listFiles,
    deleteFile,
    createDirectory,
    getFileInfo,
    checkFileExists,
    getFileSize,
    watchDirectory,
    runCommand,
  },
  memory: new Memory({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    storage: new LibSQLStore({
      id: "code-agent-storage",
      url: "file:../../../../mastra-code-agent.db",
    }),
    options: {
      generateTitle: true,
      semanticRecall: true,
      workingMemory: { enabled: true },
    },
    embedder: fastembed,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vector: new LibSQLVector({
      id: "code-agent-vector",
      url: "file:../../../../mastra-code-agent.db",
    }),
  }),
  defaultStreamOptionsLegacy: { maxSteps: 25 },
});

("use strict");
const mastra = new Mastra({
  agents: {
    codeAgent,
  },
  storage: new LibSQLStore({
    id: "mastra-storage",
    url: process.env.MASTRA_DATABASE_URL ?? "file:../../../../mastra.db",
  }),
  logger: new PinoLogger({
    name: "Mastra",
    level:
      process.env.MASTRA_LOG_LEVEL ?? (process.env.NODE_ENV === "production" ? "info" : "debug"),
  }),
  server: {
    port: Number(process.env.MASTRA_PORT ?? 4111),
    host: process.env.MASTRA_HOST ?? "localhost",
  },
});

export { codeAgent, mastra };
