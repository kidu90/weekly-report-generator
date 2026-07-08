import { Router } from "express";
import { validateBody } from "../middleware/validateBody";
import * as authController from "../controllers/authController";
import { authLoginSchema, authRegisterSchema } from "../validation/authSchema";

const router = Router();

router.post(
  "/register",
  validateBody(authRegisterSchema),
  authController.register,
);
router.post("/login", validateBody(authLoginSchema), authController.login);

export default router;
