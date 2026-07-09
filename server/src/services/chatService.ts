import { randomUUID } from "node:crypto";
import { ServiceError } from "../utils/errors";
import { getWeekRange } from "../utils/dates";
import { createMcpClient, type McpToolDefinition } from "../ai/mcpClient";

type ChatRole = "user" | "assistant";

type AnthropicTextBlock = {
  type: "text";
  text: string;
};

type AnthropicToolUseBlock = {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, unknown>;
};

type AnthropicToolResultBlock = {
  type: "tool_result";
  tool_use_id: string;
  content: string;
  is_error?: boolean;
};

type AnthropicContentBlock =
  | AnthropicTextBlock
  | AnthropicToolUseBlock
  | AnthropicToolResultBlock;

type AnthropicMessage = {
  role: ChatRole;
  content: AnthropicContentBlock[];
};

type ConversationState = {
  managerId: string;
  messages: AnthropicMessage[];
  updatedAt: number;
};

type ChatResponse = {
  conversationId: string;
  reply: string;
};

type AnthropicMessagesResponse = {
  content: AnthropicContentBlock[];
};

type AnthropicTool = {
  name: string;
  description?: string;
  input_schema: McpToolDefinition["inputSchema"];
};

const conversations = new Map<string, ConversationState>();
const MAX_HISTORY_MESSAGES = 20;
const MAX_TOOL_ROUNDS = 5;
const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

const SYSTEM_PROMPT = [
  "You are the Weekly Report Generator manager assistant.",
  "You may only use the MCP tools that are explicitly provided to you.",
  "Do not fabricate data, totals, trends, or report content.",
  "If a tool returns no data for the requested period or team, say so clearly.",
  "Only use report and dashboard data that a Manager can already see through the API.",
  "Keep answers concise, factual, and actionable.",
].join(" ");

const TEAM_SUMMARY_PROMPT = [
  SYSTEM_PROMPT,
  "Use the provided dashboard data to produce a short team summary with three labeled sections: completed work, recurring blockers, and workload imbalance.",
  "If a section has no meaningful data, say that plainly rather than inventing detail.",
].join(" ");

function trimHistory(messages: AnthropicMessage[]): AnthropicMessage[] {
  if (messages.length <= MAX_HISTORY_MESSAGES) {
    return messages;
  }

  return messages.slice(-MAX_HISTORY_MESSAGES);
}

function getConversationState(
  conversationId: string | undefined,
  managerId: string,
) {
  if (conversationId) {
    const existing = conversations.get(conversationId);

    if (existing && existing.managerId !== managerId) {
      throw new ServiceError(
        403,
        "Conversation belongs to a different manager",
      );
    }

    if (existing) {
      return { conversationId, state: existing };
    }

    const created = {
      managerId,
      messages: [] as AnthropicMessage[],
      updatedAt: Date.now(),
    } satisfies ConversationState;

    conversations.set(conversationId, created);
    return { conversationId, state: created };
  }

  const createdConversationId = randomUUID();
  const created = {
    managerId,
    messages: [] as AnthropicMessage[],
    updatedAt: Date.now(),
  } satisfies ConversationState;

  conversations.set(createdConversationId, created);
  return { conversationId: createdConversationId, state: created };
}

function toAnthropicTools(tools: McpToolDefinition[]): AnthropicTool[] {
  return tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    input_schema: tool.inputSchema,
  }));
}

function serializeToolResult(result: {
  content: Array<{ type: string; text?: string; [key: string]: unknown }>;
  isError?: boolean;
  structuredContent?: unknown;
}): string {
  if (result.structuredContent !== undefined) {
    return JSON.stringify(result.structuredContent, null, 2);
  }

  const textContent = result.content
    .map((item) => (item.type === "text" ? item.text : JSON.stringify(item)))
    .filter((value): value is string => Boolean(value?.trim()));

  if (textContent.length > 0) {
    return textContent.join("\n");
  }

  return JSON.stringify(result, null, 2);
}

function extractAssistantText(blocks: AnthropicContentBlock[]): string {
  return blocks
    .filter((block): block is AnthropicTextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();
}

async function callAnthropicMessages(
  apiKey: string,
  body: Record<string, unknown>,
): Promise<AnthropicMessagesResponse> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  const payload = (await response.json()) as {
    error?: { message?: string };
    content?: AnthropicContentBlock[];
  };

  if (!response.ok) {
    throw new ServiceError(
      502,
      payload.error?.message ||
        `Anthropic API request failed with status ${response.status}`,
    );
  }

  return {
    content: payload.content ?? [],
  };
}

