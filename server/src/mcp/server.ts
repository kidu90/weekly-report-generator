import { randomUUID } from "node:crypto";
import type { Request, Response, Router } from "express";
import { Router as createRouter } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types";
import { authenticate, requireRole } from "../middleware/auth";
import type { AuthUser } from "../middleware/auth";
import * as reportService from "../services/reportService";
import * as dashboardService from "../services/dashboardService";
import {
  dashboardSummaryQueryShape,
  dashboardSubmissionStatusQueryShape,
  dashboardTrendQueryShape,
  dashboardWorkloadQueryShape,
} from "../validation/dashboardQuerySchema";
import { reportToolQueryShape } from "../validation/reportQuerySchema";

type SessionContext = {
  manager: AuthUser;
  server: McpServer;
  transport: StreamableHTTPServerTransport;
};

const sessions = new Map<string, SessionContext>();

function getMcpSessionId(req: Request): string | undefined {
  const header = req.headers["mcp-session-id"];
  return typeof header === "string" && header.trim() ? header : undefined;
}

function createAuthInfo(user: AuthUser): AuthInfo {
  return {
    token: `manager:${user.userId}`,
    clientId: user.userId,
    scopes: [user.role],
    extra: {
      userId: user.userId,
      email: user.email,
      role: user.role,
    },
  };
}

function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "weekly-report-generator-mcp",
    version: "1.0.0",
  });

  server.tool(
    "get_team_reports",
    reportToolQueryShape,
    async ({ weekStart, project, teamMember }) => {
      const result = await reportService.listReportsForManager({
        week: weekStart,
        project,
        teamMember,
      });

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        structuredContent: result as unknown as Record<string, unknown>,
      };
    },
  );

  server.tool(
    "get_dashboard_summary",
    dashboardSummaryQueryShape,
    async ({ weekStart }) => {
      const summary = await dashboardService.getWeeklySummary(weekStart);
      return {
        content: [{ type: "text", text: JSON.stringify(summary, null, 2) }],
        structuredContent: summary as unknown as Record<string, unknown>,
      };
    },
  );

  server.tool(
    "get_workload_by_project",
    dashboardWorkloadQueryShape,
    async ({ from, to }) => {
      const workload = await dashboardService.getWorkloadByProject(from, to);
      return {
        content: [{ type: "text", text: JSON.stringify(workload, null, 2) }],
        structuredContent: { workload } as unknown as Record<string, unknown>,
      };
    },
  );

  server.tool(
    "get_submission_status",
    dashboardSubmissionStatusQueryShape,
    async ({ weekStart }) => {
      const submissionStatus =
        await dashboardService.getSubmissionStatusByMember(weekStart);
      return {
        content: [
          { type: "text", text: JSON.stringify({ submissionStatus }, null, 2) },
        ],
        structuredContent: { submissionStatus } as unknown as Record<
          string,
          unknown
        >,
      };
    },
  );

  server.tool(
    "get_tasks_completed_trend",
    dashboardTrendQueryShape,
    async ({ from, to, groupBy }) => {
      const trend = await dashboardService.getTasksCompletedTrend(
        from,
        to,
        groupBy,
      );
      return {
        content: [{ type: "text", text: JSON.stringify(trend, null, 2) }],
        structuredContent: trend as unknown as Record<string, unknown>,
      };
    },
  );

  return server;
}

function createSessionContext(manager: AuthUser): SessionContext {
  const server = createMcpServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
    onsessioninitialized: (sessionId) => {
      if (!sessions.has(sessionId)) {
        sessions.set(sessionId, { manager, server, transport });
      }
    },
  });

  transport.onclose = () => {
    const sessionId = transport.sessionId;

    if (sessionId) {
      sessions.delete(sessionId);
    }
  };

  return { manager, server, transport };
}

function createAuthInfoFromRequest(req: Request): AuthInfo | undefined {
  if (!req.user) {
    return undefined;
  }

  return createAuthInfo(req.user);
}

async function ensureSessionForRequest(
  req: Request,
  res: Response,
): Promise<SessionContext | null> {
  if (!req.user || req.user.role !== "Manager") {
    res.status(403).json({ message: "Insufficient permissions" });
    return null;
  }

  const sessionId = getMcpSessionId(req);

  if (sessionId) {
    const session = sessions.get(sessionId);

    if (!session) {
      res.status(404).json({ message: "Unknown MCP session" });
      return null;
    }

    if (session.manager.userId !== req.user.userId) {
      res
        .status(403)
        .json({ message: "MCP session is bound to a different manager" });
      return null;
    }

    return session;
  }

  if (!isInitializeRequest(req.body)) {
    res.status(400).json({ message: "Missing MCP initialization payload" });
    return null;
  }

  const session = createSessionContext(req.user);
  await session.server.connect(session.transport);
  return session;
}

async function handleMcpRequest(req: Request, res: Response): Promise<void> {
  const session = await ensureSessionForRequest(req, res);

  if (!session) {
    return;
  }

  (req as Request & { auth?: AuthInfo }).auth = createAuthInfoFromRequest(req);
  await session.transport.handleRequest(
    req as never,
    res as never,
    req.method === "POST" ? req.body : undefined,
  );
}

export function createMcpRouter(): Router {
  const router = createRouter();

  router.use(authenticate);
  router.use(requireRole("Manager"));

  router.post("/", (req, res) => {
    void handleMcpRequest(req, res);
  });

  router.get("/", (req, res) => {
    void handleMcpRequest(req, res);
  });

  router.delete("/", (req, res) => {
    void handleMcpRequest(req, res);
  });

  return router;
}
