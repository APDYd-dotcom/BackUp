import express from "express";
import cors from "cors";
import accountRoutes from "./routes/account.routes.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/accounts", accountRoutes);

export default app;
