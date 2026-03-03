import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";

import authRoutes from "./routes/auth.js";
import tradeRoutes from "./routes/trades.js";
import statsRoutes from "./routes/stats.js";
import tagRoutes from "./routes/tags.js";
import { errorHandler } from "./middleware/errorHandler.js";

dotenv.config();

const app = express();

// ─── Middleware ───────────────────────────────────────────────
app.use(cors({
  origin: process.env.CLIENT_URL || "*",
  credentials: true,
}));
app.use(express.json());

// Only log in development — Vercel has its own request logging
if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

// ─── Routes ──────────────────────────────────────────────────
app.use("/api/auth",   authRoutes);
app.use("/api/trades", tradeRoutes);
app.use("/api/stats",  statsRoutes);
app.use("/api/tags",   tagRoutes);

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

// ─── Error Handler ────────────────────────────────────────────
app.use(errorHandler);

export default app;
