import { Router } from "express";
import { authenticate, requireRole } from "../middleware/auth";
import { validateQuery } from "../middleware/validateQuery";
import {
  dashboardSummaryQuerySchema,
  dashboardSubmissionStatusQuerySchema,
  dashboardTrendQuerySchema,
  dashboardWorkloadQuerySchema,
} from "../validation/dashboardQuerySchema";
import * as dashboardController from "../controllers/dashboardController";

const router = Router();

router.use(authenticate);
router.use(requireRole("Manager"));

router.get(
  "/summary",
  validateQuery(dashboardSummaryQuerySchema),
  dashboardController.getSummary,
);
router.get(
  "/submission-status",
  validateQuery(dashboardSubmissionStatusQuerySchema),
  dashboardController.getSubmissionStatus,
);
router.get(
  "/workload",
  validateQuery(dashboardWorkloadQuerySchema),
  dashboardController.getWorkload,
);
router.get(
  "/trend",
  validateQuery(dashboardTrendQuerySchema),
  dashboardController.getTrend,
);

export default router;