async function getMcpSession(authorizationHeader: string) {
  if (!authorizationHeader?.startsWith("Bearer ")) {
    throw new ServiceError(401, "Missing or invalid Authorization header");
  }

  return createMcpClient(authorizationHeader);
}

async function runAnthropicLoop(params: {
  authorizationHeader: string;
  managerId: string;
  systemPrompt: string;
  userMessage: string;
  conversationId?: string;
}): Promise<ChatResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new ServiceError(500, "ANTHROPIC_API_KEY is not configured");
  }

  const mcpSession = await getMcpSession(params.authorizationHeader);

  try {
    const { conversationId, state } = getConversationState(
      params.conversationId,
      params.managerId,
    );

    state.messages = trimHistory([
      ...state.messages,
      {
        role: "user",
        content: [{ type: "text", text: params.userMessage }],
      },
    ]);
    state.updatedAt = Date.now();

    const anthropicTools = toAnthropicTools(mcpSession.tools);

    for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
      const response = await callAnthropicMessages(apiKey, {
        model: DEFAULT_MODEL,
        max_tokens: 1024,
        system: params.systemPrompt,
        messages: state.messages,
        tools: anthropicTools,
      });

      const toolUseBlocks = response.content.filter(
        (block): block is AnthropicToolUseBlock => block.type === "tool_use",
      );

      state.messages = trimHistory([
        ...state.messages,
        {
          role: "assistant",
          content: response.content,
        },
      ]);
      state.updatedAt = Date.now();

      if (toolUseBlocks.length === 0) {
        const reply = extractAssistantText(response.content);

        if (!reply) {
          throw new ServiceError(
            502,
            "Anthropic returned an empty assistant response",
          );
        }

        conversations.set(conversationId, {
          managerId: params.managerId,
          messages: state.messages,
          updatedAt: Date.now(),
        });

        return { conversationId, reply };
      }

      const toolResults: AnthropicToolResultBlock[] = [];

      for (const toolUse of toolUseBlocks) {
        const result = await mcpSession.callTool(toolUse.name, toolUse.input);
        toolResults.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: serializeToolResult(result),
          is_error: result.isError,
        });
      }

      state.messages = trimHistory([
        ...state.messages,
        {
          role: "user",
          content: toolResults,
        },
      ]);
      state.updatedAt = Date.now();
    }

    throw new ServiceError(
      500,
      "Chat tool loop exceeded the maximum number of rounds",
    );
  } finally {
    await mcpSession.close();
  }
}

export async function generateManagerChatReply(params: {
  authorizationHeader: string;
  managerId: string;
  message: string;
  conversationId?: string;
}): Promise<ChatResponse> {
  return runAnthropicLoop({
    authorizationHeader: params.authorizationHeader,
    managerId: params.managerId,
    systemPrompt: SYSTEM_PROMPT,
    userMessage: params.message,
    conversationId: params.conversationId,
  });
}

export async function generateTeamSummary(params: {
  authorizationHeader: string;
  managerId: string;
}): Promise<{ reply: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new ServiceError(500, "ANTHROPIC_API_KEY is not configured");
  }

  const mcpSession = await getMcpSession(params.authorizationHeader);

  try {
    const { weekStart, weekEndDate } = getWeekRange(new Date());
    const [summary, submissionStatus, workload] = await Promise.all([
      mcpSession.callTool("get_dashboard_summary", {
        weekStart: weekStart.toISOString(),
      }),
      mcpSession.callTool("get_submission_status", {
        weekStart: weekStart.toISOString(),
      }),
      mcpSession.callTool("get_workload_by_project", {
        from: weekStart.toISOString(),
        to: weekEndDate.toISOString(),
      }),
    ]);

    const response = await callAnthropicMessages(apiKey, {
      model: DEFAULT_MODEL,
      max_tokens: 512,
      system: TEAM_SUMMARY_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: [
                "Summarize this week's team status in three short sections named completed work, recurring blockers, and workload imbalance.",
                "Use only the data below.",
                "If the data is sparse or empty, say that plainly.",
                `dashboard_summary: ${serializeToolResult(summary)}`,
                `submission_status: ${serializeToolResult(submissionStatus)}`,
                `workload: ${serializeToolResult(workload)}`,
              ].join("\n\n"),
            },
          ],
        },
      ],
    });

    const reply = extractAssistantText(response.content);

    if (!reply) {
      throw new ServiceError(
        502,
        "Anthropic returned an empty summary response",
      );
    }

    return { reply };
  } finally {
    await mcpSession.close();
  }
}
