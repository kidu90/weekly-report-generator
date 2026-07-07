import { Router } from "express";
import { authenticate, requireRole } from "../middleware/auth";
import { validateBody } from "../middleware/validateBody";
import { reportSchema, reportUpdateSchema } from "../validation/reportSchema";
import * as reportController from "../controllers/reportController";

const router = Router();

router.use(authenticate);

router.get("/me", reportController.getMyReports);
router.get("/", requireRole("Manager"), reportController.listReports);
router.post("/", requireRole("TeamMember"), validateBody(reportSchema), reportController.createReport);
router.patch("/:id/submit", reportController.submitReport);
router.put("/:id", validateBody(reportUpdateSchema), reportController.updateReport);

export default router;
