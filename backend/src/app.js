import express from "express";
import cors from "cors";
import accountRoutes from "./routes/account.routes.js";
import authRoutes from "./routes/auth.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import twoFactorRoutes from "./routes/twoFactor.routes.js";
import rateLimit from "express-rate-limit";
import actionApprovalRoutes from "./routes/actionApproval.routes.js";

const app = express();

// 👇 PUT THIS FIRST
app.use((req, res, next) => {
  console.log(req.method, req.url);
  next();
});

app.use(cors());
app.use(express.json());

const otpLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many security requests. Please try again later." },
});

app.use("/api/auth/login", otpLimiter);

app.use("/api/accounts", accountRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/2fa", twoFactorRoutes);
app.use("/api/actions", actionApprovalRoutes);

export default app;
