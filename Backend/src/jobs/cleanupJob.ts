import { prisma } from "../prisma";
import { deleteFileByUrl } from "../services/blobService";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Best-effort blob purge for a user's authored pattern files. Failures are
 * logged and swallowed — a storage hiccup must never block the DB-level
 * account deletion that GDPR actually requires.
 */
async function purgeUserBlobFiles(userId: string): Promise<void> {
  const patterns = await prisma.patternItem.findMany({
    where: { authorId: userId },
    select: { id: true, dxfFileUrl: true, pdfFileUrl: true },
  });

  for (const pattern of patterns) {
    for (const url of [pattern.dxfFileUrl, pattern.pdfFileUrl]) {
      if (!url) continue;
      try {
        await deleteFileByUrl(url);
      } catch (err) {
        console.error(`[cleanupJob] failed to purge blob for pattern ${pattern.id}`, err);
      }
    }
  }
}

/** Hard-deletes a single user immediately (DB cascade + best-effort blob purge). */
export async function purgeUserNow(userId: string): Promise<void> {
  await purgeUserBlobFiles(userId);
  await prisma.user.delete({ where: { id: userId } });
}

/**
 * Hard-deletes accounts whose 60-day GDPR recovery window has elapsed.
 * Cascading FKs on Project/Drawing/PatternItem/Purchase/WatermarkAuditLog/
 * SavedPaymentMethod take care of the user's rows once purgeUserNow deletes them.
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
    await purgeUserNow(user.id);
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
