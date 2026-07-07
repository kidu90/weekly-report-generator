import { Router } from "express";
import { authenticate, requireRole } from "../middleware/auth";
import { validateBody } from "../middleware/validateBody";
import { projectSchema } from "../validation/projectSchema";
import * as projectController from "../controllers/projectController";

const router = Router();

router.use(authenticate);

router.get("/", projectController.listProjects);
router.post("/", requireRole("Manager"), validateBody(projectSchema), projectController.createProject);
router.put("/:id", requireRole("Manager"), validateBody(projectSchema), projectController.updateProject);
router.delete("/:id", requireRole("Manager"), projectController.deleteProject);

export default router;
