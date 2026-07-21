import type { Request, Response } from "express";
import { prisma } from "../prisma";
import { purgeUserNow } from "../jobs/cleanupJob";
import { isBlobStorageConfigured } from "../services/blobService";

const COMMISSION_RATE = 0.2;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export async function getKpis(_req: Request, res: Response) {
  const [completedAgg, trailingAgg, activeUsers, totalUsers, pendingModeration] = await Promise.all([
    prisma.purchase.aggregate({ where: { status: "COMPLETED" }, _sum: { amount: true } }),
    prisma.purchase.aggregate({
      where: { status: "COMPLETED", createdAt: { gte: new Date(Date.now() - THIRTY_DAYS_MS) } },
      _sum: { amount: true },
    }),
    prisma.user.count({ where: { status: "ACTIVE" } }),
    prisma.user.count(),
    prisma.patternItem.count({ where: { moderationStatus: "PENDING" } }),
  ]);

  const totalRevenue = Number(completedAgg._sum.amount ?? 0);
  const trailing30dRevenue = Number(trailingAgg._sum.amount ?? 0);

  res.json({
    totalRevenue,
    platformCommission: totalRevenue * COMMISSION_RATE,
    commissionRate: COMMISSION_RATE,
    trailing30dRevenue,
    activeUsers,
    totalUsers,
    pendingModeration,
  });
}

export async function listUsers(_req: Request, res: Response) {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      createdAt: true,
      scheduledPermanentDeletionAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  res.json({ users });
}

export async function freezeUser(req: Request, res: Response) {
  const user = await prisma.user.update({ where: { id: req.params.id }, data: { status: "SUSPENDED" } });
  res.json({ id: user.id, status: user.status });
}

export async function restoreUser(req: Request, res: Response) {
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { status: "ACTIVE", deletedAt: null, scheduledPermanentDeletionAt: null },
  });
  res.json({ id: user.id, status: user.status });
}

export async function purgeUser(req: Request, res: Response) {
  await purgeUserNow(req.params.id);
  res.status(204).send();
}

export async function listPatternsForModeration(req: Request, res: Response) {
  const status = (req.query.status as string | undefined)?.toUpperCase();
  const patterns = await prisma.patternItem.findMany({
    where: status ? { moderationStatus: status as "PENDING" | "APPROVED" | "REJECTED" } : undefined,
    include: { author: { select: { id: true, email: true, name: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  res.json({ patterns });
}

export async function approvePattern(req: Request, res: Response) {
  const pattern = await prisma.patternItem.update({
    where: { id: req.params.id },
    data: { moderationStatus: "APPROVED" },
  });
  res.json({ id: pattern.id, moderationStatus: pattern.moderationStatus });
}

export async function rejectPattern(req: Request, res: Response) {
  const pattern = await prisma.patternItem.update({
    where: { id: req.params.id },
    data: { moderationStatus: "REJECTED" },
  });
  res.json({ id: pattern.id, moderationStatus: pattern.moderationStatus });
}

export async function getInfraStatus(_req: Request, res: Response) {
  let dbHealthy = true;
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    dbHealthy = false;
  }

  res.json({
    dbHealthy,
    uptimeSeconds: Math.round(process.uptime()),
    nodeVersion: process.version,
    blobStorageConfigured: isBlobStorageConfigured(),
    exportQueue: {
      implemented: false,
      note: "DXF/HPGL/G-Code/PDF exports run client-side in the browser today — there is no server-side export queue to report on yet.",
    },
  });
}

export async function listAuditLogs(_req: Request, res: Response) {
  const logs = await prisma.watermarkAuditLog.findMany({
    include: {
      patternItem: { select: { id: true, title: true } },
      recipient: { select: { id: true, email: true } },
    },
    orderBy: { issuedAt: "desc" },
    take: 200,
  });
  res.json({ logs });
}
