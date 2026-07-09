import { http } from "./http";

export interface ChatReplyResponse {
  conversationId?: string;
  reply: string;
}

export async function sendChatMessage(input: {
  message: string;
  conversationId?: string;
}) {
  const response = await http.post<ChatReplyResponse>("/api/chat", input);
  return response.data;
}

export async function generateTeamSummary() {
  const response = await http.post<ChatReplyResponse>(
    "/api/chat/team-summary",
    {},
  );
  return response.data;
}
