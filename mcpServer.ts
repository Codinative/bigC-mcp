#!/usr/bin/env node

import dotenv from "dotenv";
import express, {
  Request,
  Response,
  NextFunction,
  Express,
} from "express";

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";

import { discoverTools } from "./lib/tools.js";

import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, ".env") });

const SERVER_NAME = "bigcommerce-api-mcp";

interface MCPContext {
  api_key?: string | string[];
  store_hash?: string | string[];
}

interface ToolDefinition {
  function: {
    name: string;
    description: string;
    parameters: {
      required?: string[];
      [key: string]: unknown;
    };
  };
}

interface Tool {
  definition: ToolDefinition;
  function: (
    args: Record<string, unknown>,
    context?: MCPContext
  ) => Promise<unknown>;
}

interface TransportMap {
  [sessionId: string]: SSEServerTransport;
}

interface ServerMap {
  [sessionId: string]: Server;
}

async function transformTools(tools: Tool[]) {
  return tools
    .map((tool) => {
      const definitionFunction = tool.definition?.function;

      if (!definitionFunction) {
        return undefined;
      }

      return {
        name: definitionFunction.name,
        description: definitionFunction.description,
        inputSchema: definitionFunction.parameters,
      };
    })
    .filter(Boolean);
}

async function setupServerHandlers(
  server: Server,
  tools: Tool[],
  context?: MCPContext
): Promise<void> {
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: await transformTools(tools),
  }));

  server.setRequestHandler(
    CallToolRequestSchema,
    async (request: any) => {
      const toolName = request.params.name;

      const tool = tools.find(
        (t) => t.definition.function.name === toolName
      );

      if (!tool) {
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${toolName}`
        );
      }

      const args = request.params.arguments ?? {};

      const requiredParameters =
        tool.definition?.function?.parameters?.required || [];

      for (const requiredParameter of requiredParameters) {
        if (!(requiredParameter in args)) {
          throw new McpError(
            ErrorCode.InvalidParams,
            `Missing required parameter: ${requiredParameter}`
          );
        }
      }

      try {
        const result = await tool.function(args, context);

        if (
          result &&
          typeof result === "object" &&
          "error" in result
        ) {
          return {
            content: [
              {
                type: "text",
                text: `Error: ${(result as { error: string }).error}`,
              },
            ],
            isError: true,
          };
        }

        let formattedResult: string;

        if (typeof result === "string") {
          formattedResult = result;
        } else if (typeof result === "object" && result !== null) {
          if (Array.isArray(result)) {
            formattedResult = `Found ${result.length} items:\n${JSON.stringify(
              result,
              null,
              2
            )}`;
          } else if (
            "data" in result &&
            Array.isArray((result as any).data)
          ) {
            formattedResult = `Found ${
              (result as any).data.length
            } items:\n${JSON.stringify(result, null, 2)}`;
          } else {
            formattedResult = JSON.stringify(result, null, 2);
          }
        } else {
          formattedResult = String(result);
        }

        return {
          content: [
            {
              type: "text",
              text: formattedResult,
            },
          ],
          _meta: {
            toolName,
            resultType: typeof result,
            hasData:
              !!result &&
              typeof result === "object" &&
              ("data" in (result as object) ||
                Array.isArray(result)),
            timestamp: new Date().toISOString(),
          },
        };
      } catch (error) {
        console.error("[Error] Failed to fetch data:", error);

        throw new McpError(
          ErrorCode.InternalError,
          `API error: ${
            error instanceof Error
              ? error.message
              : String(error)
          }`
        );
      }
    }
  );
}

function authenticateRequest(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  const expectedToken = process.env.MCP_AUTH_TOKEN;

  if (!expectedToken) {
    next();
    return;
  }

  if (
    !authHeader ||
    !authHeader.startsWith("Bearer ")
  ) {
    res.status(401).json({
      jsonrpc: "2.0",
      error: {
        code: -32001,
        message:
          "Unauthorized: Missing or invalid authorization header",
      },
      id: null,
    });

    return;
  }

  const token = authHeader.substring(7);

  if (token !== expectedToken) {
    res.status(401).json({
      jsonrpc: "2.0",
      error: {
        code: -32001,
        message: "Unauthorized: Invalid token",
      },
      id: null,
    });

    return;
  }

  next();
}

async function setupStreamableHttp(
  tools: Tool[]
): Promise<void> {
  const app: Express = express();

  app.use(express.json());

  app.use(
    (
      req: Request,
      res: Response,
      next: NextFunction
    ) => {
      res.header(
        "Access-Control-Allow-Origin",
        "*"
      );
      res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS"
      );
      res.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept, Authorization, Mcp-Session-Id"
      );

      if (req.method === "OPTIONS") {
        res.sendStatus(200);
      } else {
        next();
      }
    }
  );

  app.get("/health", (_req, res) => {
    res.status(200).json({
      status: "healthy",
      server: SERVER_NAME,
      version: "0.1.0",
      capabilities: ["tools"],
      timestamp: new Date().toISOString(),
    });
  });

  app.get("/info", (_req, res) => {
    res.status(200).json({
      name: SERVER_NAME,
      version: "0.1.0",
      description:
        "BigCommerce API MCP server with tools for products, customers, and orders",
      capabilities: {
        tools: {},
      },
      supportedTransports: [
        "stdio",
        "sse",
        "streamable-http",
      ],
    });
  });

  app.post(
    "/mcp",
    authenticateRequest,
    async (req: Request, res: Response) => {
      try {
        const context: MCPContext = {
          api_key: req.headers["x-api-key"],
          store_hash: req.headers["store-hash"],
        };

        const server = new Server(
          {
            name: SERVER_NAME,
            version: "0.1.0",
          },
          {
            capabilities: {
              tools: {},
            },
          }
        );

        server.onerror = (error) =>
          console.error("[Error]", error);

        await setupServerHandlers(
          server,
          tools,
          context
        );

        const transport =
          new StreamableHTTPServerTransport({
            sessionIdGenerator: undefined,
          });

        res.on("close", async () => {
          await transport.close();
          await server.close();
        });

        await server.connect(transport);

        await transport.handleRequest(
          req,
          res,
          req.body
        );
      } catch (error) {
        console.error(
          "Error handling MCP request:",
          error
        );

        if (!res.headersSent) {
          res.status(500).json({
            jsonrpc: "2.0",
            error: {
              code: -32603,
              message: "Internal server error",
            },
            id: null,
          });
        }
      }
    }
  );

  const port = Number(process.env.PORT) || 8001;

  app.listen(port, () => {
    console.log(
      `[Streamable HTTP Server] running at http://127.0.0.1:${port}/mcp`
    );
    console.log(
      `[Health Check] available at http://127.0.0.1:${port}/health`
    );
    console.log(
      `[Server Info] available at http://127.0.0.1:${port}/info`
    );
  });
}

