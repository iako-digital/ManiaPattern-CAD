import { Router } from "express";
import { prisma } from "../prisma";

export const projectsRouter = Router();

projectsRouter.get("/", async (_req, res) => {
  const projects = await prisma.project.findMany();
  res.json(projects);
});

projectsRouter.post("/", async (req, res) => {
  const { name, ownerId } = req.body as { name?: string; ownerId?: string };

  if (!name || !ownerId) {
    res.status(400).json({ error: "name and ownerId are required" });
    return;
  }

  const project = await prisma.project.create({ data: { name, ownerId } });
  res.status(201).json(project);
});
