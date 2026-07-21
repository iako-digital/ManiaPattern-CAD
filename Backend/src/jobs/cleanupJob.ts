import { prisma } from "../prisma";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Hard-deletes accounts whose 60-day GDPR recovery window has elapsed.
 * Cascading FKs on Project/Drawing/PatternItem/Purchase/WatermarkAuditLog/
 * SavedPaymentMethod take care of the user's rows; actual blob storage
 * (uploaded DXF/PDF assets) isn't wired up yet, so only DB rows are purged.
 */
export async function runAccountCleanupJob(): Promise<{ deletedUserIds: string[] }> {
  const dueUsers = await prisma.user.findMany({
    where: {
      status: "PENDING_DELETION",
      scheduledPermanentDeletionAt: { lte: new Date() },
    },
    select: { id: true },
  });

  const deletedUserIds: string[] = [];
  for (const user of dueUsers) {
    await prisma.user.delete({ where: { id: user.id } });
    deletedUserIds.push(user.id);
  }

  if (deletedUserIds.length > 0) {
    console.log(
      `[cleanupJob] Permanently deleted ${deletedUserIds.length} account(s) past the 60-day recovery window.`,
    );
  }

  return { deletedUserIds };
}

export function scheduleAccountCleanupJob(intervalMs: number = DAY_MS): NodeJS.Timeout {
  return setInterval(() => {
    runAccountCleanupJob().catch((err) => console.error("[cleanupJob] run failed", err));
  }, intervalMs);
}
