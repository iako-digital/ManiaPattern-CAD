import "dotenv/config";
import cors from "cors";
import express from "express";
import { healthRouter } from "./routes/health";
import { projectsRouter } from "./routes/projects";

const app = express();
const port = Number(process.env.PORT) || 8080;

app.use(cors({ origin: process.env.CORS_ORIGIN ?? "http://localhost:3000" }));
app.use(express.json());

app.use("/api/health", healthRouter);
app.use("/api/projects", projectsRouter);

app.listen(port, () => {
  console.log(`CloudPattern CAD backend listening on port ${port}`);
});
