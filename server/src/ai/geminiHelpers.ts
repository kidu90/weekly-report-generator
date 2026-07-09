import type { McpToolDefinition } from "./mcpClient";
import { ServiceError } from "../utils/errors";

const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

export type GeminiContent = {
  role?: string;
  parts?: GeminiPart[];
};

export type GeminiPart = {
  text?: string;
  functionCall?: {
    id?: string;
    name?: string;
    args?: Record<string, unknown>;
  };
  functionResponse?: {
    id?: string;
    name?: string;
    response?: Record<string, unknown>;
  };
};

type GeminiFunctionCall = NonNullable<GeminiPart["functionCall"]>;

type GeminiGenerateResponse = {
  text?: string;
  functionCalls?: GeminiFunctionCall[];
  candidates?: Array<{
    content?: GeminiContent;
    finishReason?: string;
  }>;
};

async function loadGeminiSdk() {
  return import("@google/genai");
}

export function getGeminiModel(): string {
  return DEFAULT_MODEL;
}

export async function createGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new ServiceError(500, "GEMINI_API_KEY is not configured");
  }

  const { GoogleGenAI } = await loadGeminiSdk();
  return new GoogleGenAI({ apiKey });
}

export function toGeminiFunctionDeclarations(tools: McpToolDefinition[]) {
  return tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    parametersJsonSchema: {
      type: "object",
      properties: tool.inputSchema.properties ?? {},
      required: tool.inputSchema.required ?? [],
    },
  }));
}

export function userTextContent(text: string): GeminiContent {
  return {
    role: "user",
    parts: [{ text }],
  };
}

export function parseMcpToolResult(result: {
  content: Array<{ type: string; text?: string; [key: string]: unknown }>;
  isError?: boolean;
  structuredContent?: unknown;
}): Record<string, unknown> {
  if (result.isError) {
    const message =
      result.content
        .map((item) => (item.type === "text" ? item.text : JSON.stringify(item)))
        .filter(Boolean)
        .join("\n") || "Tool execution failed";

    return { error: message };
  }

  if (result.structuredContent !== undefined) {
    return { output: result.structuredContent };
  }

  const textContent = result.content
    .map((item) => (item.type === "text" ? item.text : JSON.stringify(item)))
    .filter((value): value is string => Boolean(value?.trim()));

  if (textContent.length > 0) {
    for (const chunk of textContent) {
      try {
        return { output: JSON.parse(chunk) };
      } catch {
        // fall through to raw text
      }
    }

    return { output: textContent.join("\n") };
  }

  return { output: result };
}

export async function handleGeminiError(error: unknown): Promise<never> {
  if (error instanceof ServiceError) {
    throw error;
  }

  const { ApiError } = await loadGeminiSdk();

  if (error instanceof ApiError) {
    if (error.status === 401 || error.status === 403) {
      throw new ServiceError(
        502,
        "Gemini API key is invalid or unauthorized",
      );
    }

    if (error.status === 429) {
      throw new ServiceError(
        429,
        "Gemini rate limit exceeded. Try again shortly.",
      );
    }

    if (error.status === 503) {
      throw new ServiceError(
        503,
        "Gemini model is temporarily unavailable. Please try again shortly.",
      );
    }

    throw new ServiceError(
      502,
      error.message || `Gemini API request failed with status ${error.status}`,
    );
  }

  if (error instanceof Error) {
    throw new ServiceError(502, error.message);
  }

  throw new ServiceError(502, "Gemini API request failed");
}

export async function extractGeminiReply(
  response: GeminiGenerateResponse,
  context: string,
): Promise<string> {
  const text = response.text?.trim();

  if (text) {
    return text;
  }

  const { FinishReason } = await loadGeminiSdk();
  const finishReason = response.candidates?.[0]?.finishReason;

  if (
    finishReason === FinishReason.SAFETY ||
    finishReason === FinishReason.BLOCKLIST ||
    finishReason === FinishReason.PROHIBITED_CONTENT ||
    finishReason === FinishReason.SPII
  ) {
    throw new ServiceError(
      502,
      "Gemini blocked the response due to content safety filters. Rephrase your request.",
    );
  }

  if (finishReason === FinishReason.RECITATION) {
    throw new ServiceError(
      502,
      "Gemini blocked the response due to potential recitation.",
    );
  }

  if (finishReason === FinishReason.MAX_TOKENS) {
    throw new ServiceError(
      502,
      `Gemini ${context} response was truncated due to token limits.`,
    );
  }

  throw new ServiceError(502, `Gemini returned an empty ${context} response`);
}

export async function generateGeminiContent(params: {
  client: Awaited<ReturnType<typeof createGeminiClient>>;
  model?: string;
  systemInstruction: string;
  contents: GeminiContent[];
  tools?: ReturnType<typeof toGeminiFunctionDeclarations>;
}): Promise<GeminiGenerateResponse> {
  const { FunctionCallingConfigMode } = await loadGeminiSdk();

  try {
    const response = await params.client.models.generateContent({
      model: params.model ?? getGeminiModel(),
      contents: params.contents,
      config: {
        systemInstruction: params.systemInstruction,
        maxOutputTokens: 1024,
        tools: params.tools?.length
          ? [{ functionDeclarations: params.tools }]
          : undefined,
        toolConfig: params.tools?.length
          ? {
              functionCallingConfig: {
                mode: FunctionCallingConfigMode.AUTO,
              },
            }
          : undefined,
      },
    });

    return response as GeminiGenerateResponse;
  } catch (error) {
    return handleGeminiError(error);
  }
}

export function buildFunctionResponseParts(
  functionCalls: GeminiFunctionCall[],
  results: Record<string, unknown>[],
): GeminiPart[] {
  return functionCalls.map((call, index) => ({
    functionResponse: {
      id: call.id,
      name: call.name,
      response: results[index] ?? { error: "Missing tool result" },
    },
  }));
}
