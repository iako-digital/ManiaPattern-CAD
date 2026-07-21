import type { NextFunction, Request, Response } from "express";
import type { UserRole } from "@prisma/client";
import { prisma } from "../prisma";
import { SESSION_COOKIE_NAME, verifySessionToken } from "../services/authService";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: { id: string; email: string; role: UserRole };
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[SESSION_COOKIE_NAME];
  if (!token) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  try {
    const payload = verifySessionToken(token);
    req.auth = { id: payload.sub, email: payload.email, role: payload.role };
    next();
  } catch {
    res.status(401).json({ error: "Session expired or invalid" });
  }
}

/**
 * Re-checks role/status from the database rather than trusting the JWT claim,
 * so a demoted/suspended admin loses access immediately instead of waiting
 * out the token's 7-day expiry.
 */
export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.auth) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const user = await prisma.user.findUnique({ where: { id: req.auth.id } });
  if (!user || user.role !== "ADMIN" || user.status !== "ACTIVE") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
}
