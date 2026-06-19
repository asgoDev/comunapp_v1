import { Router } from "express";
import userController from "./user.controller.js";
import { authenticate, authorize } from "../../shared/middleware/auth.middleware.js";
import validate from "../../shared/middleware/validate.js";
import { createUserSchema, updateUserSchema } from "./user.validation.js";

const router = Router();

router.use(authenticate);
router.use(authorize("admin", "JEFE_COMUNIDAD"));

router.get("/", userController.getUsers);
router.get("/:id", userController.getUserById);
router.post("/", validate(createUserSchema), userController.createUser);
router.put("/:id", validate(updateUserSchema), userController.updateUser);
router.delete("/:id", userController.deleteUser);

export default router;
