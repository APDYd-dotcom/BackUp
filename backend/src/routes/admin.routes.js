import express from "express";
import authMiddleware from "../middlewares/auth.middleware.js";
import adminMiddleware from "../middlewares/admin.middleware.js";
import { getUsers, getUserAccounts, createUser, deleteUser, createAccountForUser, updateUser, impersonateUser } from "../controllers/admin.controller.js";

const router = express.Router();

router.use(authMiddleware);
router.use(adminMiddleware);

router.get("/users", getUsers);
router.get("/users/:id/accounts", getUserAccounts);
router.post("/users", createUser);
router.delete("/users/:id", deleteUser);
router.put("/users/:id", updateUser);
router.post("/users/:id/impersonate", impersonateUser);
router.post("/users/:id/accounts", createAccountForUser);

export default router;
