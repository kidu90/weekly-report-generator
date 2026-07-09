import { Router } from "express";
import { z } from "zod";
import { authenticate, requireRole } from "../middleware/auth";
import { validateBody } from "../middleware/validateBody";
import { ServiceError } from "../utils/errors";
import {
  generateManagerChatReply,
  generateTeamSummary,
} from "../services/chatService";

const chatMessageSchema = z.object({
  message: z.string().trim().min(1).max(2000),
  conversationId: z.string().min(1).optional(),
});

const emptyBodySchema = z.object({}).strict();

const router = Router();

router.use(authenticate);
router.use(requireRole("Manager"));

router.post("/", validateBody(chatMessageSchema), async (req, res) => {
  try {
    const result = await generateManagerChatReply({
      authorizationHeader: req.headers.authorization || "",
      managerId: req.user!.userId,
      message: req.body.message,
      conversationId: req.body.conversationId,
    });

    res.json(result);
  } catch (error) {
    if (error instanceof ServiceError) {
      res.status(error.statusCode).json({ message: error.message });
      return;
    }

    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post(
  "/team-summary",
  validateBody(emptyBodySchema),
  async (req, res) => {
    try {
      const result = await generateTeamSummary({
        authorizationHeader: req.headers.authorization || "",
        managerId: req.user!.userId,
      });

      res.json(result);
    } catch (error) {
      if (error instanceof ServiceError) {
        res.status(error.statusCode).json({ message: error.message });
        return;
      }

      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  },
);

export default router;
