import express from "express";
import { addAccount, getAccounts, deleteAccount, updateAccount } from "../controllers/account.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";

const router = express.Router();

router.use(authMiddleware);

router.post("/", addAccount);
router.get("/", getAccounts);
router.delete("/:id", deleteAccount);
router.put("/:id", updateAccount);

export default router;
