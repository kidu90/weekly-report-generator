import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

export interface McpToolDefinition {
  name: string;
  description?: string;
  inputSchema: {
    $schema?: string;
    type: "object";
    properties?: Record<string, unknown>;
    required?: string[];
  };
}

export interface ConnectedMcpClient {
  tools: McpToolDefinition[];
  callTool: (
    name: string,
    args?: Record<string, unknown>,
  ) => Promise<{
    content: Array<{ type: string; text?: string; [key: string]: unknown }>;
    isError?: boolean;
    structuredContent?: unknown;
  }>;
  close: () => Promise<void>;
}

function getMcpServerUrl(): URL {
  const port = process.env.PORT || "5000";
  const baseUrl = process.env.MCP_BASE_URL || `http://localhost:${port}`;
  return new URL(`${baseUrl.replace(/\/$/, "")}/mcp`);
}

export async function createMcpClient(
  authorizationHeader: string,
): Promise<ConnectedMcpClient> {
  const transport = new StreamableHTTPClientTransport(getMcpServerUrl(), {
    requestInit: {
      headers: {
        Authorization: authorizationHeader,
      },
    },
  });

  const client = new Client(
    { name: "weekly-report-generator-chat", version: "1.0.0" },
    { capabilities: {} },
  );
  await client.connect(transport);

  const toolsResult = await client.listTools();
  console.info(
    `[mcpClient] Connected to MCP server with ${toolsResult.tools.length} tools: ${toolsResult.tools.map((tool) => tool.name).join(", ")}`,
  );

  return {
    tools: toolsResult.tools as McpToolDefinition[],
    callTool: async (name, args) => {
      const result = await client.callTool({
        name,
        arguments: args ?? {},
      });

      return result as {
        content: Array<{ type: string; text?: string; [key: string]: unknown }>;
        isError?: boolean;
        structuredContent?: unknown;
      };
    },
    close: async () => {
      await transport.close();
    },
  };
}
