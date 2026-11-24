import express from "express";
import cors from "cors";
import accountRoutes from "./routes/account.routes.js";
import authRoutes from "./routes/auth.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import twoFactorRoutes from "./routes/twoFactor.routes.js";

const app = express();

// 👇 PUT THIS FIRST
app.use((req, res, next) => {
  console.log(req.method, req.url);
  next();
});

app.use(cors());
app.use(express.json());

app.use("/api/accounts", accountRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/2fa", twoFactorRoutes);

export default app;