async function setupSSE(
  tools: Tool[]
): Promise<void> {
  const app: Express = express();

  const transports: TransportMap = {};
  const servers: ServerMap = {};

  app.use(
    (
      req: Request,
      res: Response,
      next: NextFunction
    ) => {
      res.header(
        "Access-Control-Allow-Origin",
        "*"
      );
      res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS"
      );
      res.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control"
      );

      if (req.method === "OPTIONS") {
        res.sendStatus(200);
      } else {
        next();
      }
    }
  );

  app.get("/sse", async (_req, res) => {
    const server = new Server(
      {
        name: SERVER_NAME,
        version: "0.1.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    server.onerror = (error) =>
      console.error("[Error]", error);

    await setupServerHandlers(server, tools);

    const transport = new SSEServerTransport(
      "/messages",
      res
    );

    transports[transport.sessionId] = transport;
    servers[transport.sessionId] = server;

    res.on("close", async () => {
      delete transports[transport.sessionId];
      await server.close();
      delete servers[transport.sessionId];
    });

    await server.connect(transport);
  });

  app.post(
    "/messages",
    async (req: Request, res: Response) => {
      const sessionId = req.query
        .sessionId as string;

      const transport =
        transports[sessionId];
      const server = servers[sessionId];

      if (transport && server) {
        await transport.handlePostMessage(
          req,
          res
        );
      } else {
        res
          .status(400)
          .send(
            "No transport/server found for sessionId"
          );
      }
    }
  );

  app.get("/health", (_req, res) => {
    res.status(200).json({
      status: "healthy",
      server: SERVER_NAME,
      version: "0.1.0",
      transport: "sse",
      activeSessions:
        Object.keys(transports).length,
      timestamp: new Date().toISOString(),
    });
  });

  const port = Number(process.env.PORT) || 3000;

  app.listen(port, () => {
    console.log("[SSE Server] is running:");
    console.log(
      `  SSE stream:    http://127.0.0.1:${port}/sse`
    );
    console.log(
      `  Message input: http://127.0.0.1:${port}/messages`
    );
    console.log(
      `  Health Check:  http://127.0.0.1:${port}/health`
    );
  });
}

async function setupStdio(
  tools: Tool[]
): Promise<void> {
  const server = new Server(
    {
      name: SERVER_NAME,
      version: "0.1.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  server.onerror = (error) =>
    console.error("[Error]", error);

  await setupServerHandlers(server, tools);

  process.on("SIGINT", async () => {
    await server.close();
    process.exit(0);
  });

  const transport =
    new StdioServerTransport();

  await server.connect(transport);
}

async function run(): Promise<void> {
  const args = process.argv.slice(2);

  const isStreamableHttp =
    args.includes("--streamable-http");

  const isSSE = args.includes("--sse");

  try {
    const tools =
      (await discoverTools()) as Tool[];

    console.log(
      `[Server] Loaded ${tools.length}: ${tools
        .map(
          (tool) =>
            tool.definition.function.name
        )
        .join(", ")} tools successfully`
    );

    if (isStreamableHttp && isSSE) {
      console.error(
        "Error: Cannot specify both --streamable-http and --sse"
      );
      process.exit(1);
    }

    if (isStreamableHttp) {
      await setupStreamableHttp(tools);
    } else if (isSSE) {
      await setupSSE(tools);
    } else {
      await setupStdio(tools);
    }
  } catch (error) {
    console.error(
      "[Error] Failed to start server:",
      error instanceof Error
        ? error.message
        : String(error)
    );

    if (isStreamableHttp || isSSE) {
      console.log(
        "[Server] Starting with limited functionality due to initialization error"
      );

      const tools: Tool[] = [];

      if (isStreamableHttp) {
        await setupStreamableHttp(tools);
      } else {
        await setupSSE(tools);
      }
    } else {
      process.exit(1);
    }
  }
}

run().catch(console.error);