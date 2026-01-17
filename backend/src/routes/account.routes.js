import express from "express";
import {
  getAccounts,
  addAccount,
  deleteAccount,
  updateAccount,
} from "../controllers/account.controller.js";

const router = express.Router();

router.get("/", getAccounts);
router.post("/", addAccount);
router.delete("/:id", deleteAccount);
router.put("/:id", updateAccount);


export default router;
