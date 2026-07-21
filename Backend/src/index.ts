import "dotenv/config";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import type { NextFunction, Request, Response } from "express";
import { healthRouter } from "./routes/health";
import { projectsRouter } from "./routes/projects";
import { userRouter } from "./routes/user";
import { authRouter } from "./routes/auth";
import { adminRouter } from "./routes/admin";
import { scheduleAccountCleanupJob } from "./jobs/cleanupJob";

const app = express();
const port = Number(process.env.PORT) || 8080;

app.use(cors({ origin: process.env.CORS_ORIGIN ?? "http://localhost:3000", credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.use("/api/health", healthRouter);
app.use("/api/projects", projectsRouter);
app.use("/api/auth", authRouter);
app.use("/api/user", userRouter);
app.use("/api/admin", adminRouter);

// Safety net: without this, a rejected promise in any async route handler
// (e.g. a database error) is an unhandled rejection that crashes the process.
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(port, () => {
  console.log(`ManiaPattern CAD backend listening on port ${port}`);
  scheduleAccountCleanupJob();
});
