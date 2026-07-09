# AI Assistant

The manager AI assistant combines the Google Gemini API with the local MCP server so Gemini can query the same dashboard and report services used by the REST API.

## Endpoints

| Method | Path | Role | Description |
|--------|------|------|-------------|
| `POST` | `/api/chat` | Manager | Free-form chat with tool use |
| `POST` | `/api/chat/team-summary` | Manager | Canned weekly summary (no user message required) |

Both routes require a valid JWT (`Authorization: Bearer …`) and `requireRole("Manager")`.

### `POST /api/chat`

Body:

```json
{
  "message": "Who is late on submissions this week?",
  "conversationId": "optional-uuid-from-prior-response"
}
```

Response:

```json
{
  "conversationId": "uuid",
  "reply": "Assistant text response"
}
```

Conversation history is kept **in memory** on the server, keyed by `conversationId` and bound to the authenticated manager. History is trimmed to the last 20 turns. It is not persisted to MongoDB and is lost on server restart.

Tool calls are capped at **5 rounds** per request to prevent runaway loops.

### `POST /api/chat/team-summary`

Empty body `{}`. The server:

1. Calls MCP tools `get_dashboard_summary`, `get_submission_status`, and `get_workload_by_project` for the current calendar week.
2. Sends the tool output to Gemini with a fixed summarization prompt.
3. Returns `{ "reply": "…" }` with sections for completed work, recurring blockers, and workload imbalance.

## Prompt design

The system prompt instructs the assistant to:

- **Only use listed MCP tools** — no guessing or inventing API paths.
- **Never fabricate data** — totals, trends, names, and report content must come from a tool result in the current turn or an earlier tool result in the same request chain.
- **State gaps explicitly** — if a tool returns empty arrays or zero counts for the requested week/project/member, the assistant must say that no data was returned rather than filling in plausible-sounding details.
- **Stay within manager scope** — the assistant only sees what a Manager could already retrieve via `/api/reports`, `/api/dashboard`, and MCP tools. It has no raw database access.

The team-summary prompt adds a fixed output structure (completed work / recurring blockers / workload imbalance) and repeats the no-fabrication rule.

## Why tool inputs are still Zod-validated

The LLM proposes tool arguments, but those arguments are **untrusted input**:

- Models can hallucinate field names, wrong date formats, or extra parameters.
- A typo in `weekStart` should fail fast with a clear validation error instead of silently querying the wrong week.
- Zod schemas are shared between REST query validation, MCP tool registration, and (indirectly) the JSON Schema Gemini sees via `functionDeclarations` — one source of truth prevents drift.

Validation protects the **service layer**, not the browser. The MCP server and services never trust the model to supply correct types or semantics.

## Manager identity scoping

The model **cannot** choose which user or role to act as:

- REST chat routes require `authenticate` + `requireRole("Manager")`.
- The MCP HTTP transport receives the same JWT on every tool call via `Authorization`.
- MCP sessions are bound to the manager who initialized the session; a different manager's token cannot reuse another session.
- Tool handlers do not accept `userId`, `role`, or similar override fields — scoping is enforced at the transport/session layer.

## Data privacy

| Topic | Behavior |
|-------|----------|
| Data visible to the model | Report and dashboard aggregates already available to Managers via the REST API (names, emails, report fields). No direct Mongo access. |
| Conversation history | Stored in server memory only for the active `conversationId`. Sent to Google only as part of the current Gemini API request payload. |
| Cross-manager isolation | Conversations and MCP sessions are tied to the authenticated manager ID. |
| Model training | Google Gemini API data handling is governed by [Google AI terms](https://ai.google.dev/gemini-api/terms). Review current policies for your account tier; do not assume consumer Gemini app defaults apply to the API. |
| Team-member PII | Limited to name/email already shown on manager dashboards; no broader org or HR data. |

## Configuration

Add to `server/.env`:

```env
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-2.5-flash
MCP_BASE_URL=http://localhost:5000
```

`GEMINI_MODEL` defaults to `gemini-2.5-flash` when omitted. `MCP_BASE_URL` defaults to `http://localhost:{PORT}`. The chat service connects to `{MCP_BASE_URL}/mcp` using the caller's JWT.

Get an API key from [Google AI Studio](https://aistudio.google.com/apikey).

## Frontend

Managers see a floating **Open AI chat** button (bottom-right) via `ChatWidget` in `AppShell`. It supports:

- Free-form messages → `POST /api/chat`
- **Generate this week's team summary** → `POST /api/chat/team-summary`
- Optimistic append of the user's message, typing indicator while waiting, and error surfacing in the thread

Team members do not see the widget.

## Architecture

```
ChatWidget → POST /api/chat → chatService → Gemini API (@google/genai)
                              ↓ (functionCall)
                         mcpClient → POST /mcp → MCP tools → *Service → MongoDB
```

Services (`reportService`, `dashboardService`, etc.) are the single source of business logic for REST, MCP, and chat.

## Gemini vs prior Anthropic integration

| Topic | Behavior |
|-------|----------|
| Roles | Gemini uses `user` / `model` (not `assistant`). |
| Tool results | Returned as `functionResponse` parts in a **user** turn, not separate `tool_result` blocks. |
| System prompt | Passed via `systemInstruction` config, not a separate messages array. |
| Parallel tools | Gemini may return multiple `functionCall` parts in one turn; all are executed before the next model call. |
| Safety blocks | May return empty text with `finishReason: SAFETY` without throwing — chatService maps this to a 502 with a clear message. |
