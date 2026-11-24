import express from "express";
import { addAccount, getAccounts, deleteAccount, updateAccount } from "../controllers/account.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";
import { openDB } from "../config/db.js";
import { writeAudit, notifySuperAdmins } from "../services/audit.service.js";

const router = express.Router();

router.use(authMiddleware);

router.post("/", addAccount);
router.get("/", getAccounts);
router.delete("/:id", deleteAccount);
router.put("/:id", updateAccount);

router.post("/:id/credential-event", async (req, res) => {
  const { event } = req.body;
  if (!["copy", "reveal"].includes(event)) {
    return res.status(400).json({ message: "Invalid credential event" });
  }

  const db = await openDB();
  const account = await db.get("SELECT id, user_id FROM accounts WHERE id = ?", [req.params.id]);
  if (!account) return res.status(404).json({ message: "Account not found" });

  const owner = await db.get("SELECT name, email FROM users WHERE id = ?", [account.user_id]);
  const requester = await db.get("SELECT name, email FROM users WHERE id = ?", [req.userId]);
  const userAgent = req.get("user-agent") || null;
  const ipAddress = req.ip || req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || null;

  await writeAudit({
    userId: req.userId,
    action: `account.credential.${event}`,
    resourceType: "account",
    resourceId: req.params.id,
    ipAddress,
    userAgent,
    metadata: {
      accountOwner: owner?.name || null,
      requester: requester?.name || null,
    },
    result: "success",
  });

  await notifySuperAdmins({
    title: `Credential ${event} detected`,
    message: `${requester?.name || "A user"} ${event === "copy" ? "copied" : "revealed"} credentials for ${owner?.name || "an account"}.`,
    type: "credential_alert",
    resourceType: "account",
    resourceId: req.params.id,
    metadata: { event, ipAddress, userAgent },
  });

  res.json({ recorded: true });
});

export default router;
