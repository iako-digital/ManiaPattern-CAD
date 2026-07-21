import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../prisma";

const RECOVERY_WINDOW_MS = 60 * 24 * 60 * 60 * 1000;

export async function deletePaymentMethod(req: Request, res: Response) {
  const { id } = req.params;
  const { userId } = req.body as { userId?: string };

  if (!userId) {
    res.status(400).json({ error: "userId is required" });
    return;
  }

  const method = await prisma.savedPaymentMethod.findUnique({ where: { id } });
  if (!method || method.userId !== userId) {
    res.status(404).json({ error: "Payment method not found" });
    return;
  }

  await prisma.savedPaymentMethod.delete({ where: { id } });
  res.status(204).send();
}

export async function requestAccountDeletion(req: Request, res: Response) {
  const { userId, confirmation, password } = req.body as {
    userId?: string;
    confirmation?: string;
    password?: string;
  };

  if (!userId) {
    res.status(400).json({ error: "userId is required" });
    return;
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const confirmedByPhrase = confirmation === "DELETE";
  let confirmedByPassword = false;
  if (!confirmedByPhrase && password) {
    if (!user.passwordHash) {
      res.status(400).json({ error: "Password verification is unavailable for this account" });
      return;
    }
    confirmedByPassword = await bcrypt.compare(password, user.passwordHash);
  }

  if (!confirmedByPhrase && !confirmedByPassword) {
    res.status(400).json({ error: 'Type "DELETE" or provide your password to confirm' });
    return;
  }

  const deletedAt = new Date();
  const scheduledPermanentDeletionAt = new Date(deletedAt.getTime() + RECOVERY_WINDOW_MS);

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { status: "PENDING_DELETION", deletedAt, scheduledPermanentDeletionAt },
  });

  res.json({
    status: updated.status,
    deletedAt: updated.deletedAt,
    scheduledPermanentDeletionAt: updated.scheduledPermanentDeletionAt,
  });
}

export async function cancelAccountDeletion(req: Request, res: Response) {
  const { userId } = req.body as { userId?: string };

  if (!userId) {
    res.status(400).json({ error: "userId is required" });
    return;
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  if (user.status !== "PENDING_DELETION") {
    res.status(400).json({ error: "Account is not pending deletion" });
    return;
  }

  if (user.scheduledPermanentDeletionAt && user.scheduledPermanentDeletionAt.getTime() < Date.now()) {
    res.status(410).json({ error: "The 60-day recovery window has expired" });
    return;
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { status: "ACTIVE", deletedAt: null, scheduledPermanentDeletionAt: null },
  });

  res.json({ status: updated.status });
}
