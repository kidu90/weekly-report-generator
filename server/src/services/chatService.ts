import { randomUUID } from "node:crypto";
import { ServiceError } from "../utils/errors";
import { getWeekRange } from "../utils/dates";
import { createMcpClient } from "../ai/mcpClient";
import {
  buildFunctionResponseParts,
  createGeminiClient,
  extractGeminiReply,
  generateGeminiContent,
  getGeminiModel,
  parseMcpToolResult,
  toGeminiFunctionDeclarations,
  userTextContent,
  type GeminiContent,
} from "../ai/geminiHelpers";

type ConversationState = {
  managerId: string;
  messages: GeminiContent[];
  updatedAt: number;
};

type ChatResponse = {
  conversationId: string;
  reply: string;
};

const conversations = new Map<string, ConversationState>();
const MAX_HISTORY_MESSAGES = 20;
const MAX_TOOL_ROUNDS = 5;

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

function trimHistory(messages: GeminiContent[]): GeminiContent[] {
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
      messages: [] as GeminiContent[],
      updatedAt: Date.now(),
    } satisfies ConversationState;

    conversations.set(conversationId, created);
    return { conversationId, state: created };
  }

  const createdConversationId = randomUUID();
  const created = {
    managerId,
    messages: [] as GeminiContent[],
    updatedAt: Date.now(),
  } satisfies ConversationState;

  conversations.set(createdConversationId, created);
  return { conversationId: createdConversationId, state: created };
}

async function getMcpSession(authorizationHeader: string) {
  if (!authorizationHeader?.startsWith("Bearer ")) {
    throw new ServiceError(401, "Missing or invalid Authorization header");
  }

  try {
    return await createMcpClient(authorizationHeader);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to connect to MCP server";

    throw new ServiceError(502, `Assistant tools unavailable: ${message}`);
  }
}

async function runGeminiToolLoop(params: {
  authorizationHeader: string;
  managerId: string;
  systemPrompt: string;
  userMessage: string;
  conversationId?: string;
}): Promise<ChatResponse> {
  const gemini = await createGeminiClient();
  const mcpSession = await getMcpSession(params.authorizationHeader);

  try {
    const { conversationId, state } = getConversationState(
      params.conversationId,
      params.managerId,
    );

    state.messages = trimHistory([
      ...state.messages,
      userTextContent(params.userMessage),
    ]);
    state.updatedAt = Date.now();

    const geminiTools = toGeminiFunctionDeclarations(mcpSession.tools);

    for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
      const response = await generateGeminiContent({
        client: gemini,
        model: getGeminiModel(),
        systemInstruction: params.systemPrompt,
        contents: state.messages,
        tools: geminiTools,
      });

      const functionCalls = response.functionCalls ?? [];
      const modelContent = response.candidates?.[0]?.content;

      if (functionCalls.length === 0) {
        if (modelContent) {
          state.messages = trimHistory([...state.messages, modelContent]);
        }

        const reply = await extractGeminiReply(response, "assistant");

        conversations.set(conversationId, {
          managerId: params.managerId,
          messages: state.messages,
          updatedAt: Date.now(),
        });

        return { conversationId, reply };
      }

      if (modelContent) {
        state.messages = trimHistory([...state.messages, modelContent]);
      }

      const toolResults = await Promise.all(
        functionCalls.map(async (call) => {
          if (!call.name) {
            return { error: "Function call is missing a tool name" };
          }

          const result = await mcpSession.callTool(
            call.name,
            call.args ?? {},
          );

          return parseMcpToolResult(result);
        }),
      );

      state.messages = trimHistory([
        ...state.messages,
        {
          role: "user",
          parts: buildFunctionResponseParts(functionCalls, toolResults),
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
  return runGeminiToolLoop({
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
  const gemini = await createGeminiClient();
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

    const response = await generateGeminiContent({
      client: gemini,
      model: getGeminiModel(),
      systemInstruction: TEAM_SUMMARY_PROMPT,
      contents: [
        userTextContent(
          [
            "Summarize this week's team status in three short sections named completed work, recurring blockers, and workload imbalance.",
            "Use only the data below.",
            "If the data is sparse or empty, say that plainly.",
            `dashboard_summary: ${JSON.stringify(parseMcpToolResult(summary), null, 2)}`,
            `submission_status: ${JSON.stringify(parseMcpToolResult(submissionStatus), null, 2)}`,
            `workload: ${JSON.stringify(parseMcpToolResult(workload), null, 2)}`,
          ].join("\n\n"),
        ),
      ],
    });

    return {
      reply: await extractGeminiReply(response, "summary"),
    };
  } finally {
    await mcpSession.close();
  }
}
